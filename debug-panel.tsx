import { useChatState } from './chat-config-provider';

interface DebugPanelProps {
  disabled?: boolean;
}

export const DebugPanel = ({ disabled = false }: DebugPanelProps) => {
  const { chatHelpers, isThinking, isProcessingTools, currentTool } = useChatState();
  const { status, error } = chatHelpers;
  const messagesCount = chatHelpers.messages.length;
  const toolStatus = isProcessingTools && currentTool ? `${currentTool}` : isProcessingTools.toString();
  
  return (
    <div className="debug-panel">
      Status: {status} | Thinking: {isThinking.toString()} | Processing Tools: {toolStatus} | Messages: {messagesCount}
      {error && (
        <div className="debug-panel-error">
          Error: {error.message || 'Unknown error'}
        </div>
      )}
    </div>
  );
};
