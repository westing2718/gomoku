const SIZE = 15;
const CELL = 38;
const PAD = 24;
const BOARD_PX = CELL * (SIZE - 1) + PAD * 2;

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
canvas.width = BOARD_PX;
canvas.height = BOARD_PX;

let grid, turn, history, gameOver, winLine;
let score = { black: 0, white: 0 };
let mode = 'pvp'; // 'pvp' or 'pve'
const AI_DEPTH = 4;

// --- AI ---
function findBestMove(board) {
    let best = null, bestScore = -Infinity;
    const center = Math.floor(SIZE / 2);

    for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
            if (board[r][c] !== 0) continue;
            if (!hasNeighbor(board, r, c, 2)) continue;

            board[r][c] = 2; // AI = white
            const score = evaluatePoint(board, r, c, 2) + evaluateBoard(board, 2) - evaluateBoard(board, 1);
            board[r][c] = 0;

            if (score > bestScore) {
                bestScore = score;
                best = { r, c };
            }
        }
    }

    if (!best) best = { r: center, c: center };
    return best;
}

function hasNeighbor(board, r, c, dist) {
    for (let dr = -dist; dr <= dist; dr++) {
        for (let dc = -dist; dc <= dist; dc++) {
            if (dr === 0 && dc === 0) continue;
            const nr = r + dr, nc = c + dc;
            if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && board[nr][nc] !== 0) return true;
        }
    }
    return false;
}

function evaluatePoint(board, r, c, player) {
    const dirs = [[1, 0], [0, 1], [1, 1], [1, -1]];
    let score = 0;

    for (const [dr, dc] of dirs) {
        const { count, open } = countLine(board, r, c, dr, dc, player);
        score += lineScore(count, open);
    }

    const centerDist = Math.abs(r - 7) + Math.abs(c - 7);
    score += Math.max(0, 14 - centerDist) * 0.5;

    return score;
}

function evaluateBoard(board, player) {
    let total = 0;

    for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
            if (board[r][c] !== player) continue;
            const dirs = [[1, 0], [0, 1], [1, 1], [1, -1]];
            for (const [dr, dc] of dirs) {
                const { count, open } = countLine(board, r, c, dr, dc, player);
                if (count >= 2) total += lineScore(count, open);
            }
        }
    }
    return total;
}

function countLine(board, r, c, dr, dc, player) {
    let count = 1, open = 0;

    let nr = r + dr, nc = c + dc;
    while (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && board[nr][nc] === player) {
        count++; nr += dr; nc += dc;
    }
    if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && board[nr][nc] === 0) open++;

    nr = r - dr; nc = c - dc;
    while (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && board[nr][nc] === player) {
        count++; nr -= dr; nc -= dc;
    }
    if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && board[nr][nc] === 0) open++;

    return { count, open };
}

function lineScore(count, open) {
    if (count >= 5) return 1000000;
    if (count === 4) {
        if (open === 2) return 100000;
        if (open === 1) return 10000;
    }
    if (count === 3) {
        if (open === 2) return 5000;
        if (open === 1) return 500;
    }
    if (count === 2) {
        if (open === 2) return 200;
        if (open === 1) return 30;
    }
    if (count === 1) {
        if (open === 2) return 10;
        if (open === 1) return 2;
    }
    return 0;
}

// --- Win check ---
function checkWin(board, r, c) {
    const player = board[r][c];
    const dirs = [[1, 0], [0, 1], [1, 1], [1, -1]];

    for (const [dr, dc] of dirs) {
        let line = [{ r, c }];

        let nr = r + dr, nc = c + dc;
        while (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && board[nr][nc] === player) {
            line.push({ r: nr, c: nc }); nr += dr; nc += dc;
        }
        nr = r - dr; nc = c - dc;
        while (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && board[nr][nc] === player) {
            line.push({ r: nr, c: nc }); nr -= dr; nc -= dc;
        }

        if (line.length >= 5) return line;
    }
    return null;
}

