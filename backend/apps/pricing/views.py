from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from datetime import datetime
from .models import Settings, PricingRule, Promotion, Voucher, PromoUsage
from .serializers import (
    SettingsSerializer, PricingRuleSerializer,
    PromotionSerializer, VoucherSerializer, PromoUsageSerializer,
    ValidatePromoSerializer
)


@api_view(['GET'])
@permission_classes([AllowAny])
def get_settings(request):
    """Get pricing settings."""
    settings = Settings.get_settings()
    return Response(SettingsSerializer(settings).data)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_settings(request):
    """Update pricing settings (team/admin only)."""
    if not request.user.is_team_member():
        return Response(
            {'error': 'Permission denied'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    settings_obj = Settings.get_settings()
    serializer = SettingsSerializer(settings_obj, data=request.data, partial=True)
    
    if serializer.is_valid():
        serializer.save(updated_by=request.user)
        return Response(serializer.data)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([AllowAny])
def calculate_price(request):
    """Calculate booking price."""
    check_in = request.query_params.get('check_in')
    check_out = request.query_params.get('check_out')
    guests = int(request.query_params.get('guests', 1))
    
    if not check_in or not check_out:
        return Response(
            {'error': 'check_in, check_out, and guests parameters required'},
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
    
    settings = Settings.get_settings()
    pricing = settings.calculate_booking_price(check_in_date, check_out_date, guests)
    
    return Response(pricing)


class PricingRuleViewSet(viewsets.ModelViewSet):
    """ViewSet for pricing rules management."""
    queryset = PricingRule.objects.all()
    serializer_class = PricingRuleSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        # Only team/admin can view pricing rules
        if not self.request.user.is_team_member():
            return PricingRule.objects.none()
        
        return PricingRule.objects.all().order_by('start_date')
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class PromotionViewSet(viewsets.ModelViewSet):
    """ViewSet for promotion management (team members only)."""
    queryset = Promotion.objects.all()
    serializer_class = PromotionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Only team members can manage promotions
        if not self.request.user.is_team_member():
            return Promotion.objects.none()
        return Promotion.objects.all().order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['get'], url_path='usage')
    def get_usage(self, request, pk=None):
        """Get usage details for this promotion (who used it)."""
        promotion = self.get_object()
        usages = PromoUsage.objects.filter(promotion=promotion).order_by('-used_at')
        serializer = PromoUsageSerializer(usages, many=True)
        return Response({
            'promotion': PromotionSerializer(promotion).data,
            'usages': serializer.data
        })


class VoucherViewSet(viewsets.ModelViewSet):
    """ViewSet for voucher management (team members only)."""
    queryset = Voucher.objects.all()
    serializer_class = VoucherSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Only team members can manage vouchers
        if not self.request.user.is_team_member():
            return Voucher.objects.none()
        return Voucher.objects.all().order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['get'], url_path='usage')
    def get_usage(self, request, pk=None):
        """Get usage details for this voucher (who used it)."""
        voucher = self.get_object()
        usages = PromoUsage.objects.filter(voucher=voucher).order_by('-used_at')
        serializer = PromoUsageSerializer(usages, many=True)
        return Response({
            'voucher': VoucherSerializer(voucher).data,
            'usages': serializer.data
        })


@api_view(['POST'])
@permission_classes([AllowAny])
def validate_promo_code(request):
    """
    Public endpoint to validate a promo code (promotion or voucher).

    Request body:
    - code: string (required)
    - booking_amount: decimal (optional, for min_spend validation)

    Returns:
    - valid: boolean
    - code_type: 'promotion' or 'voucher'
    - discount_type: 'percent' or 'fixed'
    - discount_value: decimal
    - description: string
    - message: string (error message if invalid)
    """
    serializer = ValidatePromoSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    code = serializer.validated_data['code'].upper()
    booking_amount = serializer.validated_data.get('booking_amount')

    # Try to find as promotion first
    try:
        promotion = Promotion.objects.get(code=code)
        is_valid, reason = promotion.is_valid(booking_amount)

        if is_valid:
            return Response({
                'valid': True,
                'code_type': 'promotion',
                'discount_type': 'percent',
                'discount_value': float(promotion.discount_percent),
                'description': promotion.description,
                'code': promotion.code,
                'min_spend': float(promotion.min_spend),
            })
        else:
            return Response({
                'valid': False,
                'message': reason
            }, status=status.HTTP_400_BAD_REQUEST)

    except Promotion.DoesNotExist:
        pass

    # Try to find as voucher
    try:
        voucher = Voucher.objects.get(code=code)
        is_valid, reason = voucher.is_valid(booking_amount)

        if is_valid:
            return Response({
                'valid': True,
                'code_type': 'voucher',
                'discount_type': voucher.discount_type,
                'discount_value': float(voucher.discount_value),
                'description': voucher.description,
                'code': voucher.code,
                'min_spend': float(voucher.min_spend),
            })
        else:
            return Response({
                'valid': False,
                'message': reason
            }, status=status.HTTP_400_BAD_REQUEST)

    except Voucher.DoesNotExist:
        pass

    # Code not found
    return Response({
        'valid': False,
        'message': 'Invalid promo code'
    }, status=status.HTTP_404_NOT_FOUND)
