import { useEffect, useState } from 'react';

export default function CallModal({ call, user, incomingFrom, socket, onClose }) {
  const [state, setState] = useState(incomingFrom ? 'ringing' : 'calling');

  useEffect(() => {
    if (!socket || !incomingFrom) return;
    socket.emit('join:chat', call?.chatId);
    socket.emit('join:chat', `user:${incomingFrom}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const accept = () => {
    setState('connected');
    if (socket && incomingFrom) socket.emit('call:signal', { to: incomingFrom, signal: { answer: true } });
  };

  const callLabel =
    state === 'connected'
      ? 'Connected'
      : state === 'ringing'
        ? 'Incoming call'
        : call?.type === 'video'
          ? 'Video call…'
          : 'Voice call';

  const icon = call?.type === 'video' ? '🎥' : '📞';

  return (
    <div className="call-overlay">
      <div className="call-card">
        <div className="call-icon">{icon}</div>
        <h3>{callLabel}</h3>
        <p className="call-sub">{incomingFrom || call?.chatId ? 'Connecting…' : callLabel}</p>
        {state === 'ringing' ? (
          <div className="call-actions">
            <button className="call-btn decline" onClick={onClose}>Decline</button>
            <button className="call-btn accept" onClick={accept}>Accept</button>
          </div>
        ) : (
          <div className="call-actions">
            <button className="call-btn decline big" onClick={onClose}>End</button>
          </div>
        )}
      </div>
    </div>
  );
}