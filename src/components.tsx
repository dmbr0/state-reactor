import React from 'react';
import { ActorComponentProps } from './types';
import { useActor } from './hooks';

/**
 * Component wrapper for creating actors
 * @param props - ActorComponentProps containing id, initialState, messageHandler, and children
 * @returns The rendered component
 */
export function ActorComponent<S>({
  id,
  initialState,
  messageHandler,
  children
}: ActorComponentProps<S>): JSX.Element {
  // Use the actor hook to create the actor
  const actorProps = useActor(
    id,
    initialState,
    messageHandler
  );
  
  // Render the children with the actor props
  return <>{children(actorProps)}</>;
}