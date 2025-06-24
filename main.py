from fastapi import FastAPI, WebSocket
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
import json
from agent import ask_agent
import random

# Initialize FastAPI application
app = FastAPI()

# items = []
connected_clients = []
form_data = {}

@app.get("/api/ask-agent/{prompt}")
def ask_agent_endpoint(prompt: str):
    answer = ask_agent(prompt)
    return {"answer": answer}

@app.get("/api/start-agent")
def start_agent():
    random_number = str(random.randint(10000000, 99999999))
    print(random_number)
    print(f"Starting agent with session ID: {random_number}")
    answer = ask_agent("Start asking questions.", session_id=random_number)
    return {"answer": answer}


@app.post("/api/update-form-field")
async def update_form_field(field_data: dict):
    # Update form data
    form_data[field_data["name"]] = field_data["value"]
    print(f"Form data updated: {form_data}")

    answer = ask_agent(f"User has updated the form field '{field_data['name']}' with value '{field_data['value']}'. What should user do next?")
    return {"answer": answer}

    
    # # Notify all connected WebSocket clients
    # for client in connected_clients:
    #     try:
    #         await client.send_text(json.dumps({
    #             "type": "field-updated",
    #             "field": field_data,
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
# app.mount("/", StaticFiles(directory="client/dist", html=True), name="static")
app.mount("/", StaticFiles(directory="client1", html=True), name="static")