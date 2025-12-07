"""
Serializers for gallery images.
"""
from rest_framework import serializers
from .models import HeroImage


class HeroImageSerializer(serializers.ModelSerializer):
    """Serializer for HeroImage model."""

    url = serializers.ReadOnlyField()
    uploaded_by_name = serializers.SerializerMethodField()
    image_type_display = serializers.CharField(source='get_image_type_display', read_only=True)
    # Make image optional since we can use image_url instead
    image = serializers.ImageField(required=False, allow_null=True)
    # Handle string 'true'/'false' from FormData
    is_active = serializers.BooleanField(default=True)

    class Meta:
        model = HeroImage
        fields = [
            'id', 'title', 'alt_text', 'image', 'image_url', 'url',
            'image_type', 'image_type_display', 'order', 'is_active',
            'uploaded_by', 'uploaded_by_name', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'uploaded_by', 'created_at', 'updated_at']

    def get_uploaded_by_name(self, obj):
        """Get the full name of the uploader, handling null values."""
        if obj.uploaded_by:
            return obj.uploaded_by.get_full_name() or obj.uploaded_by.email
        return None

    def to_internal_value(self, data):
        """Handle string boolean values from FormData."""
        # Convert string 'true'/'false' to actual boolean
        if 'is_active' in data:
            val = data.get('is_active')
            if isinstance(val, str):
                data = data.copy() if hasattr(data, 'copy') else dict(data)
                data['is_active'] = val.lower() in ('true', '1', 'yes')
        return super().to_internal_value(data)

    def validate(self, attrs):
        """Ensure either image file or image_url is provided."""
        image = attrs.get('image')
        image_url = attrs.get('image_url')

        # On create, require either image or image_url
        if not self.instance:
            if not image and not image_url:
                raise serializers.ValidationError({
                    'image': 'Either image file or image_url is required.'
                })

        return attrs


class HeroImagePublicSerializer(serializers.ModelSerializer):
    """Public serializer for guest-facing pages (minimal data)."""
    
    url = serializers.ReadOnlyField()
    
    class Meta:
        model = HeroImage
        fields = ['id', 'title', 'alt_text', 'url', 'image_type', 'order']
