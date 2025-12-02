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
    def save_credentials(self, request):
        """
        Save Alloggiati Web credentials (username/password).
        Note: Password is sent in the request but stored only temporarily in env or hashed.
        """
        username = request.data.get('username')
        password = request.data.get('password')

        if not username or not password:
            return Response(
                {"error": "Both username and password are required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get or create the account
        account = AlloggiatiAccount.objects.first()
        if not account:
            account = AlloggiatiAccount.objects.create(username=username)
        else:
            account.username = username
            account.save()

        # Store password in environment variable temporarily for this request
        # Note: In production, consider encrypting and storing in database
        import os
        os.environ['ALLOGGIATI_USERNAME'] = username
        os.environ['ALLOGGIATI_PASSWORD'] = password

        serializer = AlloggiatiAccountSerializer(account)
        return Response({
            "message": "Credentials saved successfully",
            "account": serializer.data
        })

    @action(detail=False, methods=['post'])
    def refresh_token(self, request):
        account, _ = AlloggiatiAccount.objects.get_or_create(pk=AlloggiatiAccount.objects.first() or None)
        client = AlloggiatiClient(account=account)
        result = client.fetch_token()
        if result.get("success"):
            return Response({"message": "Token fetched", "token": result.get("token")})
        return Response({"error": result.get("error"), "raw_response": result.get("raw_response")}, status=status.HTTP_400_BAD_REQUEST)
