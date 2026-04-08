/**
 * Casino Bingo - Display Page Logic
 * Handles real-time updates and board rendering
 */

// Socket.io connection
const socket = io();

// DOM Elements
const boardsContainer = document.getElementById('boardsContainer');
const calledNumbersGrid = document.getElementById('calledNumbersGrid');
const lastCalledNumber = document.getElementById('lastCalledNumber');
const totalCalled = document.getElementById('totalCalled');

// Current game state
let gameState = null;
let previousCalledNumbers = [];

// Connect to server
socket.on('connect', () => {
    console.log('Connected to server');
});

// Receive game state
socket.on('gameState', (state) => {
    const previousState = gameState;
    gameState = state;
    renderBoards(previousState);
    renderCalledNumbers();
    updateLastCalled();
});

// Handle number called event
socket.on('numberCalled', (number) => {
    // Add animation class to newly stamped cells
    highlightNewlyStamped(number);
    
    // Flash the last called number
    lastCalledNumber.classList.add('flash');
    setTimeout(() => lastCalledNumber.classList.remove('flash'), 500);
});

// Handle number undone
socket.on('numberUndone', (number) => {
    console.log('Number undone:', number);
});

// Handle new game
socket.on('newGameStarted', () => {
    // Add a visual indication that a new game started
    boardsContainer.classList.add('new-game-flash');
    setTimeout(() => boardsContainer.classList.remove('new-game-flash'), 1000);
});

/**
 * Render all bingo boards
 */
function renderBoards(previousState) {
    boardsContainer.innerHTML = '';
    
    // Calculate dynamic sizing based on board count and size
    const boardCount = gameState.boards.length;
    const boardSize = gameState.boardSize;
    const displayScale = gameState.displayScale || 100;
    
    // Adjust cell size based on board size and count
    let baseSize = 60;
    if (boardSize > 5) {
        baseSize = Math.max(40, 60 - (boardSize - 5) * 5);
    }
    if (boardCount > 2) {
        baseSize = Math.max(35, baseSize - (boardCount - 2) * 10);
    }
    
    // Apply display scale
    const cellSize = Math.round(baseSize * (displayScale / 100));
    
    gameState.boards.forEach((board, boardIndex) => {
        const boardElement = createBoardElement(board, boardIndex, cellSize, previousState);
        boardsContainer.appendChild(boardElement);
    });
}

/**
 * Create a single board element
 */
function createBoardElement(board, boardIndex, cellSize, previousState) {
    const boardDiv = document.createElement('div');
    boardDiv.className = 'bingo-board';
    boardDiv.id = `board-${boardIndex}`;
    
    // Check if this board is a winner
    const isWinner = gameState.winners.includes(boardIndex);
    if (isWinner) {
        boardDiv.classList.add('winner');
    }
    
    // Board title
    const title = document.createElement('div');
    title.className = 'board-title';
    title.textContent = `Board #${boardIndex + 1}`;
    boardDiv.appendChild(title);
    
    // Board grid
    const grid = document.createElement('div');
    grid.className = 'board-grid';
    grid.style.gridTemplateColumns = `repeat(${board.length}, ${cellSize}px)`;
    
    // Get previous board state to detect new stamps
    const previousBoard = previousState?.boards?.[boardIndex];
    
    board.forEach((row, rowIndex) => {
        row.forEach((cell, colIndex) => {
            const cellDiv = document.createElement('div');
            cellDiv.className = 'bingo-cell';
            cellDiv.style.width = `${cellSize}px`;
            cellDiv.style.height = `${cellSize}px`;
            cellDiv.style.fontSize = `${Math.max(0.8, cellSize / 45)}rem`;
            
            if (cell.number === 'FREE') {
                cellDiv.classList.add('free-space', 'stamped');
                cellDiv.textContent = 'FREE';
            } else {
                cellDiv.textContent = cell.number;
                
                if (cell.stamped) {
                    cellDiv.classList.add('stamped');
                    
                    // Check if this is a newly stamped cell
                    const previousCell = previousBoard?.[rowIndex]?.[colIndex];
                    if (previousCell && !previousCell.stamped && cell.stamped) {
                        cellDiv.classList.add('just-stamped');
                    }
                }
            }
            
            grid.appendChild(cellDiv);
        });
    });
    
    boardDiv.appendChild(grid);
    
    if (isWinner) {
        const banner = document.createElement('div');
        banner.className = 'winner-banner-above';
        banner.innerHTML = `
            <div class="winner-content">
                <div class="winner-text">🎉 WINNER! 🎉</div>
            </div>
        `;
        const wrap = document.createElement('div');
        wrap.className = 'bingo-board-wrap bingo-board-wrap--winner';
        wrap.appendChild(banner);
        wrap.appendChild(boardDiv);
        return wrap;
    }
    
    return boardDiv;
}

/**
 * Highlight newly stamped cells
 */
function highlightNewlyStamped(number) {
    setTimeout(() => {
        const cells = document.querySelectorAll('.bingo-cell');
        cells.forEach(cell => {
            if (cell.textContent == number) {
                cell.classList.add('just-stamped');
                setTimeout(() => cell.classList.remove('just-stamped'), 800);
            }
        });
    }, 50);
}

/**
 * Render called numbers grid
 */
function renderCalledNumbers() {
    calledNumbersGrid.innerHTML = '';
    
    if (gameState.calledNumbers.length === 0) {
        calledNumbersGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #666;">No numbers called yet</p>';
        return;
    }
    
    // Show numbers in reverse order (most recent first)
    const reversedNumbers = [...gameState.calledNumbers].reverse();
    
    reversedNumbers.forEach((number, index) => {
        const numberDiv = document.createElement('div');
        numberDiv.className = 'called-number';
        
        // First one (most recent) gets special styling
        if (index === 0) {
            numberDiv.classList.add('latest');
        }
        
        numberDiv.textContent = number;
        calledNumbersGrid.appendChild(numberDiv);
    });
    
    totalCalled.textContent = gameState.calledNumbers.length;
}

/**
 * Update last called number display
 */
function updateLastCalled() {
    if (gameState.calledNumbers.length > 0) {
        const lastNumber = gameState.calledNumbers[gameState.calledNumbers.length - 1];
        lastCalledNumber.textContent = lastNumber;
    } else {
        lastCalledNumber.textContent = '--';
    }
}

// Add some CSS for flash animation dynamically
const style = document.createElement('style');
style.textContent = `
    .flash {
        animation: flashGold 0.5s ease;
    }
    
    @keyframes flashGold {
        0%, 100% { color: #ffd700; }
        50% { color: #fff; text-shadow: 0 0 30px #ffd700; }
    }
    
    .new-game-flash {
        animation: newGameFlash 1s ease;
    }
    
    @keyframes newGameFlash {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
    }
`;
document.head.appendChild(style);

// Handle disconnection
socket.on('disconnect', () => {
    console.log('Disconnected from server');
});

// Log ready state
console.log('Display page ready');

