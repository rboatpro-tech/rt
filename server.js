const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    maxHttpBufferSize: 1e7 // 10 Мб лимит на передачу фото
});
const mongoose = require('mongoose');

// 1. Подключение к базе данных MongoDB (через Render)
const mongoURI = process.env.MONGODB_URI;

mongoose.connect(mongoURI)
    .then(() => console.log('База данных «Алмаз» готова к группам!'))
    .catch(err => console.error('Ошибка подключения к MongoDB:', err));

// 2. Описание структуры сообщения (Схема)
const messageSchema = new mongoose.Schema({
    room: { type: String, required: true }, // Название группы обязательно
    user: String,
    text: String,
    image: String,
    time: { type: Date, default: Date.now }
});

const Message = mongoose.model('Message', messageSchema);

// Настройка статики
app.use(express.static(__dirname + '/www'));

// 3. Логика работы мессенджера
io.on('connection', (socket) => {
    console.log('Кто-то подключился к Алмазу');

    // СОБЫТИЕ: Вход в группу
    socket.on('join room', async (data) => {
        // Очищаем старые подписки, чтобы сообщения не путались
        socket.rooms.forEach(room => {
            if (room !== socket.id) socket.leave(room);
        });

        socket.join(data.room);
        console.log(`[ГРУППА] ${data.user} выбрал канал: ${data.room}`);

        // Загружаем последние 50 сообщений именно из этой группы
        try {
            const history = await Message.find({ room: data.room })
                                         .sort({ time: -1 })
                                         .limit(50);
            
            // Отправляем историю обратно пользователю (в правильном порядке)
            socket.emit('chat history', history.reverse());
        } catch (err) {
            console.error('Ошибка загрузки истории для группы:', err);
        }
    });

    // СОБЫТИЕ: Отправка сообщения
    socket.on('chat message', async (msg) => {
        if (!msg.room) return; // Если группы нет, ничего не делаем

        try {
            // Создаем объект сообщения для базы
            const newMessage = new Message({
                room: msg.room,
                user: msg.user,
                text: msg.text,
                image: msg.image
            });

            // Сохраняем в MongoDB
            await newMessage.save();
            
            // Отправляем сообщение ТОЛЬКО тем, кто сидит в этой же комнате
            io.to(msg.room).emit('chat message', msg);
            
        } catch (err) {
            console.error('Ошибка сохранения сообщения:', err);
        }
    });

    socket.on('disconnect', () => {
        console.log('Пользователь отключился');
    });
});

// Запуск сервера
const PORT = process.env.PORT || 3000;
http.listen(PORT, '0.0.0.0', () => {
    console.log(`Сервер Алмаз работает на порту: ${PORT}`);
});
