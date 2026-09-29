import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const outputDir = process.env.DATA_DIR || path.join(import.meta.dirname, '../data');
fs.mkdirSync(outputDir, { recursive: true });
const dbFile = process.env.DB_FILE || path.join(outputDir, 'quintschat.db');

export class Store {
  constructor() {
    this.db = new Database(dbFile);
    this.db.pragma('journal_mode = WAL');
    this._migrate();
    this.seedDemoUsers();
  }

  _migrate() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phone_number TEXT UNIQUE NOT NULL,
        name TEXT,
        avatar_color TEXT,
        status TEXT DEFAULT '',
        created_at TEXT DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS chats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,              -- 'individual' | 'group'
        name TEXT,                       -- group name (null for individual)
        created_by INTEGER,
        created_at TEXT DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS chat_participants (
        chat_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        PRIMARY KEY (chat_id, user_id),
        FOREIGN KEY (chat_id) REFERENCES chats(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chat_id INTEGER NOT NULL,
        sender_id INTEGER NOT NULL,
        type TEXT DEFAULT 'text',        -- text | image | audio | video | document | status
        body TEXT,
        media_url TEXT,
        status TEXT DEFAULT 'sent',      -- sent | delivered | read
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (chat_id) REFERENCES chats(id),
        FOREIGN KEY (sender_id) REFERENCES users(id)
      );
    `);
  }

  // ---- Users ----
  upsertUser(phoneNumber, name) {
    const existing = this.findUserByPhone(phoneNumber);
    if (existing) {
      if (name) this.db.prepare('UPDATE users SET name = ? WHERE id = ?').run(name, existing.id);
      return this.findUserByPhone(phoneNumber);
    }
    const colors = ['#25d366', '#4f9cf9', '#f45b69', '#f9a825', '#8e24aa', '#00bcd4'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const info = this.db
      .prepare('INSERT INTO users (phone_number, name, avatar_color) VALUES (?, ?, ?)')
      .run(phoneNumber, name || phoneNumber, color);
    return this.findUserById(info.lastInsertRowid);
  }

  findUserByPhone(phoneNumber) {
    return this.db.prepare('SELECT * FROM users WHERE phone_number = ?').get(phoneNumber);
  }

  findUserById(id) {
    return this.db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  }

  listUsers() {
    return this.db.prepare('SELECT * FROM users ORDER BY name').all();
  }

  setStatus(userId, status) {
    this.db.prepare('UPDATE users SET status = ? WHERE id = ?').run(status, userId);
  }

  // ---- Chats ----
  getOrCreateIndividualChat(a, b) {
    const rows = this.db
      .prepare(
        `SELECT c.id FROM chats c
         JOIN chat_participants p1 ON p1.chat_id = c.id
         JOIN chat_participants p2 ON p2.chat_id = c.id
         WHERE c.type = 'individual'
           AND p1.user_id IN (?, ?) AND p2.user_id IN (?, ?)
           AND p1.user_id != p2.user_id
         GROUP BY c.id HAVING COUNT(DISTINCT p1.user_id) = 2`
      )
      .all(a, b, a, b);
    if (rows.length) return rows[0].id;
    const info = this.db.prepare("INSERT INTO chats (type) VALUES ('individual')").run();
    const chatId = info.lastInsertRowid;
    this.db
      .prepare('INSERT INTO chat_participants (chat_id, user_id) VALUES (?, ?)')
      .run(chatId, a);
    this.db
      .prepare('INSERT INTO chat_participants (chat_id, user_id) VALUES (?, ?)')
      .run(chatId, b);
    return chatId;
  }

  createGroup(name, memberIds, createdBy) {
    const info = this.db
      .prepare('INSERT INTO chats (type, name, created_by) VALUES (?, ?, ?)')
      .run('group', name, createdBy);
    const chatId = info.lastInsertRowid;
    const insert = this.db.prepare('INSERT INTO chat_participants (chat_id, user_id) VALUES (?, ?)');
    for (const id of new Set([...memberIds, createdBy])) insert.run(chatId, id);
    return chatId;
  }

  getChat(chatId) {
    return this.db.prepare('SELECT * FROM chats WHERE id = ?').get(chatId);
  }

  getChatParticipants(chatId) {
    return this.db
      .prepare(
        `SELECT u.* FROM users u
         JOIN chat_participants cp ON cp.user_id = u.id
         WHERE cp.chat_id = ?`
      )
      .all(chatId);
  }

  getChatsForUser(userId) {
    const chats = this.db
      .prepare(
        `SELECT c.* FROM chats c
         JOIN chat_participants cp ON cp.chat_id = c.id
         WHERE cp.user_id = ?
         ORDER BY (SELECT MAX(created_at) FROM messages m WHERE m.chat_id = c.id) DESC`
      )
      .all(userId);
    return chats.map((c) => {
      const participants = this.getChatParticipants(c.id);
      const otherUsers = participants.filter((p) => p.id !== userId);
      const title =
        c.type === 'group'
          ? c.name
          : otherUsers.map((u) => u.name || u.phone_number).join(', ');
      const lastMessage = this.db
        .prepare('SELECT * FROM messages WHERE chat_id = ? ORDER BY id DESC LIMIT 1')
        .get(c.id);
      return {
        ...c,
        title,
        participantCount: participants.length,
        participants,
        lastMessage: lastMessage || null,
      };
    });
  }

  // ---- Messages ----
  addMessage({ chatId, senderId, type = 'text', body, mediaUrl, status = 'sent' }) {
    const info = this.db
      .prepare(
        'INSERT INTO messages (chat_id, sender_id, type, body, media_url, status) VALUES (?, ?, ?, ?, ?, ?)'
      )
      .run(chatId, senderId, type, body, mediaUrl, status);
    return this.db.prepare('SELECT * FROM messages WHERE id = ?').get(info.lastInsertRowid);
  }

  getMessages(chatId) {
    return this.db
      .prepare('SELECT * FROM messages WHERE chat_id = ? ORDER BY id ASC')
      .all(chatId);
  }

  // ---- Demo data ----
  seedDemoUsers() {
    const demos = [
      { phone: '+254700123456', name: 'Amani Ochieng' },
      { phone: '+254700111222', name: 'Wanjiku Maina' },
      { phone: '+254700333444', name: 'Kiprop Tanui' },
      { phone: '+254700555666', name: 'Zawadi Njeri' },
    ];
    const created = [];
    for (const d of demos) {
      created.push(this.upsertUser(d.phone, d.name));
    }
    return created;
  }
}