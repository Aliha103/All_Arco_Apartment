"""
Gallery app configuration.
"""
from django.apps import AppConfig
import os


class GalleryConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.gallery'
    verbose_name = 'Gallery'

    def ready(self):
        """Ensure media directories exist on app startup."""
        from django.conf import settings

        # Create media root directory if it doesn't exist
        if hasattr(settings, 'MEDIA_ROOT'):
            media_root = settings.MEDIA_ROOT
            gallery_hero_path = os.path.join(media_root, 'gallery', 'hero')

            try:
                os.makedirs(gallery_hero_path, exist_ok=True)
                # Set permissions for Railway/production
                os.chmod(gallery_hero_path, 0o755)
            except Exception as e:
                # Log but don't crash if directory creation fails
                import logging
                logger = logging.getLogger(__name__)
                logger.warning(f"Could not create media directories: {e}")
