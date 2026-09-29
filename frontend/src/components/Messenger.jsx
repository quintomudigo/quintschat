import { useEffect, useRef, useState } from 'react';
import ChatList from './ChatList.jsx';
import ContactsPanel from './ContactsPanel.jsx';
import StatusPanel from './StatusPanel.jsx';
import Conversation from './Conversation.jsx';
import NewGroupModal from './NewGroupModal.jsx';
import CallModal from './CallModal.jsx';

export default function Messenger({ user, socket, onLogout }) {
  const [tab, setTab] = useState('chats'); // chats | contacts | status
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [call, setCall] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState(new Set());

  const loadChats = async () => {
    try {
      const res = await fetch(`/api/chats/${user.id}`);
      const data = await res.json();
      setChats((prev) => mergeChats(prev, data.chats));
    } catch {}
  };

  useEffect(() => {
    loadChats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  useEffect(() => {
    if (!socket) return;
    const hUpdate = (chatId) => {
      if (chatId) loadChats();
    };
    const hMessage = (msg) => {
      loadChats();
    };
    const hPresence = ({ userId, online }) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        if (online) next.add(userId);
        else next.delete(userId);
        return next;
      });
    };
    const hCallIncoming = ({ from, call }) => setIncomingCall({ from, call });
    const hCallSignal = ({ signal }) => {
      setCall((c) => ({ ...c, remoteSignal: signal }));
    };
    socket.on('chat:update', hUpdate);
    socket.on('message:new', hMessage);
    socket.on('presence', hPresence);
    socket.on('call:incoming', hCallIncoming);
    socket.on('call:signal', hCallSignal);
    return () => {
      socket.off('chat:update', hUpdate);
      socket.off('message:new', hMessage);
      socket.off('presence', hPresence);
      socket.off('call:incoming', hCallIncoming);
      socket.off('call:signal', hCallSignal);
    };
  }, [socket, activeChatId]);

  const activeChat = chats.find((c) => c.id === activeChatId) || null;

  const openChat = (chat) => {
    setActiveChatId(chat.id);
    socket?.emit('join:chat', chat.id);
    setTab('chats');
  };

  const refreshUser = async () => {
    await loadChats();
  };

  return (
    <div className="messenger">
      <aside className="sidebar">
        <header className="sidebar-header">
          <div className="me" onClick={onLogout} title="Click to log out">
            <div className="avatar" style={{ backgroundColor: user.avatar_color || '#25d366' }}>
              {(user.name || user.phone_number || '?')[0].toUpperCase()}
            </div>
            <div className="me-info">
              <span className="me-name">{user.name || user.phone_number}</span>
              <span className="me-online">{onlineUsers.has(user.id) ? 'online' : 'offline'}</span>
            </div>
          </div>
          <button className="icon-btn" title="New group" onClick={() => setShowNewGroup(true)}>
            +
          </button>
        </header>

        <nav className="tabs">
          <button className={tab === 'chats' ? 'tab active' : 'tab'} onClick={() => setTab('chats')}>
            Chats
          </button>
          <button className={tab === 'contacts' ? 'tab active' : 'tab'} onClick={() => setTab('contacts')}>
            Contacts
          </button>
          <button className={tab === 'status' ? 'tab active' : 'tab'} onClick={() => setTab('status')}>
            Status
          </button>
        </nav>

        <div className="sidebar-body">
          {tab === 'chats' && (
            <ChatList chats={chats} activeChatId={activeChatId} onOpen={openChat} myId={user.id} />
          )}
          {tab === 'contacts' && (
            <ContactsPanel onOpen={openChat} excludeId={user.id} myId={user.id} onlineUsers={onlineUsers} />
          )}
          {tab === 'status' && <StatusPanel user={user} myId={user.id} onOpen={openChat} />}
        </div>
      </aside>

      <main className="chat-pane">
        {activeChat ? (
          <Conversation
            key={activeChat.id}
            chat={activeChat}
            user={user}
            socket={socket}
            onOpenChat={openChat}
            onlineUsers={onlineUsers}
            onCall={(call) => setCall(call)}
            refreshUser={refreshUser}
          />
        ) : (
          <div className="empty-pane">
            <div className="empty-logo">Q</div>
            <h2>quintschat</h2>
            <p>Select a chat to start messaging.</p>
          </div>
        )}
      </main>

      {showNewGroup && (
        <NewGroupModal
          onClose={() => setShowNewGroup(false)}
          created={(chat) => {
            setShowNewGroup(false);
            openChat(chat);
            loadChats();
          }}
          myId={user.id}
        />
      )}
      {call && <CallModal call={call} user={user} onClose={() => setCall(null)} />}
      {incomingCall && (
        <CallModal
          call={incomingCall.call}
          incomingFrom={incomingCall.from}
          user={user}
          socket={socket}
          onClose={() => setIncomingCall(null)}
        />
      )}
    </div>
  );
}

function mergeChats(prev, next) {
  const map = new Map();
  for (const c of prev) map.set(c.id, c);
  for (const c of next) map.set(c.id, c);
  return [...map.values()].sort(
    (a, b) => new Date(b.lastMessage?.created_at) - new Date(a.lastMessage?.created_at)
  );
}