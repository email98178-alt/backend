const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Permitir todas as origens para desenvolvimento. Em produção, especifique a URL do seu frontend.
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

// Servir arquivos estáticos do frontend
app.use(express.static('public'));

// Armazenamento simples de usuários e mensagens (em memória para este exemplo)
const users = {}; // { userId: socket.id }
const messages = []; // [{ userId, text, sender, timestamp }]

io.on('connection', (socket) => {
  console.log(`Usuário conectado: ${socket.id}`);

  socket.on('join', ({ userId, isAdmin }) => {
    users[userId] = socket.id;
    socket.join(userId); // Cada usuário tem sua própria sala
    console.log(`${isAdmin ? 'Admin' : 'Usuário'} ${userId} entrou.`);

    // Se for um admin, ele pode querer ver todos os chats ativos
    if (isAdmin) {
      socket.join('admins');
      // Enviar histórico de mensagens para o admin (opcional, dependendo da complexidade)
      socket.emit('chat_history', messages);
    }
  });

  socket.on('send_message', (data) => {
    const { userId, text, sender } = data;
    const message = { userId, text, sender, timestamp: new Date().toISOString() };
    messages.push(message);
    console.log(`Mensagem de ${sender} (${userId}): ${text}`);

    // Enviar para o próprio usuário
    io.to(users[userId]).emit('receive_message', message);

    // Enviar para todos os admins (para monitoramento)
    io.to('admins').emit('new_message_for_admin', message);
  });

  socket.on('disconnect', () => {
    console.log(`Usuário desconectado: ${socket.id}`);
    // Remover usuário da lista (opcional, dependendo da lógica de reconexão)
    for (const userId in users) {
      if (users[userId] === socket.id) {
        delete users[userId];
        break;
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`Servidor Socket.IO rodando na porta ${PORT}`);
});
