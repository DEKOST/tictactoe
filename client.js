const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight * 0.8; // 80% высоты экрана для canvas

const ws = new WebSocket('wss://tictactoe-w7mm.onrender.com');

let playerId;
let players = {};
let platforms = [];

let player = {
    x: 400, // Начальная позиция X (синхронизирована с сервером)
    y: 500, // Начальная позиция Y (синхронизирована с сервером)
    width: 40,
    height: 40,
    velocityY: 0,
    gravity: 0.5,
    jumpStrength: -15,
    color: 'blue' // Локальный цвет игрока
};

// Кнопки управления
const leftButton = document.getElementById('leftButton');
const rightButton = document.getElementById('rightButton');

// Обработка нажатий кнопок
leftButton.addEventListener('touchstart', () => player.x -= 10);
rightButton.addEventListener('touchstart', () => player.x += 10);

// Обработка сообщений от сервера
ws.onmessage = (event) => {
    const data = JSON.parse(event.data);

    switch (data.type) {
        case 'init':
            playerId = data.playerId;
            player = data.player; // Используем начальное состояние игрока с сервера
            players = data.players;
            platforms = data.platforms;
            break;
        case 'state':
            players = data.players;
            platforms = data.platforms;
            break;
    }
};

// Проверка столкновений с платформами
function checkCollisions() {
    for (const platform of platforms) {
        if (
            player.x < platform.x + platform.width &&
            player.x + player.width > platform.x &&
            player.y + player.height >= platform.y &&
            player.y + player.height <= platform.y + platform.height
        ) {
            player.y = platform.y - player.height;
            player.velocityY = player.jumpStrength;
        }
    }
}

// Обновление позиции игрока
function updatePlayer() {
    player.velocityY += player.gravity; // Применяем гравитацию
    player.y += player.velocityY;

    // Ограничение движения игрока в пределах canvas
    if (player.x < 0) player.x = 0;
    if (player.x + player.width > canvas.width) player.x = canvas.width - player.width;

    // Отправка обновленного состояния на сервер
    if (playerId) { // Проверяем, что playerId определен
        ws.send(JSON.stringify({
            type: 'update',
            player: { ...player, color: players[playerId]?.color || 'blue' } // Используем локальный цвет, если цвет игрока не определен
        }));
    }
}

// Отрисовка игроков и платформ
function drawGame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Отрисовка платформ
    platforms.forEach(platform => {
        ctx.fillStyle = 'green';
        ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
    });

    // Отрисовка игроков
    Object.values(players).forEach(p => {
        ctx.fillStyle = p.color || 'blue'; // Используем цвет по умолчанию, если цвет не определен
        ctx.fillRect(p.x, p.y, player.width, player.height);
    });
}

// Основной игровой цикл
function gameLoop() {
    updatePlayer();
    checkCollisions();
    drawGame();
    requestAnimationFrame(gameLoop);
}

gameLoop();
