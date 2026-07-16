from rest_framework import serializers
from .models import WhatsAppSession, ConversationMessage

class ConversationMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConversationMessage
        fields = ['id', 'direction', 'message_type', 'body', 'media_url', 'timestamp']


class WhatsAppSessionSerializer(serializers.ModelSerializer):
    messages = ConversationMessageSerializer(many=True, read_only=True)

    class Meta:
        model = WhatsAppSession
        fields = ['phone_number', 'state', 'metadata', 'temp_images', 'updated_at', 'messages']
