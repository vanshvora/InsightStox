from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage
from langgraph.graph import StateGraph, MessagesState, START, END
from langgraph.prebuilt import ToolNode
from django.conf import settings

from .tools.market_news import market_news_tool
from .tools.portfolio_analysis import portfolio_analysis_tool
from .tools.risk_analysis import risk_analysis_tool


class AIAgent:
    """Singleton LangGraph agent for InsightStox."""
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(AIAgent, cls).__new__(cls)
            cls._instance._initialize_graph()
        return cls._instance
        
    def _initialize_graph(self):
        # Tools
        self.tools = [market_news_tool, portfolio_analysis_tool, risk_analysis_tool]
        self.tool_node = ToolNode(self.tools)
        
        # Models
        self.llm = ChatGroq(
            api_key=settings.GROQ_API_KEY,
            model=getattr(settings, 'GROQ_MODEL', 'openai/gpt-oss-120b'),
            temperature=0,
            max_tokens=1500,
        )
        self.llm_with_tools = self.llm.bind_tools(self.tools)
        
        # System Prompts
        self.agent_prompt = (
            "You are a helpful and knowledgeable AI financial assistant for InsightStox. "
            "You can help users analyze their portfolios, get market news, and assess risk. "
            "When using tools, you will be provided with the user's email if they ask about their own portfolio. "
            "Answer clearly, concisely, and professionally. Use markdown formatting if helpful."
        )
        
        # Build Graph
        builder = StateGraph(MessagesState)
        
        builder.add_node("call_model", self.call_model)
        builder.add_node("tools", self.tool_node)
        
        builder.add_edge(START, "call_model")
        builder.add_conditional_edges("call_model", self.should_continue)
        builder.add_edge("tools", "call_model")
        
        self.graph = builder.compile()

    def call_model(self, state: MessagesState):
        messages = state["messages"]
        if not any(isinstance(m, SystemMessage) for m in messages):
            messages = [SystemMessage(content=self.agent_prompt)] + messages
            
        response = self.llm_with_tools.invoke(messages)
        return {"messages": [response]}
        
    def should_continue(self, state: MessagesState):
        messages = state["messages"]
        last_message = messages[-1]
        
        if getattr(last_message, 'tool_calls', None):
            return "tools"
        return END

    def invoke(self, message: str, user_email: str, history: list = None):
        """Invoke the agent with a user message."""
        
        # Build the message history
        messages = []
        if history:
            from langchain_core.messages import AIMessage
            for msg in history:
                if msg.get('role') == 'user':
                    messages.append(HumanMessage(content=msg.get('content', '')))
                elif msg.get('role') == 'assistant':
                    messages.append(AIMessage(content=msg.get('content', '')))
        
        # We append user_email to context so LLM knows how to call portfolio_analysis_tool
        context_msg = f"[System Context: The current user's email is {user_email}. If they ask about their portfolio, use this email.]\n\nUser: {message}"
        messages.append(HumanMessage(content=context_msg))
        
        try:
            response = self.graph.invoke(
                {"messages": messages},
            )
            return response["messages"][-1].content
        except Exception as e:
            import traceback
            print(f"Agent error: {e}")
            traceback.print_exc()
            return "I'm sorry, I'm having trouble connecting to my analysis systems right now."


# Global instance
agent = AIAgent()
