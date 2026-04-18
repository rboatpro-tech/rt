const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    maxHttpBufferSize: 1e7
});
const mongoose = require('mongoose'); // Подключаем базу

// 1. Берем ссылку из переменных окружения Render
const mongoURI = process.env.MONGODB_URI;

// 2. Подключаемся к MongoDB
if (mongoURI) {
    mongoose.connect(mongoURI)
        .then(() => console.log('База данных Алмаз подключена!'))
        .catch(err => console.error('Ошибка базы данных:', err));
} else {
    console.log('ВНИМАНИЕ: Переменная MONGODB_URI не найдена в настройках Render!');
}

// 3. Создаем схему хранения сообщений
const messageSchema = new mongoose.Schema({
    user: String,
    text: String,
    image: String, // Для картинок
    time: { type: Date, default: Date.now }
});
const Message = mongoose.model('Message', messageSchema);

app.use(express.static(__dirname + '/www'));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', async (socket) => {
    console.log('Новое подключение к Алмазу');

    // 4. ПРИ ВХОДЕ: Отправляем старые сообщения из базы
    try {
        const history = await Message.find().sort({ time: -1 }).limit(50);
        socket.emit('chat history', history.reverse());
    } catch (err) {
        console.error('Не удалось загрузить историю:', err);
    }

    socket.on('chat message', async (msg) => {
        // 5. СОХРАНЯЕМ сообщение в базу
        try {
            const newMessage = new Message({
                user: msg.user,
                text: msg.text,
                image: msg.image // если отправляете картинки в msg
            });
            await newMessage.save();
            
            // 6. Рассылаем всем
            io.emit('chat message', msg);
        } catch (err) {
            console.error('Ошибка сохранения сообщения:', err);
        }
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, '0.0.0.0', () => {
    console.log(`Сервер Алмаз запущен на порту: ${PORT}`);
});
