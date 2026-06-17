const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Armazena chats ativos (em memória para este exemplo)
const activeChats = {};

io.on('connection', (socket) => {
  console.log('Novo usuário conectado:', socket.id);

  // Cliente se identifica (pode ser o usuário final ou o admin)
  socket.on('join', (data) => {
    const { userId, isAdmin } = data;
    socket.userId = userId;
    socket.isAdmin = isAdmin;

    if (isAdmin) {
      socket.join('admin-room');
      // Envia lista de chats ativos para o admin
      socket.emit('active_chats', activeChats);
    } else {
      socket.join(userId);
      if (!activeChats[userId]) {
        activeChats[userId] = {
          id: userId,
          messages: [],
          lastUpdate: Date.now()
        };
      }
      // Notifica admins sobre novo chat
      io.to('admin-room').emit('chat_started', activeChats[userId]);
    }
  });

  // Envio de mensagem
  socket.on('send_message', (data) => {
    const { userId, text, sender } = data;
    const message = {
      text,
      sender,
      timestamp: Date.now()
    };

    if (activeChats[userId]) {
      activeChats[userId].messages.push(message);
      activeChats[userId].lastUpdate = Date.now();
    }

    // Se for do usuário, envia para o admin
    // Se for do admin, envia para o usuário
    if (socket.isAdmin) {
      io.to(userId).emit('receive_message', message);
    } else {
      io.to('admin-room').emit('new_message', { userId, message });
    }
  });

  socket.on('disconnect', () => {
    console.log('Usuário desconectado:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
