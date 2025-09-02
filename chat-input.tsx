import { useChatState } from './chat-config-provider';

interface ChatInputProps {
  disabled?: boolean;
}

export const ChatInput = ({ disabled = false }: ChatInputProps) => {
  const { input, setInput, handleSubmit, isLoadingHistory, conversationId } = useChatState();
  
  // Disable input while loading history or if no conversation ID
  const isDisabled = disabled || isLoadingHistory || !conversationId;
  
  return (
    <form onSubmit={handleSubmit} className="chat-input-form">
      <input
        className="chat-input-field"
        value={input}
        placeholder={isLoadingHistory ? "Loading conversation..." : "Type your message..."}
        onChange={(e) => setInput(e.target.value)}
        disabled={isDisabled}
      />
      <button
        type="submit"
        className="chat-input-button"
        disabled={!input.trim() || isDisabled}
      >
        Send
      </button>
    </form>
  );
};
