from fastapi import FastAPI, WebSocket, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
import json
import re
from agent import ask_agent
import random
from urllib.parse import unquote

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
async def ask_agent_endpoint(prompt: str, request: Request):
    # Check if form data is provided in query parameters
    form_data_param = request.query_params.get('formData')
    current_form_state = {}
    if form_data_param:
        try:
            current_form_state = json.loads(unquote(form_data_param))
            print(f"Received form state: {current_form_state}")
        except Exception as e:
            print(f"Error parsing form data: {e}")

    # Include form state in the prompt context
    if current_form_state and any(current_form_state.values()):
        # Check if this might be a manual mode response
        if prompt.lower() in ['no', 'nope', 'no thanks', 'no thank you', 'manual']:
            context_prompt = f"User declined assistance and prefers manual mode. Simply acknowledge and inform them you'll only respond to direct questions. Do not ask follow-up questions or provide guidance."
        else:
            context_prompt = f"User asks: '{prompt}'. Current form state: {json.dumps(current_form_state)}. Respond considering what's already filled out."
    else:
        if prompt.lower() in ['no', 'nope', 'no thanks', 'no thank you', 'manual']:
            context_prompt = f"User declined assistance and prefers manual mode. Simply acknowledge and inform them you'll only respond to direct questions. Do not ask follow-up questions or provide guidance."
        else:
            context_prompt = prompt
    
    answer = ask_agent(context_prompt, session_id=agent_session_id)

    # Skip form updates if user chose manual mode
    is_manual_mode_response = prompt.lower() in ['no', 'nope', 'no thanks', 'no thank you', 'manual']
    
    # Check if the AI response contains proactive form updates (only if not manual mode)
    changed = None
    clean_answer = answer  # Start with the original answer
    
    if not is_manual_mode_response and isinstance(answer, str) and "Form Update Available:" in answer:
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
    
    # Fallback: Use the existing REPORT-LAST-ANSWER method if no proactive update found (only if not manual mode)
    if not is_manual_mode_response and not changed:
        changed = ask_agent("REPORT-LAST-ANSWER", session_id=agent_session_id)
        print(f"Fallback form update check: {changed}")
    elif is_manual_mode_response:
        print("Skipping form updates - user chose manual mode")
    
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

def has_meaningful_form_content(form_data):
    """Check if form data contains meaningful content beyond empty fields"""
    if not form_data or not isinstance(form_data, dict):
        return False
    
    # Helper function to check if a string value is meaningful
    def is_meaningful_string(value):
        return value and isinstance(value, str) and value.strip()
    
    # Check text fields across all sections
    text_fields = [
        # Existing Flows
        form_data.get('existingFlows', {}).get('sourceApplicationName'),
        form_data.get('existingFlows', {}).get('targetApplicationName'),
        form_data.get('existingFlows', {}).get('iodsDetails', {}).get('oldIodsId'),
        form_data.get('existingFlows', {}).get('iodsDetails', {}).get('onSiteServerNames'),
        form_data.get('existingFlows', {}).get('iodsDetails', {}).get('fileName'),
        form_data.get('existingFlows', {}).get('iodsDetails', {}).get('fileType'),
        form_data.get('existingFlows', {}).get('iodsDetails', {}).get('iodsMailbox'),
        form_data.get('existingFlows', {}).get('iodsDetails', {}).get('prePostTransferProcesses'),
        
        # Application Info
        form_data.get('applicationInfo', {}).get('systemName'),
        form_data.get('applicationInfo', {}).get('internalOrExternal'),
        form_data.get('applicationInfo', {}).get('supportedProtocols'),
        form_data.get('applicationInfo', {}).get('platform'),
        form_data.get('applicationInfo', {}).get('primaryRegion'),
        form_data.get('applicationInfo', {}).get('backupRegion'),
        
        # Network Cloud Info
        form_data.get('networkCloudInfo', {}).get('networkLocation'),
        form_data.get('networkCloudInfo', {}).get('cloudDetails', {}).get('awsAccountName'),
        form_data.get('networkCloudInfo', {}).get('cloudDetails', {}).get('awsAccountNumber'),
        form_data.get('networkCloudInfo', {}).get('cloudDetails', {}).get('cloudRegion'),
        form_data.get('networkCloudInfo', {}).get('cloudDetails', {}).get('awsCloudId'),
        form_data.get('networkCloudInfo', {}).get('cloudDetails', {}).get('serverName'),
        form_data.get('networkCloudInfo', {}).get('cloudDetails', {}).get('ipOrSubnet'),
        form_data.get('networkCloudInfo', {}).get('cloudDetails', {}).get('applicationTarget'),
        
        # File Transfer Info
        form_data.get('fileTransferInfo', {}).get('sourceAwsAccount'),
        form_data.get('fileTransferInfo', {}).get('sourceBucketArn'),
        form_data.get('fileTransferInfo', {}).get('sourceArchiveBucket'),
        form_data.get('fileTransferInfo', {}).get('sourceArchivePrefix'),
        form_data.get('fileTransferInfo', {}).get('targetBucket'),
        form_data.get('fileTransferInfo', {}).get('targetPrefix'),
        
        # Environment Info
        form_data.get('environmentInfo', {}).get('customerEnvironments'),
        form_data.get('environmentInfo', {}).get('cloudEnvironmentMapping', {}).get('development'),
        form_data.get('environmentInfo', {}).get('cloudEnvironmentMapping', {}).get('qualityAssurance'),
        form_data.get('environmentInfo', {}).get('cloudEnvironmentMapping', {}).get('production'),
        
        # Business Info
        form_data.get('businessInfo', {}).get('contacts', {}).get('businessContactSource'),
        form_data.get('businessInfo', {}).get('contacts', {}).get('technicalContactSource'),
        form_data.get('businessInfo', {}).get('contacts', {}).get('businessContactTarget'),
        form_data.get('businessInfo', {}).get('contacts', {}).get('technicalContactTarget'),
        form_data.get('businessInfo', {}).get('contacts', {}).get('vendorContact'),
    ]
    
    # Check if any text field has meaningful content
    has_text_content = any(is_meaningful_string(field) for field in text_fields)
    
    # Check boolean fields (only true values are meaningful, false is default)
    boolean_fields = [
        form_data.get('existingFlows', {}).get('isUsingIODS'),
        form_data.get('networkCloudInfo', {}).get('requiresExternalVendorConnection'),
        form_data.get('fileTransferInfo', {}).get('hasOutbound'),
        form_data.get('fileTransferInfo', {}).get('hasInbound'),
        form_data.get('applicationInfo', {}).get('isExternalApplication'),
    ]
    
    has_boolean_content = any(field is True for field in boolean_fields)
    
    # Check environments array
    environments = form_data.get('applicationInfo', {}).get('environments', [])
    has_environments = isinstance(environments, list) and len(environments) > 0
    
    # Check implementation deadline
    deadline = form_data.get('businessInfo', {}).get('implementationDeadline')
    has_deadline = deadline is not None and deadline != ""
    
    return has_text_content or has_boolean_content or has_environments or has_deadline

