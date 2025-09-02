# React AI Agent Chat SDK

A React library for building AI-powered chat interfaces with tool execution, configurable timeouts, retry logic, and custom renderers.

## Features

- **Tool Execution**: Execute custom tools during AI conversations
- **Timeout & Retry**: Configurable timeouts and retry logic with exponential backoff
- **Visual Error Handling**: Visual indicators for tool timeouts, failures, and errors
- **Custom Renderers**: Custom React components for tool result rendering
- **Type Safety**: Full TypeScript support with proper type inference
- **Model Configuration**: Support for different AI models and providers
- **State Management**: Built-in chat state management with React Context

## Installation

```bash
npm install react-ai-agent-chat-sdk
# or
pnpm add react-ai-agent-chat-sdk
```

### Peer Dependencies

This library requires the following peer dependencies to be installed in your project:

```bash
npm install @ai-sdk/react react react-dom
```

### Optional Dependencies

For AI model providers, install the ones you need:

```bash
# For Anthropic Claude models
npm install @ai-sdk/anthropic

# For OpenAI models  
npm install @ai-sdk/openai

# For other providers
npm install @ai-sdk/google @ai-sdk/mistral
```

> **Note:** The library includes `ai` and `zod` as direct dependencies, so you don't need to install them separately.

## Quick Start

### 1. Create Your Tools

Define tools with Zod schemas for type-safe input validation:

```typescript
import { z } from 'zod';
import { createTool } from 'react-ai-agent-chat-sdk/config';

const readFileSchema = z.object({
  file_path: z.string().describe('The path to the file to read'),
});

const tools = {
  read_file: createTool({
    description: 'Read the contents of a file',
    display_name: "Reading file",
    inputSchema: readFileSchema,
    execute: async ({ file_path }) => {
      // Your tool implementation
      const content = await fs.readFile(file_path, 'utf-8');
      return { file_path, content };
    },
    // Optional: Configure timeouts per tool
    executionConfig: {
      timeoutMs: 10000, // 10 seconds
      retries: 2,
      retryDelayMs: 1000 // 1 second initial delay
    }
  })
};
```

### 2. Configure the Agent

Create configuration for both client and server:

```typescript
import { makeAgentChatConfig } from 'react-ai-agent-chat-sdk/config';
import { anthropic } from '@ai-sdk/anthropic';
import { stepCountIs } from 'ai';

const { agentChatConfig, agentChatRouteConfig } = makeAgentChatConfig(
  // System prompt
  `You are a helpful assistant with access to file management tools.`,
  
  // API route (configurable)
  "/api/chat",
  
  // Tools
  tools,
  
  // Auth function
  async () => true, // Replace with your auth logic
  
  // Optional: Global tool execution config
  {
    timeoutMs: 30000, // 30 seconds default
    retries: 3,
    retryDelayMs: 1000
  },
  
  // Optional: Model configuration
  {
    model: anthropic('claude-sonnet-4-20250514'),
    temperature: 0.3,
    stopWhen: stepCountIs(5),
    onStepFinish: (step) => {
      console.log('Step finished:', step.finishReason);
    }
  },
  
  // Optional: Storage for conversation persistence
  myStorageInstance // Implement ChatStorage interface
);
```

### 3. Create API Route

Create a Next.js API route (e.g., `app/api/chat/route.ts`):

```typescript
import { chatRoute } from 'react-ai-agent-chat-sdk/api';
import { agentChatRouteConfig } from '@/lib/agent-config';

export async function POST(req: Request) {
  return chatRoute(agentChatRouteConfig, req);
}
```

The `chatRoute` function automatically validates the request body using Zod schema and returns appropriate error responses for invalid requests.

#### Request Body Format

The API expects a JSON body with the following structure:

```typescript
{
  messages: Array<any>;           // AI SDK message format
  conversation_id?: string;       // Optional conversation identifier
}
```

**Example request body:**
```json
{
  "messages": [
    {
      "role": "user",
      "content": "Hello, can you help me with file management?"
    }
  ],
  "conversation_id": "conv_123abc"
}
```

### 4. Create Client Configuration

Create a client-side configuration helper:

```typescript
// lib/agent-chat-client-config.ts
import { AgentChatConfig } from 'react-ai-agent-chat-sdk/config';
import { ToolRenderer } from './agent-tools'; // Your custom renderers

export function createClientConfig(config: AgentChatConfig): AgentChatConfig {
  return {
    ...config,
    toolRenderers: {
      // Map tool names to custom renderers
      list_files: ToolRenderer,
      // Add more custom renderers as needed
    }
  };
}
```

