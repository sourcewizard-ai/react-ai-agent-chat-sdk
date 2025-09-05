export function ToolRenderer({ toolCall, toolResult }) {
  // Detect error states from tool wrapper
  const hasError = toolResult?.output?.__toolError;
  const isTimeout = hasError && toolResult?.output?.__errorType === 'ToolTimeoutError';
  const isRetryExhausted = hasError && toolResult?.output?.__errorType === 'ToolRetryExhaustedError';

  const getStatusText = () => {
    if (isTimeout) return 'Timed out';
    if (isRetryExhausted) return 'Failed after retries';
    if (hasError) return 'Error';
    if (toolResult && !hasError && toolResult.output) return 'Completed';
    return 'Running';
  };

  return (
    <div className={`tool-renderer ${hasError ? 'tool-renderer-error' : ''}`}>
      <div className="tool-renderer-title">
        • Custom Renderer: {toolCall.toolName} - {getStatusText()}
      </div>
      {toolResult && (
        <pre className="tool-renderer-content">
          {hasError
            ? toolResult.output?.error || 'Unknown error occurred'
            : JSON.stringify(toolResult.output, null, 2)
          }
        </pre>
      )}
    </div>
  );
}