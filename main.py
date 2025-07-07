from fastapi import FastAPI, WebSocket
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
import json
import re
from agent import ask_agent
import random

# Initialize FastAPI application
app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200", "http://localhost:8000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# items = []
connected_clients = []
form_data = {}
agent_session_id = str(random.randint(10000000, 99999999))

@app.get("/api/ask-agent/{prompt}")
async def ask_agent_endpoint(prompt: str):
    answer = ask_agent(prompt, session_id=agent_session_id)

    # Check if the AI response contains proactive form updates
    changed = None
    clean_answer = answer  # Start with the original answer
    
    if isinstance(answer, str) and "Form Update Available:" in answer:
        try:
            # Extract JSON from the response
            json_match = re.search(r'```json\s*(\{[^`]+\})\s*```', answer)
            if json_match:
                json_str = json_match.group(1)
                changed = json.loads(json_str)
                print(f"Proactive form update found: {changed}")
                
                # Remove the form update section from the visible response
                clean_answer = re.sub(r'\s*Form Update Available:\s*```json\s*\{[^`]+\}\s*```', '', answer)
                clean_answer = clean_answer.strip()
            else:
                print("Form update marker found but no valid JSON extracted")
        except Exception as e:
            print(f"Error parsing proactive form update: {e}")
    
    # Fallback: Use the existing REPORT-LAST-ANSWER method if no proactive update found
    if not changed:
        changed = ask_agent("REPORT-LAST-ANSWER", session_id=agent_session_id)
        print(f"Fallback form update check: {changed}")
    
    # Debug logging
    print(f"Changed value: {changed}")
    print(f"Changed type: {type(changed)}")
    print(f"Connected clients: {len(connected_clients)}")
    
    # Send WebSocket message if changed has a value
    if changed and str(changed).strip() != "{}":
        print(f"Sending WebSocket message for: {changed}")
        message_data = {
            "type": "update-form",
            "payload": changed
        }
        message_json = json.dumps(message_data)
        print(f"WebSocket message: {message_json}")
        
        for client in connected_clients[:]:
            try:
                await client.send_text(message_json)
                print(f"✅ Message sent to client")
            except Exception as e:
                print(f"❌ Failed to send message to client: {e}")
                connected_clients.remove(client)
    else:
        print(f"No WebSocket message sent. Changed: {changed}")

    return {"answer": clean_answer}

@app.get("/api/start-agent")
def start_agent():
    print(f"Starting agent with session ID: {agent_session_id}")
    answer = ask_agent("Start asking questions.", session_id=agent_session_id)
    return {"answer": answer}


@app.post("/api/update-form-field")
async def update_form_field(field_data: dict):
    # Update form data
    form_data[field_data["name"]] = field_data["value"]
    print(f"Form data updated: {form_data}")

    answer = ask_agent(f"User has updated the form field '{field_data['name']}' with value '{field_data['value']}'. What should user do next?", session_id=agent_session_id)
    return {"answer": answer}



    #             "form_state": form_data
    #         }))
    #     except:
    #         connected_clients.remove(client)
    
    # return {"status": "success", "current_form": form_data}


# @app.get("/api/items")
# def get_items():
#     return {"items": items}

# @app.post("/api/items")
# def create_item(item: dict):
#     items.append(item)
#     return {"message": "Item created", "item": item}


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
# Temporarily serve Vue app until Angular is built for production
app.mount("/", StaticFiles(directory="angular-client/dist/customer-onboarding-angular", html=True), name="static")
# For production Angular build, use: angular-client/dist/customer-onboarding-angular

# Add server startup code
if __name__ == "__main__":
    import uvicorn
    print("Starting FastAPI server on http://localhost:8000")
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)