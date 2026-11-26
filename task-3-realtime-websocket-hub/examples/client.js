// Run with TOKEN set to a JWT signed using the server JWT_SECRET.
const { io } = require('socket.io-client');
const socket = io('http://localhost:4100', { auth: { token: process.env.TOKEN } });
socket.on('connect_error', err => console.error('Connection error:', err.message));
socket.on('hub:ready', info => {
  console.log('Connected:', info);
  socket.emit('room:join', { room: 'general' }, result => {
    console.log('Join:', result);
    if (result.ok) socket.emit('chat:message', { room: 'general', message: 'Hello from the client!' }, console.log);
  });
});
socket.on('chat:message', message => console.log('New message:', message));
