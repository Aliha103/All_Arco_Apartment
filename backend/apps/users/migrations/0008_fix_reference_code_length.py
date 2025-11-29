# Manual migration to ensure reference_code is varchar(13)
# Some environments still have a varchar(12) column; this aligns DB with model (ARCO-XXXXXXXX).

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0007_rename_users_referralcredit_referrer_created_idx_refcredit_referrer_created_idx_and_more"),
    ]

    operations = [
        migrations.AlterField(
            model_name="user",
            name="reference_code",
            field=models.CharField(
                max_length=13,
                unique=True,
                db_index=True,
                blank=True,
                null=True,
            ),
        ),
    ]
