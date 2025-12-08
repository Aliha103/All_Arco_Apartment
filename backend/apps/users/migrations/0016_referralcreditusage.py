from django.db import migrations, models
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0015_rename_users_revie_is_acti_985fa9_idx_users_revie_is_acti_c6a131_idx_and_more"),
        ("bookings", "0010_booking_applied_credit_amount_due"),
    ]

    operations = [
        migrations.CreateModel(
            name="ReferralCreditUsage",
            fields=[
                ("id", models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, serialize=False)),
                ("amount", models.DecimalField(decimal_places=2, max_digits=10)),
                ("note", models.CharField(blank=True, default="", max_length=255)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("booking", models.ForeignKey(on_delete=models.deletion.CASCADE, related_name="credit_usages", to="bookings.booking")),
                ("user", models.ForeignKey(on_delete=models.deletion.CASCADE, related_name="credit_usages", to="users.user")),
            ],
            options={
                "db_table": "users_referralcreditusage",
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="referralcreditusage",
            index=models.Index(fields=["user", "-created_at"], name="refcreditusage_user_idx"),
        ),
        migrations.AddIndex(
            model_name="referralcreditusage",
            index=models.Index(fields=["booking"], name="refcreditusage_booking_idx"),
        ),
    ]
