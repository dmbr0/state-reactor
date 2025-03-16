import React from 'react';
import { ActorComponentProps } from './types';
import { useActor } from './hooks';

/**
 * Component wrapper for creating actors with mailboxes
 * @param props - ActorComponentProps containing id, initialState, messageHandler, processRate, and children
 * @returns The rendered component
 */
export function ActorComponent<S>({
  id,
  initialState,
  messageHandler,
  processRate,
  children
}: ActorComponentProps<S>): JSX.Element {
  // Use the actor hook to create the actor with mailbox
  const actorProps = useActor(
    id,
    initialState,
    messageHandler,
    processRate
  );
  
  // Render the children with the actor props
  return <>{children(actorProps)}</>;
}