### 5. Use in React Component

```typescript
'use client';

import { useEffect, useState } from 'react';
import { AgentChat } from 'react-ai-agent-chat-sdk';
import 'react-ai-agent-chat-sdk/agent-chat.css';
import { agentChatConfig } from '@/lib/agent-config';
import { createClientConfig } from '@/lib/agent-chat-client-config';

export default function ChatPage() {
  const [conversationId, setConversationId] = useState<string>('');
  const clientConfig = createClientConfig(agentChatConfig);
  
  useEffect(() => {
    // Load or create conversation ID for persistence
    let id = localStorage.getItem('current-conversation-id');
    if (!id) {
      id = `conv_${crypto.randomUUID()}`;
      localStorage.setItem('current-conversation-id', id);
    }
    setConversationId(id);
  }, []);
  
  if (!conversationId) {
    return <div>Loading...</div>;
  }
  
  return (
    <AgentChat 
      config={clientConfig} 
      conversationId={conversationId} 
    />
  );
}
```

## Configurable API Routes

The library allows you to customize both the chat and history API endpoints to fit your application structure.

### Default Routes

By default, the library uses:
- **Chat route**: The route you specify (e.g., `/api/chat`)
- **History route**: Automatically derived as `{chatRoute}/history` (e.g., `/api/chat/history`)

### Custom Routes

You can specify custom routes when creating your configuration:

```typescript
const { agentChatConfig, agentChatRouteConfig } = makeAgentChatConfig(
  systemPrompt,
  "/api/my-custom-chat", // Custom chat route
  tools,
  authFunc,
  toolExecutionConfig,
  modelConfig,
  storage,
  "/api/my-custom-history" // Custom history route (optional)
);
```

### Route Configuration Options

```typescript
// Option 1: Use default history route pattern
const config1 = makeAgentChatConfig(
  systemPrompt,
  "/api/v1/chat", // History will be "/api/v1/chat/history"
  tools,
  authFunc
);

// Option 2: Specify both routes explicitly
const config2 = makeAgentChatConfig(
  systemPrompt,
  "/api/v1/agent", // Chat route
  tools,
  authFunc,
  undefined, // toolExecutionConfig
  undefined, // modelConfig
  undefined, // storage
  "/api/v1/agent-history" // Custom history route
);

// Option 3: Different API versions
const config3 = makeAgentChatConfig(
  systemPrompt,
  "/api/v2/chat",
  tools,
  authFunc,
  undefined,
  undefined,
  undefined,
  "/api/v1/history" // History on different version
);
```

### API Endpoints Setup

Create your API endpoints at the configured routes:

```typescript
// app/api/v1/chat/route.ts
import { chatRoute } from 'react-ai-agent-chat-sdk/api';
import { agentChatRouteConfig } from '@/lib/agent-config';

export async function POST(req: Request) {
  return chatRoute(agentChatRouteConfig, req);
}
```

```typescript
// app/api/v1/chat/history/route.ts (or your custom history route)
import { chatHistoryRoute } from 'react-ai-agent-chat-sdk/api';
import { agentChatRouteConfig } from '@/lib/agent-config';

export async function GET(req: Request) {
  return chatHistoryRoute(agentChatRouteConfig, req);
}
```

## Conversation Storage

The library supports persistent conversation storage through a flexible storage interface. Conversations are automatically restored when the page is refreshed, providing a seamless chat experience.

### Built-in Storage Options

#### Memory Storage (Development/Simple Use)

For development or simple applications, use the built-in `MemoryStorage`:

```typescript
import { MemoryStorage } from 'react-ai-agent-chat-sdk/storage';

// Server-side memory storage (conversations persist across requests but not server restarts)
const storage = new MemoryStorage();
```

#### Custom Storage Implementation

For production applications, implement the `ChatStorage` interface for your preferred storage solution:

