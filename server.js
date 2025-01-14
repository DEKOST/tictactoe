const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

const wss = new WebSocket.Server({ port: 8080 });

const players = new Map(); // Карта для хранения игроков
const games = new Map(); // Карта для хранения активных игр

wss.on('connection', (ws) => {
    console.log('Новое соединение установлено');

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);

            switch (data.type) {
                case 'login':
                    handleLogin(ws, data.username);
                    break;
                case 'challenge':
                    handleChallenge(ws, data);
                    break;
                case 'acceptChallenge':
                    handleAcceptChallenge(ws, data);
                    break;
                case 'move':
                    handleMove(ws, data);
                    break;
                default:
                    console.warn('Неизвестный тип сообщения:', data.type);
            }
        } catch (error) {
            console.error('Ошибка обработки сообщения:', error);
        }
    });

    ws.on('close', () => {
        handleDisconnect(ws);
    });
});

function handleLogin(ws, username) {
    if (!username || players.has(username)) {
        ws.send(JSON.stringify({ type: 'login', success: false, message: 'Юзернейм уже занят или некорректен' }));
        return;
    }

    players.set(username, { ws, username });
    ws.username = username;

    broadcastOnlinePlayers();

    ws.send(JSON.stringify({ type: 'login', success: true }));
}

function handleChallenge(ws, { challenger, challenged }) {
    const challengedPlayer = players.get(challenged);
    if (!challengedPlayer) {
        ws.send(JSON.stringify({ type: 'error', message: 'Игрок не в сети' }));
        return;
    }

    console.log(`Игрок ${challenger} вызывает ${challenged} на дуэль`);

    challengedPlayer.ws.send(JSON.stringify({ type: 'challenge', challenger }));
}

function handleAcceptChallenge(ws, { challenger }) {
    const challengerPlayer = players.get(challenger);
    if (!challengerPlayer) {
        ws.send(JSON.stringify({ type: 'error', message: 'Игрок уже вышел' }));
        return;
    }

    const gameId = uuidv4();
    const gameState = Array(9).fill(null);

    // Первый игрок (challenger) играет за X
    games.set(gameId, {
        players: [challenger, ws.username],
        currentPlayer: 'X',
        gameState,
        playerRoles: {
            [challenger]: 'X',
            [ws.username]: 'O'
        }
    });

    // Отправляем сообщение первому игроку
    challengerPlayer.ws.send(JSON.stringify({
        type: 'start',
        gameId,
        currentPlayer: 'X',
        playerRole: 'X',
        gameState,
    }));

    // Отправляем сообщение второму игроку
    ws.send(JSON.stringify({
        type: 'start',
        gameId,
        currentPlayer: 'X',
        playerRole: 'O',
        gameState,
    }));
}

function handleMove(ws, { gameId, index, player }) {
    const game = games.get(gameId);

    if (!game) {
        ws.send(JSON.stringify({ type: 'error', message: 'Игра не найдена' }));
        return;
    }

    if (game.currentPlayer !== player || game.gameState[index] !== null) {
        ws.send(JSON.stringify({ type: 'error', message: 'Некорректный ход' }));
        return;
    }

    game.gameState[index] = player;
    game.currentPlayer = game.currentPlayer === 'X' ? 'O' : 'X';

    // Сначала отправляем обновление состояния игры всем игрокам
    game.players.forEach((username) => {
        players.get(username).ws.send(JSON.stringify({
            type: 'update',
            currentPlayer: game.currentPlayer,
            gameState: game.gameState,
        }));
    });

    // Затем проверяем победителя и ничью
    const winner = checkWinner(game.gameState);
    if (winner) {
        setTimeout(() => {
            game.players.forEach((username) => {
                players.get(username).ws.send(JSON.stringify({ type: 'winner', winner }));
            });
            games.delete(gameId);
        }, 100);
        return;
    }

    if (game.gameState.every((cell) => cell !== null)) {
        setTimeout(() => {
            game.players.forEach((username) => {
                players.get(username).ws.send(JSON.stringify({ type: 'draw' }));
            });
            games.delete(gameId);
        }, 100);
        return;
    }
}

function handleDisconnect(ws) {
    if (ws.username) {
        players.delete(ws.username);
        broadcastOnlinePlayers();
    }
}

function broadcastOnlinePlayers() {
    const playerList = Array.from(players.keys());
    players.forEach(({ ws }) => {
        ws.send(JSON.stringify({ type: 'onlinePlayers', players: playerList }));
    });
}

function checkWinner(gameState) {
    const winningCombinations = [
        [0, 1, 2],
        [3, 4, 5],
        [6, 7, 8],
        [0, 3, 6],
        [1, 4, 7],
        [2, 5, 8],
        [0, 4, 8],
        [2, 4, 6],
    ];

    for (const [a, b, c] of winningCombinations) {
        if (gameState[a] && gameState[a] === gameState[b] && gameState[a] === gameState[c]) {
            return gameState[a];
        }
    }

    return null;
}

console.log('Сервер WebSocket запущен на ws://localhost:8080');
