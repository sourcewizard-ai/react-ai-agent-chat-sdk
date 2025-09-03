import { streamText, convertToModelMessages, smoothStream, stepCountIs, type StepResult } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';
import { AgentChatRouteConfig } from './config';

const chatRequestSchema = z.object({
  messages: z.array(z.any()), // AI SDK message format
  conversation_id: z.string().optional(),
  metadata: z.any().optional(), // For extracting conversation_id from client
  data: z.any().optional(), // For data sent via useChat append
});

export class ChatRequest {
  public readonly messages: any[];
  public readonly conversation_id?: string;

  constructor(data: unknown) {
    const parsed = chatRequestSchema.parse(data);
    this.messages = parsed.messages;
    
    // Extract conversation_id from multiple possible locations
    this.conversation_id = parsed.conversation_id || 
                          parsed.metadata?.conversation_id || 
                          parsed.data?.conversation_id;
  }

  static async fromRequest(req: Request): Promise<ChatRequest> {
    try {
      const body = await req.json();
      return new ChatRequest(body);
    } catch (error) {
      throw new Error(`Invalid request body: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export async function streamMessage<TTools extends Record<string, any>>(config: AgentChatRouteConfig<TTools>, chatRequest: ChatRequest) {
  const is_authenticated = await config.auth_func()
  if (!is_authenticated) {
    console.error('ERROR not authenticated');
    return new Response('Unauthorized', { status: 401 });
  }
  
  // Save user message to storage if conversation_id is provided
  if (config.storage && chatRequest.conversation_id && chatRequest.messages.length > 0) {
    try {
      const lastMessage = chatRequest.messages[chatRequest.messages.length - 1];
      if (lastMessage.role === 'user') {
        await config.storage.saveMessage(chatRequest.conversation_id, {
          id: crypto.randomUUID(),
          role: lastMessage.role,
          content: lastMessage.content || JSON.stringify(lastMessage),
          timestamp: new Date(),
        });
      }
    } catch (error) {
      console.error('Failed to save user message:', error);
      // Don't fail the request if storage fails
    }
  }

  try {
    const convertedMessages = convertToModelMessages(chatRequest.messages);

    const result = streamText({
      model: config.model?.model || anthropic('claude-sonnet-4-20250514'),
      messages: convertedMessages,
      system: config.system_prompt,
      toolChoice: 'auto',
      temperature: config.model?.temperature || 0.3,
      experimental_transform: smoothStream({ chunking: 'word', delayInMs: 20 }),
      stopWhen: config.model?.stopWhen || stepCountIs(5),
      onStepFinish: config.model?.onStepFinish,
      tools: config.tools,
    });
    const response = result.toUIMessageStreamResponse({
      onFinish: ({ messages }) => {
        // Save messages using the native UIMessage format from AI SDK
        if (config.storage && chatRequest.conversation_id && messages && messages.length > 0) {
          const lastMessage = messages[messages.length - 1];
          if (lastMessage.role === 'assistant') {
            console.log('💾 Saving assistant message using AI SDK native format:', {
              messageId: lastMessage.id,
              partsCount: lastMessage.parts.length,
              partTypes: lastMessage.parts.map(p => p.type),
              hasToolParts: lastMessage.parts.some(p => p.type.startsWith('tool-')),
            });

            // Convert UIMessage to our storage format  
            config.storage.saveMessage(chatRequest.conversation_id, {
              id: lastMessage.id,
              role: lastMessage.role,
              content: lastMessage.parts
                .filter(part => part.type === 'text')
                .map(part => (part as any).text)
                .join(''),
              timestamp: new Date(),
              uiMessageParts: lastMessage.parts, // Store the native AI SDK parts
            }).catch(error => {
              console.error('Failed to save assistant message:', error);
            });
          }
        }
      }
    });

    // Consume the stream to ensure message isn't lost on page refresh
    result.consumeStream({
      onError: (error) => {
        console.error('❌ Stream consumption error:', error);
      }
    });

    return response;
  } catch (error) {
    console.error('❌ ERROR in chat handler:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

export async function chatRoute<TTools extends Record<string, any>>(config: AgentChatRouteConfig<TTools>, req: Request) {
  try {
    const chatRequest = await ChatRequest.fromRequest(req);
    return await streamMessage(config, chatRequest);
  } catch (error) {
    console.error('❌ ERROR parsing request:', error);
    return new Response('Bad Request', { status: 400 });
  }
}

const historyRequestSchema = z.object({
  conversation_id: z.string(),
});

export class HistoryRequest {
  public readonly conversation_id: string;

  constructor(data: unknown) {
    const parsed = historyRequestSchema.parse(data);
    this.conversation_id = parsed.conversation_id;
  }

  static fromSearchParams(searchParams: URLSearchParams): HistoryRequest {
    const conversation_id = searchParams.get('conversation_id');
    return new HistoryRequest({ conversation_id });
  }
}

export async function getChatHistory<TTools extends Record<string, any>>(
  config: AgentChatRouteConfig<TTools>, 
  historyRequest: HistoryRequest
): Promise<Response> {
  // Check authentication
  const is_authenticated = await config.auth_func();
  if (!is_authenticated) {
    console.error('ERROR not authenticated');
    return new Response('Unauthorized', { status: 401 });
  }

  // Check if storage is configured
  if (!config.storage) {
    return new Response('Chat history not available - storage not configured', { status: 501 });
  }

  try {
    const conversation = await config.storage.getConversation(historyRequest.conversation_id);
    
    if (!conversation) {
      return new Response('Conversation not found', { status: 404 });
    }

    return new Response(JSON.stringify(conversation), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('❌ ERROR fetching chat history:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

export async function chatHistoryRoute<TTools extends Record<string, any>>(config: AgentChatRouteConfig<TTools>, req: Request) {
  try {
    const url = new URL(req.url);
    const historyRequest = HistoryRequest.fromSearchParams(url.searchParams);
    return await getChatHistory(config, historyRequest);
  } catch (error) {
    console.error('❌ ERROR parsing history request:', error);
    return new Response('Bad Request', { status: 400 });
  }
}
