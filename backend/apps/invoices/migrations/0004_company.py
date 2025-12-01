# Generated manually to add Company model
from django.db import migrations, models
import uuid
from django.conf import settings


class Migration(migrations.Migration):

    dependencies = [
        ('invoices', '0003_alter_invoice_options_and_more'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Company',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=255)),
                ('vat_number', models.CharField(max_length=50)),
                ('sdi', models.CharField(blank=True, max_length=20, null=True)),
                ('tax_code', models.CharField(blank=True, max_length=50, null=True)),
                ('address', models.TextField()),
                ('country', models.CharField(max_length=100)),
                ('email', models.EmailField(max_length=254)),
                ('phone', models.CharField(max_length=50)),
                ('website', models.URLField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_by', models.ForeignKey(blank=True, null=True, on_delete=models.SET_NULL, related_name='companies_created', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['name'],
                'db_table': 'invoices_company',
            },
        ),
        migrations.AddIndex(
            model_name='company',
            index=models.Index(fields=['name'], name='invoices_c_name_e56054_idx'),
        ),
        migrations.AddIndex(
            model_name='company',
            index=models.Index(fields=['vat_number'], name='invoices_c_vat_numb_ef9393_idx'),
        ),
        migrations.AddIndex(
            model_name='company',
            index=models.Index(fields=['country'], name='invoices_c_country_a76436_idx'),
        ),
    ]

