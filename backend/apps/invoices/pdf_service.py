"""
PDF generation service for invoices and receipts.
Refactored from views.py for better maintainability and customization.
"""
import os
from io import BytesIO
from decimal import Decimal
from django.conf import settings
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_RIGHT, TA_CENTER


class InvoicePDFGenerator:
    """
    Professional PDF generator for invoices and receipts using ReportLab.
    Generates branded PDF documents with All'Arco Apartment styling.
    """

    # Professional color palette
    GOLD = colors.HexColor('#C4A572')
    DARK_GOLD = colors.HexColor('#A68B5B')
    LIGHT_CREAM = colors.HexColor('#FDFAF5')
    DARK_GRAY = colors.HexColor('#333333')
    MEDIUM_GRAY = colors.HexColor('#666666')
    LIGHT_GRAY = colors.HexColor('#F8F8F8')
    SUCCESS_GREEN = colors.HexColor('#4CAF50')
    SOFT_CREAM = colors.HexColor('#FAF8F3')

    def __init__(self, invoice):
        """
        Initialize generator with invoice instance.

        Args:
            invoice: Invoice model instance
        """
        self.invoice = invoice
        self.booking = invoice.booking
        self.is_invoice = invoice.type == 'invoice'
        self.styles = getSampleStyleSheet()
        self._init_custom_styles()

    def _init_custom_styles(self):
        """Initialize custom paragraph styles for the PDF."""
        self.title_style = ParagraphStyle(
            'DocTitle',
            parent=self.styles['Heading1'],
            fontSize=28,
            textColor=self.GOLD,
            spaceAfter=2,
            fontName='Helvetica-Bold',
            letterSpacing=1
        )

        self.heading_style = ParagraphStyle(
            'SectionHeading',
            fontSize=10,
            textColor=self.DARK_GOLD,
            spaceAfter=6,
            fontName='Helvetica-Bold',
            spaceBefore=8,
            letterSpacing=0.5
        )

        self.doc_number_style = ParagraphStyle(
            'DocNumber',
            fontSize=12,
            textColor=self.DARK_GRAY,
            fontName='Helvetica-Bold',
            spaceAfter=4
        )

        self.doc_detail_style = ParagraphStyle(
            'DocDetail',
            fontSize=9,
            textColor=self.MEDIUM_GRAY,
            fontName='Helvetica',
            spaceAfter=2
        )

        self.status_badge_style = ParagraphStyle(
            'StatusBadge',
            parent=self.styles['Normal'],
            fontSize=9,
            fontName='Helvetica-Bold',
            textColor=colors.white,
            alignment=TA_RIGHT,
            letterSpacing=1
        )

        self.payment_box_style = ParagraphStyle(
            'PaymentBox',
            parent=self.styles['Normal'],
            fontSize=10,
            fontName='Helvetica-Bold',
            textColor=self.DARK_GRAY,
            leading=14
        )

        self.footer_thanks_style = ParagraphStyle(
            'FooterThanks',
            parent=self.styles['Normal'],
            fontSize=10,
            textColor=self.DARK_GRAY,
            alignment=TA_CENTER,
            spaceAfter=8,
            fontName='Helvetica-Bold'
        )

        self.footer_info_style = ParagraphStyle(
            'FooterInfo',
            parent=self.styles['Normal'],
            fontSize=8,
            textColor=self.MEDIUM_GRAY,
            alignment=TA_CENTER,
            spaceAfter=2,
            leading=11
        )

        self.footer_url_style = ParagraphStyle(
            'FooterURL',
            parent=self.styles['Normal'],
            fontSize=8,
            textColor=self.DARK_GOLD,
            alignment=TA_CENTER,
            fontName='Helvetica-Bold',
            spaceAfter=6
        )

        self.footer_legal_style = ParagraphStyle(
            'FooterLegal',
            parent=self.styles['Normal'],
            fontSize=7,
            textColor=colors.HexColor('#999999'),
            alignment=TA_CENTER,
            leading=9
        )

    def generate(self):
        """
        Main generation method.
        Returns BytesIO buffer containing the generated PDF.
        """
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

        # Build document sections
        elements.append(self.build_header())
        elements.append(self.build_decorative_line())
        elements.append(Spacer(1, 6))
        elements.append(self.build_status_badge())
        elements.append(Spacer(1, 10))
        elements.append(self.build_two_column_layout())
        elements.append(Spacer(1, 12))
        elements.append(self.build_line_items_table())
        elements.append(Spacer(1, 18))
        elements.append(self.build_payment_section())
        elements.append(Spacer(1, 20))

        # Add footer elements
        elements.extend(self.build_footer())

        # Build PDF
        doc.build(elements)

        # Return buffer
        buffer.seek(0)
        return buffer

    def build_header(self):
        """Build PDF header with logo and document type."""
        doc_type_label = 'INVOICE' if self.is_invoice else 'RECEIPT'

        # Try to load company logo
        logo_path = os.path.join(settings.BASE_DIR, 'staticfiles', 'logos', 'allarco_logo.png')
        logo_element = None

        if os.path.exists(logo_path):
            try:
                logo_element = Image(logo_path, width=4*cm, height=4*cm)
            except Exception as e:
                print(f"Failed to load logo image: {str(e)}")

        # Fallback to text logo
        if logo_element is None:
            logo_element = Paragraph("""<para align=center>
                <font size=14 color=#C4A572><b>ALL'ARCO</b></font><br/>
                <font size=12 color=#C4A572><b>APARTMENT</b></font><br/>
                <font size=7 color=grey>Venice, Italy</font>
            </para>""", self.styles['Normal'])

        header_data = [[
            Paragraph(doc_type_label, self.title_style),
            logo_element
        ]]

        header_table = Table(header_data, colWidths=[11*cm, 5*cm])
        header_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (0, 0), 'LEFT'),
            ('ALIGN', (1, 0), (1, 0), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('RIGHTPADDING', (1, 0), (1, 0), 20),
        ]))

        return header_table

    def build_decorative_line(self):
        """Build decorative line below header."""
        line_data = [['']]
        line_table = Table(line_data, colWidths=[16*cm])
        line_table.setStyle(TableStyle([
            ('LINEBELOW', (0, 0), (-1, 0), 2, self.GOLD),
            ('TOPPADDING', (0, 0), (-1, 0), 4),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
        ]))
        return line_table

    def build_status_badge(self):
        """Build payment status badge."""
        status_text = 'PAID' if self.invoice.status == 'paid' else (
            'PENDING' if self.invoice.status == 'draft' else 'SENT'
        )
        status_color = self.SUCCESS_GREEN if self.invoice.status == 'paid' else (
            self.GOLD if self.invoice.status == 'draft' else self.MEDIUM_GRAY
        )

        status_para = Paragraph(status_text, self.status_badge_style)
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

        # Align badge to the right
        badge_wrapper = Table([[None, status_table]], colWidths=[13*cm, 3*cm])
        badge_wrapper.setStyle(TableStyle([
            ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ]))

        return badge_wrapper

    def build_two_column_layout(self):
        """Build two-column layout with guest/company details and document info."""
        # Left column: Guest and company details
        left_html = f'<b><font size=10 color=#A68B5B>GUEST DETAILS</font></b><br/>'
        left_html += f'<font size=9>Full Name: {self.booking.guest_name}</font><br/>'
        left_html += f'<font size=9>Email: {self.booking.guest_email}</font><br/>'

        if hasattr(self.booking, 'guest_phone') and self.booking.guest_phone:
            left_html += f'<font size=9>Phone: {self.booking.guest_phone}</font><br/>'
        if hasattr(self.booking, 'guest_country') and self.booking.guest_country:
            left_html += f'<font size=9>Country: {self.booking.guest_country}</font><br/>'

        # Add Bill To if invoice with company
        if self.is_invoice and self.invoice.company:
            company = self.invoice.company
            left_html += f'<br/><b><font size=10 color=#A68B5B>BILL TO</font></b><br/>'
            left_html += f'<font size=9>{company.name}</font><br/>'
            left_html += f'<font size=9>VAT: {company.vat_number}</font><br/>'
            left_html += f'<font size=9>Country: {company.country}</font><br/>'
            left_html += f'<font size=9>Email: {company.email}</font><br/>'
            left_html += f'<font size=9>{company.address}</font>'

        # Right column: Invoice details
        right_html = f'<b><font size=13 color=#C4A572>{self.invoice.invoice_number}</font></b><br/>'
        right_html += f'<br/>'
        right_html += f'<font size=9 color=#666666><b>Date:</b> {self.invoice.issue_date.strftime("%B %d, %Y")}</font><br/>'

        if hasattr(self.booking, 'booking_id') and self.booking.booking_id:
            right_html += f'<font size=9 color=#666666><b>Booking:</b> {self.booking.booking_id}</font><br/>'

        right_html += f'<font size=9 color=#666666><b>Check-in:</b> {self.booking.check_in_date.strftime("%b %d, %Y")} | <b>Check-out:</b> {self.booking.check_out_date.strftime("%b %d, %Y")}</font><br/>'
        right_html += f'<br/><br/>'
        right_html += f'<b><font size=11 color=#A68B5B>ALL\'ARCO APARTMENT</font></b><br/>'
        right_html += f'<font size=9 color=#333333>Via Castellana 61<br/>30174 Venice, Italy</font><br/>'
        right_html += f'<br/>'
        right_html += f'<font size=8 color=#666666>support@allarcoapartment.com<br/>www.allarcoapartment.com</font>'

        left_para = Paragraph(left_html, self.styles['Normal'])
        right_para = Paragraph(right_html, self.styles['Normal'])

        two_column_data = [[left_para, right_para]]
        two_column_table = Table(two_column_data, colWidths=[8*cm, 8*cm])
        two_column_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, 0), self.SOFT_CREAM),
            ('BACKGROUND', (1, 0), (1, 0), self.SOFT_CREAM),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LEFTPADDING', (0, 0), (-1, -1), 12),
            ('RIGHTPADDING', (0, 0), (-1, -1), 12),
            ('TOPPADDING', (0, 0), (-1, -1), 12),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
            ('BOX', (0, 0), (0, 0), 0.5, colors.HexColor('#E8E3D5')),
            ('BOX', (1, 0), (1, 0), 0.5, colors.HexColor('#E8E3D5')),
        ]))

        return two_column_table

    def get_line_items(self):
        """
        Get line items from invoice.line_items JSON or generate from booking.
        Returns list of line item dictionaries.
        """
        if self.invoice.line_items and len(self.invoice.line_items) > 0:
            # Use custom line items from JSON
            return self.invoice.line_items
        else:
            # Fallback: generate from booking (backward compatibility)
            return self.invoice.generate_line_items_from_booking()

    def build_line_items_table(self):
        """Build line items table from invoice line_items JSON."""
        line_items = self.get_line_items()

        # Table header
        table_data = [['Description', 'Qty', 'Unit Price', 'Amount']]

        # Add line items
        for item in line_items:
            description = item.get('description', '')
            quantity = item.get('quantity', 1)
            unit_price = item.get('unit_price', 0)
            # Support both 'total' (new) and 'amount' (legacy) field names
            amount = item.get('total', item.get('amount', 0))

            table_data.append([
                description,
                str(quantity),
                f'EUR {float(unit_price):.2f}',
                f'EUR {float(amount):.2f}'
            ])

        # Total row
        total = sum(Decimal(str(item.get('total', item.get('amount', 0)))) for item in line_items)
        table_data.append(['', '', 'TOTAL:', f'EUR {float(total):.2f}'])

        # Create table with professional styling
        col_widths = [7*cm, 2*cm, 3.5*cm, 3.5*cm]
        items_table = Table(table_data, colWidths=col_widths)

        # Build table style
        table_style = [
            # Header row
            ('BACKGROUND', (0, 0), (-1, 0), self.GOLD),
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
            ('TEXTCOLOR', (0, 1), (-1, -2), self.DARK_GRAY),
            ('TOPPADDING', (0, 1), (-1, -2), 10),
            ('BOTTOMPADDING', (0, 1), (-1, -2), 10),
            ('LEFTPADDING', (0, 1), (-1, -2), 12),
            ('RIGHTPADDING', (0, 1), (-1, -2), 12),

            # Horizontal lines
            ('LINEBELOW', (0, 0), (-1, -2), 0.5, colors.HexColor('#E5E5E5')),

            # Total row
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, -1), (-1, -1), 13),
            ('TEXTCOLOR', (0, -1), (-1, -1), self.DARK_GRAY),
            ('TOPPADDING', (0, -1), (-1, -1), 14),
            ('BOTTOMPADDING', (0, -1), (-1, -1), 10),
            ('LEFTPADDING', (0, -1), (-1, -1), 12),
            ('RIGHTPADDING', (0, -1), (-1, -1), 12),
            ('LINEABOVE', (0, -1), (-1, -1), 2, self.GOLD),

            # Alignment
            ('ALIGN', (1, 0), (1, -1), 'CENTER'),
            ('ALIGN', (2, 0), (-1, -1), 'RIGHT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]

        # Add alternating row backgrounds
        for i in range(1, len(table_data) - 1):
            if i % 2 == 0:
                table_style.append(('BACKGROUND', (0, i), (-1, i), colors.HexColor('#FAFAFA')))

        items_table.setStyle(TableStyle(table_style))
        return items_table

    def build_payment_section(self):
        """Build payment status section."""
        payment_messages = {
            'cash': 'This booking has been PAID BY CASH.',
            'card': 'This booking has been PAID BY CARD.',
            'bank_transfer': 'This booking has been PAID BY BANK TRANSFER.',
            'property': 'This booking is to be PAID AT PROPERTY.',
            'stripe': 'This booking has been PAID ONLINE.'
        }

        payment_msg = payment_messages.get(self.invoice.payment_method, 'Payment pending.')

        payment_text = f'<b><font size=9 color=#A68B5B>PAYMENT STATUS</font></b><br/><font size=10>{payment_msg}</font>'
        payment_para = Paragraph(payment_text, self.payment_box_style)

        payment_table = Table([[payment_para]], colWidths=[16*cm])
        payment_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), self.SOFT_CREAM),
            ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#E8E3D5')),
            ('LEFTPADDING', (0, 0), (-1, -1), 15),
            ('RIGHTPADDING', (0, 0), (-1, -1), 15),
            ('TOPPADDING', (0, 0), (-1, -1), 12),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
        ]))

        return payment_table

    def build_footer(self):
        """Build PDF footer with company information."""
        elements = []

        # Decorative line before footer
        footer_line_data = [['']]
        footer_line_table = Table(footer_line_data, colWidths=[16*cm])
        footer_line_table.setStyle(TableStyle([
            ('LINEABOVE', (0, 0), (-1, 0), 1.5, self.GOLD),
            ('TOPPADDING', (0, 0), (-1, 0), 8),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 6),
        ]))
        elements.append(footer_line_table)

        elements.append(Paragraph("Thank you for choosing All'Arco Apartment Venice", self.footer_thanks_style))
        elements.append(Paragraph("www.allarcoapartment.com", self.footer_url_style))
        elements.append(Paragraph("Via Castellana 61, 30174 Venice, Italy", self.footer_info_style))
        elements.append(Paragraph("Email: support@allarcoapartment.com | Phone: Available upon request", self.footer_info_style))
        elements.append(Spacer(1, 4))
        elements.append(Paragraph("This document serves as official confirmation of your booking and payment.", self.footer_legal_style))
        elements.append(Paragraph("All prices are in EUR. Tourist tax is calculated per person per night as per local regulations.", self.footer_legal_style))

        return elements
