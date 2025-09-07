'use client';

import { createContext, useContext, ReactNode, useEffect, useState, useMemo } from 'react';
import { useChat, UIMessage } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { AgentChatConfig } from './config';
import { registerToolRenderer } from './tool-renderer-registry';
import { ChatMessage } from './config';

interface AgentChatState {
  config: AgentChatConfig;
  chatHelpers: any;
  conversationId: string;
  input: string;
  setInput: (input: string) => void;
  isThinking: boolean;
  setIsThinking: (isThinking: boolean) => void;
  isProcessingTools: boolean;
  setIsProcessingTools: (isProcessingTools: boolean) => void;
  currentTool: string | null;
  setCurrentTool: (currentTool: string | null) => void;
  handleSubmit: (e: React.FormEvent) => void;
  isLoadingHistory: boolean;
  restoredMessages: UIMessage[];
  allMessages: UIMessage[];
}

const AgentChatContext = createContext<AgentChatState | null>(null);

interface AgentChatProviderProps {
  config: AgentChatConfig;
  conversationId: string;
  children: ReactNode;
}

export const AgentChatProvider = ({ config, conversationId, children }: AgentChatProviderProps) => {
  const [initialMessages, setInitialMessages] = useState<UIMessage[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [chatKey, setChatKey] = useState(0);

  // Load conversation history when conversation ID is available
  useEffect(() => {
    if (!conversationId) {
      setIsLoadingHistory(false);
      return;
    }

    let cancelled = false;
    const loadConversationHistory = async () => {
      try {
        // Call the chat history API endpoint
        const historyRoute = config.historyRoute || `${config.route}/history`;
        const url = new URL(historyRoute, window.location.origin);
        url.searchParams.set('conversation_id', conversationId);
        const response = await fetch(url.toString());

        if (response.ok) {
          const conversation = await response.json();
          if (conversation && conversation.messages && conversation.messages.length > 0) {
            // Convert ChatMessage[] to UIMessage[] format expected by AI SDK
            const aiMessages: UIMessage[] = conversation.messages.map((msg: ChatMessage) => {
              // If we have native UI message parts, use them directly (new format)
              if (msg.uiMessageParts && msg.uiMessageParts.length > 0) {
                console.log(`🔄 Using native UIMessage parts for message ${msg.id}:`, {
                  partsCount: msg.uiMessageParts.length,
                  partTypes: msg.uiMessageParts.map(p => p.type)
                });

                return {
                  id: msg.id,
                  role: msg.role as 'user' | 'assistant' | 'system',
                  parts: msg.uiMessageParts,
                };
              }

              // Backwards compatibility: Convert old format to UIMessage parts
              console.log(`🔄 Converting legacy format for message ${msg.id}`);

              // Handle case where content might be a JSON string containing the full message
              let textContent = msg.content;
              try {
                const parsedContent = JSON.parse(msg.content);
                if (parsedContent.parts && Array.isArray(parsedContent.parts)) {
                  // Extract text from parts
                  textContent = parsedContent.parts
                    .filter((part: any) => part.type === 'text')
                    .map((part: any) => part.text)
                    .join('');
                } else if (typeof parsedContent === 'string') {
                  textContent = parsedContent;
                }
              } catch {
                // If it's not JSON, use as-is
                textContent = msg.content;
              }

              // Build parts array using AI SDK's native format
              const parts: any[] = [];

              // Add text content first if present
              if (textContent && textContent.trim()) {
                parts.push({
                  type: 'text',
                  text: textContent,
                  state: 'done'
                });
              }

              // Add tool parts using AI SDK's native ToolUIPart format
              if (msg.toolCalls && msg.toolCalls.length > 0) {
                for (const toolCall of msg.toolCalls) {
                  // Find corresponding tool result
                  const correspondingResult = msg.toolResults?.find(
                    result => result.toolCallId === toolCall.toolCallId
                  );

                  // Create native AI SDK tool part
                  const toolPart: any = {
                    type: `tool-${toolCall.toolName}`,
                    toolCallId: toolCall.toolCallId,
                    input: toolCall.input,
                  };

                  // Set state and output based on whether we have a result
                  if (correspondingResult) {
                    if (correspondingResult.isError) {
                      toolPart.state = 'output-error';
                      toolPart.errorText = correspondingResult.error || 'Tool execution failed';
                    } else {
                      toolPart.state = 'output-available';
                      toolPart.output = correspondingResult.output;
                    }
                  } else {
                    toolPart.state = 'input-available';
                  }

                  parts.push(toolPart);
                }
              }

              return {
                id: msg.id,
                role: msg.role as 'user' | 'assistant' | 'system',
                parts: parts.length > 0 ? parts : [{ type: 'text', text: textContent || '', state: 'done' }],
              };
            });

            if (!cancelled) {
              setInitialMessages(aiMessages);
              setChatKey(prev => prev + 1); // Force useChat to reinitialize
              console.log(`✅ Restored ${aiMessages.length} messages for conversation ${conversationId}`);
              console.log('🔄 Restored messages details:', aiMessages.map(msg => ({
                id: msg.id,
                role: msg.role,
                partsCount: msg.parts.length,
                partTypes: msg.parts.map(p => p.type),
                hasToolParts: msg.parts.some(p => p.type.startsWith('tool-')),
                toolParts: msg.parts
                  .filter(p => p.type.startsWith('tool-'))
                  .map(p => ({
                    type: p.type,
                    state: (p as any).state,
                    hasOutput: !!(p as any).output,
                    hasInput: !!(p as any).input
                  }))
              })));
            }
          }
        } else if (response.status === 404) {
          // Conversation doesn't exist yet, that's fine
          console.log(`No existing conversation found for ${conversationId}`);
        } else {
          console.error('Failed to load conversation history:', response.statusText);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to load conversation history:', error);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingHistory(false);
        }
      }
    };

    loadConversationHistory();

    return () => {
      cancelled = true;
    };
  }, [conversationId]);

  // Create transport with conversation ID
  const transport = useMemo(() => {
    console.log('🌐 [Client] Creating transport with conversation_id:', conversationId);
    return new DefaultChatTransport({
      api: config.route,
      prepareSendMessagesRequest: (options) => {
        console.log('🌐 [Client] prepareSendMessagesRequest: using conversationId =', conversationId);

        // Build the complete request body with all required fields
        const requestBody = {
          id: options.id,
          messages: options.messages,
          trigger: options.trigger,
          messageId: options.messageId,
          ...options.body, // Include any additional body fields
          conversation_id: conversationId, // Add our custom field
        };

        console.log('🌐 [Client] Final request body with conversation_id:', conversationId);

        return {
          body: requestBody,
        };
      },
    });
  }, [config.route]); // Remove conversationId dependency since it's captured in closure

  const chatOptions = useMemo(() => {
    return {
      id: conversationId,
      messages: initialMessages,
      transport,
    };
  }, [initialMessages, transport, chatKey]);

  const chatHelpers = useChat(chatOptions);

  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [isProcessingTools, setIsProcessingTools] = useState(false);
  const [currentTool, setCurrentTool] = useState<string | null>(null);

  useEffect(() => {
    // Register tool renderers passed from client-side config
    if (config.toolRenderers) {
      Object.entries(config.toolRenderers).forEach(([toolName, renderer]) => {
        registerToolRenderer(toolName, renderer);
      });
    }
  }, []); // Only run once on mount since config doesn't change

  // Monitor messages for completion and tool processing
  useEffect(() => {
    const lastMessage = chatHelpers.messages[chatHelpers.messages.length - 1];
    const isLoading = chatHelpers.status !== 'ready';

    if (isLoading && lastMessage?.role === 'assistant') {
      // Check if this message contains tool calls
      const toolParts = lastMessage.parts.filter((part: any) => part.type.startsWith('tool-'));
      const hasToolCalls = toolParts.length > 0;
      const hasTextParts = lastMessage.parts.some((part: any) => part.type === 'text');

      if (hasToolCalls && !hasTextParts) {
        // Only tool calls, no text yet - processing tools
        const latestToolPart = toolParts[toolParts.length - 1];
        if (latestToolPart) {
          const toolName = latestToolPart.type.replace('tool-', '');
          setCurrentTool(prev => prev !== toolName ? toolName : prev);
          setIsProcessingTools(prev => prev !== true ? true : prev);
          setIsThinking(prev => prev !== false ? false : prev);
        }
      } else if (hasTextParts) {
        // Has text response - thinking (generating text)
        setIsThinking(prev => prev !== true ? true : prev);
        setIsProcessingTools(prev => prev !== false ? false : prev);
        setCurrentTool(prev => prev !== null ? null : prev);
      }
    } else if (isLoading) {
      // No assistant message yet or user message - thinking
      setIsThinking(prev => prev !== true ? true : prev);
      setIsProcessingTools(prev => prev !== false ? false : prev);
      setCurrentTool(prev => prev !== null ? null : prev);
    } else {
      // Chat is not loading - conversation finished
      setIsThinking(prev => prev !== false ? false : prev);
      setIsProcessingTools(prev => prev !== false ? false : prev);
      setCurrentTool(prev => prev !== null ? null : prev);
    }
  }, [chatHelpers.messages, chatHelpers.status]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && conversationId && !isLoadingHistory) {
      // Don't manually set isThinking - let the effect handle it
      try {
        chatHelpers.sendMessage({
          text: input,
        });
        setInput('');
      } catch (error) {
        console.error('ERROR calling append:', error);
      }
    }
  };

  // Combine restored messages with current chat messages
  const currentMessages = chatHelpers.messages.filter((msg: any) =>
    !initialMessages.some(restored => restored.id === msg.id)
  );
  const allMessages = [...initialMessages, ...currentMessages];

  const state: AgentChatState = {
    config,
    chatHelpers,
    conversationId,
    input,
    setInput,
    isThinking,
    setIsThinking,
    isProcessingTools,
    setIsProcessingTools,
    currentTool,
    setCurrentTool,
    handleSubmit,
    isLoadingHistory,
    restoredMessages: initialMessages,
    allMessages,
  };

  // Show loading state while history is being loaded
  if (isLoadingHistory) {
    return (
      <div className="flex items-center justify-center py-8 text-gray-500">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
          <span className="text-sm">Loading conversation history...</span>
        </div>
      </div>
    );
  }

  return (
    <AgentChatContext.Provider value={state}>
      {children}
    </AgentChatContext.Provider>
  );
};

export const useChatConfig = () => {
  const state = useContext(AgentChatContext);
  if (!state) {
    throw new Error('useChatConfig must be used within an AgentChatProvider');
  }
  return state.config;
};

export const useChatState = () => {
  const state = useContext(AgentChatContext);
  if (!state) {
    throw new Error('useChatState must be used within an AgentChatProvider');
  }
  return state;
};
