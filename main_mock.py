from fastapi import FastAPI, WebSocket
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
import json
import random

# Mock agent function that doesn't require AWS
def mock_ask_agent(prompt, session_id="default"):
    """Mock AI agent responses for testing without AWS"""
    responses = {
        "Start asking questions.": "Hello! I'm your AI assistant for customer onboarding. Let's start by getting your flow name. What would you like to call this file transfer flow?",
        "REPORT-LAST-ANSWER": "{}",  # No changes to report
    }
    
    # Check for specific prompts
    for key, response in responses.items():
        if key in prompt:
            return response
    
    # Default responses based on content
    if "flow" in prompt.lower():
        return "Great! I can see you're working on the flow name. What source system will you be transferring data from?"
    elif "source" in prompt.lower():
        return "Perfect! Now, what's the target system you'll be transferring data to?"
    elif "target" in prompt.lower():
        return "Excellent! What transfer method would you like to use? Options include SFTP, API, Database, File Share, or Message Queue."
    elif "transfer" in prompt.lower() or "method" in prompt.lower():
        return "Good choice! How frequently do you need this transfer to run? Daily, Weekly, Monthly, or a Custom schedule?"
    elif "frequency" in prompt.lower() or "schedule" in prompt.lower():
        return "Perfect! Is there a specific time you'd like the transfer to run?"
    else:
        return f"I understand you said: '{prompt}'. Could you tell me more about your file transfer requirements?"

# Initialize FastAPI application
app = FastAPI()

connected_clients = []
form_data = {}
agent_session_id = str(random.randint(10000000, 99999999))

@app.get("/api/ask-agent/{prompt}")
async def ask_agent_endpoint(prompt: str):
    answer = mock_ask_agent(prompt, session_id=agent_session_id)
    
    # Mock form updates (simulate AI updating form)
    changed = "{}"  # No automatic form updates in mock mode
    
    print(f"Mock Agent Response: {answer}")
    
    # Send WebSocket message if changed has a value
    if changed and changed.strip() != "{}":
        for client in connected_clients[:]:
            try:
                await client.send_text(json.dumps({
                    "type": "update-form",
                    "payload": changed
                }))
            except:
                connected_clients.remove(client)

    return {"answer": answer}

@app.get("/api/start-agent")
def start_agent():
    print(f"Starting mock agent with session ID: {agent_session_id}")
    answer = mock_ask_agent("Start asking questions.", session_id=agent_session_id)
    return {"answer": answer}

@app.post("/api/update-form-field")
async def update_form_field(field_data: dict):
    # Update form data
    form_data[field_data["name"]] = field_data["value"]
    print(f"Form data updated: {form_data}")

    answer = mock_ask_agent(f"User has updated the form field '{field_data['name']}' with value '{field_data['value']}'. What should user do next?", session_id=agent_session_id)
    return {"answer": answer}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    connected_clients.append(websocket)
    try:
        while True:
            await websocket.receive_text()
    except:
        if websocket in connected_clients:
            connected_clients.remove(websocket)

# Mount static files
app.mount("/", StaticFiles(directory="angular-client/dist/customer-onboarding-angular", html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    print("🚀 Starting Mock Backend Server...")
    print("📱 Angular App: http://localhost:8000")
    print("🤖 Mock AI Agent: Ready!")
    uvicorn.run(app, host="127.0.0.1", port=8000) 