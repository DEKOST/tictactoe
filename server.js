const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });

let players = [];
let gameState = ['', '', '', '', '', '', '', '', ''];
let currentPlayer = 'X';

wss.on('connection', (ws) => {
    console.log('Новое подключение');

    if (players.length < 2) {
        players.push(ws);
        ws.send(JSON.stringify({ type: 'role', role: players.length === 1 ? 'X' : 'O' }));

        if (players.length === 2) {
            broadcast({ type: 'start', gameState, currentPlayer });
        }
    } else {
        ws.send(JSON.stringify({ type: 'error', message: 'Игра уже началась' }));
        ws.close();
    }

    ws.on('message', (message) => {
        const data = JSON.parse(message);

        if (data.type === 'move') {
            const { index } = data;
            if (gameState[index] === '' && currentPlayer === data.player) {
                gameState[index] = data.player;
                currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
                broadcast({ type: 'update', gameState, currentPlayer });

                const winner = checkWinner();
                if (winner) {
                    broadcast({ type: 'winner', winner });
                    resetGame();
                } else if (gameState.every(cell => cell !== '')) {
                    broadcast({ type: 'draw' });
                    resetGame();
                }
            }
        }
    });

    ws.on('close', () => {
        console.log('Подключение закрыто');
        players = players.filter(player => player !== ws);
        if (players.length < 2) {
            resetGame();
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

function checkWinner() {
    const winningConditions = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8], // строки
        [0, 3, 6], [1, 4, 7], [2, 5, 8], // столбцы
        [0, 4, 8], [2, 4, 6]             // диагонали
    ];

    for (const condition of winningConditions) {
        const [a, b, c] = condition;
        if (gameState[a] && gameState[a] === gameState[b] && gameState[a] === gameState[c]) {
            return gameState[a];
        }
    }
    return null;
}

function resetGame() {
    gameState = ['', '', '', '', '', '', '', '', ''];
    currentPlayer = 'X';
    broadcast({ type: 'reset', gameState, currentPlayer });
}

console.log('Сервер запущен на ws://localhost:8080');