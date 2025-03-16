import { ActorHandle, ActorRegistry, Mailbox, Message } from './types';

class ActorRegistryImpl implements ActorRegistry {
  private actors = new Map<string, ActorHandle>();

  register(actor: ActorHandle): () => void {
    if (this.actors.has(actor.id)) {
      console.warn(`Actor with id ${actor.id} is already registered. Overwriting.`);
    }
    this.actors.set(actor.id, actor);
    
    // Return unregister function
    return () => {
      this.unregister(actor.id);
    };
  }

  unregister(actorId: string): void {
    this.actors.delete(actorId);
  }

  getActor(actorId: string): ActorHandle | undefined {
    return this.actors.get(actorId);
  }

  broadcast(senderId: string, message: Message): void {
    // Add timestamp if not already present
    const timestampedMessage = {
      ...message,
      timestamp: message.timestamp ?? Date.now()
    };

    // Handle targeted broadcast
    if (message.target) {
      this.send(message.target, timestampedMessage);
      return;
    }

    // Otherwise broadcast to all except sender
    this.actors.forEach((actor, id) => {
      if (id !== senderId) {
        this.queueMessageForActor(actor, timestampedMessage);
      }
    });
  }

  send(targetId: string, message: Message): boolean {
    const target = this.actors.get(targetId);
    if (!target) {
      console.warn(`No actor found with id ${targetId}`);
      return false;
    }

    // Add timestamp if not already present
    const timestampedMessage = {
      ...message,
      timestamp: message.timestamp ?? Date.now()
    };

    this.queueMessageForActor(target, timestampedMessage);
    return true;
  }

  private queueMessageForActor(actor: ActorHandle, message: Message): void {
    // Add message to the actor's mailbox queue
    actor.mailbox.queue.push(message);
    
    // Trigger the message handling process if it's not already running
    if (!actor.mailbox.isProcessing) {
      actor.handle(message);
    }
  }
}

// Singleton registry
export const registry = new ActorRegistryImpl();

// Global methods for convenience
export const registerActor = (actor: ActorHandle): () => void => registry.register(actor);
export const unregisterActor = (actorId: string): void => registry.unregister(actorId);
export const getActor = (actorId: string): ActorHandle | undefined => registry.getActor(actorId);
export const broadcastMessage = (senderId: string, message: Message): void => registry.broadcast(senderId, message);
export const sendMessage = (targetId: string, message: Message): boolean => registry.send(targetId, message);

// Create a new mailbox
export const createMailbox = (id: string, processRate?: number): Mailbox => ({
  id,
  queue: [],
  isProcessing: false,
  processRate
});