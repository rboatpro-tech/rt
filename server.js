const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    maxHttpBufferSize: 1e7 // Увеличиваем лимит до 10 Мб
});

// Обслуживаем статические файлы
app.use(express.static(__dirname + '/www'));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', (socket) => {
    console.log('Новое подключение');
    socket.on('chat message', (msg) => {
        io.emit('chat message', msg);
    });
});

// ИСПРАВЛЕНИЕ ДЛЯ RENDER:
// process.env.PORT — это специальная переменная, которую Render подставит сам.
const PORT = process.env.PORT || 3000;

http.listen(PORT, '0.0.0.0', () => {
    console.log(`Сервер мессенджера RiverBoat запущен!`);
    console.log(`Порт: ${PORT}`);
});