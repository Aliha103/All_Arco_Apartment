from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("bookings", "0009_bookingguest_parent_guest_bookingguest_relationship_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="booking",
            name="amount_due",
            field=models.DecimalField(
                decimal_places=2,
                default=0,
                editable=False,
                help_text="Total after credits (amount to charge)",
                max_digits=10,
            ),
        ),
        migrations.AddField(
            model_name="booking",
            name="applied_credit",
            field=models.DecimalField(
                decimal_places=2,
                default=0,
                help_text="Referral/loyalty credit applied to this booking",
                max_digits=10,
            ),
        ),
        migrations.AddConstraint(
            model_name="booking",
            constraint=models.CheckConstraint(
                check=models.Q(("amount_due__gte", 0)),
                name="amount_due_non_negative",
            ),
        ),
        migrations.AddConstraint(
            model_name="booking",
            constraint=models.CheckConstraint(
                check=models.Q(("applied_credit__gte", 0)),
                name="applied_credit_non_negative",
            ),
        ),
        migrations.RunSQL(
            sql="UPDATE bookings_booking SET applied_credit = 0, amount_due = total_price",
            reverse_sql=migrations.RunSQL.noop,
        ),
    ]
