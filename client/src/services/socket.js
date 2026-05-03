import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

const socket = io(SOCKET_URL, {
  autoConnect: false,
  withCredentials: true,
  transports: ['websocket', 'polling'], // Try websocket first
  reconnectionAttempts: 3
});

socket.on('connect_error', (err) => {
  console.warn('Real-time connection failed (likely due to serverless limitations). Falling back to manual refresh.', err.message);
});

export default socket;
