"""
PDF invoice generation using WeasyPrint.
"""

from io import BytesIO
from weasyprint import HTML, CSS
from django.template.loader import render_to_string
from django.conf import settings
from datetime import datetime


class InvoicePDFGenerator:
    """
    Generate PDF invoices with All'Arco branding.
    """

    @staticmethod
    def generate_invoice_pdf(invoice):
        """
        Generate PDF for an invoice.
        Returns BytesIO object with PDF content.
        """
        # Prepare context for template
        context = {
            'invoice': invoice,
            'booking': invoice.booking,
            'company': {
                'name': "All'Arco Apartment",
                'address': "Venice, Italy",
                'email': 'support@allarcoapartment.com',
                'phone': '+39 XXX XXX XXXX',
            },
            'generated_at': datetime.now(),
        }

        # Render HTML template
        html_string = InvoicePDFGenerator._get_invoice_html(context)

        # Generate PDF
        pdf_file = BytesIO()
        HTML(string=html_string).write_pdf(pdf_file)
        pdf_file.seek(0)

        return pdf_file

    @staticmethod
    def _get_invoice_html(context):
        """
        Generate HTML content for invoice.
        Using inline styles for PDF generation.
        """
        invoice = context['invoice']
        booking = context['booking']
        company = context['company']

        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Invoice {invoice.invoice_number}</title>
            <style>
                @page {{
                    size: A4;
                    margin: 2cm;
                }}
                body {{
                    font-family: 'Helvetica', 'Arial', sans-serif;
                    font-size: 11pt;
                    line-height: 1.6;
                    color: #333;
                }}
                .header {{
                    margin-bottom: 40px;
                    border-bottom: 3px solid #0066cc;
                    padding-bottom: 20px;
                }}
                .company-name {{
                    font-size: 24pt;
                    font-weight: bold;
                    color: #0066cc;
                    margin-bottom: 5px;
                }}
                .company-details {{
                    font-size: 10pt;
                    color: #666;
                }}
                .invoice-info {{
                    margin: 30px 0;
                    display: flex;
                    justify-content: space-between;
                }}
                .invoice-number {{
                    font-size: 14pt;
                    font-weight: bold;
                    color: #0066cc;
                }}
                .guest-info {{
                    background: #f8f9fa;
                    padding: 15px;
                    border-radius: 5px;
                    margin: 20px 0;
                }}
                .section-title {{
                    font-size: 12pt;
                    font-weight: bold;
                    margin: 20px 0 10px 0;
                    color: #0066cc;
                }}
                table {{
                    width: 100%;
                    border-collapse: collapse;
                    margin: 20px 0;
                }}
                th {{
                    background: #0066cc;
                    color: white;
                    padding: 12px;
                    text-align: left;
                    font-weight: bold;
                }}
                td {{
                    padding: 10px 12px;
                    border-bottom: 1px solid #ddd;
                }}
                .amount-cell {{
                    text-align: right;
                }}
                .total-row {{
                    background: #f8f9fa;
                    font-weight: bold;
                    font-size: 12pt;
                }}
                .total-row td {{
                    padding: 15px 12px;
                    border-bottom: none;
                }}
                .footer {{
                    margin-top: 60px;
                    text-align: center;
                    font-size: 9pt;
                    color: #666;
                    border-top: 1px solid #ddd;
                    padding-top: 20px;
                }}
                .status {{
                    display: inline-block;
                    padding: 5px 15px;
                    border-radius: 20px;
                    font-size: 10pt;
                    font-weight: bold;
                }}
                .status-paid {{
                    background: #28a745;
                    color: white;
                }}
                .status-sent {{
                    background: #ffc107;
                    color: #333;
                }}
                .status-draft {{
                    background: #6c757d;
                    color: white;
                }}
                .status-overdue {{
                    background: #dc3545;
                    color: white;
                }}
            </style>
        </head>
        <body>
            <div class="header">
                <div class="company-name">{company['name']}</div>
                <div class="company-details">
                    {company['address']}<br>
                    Email: {company['email']}<br>
                    Phone: {company['phone']}
                </div>
            </div>

            <div style="display: flex; justify-content: space-between; margin: 30px 0;">
                <div>
                    <div class="invoice-number">Invoice #{invoice.invoice_number}</div>
                    <div style="margin-top: 10px;">
                        <strong>Booking ID:</strong> {booking.booking_id}<br>
                        <strong>Issued:</strong> {invoice.issued_at.strftime('%B %d, %Y')}<br>
                        {'<strong>Due Date:</strong> ' + invoice.due_date.strftime('%B %d, %Y') + '<br>' if invoice.due_date else ''}
                    </div>
                </div>
                <div>
                    <span class="status status-{invoice.status}">{invoice.get_status_display().upper()}</span>
                </div>
            </div>

            <div class="guest-info">
                <div class="section-title">Guest Information</div>
                <strong>{booking.guest_name}</strong><br>
                Email: {booking.guest_email}<br>
                Phone: {booking.guest_phone}
            </div>

            <div class="section-title">Stay Details</div>
            <table>
                <tr>
                    <td><strong>Check-in:</strong></td>
                    <td>{booking.check_in_date.strftime('%B %d, %Y')}</td>
                    <td><strong>Check-out:</strong></td>
                    <td>{booking.check_out_date.strftime('%B %d, %Y')}</td>
                </tr>
                <tr>
                    <td><strong>Nights:</strong></td>
                    <td>{booking.nights}</td>
                    <td><strong>Guests:</strong></td>
                    <td>{booking.guests}</td>
                </tr>
            </table>

            <div class="section-title">Pricing Breakdown</div>
            <table>
                <thead>
                    <tr>
                        <th>Description</th>
                        <th class="amount-cell">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Accommodation ({booking.nights} nights)</td>
                        <td class="amount-cell">€{invoice.accommodation_total}</td>
                    </tr>
                    <tr>
                        <td>Cleaning Fee</td>
                        <td class="amount-cell">€{invoice.cleaning_fee}</td>
                    </tr>
                    {f'<tr><td>Extra Guest Fee</td><td class="amount-cell">€{invoice.extra_guest_fee}</td></tr>' if invoice.extra_guest_fee > 0 else ''}
                    <tr>
                        <td>Tourist Tax ({booking.guests} guests × {booking.nights} nights)</td>
                        <td class="amount-cell">€{invoice.tourist_tax}</td>
                    </tr>
                    <tr class="total-row">
                        <td>Total Amount</td>
                        <td class="amount-cell">€{invoice.total_amount}</td>
                    </tr>
                </tbody>
            </table>

            {f'<div style="margin-top: 20px;"><strong>Notes:</strong><br>{invoice.notes}</div>' if invoice.notes else ''}

            <div class="footer">
                <p>Thank you for choosing All'Arco Apartment!</p>
                <p>For questions about this invoice, please contact {company['email']}</p>
            </div>
        </body>
        </html>
        """

        return html

    @staticmethod
    def save_invoice_pdf(invoice, storage_service=None):
        """
        Generate and save invoice PDF.
        If storage_service is provided, upload to cloud storage.
        Otherwise, save locally or return BytesIO.

        Returns: PDF URL or BytesIO object
        """
        pdf_file = InvoicePDFGenerator.generate_invoice_pdf(invoice)

        # In production, upload to storage service (S3, Railway volumes, etc.)
        # For now, we'll just update the model with a placeholder
        # You can implement actual storage integration here

        if storage_service:
            # Example: pdf_url = storage_service.upload(pdf_file, f'invoices/{invoice.invoice_number}.pdf')
            pdf_url = f'/media/invoices/{invoice.invoice_number}.pdf'
        else:
            pdf_url = f'/media/invoices/{invoice.invoice_number}.pdf'

        invoice.pdf_url = pdf_url
        invoice.pdf_generated_at = datetime.now()
        invoice.save()

        return pdf_file
