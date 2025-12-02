from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import AlloggiatiAccount
from .serializers import AlloggiatiAccountSerializer
from .services import AlloggiatiClient


class AlloggiatiAccountViewSet(viewsets.ViewSet):
    """
    Minimal endpoints to view token status and trigger refresh.
    """
    permission_classes = [IsAuthenticated]

    def list(self, request):
        account = AlloggiatiAccount.objects.first()
        serializer = AlloggiatiAccountSerializer(account) if account else None
        return Response(serializer.data if serializer else {})

    @action(detail=False, methods=['post'])
    def refresh_token(self, request):
        account, _ = AlloggiatiAccount.objects.get_or_create(pk=AlloggiatiAccount.objects.first() or None)
        client = AlloggiatiClient(account=account)
        result = client.fetch_token()
        if result.get("success"):
            return Response({"message": "Token fetched", "token": result.get("token")})
        return Response({"error": result.get("error"), "raw_response": result.get("raw_response")}, status=status.HTTP_400_BAD_REQUEST)
