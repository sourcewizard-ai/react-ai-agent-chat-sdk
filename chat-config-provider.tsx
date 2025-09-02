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
        const response = await fetch(`${historyRoute}?conversation_id=${encodeURIComponent(conversationId)}`);

        if (response.ok) {
          const conversation = await response.json();
          if (conversation && conversation.messages && conversation.messages.length > 0) {
            // Convert ChatMessage[] to UIMessage[] format expected by AI SDK
            const aiMessages: UIMessage[] = conversation.messages.map((msg: ChatMessage) => {
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
              
              return {
                id: msg.id,
                role: msg.role as 'user' | 'assistant' | 'system',
                parts: [{ type: 'text', text: textContent }],
              };
            });
            
            if (!cancelled) {
              setInitialMessages(aiMessages);
              console.log(`✅ Restored ${aiMessages.length} messages for conversation ${conversationId}`);
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
  }, [conversationId, config.route]);

  const chatOptions = useMemo(() => {
    // Create a unique ID based on whether we have messages or not
    // This forces useChat to recreate when messages are loaded
    const chatId = initialMessages.length > 0 ? `${conversationId}-with-history` : `${conversationId}-empty`;
    return {
      id: chatId,
      messages: initialMessages,
      transport,
    };
  }, [initialMessages, transport, conversationId]);

  const chatHelpers = useChat(chatOptions);
  
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [isProcessingTools, setIsProcessingTools] = useState(false);
  const [currentTool, setCurrentTool] = useState<string | null>(null);

  useEffect(() => {
    // Register tool renderers passed from client-side config
    if (config.toolRenderers) {
      Object.keys(config.toolRenderers).forEach(toolName => {
        registerToolRenderer(toolName, config.toolRenderers![toolName]);
      });
    }
  }, [config.toolRenderers]);

  // Monitor messages for completion and tool processing
  useEffect(() => {
    const lastMessage = chatHelpers.messages[chatHelpers.messages.length - 1];

    // Reset states based on chat status
    const isLoading = chatHelpers.status !== 'ready';
    if (isLoading) {
      // Chat is active, check what's happening
      if (lastMessage && lastMessage.role === 'assistant') {
        // Check if this message contains tool calls
        const toolParts = lastMessage.parts.filter((part: any) => part.type.startsWith('tool-'));
        const hasToolCalls = toolParts.length > 0;
        const hasTextParts = lastMessage.parts.some((part: any) => part.type === 'text');

        if (hasToolCalls && !hasTextParts) {
          // Only tool calls, no text yet - processing tools
          const latestToolPart = toolParts[toolParts.length - 1];
          if (latestToolPart) {
            const toolName = latestToolPart.type.replace('tool-', '');
            setCurrentTool(toolName);
            setIsProcessingTools(true);
            setIsThinking(false);
          }
        } else if (hasTextParts) {
          // Has text response - thinking (generating text)
          setIsThinking(true);
          setIsProcessingTools(false);
          setCurrentTool(null);
        }
      } else {
        // No assistant message yet or user message - thinking
        setIsThinking(true);
        setIsProcessingTools(false);
        setCurrentTool(null);
      }
    } else {
      // Chat is not loading - conversation finished
      setIsThinking(false);
      setIsProcessingTools(false);
      setCurrentTool(null);
    }
  }, [chatHelpers.messages, chatHelpers.status]); // Remove setter dependencies

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && conversationId && !isLoadingHistory) {
      setIsThinking(true);
      try {
        chatHelpers.sendMessage({
          text: input,
        });
      } catch (error) {
        console.error('ERROR calling append:', error);
      }
      setInput('');
    }
  };

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
