import { useEffect, useState } from 'react';

export default function StatusPanel({ user, myId, onOpen }) {
  const [contacts, setContacts] = useState([]);
  const [myStatus, setMyStatus] = useState('');

  useEffect(() => {
    fetch('/api/user/all')
      .then((r) => r.json())
      .then((d) => setContacts((d.users || []).filter((u) => u.id !== myId)))
      .catch(() => {});
  }, [myId]);

  const saveStatus = async () => {
    if (!myStatus.trim()) return;
    await fetch('/api/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: myId, status: myStatus.trim() }),
    });
    setMyStatus('');
  };

  const openContact = async (contact) => {
    try {
      const res = await fetch('/api/chats/individual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: myId, otherId: contact.id }),
      });
      const data = await res.json();
      if (data.chat) onOpen(data.chat);
    } catch {}
  };

  return (
    <div className="status-panel">
      <div className="status-row">
        <div className="avatar" style={{ backgroundColor: user.avatar_color || '#25d366' }}>
          {(user.name || '?')[0].toUpperCase()}
        </div>
        <div className="chat-item-body">
          <span className="chat-item-title">My status</span>
          <span className="chat-item-preview">Tap to update your status</span>
        </div>
      </div>
      <div className="status-edit">
        <input
          className="field-input"
          value={myStatus}
          onChange={(e) => setMyStatus(e.target.value)}
          placeholder="Share a status update…"
        />
        <button className="btn-primary small" onClick={saveStatus} disabled={!myStatus.trim()}>
          Post
        </button>
      </div>
      <h4 className="section-label">Recent updates</h4>
      <ul className="chat-list">
        {contacts.map((c) => (
          <li
            key={c.id}
            className="chat-item"
            onClick={() => openContact(c)}
          >
            <div className="avatar status-ring" style={{ backgroundColor: c.avatar_color || '#25d366' }}>
              {(c.name || '?')[0].toUpperCase()}
            </div>
            <div className="chat-item-body">
              <span className="chat-item-title">{c.name || c.phone_number}</span>
              <span className="chat-item-preview">{c.status || 'No status yet'}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}