const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const ws = new WebSocket('wss://tictactoe-online-bleat.netlify.app/');

let playerId;
let players = {};
let platforms = [];

const player = {
    x: canvas.width / 2 - 20,
    y: canvas.height - 100,
    width: 40,
    height: 40,
    velocityY: 0,
    gravity: 0.5,
    jumpStrength: -15,
    color: 'blue' // Локальный цвет игрока
};

// Обработка сообщений от сервера
ws.onmessage = (event) => {
    const data = JSON.parse(event.data);

    switch (data.type) {
        case 'init':
            playerId = data.playerId;
            players = data.players;
            platforms = data.platforms;
            break;
        case 'state':
            players = data.players;
            platforms = data.platforms;
            break;
    }
};

// Обработка нажатий клавиш
document.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') {
        player.x -= 10;
    } else if (event.key === 'ArrowRight') {
        player.x += 10;
    }
});

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
    player.velocityY += player.gravity;
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
