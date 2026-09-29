export default function ChatList({ chats, activeChatId, onOpen, myId }) {
  if (chats.length === 0) {
    return <div className="list-empty">No chats yet. Open the Contacts tab to start one.</div>;
  }
  return (
    <ul className="chat-list">
      {chats.map((chat) => {
        const last = chat.lastMessage;
        const preview =
          last && last.type !== 'text'
            ? `[${last.type}]`
            : last && last.sender_id === myId
              ? `You: ${(last.body || '').slice(0, 40)}`
              : last?.body?.slice(0, 40);
        return (
          <li
            key={chat.id}
            className={chat.id === activeChatId ? 'chat-item active' : 'chat-item'}
            onClick={() => onOpen(chat)}
          >
            <GroupAvatar chat={chat} myId={myId} />
            <div className="chat-item-body">
              <span className="chat-item-title">{chat.title}</span>
              <span className="chat-item-preview">{preview || 'No messages yet'}</span>
            </div>
            {chat.type === 'group' && (
              <span className="chat-item-meta">{chat.participantCount}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function GroupAvatar({ chat, myId, size = 44 }) {
  const users = chat.participants || [];
  const others = users.filter((u) => u.id !== myId);
  const display = chat.type === 'group' ? users.slice(0, 2) : others.slice(0, 1);
  return (
    <div className="group-avatar" style={{ width: size, height: size }}>
      {display.map((u, i) => (
        <div
          key={u.id}
          className={`avatar mini a${i}`}
          style={{ backgroundColor: u.avatar_color || '#25d366' }}
        >
          {(u.name || u.phone_number || '?')[0].toUpperCase()}
        </div>
      ))}
      {display.length === 0 && (
        <div className="avatar mini a0" style={{ backgroundColor: '#bbb' }}>
          ?
        </div>
      )}
    </div>
  );
}