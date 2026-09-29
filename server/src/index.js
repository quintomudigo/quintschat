import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { Store } from './store.js';
import { registerSocketHandlers } from './socket.js';

const PORT = process.env.PORT || 8080;

export const store = new Store();

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: true, credentials: true },
});

registerSocketHandlers(io);

// --- HTTP API ---
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// Register / login by phone number
app.post('/api/register', (req, res) => {
  const { phoneNumber, name } = req.body || {};
  if (!phoneNumber) return res.status(400).json({ error: 'Phone number is required' });
  const user = store.upsertUser(phoneNumber, name);
  res.json({ user });
});

// List all users (contacts directory)
app.get('/api/user/all', (_req, res) => {
  res.json({ users: store.listUsers() });
});

// Look up a contact by phone number
app.get('/api/user/:phoneNumber', (req, res) => {
  const user = store.findUserByPhone(req.params.phoneNumber);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user });
});

// Get or create an individual chat between two users
app.post('/api/chats/individual', (req, res) => {
  const { userId, otherId } = req.body || {};
  if (!userId || !otherId) return res.status(400).json({ error: 'userId and otherId are required' });
  const chatId = store.getOrCreateIndividualChat(Number(userId), Number(otherId));
  const chatWithMeta = store.getChatsForUser(Number(userId)).find((c) => c.id === chatId);
  res.json({ chat: chatWithMeta });
});

// Create a group chat
app.post('/api/groups', (req, res) => {
  const { name, memberIds, createdBy } = req.body || {};
  if (!name || !createdBy) return res.status(400).json({ error: 'name and createdBy are required' });
  const chatId = store.createGroup(name, memberIds || [], Number(createdBy));
  const chat = store.getChatsForUser(Number(createdBy)).find((c) => c.id === chatId);
  res.json({ chat });
});

// Set a user's status
app.post('/api/status', (req, res) => {
  const { userId, status } = req.body || {};
  if (!userId || !status) return res.status(400).json({ error: 'userId and status are required' });
  store.setStatus(Number(userId), status);
  res.json({ ok: true });
});

// List a user's chats with latest message + participants
app.get('/api/chats/:userId', (req, res) => {
  const chats = store.getChatsForUser(Number(req.params.userId));
  res.json({ chats });
});

// Messages for a chat
app.get('/api/chats/:chatId/messages', (req, res) => {
  const messages = store.getMessages(Number(req.params.chatId));
  res.json({ messages });
});

// Seed demo contacts so the app has someone to chat with
app.post('/api/seed', (_req, res) => {
  const created = store.seedDemoUsers();
  res.json({ created });
});

server.listen(PORT, () => {
  console.log(`quintschat server listening on http://0.0.0.0:${PORT}`);
});