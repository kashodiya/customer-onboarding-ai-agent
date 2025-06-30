# Customer Onboarding Angular App

This is an Angular application that replaces the Vue.js frontend for the customer onboarding AI agent system.

## Features

- Angular 17 with Angular Material UI components
- Reactive forms for the onboarding process
- Real-time chat interface with the AI agent
- WebSocket integration for live form updates
- Responsive design with Material Design principles

## Prerequisites

- Node.js (version 16 or higher)
- npm or yarn package manager

## Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm start
```

The application will be available at `http://localhost:4200`

## Backend Integration

This frontend communicates with the FastAPI backend running on `http://localhost:8000`. Make sure the backend is running before starting the Angular application.

## Building for Production

```bash
npm run build
```

The build artifacts will be stored in the `dist/` directory. 