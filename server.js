const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });

let players = {}; // Хранит подключенных игроков
let games = {};
let gameIdCounter = 1;

wss.on('connection', (ws) => {
    console.log('Новое подключение');

    ws.on('message', (message) => {
        const data = JSON.parse(message);

        switch (data.type) {
            case 'login':
                if (Object.values(players).includes(data.username)) {
                    ws.send(JSON.stringify({ type: 'login', success: false, message: 'Юзернейм уже занят' }));
                } else {
                    players[ws] = data.username; // Сохраняем юзернейм
                    ws.send(JSON.stringify({ type: 'login', success: true }));

                    // Отправляем новому клиенту текущий список игроков
                    ws.send(JSON.stringify({
                        type: 'onlinePlayers',
                        players: Object.values(players)
                    }));

                    // Уведомляем всех о новом игроке
                    broadcastOnlinePlayers();
                }
                break;
            case 'challenge':
                const challenged = Object.keys(players).find(key => players[key] === data.challenged);
                if (challenged && challenged.readyState === WebSocket.OPEN) {
                    challenged.send(JSON.stringify({
                        type: 'challenge',
                        challenger: data.challenger
                    }));
                }
                break;
            case 'acceptChallenge':
                const challenger = Object.keys(players).find(key => players[key] === data.challenger);
                if (challenger && challenger.readyState === WebSocket.OPEN) {
                    const gameId = gameIdCounter++;
                    games[gameId] = {
                        players: [challenger, ws],
                        gameState: ['', '', '', '', '', '', '', '', ''],
                        currentPlayer: 'X'
                    };
                    challenger.send(JSON.stringify({
                        type: 'start',
                        gameId,
                        gameState: games[gameId].gameState,
                        currentPlayer: 'X'
                    }));
                    ws.send(JSON.stringify({
                        type: 'start',
                        gameId,
                        gameState: games[gameId].gameState,
                        currentPlayer: 'O'
                    }));
                }
                break;
            case 'move':
                const game = games[data.gameId];
                if (game && game.players.includes(ws) && game.gameState[data.index] === '' && game.currentPlayer === data.player) {
                    game.gameState[data.index] = data.player;
                    game.currentPlayer = game.currentPlayer === 'X' ? 'O' : 'X';
                    game.players.forEach(player => {
                        if (player.readyState === WebSocket.OPEN) {
                            player.send(JSON.stringify({
                                type: 'update',
                                gameState: game.gameState,
                                currentPlayer: game.currentPlayer
                            }));
                        }
                    });

                    const winner = checkWinner(game.gameState);
                    if (winner) {
                        game.players.forEach(player => {
                            if (player.readyState === WebSocket.OPEN) {
                                player.send(JSON.stringify({ type: 'winner', winner }));
                            }
                        });
                        resetGame(gameId);
                    } else if (game.gameState.every(cell => cell !== '')) {
                        game.players.forEach(player => {
                            if (player.readyState === WebSocket.OPEN) {
                                player.send(JSON.stringify({ type: 'draw' }));
                            }
                        });
                        resetGame(gameId);
                    }
                }
                break;
        }
    });

    ws.on('close', () => {
        console.log('Подключение закрыто');
        delete players[ws]; // Удаляем игрока из списка
        broadcastOnlinePlayers(); // Уведомляем всех об отключении
    });

    ws.on('error', (error) => {
        console.error('Ошибка WebSocket:', error);
        ws.close();
    });
});

// Функция для отправки списка онлайн-игроков всем клиентам
function broadcastOnlinePlayers() {
    const onlinePlayers = Object.values(players); // Получаем список юзернеймов
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
                type: 'onlinePlayers',
                players: onlinePlayers
            }));
        }
    });
}

function checkWinner(gameState) {
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

function resetGame(gameId) {
    const game = games[gameId];
    if (game) {
        game.gameState = ['', '', '', '', '', '', '', '', ''];
        game.currentPlayer = 'X';
        game.players.forEach(player => {
            if (player.readyState === WebSocket.OPEN) {
                player.send(JSON.stringify({
                    type: 'reset',
                    gameState: game.gameState,
                    currentPlayer: game.currentPlayer
                }));
            }
        });
    }
}

console.log('Сервер запущен на ws://localhost:8080');
