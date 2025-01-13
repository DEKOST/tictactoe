const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Игрок
const player = {
    x: canvas.width / 2 - 20,
    y: canvas.height - 100, // Начальная позиция выше, чтобы стоять на платформе
    width: 40,
    height: 40,
    color: 'blue',
    velocityX: 0,
    velocityY: 0,
    speed: 5,
    gravity: 0.5,
    jumpStrength: 10
};

// Платформы
let platforms = [];
const platformWidth = 80;
const platformHeight = 10;

// Создание начальных платформ
function createPlatforms() {
    platforms = [];
    // Добавляем платформу под игрока
    platforms.push({
        x: player.x + player.width / 2 - platformWidth / 2, // Центрируем платформу под игроком
        y: player.y + player.height,
        width: platformWidth,
        height: platformHeight,
        color: 'green'
    });

    // Добавляем остальные платформы
    for (let i = 1; i < 5; i++) {
        platforms.push({
            x: Math.random() * (canvas.width - platformWidth),
            y: canvas.height - i * 100,
            width: platformWidth,
            height: platformHeight,
            color: 'green'
        });
    }
}

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

// Проверка столкновений с платформами
function checkCollisions() {
    for (const platform of platforms) {
        if (
            player.x < platform.x + platform.width &&
            player.x + player.width > platform.x &&
            player.y + player.height >= platform.y &&
            player.y + player.height <= platform.y + platform.height &&
            player.velocityY >= 0
        ) {
            player.velocityY = player.jumpStrength; // Прыжок
        }
    }
}

// Обновление позиции игрока
function updatePlayer() {
    player.velocityY += player.gravity; // Гравитация
    player.y += player.velocityY;
    player.x += player.velocityX;

    // Ограничение движения игрока в пределах canvas
    if (player.x < 0) player.x = 0;
    if (player.x + player.width > canvas.width) player.x = canvas.width - player.width;

    // Если игрок падает вниз, завершаем игру
    if (player.y > canvas.height) {
        alert('Игра окончена!');
        resetGame();
    }
}

// Обновление позиции платформ
function updatePlatforms() {
    // Двигаем платформы вниз, если игрок поднимается
    if (player.y < canvas.height / 2 && player.velocityY < 0) {
        const deltaY = player.velocityY;
        platforms.forEach(platform => {
            platform.y -= deltaY;
        });
    }

    // Удаляем платформы, которые ушли за пределы экрана
    platforms = platforms.filter(platform => platform.y < canvas.height);

    // Добавляем новые платформы сверху
    while (platforms.length < 5) {
        platforms.push({
            x: Math.random() * (canvas.width - platformWidth),
            y: -platformHeight,
            width: platformWidth,
            height: platformHeight,
            color: 'green'
        });
    }
}

// Сброс игры
function resetGame() {
    player.x = canvas.width / 2 - 20;
    player.y = canvas.height - 100;
    player.velocityY = 0;
    createPlatforms();
}

// Основной игровой цикл
function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Очистка экрана

    updatePlayer(); // Обновление позиции игрока
    updatePlatforms(); // Обновление позиции платформ
    checkCollisions(); // Проверка столкновений
    drawPlatforms(); // Отрисовка платформ
    drawPlayer(); // Отрисовка игрока

    requestAnimationFrame(gameLoop); // Запуск следующего кадра
}

createPlatforms(); // Создание начальных платформ
gameLoop(); // Запуск игры
