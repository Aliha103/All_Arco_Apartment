"""
Views for gallery image management.
"""
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.db.models import Max

from .models import HeroImage
from .serializers import HeroImageSerializer, HeroImagePublicSerializer
from apps.users.permissions import HasPermission


class HeroImageViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing hero images.
    
    - List/Create/Update/Delete require 'gallery.manage' permission
    - Public endpoint for guest-facing pages
    """
    
    queryset = HeroImage.objects.all()
    serializer_class = HeroImageSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    
    def get_permissions(self):
        if self.action == 'public':
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated(), HasPermission('gallery.manage')]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filter by type if specified
        image_type = self.request.query_params.get('type')
        if image_type:
            if image_type == 'hero':
                queryset = queryset.filter(image_type__in=['hero', 'both'])
            elif image_type == 'gallery':
                queryset = queryset.filter(image_type__in=['gallery', 'both'])
            else:
                queryset = queryset.filter(image_type=image_type)
        
        # Filter by active status
        is_active = self.request.query_params.get('active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        
        return queryset
    
    def perform_create(self, serializer):
        serializer.save(uploaded_by=self.request.user)
    
    @action(detail=False, methods=['get'], permission_classes=[permissions.AllowAny])
    def public(self, request):
        """Public endpoint for guest-facing pages - returns active images only."""
        image_type = request.query_params.get('type')
        
        queryset = HeroImage.objects.filter(is_active=True)
        
        if image_type == 'hero':
            queryset = queryset.filter(image_type__in=['hero', 'both'])
        elif image_type == 'gallery':
            queryset = queryset.filter(image_type__in=['gallery', 'both'])
        
        queryset = queryset.order_by('order', '-created_at')
        serializer = HeroImagePublicSerializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def reorder(self, request, pk=None):
        """Reorder an image to a new position."""
        image = self.get_object()
        new_order = request.data.get('order')
        
        if new_order is None:
            return Response(
                {'error': 'Order value is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            new_order = int(new_order)
        except ValueError:
            return Response(
                {'error': 'Order must be a number'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        image.order = new_order
        image.save()
        
        return Response(HeroImageSerializer(image).data)
    
    @action(detail=True, methods=['post'])
    def toggle_active(self, request, pk=None):
        """Toggle the active status of an image."""
        image = self.get_object()
        image.is_active = not image.is_active
        image.save()
        
        return Response(HeroImageSerializer(image).data)
