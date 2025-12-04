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

            # Custom styles
            title_style = ParagraphStyle(
                'DocTitle',
                parent=styles['Heading1'],
                fontSize=32,
                textColor=colors.HexColor('#C4A572'),
                spaceAfter=4,
                fontName='Helvetica-Bold'
            )

            heading_style = ParagraphStyle(
                'SectionHeading',
                fontSize=11,
                textColor=colors.HexColor('#C4A572'),
                spaceAfter=6,
                fontName='Helvetica-Bold',
                spaceBefore=8
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
            elements.append(Spacer(1, 6))

            # Document details - more prominent
            doc_number_style = ParagraphStyle(
                'DocNumber',
                fontSize=11,
                textColor=colors.HexColor('#333333'),
                fontName='Helvetica-Bold',
                spaceAfter=4
            )

            doc_detail_style = ParagraphStyle(
                'DocDetail',
                fontSize=9,
                textColor=colors.grey,
                fontName='Helvetica',
                spaceAfter=3
            )

            elements.append(Paragraph(f'{invoice.invoice_number}', doc_number_style))
            elements.append(Paragraph(f'Date: {invoice.issue_date.strftime("%B %d, %Y")}', doc_detail_style))
            if hasattr(booking, 'booking_id') and booking.booking_id:
                elements.append(Paragraph(f'Booking: {booking.booking_id}', doc_detail_style))
            elements.append(Paragraph(
                f'Check-in: {booking.check_in_date.strftime("%b %d, %Y")} | Check-out: {booking.check_out_date.strftime("%b %d, %Y")}',
                doc_detail_style
            ))
            elements.append(Spacer(1, 12))

            # Guest Details section (always show)
            elements.append(Paragraph("GUEST DETAILS", heading_style))
            guest_info = [
                [f"Full Name: {booking.guest_name}"],
                [f"Email: {booking.guest_email}"]
            ]

            # Add tax code if available
            if hasattr(booking, 'guest_tax_code') and booking.guest_tax_code:
                guest_info.append([f"Tax ID: {booking.guest_tax_code}"])

            # Add phone if available
            if hasattr(booking, 'guest_phone') and booking.guest_phone:
                guest_info.append([f"Phone: {booking.guest_phone}"])

            # Add country (always show)
            if hasattr(booking, 'guest_country') and booking.guest_country:
                guest_info.append([f"Country: {booking.guest_country}"])

            # Add address if available
            if hasattr(booking, 'guest_address') and booking.guest_address:
                guest_info.append([f"Address: {booking.guest_address}"])

            guest_table = Table(guest_info, colWidths=[16*cm])
            guest_table.setStyle(TableStyle([
                ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
                ('TOPPADDING', (0, 0), (-1, -1), 1),
            ]))
            elements.append(guest_table)
            elements.append(Spacer(1, 10))

            # Bill To section (only for invoices)
            if is_invoice and invoice.company:
                elements.append(Paragraph("BILL TO", heading_style))
                company = invoice.company
                bill_to_info = [
                    [company.name],
                    [f"VAT: {company.vat_number}"],
                    [f"Country: {company.country}"],
                    [f"Email: {company.email}"],
                    [company.address]
                ]

                bill_to_table = Table(bill_to_info, colWidths=[16*cm])
                bill_to_table.setStyle(TableStyle([
                    ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
                    ('FONTSIZE', (0, 0), (-1, -1), 9),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
                ]))
                elements.append(bill_to_table)
                elements.append(Spacer(1, 12))

            # Contact info box (right side) - More prominent
            contact_box_data = [[
                '',
                Paragraph("""<para align=center>
                    <font size=11 color=#C4A572><b>ALL'ARCO APARTMENT</b></font><br/>
                    <font size=9>
                    Via Castellana 61<br/>
                    30125 Venice, Italy<br/><br/>
                    </font>
                    <font size=8 color=#666666>
                    support@allarcoapartment.com<br/>
                    www.allarcoapartment.com
                    </font>
                </para>""", styles['Normal'])
            ]]

            contact_table = Table(contact_box_data, colWidths=[8*cm, 8*cm])
            contact_table.setStyle(TableStyle([
                ('BOX', (1, 0), (1, 0), 1.5, colors.HexColor('#C4A572')),
                ('BACKGROUND', (1, 0), (1, 0), colors.HexColor('#FDFAF5')),
                ('TOPPADDING', (1, 0), (1, 0), 12),
                ('BOTTOMPADDING', (1, 0), (1, 0), 12),
                ('LEFTPADDING', (1, 0), (1, 0), 12),
                ('RIGHTPADDING', (1, 0), (1, 0), 12),
                ('VALIGN', (1, 0), (1, 0), 'MIDDLE'),
            ]))
            elements.append(contact_table)
            elements.append(Spacer(1, 10))

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

            # Create and style table
            col_widths = [6*cm, 2*cm, 3*cm, 2.5*cm, 2.5*cm]
            items_table = Table(table_data, colWidths=col_widths)

            items_table.setStyle(TableStyle([
                # Header row
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#C4A572')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 9),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 6),
                ('TOPPADDING', (0, 0), (-1, 0), 6),

                # Data rows
                ('FONTNAME', (0, 1), (-1, -2), 'Helvetica'),
                ('FONTSIZE', (0, 1), (-1, -2), 9),
                ('TOPPADDING', (0, 1), (-1, -2), 5),
                ('BOTTOMPADDING', (0, 1), (-1, -2), 5),
                ('GRID', (0, 0), (-1, -2), 0.5, colors.grey),

                # Total row
                ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#F5F5F5')),
                ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
                ('FONTSIZE', (0, -1), (-1, -1), 11),
                ('TOPPADDING', (0, -1), (-1, -1), 8),
                ('BOTTOMPADDING', (0, -1), (-1, -1), 8),
                ('LINEABOVE', (0, -1), (-1, -1), 1.5, colors.HexColor('#C4A572')),

                # Alignment
                ('ALIGN', (1, 0), (1, -1), 'CENTER'),
                ('ALIGN', (2, 0), (-1, -1), 'RIGHT'),
            ]))

            elements.append(items_table)
            elements.append(Spacer(1, 10))

            # Payment message
            payment_messages = {
                'cash': 'This booking has been PAID BY CASH.',
                'card': 'This booking has been PAID BY CARD.',
                'bank_transfer': 'This booking has been PAID BY BANK TRANSFER.',
                'property': 'This booking is to be PAID AT PROPERTY.',
                'stripe': 'This booking has been PAID ONLINE.'
            }

            payment_msg = payment_messages.get(invoice.payment_method, 'Payment pending.')

            payment_style = ParagraphStyle(
                'Payment',
                parent=styles['Normal'],
                fontSize=10,
                fontName='Helvetica-Bold',
                spaceBefore=0
            )

            elements.append(Paragraph("PAYMENT:", heading_style))
            elements.append(Paragraph(payment_msg, payment_style))
            elements.append(Spacer(1, 15))

            # Footer
            footer_style = ParagraphStyle(
                'Footer',
                parent=styles['Normal'],
                fontSize=8,
                textColor=colors.grey,
                alignment=TA_CENTER
            )
            elements.append(Paragraph("Thank you for choosing All'Arco Apartment Venice", footer_style))
            elements.append(Paragraph("www.allarcoapartment.com", footer_style))

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
                        info@allarcoapartment.com<br>
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
                    For any questions regarding this invoice, please contact us at info@allarcoapartment.com
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
