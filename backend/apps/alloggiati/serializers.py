from rest_framework import serializers
from .models import AlloggiatiAccount


class AlloggiatiAccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = AlloggiatiAccount
        fields = [
            'id',
            'username',
            'token',
            'token_expires_at',
            'last_fetched_at',
            'last_error',
            'created_at',
            'updated_at',
        ]
        read_only_fields = fields
