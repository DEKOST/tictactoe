const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Игрок
const player = {
    x: canvas.width / 2 - 20,
    y: canvas.height - 50,
    width: 40,
    height: 40,
    color: 'blue',
    velocityX: 0,
    speed: 5
};

// Платформы
const platforms = [
    { x: 100, y: 400, width: 80, height: 10, color: 'green' },
    { x: 300, y: 300, width: 80, height: 10, color: 'green' },
    { x: 200, y: 200, width: 80, height: 10, color: 'green' }
];

// Отрисовка игрока
function drawPlayer() {
    ctx.fillStyle = player.color;
    ctx.fillRect(player.x, player.y, player.width, player.height);
}

// Отрисовка платформ
function drawPlatforms() {
    platforms.forEach(platform => {
        ctx.fillStyle = platform.color;
        ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
    });
}

// Обработка нажатий клавиш
document.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') {
        player.velocityX = -player.speed;
    } else if (event.key === 'ArrowRight') {
        player.velocityX = player.speed;
    }
});

document.addEventListener('keyup', (event) => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        player.velocityX = 0;
    }
});

// Обновление позиции игрока
function updatePlayer() {
    player.x += player.velocityX;

    // Ограничение движения игрока в пределах canvas
    if (player.x < 0) player.x = 0;
    if (player.x + player.width > canvas.width) player.x = canvas.width - player.width;
}

// Основной игровой цикл
function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Очистка экрана

    updatePlayer(); // Обновление позиции игрока
    drawPlatforms(); // Отрисовка платформ
    drawPlayer();    // Отрисовка игрока

    requestAnimationFrame(gameLoop); // Запуск следующего кадра
}

gameLoop(); // Запуск игры
