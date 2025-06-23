from fastapi import FastAPI, WebSocket
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
import json

app = FastAPI()

# Sample data
items = []
connected_clients = []
form_data = {}

@app.get("/api/items")
def get_items():
    return {"items": items}

@app.post("/api/items")
def create_item(item: dict):
    items.append(item)
    return {"message": "Item created", "item": item}

@app.post("/api/form-field")
async def update_form_field(field_data: dict):
    # Update form data
    form_data[field_data["name"]] = field_data["value"]
    print(f"Form data updated: {form_data}")
    
    # Notify all connected WebSocket clients
    for client in connected_clients:
        try:
            await client.send_text(json.dumps({
                "type": "field-updated",
                "field": field_data,
                "form_state": form_data
            }))
        except:
            connected_clients.remove(client)
    
    return {"status": "success", "current_form": form_data}

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
app.mount("/", StaticFiles(directory="client/dist", html=True), name="static")