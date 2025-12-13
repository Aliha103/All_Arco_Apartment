"""
Notification API views.
"""

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Q
from .models import Notification


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_notifications(request):
    """
    List all notifications for the current user.
    Supports filtering by read/unread status.
    """
    notifications = Notification.objects.filter(user=request.user)

    # Filter by read status if specified
    is_read = request.query_params.get('is_read')
    if is_read is not None:
        notifications = notifications.filter(is_read=is_read.lower() == 'true')

    # Limit results
    limit = int(request.query_params.get('limit', 50))
    notifications = notifications[:limit]

    data = [{
        'id': str(notif.id),
        'type': notif.type,
        'title': notif.title,
        'message': notif.message,
        'booking_id': notif.booking_id,
        'data': notif.data,
        'is_read': notif.is_read,
        'read_at': notif.read_at.isoformat() if notif.read_at else None,
        'created_at': notif.created_at.isoformat(),
    } for notif in notifications]

    return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def unread_count(request):
    """Get count of unread notifications for current user."""
    count = Notification.objects.filter(
        user=request.user,
        is_read=False
    ).count()

    return Response({'unread_count': count})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_as_read(request, notification_id):
    """Mark a specific notification as read."""
    try:
        notification = Notification.objects.get(
            id=notification_id,
            user=request.user
        )
        notification.mark_as_read()
        return Response({'message': 'Notification marked as read'})
    except Notification.DoesNotExist:
        return Response(
            {'error': 'Notification not found'},
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_all_as_read(request):
    """Mark all notifications as read for current user."""
    Notification.objects.filter(
        user=request.user,
        is_read=False
    ).update(is_read=True)

    return Response({'message': 'All notifications marked as read'})


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_notification(request, notification_id):
    """Delete a specific notification."""
    try:
        notification = Notification.objects.get(
            id=notification_id,
            user=request.user
        )
        notification.delete()
        return Response({'message': 'Notification deleted'})
    except Notification.DoesNotExist:
        return Response(
            {'error': 'Notification not found'},
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def clear_all_notifications(request):
    """Delete all notifications for current user."""
    Notification.objects.filter(user=request.user).delete()
    return Response({'message': 'All notifications cleared'})
