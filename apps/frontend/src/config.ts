/**
 * Configuration and utilities for LLM Context Management
 * Provides functions to interact with the Memory Control Protocol server
 */

// import { SOCKET_URL } from './lib/config'; // Removed import

interface SystemState {
  isAuthenticated?: boolean;
  currentRoute?: string;
  [key: string]: any;
}

interface CodeContext {
  currentFile?: string;
  recentFiles?: string[];
  [key: string]: any;
}

interface LLMContext {
  conversationId: string;
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: number;
  }>;
  codeContext: CodeContext;
  systemState: SystemState;
  lastUpdated: number;
}

// Default empty context structure
const DEFAULT_CONTEXT: LLMContext = {
  conversationId: '',
  messages: [],
  codeContext: {},
  systemState: {},
  lastUpdated: Date.now()
};

// In-memory fallback
let contextFallback: LLMContext = { ...DEFAULT_CONTEXT };

/**
 * Store conversation context (in-memory fallback only)
 */
export function storeConversationContext(context: Partial<LLMContext>): void {
  try {
    // Update local fallback
    contextFallback = {
      ...contextFallback,
      ...context,
      lastUpdated: Date.now()
    };
    
    // // Try to connect to WebSocket if available (Removed WebSocket logic)
    // const ws = getWebSocketConnection();
    // if (ws && ws.readyState === WebSocket.OPEN) {
    //   ws.send(JSON.stringify({
    //     type: 'updateContext',
    //     context
    //   }));
    // }
  } catch (error) {
    // console.error('[MCP] Failed to store context:', error); // Optionally keep error logging if needed
  }
}

/**
 * Get current conversation context (from in-memory fallback only)
 */
export function getConversationContext(): LLMContext {
  // try {
  //   // Request update from WebSocket if available (Removed WebSocket logic)
  //   const ws = getWebSocketConnection();
  //   if (ws && ws.readyState === WebSocket.OPEN) {
  //     ws.send(JSON.stringify({ type: 'getContext' }));
  //   }
  // } catch (error) {
  //   // console.error('[MCP] Failed to request context:', error);
  // }
  
  // Return local fallback
  return contextFallback;
}

// WebSocket singleton (Commented out)
// let wsConnection: WebSocket | null = null;

/**
 * Get or create WebSocket connection to MCP server (Commented out)
 */
/*
function getWebSocketConnection(): WebSocket | null {
  // If connection already exists and is open, return it
  if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
    return wsConnection;
  }
  
  // If connection is closing or closed, create a new one
  if (!wsConnection || wsConnection.readyState > 1) {
    try {
      // Use the SOCKET_URL from the configuration
      // If SOCKET_URL is undefined, use a default value or return null
      if (!SOCKET_URL) {
        // console.log('[MCP] Socket URL is undefined, cannot connect to LLM Context Manager');
        return null;
      }
      
      wsConnection = new WebSocket(SOCKET_URL);
      
      // console.log('[MCP] Attempting to connect to LLM Context Manager at:', SOCKET_URL);
      
      wsConnection.onopen = () => {
        // console.log('[MCP] Connected to LLM Context Manager');
      };
      
      wsConnection.onclose = () => {
        // console.log('[MCP] Disconnected from LLM Context Manager');
        wsConnection = null;
      };
      
      wsConnection.onerror = (error) => {
        // console.error('[MCP] WebSocket error:', error);
      };
      
      wsConnection.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'init' || data.type === 'updateContext' || data.type === 'getContext') {
            if (data.context) {
              contextFallback = {
                ...contextFallback,
                ...data.context
              };
            }
          }
        } catch (error) {
          // console.error('[MCP] Failed to parse WebSocket message:', error);
        }
      };
    } catch (error) {
      // console.error('[MCP] Failed to connect to LLM Context Manager:', error);
      wsConnection = null;
    }
  }
  
  return wsConnection;
}
*/ 