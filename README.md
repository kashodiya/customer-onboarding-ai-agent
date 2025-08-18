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

### 2. Backend Setup (Required First)
```bash
# Install Python dependencies
pip install -r requirements.txt

# Start the FastAPI server
python main.py
# OR alternatively:
# uvicorn main:app --reload
```
The backend will be available at `http://localhost:8000`

### 3. Frontend Setup (In a new terminal)
```bash
# Navigate to Angular client directory
cd angular-client

# Install dependencies
npm install

# Start the development server
npm start
```
The frontend will be available at `http://localhost:4200`

**Note**: Both backend and frontend must be running simultaneously for the application to work properly.

## Development Workflow

### Terminal 1 - Backend Server
```bash
# From the project root directory
python main.py
```

### Terminal 2 - Frontend Development Server
```bash
# From the project root directory
cd angular-client
npm start
```

### Access the Application
Open your browser to `http://localhost:4200`

**Important**: Keep both terminals running while developing. The frontend depends on the backend API and WebSocket connections.

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

### Common Setup Issues

- **CORS Issues**: Make sure both frontend (4200) and backend (8000) are running
- **WebSocket Connection**: Verify backend is running before starting frontend
- **Form Updates**: Check browser console for WebSocket connection status
- **AI Responses**: Ensure AI agent is properly initialized via `/start-agent`

### Dependency Issues

- **Angular CLI Errors**: If you encounter `@angular-devkit/architect` errors, run:
  ```bash
  cd angular-client
  rm -rf node_modules package-lock.json
  npm install
  ```

- **Python Import Errors**: Ensure you're using Python 3.8+ and have installed all requirements:
  ```bash
  pip install -r requirements.txt
  ```

### Port Conflicts

- **Backend Port 8000 in use**: Change the port in `main.py` or kill the process using port 8000
- **Frontend Port 4200 in use**: Angular will automatically suggest an alternative port
