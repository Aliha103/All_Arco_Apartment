from rest_framework import serializers
from .models import AlloggiatiAccount


class AlloggiatiAccountSerializer(serializers.ModelSerializer):
    has_credentials = serializers.SerializerMethodField()
    has_wskey = serializers.SerializerMethodField()

    class Meta:
        model = AlloggiatiAccount
        fields = [
            'id',
            'username',
            'has_credentials',
            'has_wskey',
            'is_connected',
            'last_test_at',
            'last_error',
            'created_at',
            'updated_at',
        ]
        read_only_fields = fields

    def get_has_credentials(self, obj):
        """Check if account has credentials configured."""
        return obj.has_credentials()

    def get_has_wskey(self, obj):
        """Check if account has WSKEY configured."""
        return bool(obj.wskey)
