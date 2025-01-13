const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const ws = new WebSocket('wss://tictactoe-w7mm.onrender.com');

let player = {
    x: canvas.width / 2,
    y: canvas.height - 50,
    width: 40,
    height: 40,
    velocityY: 0,
    gravity: 0.5
};

let platforms = [];
let otherPlayer = null;

ws.onmessage = (event) => {
    const data = JSON.parse(event.data);

    if (data.type === 'state') {
        platforms = data.platforms;
        otherPlayer = data.otherPlayer;
    }
};

function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Отрисовка платформ
    platforms.forEach(platform => {
        ctx.fillStyle = 'green';
        ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
    });

    // Отрисовка игрока
    ctx.fillStyle = 'blue';
    ctx.fillRect(player.x, player.y, player.width, player.height);

    // Отрисовка другого игрока
    if (otherPlayer) {
        ctx.fillStyle = 'red';
        ctx.fillRect(otherPlayer.x, otherPlayer.y, otherPlayer.width, otherPlayer.height);
    }

    requestAnimationFrame(gameLoop);
}

gameLoop();
