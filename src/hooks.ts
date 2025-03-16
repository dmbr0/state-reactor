import { useState, useEffect, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ActorHandle, ActorHookResult, Message, MessageHandler, SenderHookResult } from './types';
import { registerActor, sendMessage, broadcastMessage } from './registry';

/**
 * Hook to create a component actor
 * @param actorId - The unique ID for this actor (optional, will be generated if not provided)
 * @param initialState - The initial state for this actor
 * @param messageHandler - Function to process incoming messages and update state
 * @returns An object with state, setState, send, broadcast, and id
 */
export function useActor<S>(
  actorId: string | undefined,
  initialState: S,
  messageHandler: MessageHandler<S>
): ActorHookResult<S> {
  // Generate a stable ID if not provided
  const idRef = useRef<string>(actorId || uuidv4());
  const id = idRef.current;

  // Create state and stateRef for handling updates
  const [state, setState] = useState<S>(initialState);
  const stateRef = useRef(state);
  
  // Keep the ref updated with the latest state
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Message handler for this actor
  const handleMessage = useCallback((message: Message) => {
    const result = messageHandler(stateRef.current, message);
    if (result !== undefined) {
      setState(result);
    }
  }, [messageHandler]);

  // Create the actor object
  const actorRef = useRef<ActorHandle>({
    id,
    handle: handleMessage
  });

  // Register this actor when mounting, unregister when unmounting
  useEffect(() => {
    const unregister = registerActor(actorRef.current);
    return unregister;
  }, [id]);

  // Function to send a message to another actor
  const send = useCallback((targetId: string, message: Message) => {
    // Automatically set sender if not provided
    const completeMessage = {
      ...message,
      sender: message.sender || id
    };
    return sendMessage(targetId, completeMessage);
  }, [id]);

  // Function to broadcast a message to all other actors
  const broadcast = useCallback((message: Message) => {
    // Automatically set sender if not provided
    const completeMessage = {
      ...message,
      sender: message.sender || id
    };
    broadcastMessage(id, completeMessage);
  }, [id]);

  return {
    state,
    setState,
    send,
    broadcast,
    id
  };
}

/**
 * Hook to create a global state actor
 * @param name - The name of the global actor (will be prefixed with 'global:')
 * @param initialState - The initial state for this actor
 * @param messageHandler - Function to process incoming messages and update state
 * @returns Same as useActor
 */
export function useGlobalActor<S>(
  name: string,
  initialState: S,
  messageHandler: MessageHandler<S>
): ActorHookResult<S> {
  // Use the standard actor hook with a predictable global name
  return useActor<S>(`global:${name}`, initialState, messageHandler);
}

/**
 * Hook to just send messages without being an actor with state
 * @param senderId - The sender ID (optional, will be generated if not provided)
 * @returns An object with send, broadcast, and id
 */
export function useSender(senderId: string = uuidv4()): SenderHookResult {
  const id = useRef(senderId).current;
  
  const send = useCallback((targetId: string, message: Message) => {
    return sendMessage(targetId, {
      ...message,
      sender: message.sender || id
    });
  }, [id]);

  const broadcast = useCallback((message: Message) => {
    broadcastMessage(id, {
      ...message,
      sender: message.sender || id
    });
  }, [id]);

  return { send, broadcast, id };
}