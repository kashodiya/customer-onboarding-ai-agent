# Customer Onboarding AI Agent

A comprehensive customer onboarding system with an AI agent that helps collect and process customer information through an intelligent chat interface and dynamic form updates.

## Project Architecture

- **Backend**: FastAPI server with WebSocket support for real-time communication
- **Frontend**: Angular 17 application with Material Design UI
- **AI Integration**: Intelligent form population and chat assistance

## Prerequisites

- Python 3.8+ 
- Node.js 16+
- npm or yarn package manager

## Quick Start

### 1. Clone the Repository
```bash
git clone <repository-url>
cd customer-onboarding-ai-agent
```

### 2. Backend Setup
```bash
# Install Python dependencies
pip install -r requirements.txt

# Start the FastAPI server
uvicorn main:app --reload
```
The backend will be available at `http://localhost:8000`

### 3. Frontend Setup
```bash
# Navigate to Angular client directory
cd angular-client

# Install dependencies
npm install

# Start the development server
npm start
```
The frontend will be available at `http://localhost:4200`

## Development Workflow

1. Start the backend server first:
   ```bash
   uvicorn main:app --reload
   ```

2. In a separate terminal, start the frontend:
   ```bash
   cd angular-client
   npm start
   ```

3. Open your browser to `http://localhost:4200`

## Features

- **Intelligent Form**: 6-section comprehensive onboarding form
- **AI Chat Assistant**: Real-time chat interface with proactive form updates
- **Dynamic Updates**: AI automatically populates form fields based on conversation
- **Responsive Design**: Modern UI with floating chat overlay
- **WebSocket Integration**: Real-time bidirectional communication
- **Form Validation**: Complete validation and error handling

## Project Structure

```
customer-onboarding-ai-agent/
├── main.py                 # FastAPI backend server
├── agent.py               # AI agent logic
├── requirements.txt       # Python dependencies
├── questions_schema.json  # Form schema definition
├── angular-client/        # Angular frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/
│   │   │   └── services/
│   │   └── ...
│   ├── package.json
│   └── README.md
└── README.md
```

## API Endpoints

- `GET /health` - Health check
- `POST /start-agent` - Initialize AI agent
- `POST /ask-agent` - Send message to AI agent
- `POST /update-form-field` - Update form field
- `WebSocket /ws` - Real-time form updates

## Production Build

### Backend
```bash
# Run with production settings
uvicorn main:app --host 0.0.0.0 --port 8000
```

### Frontend
```bash
cd angular-client
npm run build
```
Build artifacts will be in `angular-client/dist/`

## Troubleshooting

- **CORS Issues**: Make sure both frontend (4200) and backend (8000) are running
- **WebSocket Connection**: Verify backend is running before starting frontend
- **Form Updates**: Check browser console for WebSocket connection status
- **AI Responses**: Ensure AI agent is properly initialized via `/start-agent`
