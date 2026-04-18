const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    maxHttpBufferSize: 1e7 // Лимит 10 Мб для фото
});
const mongoose = require('mongoose');

// 1. Подключение к MongoDB
const mongoURI = process.env.MONGODB_URI;
mongoose.connect(mongoURI)
    .then(() => console.log('База данных «Алмаз» готова к группам!'))
    .catch(err => console.error('Ошибка MongoDB:', err));

// 2. Схема сообщения (добавили поле room)
const messageSchema = new mongoose.Schema({
    room: String, 
    user: String,
    text: String,
    image: String,
    time: { type: Date, default: Date.now }
});
const Message = mongoose.model('Message', messageSchema);

app.use(express.static(__dirname + '/www'));

// 3. Логика чата с комнатами
io.on('connection', (socket) => {
    
    // Когда пользователь входит в группу
    socket.on('join room', async (data) => {
        socket.join(data.room); // Подключаем сокет к комнате
        console.log(`Пользователь ${data.user} зашел в группу: ${data.room}`);

        // Загружаем историю ТОЛЬКО для этой конкретной группы
        try {
            const history = await Message.find({ room: data.room })
                                         .sort({ time: -1 })
                                         .limit(50);
            socket.emit('chat history', history.reverse());
        } catch (err) {
            console.error('Ошибка загрузки истории:', err);
        }
    });

    // Когда приходит новое сообщение
    socket.on('chat message', async (msg) => {
        try {
            const newMessage = new Message({
                room: msg.room, // Сохраняем группу
                user: msg.user,
                text: msg.text,
                image: msg.image
            });
            await newMessage.save();
            
            // Рассылаем сообщение только участникам этой группы
            io.to(msg.room).emit('chat message', msg);
        } catch (err) {
            console.error('Ошибка сохранения сообщения:', err);
        }
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, '0.0.0.0', () => {
    console.log(`Сервер Алмаз запущен на порту: ${PORT}`);
});
