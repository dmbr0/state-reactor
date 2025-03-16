import { useState, useEffect, useCallback, useRef } from 'react';

// Registry for all actors - use a Map for better reliability
const registry = new Map();

// Mailboxes for queuing messages
const mailboxes = new Map();

// Function to get the registry (for debugging)
export const getRegistry = () => registry;

// Function to get the mailboxes (for debugging)
export const getMailboxes = () => mailboxes;

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

// Create or get a mailbox for an actor
export const getMailbox = (actorId) => {
  if (!mailboxes.has(actorId)) {
    console.log(`Creating new mailbox for actor: ${actorId}`);
    mailboxes.set(actorId, {
      queue: [],
      autoProcess: true,
      processInterval: 100, // Default process interval in ms
      intervalId: null
    });
  }
  return mailboxes.get(actorId);
};

// Process a message from the mailbox
export const processMessage = (actorId, count = 1) => {
  console.log(`Processing ${count} message(s) for ${actorId}`);
  const mailbox = mailboxes.get(actorId);
  const callback = registry.get(actorId);
  
  if (!mailbox || mailbox.queue.length === 0) {
    console.log(`No messages to process for ${actorId}`);
    return 0;
  }
  
  if (!callback) {
    console.warn(`Actor ${actorId} not found for processing messages`);
    return 0;
  }
  
  let processed = 0;
  for (let i = 0; i < count && mailbox.queue.length > 0; i++) {
    const message = mailbox.queue.shift();
    console.log(`Processing message for ${actorId}:`, message);
    callback(message);
    processed++;
  }
  
  return processed;
};

// Process all messages in the mailbox
export const processAllMessages = (actorId) => {
  const mailbox = mailboxes.get(actorId);
  if (!mailbox) return 0;
  
  const count = mailbox.queue.length;
  processMessage(actorId, count);
  return count;
};

// Configure the mailbox settings
export const configureMailbox = (actorId, config) => {
  const mailbox = getMailbox(actorId);
  let needsIntervalUpdate = false;
  
  // Handle auto-processing toggle
  if (config.autoProcess !== undefined) {
    mailbox.autoProcess = config.autoProcess;
    needsIntervalUpdate = true;
  }
  
  // Handle process interval change
  if (config.processInterval !== undefined) {
    console.log(`Setting process interval for ${actorId} to ${config.processInterval}ms`);
    mailbox.processInterval = config.processInterval;
    needsIntervalUpdate = true;
  }
  
  // Update interval if needed
  if (needsIntervalUpdate) {
    // Clear existing interval if there is one
    if (mailbox.intervalId) {
      console.log(`Clearing existing interval for ${actorId}`);
      clearInterval(mailbox.intervalId);
      mailbox.intervalId = null;
    }
    
    // Set up new interval if auto-processing is enabled
    if (mailbox.autoProcess) {
      console.log(`Setting up new interval for ${actorId} at ${mailbox.processInterval}ms`);
      mailbox.intervalId = setInterval(() => {
        if (mailboxes.get(actorId)?.queue.length > 0) {
          processMessage(actorId, 1);
        }
      }, mailbox.processInterval);
    }
  }
  
  return mailbox;
};

// Send a message to a specific actor
export const sendMessage = (targetId, message) => {
  console.log(`Sending message to ${targetId}:`, message);
  
  if (!registry.has(targetId)) {
    console.warn(`No actor found with ID: ${targetId}`);
    logRegistry();
    return false;
  }
  
  // Get or create a mailbox for this actor
  const mailbox = getMailbox(targetId);
  
  // Add the message to the queue
  mailbox.queue.push(message);
  console.log(`Added message to ${targetId} mailbox. Queue size: ${mailbox.queue.length}`);
  
  // If this is the first message and auto-processing is on with realtime (1ms) setting,
  // process it immediately instead of waiting for the interval
  if (mailbox.autoProcess && mailbox.processInterval <= 5 && mailbox.queue.length === 1) {
    processMessage(targetId, 1);
  }
  
  return true;
};

// Broadcast a message to all actors except the sender
export const broadcastMessage = (senderId, message) => {
  console.log(`Broadcasting message from ${senderId}:`, message);
  const recipients = Array.from(registry.keys()).filter(id => id !== senderId);
  console.log(`Recipients: ${recipients.join(', ')}`);
  
  // Handle targeted broadcast - only send to target if specified
  if (message.target) {
    console.log(`Message has target: ${message.target}`);
    if (registry.has(message.target)) {
      console.log(`Delivering targeted message to ${message.target}`);
      sendMessage(message.target, message);
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
      sendMessage(actorId, message);
    }
  });
};

// Create an event emitter for self-broadcasting
const selfBroadcast = (id, message) => {
  console.log(`Self broadcast from ${id}:`, message);
  sendMessage(id, message);
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
  
  // Create a state for mailbox info
  const [mailboxInfo, setMailboxInfo] = useState({
    queue: [],
    autoProcess: true,
    processInterval: 100
  });
  
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
    
    // Initialize the mailbox
    getMailbox(id);
    
    // Clean up on unmount
    return () => {
      console.log(`Actor ${id} unmounting and unregistering`);
      unregister();
      
      // Clean up any auto-processing interval
      const mailbox = mailboxes.get(id);
      if (mailbox && mailbox.intervalId) {
        clearInterval(mailbox.intervalId);
      }
    };
  }, [id, stableHandler]);
  
  // Update mailbox info for UI
  useEffect(() => {
    const updateMailboxInfo = () => {
      const mailbox = mailboxes.get(id);
      if (mailbox) {
        setMailboxInfo({
          queue: [...mailbox.queue], // Make a copy to trigger re-render
          autoProcess: mailbox.autoProcess,
          processInterval: mailbox.processInterval
        });
      }
    };
    
    // Update immediately
    updateMailboxInfo();
    
    // Set up interval to periodically update mailbox info
    const infoInterval = setInterval(updateMailboxInfo, 200);
    
    return () => clearInterval(infoInterval);
  }, [id]);

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
  
  // Process a single message from the mailbox
  const processNextMessage = useCallback(() => {
    return processMessage(id, 1);
  }, [id]);
  
  // Process all messages in the mailbox
  const processAllMessages = useCallback(() => {
    const mailbox = mailboxes.get(id);
    if (!mailbox) return 0;
    
    const count = mailbox.queue.length;
    return processMessage(id, count);
  }, [id]);
  
  // Configure mailbox settings
  const configureActorMailbox = useCallback((config) => {
    return configureMailbox(id, config);
  }, [id]);

  return {
    state,
    setState,
    send,
    broadcast,
    id,
    mailbox: mailboxInfo,
    processNextMessage,
    processAllMessages,
    configureMailbox: configureActorMailbox
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