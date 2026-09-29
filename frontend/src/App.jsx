import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import Login from './components/Login.jsx';
import Messenger from './components/Messenger.jsx';

export default function App() {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('quintschat_user');
    return raw ? JSON.parse(raw) : null;
  });
  const [seeding, setSeeding] = useState(false);
  const [seeded, setSeeded] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    if (!socketRef.current) {
      socketRef.current = io();
      socketRef.current.on('connect', () => {
        socketRef.current.emit('identity', { userId: user.id });
      });
    }
  }, [user]);

  // Ensure demo contacts exist so there's someone to chat with
  useEffect(() => {
    if (seeded) return;
    fetch('/api/seed', { method: 'POST' })
      .then(() => setSeeded(true))
      .catch(() => setSeeded(true));
  }, [seeded]);

  const handleLogin = (u) => {
    localStorage.setItem('quintschat_user', JSON.stringify(u));
    setUser(u);
  };

  const handleLogout = () => {
    localStorage.removeItem('quintschat_user');
    socketRef.current?.disconnect();
    socketRef.current = null;
    setUser(null);
  };

  if (!user) {
    return (
      <div className="app-root">
        <Login onLogin={handleLogin} />
      </div>
    );
  }

  return (
    <div className="app-root">
      <Messenger user={user} socket={socketRef.current} onLogout={handleLogout} />
    </div>
  );
}