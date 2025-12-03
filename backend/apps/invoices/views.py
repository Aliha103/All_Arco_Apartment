from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.http import HttpResponse
from django.db.models import Sum
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
        """Download invoice PDF."""
        invoice = self.get_object()

        try:
            from io import BytesIO
            from reportlab.lib.pagesizes import A4
            from reportlab.lib import colors
            from reportlab.lib.units import cm
            from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
            from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
            from reportlab.lib.enums import TA_CENTER

            booking = invoice.booking

            # Create PDF buffer
            buffer = BytesIO()
            doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=2*cm, leftMargin=2*cm, topMargin=2*cm, bottomMargin=2*cm)

            # Container for PDF elements
            elements = []
            styles = getSampleStyleSheet()

            # Custom styles
            title_style = ParagraphStyle(
                'CustomTitle',
                parent=styles['Heading1'],
                fontSize=24,
                textColor=colors.HexColor('#C4A572'),
                spaceAfter=12,
                alignment=TA_CENTER
            )

            heading_style = ParagraphStyle(
                'CustomHeading',
                parent=styles['Heading2'],
                fontSize=14,
                textColor=colors.HexColor('#C4A572'),
                spaceAfter=6
            )

            # Title
            elements.append(Paragraph("All'Arco Apartment", title_style))
            elements.append(Paragraph("INVOICE", title_style))
            elements.append(Spacer(1, 12))

            # Invoice details
            invoice_data = [
                ['Invoice #:', invoice.invoice_number],
                ['Date:', invoice.issue_date.strftime('%B %d, %Y')],
                ['Due Date:', invoice.due_date.strftime('%B %d, %Y') if invoice.due_date else 'Upon receipt'],
                ['Status:', invoice.status.upper()],
            ]

            invoice_table = Table(invoice_data, colWidths=[4*cm, 10*cm])
            invoice_table.setStyle(TableStyle([
                ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('TEXTCOLOR', (0, 0), (0, -1), colors.grey),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ]))
            elements.append(invoice_table)
            elements.append(Spacer(1, 20))

            # Bill To section
            elements.append(Paragraph("Bill To:", heading_style))
            elements.append(Paragraph(f"<b>{booking.guest_name}</b>", styles['Normal']))
            elements.append(Paragraph(f"{booking.guest_email}", styles['Normal']))
            elements.append(Paragraph(f"{booking.guest_phone}", styles['Normal']))
            if hasattr(booking, 'booking_id'):
                elements.append(Paragraph(f"Booking: {booking.booking_id}", styles['Normal']))
            elements.append(Spacer(1, 20))

            # Stay Details
            nights = (booking.check_out_date - booking.check_in_date).days
            elements.append(Paragraph("Stay Details:", heading_style))
            stay_data = [
                ['Check-in:', booking.check_in_date.strftime('%B %d, %Y')],
                ['Check-out:', booking.check_out_date.strftime('%B %d, %Y')],
                ['Guests:', str(getattr(booking, 'number_of_guests', ''))],
                ['Nights:', str(nights)],
            ]
            stay_table = Table(stay_data, colWidths=[4*cm, 10*cm])
            stay_table.setStyle(TableStyle([
                ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('TEXTCOLOR', (0, 0), (0, -1), colors.grey),
            ]))
            elements.append(stay_table)
            elements.append(Spacer(1, 20))

            # Line items
            elements.append(Paragraph("Invoice Items:", heading_style))

            # Calculate amount
            amount = float(invoice.amount) if invoice.amount > 0 else float(booking.total_price)
            nightly_rate = float(booking.nightly_rate)
            accommodation_total = nightly_rate * nights

            # Build line items data
            line_items_data = [
                ['Description', 'Unit Price', 'Qty', 'Amount']
            ]

            line_items_data.append([
                f'Accommodation ({nights} night{"s" if nights != 1 else ""})',
                f'€{nightly_rate:.2f}',
                str(nights),
                f'€{accommodation_total:.2f}'
            ])

            if float(booking.cleaning_fee) > 0:
                line_items_data.append([
                    'Cleaning Fee',
                    f'€{float(booking.cleaning_fee):.2f}',
                    '1',
                    f'€{float(booking.cleaning_fee):.2f}'
                ])

            if float(booking.tourist_tax) > 0:
                line_items_data.append([
                    'Tourist Tax',
                    f'€{float(booking.tourist_tax):.2f}',
                    '1',
                    f'€{float(booking.tourist_tax):.2f}'
                ])

            line_items_data.append(['', '', 'TOTAL', f'€{amount:.2f}'])

            # Create table
            line_items_table = Table(line_items_data, colWidths=[7*cm, 3*cm, 2*cm, 3*cm])
            line_items_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#C4A572')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 11),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, -1), (-1, -1), colors.beige),
                ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
                ('FONTSIZE', (0, -1), (-1, -1), 12),
                ('TEXTCOLOR', (0, -1), (-1, -1), colors.HexColor('#C4A572')),
                ('GRID', (0, 0), (-1, -2), 1, colors.grey),
                ('LINEABOVE', (0, -1), (-1, -1), 2, colors.HexColor('#C4A572')),
                ('LINEBELOW', (0, -1), (-1, -1), 2, colors.HexColor('#C4A572')),
            ]))
            elements.append(line_items_table)
            elements.append(Spacer(1, 20))

            # Payment info
            elements.append(Paragraph("Payment Information:", heading_style))
            elements.append(Paragraph("Please make payment to the following account:", styles['Normal']))
            elements.append(Paragraph("<b>Bank:</b> Example Bank", styles['Normal']))
            elements.append(Paragraph("<b>IBAN:</b> IT00 X000 0000 0000 0000 0000 000", styles['Normal']))
            elements.append(Paragraph("<b>Reference:</b> " + invoice.invoice_number, styles['Normal']))
            elements.append(Spacer(1, 30))

            # Footer
            footer_style = ParagraphStyle(
                'Footer',
                parent=styles['Normal'],
                fontSize=9,
                textColor=colors.grey,
                alignment=TA_CENTER
            )
            elements.append(Paragraph("Thank you for choosing All'Arco Apartment!", footer_style))
            elements.append(Paragraph("For questions, contact us at info@allarcoapartment.com", footer_style))

            # Build PDF
            doc.build(elements)

            # Get PDF value
            pdf = buffer.getvalue()
            buffer.close()

            # Return response
            response = HttpResponse(pdf, content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="invoice-{invoice.invoice_number}.pdf"'
            return response

        except Exception as e:
            return Response(
                {'error': f'Failed to generate PDF: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def send_email(self, request, pk=None):
        """Send invoice via email."""
        invoice = self.get_object()
        # TODO: Send invoice email
        invoice.status = 'sent'
        invoice.save()
        return Response({'message': 'Invoice email sent'})
    
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
