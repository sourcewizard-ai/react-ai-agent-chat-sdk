import { z } from 'zod';
import { ToolExecutionConfig } from './tool-execution';

export interface ToolCall {
  toolCallId: string;
  toolName: string;
  input: any;
}

export interface ToolResult {
  toolCallId: string;
  toolName: string;
  output?: any;
  error?: string;
  isError?: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
  uiMessageParts?: any[]; // Native AI SDK UIMessagePart format
}

export interface Conversation {
  id: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

export interface Tool<TSchema extends z.ZodSchema = z.ZodSchema> {
  description: string;
  display_name: string;
  inputSchema: TSchema;
  execute: (input: z.infer<TSchema>) => Promise<any>;
  render?: React.ComponentType<{ toolCall: ToolCall; toolResult?: ToolResult }>;
  executionConfig?: Partial<ToolExecutionConfig>;
}

// Helper function to create a typed tool with automatic schema inference (client version with render support)
export function createTool<TSchema extends z.ZodSchema>(config: {
  description: string;
  display_name: string;
  inputSchema: TSchema;
  execute: (input: z.infer<TSchema>) => Promise<any>;
  render?: React.ComponentType<{ toolCall: ToolCall; toolResult?: ToolResult }>;
  executionConfig?: Partial<ToolExecutionConfig>;
}): Tool<TSchema> {
  return config;
}

export interface ToolsObject {
  [key: string]: Tool<any>;
}

// Helper to safely check if we're in development mode
function isDevMode(): boolean {
  try {
    // Check for environment variables in various ways
    const nodeEnv = (globalThis as any).process?.env?.NODE_ENV || 
                    (globalThis as any).__NODE_ENV__ || 
                    (globalThis as any).__DEV__;
    return nodeEnv === 'development' || nodeEnv === true;
  } catch {
    return false;
  }
}

export interface AgentChatConfig {
  tools: Record<string, { display_name: string; renderKey?: string }>;
  route: string;
  historyRoute?: string;
  toolRenderers?: Record<string, React.ComponentType<{ toolCall: ToolCall; toolResult?: ToolResult }>>;
  toolExecution?: ToolExecutionConfig;
  showDebugPanel?: boolean; // Show debug panel (defaults to NODE_ENV === 'development')
}

const DEFAULT_TOOL_EXECUTION_CONFIG: ToolExecutionConfig = {
  timeoutMs: 30000, // 30 seconds
  retries: 3,
  retryDelayMs: 1000, // 1 second initial delay
};

export function makeAgentChatClientConfig<TTools extends ToolsObject>({
  route,
  tools,
  toolExecutionConfig,
  historyRoute,
  showDebugPanel
}: {
  route: string;
  tools: TTools;
  toolExecutionConfig?: Partial<ToolExecutionConfig>;
  historyRoute?: string;
  showDebugPanel?: boolean;
}): AgentChatConfig {
  const finalExecutionConfig = { ...DEFAULT_TOOL_EXECUTION_CONFIG, ...toolExecutionConfig };
  
  const toolsMap = Object.keys(tools).reduce((acc: Record<string, any>, toolName: string) => ({
    ...acc, [toolName]: {
      display_name: tools[toolName].display_name,
      renderKey: tools[toolName].render ? toolName : undefined,
    }
  }), {} as Record<string, { display_name: string; renderKey?: string }>);
  
  return {
    tools: toolsMap,
    route,
    historyRoute: historyRoute || `${route}/history`,
    toolExecution: finalExecutionConfig,
    showDebugPanel: showDebugPanel ?? isDevMode(), // Default to development mode detection
    // toolRenderers should be added separately on client-side
  };
}

export function makeAgentChatConfig<TTools extends ToolsObject>({
  system_prompt,
  route,
  tools,
  auth_func,
  toolExecutionConfig,
  modelConfig,
  storage,
  historyRoute,
  showDebugPanel
}: {
  system_prompt: string;
  route: string;
  tools: TTools;
  auth_func: () => Promise<boolean>;
  toolExecutionConfig?: Partial<ToolExecutionConfig>;
  modelConfig?: any;
  storage?: any;
  historyRoute?: string;
  showDebugPanel?: boolean;
}): { agentChatConfig: AgentChatConfig } {
  return {
    agentChatConfig: makeAgentChatClientConfig({ route, tools, toolExecutionConfig, historyRoute, showDebugPanel })
  };
}