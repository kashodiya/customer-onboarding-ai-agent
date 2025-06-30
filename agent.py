from langchain_aws import ChatBedrock
from langchain.memory import ConversationBufferMemory
from langchain.schema import SystemMessage, HumanMessage, BaseMessage
from jinja2 import Environment, BaseLoader
from datetime import datetime

# Global memory instances per session
_memories = {}

# Global cached instances
_llm_instance = None
_system_prompt = None


def get_memory(session_id="default"):
    """Get or create memory for a session."""
    if session_id not in _memories:
        _memories[session_id] = ConversationBufferMemory(return_messages=True)
    return _memories[session_id]


def init_agent():
    """Initialize/refresh LLM and system prompt."""
    global _llm_instance, _system_prompt

    print("Initializing agent...")
    
    _llm_instance = ChatBedrock(
        model="anthropic.claude-3-5-sonnet-20240620-v1:0",
        region="us-west-2",
        model_kwargs={"max_tokens": 4096, "temperature": 0.5, "top_p": 0.9}
    )

    with open("SYSTEM_PROMPT.md", "r") as f:
        system_prompt = f.read().strip()
    
    with open("questions_schema.json", "r") as f:
        questions_schema = f.read().strip()
        
    env = Environment(loader=BaseLoader())
    template = env.from_string(system_prompt)
    # Current date and time
    current_date_time = datetime.now().strftime("%Y-%m-%d %H:%M")
    _system_prompt = template.render({"questions_schema": questions_schema, "date_time": current_date_time })


def get_llm():
    """Get the LLM instance."""
    if _llm_instance is None:
        init_agent()
    return _llm_instance


def get_system_prompt():
    """Get the system prompt."""
    if _system_prompt is None:
        init_agent()
    return _system_prompt


def debug_memory_state(session_id="default"):
    """Debug function to inspect memory state."""
    try:
        memory = get_memory(session_id)
        messages = memory.chat_memory.messages
        print(f"\n=== DEBUG: Memory State for Session '{session_id}' ===")
        print(f"Message History ({len(messages)} messages):")
        for i, msg in enumerate(messages):
            msg_type = type(msg).__name__
            content_preview = msg.content[:50] + "..." if len(msg.content) > 50 else msg.content
            print(f"  {i+1}. {msg_type}: {content_preview}")
        print("=" * 50)
        return messages
    except Exception as e:
        print(f"Error debugging memory state: {e}")
        return None


def ask_agent(prompt, session_id="default", debug=False, role="user"):
    """Send a prompt to the agent and return the response."""
    try:
        memory = get_memory(session_id)
        llm = get_llm()
        if llm is None:
            raise RuntimeError("Failed to initialize LLM")
        system_prompt = get_system_prompt()
        
        print(f"\n🔍 Asking agent in session '{session_id}': {prompt}")
        
        if debug:
            print(f"\n--- BEFORE: Session '{session_id}' ---")
            debug_memory_state(session_id)
        
        # Ensure system_prompt is not None
        if system_prompt is None:
            system_prompt = "You are a helpful AI assistant."
        
        # Build messages: system + conversation history + new prompt
        messages: list[BaseMessage] = [SystemMessage(content=system_prompt)]
        messages.extend(memory.chat_memory.messages)
        messages.append(HumanMessage(content=prompt))
        
        response = llm.invoke(messages)
        
        # Save to memory
        memory.save_context({"input": prompt}, {"output": response.content})
        
        if debug:
            print(f"\n--- AFTER: Session '{session_id}' ---")
            debug_memory_state(session_id)
        
        # print(f"\nReceived answer: {response.content}")
        return response.content
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