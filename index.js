const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'messages.json');

// Carregar mensagens do arquivo se existir
let messages = [];
if (fs.existsSync(DATA_FILE)) {
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    messages = JSON.parse(data);
    console.log(`Carregadas ${messages.length} mensagens do arquivo.`);
  } catch (err) {
    console.error('Erro ao carregar mensagens:', err);
    messages = [];
  }
}

function saveMessages() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(messages, null, 2));
  } catch (err) {
    console.error('Erro ao salvar mensagens:', err);
  }
}

app.use(express.static('public'));

const users = {}; 

io.on('connection', (socket) => {
  console.log(`Usuário conectado: ${socket.id}`);

  socket.on('join', ({ userId, isAdmin }) => {
    users[userId] = socket.id;
    socket.join(userId);
    console.log(`${isAdmin ? 'Admin' : 'Usuário'} ${userId} entrou.`);

    if (isAdmin) {
      socket.join('admins');
      // Enviar todo o histórico para o admin ao conectar
      socket.emit('chat_history', messages);
    }
  });

  socket.on('send_message', (data) => {
    const { userId, text, sender } = data;
    const message = { userId, text, sender, timestamp: new Date().toISOString() };
    messages.push(message);
    saveMessages();
    
    console.log(`Mensagem de ${sender} (${userId}): ${text}`);

    // Enviar para o usuário destino
    io.to(userId).emit('receive_message', message);

    // Enviar para todos os admins
    io.to('admins').emit('new_message_for_admin', message);
  });

  socket.on('disconnect', () => {
    console.log(`Usuário desconectado: ${socket.id}`);
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
