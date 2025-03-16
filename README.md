# State Reactor

A lightweight library for implementing actor-based message passing in React components.

## Installation

```bash
npm install state-reactor uuid
# or
yarn add state-reactor uuid
```

## Core Concepts

- **Actors**: Components that can receive and process messages
- **Messages**: Structured data with a type and payload
- **Registry**: Automatic registration system for all actors
- **Message Handlers**: Functions that update state based on messages

## Usage Examples

### Basic Component Actor

```tsx
import React from 'react';
import { useActor } from 'state-reactor';

function Counter() {
  // Define message handler
  const handleMessage = (state, message) => {
    switch (message.type) {
      case 'INCREMENT':
        return state + (message.payload || 1);
      case 'DECREMENT':
        return state - (message.payload || 1);
      case 'RESET':
        return 0;
      default:
        return state;
    }
  };

  // Use the actor hook
  const { state: count, send, broadcast, id } = useActor(
    'counter-1', // unique actor ID
    0,           // initial state
    handleMessage
  );

  return (
    <div>
      <p>Counter ID: {id}</p>
      <p>Count: {count}</p>
      <button onClick={() => broadcast({ type: 'INCREMENT' })}>+</button>
      <button onClick={() => broadcast({ type: 'DECREMENT' })}>-</button>
      <button onClick={() => broadcast({ type: 'RESET' })}>Reset</button>
    </div>
  );
}
```

### Component Communication

```tsx
import React from 'react';
import { useActor, useSender } from 'state-reactor';

// Parent component
function App() {
  return (
    <div>
      <Sender />
      <Receiver id="receiver1" />
      <Receiver id="receiver2" />
    </div>
  );
}

// Sender component
function Sender() {
  const { send, id } = useSender("sender");
  
  return (
    <div>
      <p>Sender ID: {id}</p>
      <button onClick={() => send("receiver1", { 
        type: "UPDATE_TEXT", 
        payload: "Hello from sender!" 
      })}>
        Message Receiver 1
      </button>
      <button onClick={() => send("receiver2", { 
        type: "UPDATE_TEXT", 
        payload: "Hello from sender!" 
      })}>
        Message Receiver 2
      </button>
    </div>
  );
}

// Receiver component
function Receiver({ id }) {
  const textHandler = (state, message) => {
    if (message.type === "UPDATE_TEXT") {
      return message.payload;
    }
    return state;
  };

  const { state: text, id: actorId } = useActor(
    id,
    "Waiting for messages...",
    textHandler
  );

  return (
    <div>
      <p>ID: {actorId}</p>
      <p>Text: {text}</p>
    </div>
  );
}
```

### Global State Actor

```tsx
import React from 'react';
import { useGlobalActor } from 'state-reactor';

// Define a message handler for theme
const themeHandler = (state, message) => {
  switch (message.type) {
    case 'TOGGLE_THEME':
      return state === 'light' ? 'dark' : 'light';
    case 'SET_THEME':
      return message.payload;
    default:
      return state;
  }
};

// Theme provider component
function ThemeProvider({ children }) {
  const { state: theme, broadcast } = useGlobalActor(
    'theme',
    'light',
    themeHandler
  );
  
  return (
    <div className={`theme-${theme}`}>
      {children}
      <button onClick={() => broadcast({ type: 'TOGGLE_THEME' })}>
        Toggle Theme
      </button>
    </div>
  );
}
```

### Using the ActorComponent

```tsx
import React from 'react';
import { ActorComponent } from 'state-reactor';

function MyApp() {
  const todoHandler = (state, message) => {
    switch (message.type) {
      case 'ADD_TODO':
        return [...state, message.payload];
      case 'REMOVE_TODO':
        return state.filter((_, i) => i !== message.payload);
      default:
        return state;
    }
  };

  return (
    <ActorComponent
      id="todos"
      initialState={[]}
      messageHandler={todoHandler}
    >
      {({ state: todos, broadcast, id }) => (
        <div>
          <h1>Todo List ({id})</h1>
          <ul>
            {todos.map((todo, index) => (
              <li key={index}>
                {todo}
                <button onClick={() => broadcast({ type: 'REMOVE_TODO', payload: index })}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
          <button onClick={() => broadcast({ 
            type: 'ADD_TODO', 
            payload: `New todo ${Date.now()}` 
          })}>
            Add Todo
          </button>
        </div>
      )}
    </ActorComponent>
  );
}
```

## API Reference

### Hooks

- `useActor(id, initialState, messageHandler)` - Creates a component actor
  - Returns `{ state, setState, send, broadcast, id }`

- `useGlobalActor(name, initialState, messageHandler)` - Creates a global actor 
  - Returns the same object as useActor

- `useSender(senderId?)` - Creates a sender without state
  - Returns `{ send, broadcast, id }`

### Components

- `ActorComponent` - Component wrapper for creating actors
  - Props: `{ id, initialState, messageHandler, children }`
  - Children function receives `{ state, setState, send, broadcast, id }`

### Functions

- `sendMessage(targetId, message)` - Send a message to a specific actor
- `broadcastMessage(senderId, message)` - Send a message to all actors except sender
- `registerActor(actor)` - Manually register an actor
- `unregisterActor(actorId)` - Manually unregister an actor

## License

MIT