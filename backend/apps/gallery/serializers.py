"""
Serializers for gallery images.
"""
from rest_framework import serializers
from .models import HeroImage


class HeroImageSerializer(serializers.ModelSerializer):
    """Serializer for HeroImage model."""
    
    url = serializers.ReadOnlyField()
    uploaded_by_name = serializers.CharField(source='uploaded_by.get_full_name', read_only=True)
    image_type_display = serializers.CharField(source='get_image_type_display', read_only=True)
    
    class Meta:
        model = HeroImage
        fields = [
            'id', 'title', 'alt_text', 'image', 'image_url', 'url',
            'image_type', 'image_type_display', 'order', 'is_active',
            'uploaded_by', 'uploaded_by_name', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'uploaded_by', 'created_at', 'updated_at']


class HeroImagePublicSerializer(serializers.ModelSerializer):
    """Public serializer for guest-facing pages (minimal data)."""
    
    url = serializers.ReadOnlyField()
    
    class Meta:
        model = HeroImage
        fields = ['id', 'title', 'alt_text', 'url', 'image_type', 'order']
