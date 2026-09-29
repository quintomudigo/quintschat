import { useEffect, useState } from 'react';

export default function NewGroupModal({ onClose, created, myId }) {
  const [contacts, setContacts] = useState([]);
  const [selected, setSelected] = useState([]);
  const [name, setName] = useState('');

  useEffect(() => {
    fetch('/api/user/all')
      .then((r) => r.json())
      .then((d) => setContacts((d.users || []).filter((u) => u.id !== myId)))
      .catch(() => {});
  }, [myId]);

  const toggle = (id) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const create = async () => {
    if (!name.trim() || selected.length === 0) return;
    const res = await fetch('/api/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), memberIds: selected, createdBy: myId }),
    });
    const data = await res.json();
    if (data.chat) created(data.chat);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>New group</h3>
        <input
          className="field-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Group name"
          autoFocus
        />
        <h4 className="section-label">Add members</h4>
        <ul className="member-pick">
          {contacts.map((c) => (
            <li key={c.id} className={selected.includes(c.id) ? 'member-row selected' : 'member-row'} onClick={() => toggle(c.id)}>
              <span className="avatar mini" style={{ backgroundColor: c.avatar_color || '#25d366' }}>
                {(c.name || '?')[0].toUpperCase()}
              </span>
              <span className="chat-item-title">{c.name || c.phone_number}</span>
            </li>
          ))}
        </ul>
        <div className="modal-actions">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={create} disabled={!name.trim() || selected.length === 0}>
            Create ({selected.length})
          </button>
        </div>
      </div>
    </div>
  );
}