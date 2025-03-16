import { useState, useEffect, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ActorHandle, ActorHookResult, Mailbox, Message, MessageHandler, SenderHookResult } from './types';
import { registerActor, sendMessage, broadcastMessage, createMailbox } from './registry';

/**
 * Hook to create a component actor with a mailbox
 * @param actorId - The unique ID for this actor (optional, will be generated if not provided)
 * @param initialState - The initial state for this actor
 * @param messageHandler - Function to process incoming messages and update state
 * @param processRate - Optional rate limiter for processing messages (in ms)
 * @returns An object with state, setState, send, broadcast, mailbox, and id
 */
export function useActor<S>(
  actorId: string | undefined,
  initialState: S,
  messageHandler: MessageHandler<S>,
  processRate?: number
): ActorHookResult<S> {
  // Generate a stable ID if not provided
  const idRef = useRef<string>(actorId || uuidv4());
  const id = idRef.current;

  // Create state and stateRef for handling updates
  const [state, setState] = useState<S>(initialState);
  const stateRef = useRef(state);
  
  // Create a mailbox for this actor
  const mailboxRef = useRef<Mailbox>(createMailbox(id, processRate));
  
  // Keep the state ref updated with the latest state
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Process the next message in the mailbox
  const processNextMessage = useCallback(() => {
    const mailbox = mailboxRef.current;
    
    // If there are no messages or we're already processing, return
    if (mailbox.queue.length === 0 || !mailbox.isProcessing) {
      mailbox.isProcessing = false;
      return;
    }
    
    // Get the next message
    const message = mailbox.queue.shift();
    if (!message) {
      mailbox.isProcessing = false;
      return;
    }
    
    // Process the message
    console.log(`Actor ${id} processing message:`, message);
    if (typeof messageHandler === 'function') {
      const newState = messageHandler(stateRef.current, message);
      if (newState !== undefined) {
        console.log(`Actor ${id} updating state:`, newState);
        setState(newState);
      }
    }
    
    // Schedule the next message processing
    if (mailbox.queue.length > 0) {
      if (mailbox.processRate && mailbox.processRate > 0) {
        setTimeout(processNextMessage, mailbox.processRate);
      } else {
        // Use microtask queue for immediate processing
        queueMicrotask(processNextMessage);
      }
    } else {
      mailbox.isProcessing = false;
    }
  }, [id, messageHandler]);

  // Process the mailbox manually (externally triggered)
  const processMailbox = useCallback(() => {
    const mailbox = mailboxRef.current;
    if (!mailbox.isProcessing && mailbox.queue.length > 0) {
      mailbox.isProcessing = true;
      processNextMessage();
    }
  }, [processNextMessage]);

  // Handle incoming messages (entry point)
  const handleMailbox = useCallback((message: Message) => {
    const mailbox = mailboxRef.current;
    
    // Message already queued by the registry, now start processing if needed
    if (!mailbox.isProcessing) {
      mailbox.isProcessing = true;
      processNextMessage();
    }
  }, [processNextMessage]);

  // Keep a stable reference to the handler
  const handlerRef = useRef(handleMailbox);
  useEffect(() => {
    handlerRef.current = handleMailbox;
  }, [handleMailbox]);
  
  // Create the actor object with mailbox
  const actorRef = useRef<ActorHandle>({
    id,
    mailbox: mailboxRef.current,
    handle: (message: Message) => handlerRef.current(message)
  });

  // Register with the message bus only once per component instance
  useEffect(() => {
    console.log(`Actor ${id} mounting and registering with mailbox`);
    const unregister = registerActor(actorRef.current);
    return () => {
      console.log(`Actor ${id} unmounting and unregistering`);
      unregister();
    };
  }, [id]);

  // Method to send messages to other actors
  const send = useCallback((targetId: string, message: Message) => {
    console.log(`Actor ${id} sending to ${targetId}:`, message);
    return sendMessage(targetId, {
      ...message,
      sender: message.sender || id
    });
  }, [id]);

  // Method to broadcast messages to all other actors
  const broadcast = useCallback((message: Message) => {
    console.log(`Actor ${id} broadcasting:`, message);
    
    // If this is a message to self, add it directly to the mailbox
    if (message.target === id) {
      console.log(`Self-targeted message detected`);
      const mailbox = mailboxRef.current;
      const completeMessage = {
        ...message,
        sender: message.sender || id,
        timestamp: Date.now()
      };
      mailbox.queue.push(completeMessage);
      if (!mailbox.isProcessing) {
        mailbox.isProcessing = true;
        processNextMessage();
      }
      return;
    }
    
    broadcastMessage(id, {
      ...message,
      sender: message.sender || id
    });
  }, [id, processNextMessage]);

  // Calculate mailbox size
  const mailboxSize = mailboxRef.current.queue.length;

  return {
    state,
    setState,
    send,
    broadcast,
    id,
    mailbox: mailboxRef.current,
    processMailbox,
    mailboxSize
  };
}

/**
 * Hook to create a global state actor
 * @param name - The name of the global actor (will be prefixed with 'global:')
 * @param initialState - The initial state for this actor
 * @param messageHandler - Function to process incoming messages and update state
 * @param processRate - Optional rate limiter for processing messages (in ms)
 * @returns Same as useActor
 */
export function useGlobalActor<S>(
  name: string,
  initialState: S,
  messageHandler: MessageHandler<S>,
  processRate?: number
): ActorHookResult<S> {
  const globalId = `global:${name}`;
  console.log(`Creating global actor: ${globalId}`);
  return useActor<S>(globalId, initialState, messageHandler, processRate);
}

/**
 * Hook to just send messages without being an actor with state
 * @param senderId - The sender ID (optional, will be generated if not provided)
 * @returns An object with send, broadcast, and id
 */
export function useSender(senderId: string = uuidv4()): SenderHookResult {
  const id = useRef(senderId).current;
  
  const send = useCallback((targetId: string, message: Message) => {
    console.log(`Sender ${id} sending to ${targetId}:`, message);
    return sendMessage(targetId, {
      ...message,
      sender: message.sender || id
    });
  }, [id]);

  const broadcast = useCallback((message: Message) => {
    console.log(`Sender ${id} broadcasting:`, message);
    broadcastMessage(id, {
      ...message,
      sender: message.sender || id
    });
  }, [id]);

  return { send, broadcast, id };
}