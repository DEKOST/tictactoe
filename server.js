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

// Добавление платформы под игрока
function addPlatformForPlayer(player) {
    platforms.push({
        x: player.x - 40, // Центрируем платформу под игроком
        y: player.y + player.height,
        width: 80,
        height: 10
    });
}

wss.on('connection', (ws) => {
    console.log('Новое подключение');

    // Назначаем игроку уникальный ID
    const playerId = Math.random().toString(36).substring(7);
    const player = {
        x: 400, // Начальная позиция X
        y: 500, // Начальная позиция Y
        width: 40,
        height: 40,
        velocityY: 0,
        color: Object.keys(players).length === 0 ? 'blue' : 'red'
    };
    players[playerId] = player;

    // Добавляем платформу под игрока
    addPlatformForPlayer(player);

    // Отправляем начальное состояние игры
    ws.send(JSON.stringify({
        type: 'init',
        playerId,
        player, // Отправляем начальное состояние игрока
        players,
        platforms
    }));

    // Оповещаем всех игроков о новом подключении
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
                type: 'state',
                players,
                platforms
            }));
        }
    });

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

        // Оповещаем всех игроков об отключении
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                    type: 'state',
                    players,
                    platforms
                }));
            }
        });
    });
});

generatePlatforms();
console.log('Сервер запущен на ws://localhost:8080');
