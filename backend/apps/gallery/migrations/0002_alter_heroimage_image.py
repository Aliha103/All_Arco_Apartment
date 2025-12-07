# Generated migration - Make image field optional

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('gallery', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='heroimage',
            name='image',
            field=models.ImageField(blank=True, help_text='Upload an image file', null=True, upload_to='gallery/hero/'),
        ),
    ]
