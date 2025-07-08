from fastapi import FastAPI, WebSocket, HTTPException, Depends, Header
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
import json
from agent import ask_agent, init_agent
import random
import os

SESSIONS_FILE = "active_sessions.json"
 
def load_sessions():
    try:
        with open(SESSIONS_FILE, 'r') as f:
            print(f"Loading active sessions from {SESSIONS_FILE}")
            return set(json.load(f))
    except FileNotFoundError:
        return set()

def save_sessions():
    global active_sessions
    with open(SESSIONS_FILE, 'w') as f:
        json.dump(list(active_sessions), f)

# Initialize FastAPI application
app = FastAPI()
 
# User session data
user_sessions = {}  # {token: {"agent_session_id": str, "form_data": dict, "websockets": list}}
active_sessions = load_sessions()

def check_auth(authorization: str = Header(None)):
    token = authorization.replace("Bearer ", "") if authorization else None
    if not token or token not in active_sessions:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return token

@app.post("/api/login")
async def login(credentials: dict):
    password = os.getenv("PASS", "123456")
    if credentials.get("password") == password:
        session_token = str(random.randint(100000000, 999999999))
        active_sessions.add(session_token)
        user_sessions[session_token] = {
            "agent_session_id": str(random.randint(10000000, 99999999)),
            "form_data": {},
            "websockets": []
        }
        save_sessions()
        return {"token": session_token, "success": True}
    raise HTTPException(status_code=401, detail="Invalid password")

@app.post("/api/logout")
async def logout(authorization: str = Header(None)):
    token = authorization.replace("Bearer ", "") if authorization else None
    if token and token in active_sessions:
        active_sessions.remove(token)
        if token in user_sessions:
            del user_sessions[token]
        save_sessions()
    return {"success": True}

@app.get("/api/ask-agent/{prompt}")
async def ask_agent_endpoint(prompt: str, authorization: str = Header(None)):
    token = authorization.replace("Bearer ", "") if authorization else None
    if not token or token not in active_sessions:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    user_session = user_sessions[token]
    answer = ask_agent(prompt, session_id=user_session["agent_session_id"])
    changed = ask_agent("REPORT-LAST-ANSWER", session_id=user_session["agent_session_id"])
    
    print(f"Anything changed?\n {changed}")
    print(f"WebSocket connections for user: {len(user_session['websockets'])}")
    
    # Send WebSocket message only to this user's connections
    if changed and changed.strip() != "{}":
        print(f"Sending to {len(user_session['websockets'])} WebSocket connections")
        for client in user_session["websockets"][:]:
            try:
                print(f"Sending update to client: {client}")
                await client.send_text(json.dumps({
                    "type": "update-form",
                    "payload": changed
                }))
            except:
                user_session["websockets"].remove(client)

    return {"answer": answer}

@app.get("/api/start-agent")
def start_agent(authorization: str = Header(None)):
    token = authorization.replace("Bearer ", "") if authorization else None
    if not token or token not in active_sessions:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    if token not in user_sessions:
        user_sessions[token] = {
            "agent_session_id": str(random.randint(10000000, 99999999)),
            "form_data": {},
            "websockets": []
        }
    
    user_session = user_sessions[token]
    user_session["agent_session_id"] = str(random.randint(10000000, 99999999))
    print(f"Starting agent with session ID: {user_session['agent_session_id']}")
    init_agent()
    answer = ask_agent("Greet user and start asking questions.", session_id=user_session["agent_session_id"])
    return {"answer": answer}


@app.post("/api/update-form-field")
async def update_form_field(field_data: dict, authorization: str = Header(None)):
    token = authorization.replace("Bearer ", "") if authorization else None
    if not token or token not in active_sessions:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    user_session = user_sessions[token]
    user_session["form_data"][field_data["name"]] = field_data["value"]
    print(f"Form data updated: {user_session['form_data']}")

    answer = ask_agent(f"User has updated the form field '{field_data['name']}' with value '{field_data['value']}'. Briefly confrm it in simple English. What should user do next?", session_id=user_session["agent_session_id"])
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
    print("WebSocket connection accepted")
    
    # Get token from first message
    try:
        message = await websocket.receive_text()
        auth_data = json.loads(message)
        token = auth_data.get("token")
        print(f"Received token: {token}")
    except Exception as e:
        print(f"Failed to get token: {e}")
        await websocket.close()
        return
    
    if not token or token not in active_sessions:
        print(f"Invalid token or session: {token}")
        await websocket.close()
        return
    
    if token not in user_sessions:
        print(f"Token not in user_sessions: {token}")
        await websocket.close()
        return
    
    user_sessions[token]["websockets"].append(websocket)
    print(f"WebSocket connected for token {token}. Total connections: {len(user_sessions[token]['websockets'])}")
    
    try:
        while True:
            await websocket.receive_text()
    except Exception as e:
        print(f"WebSocket error: {e}")
        if token in user_sessions and websocket in user_sessions[token]["websockets"]:
            user_sessions[token]["websockets"].remove(websocket)
            print(f"WebSocket disconnected for token {token}. Remaining connections: {len(user_sessions[token]['websockets'])}")



# Mount static files
# app.mount("/", StaticFiles(directory="client/dist", html=True), name="static")
app.mount("/", StaticFiles(directory="client1", html=True), name="static")