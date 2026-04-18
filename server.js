const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    maxHttpBufferSize: 1e7 // 10 Мб лимит
});
const mongoose = require('mongoose');
const path = require('path'); // Модуль для работы с путями

// 1. Подключение к MongoDB
const mongoURI = process.env.MONGODB_URI;
mongoose.connect(mongoURI)
    .then(() => console.log('База данных «Алмаз» готова!'))
    .catch(err => console.error('Ошибка подключения к MongoDB:', err));

// 2. Схема сообщения
const messageSchema = new mongoose.Schema({
    room: { type: String, required: true },
    user: String,
    text: String,
    image: String,
    time: { type: Date, default: Date.now }
});
const Message = mongoose.model('Message', messageSchema);

// --- ИСПРАВЛЕНИЕ ТУТ ---
// Настройка статики (указываем путь к папке www)
app.use(express.static(path.join(__dirname, 'www')));

// Принудительно отдаем index.html при заходе на главную страницу
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'www', 'index.html'));
});
// -----------------------

// 3. Логика Socket.io
io.on('connection', (socket) => {
    console.log('Новое подключение к Алмазу');

    socket.on('join room', async (data) => {
        // Выходим из всех комнат кроме личной
        socket.rooms.forEach(room => {
            if (room !== socket.id) socket.leave(room);
        });

        socket.join(data.room);
        console.log(`[ГРУППА] ${data.user} вошел в: ${data.room}`);

        try {
            const history = await Message.find({ room: data.room })
                                         .sort({ time: -1 })
                                         .limit(50);
            socket.emit('chat history', history.reverse());
        } catch (err) {
            console.error('Ошибка истории:', err);
        }
    });

    socket.on('chat message', async (msg) => {
        if (!msg.room) return;
        try {
            const newMessage = new Message({
                room: msg.room,
                user: msg.user,
                text: msg.text,
                image: msg.image
            });
            await newMessage.save();
            io.to(msg.room).emit('chat message', msg);
        } catch (err) {
            console.error('Ошибка сохранения:', err);
        }
    });

    socket.on('disconnect', () => {
        console.log('Пользователь отключился');
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, '0.0.0.0', () => {
    console.log(`Сервер Алмаз работает на порту: ${PORT}`);
});
