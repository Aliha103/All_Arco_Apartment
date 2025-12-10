from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum, Count, Q
from django.utils import timezone
from datetime import datetime, timedelta
from decimal import Decimal

from .models import Expense
from .serializers import (
    ExpenseListSerializer,
    ExpenseDetailSerializer,
    ExpenseCreateUpdateSerializer,
    ExpenseStatsSerializer
)
from .permissions import ExpensePermission


class ExpenseViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing expenses with CRUD operations and statistics.

    Provides:
    - List expenses with filtering and pagination
    - Create, retrieve, update, and delete expenses
    - Approve/reject expenses
    - Get expense statistics

    Permissions:
    - expenses.view: View expenses
    - expenses.create: Create new expenses
    - expenses.edit: Edit expenses
    - expenses.delete: Delete expenses
    - expenses.approve: Approve/reject expenses
    """
    permission_classes = [IsAuthenticated, ExpensePermission]
    queryset = Expense.objects.select_related('created_by', 'approved_by').all()

    def get_serializer_class(self):
        if self.action == 'list':
            return ExpenseListSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return ExpenseCreateUpdateSerializer
        return ExpenseDetailSerializer

    def get_queryset(self):
        """
        Filter expenses based on query parameters.
        Supports filtering by category, status, date range, and search.
        """
        queryset = super().get_queryset()

        # Filter by category
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category=category)

        # Filter by status
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        # Filter by date range
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')
        if date_from:
            queryset = queryset.filter(expense_date__gte=date_from)
        if date_to:
            queryset = queryset.filter(expense_date__lte=date_to)

        # Search in title, description, vendor
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) |
                Q(description__icontains=search) |
                Q(vendor__icontains=search)
            )

        return queryset.order_by('-expense_date', '-created_at')

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approve an expense"""
        expense = self.get_object()

        if expense.status == 'approved':
            return Response(
                {'detail': 'Expense is already approved'},
                status=status.HTTP_400_BAD_REQUEST
            )

        expense.approve(request.user)

        serializer = self.get_serializer(expense)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Reject an expense"""
        expense = self.get_object()

        if expense.status == 'rejected':
            return Response(
                {'detail': 'Expense is already rejected'},
                status=status.HTTP_400_BAD_REQUEST
            )

        reason = request.data.get('reason', '')
        expense.reject(request.user, reason)

        serializer = self.get_serializer(expense)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """
        Get expense statistics including totals by status, category breakdown,
        and monthly totals.
        """
        queryset = self.get_queryset()

        # Get date range from query params or default to current month
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')

        if not date_from or not date_to:
            # Default to current month
            today = timezone.now().date()
            date_from = today.replace(day=1)
            date_to = (date_from + timedelta(days=32)).replace(day=1) - timedelta(days=1)

        # Filter by date range
        period_queryset = queryset.filter(
            expense_date__gte=date_from,
            expense_date__lte=date_to
        )

        # Calculate totals
        total_expenses = period_queryset.aggregate(
            total=Sum('amount')
        )['total'] or Decimal('0.00')

        approved_expenses = period_queryset.filter(status='approved').aggregate(
            total=Sum('amount')
        )['total'] or Decimal('0.00')

        pending_expenses = period_queryset.filter(status='pending').aggregate(
            total=Sum('amount')
        )['total'] or Decimal('0.00')

        # Category breakdown
        category_data = period_queryset.values('category').annotate(
            total=Sum('amount'),
            count=Count('id')
        ).order_by('-total')

        category_breakdown = {
            item['category']: {
                'total': float(item['total']),
                'count': item['count']
            }
            for item in category_data
        }

        stats = {
            'total_expenses': float(total_expenses),
            'approved_expenses': float(approved_expenses),
            'pending_expenses': float(pending_expenses),
            'rejected_expenses': float(total_expenses - approved_expenses - pending_expenses),
            'category_breakdown': category_breakdown,
            'monthly_total': float(total_expenses),
            'date_from': date_from,
            'date_to': date_to,
        }

        return Response(stats)

    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Get quick summary of expenses"""
        total = self.get_queryset().aggregate(Sum('amount'))['amount__sum'] or 0
        pending_count = self.get_queryset().filter(status='pending').count()

        return Response({
            'total_amount': float(total),
            'pending_count': pending_count,
            'total_count': self.get_queryset().count()
        })
