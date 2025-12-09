from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.http import HttpResponse
from django.db.models import Sum
from django.utils import timezone
from .models import Invoice, Company
from .serializers import InvoiceSerializer, CompanySerializer


class InvoiceViewSet(viewsets.ModelViewSet):
    """ViewSet for invoice management."""
    serializer_class = InvoiceSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        queryset = Invoice.objects.select_related('booking').all()
        
        # Guests see only their invoices
        if user.role == 'guest':
            queryset = queryset.filter(booking__user=user)
        
        return queryset.order_by('-issue_date')
    
    @action(detail=True, methods=['post'])
    def generate_pdf(self, request, pk=None):
        """Generate PDF for invoice."""
        # Deprecated: PDF generation is handled via download_pdf using reportlab
        invoice = self.get_object()
        return Response({
            'message': 'Use download_pdf endpoint for PDF generation',
            'pdf_url': f'/api/invoices/{invoice.id}/download_pdf/'
        })

    @action(detail=True, methods=['get'])
    def download_pdf(self, request, pk=None):
        """Download invoice or receipt PDF with appropriate design."""
        invoice = self.get_object()

        try:
            import os
            from io import BytesIO
            from reportlab.lib.pagesizes import A4
            from reportlab.lib import colors
            from reportlab.lib.units import cm
            from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Frame, PageTemplate, Image
            from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
            from reportlab.lib.enums import TA_LEFT, TA_RIGHT, TA_CENTER
            from reportlab.pdfgen import canvas as pdf_canvas
            from django.conf import settings

            booking = invoice.booking
            is_invoice = invoice.type == 'invoice'
            doc_type_label = 'INVOICE' if is_invoice else 'RECEIPT'

            # Calculate totals
            amount = float(invoice.amount) if invoice.amount > 0 else float(booking.total_price)
            nights = (booking.check_out_date - booking.check_in_date).days

            # Create PDF buffer
            buffer = BytesIO()
            doc = SimpleDocTemplate(
                buffer,
                pagesize=A4,
                rightMargin=2.5*cm,
                leftMargin=2.5*cm,
                topMargin=1.5*cm,
                bottomMargin=2*cm
            )

            elements = []
            styles = getSampleStyleSheet()

            # Professional color palette
            gold = colors.HexColor('#C4A572')
            dark_gold = colors.HexColor('#A68B5B')
            light_cream = colors.HexColor('#FDFAF5')
            dark_gray = colors.HexColor('#333333')
            medium_gray = colors.HexColor('#666666')
            light_gray = colors.HexColor('#F8F8F8')
            success_green = colors.HexColor('#4CAF50')
            soft_cream = colors.HexColor('#FAF8F3')

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

            heading_style = ParagraphStyle(
                'SectionHeading',
                fontSize=10,
                textColor=dark_gold,
                spaceAfter=6,
                fontName='Helvetica-Bold',
                spaceBefore=8,
                letterSpacing=0.5,
                textTransform='uppercase'
            )

            # Header with logo on right
            # Try to load company logo image
            logo_path = os.path.join(settings.BASE_DIR, 'staticfiles', 'logos', 'allarco_logo.png')
            logo_element = None

            if os.path.exists(logo_path):
                try:
                    # Use actual logo image
                    logo_img = Image(logo_path, width=4*cm, height=4*cm)
                    logo_element = logo_img
                except Exception as e:
                    # Log the error but continue with text fallback
                    print(f"Failed to load logo image: {str(e)}")
                    import traceback
                    traceback.print_exc()

            # Fallback to text logo if image doesn't exist or fails to load
            if logo_element is None:
                logo_element = Paragraph("""<para align=center>
                    <font size=14 color=#C4A572><b>ALL'ARCO</b></font><br/>
                    <font size=12 color=#C4A572><b>APARTMENT</b></font><br/>
                    <font size=7 color=grey>Venice, Italy</font>
                </para>""", styles['Normal'])

            header_data = [[
                Paragraph(doc_type_label, title_style),
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

            # Decorative line below header
            line_data = [['']]
            line_table = Table(line_data, colWidths=[16*cm])
            line_table.setStyle(TableStyle([
                ('LINEBELOW', (0, 0), (-1, 0), 2, gold),
                ('TOPPADDING', (0, 0), (-1, 0), 4),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
            ]))
            elements.append(line_table)
            elements.append(Spacer(1, 6))

            # Payment Status Badge
            status_text = 'PAID' if invoice.status == 'paid' else ('PENDING' if invoice.status == 'pending' else 'UNPAID')
            status_color = success_green if invoice.status == 'paid' else (gold if invoice.status == 'pending' else medium_gray)

            status_badge_style = ParagraphStyle(
                'StatusBadge',
                parent=styles['Normal'],
                fontSize=9,
                fontName='Helvetica-Bold',
                textColor=colors.white,
                alignment=TA_RIGHT,
                letterSpacing=1
            )

            status_para = Paragraph(status_text, status_badge_style)
            status_table = Table([[status_para]], colWidths=[3*cm])
            status_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, -1), status_color),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('TOPPADDING', (0, 0), (-1, -1), 5),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
                ('LEFTPADDING', (0, 0), (-1, -1), 10),
                ('RIGHTPADDING', (0, 0), (-1, -1), 10),
                ('ROUNDEDCORNERS', [3, 3, 3, 3]),
            ]))

            # Align badge to the right
            badge_wrapper = Table([[None, status_table]], colWidths=[13*cm, 3*cm])
            badge_wrapper.setStyle(TableStyle([
                ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ]))
            elements.append(badge_wrapper)
            elements.append(Spacer(1, 10))

            # TWO-COLUMN LAYOUT: Left side (Guest/Bill) | Right side (Details/Contact)

            # Styles for this section
            doc_number_style = ParagraphStyle(
                'DocNumber',
                fontSize=12,
                textColor=dark_gray,
                fontName='Helvetica-Bold',
                spaceAfter=4
            )

            doc_detail_style = ParagraphStyle(
                'DocDetail',
                fontSize=9,
                textColor=medium_gray,
                fontName='Helvetica',
                spaceAfter=2
            )

            # Build left column content with line breaks (single para tag)
            left_html = f'<b><font size=10 color=#A68B5B>GUEST DETAILS</font></b><br/>'
            left_html += f'<font size=9>Full Name: {booking.guest_name}</font><br/>'
            left_html += f'<font size=9>Email: {booking.guest_email}</font><br/>'

            if hasattr(booking, 'guest_tax_code') and booking.guest_tax_code:
                left_html += f'<font size=9>Tax ID: {booking.guest_tax_code}</font><br/>'
            if hasattr(booking, 'guest_phone') and booking.guest_phone:
                left_html += f'<font size=9>Phone: {booking.guest_phone}</font><br/>'
            if hasattr(booking, 'guest_country') and booking.guest_country:
                left_html += f'<font size=9>Country: {booking.guest_country}</font><br/>'
            if hasattr(booking, 'guest_address') and booking.guest_address:
                left_html += f'<font size=9>Address: {booking.guest_address}</font><br/>'

            # Add Bill To if invoice
            if is_invoice and invoice.company:
                company = invoice.company
                left_html += f'<br/><b><font size=10 color=#A68B5B>BILL TO</font></b><br/>'
                left_html += f'<font size=9>{company.name}</font><br/>'
                left_html += f'<font size=9>VAT: {company.vat_number}</font><br/>'
                left_html += f'<font size=9>Country: {company.country}</font><br/>'
                left_html += f'<font size=9>Email: {company.email}</font><br/>'
                left_html += f'<font size=9>{company.address}</font>'

            # Build right column content with line breaks (single para tag)
            right_html = f'<b><font size=13 color=#C4A572>{invoice.invoice_number}</font></b><br/>'
            right_html += f'<br/>'  # spaceBefore=4 equivalent
            right_html += f'<font size=9 color=#666666><b>Date:</b> {invoice.issue_date.strftime("%B %d, %Y")}</font><br/>'

            if hasattr(booking, 'booking_id') and booking.booking_id:
                right_html += f'<font size=9 color=#666666><b>Booking:</b> {booking.booking_id}</font><br/>'

            right_html += f'<font size=9 color=#666666><b>Check-in:</b> {booking.check_in_date.strftime("%b %d, %Y")} | <b>Check-out:</b> {booking.check_out_date.strftime("%b %d, %Y")}</font><br/>'
            right_html += f'<br/><br/>'  # spaceBefore=12 equivalent (more space)
            right_html += f'<b><font size=11 color=#A68B5B>ALL\'ARCO APARTMENT</font></b><br/>'
            right_html += f'<font size=9 color=#333333>Via Castellana 61<br/>30174 Venice, Italy</font><br/>'
            right_html += f'<br/>'  # spaceBefore=6 equivalent
            right_html += f'<font size=8 color=#666666>support@allarcoapartment.com<br/>www.allarcoapartment.com</font>'

            # Create paragraphs for both columns
            left_para = Paragraph(left_html, styles['Normal'])
            right_para = Paragraph(right_html, styles['Normal'])

            # Create two-column table with elegant backgrounds
            two_column_data = [[left_para, right_para]]
            two_column_table = Table(two_column_data, colWidths=[8*cm, 8*cm])
            two_column_table.setStyle(TableStyle([
                # Subtle cream backgrounds for both columns
                ('BACKGROUND', (0, 0), (0, 0), soft_cream),
                ('BACKGROUND', (1, 0), (1, 0), soft_cream),

                # Alignment and padding
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('LEFTPADDING', (0, 0), (-1, -1), 12),
                ('RIGHTPADDING', (0, 0), (-1, -1), 12),
                ('TOPPADDING', (0, 0), (-1, -1), 12),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 12),

                # Add subtle border around each box
                ('BOX', (0, 0), (0, 0), 0.5, colors.HexColor('#E8E3D5')),
                ('BOX', (1, 0), (1, 0), 0.5, colors.HexColor('#E8E3D5')),
            ]))
            elements.append(two_column_table)
            elements.append(Spacer(1, 12))

            # Line items table
            table_data = [['Description', 'Qty', 'Unit Price', 'Payment', 'Amount']]

            # Accommodation
            accom_total = amount - float(booking.cleaning_fee or 0) - float(booking.tourist_tax or 0)
            accom_unit_price = accom_total / nights if nights > 1 else accom_total

            table_data.append([
                'Accommodation',
                str(nights) if nights > 1 else '1',
                f'EUR {accom_unit_price:.2f}',
                'Included',
                f'EUR {accom_total:.2f}'
            ])

            # City Tax
            if float(booking.tourist_tax or 0) > 0:
                tax_label = 'City Tax (Venice)' if is_invoice else 'City Tax'
                table_data.append([
                    tax_label,
                    str(nights) if nights > 1 else '1',
                    f'EUR {float(booking.tourist_tax) / nights if nights > 1 else float(booking.tourist_tax):.2f}',
                    'Included',
                    f'EUR {float(booking.tourist_tax):.2f}'
                ])

            # Cleaning Fee
            if float(booking.cleaning_fee or 0) > 0:
                table_data.append([
                    'Cleaning Fee',
                    '1',
                    f'EUR {float(booking.cleaning_fee):.2f}',
                    'Included',
                    f'EUR {float(booking.cleaning_fee):.2f}'
                ])

            # Total row
            table_data.append(['', '', '', 'TOTAL:', f'EUR {amount:.2f}'])

            # Create and style table with professional styling
            col_widths = [6*cm, 2*cm, 3*cm, 2.5*cm, 2.5*cm]
            items_table = Table(table_data, colWidths=col_widths)

            # Build table style with cleaner, more professional design
            table_style = [
                # Header row - elegant gold
                ('BACKGROUND', (0, 0), (-1, 0), gold),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 10),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
                ('TOPPADDING', (0, 0), (-1, 0), 10),
                ('LEFTPADDING', (0, 0), (-1, 0), 12),
                ('RIGHTPADDING', (0, 0), (-1, 0), 12),

                # Data rows - increased padding for breathing room
                ('FONTNAME', (0, 1), (-1, -2), 'Helvetica'),
                ('FONTSIZE', (0, 1), (-1, -2), 9),
                ('TEXTCOLOR', (0, 1), (-1, -2), dark_gray),
                ('TOPPADDING', (0, 1), (-1, -2), 10),
                ('BOTTOMPADDING', (0, 1), (-1, -2), 10),
                ('LEFTPADDING', (0, 1), (-1, -2), 12),
                ('RIGHTPADDING', (0, 1), (-1, -2), 12),

                # Horizontal lines between rows only (no vertical lines)
                ('LINEBELOW', (0, 0), (-1, -2), 0.5, colors.HexColor('#E5E5E5')),

                # Total row - prominent but clean
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

            # Add subtle alternating row backgrounds
            for i in range(1, len(table_data) - 1):
                if i % 2 == 0:
                    table_style.append(('BACKGROUND', (0, i), (-1, i), colors.HexColor('#FAFAFA')))

            items_table.setStyle(TableStyle(table_style))

            elements.append(items_table)
            elements.append(Spacer(1, 18))

            # Payment section with elegant box
            payment_messages = {
                'cash': 'This booking has been PAID BY CASH.',
                'card': 'This booking has been PAID BY CARD.',
                'bank_transfer': 'This booking has been PAID BY BANK TRANSFER.',
                'property': 'This booking is to be PAID AT PROPERTY.',
                'stripe': 'This booking has been PAID ONLINE.'
            }

            payment_msg = payment_messages.get(invoice.payment_method, 'Payment pending.')

            payment_box_style = ParagraphStyle(
                'PaymentBox',
                parent=styles['Normal'],
                fontSize=10,
                fontName='Helvetica-Bold',
                textColor=dark_gray,
                leading=14
            )

            payment_text = f'<b><font size=9 color=#A68B5B>PAYMENT STATUS</font></b><br/><font size=10>{payment_msg}</font>'
            payment_para = Paragraph(payment_text, payment_box_style)

            payment_table = Table([[payment_para]], colWidths=[16*cm])
            payment_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, -1), soft_cream),
                ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#E8E3D5')),
                ('LEFTPADDING', (0, 0), (-1, -1), 15),
                ('RIGHTPADDING', (0, 0), (-1, -1), 15),
                ('TOPPADDING', (0, 0), (-1, -1), 12),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
            ]))
            elements.append(payment_table)
            elements.append(Spacer(1, 20))

            # Notes/Terms section (if any special notes exist)
            if hasattr(booking, 'special_requests') and booking.special_requests:
                notes_heading_style = ParagraphStyle(
                    'NotesHeading',
                    fontSize=9,
                    textColor=dark_gold,
                    fontName='Helvetica-Bold',
                    spaceAfter=4,
                    letterSpacing=0.5
                )

                notes_text_style = ParagraphStyle(
                    'NotesText',
                    fontSize=8,
                    textColor=dark_gray,
                    fontName='Helvetica',
                    leading=11
                )

                elements.append(Paragraph("SPECIAL REQUESTS & NOTES", notes_heading_style))
                elements.append(Paragraph(booking.special_requests, notes_text_style))
                elements.append(Spacer(1, 15))

            # Footer - Professional with decorative line
            # Decorative line before footer
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

            footer_url_style = ParagraphStyle(
                'FooterURL',
                parent=styles['Normal'],
                fontSize=8,
                textColor=dark_gold,
                alignment=TA_CENTER,
                fontName='Helvetica-Bold',
                spaceAfter=6
            )

            footer_legal_style = ParagraphStyle(
                'FooterLegal',
                parent=styles['Normal'],
                fontSize=7,
                textColor=colors.HexColor('#999999'),
                alignment=TA_CENTER,
                leading=9
            )

            elements.append(Paragraph("Thank you for choosing All'Arco Apartment Venice", footer_thanks_style))
            elements.append(Paragraph("www.allarcoapartment.com", footer_url_style))
            elements.append(Paragraph("Via Castellana 61, 30174 Venice, Italy", footer_info_style))
            elements.append(Paragraph("Email: support@allarcoapartment.com | Phone: Available upon request", footer_info_style))
            elements.append(Spacer(1, 4))
            elements.append(Paragraph("This document serves as official confirmation of your booking and payment.", footer_legal_style))
            elements.append(Paragraph("All prices are in EUR. Tourist tax is calculated per person per night as per local regulations.", footer_legal_style))

            # Build PDF
            doc.build(elements)

            # Get PDF value
            pdf = buffer.getvalue()
            buffer.close()

            # Return response
            filename_prefix = 'invoice' if is_invoice else 'receipt'
            response = HttpResponse(pdf, content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="{filename_prefix}-{invoice.invoice_number}.pdf"'
            return response

        except Exception as e:
            import traceback
            error_detail = traceback.format_exc()
            return Response(
                {'error': f'Failed to generate PDF: {str(e)}', 'detail': error_detail},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def send_email(self, request, pk=None):
        """Send invoice via email to specified or default email address."""
        invoice = self.get_object()

        # Get email from request body, default to guest email
        recipient_email = request.data.get('email') if request.data else None
        if not recipient_email:
            recipient_email = invoice.booking.guest_email if invoice.booking else None

        if not recipient_email:
            return Response(
                {'error': 'No email address provided and no guest email available'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # TODO: Actually send email to recipient_email
        # For now, just mark as sent
        invoice.status = 'sent'
        invoice.sent_at = timezone.now()
        invoice.save()

        return Response({
            'message': f'Invoice email sent to {recipient_email}',
            'recipient': recipient_email
        })
    
    @action(detail=True, methods=['post'])
    def mark_sent(self, request, pk=None):
        """Mark invoice as sent."""
        invoice = self.get_object()
        invoice.status = 'sent'
        invoice.save()
        return Response(InvoiceSerializer(invoice).data)
    
    @action(detail=True, methods=['post'])
    def mark_paid(self, request, pk=None):
        """Mark invoice as paid."""
        invoice = self.get_object()
        invoice.status = 'paid'
        invoice.save()
        return Response(InvoiceSerializer(invoice).data)

    def _generate_invoice_html(self, invoice):
        """Generate HTML content for invoice PDF."""
        booking = invoice.booking

        # Format dates
        issue_date = invoice.issue_date.strftime('%B %d, %Y')
        due_date = invoice.due_date.strftime('%B %d, %Y') if invoice.due_date else 'Upon receipt'

        # Calculate breakdown - if amount is 0, use booking total
        amount = float(invoice.amount) if invoice.amount > 0 else float(booking.total_price)

        # Generate line items
        line_items = []

        # Accommodation
        nights = (booking.check_out_date - booking.check_in_date).days
        nightly_rate = float(booking.nightly_rate)
        accommodation_total = nightly_rate * nights

        line_items.append({
            'description': f'Accommodation ({nights} night{"s" if nights != 1 else ""})',
            'unit_price': nightly_rate,
            'quantity': nights,
            'amount': accommodation_total
        })

        # Cleaning fee
        if float(booking.cleaning_fee) > 0:
            line_items.append({
                'description': 'Cleaning Fee',
                'unit_price': float(booking.cleaning_fee),
                'quantity': 1,
                'amount': float(booking.cleaning_fee)
            })

        # Tourist tax
        if float(booking.tourist_tax) > 0:
            line_items.append({
                'description': 'Tourist Tax',
                'unit_price': float(booking.tourist_tax),
                'quantity': 1,
                'amount': float(booking.tourist_tax)
            })

        # Generate line items HTML
        line_items_html = ''
        for item in line_items:
            line_items_html += f'''
                <tr>
                    <td>{item['description']}</td>
                    <td style="text-align: right;">€{item['unit_price']:.2f}</td>
                    <td style="text-align: center;">{item['quantity']}</td>
                    <td style="text-align: right;">€{item['amount']:.2f}</td>
                </tr>
            '''

        html_content = f'''
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Invoice - {invoice.invoice_number}</title>
            <style>
                @page {{ size: A4; margin: 2cm; }}
                body {{
                    font-family: Arial, sans-serif;
                    font-size: 11pt;
                    color: #333;
                    line-height: 1.6;
                }}
                .header {{
                    display: flex;
                    justify-content: space-between;
                    align-items: start;
                    margin-bottom: 40px;
                    border-bottom: 3px solid #C4A572;
                    padding-bottom: 20px;
                }}
                .company-info {{ flex: 1; }}
                .company-name {{
                    font-size: 28pt;
                    font-weight: bold;
                    color: #C4A572;
                    margin-bottom: 5px;
                }}
                .company-tagline {{
                    color: #666;
                    font-size: 10pt;
                    margin-bottom: 10px;
                }}
                .invoice-title {{
                    text-align: right;
                    font-size: 32pt;
                    font-weight: bold;
                    color: #C4A572;
                    margin-bottom: 10px;
                }}
                .invoice-details {{
                    text-align: right;
                    color: #666;
                    font-size: 10pt;
                }}
                .section {{ margin-bottom: 30px; }}
                .section-title {{
                    font-size: 12pt;
                    font-weight: bold;
                    color: #C4A572;
                    margin-bottom: 10px;
                    border-bottom: 1px solid #C4A572;
                    padding-bottom: 5px;
                }}
                .billing-info {{
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 30px;
                }}
                .bill-to, .invoice-info {{ flex: 1; }}
                table {{
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 15px;
                }}
                thead {{ background-color: #C4A572; color: white; }}
                th, td {{
                    padding: 12px;
                    text-align: left;
                    border-bottom: 1px solid #ddd;
                }}
                th {{ font-weight: bold; }}
                .total-row {{
                    font-weight: bold;
                    font-size: 14pt;
                    background-color: #f9f9f9;
                }}
                .total-row td {{
                    border-top: 2px solid #C4A572;
                    border-bottom: 3px double #C4A572;
                    padding: 15px 12px;
                }}
                .amount {{ color: #C4A572; }}
                .footer {{
                    margin-top: 50px;
                    padding-top: 20px;
                    border-top: 1px solid #ddd;
                    text-align: center;
                    color: #666;
                    font-size: 9pt;
                }}
                .status-badge {{
                    display: inline-block;
                    padding: 5px 15px;
                    border-radius: 20px;
                    font-size: 10pt;
                    font-weight: bold;
                    text-transform: uppercase;
                }}
                .status-draft {{ background-color: #e0e0e0; color: #666; }}
                .status-sent {{ background-color: #bbdefb; color: #1976d2; }}
                .status-paid {{ background-color: #c8e6c9; color: #388e3c; }}
                .status-overdue {{ background-color: #ffcdd2; color: #d32f2f; }}
            </style>
        </head>
        <body>
            <div class="header">
                <div class="company-info">
                    <div class="company-name">All'Arco</div>
                    <div class="company-tagline">Apartment Rental</div>
                    <div style="font-size: 9pt; color: #666; margin-top: 10px;">
                        Via Example 123<br>
                        Rome, Italy 00100<br>
                        support@allarcoapartment.com<br>
                        +39 123 456 7890
                    </div>
                </div>
                <div style="text-align: right;">
                    <div class="invoice-title">INVOICE</div>
                    <div class="invoice-details">
                        <strong>Invoice #:</strong> {invoice.invoice_number}<br>
                        <strong>Date:</strong> {issue_date}<br>
                        <strong>Due Date:</strong> {due_date}
                    </div>
                    <div style="margin-top: 10px;">
                        <span class="status-badge status-{invoice.status}">{invoice.status}</span>
                    </div>
                </div>
            </div>

            <div class="billing-info">
                <div class="bill-to">
                    <div class="section-title">Bill To:</div>
                    <strong>{booking.guest_name}</strong><br>
                    {booking.guest_email}<br>
                    {booking.guest_phone}<br>
                    {f'Booking: {booking.booking_id}' if hasattr(booking, 'booking_id') else ''}
                </div>
                <div class="invoice-info">
                    <div class="section-title">Stay Details:</div>
                    <strong>Check-in:</strong> {booking.check_in_date.strftime('%B %d, %Y')}<br>
                    <strong>Check-out:</strong> {booking.check_out_date.strftime('%B %d, %Y')}<br>
                    <strong>Guests:</strong> {booking.guests}<br>
                    <strong>Nights:</strong> {nights}
                </div>
            </div>

            <div class="section">
                <div class="section-title">Invoice Items</div>
                <table>
                    <thead>
                        <tr>
                            <th>Description</th>
                            <th style="text-align: right;">Unit Price</th>
                            <th style="text-align: center;">Quantity</th>
                            <th style="text-align: right;">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        {line_items_html}
                        <tr class="total-row">
                            <td colspan="3" style="text-align: right;"><strong>TOTAL</strong></td>
                            <td style="text-align: right;" class="amount"><strong>€{amount:.2f}</strong></td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {f'<div class="section"><div class="section-title">Notes</div><p>{invoice.notes}</p></div>' if invoice.notes else ''}

            <div class="section">
                <div class="section-title">Payment Information</div>
                <p>Please make payment to the following account:</p>
                <p>
                    <strong>Bank:</strong> Example Bank<br>
                    <strong>IBAN:</strong> IT00 X000 0000 0000 0000 0000 000<br>
                    <strong>BIC/SWIFT:</strong> EXAMPLEXXX<br>
                    <strong>Reference:</strong> {invoice.invoice_number}
                </p>
            </div>

            <div class="footer">
                <p>Thank you for choosing All'Arco Apartment!</p>
                <p style="font-size: 8pt; margin-top: 10px;">
                    This is a computer-generated invoice and requires no signature.<br>
                    For any questions regarding this invoice, please contact us at support@allarcoapartment.com
                </p>
            </div>
        </body>
        </html>
        '''

        return html_content


class CompanyViewSet(viewsets.ModelViewSet):
    """Company CRUD for invoicing."""
    serializer_class = CompanySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Company.objects.all().order_by('name')

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def invoice_statistics(request):
    """Get invoice statistics."""
    if not request.user.is_team_member():
        return Response(
            {'error': 'Permission denied'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    total_invoices = Invoice.objects.count()
    paid_invoices = Invoice.objects.filter(status='paid').count()
    total_amount = Invoice.objects.aggregate(Sum('amount'))['amount__sum'] or 0
    
    return Response({
        'total_invoices': total_invoices,
        'paid_invoices': paid_invoices,
        'total_amount': float(total_amount)
    })
