export type MessageType = string;

export interface Message {
  type: MessageType;
  payload?: any;
  sender?: string;
  target?: string;
  timestamp?: number;
  [key: string]: any; // Allow for additional properties
}

export type MessageHandler<S> = (state: S, message: Message) => S | void;

export interface Mailbox {
  id: string;
  queue: Message[];
  isProcessing: boolean;
  processRate?: number; // Processing rate in ms (for throttling)
}

export interface ActorHandle {
  id: string;
  mailbox: Mailbox;
  handle: (message: Message) => void;
}

export interface ActorRegistry {
  register: (actor: ActorHandle) => () => void;
  unregister: (actorId: string) => void;
  getActor: (actorId: string) => ActorHandle | undefined;
  broadcast: (senderId: string, message: Message) => void;
  send: (targetId: string, message: Message) => boolean;
}

export interface ActorHookResult<S> {
  state: S;
  setState: React.Dispatch<React.SetStateAction<S>>;
  send: (targetId: string, message: Message) => boolean;
  broadcast: (message: Message) => void;
  id: string;
  mailbox: Mailbox;
  processMailbox: () => void;
  mailboxSize: number;
}

export interface SenderHookResult {
  send: (targetId: string, message: Message) => boolean;
  broadcast: (message: Message) => void;
  id: string;
}

export interface ActorComponentProps<S> {
  id?: string;
  initialState: S;
  messageHandler: MessageHandler<S>;
  processRate?: number; // Optional rate limit for processing messages (ms)
  children: (props: ActorHookResult<S>) => React.ReactNode;
}