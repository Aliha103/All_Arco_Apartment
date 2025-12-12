from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from datetime import datetime
from apps.users.permissions import HasPermissionForAction, HasPermission
from .models import Settings, PricingRule, Promotion, Voucher, PromoUsage
from .serializers import (
    SettingsSerializer, PricingRuleSerializer,
    PromotionSerializer, VoucherSerializer, PromoUsageSerializer,
    ValidatePromoSerializer
)


@api_view(['GET', 'PATCH'])
@permission_classes([AllowAny])
def get_settings(request):
    """Get pricing settings."""
    settings = Settings.get_settings()
    if request.method == 'GET':
        return Response(SettingsSerializer(settings).data)
    # Allow patch from same endpoint for clients expecting PATCH /settings/
    if not request.user.is_authenticated or not request.user.has_any_perm(['pricing.settings.edit']):
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
    serializer = SettingsSerializer(settings, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save(updated_by=request.user)
        return Response(serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_settings(request):
    """Update pricing settings (team/admin only)."""
    if not request.user.has_any_perm(['pricing.settings.edit']):
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
    import logging
    logger = logging.getLogger(__name__)

    try:
        check_in = request.query_params.get('check_in')
        check_out = request.query_params.get('check_out')

        # Safely parse guests parameter
        try:
            guests = int(request.query_params.get('guests', 1))
        except (ValueError, TypeError) as e:
            logger.error(f"Invalid guests parameter: {request.query_params.get('guests')} - {e}")
            return Response(
                {'error': 'Invalid guests parameter'},
                status=status.HTTP_400_BAD_REQUEST
            )

        has_pet = request.query_params.get('pet', 'false').lower() in ('true', '1', 'yes')

        if not check_in or not check_out:
            return Response(
                {'error': 'check_in, check_out, and guests parameters required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            check_in_date = datetime.strptime(check_in, '%Y-%m-%d').date()
            check_out_date = datetime.strptime(check_out, '%Y-%m-%d').date()
        except ValueError as e:
            logger.error(f"Invalid date format: {check_in}, {check_out} - {e}")
            return Response(
                {'error': 'Invalid date format. Use YYYY-MM-DD'},
                status=status.HTTP_400_BAD_REQUEST
            )

        settings = Settings.get_settings()
        pricing = settings.calculate_booking_price(check_in_date, check_out_date, guests, has_pet=has_pet)

        return Response(pricing)

    except Exception as e:
        # Catch any unexpected errors and log them
        logger.error(f"Error calculating price: {str(e)}", exc_info=True)
        return Response(
            {'error': 'Internal server error calculating price', 'detail': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


class PricingRuleViewSet(viewsets.ModelViewSet):
    """ViewSet for pricing rules management."""
    queryset = PricingRule.objects.all()
    serializer_class = PricingRuleSerializer
    permission_classes = [IsAuthenticated, HasPermissionForAction]
    action_permissions = {
        'list': 'pricing.rules.view',
        'retrieve': 'pricing.rules.view',
        'create': 'pricing.rules.manage',
        'update': 'pricing.rules.manage',
        'partial_update': 'pricing.rules.manage',
        'destroy': 'pricing.rules.manage',
    }
    
    def get_queryset(self):
        # Only team/admin can view pricing rules
        if not self.request.user.has_any_perm(['pricing.rules.view']):
            return PricingRule.objects.none()
        
        return PricingRule.objects.all().order_by('start_date')
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class PromotionViewSet(viewsets.ModelViewSet):
    """ViewSet for promotion management (team members only)."""
    queryset = Promotion.objects.all()
    serializer_class = PromotionSerializer
    permission_classes = [IsAuthenticated, HasPermissionForAction]
    action_permissions = {
        'list': 'pricing.promotions.view',
        'retrieve': 'pricing.promotions.view',
        'create': 'pricing.promotions.manage',
        'update': 'pricing.promotions.manage',
        'partial_update': 'pricing.promotions.manage',
        'destroy': 'pricing.promotions.manage',
    }

    def get_queryset(self):
        # Only team members can manage promotions
        if not self.request.user.has_any_perm(['pricing.promotions.view']):
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
    permission_classes = [IsAuthenticated, HasPermissionForAction]
    action_permissions = {
        'list': 'pricing.vouchers.view',
        'retrieve': 'pricing.vouchers.view',
        'create': 'pricing.vouchers.manage',
        'update': 'pricing.vouchers.manage',
        'partial_update': 'pricing.vouchers.manage',
        'destroy': 'pricing.vouchers.manage',
    }

    def get_queryset(self):
        # Only team members can manage vouchers
        if not self.request.user.has_any_perm(['pricing.vouchers.view']):
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
