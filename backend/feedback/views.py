from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response

from .models import UserQuery, UserSuggestion

class SendQueryView(APIView):
    def post(self, request):
        query = request.data.get('query', '').strip()
        
        if not query:
            return Response(
                {'success': False, 'message': 'Query is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
        UserQuery.objects.create(
            user=request.user,
            query=query
        )
        
        return Response({'success': True, 'message': 'Query submitted successfully'})


class SendSuggestionView(APIView):
    def post(self, request):
        suggestion = request.data.get('suggestion', '').strip()
        
        if not suggestion:
            return Response(
                {'success': False, 'message': 'Suggestion is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
        UserSuggestion.objects.create(
            user=request.user,
            suggestion=suggestion
        )
        
        return Response({'success': True, 'message': 'Suggestion submitted successfully'})