```typescript
import { ChatStorage, ChatMessage, Conversation } from 'react-ai-agent-chat-sdk/config';

class MyStorage implements ChatStorage {
  async saveMessage(conversationId: string, message: ChatMessage): Promise<void> {
    // Save message to your database/storage
    await db.messages.create({
      conversation_id: conversationId,
      id: message.id,
      role: message.role,
      content: message.content,
      timestamp: message.timestamp,
      tool_calls: JSON.stringify(message.toolCalls),
      tool_results: JSON.stringify(message.toolResults),
    });
  }

  async getConversation(conversationId: string): Promise<Conversation | null> {
    // Retrieve conversation from your database/storage
    const messages = await db.messages.findMany({
      where: { conversation_id: conversationId },
      order: { timestamp: 'asc' }
    });

    if (messages.length === 0) return null;

    return {
      id: conversationId,
      messages: messages.map(m => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: m.timestamp,
        toolCalls: m.tool_calls ? JSON.parse(m.tool_calls) : undefined,
        toolResults: m.tool_results ? JSON.parse(m.tool_results) : undefined,
      })),
      createdAt: messages[0].timestamp,
      updatedAt: messages[messages.length - 1].timestamp,
    };
  }

  // Optional methods for conversation management
  async listConversations(limit = 50, offset = 0): Promise<Conversation[]> {
    // Implementation for listing conversations
  }

  async createConversation(conversationId: string, metadata?: Record<string, any>): Promise<Conversation> {
    // Implementation for creating conversations
  }

  async deleteConversation(conversationId: string): Promise<void> {
    // Implementation for deleting conversations
  }
}

const storage = new MyStorage();
```

### Storage Configuration

Add storage to your agent configuration:

```typescript
const { agentChatConfig, agentChatRouteConfig } = makeAgentChatConfig(
  systemPrompt,
  "/api/chat",
  tools,
  authFunc,
  toolExecutionConfig,
  modelConfig,
  storage // Add your storage instance here
);
```

### Conversation ID Management

For conversation persistence, you need to manage conversation IDs on the client side:

```typescript
'use client';

import { useEffect, useState } from 'react';
import { AgentChat } from 'react-ai-agent-chat-sdk';
import { agentChatConfig } from '@/lib/agent-config';
import { createClientConfig } from '@/lib/agent-chat-client-config';

export default function ChatPage() {
  const [conversationId, setConversationId] = useState<string>('');
  const clientConfig = createClientConfig(agentChatConfig);
  
  useEffect(() => {
    // Load or create conversation ID
    let id = localStorage.getItem('current-conversation-id');
    if (!id) {
      id = `conv_${crypto.randomUUID()}`;
      localStorage.setItem('current-conversation-id', id);
    }
    setConversationId(id);
  }, []);
  
  // Don't render until conversation ID is loaded
  if (!conversationId) {
    return <div>Loading...</div>;
  }
  
  return (
    <AgentChat 
      config={clientConfig} 
      conversationId={conversationId} 
    />
  );
}
```

### Chat History API

Create an API endpoint to retrieve conversation history:

```typescript
// app/api/chat/history/route.ts
import { chatHistoryRoute } from 'react-ai-agent-chat-sdk/api';
import { agentChatRouteConfig } from '@/lib/agent-config';

export async function GET(req: Request) {
  return chatHistoryRoute(agentChatRouteConfig, req);
}
```

**Usage:**
```bash
GET /api/chat/history?conversation_id=conv_123abc
```

**Response:**
```json
{
  "id": "conv_123abc",
  "messages": [
    {
      "id": "msg_1",
      "role": "user",
      "content": "Hello!",
      "timestamp": "2024-01-01T12:00:00Z"
    },
    {
      "id": "msg_2", 
      "role": "assistant",
      "content": "Hi there! How can I help you?",
      "timestamp": "2024-01-01T12:00:01Z",
      "toolCalls": [],
      "toolResults": []
    }
  ],
  "createdAt": "2024-01-01T12:00:00Z",
  "updatedAt": "2024-01-01T12:00:01Z"
}
```

### Complete Setup Example

Here's a complete example showing storage setup from configuration to usage:

```typescript
// lib/agent-config.ts
import { makeAgentChatConfig } from 'react-ai-agent-chat-sdk/config';
import { MemoryStorage } from 'react-ai-agent-chat-sdk/storage';
import { anthropic } from '@ai-sdk/anthropic';
import { tools } from './tools';

// Create storage instance
const storage = new MemoryStorage();

export const { agentChatConfig, agentChatRouteConfig } = makeAgentChatConfig(
  "You are a helpful assistant.",
  "/api/chat", // Configurable chat route
  tools,
  async () => true,
  { timeoutMs: 30000, retries: 3, retryDelayMs: 1000 },
  { model: anthropic('claude-sonnet-4-20250514') },
  storage, // Add storage here
  "/api/chat/history" // Optional: custom history route (defaults to /api/chat/history)
);
```

```typescript
// app/api/chat/route.ts
import { chatRoute } from 'react-ai-agent-chat-sdk/api';
import { agentChatRouteConfig } from '@/lib/agent-config';

export async function POST(req: Request) {
  return chatRoute(agentChatRouteConfig, req);
}
```

