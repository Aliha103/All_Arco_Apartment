# Generated migration for HeroImage model

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='HeroImage',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=200)),
                ('alt_text', models.CharField(help_text='Alt text for accessibility', max_length=255)),
                ('image', models.ImageField(upload_to='gallery/hero/')),
                ('image_url', models.URLField(blank=True, help_text='External image URL (alternative to upload)', null=True)),
                ('image_type', models.CharField(choices=[('hero', 'Hero Carousel'), ('gallery', 'Gallery'), ('both', 'Both Hero & Gallery')], default='both', max_length=10)),
                ('order', models.PositiveIntegerField(default=0, help_text='Display order (lower = first)')),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('uploaded_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='uploaded_images', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Hero Image',
                'verbose_name_plural': 'Hero Images',
                'ordering': ['order', '-created_at'],
            },
        ),
    ]
