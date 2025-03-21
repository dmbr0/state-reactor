import React from 'react';
import { 
  useActor, 
  useGlobalActor, 
  useSender, 
  ActorComponent, 
  getRegistry, 
  getMailboxes 
} from './statereactor';
import './App.css';

// Registry Debug View
function RegistryViewer() {
  const [actors, setActors] = React.useState([]);
  const [expandedActor, setExpandedActor] = React.useState(null);
  
  // Update the actor list every second
  React.useEffect(() => {
    const updateActors = () => {
      const registry = getRegistry();
      const mailboxes = getMailboxes();
      
      // Create a more detailed actor list with mailbox info
      const actorsList = Array.from(registry.keys()).map(actorId => {
        const mailbox = mailboxes.get(actorId);
        return {
          id: actorId,
          queueSize: mailbox?.queue.length || 0,
          autoProcess: mailbox?.autoProcess || false,
          processInterval: mailbox?.processInterval || 0,
          type: actorId.startsWith('global:') ? 'global' : 
                actorId.startsWith('counter') ? 'counter' :
                actorId.startsWith('display') ? 'display' :
                actorId.startsWith('sender') ? 'sender' :
                actorId === 'todos' ? 'todos' : 'other'
        };
      });
      
      // Sort actors by type and then by ID
      actorsList.sort((a, b) => {
        if (a.type !== b.type) {
          // Order by type: global, counter, display, todos, sender, other
          const typeOrder = { 'global': 0, 'counter': 1, 'display': 2, 'todos': 3, 'sender': 4, 'other': 5 };
          return typeOrder[a.type] - typeOrder[b.type];
        }
        return a.id.localeCompare(b.id);
      });
      
      setActors(actorsList);
    };
    
    // Update immediately and set interval
    updateActors();
    const interval = setInterval(updateActors, 500);
    
    return () => clearInterval(interval);
  }, []);
  
  const toggleActorDetails = (actorId) => {
    if (expandedActor === actorId) {
      setExpandedActor(null);
    } else {
      setExpandedActor(actorId);
    }
  };
  
  return (
    <div className="component registry-viewer">
      <h2>Registry Viewer</h2>
      <p>Total actors: {actors.length}</p>
      <div className="registry-list">
        <h3>Registered Actors:</h3>
        {actors.length > 0 ? (
          <ul>
            {actors.map((actor) => (
              <li 
                key={actor.id} 
                className={`actor-item ${actor.type}`}
                onClick={() => toggleActorDetails(actor.id)}
              >
                <div className="actor-header">
                  <span className="actor-id">{actor.id}</span>
                  <span className="actor-type-badge">{actor.type}</span>
                  {actor.queueSize > 0 && (
                    <span className="queue-badge">{actor.queueSize}</span>
                  )}
                </div>
                
                {expandedActor === actor.id && (
                  <div className="actor-details">
                    <div>Queue Size: {actor.queueSize}</div>
                    <div>Auto-Process: {actor.autoProcess ? 'On' : 'Off'}</div>
                    <div>Process Interval: {actor.processInterval}ms</div>
                  </div>
                )}
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

// Mailbox Controls Component
function MailboxControls({ actorId, mailbox, onProcess, onProcessAll, onConfigure }) {
  // Initialize state based on mailbox settings
  const [processingRate, setProcessingRate] = React.useState(mailbox.processInterval);
  const [isRealtime, setIsRealtime] = React.useState(mailbox.processInterval <= 5);
  
  // Update local state when mailbox settings change
  React.useEffect(() => {
    setProcessingRate(mailbox.processInterval);
    setIsRealtime(mailbox.processInterval <= 5);
  }, [mailbox.processInterval]);
  
  const handleAutoProcessToggle = () => {
    // When toggling auto-process, use the current processing rate
    onConfigure({ 
      autoProcess: !mailbox.autoProcess, 
      processInterval: isRealtime ? 1 : processingRate 
    });
  };
  
  const handleRateChange = (e) => {
    const newRate = parseInt(e.target.value, 10);
    setProcessingRate(newRate);
    setIsRealtime(false);
    // Don't apply changes immediately - wait for Apply button
  };
  
  const applyRateChange = () => {
    console.log(`Applying rate change to ${processingRate}ms`);
    onConfigure({ processInterval: processingRate });
  };
  
  const toggleRealtime = () => {
    const newIsRealtime = !isRealtime;
    setIsRealtime(newIsRealtime);
    
    // Set to 1ms for realtime or to the slider value for regular mode
    const newInterval = newIsRealtime ? 1 : processingRate;
    console.log(`Setting ${newIsRealtime ? 'realtime' : 'normal'} mode: ${newInterval}ms`);
    
    // Apply changes immediately when toggling realtime
    onConfigure({ processInterval: newInterval });
  };
  
  return (
    <div className="mailbox-controls">
      <div className="controls-row">
        <button onClick={onProcess} disabled={mailbox.queue.length === 0}>
          Process Next
        </button>
        <button onClick={onProcessAll} disabled={mailbox.queue.length === 0}>
          Process All ({mailbox.queue.length})
        </button>
      </div>
      <div className="controls-row auto-process">
        <div className="auto-process-header">
          <label>
            <input 
              type="checkbox" 
              checked={mailbox.autoProcess} 
              onChange={handleAutoProcessToggle}
            />
            Auto-Process
          </label>
          <label className="realtime-toggle">
            <input 
              type="checkbox"
              checked={isRealtime}
              onChange={toggleRealtime}
              disabled={!mailbox.autoProcess}
            />
            Realtime
          </label>
        </div>
        <div className="rate-control">
          <input 
            type="range" 
            min="10" 
            max="1000" 
            step="10" 
            value={processingRate} 
            onChange={handleRateChange}
            disabled={!mailbox.autoProcess || isRealtime}
          />
          <div className="rate-values">
            <span>Fast</span>
            <span>
              {isRealtime ? "1ms (Realtime)" : `${processingRate}ms`}
              {!isRealtime && (
                <button 
                  className="apply-btn" 
                  onClick={applyRateChange}
                  disabled={!mailbox.autoProcess || processingRate === mailbox.processInterval}
                  title={processingRate === mailbox.processInterval ? 'Already using this rate' : 'Apply this rate'}
                >
                  Apply
                </button>
              )}
            </span>
            <span>Slow</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Mailbox Viewer Component
function MailboxViewer({ actorId, mailbox, onProcess, onProcessAll, onConfigure }) {
  return (
    <div className="component mailbox-viewer">
      <h2>Mailbox: {actorId}</h2>
      <MailboxControls 
        actorId={actorId}
        mailbox={mailbox}
        onProcess={onProcess}
        onProcessAll={onProcessAll}
        onConfigure={onConfigure}
      />
      <div className="mailbox-messages">
        <h3>Message Queue: {mailbox.queue.length} message(s)</h3>
        {mailbox.queue.length > 0 ? (
          <ul>
            {mailbox.queue.map((message, index) => (
              <li key={index} className="message-item">
                <div className="message-type">{message.type}</div>
                {message.payload !== undefined && (
                  <div className="message-payload">
                    Payload: {typeof message.payload === 'object' 
                      ? JSON.stringify(message.payload) 
                      : String(message.payload)}
                  </div>
                )}
                <div className="message-sender">From: {message.sender}</div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty">Queue is empty</p>
        )}
      </div>
    </div>
  );
}

// Counter Component using persistent actor
function Counter() {
  // Get the persistent counter actor
  const { counterActor } = usePersistentActors();
  const { 
    state: count, 
    send, 
    id: actorId,
    mailbox,
    processNextMessage,
    processAllMessages,
    configureMailbox 
  } = counterActor;

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
    <div className="counter-container">
      <div className="component counter compact">
        <h3>Counter ({actorId})</h3>
        <p className="value">{count}</p>
        <div className="controls counter-buttons">
          <button className="counter-button" onClick={handleIncrement}>+</button>
          <button className="counter-button" onClick={handleDecrement}>-</button>
          <button className="counter-button" onClick={handleReset}>Reset</button>
        </div>
      </div>
      
      <MailboxViewer 
        actorId={actorId}
        mailbox={mailbox}
        onProcess={processNextMessage}
        onProcessAll={processAllMessages}
        onConfigure={configureMailbox}
      />
    </div>
  );
}

// Message Display Component
function MessageDisplay({ displayId }) {
  // Get the persistent display actor
  const { display1Actor, display2Actor } = usePersistentActors();
  const displayActor = displayId === "display1" ? display1Actor : display2Actor;
  
  const { 
    state: messages, 
    id: actorId,
    mailbox,
    processNextMessage,
    processAllMessages,
    configureMailbox 
  } = displayActor;

  return (
    <div className="message-display-container">
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
      
      <MailboxViewer 
        actorId={actorId}
        mailbox={mailbox}
        onProcess={processNextMessage}
        onProcessAll={processAllMessages}
        onConfigure={configureMailbox}
      />
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

  const { 
    state: theme, 
    send, 
    id,
    mailbox,
    processNextMessage,
    processAllMessages,
    configureMailbox 
  } = useGlobalActor(
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
    <div className="theme-container">
      <div className="component theme-toggler">
        <h2>Theme Control ({id})</h2>
        <p>Current theme: {theme}</p>
        <button onClick={toggleTheme}>
          Toggle Theme
        </button>
      </div>
      
      <MailboxViewer 
        actorId={id}
        mailbox={mailbox}
        onProcess={processNextMessage}
        onProcessAll={processAllMessages}
        onConfigure={configureMailbox}
      />
    </div>
  );
}

// Todo List Component - Using persistent actor
function TodoList() {
  const [newTodo, setNewTodo] = React.useState('');

  // Get the persistent todo actor
  const { todoActor } = usePersistentActors();
  const { 
    state: todos, 
    send, 
    id,
    mailbox,
    processNextMessage,
    processAllMessages,
    configureMailbox
  } = todoActor;

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
    <div className="todo-container">
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
      
      <MailboxViewer 
        actorId={id}
        mailbox={mailbox}
        onProcess={processNextMessage}
        onProcessAll={processAllMessages}
        onConfigure={configureMailbox}
      />
    </div>
  );
}

// Tabs Component
function Tabs() {
  const [activeTab, setActiveTab] = React.useState('counter');
  
  const tabs = [
    { id: 'counter', label: 'Counter' },
    { id: 'messaging', label: 'Messaging' },
    { id: 'todos', label: 'Todo List' },
  ];
  
  return (
    <div className="tabs-container">
      <div className="tabs-header">
        {tabs.map(tab => (
          <button 
            key={tab.id}
            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      
      <div className="tab-content">
        {activeTab === 'counter' && (
          <div className="grid">
            <Counter />
            <div className="sidebar">
              <RegistryViewer />
              <ThemeToggler />
            </div>
          </div>
        )}
        
        {activeTab === 'messaging' && (
          <div className="grid">
            <div className="messaging-section">
              <MessageSender />
              <div className="displays-container">
                <MessageDisplay displayId="display1" />
                <MessageDisplay displayId="display2" />
              </div>
            </div>
            <div className="sidebar">
              <RegistryViewer />
              <ThemeToggler />
            </div>
          </div>
        )}
        
        {activeTab === 'todos' && (
          <div className="grid">
            <TodoList />
            <div className="sidebar">
              <RegistryViewer />
              <ThemeToggler />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Persistent Actors Wrapper
function PersistentActors({ children }) {
  // Create persistent Counter actor
  const counterActor = useActor(
    "counter1",
    0,
    (state, message) => {
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
    }
  );
  
  // Create persistent Display actors
  const display1Actor = useActor(
    "display1",
    [],
    (state, message) => {
      console.log("MessageDisplay1 handler called with:", message);
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
    }
  );
  
  const display2Actor = useActor(
    "display2",
    [],
    (state, message) => {
      console.log("MessageDisplay2 handler called with:", message);
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
    }
  );
  
  // Create persistent TodoList actor
  const todoActor = useActor(
    "todos",
    [],
    (state, message) => {
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
    }
  );
  
  // Make actors available to all children through React context
  const actorsContext = {
    counterActor,
    display1Actor,
    display2Actor,
    todoActor
  };
  
  return (
    <ActorsContext.Provider value={actorsContext}>
      {children}
    </ActorsContext.Provider>
  );
}

// Create context for sharing actors
const ActorsContext = React.createContext({});

// Custom hook to use persistent actors
function usePersistentActors() {
  return React.useContext(ActorsContext);
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
        <PersistentActors>
          <Tabs />
        </PersistentActors>
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