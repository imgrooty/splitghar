# Splitghar 💸

Splitghar is a premium, full-stack group expense manager designed to simplify shared spending. It features a smart debt simplification algorithm and integrates digital wallet settlements with mock gift card rewards.

## ✨ Features

- **Dynamic Dashboard**: Real-time "You Owe" and "You're Owed" balances.
- **Group Management**: Create groups and manage expenses with friends.
- **Flexible Splitting**: Split by Equal amount, Custom amounts, or Percentages.
- **Debt Simplification**: Minimized settlements using a greedy matching algorithm.
- **Settle Up Hub**: Support for UPI, Wallet, and Gift Card settlements (with mock vouchers).
- **Premium UI**: Modern navy and mint green aesthetic built with Tailwind CSS v3.
- **Connections**: Social layer to search and add friends via email.

---

## 🛠️ Tech Stack

- **Frontend**: React, Tailwind CSS, Lucide Icons, Sonner (Toasts), Zustand (State), Framer Motion.
- **Backend**: Node.js, Express.
- **Database**: PostgreSQL (SQLite used for local development), Prisma ORM.
- **Real-time**: Socket.io.
- **Auth**: JWT-based authentication.

---

## 🚀 Local Setup

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### 1. Clone the Repository
```bash
git clone <your-repo-url>
cd splitghar
```

### 2. Backend Setup
```bash
cd server
npm install
```

**Environment Variables**:
Create a `.env` file in the `server` directory:
```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="your_super_secret_key"
PORT=5000
```

**Database Migration & Seeding**:
```bash
npx prisma migrate dev --name init
npm run seed
```

### 3. Frontend Setup
```bash
cd ../client
npm install
```

---

## 🏃‍♂️ Running the App

### Start Backend
```bash
cd server
npm run dev
```
The server will start at `http://localhost:5000`.

### Start Frontend
```bash
cd client
npm run dev
```
The app will be available at `http://localhost:5173` (or the next available port).

---

## 🧪 Demo Data
You can log in with any of the following pre-seeded accounts (Password: `demo1234`):
- `alice@demo.com`
- `bob@demo.com`
- `carol@demo.com`

---

## 🚢 Deployment

### Backend (e.g., Render, Railway, Heroku)
1. Set the `DATABASE_URL` to a hosted PostgreSQL instance.
2. Run `npx prisma migrate deploy` in your build command.
3. Set `JWT_SECRET` and `PORT` environment variables.
4. Ensure the frontend URL is added to CORS settings in `server/index.js`.

### Frontend (e.g., Vercel, Netlify)
1. Update `client/src/services/api.js` to point to your production backend URL.
2. Build the project:
   ```bash
   npm run build
   ```
3. Deploy the resulting `dist` folder.

---

## 📄 License
MIT License. Created by Antigravity AI.
