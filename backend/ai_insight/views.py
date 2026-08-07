from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from .agent import agent

from rest_framework.permissions import IsAuthenticated

class SendMessageView(APIView):
    permission_classes = [IsAuthenticated]
    def post(self, request):
        message_data = request.data.get('message')
        
        # In ChatWindow.jsx, message is sent as an object: {id, text, sender, screenWidth}
        message_text = message_data.get('text') if isinstance(message_data, dict) else message_data
        
        if not message_text:
            return Response(
                {'success': False, 'message': 'Message text is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
        history = request.data.get('history', [])
        
        try:
            # We pass the conversation history to the agent to provide context
            ai_response = agent.invoke(message_text, request.user.email, history=history)
            
            return Response({
                'success': True,
                'reply': ai_response
            })
            
        except Exception as e:
            return Response(
                {'success': False, 'message': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
