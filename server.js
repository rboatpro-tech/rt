const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, { maxHttpBufferSize: 1e7 });
const mongoose = require('mongoose');

const mongoURI = process.env.MONGODB_URI;
mongoose.connect(mongoURI).then(() => console.log('База Алмаз готова к группам!'));

const messageSchema = new mongoose.Schema({
    room: String, // Новое поле для группы
    user: String,
    text: String,
    image: String,
    time: { type: Date, default: Date.now }
});
const Message = mongoose.model('Message', messageSchema);

app.use(express.static(__dirname + '/www'));

io.on('connection', (socket) => {
    // Когда пользователь выбирает группу
    socket.on('join room', async (data) => {
        socket.join(data.room);
        console.log(`${data.user} зашел в группу: ${data.room}`);

        // Загружаем историю только для этой группы
        const history = await Message.find({ room: data.room }).sort({ time: -1 }).limit(50);
        socket.emit('chat history', history.reverse());
    });

    socket.on('chat message', async (msg) => {
        const newMessage = new Message({
            room: msg.room, // Сохраняем, в какую группу ушло сообщение
            user: msg.user,
            text: msg.text,
            image: msg.image
        });
        await newMessage.save();
        
        // Отправляем сообщение ТОЛЬКО участникам этой группы
        io.to(msg.room).emit('chat message', msg);
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, '0.0.0.0', () => console.log(`Сервер Алмаз на порту ${PORT}`));
