import { useState, useEffect, useCallback } from 'react';
import socketClient from '../socketClient';

/**
 * React hook for using the WebSocket client
 * @param {Object} options - Hook options
 * @param {boolean} options.autoConnect - Whether to automatically connect to the WebSocket server
 * @param {Object} options.events - Event handlers to register
 * @returns {Object} - Socket state and methods
 */
export function useSocket({ autoConnect = true, events = {} } = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);

  // Connect to the WebSocket server
  const connect = useCallback(async () => {
    if (isConnected || isConnecting) {
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const connected = await socketClient.connect();
      setIsConnected(connected);
      
      if (!connected) {
        setError(new Error('Failed to connect to WebSocket server'));
      }
    } catch (err) {
      setError(err);
      setIsConnected(false);
    } finally {
      setIsConnecting(false);
    }
  }, [isConnected, isConnecting]);

  // Disconnect from the WebSocket server
  const disconnect = useCallback(() => {
    socketClient.disconnect();
    setIsConnected(false);
  }, []);

  // Subscribe to an event
  const subscribe = useCallback((event, callback) => {
    socketClient.on(event, callback);
    
    // Return a function to unsubscribe
    return () => {
      socketClient.off(event, callback);
    };
  }, []);

  // Publish a message
  const publish = useCallback(async (channelId, event, data) => {
    if (!isConnected) {
      await connect();
    }
    
    return socketClient.publish(channelId, event, data);
  }, [isConnected, connect]);

  // Register event handlers
  useEffect(() => {
    const unsubscribers = Object.entries(events).map(([event, callback]) => {
      return subscribe(event, callback);
    });
    
    // Unsubscribe when the component unmounts
    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [events, subscribe]);

  // Auto-connect if enabled
  useEffect(() => {
    if (autoConnect) {
      connect();
    }
    
    // Disconnect when the component unmounts
    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  return {
    isConnected,
    isConnecting,
    error,
    connect,
    disconnect,
    subscribe,
    publish,
  };
} 