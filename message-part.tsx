import { marked } from 'marked';
import { FunctionCallBlock } from './function-call-block';

interface MessagePartProps {
  part: any;
  partIndex: number;
  messageRole: string;
}

export const MessagePart = ({ part, partIndex, messageRole }: MessagePartProps) => {
  if (part.type === 'text') {
    // Only apply markdown rendering for assistant messages
    if (messageRole === 'assistant') {
      const html = marked.parse(part.text);
      return (
        <div
          key={partIndex}
          className="message-part-markdown"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      );
    } else {
      // For user messages, render as plain text
      return (
        <div key={partIndex}>
          {part.text}
        </div>
      );
    }
  }

  if (part.type.startsWith('tool-') && part.toolCallId) {
    // Render tool call block
    const toolCall = {
      toolCallId: part.toolCallId,
      toolName: part.type.replace('tool-', ''),
      input: part.input,
    };

    const toolResult = {
      toolCallId: part.toolCallId,
      toolName: part.type.replace('tool-', ''),
      output: part.output,
      error: part.error || null,
      isError: part.isError || false,
    };

    return (
      <FunctionCallBlock
        key={partIndex}
        toolCall={toolCall}
        toolResult={toolResult}
      />
    );
  }

  if (part.type === 'step-start') {
    // Skip step indicators
    return null;
  }

  // Skip any other part types
  return null;
};