```typescript
// app/api/chat/history/route.ts
import { chatHistoryRoute } from 'react-ai-agent-chat-sdk/api';
import { agentChatRouteConfig } from '@/lib/agent-config';

export async function GET(req: Request) {
  return chatHistoryRoute(agentChatRouteConfig, req);
}
```

### Storage Considerations

#### Memory Storage Limitations
- **Development Only**: MemoryStorage is ideal for development and testing
- **Server Restarts**: Conversations are lost when the server restarts
- **Scaling**: Not suitable for multi-instance deployments

#### Production Storage Requirements
- **Persistent**: Use a database (PostgreSQL, MongoDB, etc.) for production
- **Concurrent Access**: Handle multiple users accessing conversations
- **Performance**: Index conversation_id and timestamp fields for fast queries

#### Conversation Restoration Flow
1. **Client loads**: Conversation ID is loaded from localStorage
2. **History request**: Client fetches conversation history via `/api/chat/history`
3. **Messages restored**: Previous messages are displayed in the chat interface
4. **New messages**: Subsequent messages are saved to the same conversation

#### Troubleshooting

**Messages not restored after page refresh:**
- Ensure `conversationId` prop is passed to `AgentChat` component
- Verify the chat history API endpoint is working: `GET /api/chat/history?conversation_id=your_id`
- Check browser console for any fetch errors

**Duplicate conversations:**
- Make sure conversation ID generation is consistent
- Use the same storage key across page loads: `'current-conversation-id'`

**Storage not working:**
- Verify storage instance is passed to `makeAgentChatConfig`
- Check that both chat and history API routes use the same `agentChatRouteConfig`

## Advanced Configuration

### Custom Tool Renderers

Create custom renderers for specific tools:

```typescript
import { ToolCall, ToolResult } from 'react-ai-agent-chat-sdk/config';

export function CustomFileRenderer({ toolCall, toolResult }: { 
  toolCall: ToolCall; 
  toolResult?: ToolResult 
}) {
  // Detect error states
  const hasError = toolResult?.output?.__toolError;
  const isTimeout = hasError && toolResult?.output?.__errorType === 'ToolTimeoutError';
  
  const getStatusText = () => {
    if (isTimeout) return 'Timed out';
    if (hasError) return 'Error';
    if (toolResult?.output) return 'Completed';
    return 'Running';
  };

  return (
    <div className={`custom-renderer ${hasError ? 'error' : ''}`}>
      <div>📁 {toolCall.toolName} - {getStatusText()}</div>
      {toolResult?.output && (
        <pre>{JSON.stringify(toolResult.output, null, 2)}</pre>
      )}
    </div>
  );
}
```

### Per-Tool Configuration

Configure timeouts and retries for individual tools:

```typescript
const tools = {
  slow_operation: createTool({
    description: 'A slow operation that needs longer timeout',
    display_name: "Processing data",
    inputSchema: z.object({}),
    execute: async () => {
      // Long-running operation
    },
    executionConfig: {
      timeoutMs: 60000, // 1 minute timeout
      retries: 1, // Only 1 retry
      retryDelayMs: 5000 // 5 second delay between retries
    }
  })
};
```

### Model Configuration

Use different AI models and providers:

```typescript
import { openai } from '@ai-sdk/openai';
import { messageCountIs } from 'ai';

const modelConfig = {
  model: openai('gpt-4o'), // Use OpenAI instead of Anthropic
  temperature: 0.7,
  stopWhen: messageCountIs(10), // Stop after 10 messages
  onStepFinish: (step) => {
    // Custom step logging
    if (step.toolCalls) {
      console.log(`Executed ${step.toolCalls.length} tools`);
    }
  }
};
```

## Component Architecture

### Built-in Components

The library provides several built-in components:

- **`AgentChat`** - Main chat interface
- **`ChatLayout`** - Layout wrapper with provider
- **`ChatInput`** - Message input component
- **`ChatMessage`** - Individual message component
- **`FunctionCallBlock`** - Default tool renderer
- **`ThinkingBubble`** - Loading indicator

### Custom Layout

Build custom layouts using the provider and individual components:

