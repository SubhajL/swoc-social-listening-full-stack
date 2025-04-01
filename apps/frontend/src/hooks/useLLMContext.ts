// import { useEffect, useRef, useCallback, useState } from 'react';
// import { useAuth } from './useAuth';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

interface CodeContext {
  currentFile?: string;
  openFiles: string[];
  recentEdits: CodeEdit[];
  linterErrors: LinterError[];
  dependencies: Record<string, string>;
}

interface CodeEdit {
  file: string;
  timestamp: number;
  changes: string;
}

interface LinterError {
  file: string;
  line: number;
  message: string;
  severity: 'error' | 'warning';
}

interface SystemState {
  isAuthenticated: boolean;
  isApiConnected: boolean;
  currentBranch?: string;
  lastCommand?: string;
  lastCommandResult?: string;
}

interface LLMContext {
  conversationId: string;
  messages: Message[];
  codeContext: CodeContext;
  systemState: SystemState;
  lastUpdated: number;
}

// const LLM_CONTEXT_URL = 'ws://localhost:3002'; // Commented out

// Mock implementation to satisfy dependencies without connecting to WebSocket
export const useLLMContext = () => {
  // const ws = useRef<WebSocket | null>(null);
  // const [isConnected, setIsConnected] = useState(false);
  // const [sessionId, setSessionId] = useState<string | null>(null);
  // const [context, setContext] = useState<LLMContext | null>(null);
  // const { isAuthenticated } = useAuth();

  // const connect = useCallback(() => {
  //   if (ws.current?.readyState === WebSocket.OPEN) return;

  //   // ws.current = new WebSocket(LLM_CONTEXT_URL); // Don't create WebSocket

  //   // ws.current.onopen = () => {
  //   //   console.log('Connected to LLM Context Manager'); // Removed log
  //   //   setIsConnected(true);
  //   // };

  //   // ws.current.onclose = () => {
  //   //   console.log('Disconnected from LLM Context Manager'); // Removed log
  //   //   setIsConnected(false);
  //   //   setSessionId(null);
  //   //   setContext(null);
  //   //   // Attempt to reconnect after 5 seconds (Removed reconnect logic)
  //   //   // setTimeout(connect, 5000);
  //   // };

  //   // ws.current.onerror = (error) => {
  //   //   console.error('LLM Context WebSocket error:', error); // Removed log
  //   // };

  //   // ws.current.onmessage = (event) => {
  //   //   try {
  //   //     const data = JSON.parse(event.data);
        
  //   //     if (data.type === 'init') {
  //   //       setSessionId(data.sessionId);
  //   //       setContext(data.context);
  //   //     } else if (data.type === 'updateContext' && data.success) {
  //   //       setContext(data.context);
  //   //     } else if (data.type === 'addMessage' && data.success) {
  //   //       setContext(prev => prev ? {
  //   //         ...prev,
  //   //         messages: data.messages
  //   //       } : null);
  //   //     } else if (data.type === 'updateCodeContext' && data.success) {
  //   //       setContext(prev => prev ? {
  //   //         ...prev,
  //   //         codeContext: data.codeContext
  //   //       } : null);
  //   //     } else if (data.type === 'updateSystemState' && data.success) {
  //   //       setContext(prev => prev ? {
  //   //         ...prev,
  //   //         systemState: data.systemState
  //   //       } : null);
  //   //     } else if (data.type === 'getContext') {
  //   //       setContext(data.context);
  //   //     }
  //   //   } catch (error) {
  //   //     console.error('Error parsing LLM Context message:', error); // Removed log
  //   //   }
  //   // };
  // }, []);

  // useEffect(() => {
  //   // connect(); // Don't connect
  //   // return () => {
  //   //   ws.current?.close();
  //   // };
  // }, [/* connect */]); // Remove connect dependency

  // // Update system state when authentication changes
  // useEffect(() => {
  //   // if (isConnected && context) {
  //   //   updateSystemState({
  //   //     ...context.systemState,
  //   //     isAuthenticated
  //   //   });
  //   // }
  // }, [isAuthenticated, isConnected, context]);

  // const sendMessage = useCallback((type: string, data: any) => {
  //   // if (!ws.current || ws.current.readyState !== WebSocket.OPEN) {
  //   //   console.error('WebSocket is not connected'); // Removed log
  //   //   return;
  //   // }

  //   // ws.current.send(JSON.stringify({ type, ...data })); // Don't send message
  // }, []);

  // // Mock functions that do nothing
  // const updateContext = useCallback((newContext: Partial<LLMContext>) => { /* No-op */ }, []);
  // const addMessage = useCallback((role: 'user' | 'assistant' | 'system', content: string) => { /* No-op */ }, []);
  // const updateCodeContext = useCallback((codeContext: Partial<CodeContext>) => { /* No-op */ }, []);
  // const updateSystemState = useCallback((systemState: Partial<SystemState>) => { /* No-op */ }, []);
  // const getContext = useCallback(() => { /* No-op */ }, []);
  // const clear = useCallback(() => { /* No-op */ }, []);

  // Return mock values/functions
  return {
    isConnected: false,
    sessionId: null,
    context: null,
    updateContext: () => { /* No-op */ },
    addMessage: () => { /* No-op */ },
    updateCodeContext: () => { /* No-op */ },
    updateSystemState: () => { /* No-op */ },
    getContext: () => { /* No-op */ },
    clear: () => { /* No-op */ },
  };
}; 