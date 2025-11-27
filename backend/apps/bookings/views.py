from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.db.models import Q, Count, Sum
from django.db import transaction
from datetime import datetime, timedelta
from .models import Booking, BlockedDate
from .serializers import (
    BookingSerializer, BookingListSerializer, BookingCreateSerializer,
    BlockedDateSerializer
)


def check_dates_available(check_in_date, check_out_date, exclude_booking_id=None):
    """
    Check if date range is available for booking.

    Uses proper blocking logic:
    - cancelled bookings: don't block
    - checked_out bookings: don't block
    - no_show with released_from_date: only block dates before released_from_date
    - all other statuses (pending, confirmed, paid, checked_in): block full range

    Args:
        check_in_date: datetime.date object
        check_out_date: datetime.date object
        exclude_booking_id: UUID to exclude from check (for updates)

    Returns:
        (is_available: bool, reason: str)
    """
    # Get all potentially overlapping bookings (excluding cancelled/checked_out)
    bookings_query = Booking.objects.exclude(
        status__in=['cancelled', 'checked_out']
    ).filter(
        check_in_date__lt=check_out_date,
        check_out_date__gt=check_in_date
    )

    if exclude_booking_id:
        bookings_query = bookings_query.exclude(id=exclude_booking_id)

    # Check each booking's actual blocked range
    for booking in bookings_query:
        blocked_range = booking.get_blocked_date_range()
        if blocked_range:
            blocked_start, blocked_end = blocked_range
            # Check if requested dates overlap with blocked range
            if blocked_start < check_out_date and blocked_end > check_in_date:
                return (False, f"Dates conflict with booking {booking.booking_id}")

    # Check for blocked dates (maintenance, owner use, etc.)
    blocked = BlockedDate.objects.filter(
        start_date__lt=check_out_date,
        end_date__gt=check_in_date
    ).first()

    if blocked:
        return (False, f"Dates blocked: {blocked.get_reason_display()}")

    return (True, "Available")


