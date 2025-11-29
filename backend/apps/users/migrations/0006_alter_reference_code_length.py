# Migration to alter reference_code max_length from 12 to 13

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0005_add_referral_system"),
    ]

    operations = [
        migrations.AlterField(
            model_name="user",
            name="reference_code",
            field=models.CharField(
                blank=True,
                db_index=True,
                max_length=13,
                null=True,
                unique=True
            ),
        ),
    ]
