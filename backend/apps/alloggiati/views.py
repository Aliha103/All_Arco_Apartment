from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.http import HttpResponse
from django.utils import timezone
from django.shortcuts import get_object_or_404
from django.conf import settings
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
from reportlab.lib import colors
from datetime import datetime
import os

from .models import AlloggiatiAccount
from .serializers import AlloggiatiAccountSerializer
from .services import AlloggiatiClient, submit_to_alloggiati
from apps.bookings.models import Booking


class AlloggiatiAccountViewSet(viewsets.ViewSet):
    """
    Minimal endpoints to view token status and trigger refresh.
    """
    permission_classes = [IsAuthenticated]

    def list(self, request):
        account = AlloggiatiAccount.objects.first()
        serializer = AlloggiatiAccountSerializer(account) if account else None
        return Response(serializer.data if serializer else {})

    @action(detail=False, methods=['post'])
    def save_credentials(self, request):
        """
        Save Alloggiati Web credentials (username/password).
        Note: Password is sent in the request but stored only temporarily in env or hashed.
        """
        username = request.data.get('username')
        password = request.data.get('password')

        if not username or not password:
            return Response(
                {"error": "Both username and password are required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get or create the account
        account = AlloggiatiAccount.objects.first()
        if not account:
            account = AlloggiatiAccount.objects.create(username=username)
        else:
            account.username = username
            account.save()

        # Store password in environment variable temporarily for this request
        # Note: In production, consider encrypting and storing in database
        import os
        os.environ['ALLOGGIATI_USERNAME'] = username
        os.environ['ALLOGGIATI_PASSWORD'] = password

        serializer = AlloggiatiAccountSerializer(account)
        return Response({
            "message": "Credentials saved successfully",
            "account": serializer.data
        })

    @action(detail=False, methods=['post'])
    def refresh_token(self, request):
        account, _ = AlloggiatiAccount.objects.get_or_create(pk=AlloggiatiAccount.objects.first() or None)
        client = AlloggiatiClient(account=account)
        result = client.fetch_token()
        if result.get("success"):
            return Response({"message": "Token fetched", "token": result.get("token")})
        return Response({"error": result.get("error"), "raw_response": result.get("raw_response")}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def submit_booking_to_police(request, booking_id):
    """
    Submit booking guest data to Italian police (Alloggiati system).
    """
    booking = get_object_or_404(Booking, id=booking_id)

    # Check if booking has guests
    if not booking.guests.exists():
        return Response(
            {'error': 'No guests registered for this booking'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Check if already sent
    if booking.alloggiati_sent:
        return Response(
            {'error': 'Already sent to police'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        # Submit to Alloggiati
        result = submit_to_alloggiati(booking)

        # Mark as sent
        booking.alloggiati_sent = True
        booking.alloggiati_sent_at = timezone.now()
        booking.alloggiati_sent_by = request.user
        booking.save(update_fields=['alloggiati_sent', 'alloggiati_sent_at', 'alloggiati_sent_by', 'updated_at'])

        return Response({
            'success': True,
            'message': 'Successfully sent to police',
            'sent_at': booking.alloggiati_sent_at,
            'sent_by': f"{request.user.first_name} {request.user.last_name}",
        })

    except Exception as e:
        return Response(
            {'error': f'Failed to send to police: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def generate_alloggiati_pdf(request, booking_id):
    """
    Generate PDF with all guest details, documents, and apartment information.
    """
    booking = get_object_or_404(Booking, id=booking_id)

    # Create HTTP response with PDF content type
    response = HttpResponse(content_type='application/pdf')
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    filename = f'alloggiati_{booking.booking_id}_{timestamp}.pdf'
    response['Content-Disposition'] = f'attachment; filename="{filename}"'

    # Create PDF
    doc = SimpleDocTemplate(response, pagesize=A4, topMargin=1.5*cm, bottomMargin=1.5*cm)
    story = []
    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#1e40af'),
        spaceAfter=20,
        alignment=TA_CENTER,
    )

    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=16,
        textColor=colors.HexColor('#1e40af'),
        spaceAfter=12,
        spaceBefore=20,
    )

    subheading_style = ParagraphStyle(
        'CustomSubheading',
        parent=styles['Heading3'],
        fontSize=12,
        textColor=colors.HexColor('#4b5563'),
        spaceAfter=8,
        spaceBefore=12,
    )

    body_style = ParagraphStyle(
        'CustomBody',
        parent=styles['BodyText'],
        fontSize=10,
        textColor=colors.HexColor('#1f2937'),
        spaceAfter=6,
    )

    # Add logo if exists
    logo_path = os.path.join(settings.BASE_DIR, 'static', 'images', 'logo.png')
    if os.path.exists(logo_path):
        try:
            logo = Image(logo_path, width=4*cm, height=4*cm)
            story.append(logo)
            story.append(Spacer(1, 0.5*cm))
        except:
            pass  # Skip logo if can't load

    # Title
    story.append(Paragraph("All'Arco Apartment", title_style))
    story.append(Paragraph("Guest Registration Report", heading_style))
    story.append(Paragraph("Alloggiati Compliance Document", subheading_style))
    story.append(Spacer(1, 0.5*cm))

    # Generation info
    generated_by = f"{request.user.first_name} {request.user.last_name}"
    generated_at = datetime.now().strftime('%B %d, %Y at %H:%M:%S')

    info_data = [
        ['Generated By:', generated_by],
        ['Generated At:', generated_at],
        ['Document ID:', f'{booking.booking_id}-{timestamp}'],
    ]

    info_table = Table(info_data, colWidths=[4*cm, 12*cm])
    info_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f3f4f6')),
        ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#4b5563')),
        ('TEXTCOLOR', (1, 0), (1, -1), colors.HexColor('#1f2937')),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e5e7eb')),
        ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))

    story.append(info_table)
    story.append(Spacer(1, 0.8*cm))

    # Apartment Details
    story.append(Paragraph("Apartment Information", heading_style))

    apartment_data = [
        ['Property Name:', "All'Arco Apartment"],
        ['Address:', 'Venice, Italy'],
        ['Property Type:', 'Vacation Rental Apartment'],
    ]

    apartment_table = Table(apartment_data, colWidths=[4*cm, 12*cm])
    apartment_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#eff6ff')),
        ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#1e40af')),
        ('TEXTCOLOR', (1, 0), (1, -1), colors.HexColor('#1f2937')),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#dbeafe')),
        ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))

    story.append(apartment_table)
    story.append(Spacer(1, 0.8*cm))

    # Booking Details
    story.append(Paragraph("Booking Information", heading_style))

    booking_data = [
        ['Booking ID:', booking.booking_id],
        ['Check-in Date:', booking.check_in_date.strftime('%B %d, %Y')],
        ['Check-out Date:', booking.check_out_date.strftime('%B %d, %Y')],
        ['Number of Nights:', str(booking.nights)],
        ['Number of Guests:', str(booking.number_of_guests)],
        ['Status:', booking.get_status_display()],
    ]

    if booking.alloggiati_sent:
        booking_data.extend([
            ['Sent to Police:', 'Yes'],
            ['Sent At:', booking.alloggiati_sent_at.strftime('%B %d, %Y at %H:%M') if booking.alloggiati_sent_at else 'N/A'],
            ['Sent By:', booking.alloggiati_sent_by.get_full_name() if booking.alloggiati_sent_by else 'N/A'],
        ])

    booking_table = Table(booking_data, colWidths=[4*cm, 12*cm])
    booking_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f3f4f6')),
        ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#4b5563')),
        ('TEXTCOLOR', (1, 0), (1, -1), colors.HexColor('#1f2937')),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e5e7eb')),
        ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))

    story.append(booking_table)
    story.append(Spacer(1, 1*cm))

    # Guest Details
    guests = booking.guests.all().order_by('-is_primary', 'created_at')

    for idx, guest in enumerate(guests, 1):
        # Guest heading
        guest_title = "Primary Guest" if guest.is_primary else f"Companion {idx - 1}"
        story.append(Paragraph(guest_title, heading_style))

        # Personal Information
        story.append(Paragraph("Personal Information", subheading_style))

        personal_data = [
            ['Full Name:', f'{guest.first_name} {guest.last_name}'],
            ['Date of Birth:', guest.date_of_birth.strftime('%B %d, %Y') if guest.date_of_birth else 'N/A'],
            ['Country of Birth:', guest.country_of_birth or 'N/A'],
        ]

        if guest.birth_city:
            personal_data.append(['Birth City:', f'{guest.birth_city}, {guest.birth_province}' if guest.birth_province else guest.birth_city])

        if guest.email:
            personal_data.append(['Email:', guest.email])

        if guest.relationship:
            personal_data.append(['Relationship:', guest.relationship])

        personal_table = Table(personal_data, colWidths=[4*cm, 12*cm])
        personal_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#fef3c7')),
            ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#92400e')),
            ('TEXTCOLOR', (1, 0), (1, -1), colors.HexColor('#1f2937')),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#fde68a')),
            ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))

        story.append(personal_table)
        story.append(Spacer(1, 0.4*cm))

        # Document Information
        story.append(Paragraph("Document Information", subheading_style))

        document_data = [
            ['Document Type:', guest.get_document_type_display() if hasattr(guest, 'get_document_type_display') else guest.document_type],
            ['Document Number:', guest.document_number or 'N/A'],
        ]

        if guest.document_issue_date:
            document_data.append(['Issue Date:', guest.document_issue_date.strftime('%B %d, %Y')])

        if guest.document_expire_date:
            document_data.append(['Expiry Date:', guest.document_expire_date.strftime('%B %d, %Y')])

        if guest.document_issue_country:
            document_data.append(['Issue Country:', guest.document_issue_country])

        if guest.document_issue_city:
            doc_city = f'{guest.document_issue_city}, {guest.document_issue_province}' if guest.document_issue_province else guest.document_issue_city
            document_data.append(['Issue City:', doc_city])

        document_table = Table(document_data, colWidths=[4*cm, 12*cm])
        document_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#e0f2fe')),
            ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#075985')),
            ('TEXTCOLOR', (1, 0), (1, -1), colors.HexColor('#1f2937')),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#bae6fd')),
            ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))

        story.append(document_table)

        # Notes
        if guest.note:
            story.append(Spacer(1, 0.3*cm))
            story.append(Paragraph("Notes", subheading_style))
            story.append(Paragraph(guest.note, body_style))

        # Registration timestamp
        story.append(Spacer(1, 0.3*cm))
        registration_time = guest.created_at.strftime('%B %d, %Y at %H:%M:%S')
        story.append(Paragraph(f"<i>Registered: {registration_time}</i>", body_style))

        # Add spacing between guests
        if idx < len(guests):
            story.append(Spacer(1, 0.8*cm))

    # Footer
    story.append(Spacer(1, 1*cm))
    footer_style = ParagraphStyle(
        'Footer',
        parent=styles['Normal'],
        fontSize=8,
        textColor=colors.HexColor('#6b7280'),
        alignment=TA_CENTER,
    )
    story.append(Paragraph(
        f"Document generated on {generated_at} by {generated_by}<br/>"
        f"All'Arco Apartment - Venice, Italy<br/>"
        f"Italian Law Compliance (Alloggiati Web)",
        footer_style
    ))

    # Build PDF
    doc.build(story)

    return response
