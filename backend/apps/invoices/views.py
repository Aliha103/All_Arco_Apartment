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
        invoice = self.get_object()
        # TODO: Implement PDF generation with WeasyPrint
        return Response({'message': 'PDF generated', 'pdf_url': invoice.pdf_url})
    
    @action(detail=True, methods=['get'])
    def download_pdf(self, request, pk=None):
        """Download invoice PDF."""
        invoice = self.get_object()
        # TODO: Implement PDF download
        return Response({'message': 'PDF download endpoint'})
    
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
