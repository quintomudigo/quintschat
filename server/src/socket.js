import { store } from './index.js';

export function registerSocketHandlers(io) {
  // Map userId -> set of socket ids
  const online = new Map();

  io.on('connection', (socket) => {
    socket.on('identity', ({ userId }) => {
      if (!userId) return;
      socket.data.userId = userId;
      if (!online.has(userId)) online.set(userId, new Set());
      online.get(userId).add(socket.id);
      socket.join(`user:${userId}`);
      socket.broadcast.emit('presence', { userId, online: true });
    });

    socket.on('send:message', (payload, ack) => {
      const { chatId, senderId, type, body, mediaUrl } = payload || {};
      if (!chatId) return;
      const chat = store.getChat(Number(chatId));
      if (!chat) return;
      const message = store.addMessage({
        chatId: Number(chatId),
        senderId: Number(senderId),
        type: type || 'text',
        body,
        mediaUrl,
      });
      const room = `chat:${chatId}`;
      socket.join(room);
      io.to(room).emit('message:new', message);
      // notify group/participant rooms of a refresh
      const participants = store.getChatParticipants(chat.id);
      for (const p of participants) io.to(`user:${p.id}`).emit('chat:update', Number(chatId));
      if (ack) ack({ ok: true, message });
    });

    socket.on('join:chat', (chatId) => {
      if (chatId) socket.join(`chat:${chatId}`);
    });

    socket.on('typing', ({ chatId, userId, name }) => {
      socket.to(`chat:${chatId}`).emit('typing', { chatId, userId, name });
    });

    // Calling signals (WebRTC offer/answer/ice relayed through server)
    socket.on('call:signal', ({ to, signal }) => {
      const recipient = store.findUserById(to);
      if (recipient && online.has(to)) {
        io.to(`user:${to}`).emit('call:signal', { from: socket.data.userId, signal });
      }
    });

    socket.on('call:start', ({ to, call }) => {
      io.to(`user:${to}`).emit('call:incoming', { from: socket.data.userId, call });
    });

    socket.on('disconnect', () => {
      const userId = socket.data.userId;
      if (userId && online.has(userId)) {
        online.get(userId).delete(socket.id);
        if (online.get(userId).size === 0) {
          online.delete(userId);
          socket.broadcast.emit('presence', { userId, online: false });
        }
      }
    });
  });
}