```typescript
import { 
  AgentChatProvider, 
  ChatInput, 
  ChatMessage, 
  useChatState 
} from 'react-ai-agent-chat-sdk';

function CustomChat({ config }: { config: AgentChatConfig }) {
  return (
    <AgentChatProvider config={config}>
      <div className="custom-chat-layout">
        <ChatHistory />
        <ChatInput />
      </div>
    </AgentChatProvider>
  );
}

function ChatHistory() {
  const { chatHelpers } = useChatState();
  
  return (
    <div className="messages">
      {chatHelpers.messages.map((message) => (
        <ChatMessage key={message.id} message={message} />
      ))}
    </div>
  );
}
```

## Error Handling

### Tool Error States

The library automatically handles and displays various error states:

- **Timeout**: When a tool exceeds its configured timeout
- **Retry Exhausted**: When a tool fails after all retry attempts
- **General Errors**: Any other tool execution errors

### Visual Indicators

Error states are shown with:
- Status text ("Timed out", "Failed after retries", "Error")
- Visual styling (red borders, error backgrounds)
- Detailed error messages in expandable sections

## API Reference

### Types

```typescript
interface ToolCall {
  toolCallId: string;
  toolName: string;
  input: any;
}

interface ToolResult {
  toolCallId: string;
  toolName: string;
  output?: any;
  result?: any;
  error?: string;
  isError?: boolean;
}

interface ToolExecutionConfig {
  timeoutMs: number;
  retries: number;
  retryDelayMs: number;
}

interface ModelConfig<TTools> {
  model: LanguageModel;
  temperature?: number;
  stopWhen?: StopCondition<TTools>;
  onStepFinish?: (step: StepResult<TTools>) => void;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
}

interface Conversation {
  id: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

interface ChatStorage {
  saveMessage(conversationId: string, message: ChatMessage): Promise<void>;
  getConversation(conversationId: string): Promise<Conversation | null>;
  listConversations?(limit?: number, offset?: number): Promise<Conversation[]>;
  createConversation?(conversationId: string, metadata?: Record<string, any>): Promise<Conversation>;
  deleteConversation?(conversationId: string): Promise<void>;
}

interface AgentChatConfig {
  tools: Record<string, { display_name: string; renderKey?: string }>;
  route: string;
  historyRoute?: string;
  toolRenderers?: Record<string, React.ComponentType<{ toolCall: ToolCall; toolResult?: ToolResult }>>;
  toolExecution?: ToolExecutionConfig;
}
```

### Classes

```typescript
class ChatRequest {
  readonly messages: any[];
  readonly conversation_id?: string;
  
  constructor(data: unknown) // Validates with Zod schema
  static async fromRequest(req: Request): Promise<ChatRequest>
}

class HistoryRequest {
  readonly conversation_id: string;
  
  constructor(data: unknown) // Validates with Zod schema
  static fromSearchParams(searchParams: URLSearchParams): HistoryRequest
}
```

### Functions

- **`createTool(config)`** - Create a typed tool with schema validation
- **`makeAgentChatConfig(systemPrompt, route, tools, authFunc, toolConfig?, modelConfig?, storage?, historyRoute?)`** - Create both client and route configurations with configurable API routes
- **`makeAgentChatClientConfig(route, tools, toolConfig?, historyRoute?)`** - Create client-only configuration with configurable routes
- **`makeAgentChatRouteConfig(systemPrompt, tools, authFunc, toolConfig?, modelConfig?, storage?)`** - Create route-only configuration (now accepts storage parameter)
- **`chatRoute(config, req)`** - Handle API requests with automatic validation
- **`streamMessage(config, chatRequest)`** - Process validated chat requests directly
- **`chatHistoryRoute(config, req)`** - Handle chat history retrieval requests
- **`getChatHistory(config, historyRequest)`** - Process validated history requests directly

#### Function Parameters

**`makeAgentChatConfig`**:
- `systemPrompt: string` - System prompt for the AI
- `route: string` - API route for chat endpoint (e.g., `/api/chat`)
- `tools: ToolsObject` - Tools available to the AI
- `authFunc: () => Promise<boolean>` - Authentication function
- `toolConfig?: Partial<ToolExecutionConfig>` - Global tool execution configuration
- `modelConfig?: ModelConfig<TTools>` - AI model configuration
- `storage?: ChatStorage` - Storage implementation for conversation persistence
- `historyRoute?: string` - Custom history route (defaults to `${route}/history`)

### Hooks

- **`useChatConfig()`** - Access chat configuration
- **`useChatState()`** - Access full chat state including loading states

## Contributing

This library is designed to be modular and extensible. When contributing:

1. Maintain type safety throughout
2. Follow existing patterns for tool creation
3. Test with both default and custom renderers
4. Ensure error states are properly handled

## License

MIT License

Copyright (c) 2024 SourceWizard

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
