require('dotenv').config();
const { PrismaClient } = require('../src/generated/prisma');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  // Clear existing data
  await prisma.settlement.deleteMany();
  await prisma.expenseSplit.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.groupMember.deleteMany();
  await prisma.group.deleteMany();
  await prisma.connection.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash('demo1234', 10);

  // 3 demo users
  const alice = await prisma.user.create({
    data: { name: 'Alice', email: 'alice@demo.com', passwordHash }
  });
  const bob = await prisma.user.create({
    data: { name: 'Bob', email: 'bob@demo.com', passwordHash }
  });
  const carol = await prisma.user.create({
    data: { name: 'Carol', email: 'carol@demo.com', passwordHash }
  });

  // 1 group "Goa Trip"
  const group = await prisma.group.create({
    data: {
      name: 'Goa Trip',
      createdBy: alice.id,
      members: {
        create: [
          { userId: alice.id },
          { userId: bob.id },
          { userId: carol.id }
        ]
      }
    }
  });

  // 1 pending connection request between alice and bob
  await prisma.connection.create({
    data: {
      requesterId: alice.id,
      receiverId: bob.id,
      status: 'pending'
    }
  });

  // 3 expenses
  // 1. Pizza - Alice paid 900, split equally
  await prisma.expense.create({
    data: {
      groupId: group.id,
      description: 'Pizza',
      amount: 900,
      paidBy: alice.id,
      splitType: 'equal',
      splits: {
        create: [
          { userId: alice.id, amountOwed: 300 },
          { userId: bob.id, amountOwed: 300 },
          { userId: carol.id, amountOwed: 300 }
        ]
      }
    }
  });

  // 2. Drinks - Bob paid 600, Alice owes 400, Carol owes 200
  await prisma.expense.create({
    data: {
      groupId: group.id,
      description: 'Drinks',
      amount: 600,
      paidBy: bob.id,
      splitType: 'custom',
      splits: {
        create: [
          { userId: alice.id, amountOwed: 400 },
          { userId: carol.id, amountOwed: 200 }
        ]
      }
    }
  });

  // 3. Taxi - Carol paid 300, split equally
  await prisma.expense.create({
    data: {
      groupId: group.id,
      description: 'Taxi',
      amount: 300,
      paidBy: carol.id,
      splitType: 'equal',
      splits: {
        create: [
          { userId: alice.id, amountOwed: 100 },
          { userId: bob.id, amountOwed: 100 },
          { userId: carol.id, amountOwed: 100 }
        ]
      }
    }
  });

  console.log('Seed data created successfully');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
