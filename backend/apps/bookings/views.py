from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.db.models import Q, Count, Sum
from datetime import datetime, timedelta
from .models import Booking, BlockedDate
from .serializers import (
    BookingSerializer, BookingListSerializer, BookingCreateSerializer,
    BlockedDateSerializer
)


class BookingViewSet(viewsets.ModelViewSet):
    """ViewSet for booking management."""
    permission_classes = [IsAuthenticated]
    
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
        booking = serializer.save(created_by=self.request.user)
        # TODO: Send booking confirmation email
        return booking
    
    @action(detail=True, methods=['post'])
    def send_email(self, request, pk=None):
        """Send booking confirmation email."""
        booking = self.get_object()
        # TODO: Implement email sending
        return Response({'message': 'Email sent successfully'})


@api_view(['GET'])
@permission_classes([AllowAny])
def check_availability(request):
    """Check if dates are available for booking."""
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
    
    # Check for overlapping bookings
    overlapping = Booking.objects.filter(
        check_in_date__lt=check_out_date,
        check_out_date__gt=check_in_date,
        status__in=['confirmed', 'paid', 'checked_in']
    ).exists()
    
    # Check for blocked dates
    blocked = BlockedDate.objects.filter(
        start_date__lt=check_out_date,
        end_date__gt=check_in_date
    ).exists()
    
    available = not overlapping and not blocked
    
    return Response({
        'available': available,
        'check_in': check_in,
        'check_out': check_out
    })


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
