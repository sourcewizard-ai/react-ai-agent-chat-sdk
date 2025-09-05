import { z } from 'zod';
import type { LanguageModel, StepResult, StopCondition } from 'ai';
import { executeWithRetry, ToolExecutionConfig } from './tool-execution';

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

export interface ChatStorage {
  // Save a message to a conversation
  saveMessage(conversationId: string, message: ChatMessage): Promise<void>;
  
  // Get conversation history
  getConversation(conversationId: string): Promise<Conversation | null>;
  
  // List conversations (optional, for conversation management)
  listConversations?(limit?: number, offset?: number): Promise<Conversation[]>;
  
  // Create a new conversation
  createConversation?(conversationId: string, metadata?: Record<string, any>): Promise<Conversation>;
  
  // Delete a conversation (optional)
  deleteConversation?(conversationId: string): Promise<void>;
}

export interface Tool<TSchema extends z.ZodSchema = z.ZodSchema> {
  description: string;
  display_name: string;
  inputSchema: TSchema;
  execute: (input: z.infer<TSchema>) => Promise<any>;
  executionConfig?: Partial<ToolExecutionConfig>;
}

// Helper function to create a typed tool with automatic schema inference
export function createTool<TSchema extends z.ZodSchema>(config: {
  description: string;
  display_name: string;
  inputSchema: TSchema;
  execute: (input: z.infer<TSchema>) => Promise<any>;
  executionConfig?: Partial<ToolExecutionConfig>;
}): Tool<TSchema> {
  return config;
}

// Helper function to wrap tool execution with timeout/retry
export function wrapToolWithTimeoutRetry<TSchema extends z.ZodSchema>(
  tool: Tool<TSchema>,
  toolName: string,
  globalExecutionConfig: ToolExecutionConfig
): Tool<TSchema> {
  // Merge global config with per-tool config, per-tool takes priority
  const finalExecutionConfig = { ...globalExecutionConfig, ...tool.executionConfig };
  
  return {
    ...tool,
    execute: async (input: z.infer<TSchema>) => {
      try {
        return await executeWithRetry(
          () => tool.execute(input),
          finalExecutionConfig,
          toolName
        );
      } catch (error) {
        // Return error information as part of the result so it reaches the UI
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorType = error instanceof Error ? error.constructor.name : 'Error';
        
        console.error(`🚨 Tool ${toolName} failed, returning error result:`, errorMessage);
        
        return {
          __toolError: true,
          __errorType: errorType,
          __errorMessage: errorMessage,
          error: errorMessage,
          success: false
        } as any;
      }
    }
  };
}

export interface ToolsObject {
  [key: string]: Tool<any>;
}

export interface ModelConfig<TTools extends Record<string, any>> {
  model: LanguageModel;
  temperature?: number;
  stopWhen?: StopCondition<TTools>;
  onStepFinish?: (step: StepResult<TTools>) => void;
}

export interface AgentChatRouteConfig<TTools extends Record<string, any> = Record<string, any>> {
  tools: TTools;
  system_prompt: string;
  auth_func: () => Promise<boolean>;
  model?: ModelConfig<TTools>;
  storage?: ChatStorage;
}

const DEFAULT_TOOL_EXECUTION_CONFIG: ToolExecutionConfig = {
  timeoutMs: 30000, // 30 seconds
  retries: 3,
  retryDelayMs: 1000, // 1 second initial delay
};

export function makeAgentChatRouteConfig<TTools extends ToolsObject>({
  system_prompt,
  tools,
  auth_func,
  toolExecutionConfig,
  modelConfig,
  storage
}: {
  system_prompt: string;
  tools: TTools;
  auth_func: () => Promise<boolean>;
  toolExecutionConfig?: Partial<ToolExecutionConfig>;
  modelConfig?: ModelConfig<TTools>;
  storage?: ChatStorage;
}): AgentChatRouteConfig<TTools> {
  const finalExecutionConfig = { ...DEFAULT_TOOL_EXECUTION_CONFIG, ...toolExecutionConfig };
  
  // Wrap tools with timeout/retry logic
  const wrappedTools = Object.keys(tools).reduce((acc: TTools, toolName: string) => ({
    ...acc,
    [toolName]: wrapToolWithTimeoutRetry(tools[toolName], toolName, finalExecutionConfig)
  }), {} as TTools);
  
  return {
    tools: wrappedTools,
    system_prompt,
    auth_func,
    model: modelConfig,
    storage,
  };
}