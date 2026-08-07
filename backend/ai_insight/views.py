from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from .agent import agent

class SendMessageView(APIView):
    def post(self, request):
        message = request.data.get('message')
        
        if not message:
            return Response(
                {'success': False, 'message': 'Message is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
        try:
            # We don't have long term memory persistence in this simple port yet,
            # but it will handle the immediate message perfectly.
            ai_response = agent.invoke(message, request.user.email)
            
            return Response({
                'success': True,
                'data': ai_response
            })
            
        except Exception as e:
            return Response(
                {'success': False, 'message': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
