import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import useAuthStore from './store/authStore';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Connections from './pages/Connections';
import Groups from './pages/Groups';
import GroupDetail from './pages/GroupDetail';
import SettleUp from './pages/SettleUp';
import Balances from './pages/Balances';

// Components
import Navbar from './components/Navbar';

const ProtectedRoute = ({ children }) => {
  const { token } = useAuthStore();
  return token ? children : <Navigate to="/login" />;
};

function App() {
  const { token } = useAuthStore();

  return (
    <Router>
      <div className="min-h-screen bg-surface">
        {token && <Navbar />}
        <main className={`${token ? 'max-w-7xl mx-auto px-4 py-8' : ''}`}>
          <Routes>
            <Route path="/login" element={!token ? <Login /> : <Navigate to="/" />} />
            <Route path="/register" element={!token ? <Register /> : <Navigate to="/" />} />
            
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/connections" element={<ProtectedRoute><Connections /></ProtectedRoute>} />
            <Route path="/groups" element={<ProtectedRoute><Groups /></ProtectedRoute>} />
            <Route path="/groups/:id" element={<ProtectedRoute><GroupDetail /></ProtectedRoute>} />
            <Route path="/settle" element={<ProtectedRoute><SettleUp /></ProtectedRoute>} />
            <Route path="/balances" element={<ProtectedRoute><Balances /></ProtectedRoute>} />
          </Routes>
        </main>
        <Toaster position="bottom-right" richColors />
      </div>
    </Router>
  );
}

export default App;
