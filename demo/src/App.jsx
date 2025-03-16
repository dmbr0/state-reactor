import React from 'react';
import { useActor, useGlobalActor, useSender, ActorComponent, getRegistry } from './statereactor';
import './App.css';

// Registry Debug View
function RegistryViewer() {
  const [actors, setActors] = React.useState([]);
  
  // Update the actor list every second
  React.useEffect(() => {
    const updateActors = () => {
      const registry = getRegistry();
      setActors(Array.from(registry.keys()));
    };
    
    // Update immediately and set interval
    updateActors();
    const interval = setInterval(updateActors, 1000);
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="component registry-viewer">
      <h2>Registry Viewer</h2>
      <p>Total actors: {actors.length}</p>
      <div className="registry-list">
        <h3>Registered Actors:</h3>
        {actors.length > 0 ? (
          <ul>
            {actors.map((actorId, index) => (
              <li key={index} className="actor-item">
                {actorId}
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty">No actors registered</p>
        )}
      </div>
    </div>
  );
}

// Counter Component using useActor
function Counter({ id }) {
  // Define message handler
  const handleMessage = (state, message) => {
    console.log("Counter handler called with:", message);
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
  const { state: count, send, id: actorId } = useActor(
    id,
    0,
    handleMessage
  );

  const handleIncrement = () => {
    console.log("Increment button clicked");
    send(actorId, { type: 'INCREMENT' });
  };

  const handleDecrement = () => {
    console.log("Decrement button clicked");
    send(actorId, { type: 'DECREMENT' });
  };

  const handleReset = () => {
    console.log("Reset button clicked");
    send(actorId, { type: 'RESET' });
  };

  return (
    <div className="component counter">
      <h2>Counter ({actorId})</h2>
      <p className="value">{count}</p>
      <div className="controls counter-buttons">
        <button className="counter-button" onClick={handleIncrement}>+</button>
        <button className="counter-button" onClick={handleDecrement}>-</button>
        <button className="counter-button" onClick={handleReset}>Reset</button>
      </div>
    </div>
  );
}

// Message Display Component
function MessageDisplay({ id }) {
  const messageHandler = (state, message) => {
    console.log("MessageDisplay handler called with:", message);
    if (message.type === 'NEW_MESSAGE') {
      // Add the message to the state with timestamp
      return [
        ...state, 
        { 
          text: message.payload, 
          sender: message.sender, 
          time: new Date().toLocaleTimeString() 
        }
      ].slice(-5); // Keep only last 5 messages
    }
    return state;
  };

  const { state: messages, id: actorId } = useActor(
    id,
    [],
    messageHandler
  );

  return (
    <div className="component message-display">
      <h2>Message Display ({actorId})</h2>
      <div className="messages">
        {messages.length === 0 ? (
          <p className="empty">No messages yet</p>
        ) : (
          messages.map((msg, index) => (
            <div key={index} className="message">
              <span className="sender">{msg.sender}: </span>
              <span className="text">{msg.text}</span>
              <span className="time">{msg.time}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// Message Sender Component
function MessageSender() {
  const [text, setText] = React.useState('');
  const { send, id } = useSender();

  const handleSendMessage = (targetId) => {
    if (text.trim()) {
      console.log(`Attempting to send '${text}' to ${targetId}`);
      send(targetId, { 
        type: 'NEW_MESSAGE', 
        payload: text 
      });
      setText('');
    }
  };

  return (
    <div className="component message-sender">
      <h2>Message Sender ({id})</h2>
      <div className="controls">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message..."
          onKeyDown={(e) => e.key === 'Enter' && handleSendMessage('display1')}
        />
        <button onClick={() => handleSendMessage('display1')}>
          Send to Display 1
        </button>
        <button onClick={() => handleSendMessage('display2')}>
          Send to Display 2
        </button>
      </div>
    </div>
  );
}

// Theme Toggler using Global Actor
function ThemeToggler() {
  const themeHandler = (state, message) => {
    console.log("ThemeToggler handler called with:", message);
    switch (message.type) {
      case 'TOGGLE_THEME':
        const newTheme = state === 'light' ? 'dark' : 'light';
        console.log(`Toggling theme from ${state} to ${newTheme}`);
        return newTheme;
      case 'SET_THEME':
        return message.payload;
      default:
        return state;
    }
  };

  const { state: theme, send, id } = useGlobalActor(
    'theme',
    'light',
    themeHandler
  );

  // Update body class when theme changes
  React.useEffect(() => {
    console.log(`Setting body class to: ${theme}`);
    document.body.className = theme;
  }, [theme]);

  const toggleTheme = () => {
    console.log("Toggle theme button clicked");
    // Send directly to the global theme actor
    send(`global:theme`, { type: 'TOGGLE_THEME' });
  };

  return (
    <div className="component theme-toggler">
      <h2>Theme Control ({id})</h2>
      <p>Current theme: {theme}</p>
      <button onClick={toggleTheme}>
        Toggle Theme
      </button>
    </div>
  );
}

// Todo List Component - Using standard actor hook for simplicity
function TodoList() {
  const [newTodo, setNewTodo] = React.useState('');

  const todoHandler = (state, message) => {
    console.log("TodoList handler called with:", message, "Current state:", state);
    switch (message.type) {
      case 'ADD_TODO':
        console.log(`Adding todo: ${message.payload}`);
        return [...state, message.payload];
      case 'REMOVE_TODO':
        return state.filter((_, i) => i !== message.payload);
      case 'CLEAR_TODOS':
        return [];
      default:
        return state;
    }
  };

  const { state: todos, send, id } = useActor(
    "todos", // Fixed ID
    [], // Empty initial state
    todoHandler
  );

  const handleAddTodo = () => {
    if (newTodo.trim()) {
      console.log(`Sending ADD_TODO message to self with: ${newTodo}`);
      // Send to self directly
      send(id, { 
        type: 'ADD_TODO', 
        payload: newTodo 
      });
      setNewTodo('');
    }
  };

  const handleRemoveTodo = (index) => {
    console.log(`Removing todo at index: ${index}`);
    send(id, { 
      type: 'REMOVE_TODO', 
      payload: index 
    });
  };

  const handleClearTodos = () => {
    console.log('Clearing all todos');
    send(id, { type: 'CLEAR_TODOS' });
  };

  return (
    <div className="component todo-list">
      <h2>Todo List ({id})</h2>
      <div className="add-todo">
        <input
          type="text"
          value={newTodo}
          onChange={(e) => setNewTodo(e.target.value)}
          placeholder="Add a todo..."
          onKeyDown={(e) => e.key === 'Enter' && handleAddTodo()}
        />
        <button onClick={handleAddTodo}>Add</button>
      </div>
      
      {todos.length === 0 ? (
        <p className="empty">No todos yet</p>
      ) : (
        <ul className="todos">
          {todos.map((todo, index) => (
            <li key={index} className="todo-item">
              {todo}
              <button onClick={() => handleRemoveTodo(index)}>
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
      
      {todos.length > 0 && (
        <button 
          className="clear-all"
          onClick={handleClearTodos}
        >
          Clear All
        </button>
      )}
    </div>
  );
}

// Main App
function App() {
  return (
    <div className="app">
      <header>
        <h1>State Reactor Demo</h1>
        <p>A lightweight actor model for React</p>
      </header>
      
      <main>
        <div className="grid">
          <Counter id="counter1" />
          <RegistryViewer />
          <div className="messaging-container">
            <MessageSender />
            <div className="displays">
              <MessageDisplay id="display1" />
              <MessageDisplay id="display2" />
            </div>
          </div>
          <TodoList />
          <ThemeToggler />
        </div>
      </main>
      
      <footer>
        <p>
          State Reactor Demo - Actor model message passing for React
        </p>
      </footer>
    </div>
  );
}

export default App;