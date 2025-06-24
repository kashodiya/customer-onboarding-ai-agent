from langchain_aws import ChatBedrock
from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.memory import MemorySaver
from typing import TypedDict, Annotated
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
import json
import logging

# Configure logging for debugging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Global agent instance
_agent_app = None


class AgentState(TypedDict):
    messages: Annotated[list, "List of messages in the conversation"]


def get_agent():
    """Get or create the global agent instance."""
    global _agent_app
    if _agent_app is None:
        _agent_app = _create_agent()
    return _agent_app


def _create_agent():
    """Create a LangGraph agent with Bedrock LLM and InMemorySaver."""
    # Initialize Bedrock LLM
    llm = ChatBedrock(
        model_id="anthropic.claude-3-haiku-20240307-v1:0",
        region_name="us-east-1",
        model_kwargs={"max_tokens": 4096, "temperature": 0.5, "top_p": 0.9}
    )
    
    def chat_node(state: AgentState):
        """Process the conversation with the LLM."""
        with open("SYSTEM_PROMPT.md", "r") as f:
            system_prompt = f.read().strip()
        messages = [SystemMessage(content=system_prompt)] + state["messages"]
        response = llm.invoke(messages)
        return {"messages": state["messages"] + [response]}
    
    # Create the graph
    workflow = StateGraph(AgentState)
    workflow.add_node("chat", chat_node)
    workflow.add_edge(START, "chat")
    workflow.add_edge("chat", END)
    
    # Compile with memory saver
    memory = MemorySaver()
    app = workflow.compile(checkpointer=memory)
    
    return app


def debug_memory_state(session_id="default"):
    """Debug function to inspect memory state."""
    try:
        app = get_agent()
        config = {"configurable": {"thread_id": session_id}}
        # Get current state from memory
        current_state = app.get_state(config)
        print(f"\n=== DEBUG: Memory State for Session '{session_id}' ===")
        print(f"State values: {current_state.values}")
        print(f"Next actions: {current_state.next}")
        print(f"Config: {current_state.config}")
        
        # Print message history
        if 'messages' in current_state.values:
            print(f"\nMessage History ({len(current_state.values['messages'])} messages):")
            for i, msg in enumerate(current_state.values['messages']):
                msg_type = type(msg).__name__
                content_preview = msg.content[:50] + "..." if len(msg.content) > 50 else msg.content
                print(f"  {i+1}. {msg_type}: {content_preview}")
        print("=" * 50)
        
        return current_state
    except Exception as e:
        print(f"Error debugging memory state: {e}")
        return None


def ask_agent(prompt, session_id="default", debug=True):
    """Send a prompt to the agent and return the response."""
    try:
        app = get_agent()
        config = {"configurable": {"thread_id": session_id}}
        
        # Debug: Show state before processing
        if debug:
            print(f"\n--- BEFORE: Session '{session_id}' ---")
            debug_memory_state(session_id)
        
        result = app.invoke(
            {"messages": [HumanMessage(content=prompt)]},
            config=config
        )
        
        # Debug: Show state after processing
        if debug:
            print(f"\n--- AFTER: Session '{session_id}' ---")
            debug_memory_state(session_id)
        
        answer = result["messages"][-1].content
        print(f"\nReceived answer: {answer[:100]}...")
        return answer
    except Exception as e:
        print(f"An error occurred: {e}")
        return None


def main():
    # Test with multiple sessions to see memory isolation
    print("=== Testing Session Memory ===")
    
    # Session 1
    print("\n🔹 Session 1 - First interaction")
    ask_agent("My name is Alice", session_id="session_1")
    
    print("\n🔹 Session 1 - Second interaction")
    ask_agent("What's my name?", session_id="session_1")
    
    # Session 2 (different session)
    print("\n🔹 Session 2 - First interaction")
    ask_agent("My name is Bob", session_id="session_2")
    
    print("\n🔹 Session 2 - Second interaction")
    ask_agent("What's my name?", session_id="session_2")
    
    # Back to Session 1 to verify memory persistence
    print("\n🔹 Session 1 - Third interaction (memory test)")
    ask_agent("Do you remember my name?", session_id="session_1")
    
    # Manual memory inspection
    print("\n=== Manual Memory Inspection ===")
    debug_memory_state("session_1")
    debug_memory_state("session_2")


if __name__ == "__main__":
    main()