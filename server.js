const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Game state
let gameState = {
    boardCount: 2,
    boardSize: 5,
    numberRangeMin: 1,
    numberRangeMax: 75,
    displayScale: 100,
    winCondition: 'any', // 'any', 'row', 'column', 'diagonal', 'blackout'
    calledNumbers: [],
    boards: [],
    winners: []
};

// Generate a random bingo board
function generateBoard(size) {
    const board = [];
    const minNum = gameState.numberRangeMin;
    const maxNum = gameState.numberRangeMax;
    const range = maxNum - minNum + 1;
    const usedNumbers = new Set();
    
    for (let row = 0; row < size; row++) {
        const rowNumbers = [];
        for (let col = 0; col < size; col++) {
            // Free space in center for odd-sized boards
            if (size % 2 === 1 && row === Math.floor(size / 2) && col === Math.floor(size / 2)) {
                rowNumbers.push({ number: 'FREE', stamped: true });
            } else {
                let num;
                let attempts = 0;
                do {
                    num = Math.floor(Math.random() * range) + minNum;
                    attempts++;
                    if (attempts > range * 2) {
                        break;
                    }
                } while (usedNumbers.has(num) && usedNumbers.size < range);
                usedNumbers.add(num);
                rowNumbers.push({ number: num, stamped: false });
            }
        }
        board.push(rowNumbers);
    }
    return board;
}

// Generate all boards
function generateAllBoards() {
    gameState.boards = [];
    for (let i = 0; i < gameState.boardCount; i++) {
        gameState.boards.push(generateBoard(gameState.boardSize));
    }
    gameState.calledNumbers = [];
    gameState.winners = [];
}

// Check if a board has won based on win condition
function checkWinner(board) {
    const size = board.length;
    const winCondition = gameState.winCondition;
    
    // Check rows
    const checkRows = () => {
        for (let row = 0; row < size; row++) {
            if (board[row].every(cell => cell.stamped)) {
                return true;
            }
        }
        return false;
    };
    
    // Check columns
    const checkColumns = () => {
        for (let col = 0; col < size; col++) {
            let colWin = true;
            for (let row = 0; row < size; row++) {
                if (!board[row][col].stamped) {
                    colWin = false;
                    break;
                }
            }
            if (colWin) return true;
        }
        return false;
    };
    
    // Check diagonals
    const checkDiagonals = () => {
        let diag1Win = true;
        let diag2Win = true;
        for (let i = 0; i < size; i++) {
            if (!board[i][i].stamped) diag1Win = false;
            if (!board[i][size - 1 - i].stamped) diag2Win = false;
        }
        return diag1Win || diag2Win;
    };
    
    // Check blackout (all cells stamped)
    const checkBlackout = () => {
        for (let row = 0; row < size; row++) {
            for (let col = 0; col < size; col++) {
                if (!board[row][col].stamped) return false;
            }
        }
        return true;
    };
    
    // Check based on win condition
    switch (winCondition) {
        case 'row':
            return checkRows();
        case 'column':
            return checkColumns();
        case 'diagonal':
            return checkDiagonals();
        case 'blackout':
            return checkBlackout();
        case 'any':
        default:
            return checkRows() || checkColumns() || checkDiagonals();
    }
}

// Mark number on all boards
function markNumber(number) {
    gameState.boards.forEach((board, boardIndex) => {
        board.forEach(row => {
            row.forEach(cell => {
                if (cell.number === number) {
                    cell.stamped = true;
                }
            });
        });
        
        // Check for winner
        if (!gameState.winners.includes(boardIndex) && checkWinner(board)) {
            gameState.winners.push(boardIndex);
        }
    });
}

// Unmark number on all boards
function unmarkNumber(number) {
    gameState.boards.forEach((board, boardIndex) => {
        board.forEach(row => {
            row.forEach(cell => {
                if (cell.number === number) {
                    cell.stamped = false;
                }
            });
        });
    });
    
    // Recheck all winners
    gameState.winners = [];
    gameState.boards.forEach((board, boardIndex) => {
        if (checkWinner(board)) {
            gameState.winners.push(boardIndex);
        }
    });
}

// Initialize with default boards
generateAllBoards();

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    
    // Send current game state to newly connected client
    socket.emit('gameState', gameState);
    
    // Handle number call from admin
    socket.on('callNumber', (number) => {
        if (!gameState.calledNumbers.includes(number)) {
            gameState.calledNumbers.push(number);
            markNumber(number);
            io.emit('gameState', gameState);
            io.emit('numberCalled', number);
        }
    });
    
    // Handle undo last number
    socket.on('undoNumber', () => {
        if (gameState.calledNumbers.length > 0) {
            const lastNumber = gameState.calledNumbers.pop();
            unmarkNumber(lastNumber);
            io.emit('gameState', gameState);
            io.emit('numberUndone', lastNumber);
        }
    });
    
    // Handle new game
    socket.on('newGame', (settings) => {
        if (settings) {
            gameState.boardCount = settings.boardCount || gameState.boardCount;
            gameState.boardSize = settings.boardSize || gameState.boardSize;
            gameState.numberRangeMin = settings.numberRangeMin || gameState.numberRangeMin;
            gameState.numberRangeMax = settings.numberRangeMax || gameState.numberRangeMax;
            gameState.winCondition = settings.winCondition || gameState.winCondition;
        }
        generateAllBoards();
        io.emit('gameState', gameState);
        io.emit('newGameStarted');
    });
    
    // Handle settings update
    socket.on('updateSettings', (settings) => {
        gameState.boardCount = settings.boardCount || gameState.boardCount;
        gameState.boardSize = settings.boardSize || gameState.boardSize;
        gameState.numberRangeMin = settings.numberRangeMin || gameState.numberRangeMin;
        gameState.numberRangeMax = settings.numberRangeMax || gameState.numberRangeMax;
        generateAllBoards();
        io.emit('gameState', gameState);
    });
    
    // Handle display scale update (doesn't reset game)
    socket.on('updateDisplayScale', (scale) => {
        gameState.displayScale = Math.max(50, Math.min(200, scale));
        io.emit('gameState', gameState);
    });
    
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

// Routes
app.get('/', (req, res) => {
    res.redirect('/display.html');
});

app.get('/admin', (req, res) => {
    res.redirect('/admin.html');
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🎰 Casino Bingo Server running on port ${PORT}`);
    console.log(`   Display: http://localhost:${PORT}/display.html`);
    console.log(`   Admin:   http://localhost:${PORT}/admin.html`);
});

