from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.db.models import Q, Count, Sum
from django.db import transaction
from django.utils import timezone
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
    lookup_value_regex = r'[0-9a-f-]{36}'  # Ensure router does not treat other paths as booking IDs

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
        if not user.is_team_member():
            queryset = queryset.filter(Q(user=user) | Q(guest_email=user.email))
        
        # Filters
        status_filter = self.request.query_params.get('status', None)
        if status_filter:
            statuses = [s.strip() for s in status_filter.split(',') if s.strip()]
            if statuses:
                queryset = queryset.filter(status__in=statuses)
        
        guest_email = self.request.query_params.get('guest_email')
        if guest_email:
            queryset = queryset.filter(guest_email__iexact=guest_email)

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

            # Create referral credit if user was referred
            if booking.user and booking.user.referred_by:
                from apps.users.models import ReferralCredit

                # Calculate €5 per night
                referral_amount = booking.nights * 5

                ReferralCredit.objects.create(
                    referrer=booking.user.referred_by,
                    referred_user=booking.user,
                    booking=booking,
                    amount=referral_amount,
                    nights=booking.nights,
                    status='pending'  # Status will change to 'earned' on checkout
                )

            # TODO: Send booking confirmation email asynchronously
            # Trigger audit log entry
            # (Will be implemented when audit log integration is added)

        return booking

    def perform_update(self, serializer):
        """
        Update booking and handle status changes.

        When status changes to 'checked_out', mark any pending referral credits as earned.
        """
        from django.utils import timezone
        from apps.users.models import ReferralCredit

        # Get the old status before updating
        booking = self.get_object()
        old_status = booking.status

        # Save the updated booking
        updated_booking = serializer.save()

        # If status changed to checked_out, mark referral credits as earned
        if old_status != 'checked_out' and updated_booking.status == 'checked_out':
            # Mark all pending credits for this booking as earned
            ReferralCredit.objects.filter(
                booking=updated_booking,
                status='pending'
            ).update(status='earned', earned_at=timezone.now())

        return updated_booking

    @action(detail=True, methods=['post'])
    def send_email(self, request, pk=None):
        """Send booking confirmation email."""
        booking = self.get_object()
        # TODO: Implement email sending
        return Response({'message': 'Email sent successfully'})

    @action(detail=True, methods=['get'], url_path='download-pdf')
    def download_pdf(self, request, pk=None):
        """
        Generate and download professional booking confirmation PDF with logo.
        """
        import os
        import logging
        from django.http import HttpResponse
        from io import BytesIO
        from reportlab.lib.pagesizes import A4
        from reportlab.lib import colors
        from reportlab.lib.units import cm
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.enums import TA_LEFT, TA_RIGHT, TA_CENTER
        from django.conf import settings

        logger = logging.getLogger(__name__)

        try:
            booking = self.get_object()

            # Create PDF buffer
            buffer = BytesIO()
            doc = SimpleDocTemplate(
                buffer,
                pagesize=A4,
                rightMargin=2.5*cm,
                leftMargin=2.5*cm,
                topMargin=1.5*cm,
                bottomMargin=2*cm,
                title=f'Booking Confirmation - {booking.booking_id}',
                author="All'Arco Apartment Venice",
                subject='Booking Confirmation',
                creator="All'Arco Apartment Venice",
                producer="All'Arco Apartment Venice"
            )

            elements = []
            styles = getSampleStyleSheet()

            # Professional color palette (matching invoice design)
            gold = colors.HexColor('#C4A572')
            dark_gold = colors.HexColor('#A68B5B')
            light_cream = colors.HexColor('#FDFAF5')
            dark_gray = colors.HexColor('#333333')
            medium_gray = colors.HexColor('#666666')
            light_gray = colors.HexColor('#F8F8F8')
            soft_cream = colors.HexColor('#FAF8F3')
            success_green = colors.HexColor('#4CAF50')

            # Custom styles
            title_style = ParagraphStyle(
                'DocTitle',
                parent=styles['Heading1'],
                fontSize=28,
                textColor=gold,
                spaceAfter=2,
                fontName='Helvetica-Bold',
                letterSpacing=1
            )

            # Header with logo and title
            logo_path = os.path.join(settings.BASE_DIR, 'static', 'logos', 'allarco_logo.png')
            logo_element = Paragraph("", styles['Normal'])

            if os.path.exists(logo_path):
                try:
                    # Preserve aspect ratio by only specifying width
                    logo_element = Image(logo_path, width=3.5*cm)
                except Exception as e:
                    logger.error(f"Error loading logo: {str(e)}")
                    logo_element = Paragraph("""
                        <para align=center>
                            <b><font size=16 color=#C4A572>ALL'ARCO<br/>APARTMENT</font></b>
                        </para>""", styles['Normal'])
            else:
                logger.warning(f"Logo file not found at {logo_path}")
                logo_element = Paragraph("""
                    <para align=center>
                        <b><font size=16 color=#C4A572>ALL'ARCO<br/>APARTMENT</font></b>
                    </para>""", styles['Normal'])

            header_data = [[
                Paragraph("BOOKING CONFIRMATION", title_style),
                logo_element
            ]]

            header_table = Table(header_data, colWidths=[11*cm, 5*cm])
            header_table.setStyle(TableStyle([
                ('ALIGN', (0, 0), (0, 0), 'LEFT'),
                ('ALIGN', (1, 0), (1, 0), 'CENTER'),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('RIGHTPADDING', (1, 0), (1, 0), 20),
            ]))
            elements.append(header_table)

            # Decorative line
            line_data = [['']]
            line_table = Table(line_data, colWidths=[16*cm])
            line_table.setStyle(TableStyle([
                ('LINEBELOW', (0, 0), (-1, 0), 2, gold),
                ('TOPPADDING', (0, 0), (-1, 0), 4),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
            ]))
            elements.append(line_table)
            elements.append(Spacer(1, 6))

            # Status badge
            status_display = booking.status.replace('_', ' ').title()
            status_color = success_green if booking.status == 'confirmed' else (gold if booking.status == 'pending' else medium_gray)

            status_badge_style = ParagraphStyle(
                'StatusBadge',
                parent=styles['Normal'],
                fontSize=9,
                fontName='Helvetica-Bold',
                textColor=colors.white,
                alignment=TA_RIGHT,
                letterSpacing=1
            )

            status_para = Paragraph(status_display.upper(), status_badge_style)
            status_table = Table([[status_para]], colWidths=[3*cm])
            status_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, -1), status_color),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('TOPPADDING', (0, 0), (-1, -1), 5),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
                ('LEFTPADDING', (0, 0), (-1, -1), 10),
                ('RIGHTPADDING', (0, 0), (-1, -1), 10),
            ]))

            badge_wrapper = Table([[None, status_table]], colWidths=[13*cm, 3*cm])
            badge_wrapper.setStyle(TableStyle([
                ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ]))
            elements.append(badge_wrapper)
            elements.append(Spacer(1, 10))

            # Booking details in elegant boxes
            left_html = f'<b><font size=10 color=#A68B5B>BOOKING DETAILS</font></b><br/>'
            left_html += f'<font size=9><b>Booking ID:</b> {booking.booking_id}</font><br/>'
            left_html += f'<font size=9><b>Created:</b> {booking.created_at.strftime("%B %d, %Y")}</font><br/>'
            left_html += f'<font size=9><b>Source:</b> {booking.booking_source.replace("_", " ").title() if booking.booking_source else "Direct"}</font><br/>'
            left_html += f'<br/><b><font size=10 color=#A68B5B>GUEST INFORMATION</font></b><br/>'
            left_html += f'<font size=9><b>Name:</b> {booking.guest_name}</font><br/>'
            left_html += f'<font size=9><b>Email:</b> {booking.guest_email}</font><br/>'
            if booking.guest_phone:
                left_html += f'<font size=9><b>Phone:</b> {booking.guest_phone}</font><br/>'
            if booking.guest_country:
                left_html += f'<font size=9><b>Country:</b> {booking.guest_country}</font><br/>'
            if booking.guest_address:
                left_html += f'<font size=9><b>Address:</b> {booking.guest_address}</font>'

            right_html = f'<b><font size=13 color=#C4A572>{booking.booking_id or "—"}</font></b><br/>'
            right_html += f'<br/><b><font size=10 color=#A68B5B>STAY DATES</font></b><br/>'
            right_html += f'<font size=9><b>Check-in:</b> {booking.check_in_date.strftime("%B %d, %Y")}</font><br/>'
            right_html += f'<font size=9><b>Check-out:</b> {booking.check_out_date.strftime("%B %d, %Y")}</font><br/>'
            right_html += f'<font size=9><b>Nights:</b> {booking.nights}</font><br/>'
            right_html += f'<font size=9><b>Guests:</b> {booking.number_of_guests}</font><br/>'
            right_html += f'<br/><b><font size=10 color=#A68B5B>PROPERTY</font></b><br/>'
            right_html += f'<font size=9>ALL\'ARCO APARTMENT</font><br/>'
            right_html += f'<font size=9>Via Castellana 61</font><br/>'
            right_html += f'<font size=9>30125 Venice, Italy</font>'

            left_para = Paragraph(left_html, styles['Normal'])
            right_para = Paragraph(right_html, styles['Normal'])

            two_column_data = [[left_para, right_para]]
            two_column_table = Table(two_column_data, colWidths=[8*cm, 8*cm])
            two_column_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (0, 0), soft_cream),
                ('BACKGROUND', (1, 0), (1, 0), soft_cream),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('LEFTPADDING', (0, 0), (-1, -1), 12),
                ('RIGHTPADDING', (0, 0), (-1, -1), 12),
                ('TOPPADDING', (0, 0), (-1, -1), 12),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
                ('BOX', (0, 0), (0, 0), 0.5, colors.HexColor('#E8E3D5')),
                ('BOX', (1, 0), (1, 0), 0.5, colors.HexColor('#E8E3D5')),
            ]))
            elements.append(two_column_table)
            elements.append(Spacer(1, 18))

            # Pricing table
            table_data = [['Description', 'Qty', 'Unit Price', 'Amount']]

            nightly_total = float(booking.nightly_rate or 0) * booking.nights
            table_data.append([
                f'Accommodation ({booking.nights} night{"s" if booking.nights != 1 else ""})',
                '1',
                f'EUR {booking.nightly_rate or 0:.2f}',
                f'EUR {nightly_total:.2f}'
            ])

            if booking.cleaning_fee:
                table_data.append([
                    'Cleaning Fee',
                    '1',
                    f'EUR {booking.cleaning_fee:.2f}',
                    f'EUR {booking.cleaning_fee:.2f}'
                ])

            if booking.tourist_tax:
                tax_per_guest = float(booking.tourist_tax) / max(booking.number_of_guests, 1)
                table_data.append([
                    'Tourist Tax (Venice)',
                    str(booking.number_of_guests),
                    f'EUR {tax_per_guest:.2f}',
                    f'EUR {booking.tourist_tax:.2f}'
                ])

            # Total row
            table_data.append(['', '', 'TOTAL', f'EUR {booking.total_price:.2f}'])

            col_widths = [8*cm, 2*cm, 3*cm, 3*cm]
            pricing_table = Table(table_data, colWidths=col_widths)

            table_style = [
                # Header row
                ('BACKGROUND', (0, 0), (-1, 0), gold),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 10),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
                ('TOPPADDING', (0, 0), (-1, 0), 10),
                ('LEFTPADDING', (0, 0), (-1, 0), 12),
                ('RIGHTPADDING', (0, 0), (-1, 0), 12),

                # Data rows
                ('FONTNAME', (0, 1), (-1, -2), 'Helvetica'),
                ('FONTSIZE', (0, 1), (-1, -2), 9),
                ('TEXTCOLOR', (0, 1), (-1, -2), dark_gray),
                ('TOPPADDING', (0, 1), (-1, -2), 10),
                ('BOTTOMPADDING', (0, 1), (-1, -2), 10),
                ('LEFTPADDING', (0, 1), (-1, -2), 12),
                ('RIGHTPADDING', (0, 1), (-1, -2), 12),

                # Horizontal lines
                ('LINEBELOW', (0, 0), (-1, -2), 0.5, colors.HexColor('#E5E5E5')),

                # Total row
                ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
                ('FONTSIZE', (0, -1), (-1, -1), 13),
                ('TEXTCOLOR', (0, -1), (-1, -1), dark_gray),
                ('TOPPADDING', (0, -1), (-1, -1), 14),
                ('BOTTOMPADDING', (0, -1), (-1, -1), 10),
                ('LEFTPADDING', (0, -1), (-1, -1), 12),
                ('RIGHTPADDING', (0, -1), (-1, -1), 12),
                ('LINEABOVE', (0, -1), (-1, -1), 2, gold),

                # Alignment
                ('ALIGN', (1, 0), (1, -1), 'CENTER'),
                ('ALIGN', (2, 0), (-1, -1), 'RIGHT'),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ]

            # Alternating row colors
            for i in range(1, len(table_data) - 1):
                if i % 2 == 0:
                    table_style.append(('BACKGROUND', (0, i), (-1, i), colors.HexColor('#FAFAFA')))

            pricing_table.setStyle(TableStyle(table_style))
            elements.append(pricing_table)
            elements.append(Spacer(1, 18))

            # Special requests section
            if booking.special_requests:
                notes_text = f'<b><font size=9 color=#A68B5B>SPECIAL REQUESTS</font></b><br/><font size=9>{booking.special_requests}</font>'
                notes_para = Paragraph(notes_text, styles['Normal'])

                notes_table = Table([[notes_para]], colWidths=[16*cm])
                notes_table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, -1), soft_cream),
                    ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#E8E3D5')),
                    ('LEFTPADDING', (0, 0), (-1, -1), 15),
                    ('RIGHTPADDING', (0, 0), (-1, -1), 15),
                    ('TOPPADDING', (0, 0), (-1, -1), 12),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
                ]))
                elements.append(notes_table)
                elements.append(Spacer(1, 15))

            # Footer
            footer_line_data = [['']]
            footer_line_table = Table(footer_line_data, colWidths=[16*cm])
            footer_line_table.setStyle(TableStyle([
                ('LINEABOVE', (0, 0), (-1, 0), 1.5, gold),
                ('TOPPADDING', (0, 0), (-1, 0), 8),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 6),
            ]))
            elements.append(footer_line_table)

            footer_thanks_style = ParagraphStyle(
                'FooterThanks',
                parent=styles['Normal'],
                fontSize=10,
                textColor=dark_gray,
                alignment=TA_CENTER,
                spaceAfter=8,
                fontName='Helvetica-Bold'
            )

            footer_info_style = ParagraphStyle(
                'FooterInfo',
                parent=styles['Normal'],
                fontSize=8,
                textColor=medium_gray,
                alignment=TA_CENTER,
                spaceAfter=2,
                leading=11
            )

            elements.append(Paragraph("Thank you for choosing All'Arco Apartment Venice", footer_thanks_style))
            elements.append(Paragraph("www.allarcoapartment.com", footer_info_style))
            elements.append(Paragraph("Via Castellana 61, 30125 Venice, Italy", footer_info_style))
            elements.append(Paragraph("Email: support@allarcoapartment.com", footer_info_style))

            # Build PDF
            doc.build(elements)

            # Return PDF response
            pdf = buffer.getvalue()
            buffer.close()

            response = HttpResponse(pdf, content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="booking-{booking.booking_id}.pdf"'
            return response
        except Exception as e:
            logger.error(f"PDF generation error: {str(e)}", exc_info=True)
            return HttpResponse(
                f"Error generating PDF: {str(e)}",
                status=500
            )

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
            booking.cancelled_at = timezone.now()
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
        status__in=['pending', 'confirmed', 'paid', 'checked_in', 'checked_out', 'no_show']
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
                    'guest_name': booking.guest_name,
                    'check_in_date': booking.check_in_date,
                    'check_out_date': booking.check_out_date,
                    'number_of_guests': booking.number_of_guests,
                    'total_price': booking.total_price,
                    'booking_source': booking.booking_source,
                    'status': booking.status,
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
    """
    Comprehensive dashboard statistics for single apartment PMS.

    Requires: dashboard.view permission (checked via role permissions)

    Returns metrics for current month including:
    - Total revenue
    - Total bookings
    - Occupancy rate (for single apartment)
    - Average daily rate (ADR)
    - RevPAR (Revenue per available room/night)
    - Status breakdown (confirmed, pending, cancelled, etc.)
    - Today's arrivals and departures
    - Recent bookings for timeline
    """
    # Check permission for dashboard view (role-based access control)
    if not request.user.has_perm_code('dashboard.view'):
        return Response(
            {'error': 'Permission denied. You do not have permission to view the dashboard.'},
            status=status.HTTP_403_FORBIDDEN
        )

    # Get date range for current month
    now = timezone.now()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    if now.month == 12:
        month_end = now.replace(year=now.year + 1, month=1, day=1)
    else:
        month_end = now.replace(month=now.month + 1, day=1)
    month_end = month_end.replace(hour=0, minute=0, second=0, microsecond=0)

    # Calculate total days in month
    days_in_month = (month_end - month_start).days

    # Get this month's bookings
    month_bookings = Booking.objects.filter(
        check_in_date__lt=month_end,
        check_out_date__gte=month_start
    ).exclude(status='cancelled')

    # Calculate occupied nights for occupancy rate
    occupied_nights = 0
    for booking in month_bookings:
        # Calculate overlap with current month
        overlap_start = max(booking.check_in_date, month_start.date())
        overlap_end = min(booking.check_out_date, month_end.date())
        if overlap_start < overlap_end:
            nights = (overlap_end - overlap_start).days
            occupied_nights += nights

    # Occupancy rate for single apartment
    occupancy_rate = round((occupied_nights / days_in_month) * 100, 1) if days_in_month > 0 else 0

    # Revenue statistics (paid bookings this month)
    revenue_bookings = month_bookings.filter(payment_status='paid')
    total_revenue = revenue_bookings.aggregate(Sum('total_price'))['total_price__sum'] or 0

    # Total bookings count
    total_bookings = month_bookings.count()

    # Average Daily Rate (ADR) = Total Revenue / Occupied Nights
    adr = round(total_revenue / occupied_nights, 2) if occupied_nights > 0 else 0

    # RevPAR = Total Revenue / Available Nights
    revpar = round(total_revenue / days_in_month, 2) if days_in_month > 0 else 0

    # Status breakdown
    confirmed = month_bookings.filter(status='confirmed').count()
    pending = month_bookings.filter(status='pending').count()
    checked_in = month_bookings.filter(status='checked_in').count()
    checked_out = month_bookings.filter(status='checked_out').count()

    # Today's operations
    today = now.date()
    todays_arrivals = Booking.objects.filter(
        check_in_date=today,
        status__in=['confirmed', 'paid', 'checked_in']
    ).select_related('user')

    todays_departures = Booking.objects.filter(
        check_out_date=today,
        status='checked_in'
    ).select_related('user')

    # Current guest (checked in, hasn't checked out yet)
    current_guest = Booking.objects.filter(
        check_in_date__lte=today,
        check_out_date__gt=today,
        status='checked_in'
    ).first()

    in_house_guests = current_guest.number_of_guests if current_guest else 0

    # Recent bookings for timeline (last 20)
    recent_bookings = Booking.objects.all().order_by('-created_at')[:20]

    # Upcoming bookings (next 30 days)
    upcoming_end = today + timedelta(days=30)
    upcoming_bookings = Booking.objects.filter(
        check_in_date__gte=today,
        check_in_date__lt=upcoming_end,
        status__in=['confirmed', 'paid']
    ).order_by('check_in_date')[:10]

    # Serialize arrivals and departures
    from .serializers import BookingListSerializer
    arrivals_data = BookingListSerializer(todays_arrivals, many=True).data
    departures_data = BookingListSerializer(todays_departures, many=True).data
    recent_data = BookingListSerializer(recent_bookings, many=True).data
    upcoming_data = BookingListSerializer(upcoming_bookings, many=True).data

    # Build response
    response_data = {
        # Period info
        'period': {
            'month': now.month,
            'year': now.year,
            'month_name': now.strftime('%B'),
            'days_in_month': days_in_month,
            'days_elapsed': now.day,
        },

        # Key metrics
        'metrics': {
            'total_revenue': float(total_revenue),
            'total_bookings': total_bookings,
            'occupancy_rate': occupancy_rate,
            'occupied_nights': occupied_nights,
            'average_daily_rate': float(adr),
            'revpar': float(revpar),
        },

        # Status breakdown
        'status': {
            'confirmed': confirmed,
            'pending': pending,
            'checked_in': checked_in,
            'checked_out': checked_out,
        },

        # Today's operations
        'today': {
            'arrivals': arrivals_data,
            'departures': departures_data,
            'in_house_guests': in_house_guests,
            'is_occupied': current_guest is not None,
            'current_booking_id': current_guest.booking_id if current_guest else None,
        },

        # Recent activity
        'recent_bookings': recent_data,
        'upcoming_bookings': upcoming_data,

        # Apartment status
        'apartment': {
            'is_occupied': current_guest is not None,
            'guest_count': in_house_guests,
            'current_checkout_date': current_guest.check_out_date.isoformat() if current_guest else None,
        }
    }

    return Response(response_data)


class BlockedDateViewSet(viewsets.ModelViewSet):
    """ViewSet for blocked dates management."""
    queryset = BlockedDate.objects.all()
    serializer_class = BlockedDateSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


# ============================================================================
# Public Booking Lookup API (No Authentication Required)
# ============================================================================

@api_view(['POST'])
@permission_classes([AllowAny])
def public_booking_lookup(request):
    """
    Public endpoint to find a booking by confirmation number and email.

    Both booking_id (confirmation) and email must match exactly.
    Returns booking details for guest self-service.

    Request body:
    - confirmation: string (booking_id like ARK-20241128-0001)
    - email: string (guest email)

    Returns sanitized booking data (no internal notes, no user details).
    """
    confirmation = request.data.get('confirmation', '').strip().upper()
    email = request.data.get('email', '').strip().lower()

    if not confirmation or not email:
        return Response(
            {'error': 'Both confirmation number and email are required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Find booking where BOTH confirmation AND email match
    try:
        booking = Booking.objects.get(
            booking_id__iexact=confirmation,
            guest_email__iexact=email
        )
    except Booking.DoesNotExist:
        return Response(
            {
                'error': 'No booking found',
                'message': 'We could not find a booking matching this confirmation number and email. Please verify your details and try again.'
            },
            status=status.HTTP_404_NOT_FOUND
        )

    # Return sanitized booking data (exclude internal fields)
    return Response({
        'booking': {
            'id': str(booking.id),
            'booking_id': booking.booking_id,
            'guest_name': booking.guest_name,
            'guest_email': booking.guest_email,
            'guest_phone': booking.guest_phone,
            'guest_country': booking.guest_country,
            'check_in_date': booking.check_in_date.isoformat(),
            'check_out_date': booking.check_out_date.isoformat(),
            'nights': booking.nights,
            'number_of_guests': booking.number_of_guests,
            'status': booking.status,
            'status_display': booking.get_status_display(),
            'payment_status': booking.payment_status,
            'payment_status_display': booking.get_payment_status_display(),
            'nightly_rate': float(booking.nightly_rate),
            'cleaning_fee': float(booking.cleaning_fee),
            'tourist_tax': float(booking.tourist_tax),
            'total_price': float(booking.total_price),
            'special_requests': booking.special_requests,
            'created_at': booking.created_at.isoformat(),
            # Check if check-in data exists
            'has_checkin_data': booking.guests.filter(is_primary=True).exists(),
            'guests_count': booking.guests.count(),
            # Check if linked to user account
            'has_account': booking.user is not None,
        }
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def public_booking_update(request):
    """
    Public endpoint to update guest details on a booking.

    Requires confirmation + email verification before allowing updates.
    Only allows updating: guest_name, guest_phone, special_requests

    Request body:
    - confirmation: string (booking_id)
    - email: string (guest email for verification)
    - updates: object with fields to update (guest_name, guest_phone, special_requests)
    """
    confirmation = request.data.get('confirmation', '').strip().upper()
    email = request.data.get('email', '').strip().lower()
    updates = request.data.get('updates', {})

    if not confirmation or not email:
        return Response(
            {'error': 'Both confirmation number and email are required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Find and verify booking
    try:
        booking = Booking.objects.get(
            booking_id__iexact=confirmation,
            guest_email__iexact=email
        )
    except Booking.DoesNotExist:
        return Response(
            {'error': 'Booking not found or email does not match'},
            status=status.HTTP_404_NOT_FOUND
        )

    # Check if booking can be modified
    if booking.status in ['cancelled', 'checked_out']:
        return Response(
            {'error': f'Cannot modify a {booking.get_status_display()} booking'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Allowed fields for guest self-service update
    allowed_fields = ['guest_name', 'guest_phone', 'special_requests']
    updated_fields = []

    for field in allowed_fields:
        if field in updates and updates[field] is not None:
            setattr(booking, field, updates[field])
            updated_fields.append(field)

    if not updated_fields:
        return Response(
            {'error': 'No valid fields to update'},
            status=status.HTTP_400_BAD_REQUEST
        )

    booking.save(update_fields=updated_fields + ['updated_at'])

    return Response({
        'message': 'Booking updated successfully',
        'updated_fields': updated_fields,
        'booking': {
            'id': str(booking.id),
            'booking_id': booking.booking_id,
            'guest_name': booking.guest_name,
            'guest_phone': booking.guest_phone,
            'special_requests': booking.special_requests,
        }
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def public_booking_checkin(request):
    """
    Public endpoint for guest online check-in.

    Allows guests to submit their check-in information (ID documents, etc.)
    before arrival. Required for Italian Alloggiati Web compliance.

    Request body:
    - confirmation: string (booking_id)
    - email: string (guest email for verification)
    - guests: array of guest objects with check-in data
    """
    from .models import BookingGuest

    confirmation = request.data.get('confirmation', '').strip().upper()
    email = request.data.get('email', '').strip().lower()
    guests_data = request.data.get('guests', [])

    if not confirmation or not email:
        return Response(
            {'error': 'Both confirmation number and email are required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    if not guests_data:
        return Response(
            {'error': 'At least one guest is required for check-in'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Find and verify booking
    try:
        booking = Booking.objects.get(
            booking_id__iexact=confirmation,
            guest_email__iexact=email
        )
    except Booking.DoesNotExist:
        return Response(
            {'error': 'Booking not found or email does not match'},
            status=status.HTTP_404_NOT_FOUND
        )

    # Check if booking can accept check-in data
    if booking.status in ['cancelled', 'checked_out']:
        return Response(
            {'error': f'Cannot check in for a {booking.get_status_display()} booking'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Process guests
    created_guests = []
    errors = []

    with transaction.atomic():
        # Clear existing guests if re-submitting
        booking.guests.all().delete()

        for i, guest_data in enumerate(guests_data):
            try:
                guest = BookingGuest(
                    booking=booking,
                    is_primary=(i == 0),  # First guest is primary
                    first_name=guest_data.get('first_name', ''),
                    last_name=guest_data.get('last_name', ''),
                    email=guest_data.get('email') if i == 0 else guest_data.get('email', ''),
                    date_of_birth=guest_data.get('date_of_birth'),
                    country_of_birth=guest_data.get('country_of_birth', ''),
                    birth_province=guest_data.get('birth_province'),
                    birth_city=guest_data.get('birth_city'),
                    document_type=guest_data.get('document_type', ''),
                    document_number=guest_data.get('document_number', ''),
                    document_issue_date=guest_data.get('document_issue_date'),
                    document_expire_date=guest_data.get('document_expire_date'),
                    document_issue_country=guest_data.get('document_issue_country', ''),
                    document_issue_province=guest_data.get('document_issue_province'),
                    document_issue_city=guest_data.get('document_issue_city'),
                )
                guest.full_clean()
                guest.save()
                created_guests.append({
                    'id': str(guest.id),
                    'name': f"{guest.first_name} {guest.last_name}",
                    'is_primary': guest.is_primary
                })
            except Exception as e:
                errors.append({
                    'guest_index': i,
                    'error': str(e)
                })

    if errors:
        return Response({
            'error': 'Some guests could not be added',
            'details': errors
        }, status=status.HTTP_400_BAD_REQUEST)

    return Response({
        'message': 'Check-in information submitted successfully',
        'guests': created_guests,
        'booking_id': booking.booking_id
    })
