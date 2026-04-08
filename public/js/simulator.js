/**
 * Casino Bingo - Simulation Tool
 * For odds analysis and data collection
 */

// DOM Elements
const simBoardSize = document.getElementById('simBoardSize');
const simBoardCount = document.getElementById('simBoardCount');
const simRangeMin = document.getElementById('simRangeMin');
const simRangeMax = document.getElementById('simRangeMax');
const simCount = document.getElementById('simCount');
const simWinType = document.getElementById('simWinType');
const runSimBtn = document.getElementById('runSimBtn');
const stopSimBtn = document.getElementById('stopSimBtn');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const progressPercent = document.getElementById('progressPercent');
const simStatus = document.getElementById('simStatus');
const exportBtn = document.getElementById('exportBtn');
const clearBtn = document.getElementById('clearBtn');
const dataTableBody = document.getElementById('dataTableBody');

// Result elements
const avgDrawsEl = document.getElementById('avgDraws');
const minDrawsEl = document.getElementById('minDraws');
const maxDrawsEl = document.getElementById('maxDraws');
const medianDrawsEl = document.getElementById('medianDraws');
const stdDevEl = document.getElementById('stdDev');
const totalGamesEl = document.getElementById('totalGames');
const p25El = document.getElementById('p25');
const p50El = document.getElementById('p50');
const p75El = document.getElementById('p75');
const p90El = document.getElementById('p90');

// Simulation state
let isRunning = false;
let shouldStop = false;
let simulationResults = [];
let distributionChart = null;
let percentileChart = null;

/**
 * Generate a random bingo board
 */
function generateBoard(size, minNum, maxNum) {
    const board = [];
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
                    if (attempts > range * 2) break;
                } while (usedNumbers.has(num) && usedNumbers.size < range);
                usedNumbers.add(num);
                rowNumbers.push({ number: num, stamped: false });
            }
        }
        board.push(rowNumbers);
    }
    return board;
}

/**
 * Check if board has won based on win type
 */
function checkWin(board, winType) {
    const size = board.length;
    
    // Check rows
    const checkRows = () => {
        for (let row = 0; row < size; row++) {
            if (board[row].every(cell => cell.stamped)) {
                return { won: true, type: 'row' };
            }
        }
        return { won: false };
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
            if (colWin) return { won: true, type: 'column' };
        }
        return { won: false };
    };
    
    // Check diagonals
    const checkDiagonals = () => {
        let diag1Win = true;
        let diag2Win = true;
        for (let i = 0; i < size; i++) {
            if (!board[i][i].stamped) diag1Win = false;
            if (!board[i][size - 1 - i].stamped) diag2Win = false;
        }
        if (diag1Win || diag2Win) return { won: true, type: 'diagonal' };
        return { won: false };
    };
    
    // Check blackout
    const checkBlackout = () => {
        for (let row = 0; row < size; row++) {
            for (let col = 0; col < size; col++) {
                if (!board[row][col].stamped) return { won: false };
            }
        }
        return { won: true, type: 'blackout' };
    };
    
    switch (winType) {
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
            let result = checkRows();
            if (result.won) return result;
            result = checkColumns();
            if (result.won) return result;
            return checkDiagonals();
    }
}

/**
 * Run a single simulation
 */
function runSingleSimulation(boardSize, boardCount, minNum, maxNum, winType) {
    // Generate boards
    const boards = [];
    for (let i = 0; i < boardCount; i++) {
        boards.push(generateBoard(boardSize, minNum, maxNum));
    }
    
    // Generate all possible numbers
    const allNumbers = [];
    for (let i = minNum; i <= maxNum; i++) {
        allNumbers.push(i);
    }
    
    // Shuffle numbers (Fisher-Yates)
    for (let i = allNumbers.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allNumbers[i], allNumbers[j]] = [allNumbers[j], allNumbers[i]];
    }
    
    // Draw numbers until someone wins
    let drawCount = 0;
    let winningBoard = -1;
    let winTypeResult = '';
    
    for (const number of allNumbers) {
        drawCount++;
        
        // Mark number on all boards
        for (const board of boards) {
            for (const row of board) {
                for (const cell of row) {
                    if (cell.number === number) {
                        cell.stamped = true;
                    }
                }
            }
        }
        
        // Check for winners
        for (let i = 0; i < boards.length; i++) {
            const result = checkWin(boards[i], winType);
            if (result.won) {
                winningBoard = i + 1;
                winTypeResult = result.type;
                return { drawCount, winningBoard, winType: winTypeResult };
            }
        }
    }
    
    // Should never reach here unless range is too small
    return { drawCount: allNumbers.length, winningBoard: 0, winType: 'none' };
}

