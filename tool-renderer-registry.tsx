'use client';

import React from 'react';
import { ToolCall, ToolResult } from './config';

// Registry for tool renderer components
const toolRendererRegistry: Record<string, React.ComponentType<{ toolCall: ToolCall; toolResult?: ToolResult }>> = {};

// Register a renderer for a tool
export const registerToolRenderer = (
  toolName: string,
  component: React.ComponentType<{ toolCall: ToolCall; toolResult?: ToolResult }>
) => {
  toolRendererRegistry[toolName] = component;
};

// Get a renderer for a tool
export const getToolRenderer = (toolName: string) => {
  return toolRendererRegistry[toolName];
};

// Check if a tool has a custom renderer
export const hasCustomRenderer = (toolName: string) => {
  return toolName in toolRendererRegistry;
};