@app.get("/api/start-agent")
def start_agent(request: Request):
    print(f"Starting agent with session ID: {agent_session_id}")
    
    # Check if form data is provided in query parameters
    form_data_param = request.query_params.get('formData')
    current_form_state = {}
    if form_data_param:
        try:
            current_form_state = json.loads(unquote(form_data_param))
            print(f"Initial form state: {current_form_state}")
        except Exception as e:
            print(f"Error parsing form data: {e}")
    
    # Determine if this is asking for assistance based on meaningful content
    has_meaningful_content = has_meaningful_form_content(current_form_state)
    is_asking_for_assistance = not has_meaningful_content  # Ask for assistance if no meaningful content
    
    # Include form state in the welcome context
    if has_meaningful_content:
        # User has existing meaningful form data (real draft/loaded submission)
        context_prompt = f"Give a brief welcome back message. User has loaded existing form data: {json.dumps(current_form_state)}. Simply acknowledge the loaded data and mention you're ready to help. Keep it under 2 sentences. Do not ask for assistance preference."
    else:
        # Fresh start or empty draft - ask for assistance
        context_prompt = "Give a brief welcome to the customer onboarding process. Ask if they would like assistance. Tell them to choose Yes or No using the buttons that will appear. Keep it under 2 sentences."
    
    answer = ask_agent(context_prompt, session_id=agent_session_id)
    return {
        "answer": answer,
        "showAssistanceButtons": is_asking_for_assistance
    }


@app.post("/api/update-form-field")
async def update_form_field(field_data: dict):
    # Update form data
    form_data[field_data["name"]] = field_data["value"]
    print(f"Form data updated: {form_data}")

    # Get complete form state if provided
    complete_form_data = field_data.get("completeFormData", {})
    
    # Include complete form state in the prompt context
    if complete_form_data and any(complete_form_data.values()):
        context_prompt = f"User updated '{field_data['name']}' to '{field_data['value']}'. Current complete form state: {json.dumps(complete_form_data)}. Give brief confirmation, then ask for the next UNFILLED field. Keep under 2 sentences."
    else:
        context_prompt = f"User updated '{field_data['name']}' to '{field_data['value']}'. Give brief confirmation, then ask for the next field. Keep under 2 sentences."
    
    answer = ask_agent(context_prompt, session_id=agent_session_id)
    return {"answer": answer}


@app.post("/api/toggle-smart-guide")
async def toggle_smart_guide(toggle_data: dict):
    enabled = toggle_data.get("enabled", True)
    form_data_provided = toggle_data.get("formData", {})
    print(f"Smart Guide toggled: {enabled}")
    print(f"Form data provided: {form_data_provided}")
    
    if enabled:
        context_prompt = "Great! Start filling out the form and I'll assist you along the way. Click on any field for context and requirements."
        answer = ask_agent(context_prompt, session_id=agent_session_id)
    else:
        answer = ask_agent("Briefly confirm Manual mode is active. Keep it under 1 sentence.", session_id=agent_session_id)
    
    return {"answer": answer}


@app.post("/api/get-field-context")
async def get_field_context(request: Request):
    data = await request.json()
    field_name = data.get('name', '')
    field_label = data.get('value', '')  # Using value field to pass the field label
    complete_form_data = data.get('completeFormData', {})
    
    # Create context prompt for field assistance
    context_prompt = f"""
FIELD CONTEXT REQUEST:
The user is focusing on the field: "{field_label}" (path: {field_name})

Current form state: {json.dumps(complete_form_data)}

Provide helpful context about the "{field_label}" field. Explain what it's for, mention any requirements, and give examples if helpful. Be specific and mention the field name explicitly instead of saying "This field". Keep it natural and under 2 sentences.
"""
    
    answer = ask_agent(context_prompt, session_id=agent_session_id)
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