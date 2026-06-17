const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para permitir requisições de outros domínios
app.use(cors());

// Middleware para ler o corpo da requisição como texto (necessário para sendBeacon)
app.use(express.text({ type: '*/*', limit: '10mb' }));

// Rota para receber os chats
app.post('/webhook/chat', async (req, res) => {
    try {
        const rawData = req.body;
        if (!rawData) return res.status(400).send('Sem dados');

        const data = JSON.parse(rawData);
        console.log("--- Novo Chat Recebido ---");
        console.log("Usuário:", data.user_name);

        // 1. ENVIAR PARA O TELEGRAM (Opcional, mas recomendado para tempo real)
        // Se você tiver um BOT_TOKEN e CHAT_ID, descomente as linhas abaixo:
        /*
        const botToken = 'SEU_BOT_TOKEN';
        const chatId = 'SEU_CHAT_ID';
        const telegramMsg = `🔔 *Novo Chat - Diskgas*\n\n*Cliente:* ${data.user_name}\n*PIX:* ${data.pix_code}\n\n*Conteúdo:*\n${data.message}`;
        await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            chat_id: chatId,
            text: telegramMsg,
            parse_mode: 'Markdown'
        });
        */

        // 2. ENVIAR VIA EMAILJS (Usando a API REST do EmailJS)
        // Isso substitui o envio pelo navegador e é muito mais seguro.
        await axios.post('https://api.emailjs.com/api/v1.0/email/send', {
            service_id: 'service_j2hab7s',
            template_id: 'template_xsfblgj',
            user_id: 'C0seG7fZzSsDinCTQ', // Sua Public Key aqui
            template_params: {
                user_name: data.user_name,
                message: data.message,
                pix_code: data.pix_code
            }
        });

        console.log("E-mail enviado com sucesso!");
        res.status(200).send('OK');

    } catch (error) {
        console.error('Erro ao processar webhook:', error.message);
        res.status(500).send('Erro Interno');
    }
});

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