/**
 * Run simulation batch
 */
async function runSimulation() {
    const boardSize = parseInt(simBoardSize.value);
    const boardCount = parseInt(simBoardCount.value);
    const minNum = parseInt(simRangeMin.value);
    const maxNum = parseInt(simRangeMax.value);
    const totalSims = parseInt(simCount.value);
    const winType = simWinType.value;
    
    // Validation
    if (minNum >= maxNum) {
        alert('Min range must be less than max range');
        return;
    }
    
    if (totalSims < 1 || totalSims > 100000) {
        alert('Simulation count must be between 1 and 100,000');
        return;
    }
    
    // Start simulation
    isRunning = true;
    shouldStop = false;
    simulationResults = [];
    
    runSimBtn.disabled = true;
    stopSimBtn.disabled = false;
    exportBtn.disabled = true;
    simStatus.textContent = 'Running simulation...';
    
    const batchSize = 100; // Process in batches for UI responsiveness
    let completed = 0;
    
    const processBatch = () => {
        return new Promise(resolve => {
            setTimeout(() => {
                const batchEnd = Math.min(completed + batchSize, totalSims);
                
                for (let i = completed; i < batchEnd && !shouldStop; i++) {
                    const result = runSingleSimulation(boardSize, boardCount, minNum, maxNum, winType);
                    simulationResults.push({
                        game: i + 1,
                        ...result
                    });
                    completed++;
                }
                
                // Update progress
                const percent = Math.round((completed / totalSims) * 100);
                progressFill.style.width = `${percent}%`;
                progressText.textContent = `${completed} / ${totalSims}`;
                progressPercent.textContent = `${percent}%`;
                
                resolve();
            }, 0);
        });
    };
    
    while (completed < totalSims && !shouldStop) {
        await processBatch();
    }
    
    // Finish up
    isRunning = false;
    runSimBtn.disabled = false;
    stopSimBtn.disabled = true;
    exportBtn.disabled = simulationResults.length === 0;
    
    if (shouldStop) {
        simStatus.textContent = `Simulation stopped at ${completed} games`;
    } else {
        simStatus.textContent = `Simulation complete! ${totalSims} games processed`;
    }
    
    // Update results
    updateResults();
    updateCharts();
    updateTable();
}

/**
 * Calculate and display results
 */
function updateResults() {
    if (simulationResults.length === 0) {
        avgDrawsEl.textContent = '--';
        minDrawsEl.textContent = '--';
        maxDrawsEl.textContent = '--';
        medianDrawsEl.textContent = '--';
        stdDevEl.textContent = '--';
        totalGamesEl.textContent = '--';
        return;
    }
    
    const draws = simulationResults.map(r => r.drawCount);
    const sorted = [...draws].sort((a, b) => a - b);
    
    // Basic stats
    const sum = draws.reduce((a, b) => a + b, 0);
    const avg = sum / draws.length;
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const median = sorted.length % 2 === 0
        ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
        : sorted[Math.floor(sorted.length / 2)];
    
    // Standard deviation
    const squareDiffs = draws.map(value => Math.pow(value - avg, 2));
    const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / draws.length;
    const stdDev = Math.sqrt(avgSquareDiff);
    
    // Percentiles
    const getPercentile = (arr, p) => {
        const index = Math.ceil((p / 100) * arr.length) - 1;
        return arr[Math.max(0, index)];
    };
    
    avgDrawsEl.textContent = avg.toFixed(2);
    minDrawsEl.textContent = min;
    maxDrawsEl.textContent = max;
    medianDrawsEl.textContent = median.toFixed(1);
    stdDevEl.textContent = stdDev.toFixed(2);
    totalGamesEl.textContent = simulationResults.length.toLocaleString();
    
    p25El.textContent = getPercentile(sorted, 25);
    p50El.textContent = getPercentile(sorted, 50);
    p75El.textContent = getPercentile(sorted, 75);
    p90El.textContent = getPercentile(sorted, 90);
}

/**
 * Update charts
 */
