'use client';

import { useState } from 'react';
import { useChatConfig } from './chat-config-provider';
import { getToolRenderer, hasCustomRenderer as hasCustomRendererFn } from './tool-renderer-registry';
import { ToolCall, ToolResult } from './config';

interface FunctionCallBlockProps {
  toolCall: ToolCall;
  toolResult?: ToolResult;
}

export const FunctionCallBlock = ({ toolCall, toolResult }: FunctionCallBlockProps) => {
  const { tools } = useChatConfig();

  // Check if tool has a custom renderer - let it handle all states including errors
  if (toolCall.toolName in tools && tools[toolCall.toolName].renderKey) {
    const renderKey = tools[toolCall.toolName].renderKey;

    if (renderKey && hasCustomRendererFn(renderKey)) {
      const CustomRenderer = getToolRenderer(renderKey);
      return <CustomRenderer toolCall={toolCall} toolResult={toolResult} />;
    }
  }

  const [isExpanded, setIsExpanded] = useState(false);

  // Detect error states from tool wrapper
  const hasError = toolResult?.output?.__toolError;
  const isTimeout = hasError && toolResult?.output?.__errorType === 'ToolTimeoutError';
  const isRetryExhausted = hasError && toolResult?.output?.__errorType === 'ToolRetryExhaustedError';
  const isSuccess = toolResult && !hasError && (toolResult.output || toolResult.result);

  const getFunctionName = (toolName: string) => {
    if (toolName in tools) {
      return tools[toolName].display_name;
    }
    return `Running ${toolName}`;
  };

  const getStatusIcon = () => {
    return '•';
  };

  const getStatusText = () => {
    if (isTimeout) return 'Timed out';
    if (isRetryExhausted) return 'Failed after retries';
    if (hasError) return 'Error';
    if (isSuccess) return 'Completed';
    return 'Running';
  };

  const getFileName = (input: any) => {
    if (input?.file_path) return input.file_path;
    if (toolCall?.toolName === 'list_files') return 'directory';
    return 'unknown';
  };

  return (
    <div className={`function-call-block ${hasError ? 'function-call-error' : ''}`}>
      <div
        className="function-call-header"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="function-call-info">
          <div className="function-call-status">
            <span className="function-call-status-icon">{getStatusIcon()}</span>
          </div>
          <span className="function-call-text">
            {getFunctionName(toolCall.toolName)} {getFileName(toolCall.input)}
          </span>
          <span className="function-call-status-text">
            {getStatusText()}
          </span>
        </div>
        <div className="function-call-toggle">
          {isExpanded ? '−' : '+'}
        </div>
      </div>

      {isExpanded && toolResult && (
        <div className="function-call-result">
          <div className="function-call-result-label">
            {hasError ? 'Error:' : 'Result:'}
          </div>
          <pre className="function-call-result-content">
            {hasError
              ? toolResult.output?.error || 'Unknown error occurred'
              : typeof toolResult.output === 'object'
                ? JSON.stringify(toolResult.output, null, 2)
                : String(toolResult.output)
            }
          </pre>
        </div>
      )}
    </div>
  );
};
