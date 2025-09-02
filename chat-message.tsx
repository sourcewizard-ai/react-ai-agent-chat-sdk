import { MessagePart } from './message-part';
import { useChatConfig, useChatState } from './chat-config-provider';
import { ThinkingBubble } from './thinking-bubble';

interface ChatMessageProps {
  message: any;
  messageIndex: number;
  isLastMessage?: boolean;
}

export const ChatMessage = ({ 
  message, 
  messageIndex, 
  isLastMessage
}: ChatMessageProps) => {
  const { tools } = useChatConfig();
  const { isThinking, isProcessingTools } = useChatState();
  
  // Check if this is the last assistant message and if we should show thinking/processing
  const isAssistant = message.role === 'assistant';
  const shouldShowThinking = isAssistant && isLastMessage && (isThinking || isProcessingTools);
  
  return (
    <div className="chat-message">
      <div
        className={`chat-message-content ${
          message.role === 'user' ? 'chat-message-user' : 'chat-message-assistant'
        }`}
      >
        {/* Render all parts in execution order */}
        <div className="chat-message-parts">
          {message.parts.map((part: any, partIndex: number) => (
            <MessagePart key={partIndex} part={part} partIndex={partIndex} messageRole={message.role} />
          ))}
          
          {/* Show thinking bubble if this is the last assistant message and we're thinking/processing */}
          {shouldShowThinking && (
            <div className="chat-message-thinking">
              <ThinkingBubble />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
