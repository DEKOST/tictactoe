const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

const wss = new WebSocket.Server({ port: 8080 });

const players = new Map(); // Карта для хранения игроков
const games = new Map(); // Карта для хранения активных игр
const gameHistory = []; // История игр
const playerStats = new Map(); // Статистика игроков
const activeDuels = new Set(); // Игроки в активных дуэлях
const pendingChallenges = new Map(); // Ожидающие подтверждения вызовы

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

    // Инициализируем статистику для нового игрока
    if (!playerStats.has(username)) {
        playerStats.set(username, { wins: 0, games: 0 });
    }

    players.set(username, { ws, username });
    ws.username = username;

    // Отправляем историю игр и статистику при входе
    ws.send(JSON.stringify({ 
        type: 'gameHistory', 
        history: gameHistory.slice(-10) // Последние 10 игр
    }));

    broadcastOnlinePlayers();
    ws.send(JSON.stringify({ type: 'login', success: true }));
}

function handleChallenge(ws, { challenger, challenged }) {
    const challengedPlayer = players.get(challenged);
    
    // Проверяем, не занят ли игрок
    if (activeDuels.has(challenged)) {
        ws.send(JSON.stringify({ 
            type: 'challengeError', 
            message: 'Игрок сейчас участвует в дуэли' 
        }));
        return;
    }

    if (pendingChallenges.has(challenged)) {
        ws.send(JSON.stringify({ 
            type: 'challengeError', 
            message: 'Игрок уже получил вызов на дуэль' 
        }));
        return;
    }

    if (!challengedPlayer) {
        ws.send(JSON.stringify({ 
            type: 'challengeError', 
            message: 'Игрок не в сети' 
        }));
        return;
    }

    // Сохраняем вызов
    pendingChallenges.set(challenged, challenger);

    // Отправляем подтверждение отправителю
    ws.send(JSON.stringify({ 
        type: 'challengeSent', 
        challenged: challenged 
    }));

    // Отправляем вызов получателю
    challengedPlayer.ws.send(JSON.stringify({ 
        type: 'challenge', 
        challenger 
    }));
}

function handleChallengeResponse(ws, { challenger, accepted }) {
    // Удаляем ожидающий вызов
    pendingChallenges.delete(ws.username);
    
    const challengerPlayer = players.get(challenger);
    if (!challengerPlayer) {
        ws.send(JSON.stringify({ 
            type: 'error', 
            message: 'Игрок уже вышел' 
        }));
        return;
    }

    if (!accepted) {
        // Отправляем сообщение об отказе
        challengerPlayer.ws.send(JSON.stringify({ 
            type: 'challengeDeclined', 
            player: ws.username 
        }));
        return;
    }

    // Если принято - добавляем игроков в список активных дуэлей
    activeDuels.add(challenger);
    activeDuels.add(ws.username);

    // Начинаем игру...
    handleAcceptChallenge(ws, { challenger });
    
    // Обновляем список игроков для всех
    broadcastOnlinePlayers();
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
        // Обновляем статистику
        const winnerUsername = game.players.find(username => 
            game.playerRoles[username] === winner
        );
        const stats = playerStats.get(winnerUsername);
        stats.wins += 1;
        
        // Обновляем статистику обоих игроков
        game.players.forEach(username => {
            const playerStat = playerStats.get(username);
            playerStat.games += 1;
        });

        // Добавляем игру в историю
        const gameResult = {
            date: new Date().toISOString(),
            players: game.players,
            winner: winnerUsername,
            moves: game.gameState
        };
        gameHistory.push(gameResult);

        // Отправляем обновленные данные
        setTimeout(() => {
            // Отправляем результат игры
            game.players.forEach((username) => {
                players.get(username).ws.send(JSON.stringify({ 
                    type: 'winner', 
                    winner,
                    gameResult
                }));
            });
            
            // Обновляем список игроков с новой статистикой
            broadcastOnlinePlayers();
            
            // Отправляем обновленную историю всем
            broadcastGameHistory();
            
            games.delete(gameId);
        }, 100);
        return;
    }

    if (game.gameState.every((cell) => cell !== null)) {
        // Обновляем статистику обоих игроков
        game.players.forEach(username => {
            const playerStat = playerStats.get(username);
            playerStat.games += 1;
        });

        // Добавляем игру в историю
        const gameResult = {
            date: new Date().toISOString(),
            players: game.players,
            winner: null, // ничья
            moves: game.gameState
        };
        gameHistory.push(gameResult);

        setTimeout(() => {
            game.players.forEach((username) => {
                players.get(username).ws.send(JSON.stringify({ 
                    type: 'draw',
                    gameResult 
                }));
            });
            
            broadcastOnlinePlayers();
            broadcastGameHistory();
            
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
    const playerList = Array.from(players.keys()).map(username => ({
        username,
        stats: playerStats.get(username),
        isInGame: activeDuels.has(username),
        hasPendingChallenge: pendingChallenges.has(username)
    }));
    
    players.forEach(({ ws }) => {
        ws.send(JSON.stringify({ 
            type: 'onlinePlayers', 
            players: playerList 
        }));
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

// Добавим новую функцию для рассылки истории игр
function broadcastGameHistory() {
    const recentHistory = gameHistory.slice(-10); // Последние 10 игр
    players.forEach(({ ws }) => {
        ws.send(JSON.stringify({ 
            type: 'gameHistory', 
            history: recentHistory 
        }));
    });
}

// Обновляем функцию окончания игры
function endGame(gameId, game) {
    // Удаляем игроков из активных дуэлей
    game.players.forEach(player => {
        activeDuels.delete(player);
    });
    
    games.delete(gameId);
    broadcastOnlinePlayers();
}

console.log('Сервер WebSocket запущен на ws://localhost:8080');
