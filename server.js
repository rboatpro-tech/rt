const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    maxHttpBufferSize: 1e7 // Увеличиваем лимит до 10 Мб
});

// Обслуживаем статические файлы (картинки, стили) из папки www, если они там есть
app.use(express.static(__dirname + '/www'));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', (socket) => {
    socket.on('chat message', (msg) => {
        io.emit('chat message', msg);
    });
});

// ИСПРАВЛЕНИЕ ТУТ: Добавляем '0.0.0.0'
http.listen(3000, '0.0.0.0', () => {
    console.log('Сервер доступен в сети по адресу: http://192.168.0.201:3000');
    console.log('Для локальной проверки: http://localhost:3000');
});