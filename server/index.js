const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('./src/generated/prisma');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const ALLOWED_ORIGINS = [
  process.env.CLIENT_URL,
  'https://splitghar-client.vercel.app',
  'http://localhost:5173'
].filter(Boolean);

app.use(cors({
  origin: ALLOWED_ORIGINS.length > 0 ? ALLOWED_ORIGINS : "*",
  credentials: true
}));
app.use(express.json());

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'Splitghar API is running', version: '1.0.0' });
});

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

// Middleware to authenticate JWT
const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = await prisma.user.findUnique({ where: { id: decoded.id } });
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// --- Auth Routes ---
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, passwordHash }
    });
    const token = jwt.sign({ id: user.id }, JWT_SECRET);
    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    res.status(400).json({ error: 'Email already exists' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(400).json({ error: 'Invalid credentials' });
  }
  const token = jwt.sign({ id: user.id }, JWT_SECRET);
  res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
});

// --- Connections ---
app.get('/api/connections', authenticate, async (req, res) => {
  const connections = await prisma.connection.findMany({
    where: {
      OR: [{ requesterId: req.user.id }, { receiverId: req.user.id }]
    },
    include: { requester: true, receiver: true }
  });
  res.json(connections);
});

app.post('/api/connections/request', authenticate, async (req, res) => {
  const { email } = req.body;
  const targetUser = await prisma.user.findUnique({ where: { email } });
  if (!targetUser) return res.status(404).json({ error: 'User not found' });
  if (targetUser.id === req.user.id) return res.status(400).json({ error: 'Cannot connect with yourself' });

  const connection = await prisma.connection.create({
    data: {
      requesterId: req.user.id,
      receiverId: targetUser.id,
      status: 'pending'
    }
  });
  res.json(connection);
});

app.post('/api/connections/respond', authenticate, async (req, res) => {
  const { id, status } = req.body; // status: accepted/blocked/declined
  if (status === 'declined') {
    await prisma.connection.delete({ where: { id } });
    return res.json({ message: 'Request declined' });
  }
  const connection = await prisma.connection.update({
    where: { id },
    data: { status }
  });
  res.json(connection);
});

app.get('/api/users/search', authenticate, async (req, res) => {
  const { email } = req.query;
  const users = await prisma.user.findMany({
    where: { email: { contains: email } },
    take: 5
  });
  res.json(users);
});

// --- Groups ---
app.get('/api/groups', authenticate, async (req, res) => {
  const groups = await prisma.group.findMany({
    where: { members: { some: { userId: req.user.id } } },
    include: { members: { include: { user: true } }, expenses: true }
  });
  res.json(groups);
});

app.post('/api/groups', authenticate, async (req, res) => {
  const { name, memberIds } = req.body;
  const group = await prisma.group.create({
    data: {
      name,
      createdBy: req.user.id,
      members: {
        create: [...memberIds, req.user.id].map(id => ({ userId: id }))
      }
    },
    include: { members: { include: { user: true } } }
  });
  res.json(group);
});

app.get('/api/groups/:id', authenticate, async (req, res) => {
  const group = await prisma.group.findUnique({
    where: { id: req.params.id },
    include: {
      members: { include: { user: true } },
      expenses: { include: { payer: true, splits: true } },
      settlements: { include: { from: true, to: true } }
    }
  });
  
  if (!group) return res.status(404).json({ error: 'Group not found' });

  // Calculate simplified debts
  const settlements = simplifyDebts(
    group.members.map(m => m.user),
    group.expenses,
    group.expenses.flatMap(e => e.splits)
  );

  res.json({ ...group, simplifiedDebts: settlements });
});

// --- Expenses ---
app.post('/api/expenses', authenticate, async (req, res) => {
  const { groupId, description, amount, paidBy, splitType, splits } = req.body;
  const expense = await prisma.expense.create({
    data: {
      groupId,
      description,
      amount,
      paidBy,
      splitType,
      splits: {
        create: splits.map(s => ({ userId: s.userId, amountOwed: s.amountOwed }))
      }
    },
    include: { splits: true }
  });
  
  io.to(groupId).emit('balance_update', { groupId });
  res.json(expense);
});

// --- Settlements ---
app.post('/api/settlements', authenticate, async (req, res) => {
  const { fromUser, toUser, groupId, amount, method } = req.body;
  const settlement = await prisma.settlement.create({
    data: {
      fromUser,
      toUser,
      groupId,
      amount,
      method,
      status: 'completed'
    }
  });

  io.to(groupId).emit('balance_update', { groupId });
  res.json(settlement);
});

// --- Dashboard Stats ---
app.get('/api/dashboard/stats', authenticate, async (req, res) => {
  const userId = req.user.id;
  
  // Get all expenses where user is payer
  const expensesPaid = await prisma.expense.findMany({
    where: { paidBy: userId },
    include: { splits: true }
  });

  // Get all splits where user is debtor
  const splitsOwed = await prisma.expenseSplit.findMany({
    where: { userId: userId },
    include: { expense: true }
  });

  // Simple balance calculation for dashboard
  let youAreOwed = 0;
  expensesPaid.forEach(e => {
    e.splits.forEach(s => {
      if (s.userId !== userId) youAreOwed += s.amountOwed;
    });
  });

  let youOwe = 0;
  splitsOwed.forEach(s => {
    if (s.expense.paidBy !== userId) youOwe += s.amountOwed;
  });

  // Subtract completed settlements
  const settlementsSent = await prisma.settlement.findMany({ where: { fromUser: userId, status: 'completed' } });
  const settlementsRecv = await prisma.settlement.findMany({ where: { toUser: userId, status: 'completed' } });

  settlementsSent.forEach(s => youOwe -= s.amount);
  settlementsRecv.forEach(s => youAreOwed -= s.amount);

  res.json({ youOwe: Math.max(0, youOwe), youAreOwed: Math.max(0, youAreOwed) });
});

// --- Debt Simplification Algorithm ---
function simplifyDebts(members, expenses, splits) {
  const net = {};
  members.forEach(m => net[m.id] = 0);
  expenses.forEach(e => {
    net[e.paidBy] += e.amount;
  });
  splits.forEach(s => {
    net[s.userId] -= s.amountOwed;
  });

  const creditors = Object.entries(net).filter(([,v]) => v > 0.01).map(([id,v]) => ({id, amt: v}));
  const debtors = Object.entries(net).filter(([,v]) => v < -0.01).map(([id,v]) => ({id, amt: -v}));

  const settlements = [];
  let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const transfer = Math.min(debtors[i].amt, creditors[j].amt);
    settlements.push({ from: debtors[i].id, to: creditors[j].id, amount: transfer });
    debtors[i].amt -= transfer;
    creditors[j].amt -= transfer;
    if (debtors[i].amt < 0.01) i++;
    if (creditors[j].amt < 0.01) j++;
  }
  return settlements;
}

// --- Socket.io ---
io.on('connection', (socket) => {
  socket.on('join_group', (groupId) => {
    socket.join(groupId);
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!', details: err.message });
});

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
