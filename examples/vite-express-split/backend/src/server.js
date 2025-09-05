import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { AgentChatRoute } from 'react-ai-agent-chat-sdk';
import { anthropic } from '@ai-sdk/anthropic';
import { agentChatRouteConfig } from './agent-config.js';

const app = express();
const port = process.env.PORT || 3001;

// Enable CORS for frontend
app.use(cors({
  origin: 'http://localhost:5173', // Vite default port
  credentials: true
}));

app.use(express.json());

// Configure the AI model
const modelConfig = {
  model: anthropic('claude-sonnet-4-20250514'),
  temperature: 0.1,
};

// Create the agent chat route with model configuration
const routeConfig = {
  ...agentChatRouteConfig,
  model: modelConfig,
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend server is running' });
});

// Set up the agent chat routes
app.use('/api/chat', AgentChatRoute(routeConfig));

app.listen(port, () => {
  console.log(`🚀 Backend server running on http://localhost:${port}`);
  console.log(`🤖 Agent chat available at http://localhost:${port}/api/chat`);
  console.log(`📋 History available at http://localhost:${port}/api/chat/history`);
});