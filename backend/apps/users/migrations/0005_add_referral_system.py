# Generated migration for referral system

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0004_merge_20251128_1754"),
        ("bookings", "0001_initial"),  # Need bookings for foreign key
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="reference_code",
            field=models.CharField(
                blank=True,
                db_index=True,
                max_length=12,
                null=True,
                unique=True
            ),
        ),
        migrations.AddField(
            model_name="user",
            name="referred_by",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="invited_guests",
                to="users.user"
            ),
        ),
        migrations.CreateModel(
            name="ReferralCredit",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False
                    ),
                ),
                ("amount", models.DecimalField(decimal_places=2, max_digits=8)),
                ("nights", models.IntegerField()),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("pending", "Pending"),
                            ("earned", "Earned"),
                            ("cancelled", "Cancelled"),
                        ],
                        db_index=True,
                        default="pending",
                        max_length=20,
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("earned_at", models.DateTimeField(blank=True, null=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "booking",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="referral_credits",
                        to="bookings.booking",
                    ),
                ),
                (
                    "referrer",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="referral_credits",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "referred_user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="referral_earnings",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "db_table": "users_referralcredit",
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="referralcredit",
            index=models.Index(
                fields=["referrer", "-created_at"],
                name="users_referralcredit_referrer_created_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="referralcredit",
            index=models.Index(
                fields=["referred_user"],
                name="users_referralcredit_referred_user_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="referralcredit",
            index=models.Index(
                fields=["status"],
                name="users_referralcredit_status_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="referralcredit",
            index=models.Index(
                fields=["booking"],
                name="users_referralcredit_booking_idx",
            ),
        ),
    ]
