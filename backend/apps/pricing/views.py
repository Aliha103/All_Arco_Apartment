from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from datetime import datetime
from .models import Settings, PricingRule
from .serializers import SettingsSerializer, PricingRuleSerializer


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