// --- Drawing ---
function draw() {
    ctx.clearRect(0, 0, BOARD_PX, BOARD_PX);

    ctx.fillStyle = '#c8a96e';
    ctx.fillRect(0, 0, BOARD_PX, BOARD_PX);

    ctx.strokeStyle = '#5a4220';
    ctx.lineWidth = 1;
    for (let i = 0; i < SIZE; i++) {
        const pos = PAD + i * CELL;
        ctx.beginPath(); ctx.moveTo(PAD, pos); ctx.lineTo(PAD + (SIZE - 1) * CELL, pos); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(pos, PAD); ctx.lineTo(pos, PAD + (SIZE - 1) * CELL); ctx.stroke();
    }

    const stars = [3, 7, 11];
    ctx.fillStyle = '#5a4220';
    for (const sr of stars) {
        for (const sc of stars) {
            ctx.beginPath();
            ctx.arc(PAD + sc * CELL, PAD + sr * CELL, 3.5, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
            if (grid[r][c] !== 0) drawStone(r, c, grid[r][c]);
        }
    }

    if (history.length > 0) {
        const last = history[history.length - 1];
        const x = PAD + last.c * CELL;
        const y = PAD + last.r * CELL;
        ctx.strokeStyle = grid[last.r][last.c] === 1 ? '#fff' : '#000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.stroke();
    }

    if (winLine) {
        ctx.strokeStyle = '#e94560';
        ctx.lineWidth = 3;
        ctx.setLineDash([6, 4]);
        const first = winLine[0], last = winLine[winLine.length - 1];
        ctx.beginPath();
        ctx.moveTo(PAD + first.c * CELL, PAD + first.r * CELL);
        ctx.lineTo(PAD + last.c * CELL, PAD + last.r * CELL);
        ctx.stroke();
        ctx.setLineDash([]);
    }
}

function drawStone(r, c, player) {
    const x = PAD + c * CELL;
    const y = PAD + r * CELL;
    const radius = CELL / 2 - 2;

    ctx.save();

    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    if (player === 1) {
        const grad = ctx.createRadialGradient(x - 3, y - 3, 2, x, y, radius);
        grad.addColorStop(0, '#666');
        grad.addColorStop(1, '#000');
        ctx.fillStyle = grad;
    } else {
        const grad = ctx.createRadialGradient(x - 3, y - 3, 2, x, y, radius);
        grad.addColorStop(0, '#fff');
        grad.addColorStop(1, '#ccc');
        ctx.fillStyle = grad;
    }

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

// --- Interaction ---
canvas.addEventListener('click', (e) => {
    if (gameOver) return;

    const rect = canvas.getBoundingClientRect();
    const scale = BOARD_PX / rect.width;
    const mx = (e.clientX - rect.left) * scale;
    const my = (e.clientY - rect.top) * scale;

    const c = Math.round((mx - PAD) / CELL);
    const r = Math.round((my - PAD) / CELL);

    if (r < 0 || r >= SIZE || c < 0 || c >= SIZE) return;
    if (grid[r][c] !== 0) return;

    placeStone(r, c);

    if (!gameOver && mode === 'pve' && turn === 2) {
        setTimeout(() => {
            const aiMove = findBestMove(grid);
            placeStone(aiMove.r, aiMove.c);
        }, 50);
    }
});

canvas.addEventListener('mousemove', (e) => {
    if (gameOver) { canvas.style.cursor = 'default'; return; }

    const rect = canvas.getBoundingClientRect();
    const scale = BOARD_PX / rect.width;
    const mx = (e.clientX - rect.left) * scale;
    const my = (e.clientY - rect.top) * scale;

    const c = Math.round((mx - PAD) / CELL);
    const r = Math.round((my - PAD) / CELL);

    if (r >= 0 && r < SIZE && c >= 0 && c < SIZE && grid[r][c] === 0) {
        canvas.style.cursor = 'pointer';
    } else {
        canvas.style.cursor = 'default';
    }
});

function placeStone(r, c) {
    grid[r][c] = turn;
    history.push({ r, c });

    const win = checkWin(grid, r, c);
    if (win) {
        winLine = win;
        gameOver = true;
        if (turn === 1) score.black++; else score.white++;
        updateUI();
        draw();
        return;
    }

    if (history.length === SIZE * SIZE) {
        gameOver = true;
        document.getElementById('status').textContent = '平局!';
        document.getElementById('status').className = 'status';
        draw();
        return;
    }

    turn = turn === 1 ? 2 : 1;
    updateUI();
    draw();
}

function updateUI() {
    const turnStone = document.getElementById('turnStone');
    const status = document.getElementById('status');

    turnStone.className = 'turn-stone ' + (turn === 1 ? 'black' : 'white');

    if (gameOver && winLine) {
        const winner = grid[winLine[0].r][winLine[0].c] === 1 ? '黑棋' : '白棋';
        status.textContent = `${winner} 获胜! 🎉`;
        status.className = 'status win';
    } else if (!gameOver) {
        status.textContent = turn === 1 ? '黑棋落子' : '白棋落子';
        status.className = 'status';
    }

    document.getElementById('scoreB').textContent = score.black;
    document.getElementById('scoreW').textContent = score.white;
}

function undoMove() {
    if (history.length === 0 || gameOver) return;

    if (mode === 'pve') {
        if (history.length >= 2) {
            const ai = history.pop();
            grid[ai.r][ai.c] = 0;
            const pl = history.pop();
            grid[pl.r][pl.c] = 0;
            turn = 1;
        } else {
            const m = history.pop();
            grid[m.r][m.c] = 0;
            turn = 1;
        }
    } else {
        const m = history.pop();
        grid[m.r][m.c] = 0;
        turn = m.r !== undefined ? (grid[m.r][m.c] === 0 ? (turn === 1 ? 2 : 1) : turn) : 1;
        turn = turn === 1 ? 2 : 1;
    }

    winLine = null;
    updateUI();
    draw();
}

function restart() {
    init();
}

function setMode(m) {
    mode = m;
    document.getElementById('btnPvP').className = m === 'pvp' ? 'active' : '';
    document.getElementById('btnPvE').className = m === 'pve' ? 'active' : '';
    restart();
}

function init() {
    grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
    turn = 1;
    history = [];
    gameOver = false;
    winLine = null;
    updateUI();
    draw();
}

init();
