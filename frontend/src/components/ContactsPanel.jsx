import { useEffect, useState } from 'react';

export default function ContactsPanel({ onOpen, excludeId, onlineUsers, myId }) {
  const [contacts, setContacts] = useState([]);

  useEffect(() => {
    fetch('/api/user/all')
      .then((r) => r.json())
      .then((d) => setContacts((d.users || []).filter((u) => u.id !== excludeId)))
      .catch(() => {});
  }, [excludeId]);

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
    <div>
      <ul className="chat-list">
        {contacts.map((c) => (
          <li key={c.id} className="chat-item" onClick={() => openContact(c)}>
            <div className="avatar" style={{ backgroundColor: c.avatar_color || '#25d366' }}>
              {(c.name || c.phone_number || '?')[0].toUpperCase()}
            </div>
            <div className="chat-item-body">
              <span className="chat-item-title">{c.name || c.phone_number}</span>
              <span className="chat-item-preview">{c.phone_number}</span>
            </div>
            <span className={onlineUsers.has(c.id) ? 'online-dot' : 'offline-dot'} />
          </li>
        ))}
      </ul>
    </div>
  );
}