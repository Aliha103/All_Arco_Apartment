"""
Gallery models for managing hero images and gallery images.
"""
from django.db import models
from django.conf import settings


class HeroImage(models.Model):
    """Hero image for the homepage carousel."""
    
    IMAGE_TYPE_CHOICES = [
        ('hero', 'Hero Carousel'),
        ('gallery', 'Gallery'),
        ('both', 'Both Hero & Gallery'),
    ]
    
    title = models.CharField(max_length=200)
    alt_text = models.CharField(max_length=255, help_text="Alt text for accessibility")
    image = models.ImageField(upload_to='gallery/hero/', blank=True, null=True, help_text="Upload an image file")
    image_url = models.URLField(blank=True, null=True, help_text="External image URL (alternative to upload)")
    image_type = models.CharField(max_length=10, choices=IMAGE_TYPE_CHOICES, default='both')
    order = models.PositiveIntegerField(default=0, help_text="Display order (lower = first)")
    is_active = models.BooleanField(default=True)
    
    # Metadata
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='uploaded_images'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['order', '-created_at']
        verbose_name = 'Hero Image'
        verbose_name_plural = 'Hero Images'
    
    def __str__(self):
        return f"{self.title} ({self.get_image_type_display()})"
    
    @property
    def url(self):
        """Return the image URL - either uploaded file or external URL."""
        # Prefer uploaded file over external URL
        if self.image and hasattr(self.image, 'url'):
            try:
                return self.image.url
            except ValueError:
                # Handle case where file reference exists but file doesn't
                pass
        return self.image_url or ''
    
    def save(self, *args, **kwargs):
        # Auto-increment order if not set
        if not self.pk and self.order == 0:
            max_order = HeroImage.objects.aggregate(models.Max('order'))['order__max']
            self.order = (max_order or 0) + 1
        super().save(*args, **kwargs)