function updateCharts() {
    if (simulationResults.length === 0) return;
    
    const draws = simulationResults.map(r => r.drawCount);
    const min = Math.min(...draws);
    const max = Math.max(...draws);
    
    // Create distribution data
    const distribution = {};
    for (let i = min; i <= max; i++) {
        distribution[i] = 0;
    }
    draws.forEach(d => distribution[d]++);
    
    const labels = Object.keys(distribution).map(Number);
    const data = Object.values(distribution);
    
    // Distribution chart
    if (distributionChart) {
        distributionChart.destroy();
    }
    
    const ctx1 = document.getElementById('distributionChart').getContext('2d');
    distributionChart = new Chart(ctx1, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Games',
                data: data,
                backgroundColor: 'rgba(0, 125, 186, 0.7)',
                borderColor: '#007dba',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: true,
                    text: 'Distribution of Draws to Win',
                    color: '#fff'
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Number of Draws',
                        color: '#ccc'
                    },
                    ticks: { color: '#ccc' },
                    grid: { color: 'rgba(255,255,255,0.1)' }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Frequency',
                        color: '#ccc'
                    },
                    ticks: { color: '#ccc' },
                    grid: { color: 'rgba(255,255,255,0.1)' }
                }
            }
        }
    });
    
    // Cumulative probability chart
    let cumulative = 0;
    const cumulativeData = data.map(d => {
        cumulative += d;
        return (cumulative / simulationResults.length) * 100;
    });
    
    if (percentileChart) {
        percentileChart.destroy();
    }
    
    const ctx2 = document.getElementById('percentileChart').getContext('2d');
    percentileChart = new Chart(ctx2, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Cumulative %',
                data: cumulativeData,
                backgroundColor: 'rgba(23, 62, 80, 0.3)',
                borderColor: '#173e50',
                borderWidth: 2,
                fill: true,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: true,
                    text: 'Cumulative Probability of Winning',
                    color: '#fff'
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Number of Draws',
                        color: '#ccc'
                    },
                    ticks: { color: '#ccc' },
                    grid: { color: 'rgba(255,255,255,0.1)' }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Probability (%)',
                        color: '#ccc'
                    },
                    ticks: { color: '#ccc' },
                    grid: { color: 'rgba(255,255,255,0.1)' },
                    min: 0,
                    max: 100
                }
            }
        }
    });
}

/**
 * Update data table
 */
function updateTable() {
    if (simulationResults.length === 0) {
        dataTableBody.innerHTML = '<tr><td colspan="4" class="no-data">No simulation data yet</td></tr>';
        return;
    }
    
    // Show last 100 results
    const recentResults = simulationResults.slice(-100).reverse();
    
    dataTableBody.innerHTML = recentResults.map(r => `
        <tr>
            <td>${r.game}</td>
            <td>${r.drawCount}</td>
            <td>Board ${r.winningBoard}</td>
            <td>${r.winType}</td>
        </tr>
    `).join('');
}

/**
 * Export to CSV
 */
function exportToCSV() {
    if (simulationResults.length === 0) return;
    
    const headers = ['Game', 'Draws to Win', 'Winning Board', 'Win Type'];
    const rows = simulationResults.map(r => [r.game, r.drawCount, r.winningBoard, r.winType]);
    
    // Add summary stats
    const draws = simulationResults.map(r => r.drawCount);
    const avg = draws.reduce((a, b) => a + b, 0) / draws.length;
    
    let csv = headers.join(',') + '\n';
    csv += rows.map(r => r.join(',')).join('\n');
    csv += '\n\n';
    csv += 'Summary Statistics\n';
    csv += `Total Games,${simulationResults.length}\n`;
    csv += `Average Draws,${avg.toFixed(2)}\n`;
    csv += `Min Draws,${Math.min(...draws)}\n`;
    csv += `Max Draws,${Math.max(...draws)}\n`;
    csv += `Board Size,${simBoardSize.value}x${simBoardSize.value}\n`;
    csv += `Board Count,${simBoardCount.value}\n`;
    csv += `Number Range,${simRangeMin.value}-${simRangeMax.value}\n`;
    csv += `Win Type,${simWinType.value}\n`;
    
    // Download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bingo_simulation_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

/**
 * Clear all data
 */
function clearData() {
    simulationResults = [];
    progressFill.style.width = '0%';
    progressText.textContent = '0 / 0';
    progressPercent.textContent = '0%';
    simStatus.textContent = 'Ready to simulate';
    exportBtn.disabled = true;
    
    updateResults();
    updateTable();
    
    if (distributionChart) {
        distributionChart.destroy();
        distributionChart = null;
    }
    if (percentileChart) {
        percentileChart.destroy();
        percentileChart = null;
    }
}

// Event Listeners
runSimBtn.addEventListener('click', runSimulation);
stopSimBtn.addEventListener('click', () => { shouldStop = true; });
exportBtn.addEventListener('click', exportToCSV);
clearBtn.addEventListener('click', clearData);

console.log('Simulator ready');

