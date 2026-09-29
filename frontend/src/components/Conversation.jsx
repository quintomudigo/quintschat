import { useEffect, useRef, useState } from 'react';
import { GroupAvatar } from './ChatList.jsx';

const MEDIA_TYPES = ['image', 'audio', 'video', 'document'];

export default function Conversation({ chat, user, socket, onlineUsers, onCall, onOpenChat }) {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [typingNames, setTypingNames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPicker, setShowPicker] = useState(false);
  const inputRef = useRef(null);

  const loadMessages = async () => {
    const res = await fetch(`/api/chats/${chat.id}/messages`);
    const data = await res.json();
    setMessages(data.messages || []);
    setLoading(false);
  };

  useEffect(() => {
    loadMessages();
    socket?.emit('join:chat', chat.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chat.id]);

  useEffect(() => {
    if (!socket) return;
    const hNew = (msg) => {
      if (msg.chat_id === chat.id) setMessages((m) => [...m, msg]);
    };
    const hTyping = ({ chatId, userId, name }) => {
      if (chatId !== chat.id || userId === user.id) return;
      setTypingNames((prev) => (prev.includes(name) ? prev : [...prev, name]));
      setTimeout(() => setTypingNames((prev) => prev.filter((n) => n !== name)), 2500);
    };
    socket.on('message:new', hNew);
    socket.on('typing', hTyping);
    return () => {
      socket.off('message:new', hNew);
      socket.off('typing', hTyping);
    };
  }, [socket, chat.id, user.id]);

  const scrollRef = useRef(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages.length]);

  const send = (type = 'text', body, mediaUrl) => {
    const text = (body ?? draft).trim();
    if (!text && type === 'text') return;
    socket?.emit(
      'send:message',
      { chatId: chat.id, senderId: user.id, type, body: text, mediaUrl },
      (ack) => {
        if (ack?.message) setMessages((m) => [...m, ack.message]);
      }
    );
    setDraft('');
    setShowPicker(false);
  };

  const handleTyping = (e) => {
    setDraft(e.target.value);
    socket?.emit('typing', { chatId: chat.id, userId: user.id, name: user.name });
  };

  const handleMedia = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Simulate a media attachment by reading as a data URL and sending as an image/document
    const reader = new FileReader();
    reader.onload = () => {
      const isImage = file.type.startsWith('image/');
      send(isImage ? 'image' : 'document', file.name, reader.result);
    };
    reader.readAsDataURL(file);
  };

  const otherUsers = (chat.participants || []).filter((p) => p.id !== user.id);
  const title = chat.type === 'group' ? chat.title : otherUsers[0]?.name || chat.title;
  const anyoneOnline = otherUsers.some((u) => onlineUsers.has(u.id));

  return (
    <div className="conversation">
      <header className="conv-header">
        <GroupAvatar chat={chat} myId={user.id} size={36} />
        <div className="conv-title">
          <span className="conv-name">{title}</span>
          <span className="conv-sub">
            {chat.type === 'group'
              ? `${chat.participantCount || otherUsers.length + 1} members`
              : anyoneOnline
                ? 'online'
                : 'offline'}
          </span>
        </div>
        <button className="icon-btn" title="Start voice call" onClick={() => onCall({ type: 'audio', chatId: chat.id })}>
          &#128222;
        </button>
        <button className="icon-btn" title="Start video call" onClick={() => onCall({ type: 'video', chatId: chat.id })}>
          &#128249;
        </button>
      </header>

      <div className="messages" ref={scrollRef}>
        {loading ? (
          <div className="list-empty">Loading…</div>
        ) : messages.length === 0 ? (
          <div className="list-empty">No messages yet. Say hello!</div>
        ) : (
          messages.map((m) => <Bubble key={m.id} m={m} mine={m.sender_id === user.id} />)
        )}
      </div>

      <footer className="composer">
        <input
          ref={inputRef}
          className="composer-input"
          value={draft}
          onChange={handleTyping}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Type a message"
        />
        <input type="file" id="media-file" hidden onChange={handleMedia} />
        <button className="icon-btn" title="Attach media" onClick={() => document.getElementById('media-file').click()}>
          +
        </button>
        <button className="btn-primary small" onClick={() => send()} disabled={!draft.trim()}>
          Send
        </button>
      </footer>
      {typingNames.length > 0 && <div className="typing-indicator">{typingNames.join(', ')} typing…</div>}
    </div>
  );
}

function Bubble({ m, mine }) {
  const showMedia =
    m.type !== 'text' && m.media_url && (m.type === 'image');
  return (
    <div className={mine ? 'bubble mine' : 'bubble'}>
      {m.type === 'image' && m.media_url ? (
        <img className="bubble-image" src={m.media_url} alt="attachment" />
      ) : m.type !== 'text' ? (
        <div className="bubble-file">📎 {m.body || m.type}</div>
      ) : (
        <span>{m.body}</span>
      )}
      <span className="bubble-time">{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
    </div>
  );
}