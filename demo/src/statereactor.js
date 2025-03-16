import { useState, useEffect, useCallback, useRef } from 'react';

// Registry for all actors - use a Map for better reliability
const registry = new Map();

// Function to get the registry (for debugging)
export const getRegistry = () => registry;

// For debugging
const logRegistry = () => {
  console.log('Current registry:', Array.from(registry.keys()));
};

// Register an actor with the system
export const registerActor = (actorId, callback) => {
  console.log(`Registering actor: ${actorId}`);
  
  if (registry.has(actorId)) {
    console.warn(`Actor with ID ${actorId} is already registered. Overwriting.`);
  }
  
  registry.set(actorId, callback);
  logRegistry();
  
  return () => {
    console.log(`Unregistering actor: ${actorId}`);
    registry.delete(actorId);
    logRegistry();
  };
};

// Send a message to a specific actor
export const sendMessage = (targetId, message) => {
  console.log(`Sending message to ${targetId}:`, message);
  const callback = registry.get(targetId);
  
  if (callback) {
    callback(message);
    return true;
  } else {
    console.warn(`No actor found with ID: ${targetId}`);
    logRegistry();
    return false;
  }
};

// Broadcast a message to all actors except the sender
export const broadcastMessage = (senderId, message) => {
  console.log(`Broadcasting message from ${senderId}:`, message);
  const recipients = Array.from(registry.keys()).filter(id => id !== senderId);
  console.log(`Recipients: ${recipients.join(', ')}`);
  
  // Handle targeted broadcast - only send to target if specified
  if (message.target) {
    console.log(`Message has target: ${message.target}`);
    const callback = registry.get(message.target);
    if (callback) {
      console.log(`Delivering targeted message to ${message.target}`);
      callback(message);
    } else {
      console.warn(`Target ${message.target} not found for message`);
      logRegistry();
    }
    return;
  }
  
  // Otherwise broadcast to all except sender
  registry.forEach((callback, actorId) => {
    if (actorId !== senderId) {
      console.log(`Delivering to ${actorId}`);
      callback(message);
    }
  });
};

// Create an event emitter for self-broadcasting
const selfBroadcast = (id, message) => {
  console.log(`Self broadcast from ${id}:`, message);
  const callback = registry.get(id);
  if (callback) {
    callback(message);
  }
};

// Generate unique IDs
let actorIdCounter = 0;
const generateId = (prefix) => `${prefix || 'actor'}-${++actorIdCounter}`;

// React hook to use the actor system
export const useActor = (actorId, initialState, messageHandler) => {
  // Generate ID if not provided
  const idRef = useRef(actorId || generateId());
  const id = idRef.current;
  
  // Create state and stateRef for handling updates
  const [state, setState] = useState(initialState);
  const stateRef = useRef(state);
  
  // Keep the ref updated with the latest state
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Handle incoming messages
  const handleMessage = useCallback((message) => {
    console.log(`Actor ${id} received message:`, message);
    if (typeof messageHandler === 'function') {
      const newState = messageHandler(stateRef.current, message);
      if (newState !== undefined) {
        console.log(`Actor ${id} updating state:`, newState);
        setState(newState);
      }
    }
  }, [messageHandler, id]);

  // Keep a stable reference to the handler
  const handlerRef = useRef(handleMessage);
  useEffect(() => {
    handlerRef.current = handleMessage;
  }, [handleMessage]);
  
  // Wrap the handler to ensure we always call the latest version
  const stableHandler = useCallback((message) => {
    handlerRef.current(message);
  }, []);

  // Register with the message bus only once per component instance
  useEffect(() => {
    console.log(`Actor ${id} mounting and registering`);
    const unregister = registerActor(id, stableHandler);
    return () => {
      console.log(`Actor ${id} unmounting and unregistering`);
      unregister();
    };
  }, [id, stableHandler]);

  // Method to send messages to other actors
  const send = useCallback((targetId, message) => {
    console.log(`Actor ${id} sending to ${targetId}:`, message);
    return sendMessage(targetId, {
      ...message,
      sender: message.sender || id
    });
  }, [id]);

  // Method to broadcast messages to all other actors
  const broadcast = useCallback((message) => {
    console.log(`Actor ${id} broadcasting:`, message);
    
    // If this is a message to self, handle it directly
    if (message.target === id) {
      console.log(`Self-targeted message detected`);
      selfBroadcast(id, {
        ...message,
        sender: message.sender || id
      });
      return;
    }
    
    broadcastMessage(id, {
      ...message,
      sender: message.sender || id
    });
  }, [id]);

  return {
    state,
    setState,
    send,
    broadcast,
    id
  };
};

// Hook to create a global state actor
export const useGlobalActor = (name, initialState, messageHandler) => {
  const globalId = `global:${name}`;
  console.log(`Creating global actor: ${globalId}`);
  return useActor(globalId, initialState, messageHandler);
};

// Hook to just send messages without being an actor
export const useSender = (senderId) => {
  const id = useRef(senderId || generateId('sender')).current;
  
  const send = useCallback((targetId, message) => {
    console.log(`Sender ${id} sending to ${targetId}:`, message);
    return sendMessage(targetId, {
      ...message,
      sender: message.sender || id
    });
  }, [id]);

  const broadcast = useCallback((message) => {
    console.log(`Sender ${id} broadcasting:`, message);
    broadcastMessage(id, {
      ...message,
      sender: message.sender || id
    });
  }, [id]);

  return { send, broadcast, id };
};

// Component wrapper
export const ActorComponent = ({
  id,
  initialState,
  messageHandler,
  children
}) => {
  const actorProps = useActor(id, initialState, messageHandler);
  return children(actorProps);
};