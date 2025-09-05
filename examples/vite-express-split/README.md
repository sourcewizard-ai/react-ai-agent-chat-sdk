# Vite + Express Split Example

This example demonstrates using the React AI Agent Chat SDK with separate frontend and backend applications:

- **Frontend**: Vite + React application
- **Backend**: Express.js server with AI chat routes

## Architecture

- Frontend uses `config-client` for UI configuration
- Backend uses `config-server` for tool execution and AI model integration
- Communication happens via HTTP API calls from frontend to backend

## Quick Start

1. Install all dependencies:
```bash
pnpm run install:all
```

2. Set up environment variables:
Create a `.env` file in the `backend` directory:
```bash
# Anthropic API Key (required)
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Optional: Custom port (defaults to 3001)
PORT=3001
```

3. Run both servers simultaneously:
```bash
pnpm run dev
```

This will start:
- Backend server at `http://localhost:3001`
- Frontend server at `http://localhost:5173`

## Alternative Setup

If you prefer to install and run services separately:

### Install Dependencies
```bash
# Install backend dependencies
cd backend && pnpm install

# Install frontend dependencies  
cd ../frontend && pnpm install
```

### Run Services
```bash
# Terminal 1 - Backend Server
cd backend && pnpm run dev

# Terminal 2 - Frontend Server  
cd frontend && pnpm run dev
```

## Features

This example includes the same features as the Next.js example:

- **File Management Tools**: Read, edit, and list files in a mock file system
- **Custom Tool Renderers**: Visual representation of tool execution
- **Conversation History**: Persistent chat history using browser localStorage
- **Debug Panel**: Development tools for inspecting conversation state
- **Error Handling**: Proper error states for tool failures and timeouts

## API Endpoints

The backend exposes these endpoints:

- `POST /api/chat` - Main chat endpoint for AI interactions
- `GET /api/chat/history?conversation_id=<id>` - Get conversation history
- `GET /health` - Health check endpoint

## Development

- Backend uses `nodemon` for auto-reloading during development
- Frontend uses Vite's hot module replacement (HMR)
- Both servers support environment-based configuration

## Key Differences from Next.js Example

1. **Separate Processes**: Frontend and backend run as independent services
2. **API Communication**: Frontend makes HTTP requests to backend API
3. **CORS Configuration**: Backend configured to accept requests from frontend origin
4. **Deployment Ready**: Can be deployed to different services (e.g., frontend to Vercel, backend to Railway)
5. **Scalable Architecture**: Backend can serve multiple frontend instances