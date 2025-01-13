const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

let players = [];
let platforms = [];

function generatePlatforms() {
    platforms = [];
    for (let i = 0; i < 10; i++) {
        platforms.push({
            x: Math.random() * 400,
            y: i * 100,
            width: 80,
            height: 10
        });
    }
}

wss.on('connection', (ws) => {
    console.log('Новое подключение');

    if (players.length < 2) {
        players.push(ws);
        ws.send(JSON.stringify({ type: 'role', role: players.length === 1 ? 'player1' : 'player2' }));

        if (players.length === 2) {
            generatePlatforms();
            broadcast({ type: 'start', platforms });
        }
    } else {
        ws.send(JSON.stringify({ type: 'error', message: 'Игра уже началась' }));
        ws.close();
    }

    ws.on('message', (message) => {
        const data = JSON.parse(message);

        if (data.type === 'update') {
            const playerState = data.player;
            broadcast({ type: 'state', platforms, otherPlayer: playerState });
        }
    });

    ws.on('close', () => {
        console.log('Подключение закрыто');
        players = players.filter(player => player !== ws);
        if (players.length < 2) {
            players = [];
            platforms = [];
        }
    });
});

function broadcast(message) {
    players.forEach(player => {
        if (player.readyState === WebSocket.OPEN) {
            player.send(JSON.stringify(message));
        }
    });
}

console.log('Сервер запущен на ws://localhost:8080');
