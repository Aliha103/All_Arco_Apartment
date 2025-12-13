# Generated migration for compensation and activation dates

from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0021_referralcredit_expires_at'),
    ]

    operations = [
        # Add activation period fields to User model
        migrations.AddField(
            model_name='user',
            name='activation_start_date',
            field=models.DateField(blank=True, help_text='Date when team member account becomes active', null=True),
        ),
        migrations.AddField(
            model_name='user',
            name='activation_end_date',
            field=models.DateField(blank=True, help_text='Date when team member account expires', null=True),
        ),

        # Create TeamCompensation model
        migrations.CreateModel(
            name='TeamCompensation',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('compensation_type', models.CharField(choices=[('salary', 'Salary Based'), ('profit_share', 'Profit Share')], default='salary', max_length=20)),
                ('salary_method', models.CharField(blank=True, choices=[('per_checkout', 'Fixed Salary Per Check-out'), ('percentage_base_price', 'Percentage on Base Price')], help_text='How to calculate salary', max_length=30, null=True)),
                ('fixed_amount_per_checkout', models.DecimalField(blank=True, decimal_places=2, help_text='Fixed amount paid per checkout', max_digits=10, null=True)),
                ('percentage_on_base_price', models.DecimalField(blank=True, decimal_places=2, help_text='Percentage of base price (e.g., 10.00 for 10%)', max_digits=5, null=True)),
                ('profit_share_timing', models.CharField(blank=True, choices=[('before_expenses', 'Before Expenses'), ('after_expenses', 'After Expenses'), ('after_expenses_and_salaries', 'After Expenses + Salaries')], help_text='When to calculate profit share', max_length=35, null=True)),
                ('profit_share_percentage', models.DecimalField(blank=True, decimal_places=2, help_text='Percentage of profit (e.g., 15.00 for 15%)', max_digits=5, null=True)),
                ('notes', models.TextField(blank=True, help_text='Internal notes about compensation arrangement')),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('user', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='compensation', to='users.user')),
            ],
            options={
                'verbose_name': 'Team Compensation',
                'verbose_name_plural': 'Team Compensations',
                'db_table': 'users_team_compensation',
            },
        ),
    ]