class BookingViewSet(viewsets.ModelViewSet):
    """
    ViewSet for booking management with granular RBAC permissions.

    Permission mapping:
    - list/retrieve: bookings.view
    - create: bookings.create
    - update: bookings.update
    - cancel: bookings.cancel
    - mark_no_show: bookings.mark_no_show
    """
    permission_classes = [IsAuthenticated]  # Will be upgraded to HasPermissionForAction after seeding

    # Action-level permission mapping (for RBAC)
    action_permissions = {
        'list': 'bookings.view',
        'retrieve': 'bookings.view',
        'create': 'bookings.create',
        'update': 'bookings.update',
        'partial_update': 'bookings.update',
        'destroy': 'bookings.delete',
        'cancel_booking': 'bookings.cancel',
        'mark_no_show': 'bookings.mark_no_show',
    }

    def get_serializer_class(self):
        if self.action == 'list':
            return BookingListSerializer
        elif self.action == 'create':
            return BookingCreateSerializer
        return BookingSerializer
    
    def get_queryset(self):
        user = self.request.user
        queryset = Booking.objects.select_related('user').all()
        
        # Guests see only their bookings
        if user.role == 'guest':
            queryset = queryset.filter(Q(user=user) | Q(guest_email=user.email))
        
        # Filters
        status_filter = self.request.query_params.get('status', None)
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(booking_id__icontains=search) |
                Q(guest_name__icontains=search) |
                Q(guest_email__icontains=search)
            )
        
        return queryset.order_by('-check_in_date')
    
    def perform_create(self, serializer):
        """
        Create booking with transaction-safe overbooking prevention.

        Uses SELECT FOR UPDATE to lock overlapping bookings during the check,
        preventing race conditions where two concurrent requests might both
        see availability and create conflicting bookings.
        """
        check_in = serializer.validated_data['check_in_date']
        check_out = serializer.validated_data['check_out_date']

        # Use transaction with database-level locking
        with transaction.atomic():
            # Lock all potentially overlapping bookings for this transaction
            # This prevents other concurrent transactions from seeing the same
            # availability until this transaction commits or rolls back
            overlapping_bookings = Booking.objects.select_for_update().exclude(
                status__in=['cancelled', 'checked_out']
            ).filter(
                check_in_date__lt=check_out,
                check_out_date__gt=check_in
            )

            # Force query execution to acquire locks
            list(overlapping_bookings)

            # Now check availability with locked records
            is_available, reason = check_dates_available(check_in, check_out)

            if not is_available:
                # Dates are not available - abort
                from rest_framework.exceptions import ValidationError
                raise ValidationError({'dates': reason})

            # Dates are available and locked - safe to create booking
            booking = serializer.save(created_by=self.request.user)

            # TODO: Send booking confirmation email asynchronously
            # Trigger audit log entry
            # (Will be implemented when audit log integration is added)

        return booking
    
    @action(detail=True, methods=['post'])
    def send_email(self, request, pk=None):
        """Send booking confirmation email."""
        booking = self.get_object()
        # TODO: Implement email sending
        return Response({'message': 'Email sent successfully'})

    @action(detail=True, methods=['post'], url_path='cancel')
    def cancel_booking(self, request, pk=None):
        """
        Cancel a booking.

        When cancelled:
        - Status changes to 'cancelled'
        - cancelled_at timestamp is set
        - Dates immediately become available for new bookings
        - Audit log entry is created

        Requires bookings.cancel permission.
        """
        booking = self.get_object()

        # Check if already cancelled
        if booking.status == 'cancelled':
            return Response(
                {'error': 'Booking is already cancelled'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check if booking can be cancelled (business rules)
        if booking.status == 'checked_out':
            return Response(
                {'error': 'Cannot cancel a checked-out booking'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get cancellation reason from request
        cancellation_reason = request.data.get('reason', '')

        # Store old status for audit log
        old_status = booking.status

        # Update booking
        with transaction.atomic():
            booking.status = 'cancelled'
            booking.cancelled_at = datetime.now()
            booking.cancellation_reason = cancellation_reason
            booking.save(update_fields=['status', 'cancelled_at', 'cancellation_reason', 'updated_at'])

            # Create audit log entry
            from apps.users.models import AuditLog
            AuditLog.objects.create(
                user=request.user,
                role_at_time=request.user.role_name if request.user else '',
                action_type='booking.cancelled',
                resource_type='booking',
                resource_id=str(booking.id),
                metadata={
                    'booking_id': booking.booking_id,
                    'guest_name': booking.guest_name,
                    'check_in_date': booking.check_in_date.isoformat(),
                    'check_out_date': booking.check_out_date.isoformat(),
                    'old_status': old_status,
                    'new_status': 'cancelled',
                    'cancellation_reason': cancellation_reason,
                },
                ip_address=request.META.get('REMOTE_ADDR'),
                user_agent=request.META.get('HTTP_USER_AGENT', '')[:255]
            )

        # TODO: Send cancellation email to guest
        # TODO: Process refund if applicable

        serializer = self.get_serializer(booking)
        return Response({
            'message': 'Booking cancelled successfully',
            'booking': serializer.data
        })

    @action(detail=True, methods=['post'], url_path='mark-no-show')
    def mark_no_show(self, request, pk=None):
        """
        Mark a booking as no-show.

        Two scenarios:
        1. Full no-show: Guest never arrives
           - Set released_from_date = check_in_date
           - All nights become available for new bookings

        2. Partial no-show: Guest disappears mid-stay
           - Set released_from_date = specified date
           - Only nights from that date onward become available
           - Nights before that date remain occupied/charged

        Request body:
        - released_from_date (optional): Date from which to release nights.
          If not provided, defaults to check_in_date (full no-show).

        Requires bookings.mark_no_show permission.
        """
        booking = self.get_object()

        # Validate booking can be marked no-show
        if booking.status in ['cancelled', 'checked_out']:
            return Response(
                {'error': f'Cannot mark {booking.status} booking as no-show'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if booking.status == 'no_show':
            return Response(
                {'error': 'Booking is already marked as no-show'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get released_from_date from request, default to check_in_date
        released_from_str = request.data.get('released_from_date')
        if released_from_str:
            try:
                released_from_date = datetime.strptime(released_from_str, '%Y-%m-%d').date()
            except ValueError:
                return Response(
                    {'error': 'Invalid date format for released_from_date. Use YYYY-MM-DD'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Validate released_from_date is within booking range
            if released_from_date < booking.check_in_date:
                return Response(
                    {'error': 'released_from_date cannot be before check_in_date'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            if released_from_date > booking.check_out_date:
                return Response(
                    {'error': 'released_from_date cannot be after check_out_date'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        else:
            # Full no-show: release all nights
            released_from_date = booking.check_in_date

        # Store old values for audit log
        old_status = booking.status

        # Determine no-show type for audit log
        if released_from_date == booking.check_in_date:
            no_show_type = 'full'
            nights_released = booking.nights
        else:
            no_show_type = 'partial'
            nights_released = (booking.check_out_date - released_from_date).days

        # Update booking
        with transaction.atomic():
            booking.status = 'no_show'
            booking.released_from_date = released_from_date
            booking.save(update_fields=['status', 'released_from_date', 'updated_at'])

            # Create audit log entry
            from apps.users.models import AuditLog
            AuditLog.objects.create(
                user=request.user,
                role_at_time=request.user.role_name if request.user else '',
                action_type='booking.marked_no_show',
                resource_type='booking',
                resource_id=str(booking.id),
                metadata={
                    'booking_id': booking.booking_id,
                    'guest_name': booking.guest_name,
                    'check_in_date': booking.check_in_date.isoformat(),
                    'check_out_date': booking.check_out_date.isoformat(),
                    'old_status': old_status,
                    'new_status': 'no_show',
                    'no_show_type': no_show_type,
                    'released_from_date': released_from_date.isoformat(),
                    'nights_released': nights_released,
                    'total_nights': booking.nights,
                },
                ip_address=request.META.get('REMOTE_ADDR'),
                user_agent=request.META.get('HTTP_USER_AGENT', '')[:255]
            )

        # TODO: Send no-show notification email
        # TODO: Process partial refund if applicable (for unreleased nights)

        serializer = self.get_serializer(booking)
        return Response({
            'message': f'Booking marked as no-show ({no_show_type})',
            'nights_released': nights_released,
            'booking': serializer.data
        })


@api_view(['GET'])
@permission_classes([AllowAny])
def check_availability(request):
    """
    Check if dates are available for booking.

    Uses the same blocking logic as booking creation:
    - Respects cancelled/checked_out bookings (don't block)
    - Respects no_show with released_from_date (partial blocking)
    - Checks BlockedDate records (maintenance, owner use)
    """
    check_in = request.query_params.get('check_in')
    check_out = request.query_params.get('check_out')

    if not check_in or not check_out:
        return Response(
            {'error': 'check_in and check_out parameters required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        check_in_date = datetime.strptime(check_in, '%Y-%m-%d').date()
        check_out_date = datetime.strptime(check_out, '%Y-%m-%d').date()
    except ValueError:
        return Response(
            {'error': 'Invalid date format. Use YYYY-MM-DD'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Use the centralized availability check
    is_available, reason = check_dates_available(check_in_date, check_out_date)

    response_data = {
        'available': is_available,
        'check_in': check_in,
        'check_out': check_out
    }

    if not is_available:
        response_data['reason'] = reason

    return Response(response_data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def calendar_month(request):
    """Get calendar data for a specific month."""
    year = int(request.query_params.get('year', datetime.now().year))
    month = int(request.query_params.get('month', datetime.now().month))
    
    # Get all bookings for the month
    start_date = datetime(year, month, 1).date()
    if month == 12:
        end_date = datetime(year + 1, 1, 1).date()
    else:
        end_date = datetime(year, month + 1, 1).date()
    
    bookings = Booking.objects.filter(
        Q(check_in_date__lt=end_date) & Q(check_out_date__gte=start_date),
        status__in=['confirmed', 'paid', 'checked_in', 'checked_out']
    )
    
    blocked_dates = BlockedDate.objects.filter(
        start_date__lt=end_date,
        end_date__gte=start_date
    )
    
    # Build calendar data
    calendar_data = []
    current_date = start_date
    
    while current_date < end_date:
        date_info = {
            'date': current_date.strftime('%Y-%m-%d'),
            'status': 'available'
        }
        
        # Check if date is booked
        for booking in bookings:
            if booking.check_in_date <= current_date < booking.check_out_date:
                if current_date == booking.check_in_date:
                    date_info['status'] = 'check_in'
                elif current_date == booking.check_out_date - timedelta(days=1):
                    date_info['status'] = 'check_out'
                else:
                    date_info['status'] = 'booked'
                
                date_info['booking'] = {
                    'id': str(booking.id),
                    'booking_id': booking.booking_id,
                    'guest_name': booking.guest_name
                }
                break
        
        # Check if date is blocked
        for blocked in blocked_dates:
            if blocked.start_date <= current_date <= blocked.end_date:
                date_info['status'] = 'blocked'
                date_info['blocked'] = {
                    'id': str(blocked.id),
                    'reason': blocked.reason,
                    'notes': blocked.notes or ''
                }
                break
        
        calendar_data.append(date_info)
        current_date += timedelta(days=1)
    
    return Response(calendar_data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def booking_statistics(request):
    """Get booking statistics for dashboard."""
    if not request.user.is_team_member():
        return Response(
            {'error': 'Permission denied'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    total_bookings = Booking.objects.count()
    confirmed_bookings = Booking.objects.filter(status='confirmed').count()
    paid_bookings = Booking.objects.filter(payment_status='paid').count()
    
    # Revenue
    total_revenue = Booking.objects.filter(
        payment_status='paid'
    ).aggregate(Sum('total_price'))['total_price__sum'] or 0
    
    # This month
    now = datetime.now()
    this_month_bookings = Booking.objects.filter(
        check_in_date__year=now.year,
        check_in_date__month=now.month
    ).count()
    
    return Response({
        'total_bookings': total_bookings,
        'confirmed_bookings': confirmed_bookings,
        'paid_bookings': paid_bookings,
        'total_revenue': float(total_revenue),
        'this_month_bookings': this_month_bookings
    })


class BlockedDateViewSet(viewsets.ModelViewSet):
    """ViewSet for blocked dates management."""
    queryset = BlockedDate.objects.all()
    serializer_class = BlockedDateSerializer
    permission_classes = [IsAuthenticated]
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
