# Generated migration for Promotion, Voucher, and PromoUsage models

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('pricing', '0003_alter_pricingrule_options_alter_settings_options_and_more'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('bookings', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Promotion',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('code', models.CharField(db_index=True, max_length=50, unique=True)),
                ('description', models.CharField(max_length=255)),
                ('discount_percent', models.DecimalField(decimal_places=2, help_text='Percentage discount (e.g., 10.00 for 10%)', max_digits=5)),
                ('min_spend', models.DecimalField(decimal_places=2, default=0, help_text='Minimum booking amount to use this promotion', max_digits=10)),
                ('max_uses', models.IntegerField(blank=True, help_text='Maximum number of times this code can be used (null = unlimited)', null=True)),
                ('current_uses', models.IntegerField(default=0, editable=False)),
                ('expires_at', models.DateTimeField(blank=True, help_text='When this promotion expires (null = never expires)', null=True)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='promotions_created', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'db_table': 'pricing_promotion',
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='Voucher',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('code', models.CharField(db_index=True, max_length=50, unique=True)),
                ('description', models.CharField(max_length=255)),
                ('discount_type', models.CharField(choices=[('percent', 'Percentage'), ('fixed', 'Fixed Amount')], default='percent', max_length=20)),
                ('discount_value', models.DecimalField(decimal_places=2, help_text='Percentage (e.g., 15.00) or fixed amount (e.g., 50.00)', max_digits=10)),
                ('min_spend', models.DecimalField(decimal_places=2, default=0, help_text='Minimum booking amount to use this voucher', max_digits=10)),
                ('max_uses', models.IntegerField(default=1, help_text='Maximum number of times this code can be used')),
                ('current_uses', models.IntegerField(default=0, editable=False)),
                ('expires_at', models.DateTimeField(blank=True, help_text='When this voucher expires (null = never expires)', null=True)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='vouchers_created', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'db_table': 'pricing_voucher',
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='PromoUsage',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('code_type', models.CharField(choices=[('promotion', 'Promotion'), ('voucher', 'Voucher')], max_length=20)),
                ('guest_email', models.EmailField(help_text='Email of guest who used the code', max_length=254)),
                ('booking_amount', models.DecimalField(decimal_places=2, max_digits=10)),
                ('discount_amount', models.DecimalField(decimal_places=2, max_digits=10)),
                ('used_at', models.DateTimeField(auto_now_add=True)),
                ('booking', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='promo_usages', to='bookings.booking')),
                ('promotion', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='usages', to='pricing.promotion')),
                ('user', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='promo_usages', to=settings.AUTH_USER_MODEL)),
                ('voucher', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='usages', to='pricing.voucher')),
            ],
            options={
                'db_table': 'pricing_promousage',
                'ordering': ['-used_at'],
            },
        ),
        migrations.AddIndex(
            model_name='promotion',
            index=models.Index(fields=['code'], name='pricing_pro_code_f9e0e8_idx'),
        ),
        migrations.AddIndex(
            model_name='promotion',
            index=models.Index(fields=['is_active'], name='pricing_pro_is_acti_6e4072_idx'),
        ),
        migrations.AddIndex(
            model_name='promotion',
            index=models.Index(fields=['expires_at'], name='pricing_pro_expires_0de58a_idx'),
        ),
        migrations.AddIndex(
            model_name='voucher',
            index=models.Index(fields=['code'], name='pricing_vou_code_2a2b44_idx'),
        ),
        migrations.AddIndex(
            model_name='voucher',
            index=models.Index(fields=['is_active'], name='pricing_vou_is_acti_09cb46_idx'),
        ),
        migrations.AddIndex(
            model_name='voucher',
            index=models.Index(fields=['expires_at'], name='pricing_vou_expires_11f5e9_idx'),
        ),
        migrations.AddIndex(
            model_name='promousage',
            index=models.Index(fields=['code_type'], name='pricing_pro_code_ty_bd5b39_idx'),
        ),
        migrations.AddIndex(
            model_name='promousage',
            index=models.Index(fields=['guest_email'], name='pricing_pro_guest_e_b18e7a_idx'),
        ),
        migrations.AddIndex(
            model_name='promousage',
            index=models.Index(fields=['used_at'], name='pricing_pro_used_at_80f9b7_idx'),
        ),
    ]
