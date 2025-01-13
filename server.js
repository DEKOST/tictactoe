const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

let players = {};
let platforms = [];

// Генерация платформ
function generatePlatforms() {
    platforms = [];
    for (let i = 0; i < 10; i++) {
        platforms.push({
            x: Math.random() * 800,
            y: 600 - i * 100,
            width: 80,
            height: 10
        });
    }
}

wss.on('connection', (ws) => {
    console.log('Новое подключение');

    // Назначаем игроку уникальный ID
    const playerId = Math.random().toString(36).substring(7);
    players[playerId] = { x: 400, y: 500, velocityY: 0, color: players.length === 0 ? 'blue' : 'red' };

    // Отправляем начальное состояние игры
    ws.send(JSON.stringify({
        type: 'init',
        playerId,
        players,
        platforms
    }));

    // Обработка сообщений от клиента
    ws.on('message', (message) => {
        const data = JSON.parse(message);

        if (data.type === 'update') {
            // Обновляем состояние игрока
            players[playerId] = data.player;

            // Отправляем обновленное состояние всем игрокам
            wss.clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({
                        type: 'state',
                        players,
                        platforms
                    }));
                }
            });
        }
    });

    // Удаляем игрока при отключении
    ws.on('close', () => {
        delete players[playerId];
        console.log('Игрок отключен');
    });
});

generatePlatforms();
console.log('Сервер запущен на ws://localhost:8080');
