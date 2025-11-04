/* 井字棋游戏逻辑 */
(function() {
  const boardEl = document.getElementById('board');
  const statusEl = document.getElementById('status');
  const modeSelect = document.getElementById('modeSelect');
  const difficultySelect = document.getElementById('difficultySelect');
  const restartBtn = document.getElementById('restartBtn');
  const firstPlayerSelect = document.getElementById('firstPlayerSelect');
  const themeToggle = document.getElementById('themeToggle');
  const difficultyWrap = document.getElementById('difficultyWrap');
  const scoreXEl = document.getElementById('scoreX');
  const scoreOEl = document.getElementById('scoreO');
  const scoreDrawEl = document.getElementById('scoreDraw');

  const SIZE = 3;
  let board = Array(9).fill(null); // index 0..8
  let current = 'X';
  let gameOver = false;
  let scores = { X: 0, O: 0, draw: 0 };

  const winningLines = [
    [0,1,2],[3,4,5],[6,7,8], // rows
    [0,3,6],[1,4,7],[2,5,8], // cols
    [0,4,8],[2,4,6]          // diagonals
  ];

  function renderBoard() {
    boardEl.innerHTML = '';
    board.forEach((val, i) => {
      const cell = document.createElement('button');
      cell.className = 'cell';
      cell.setAttribute('role','gridcell');
      cell.dataset.index = i;
      cell.disabled = !!val || gameOver; // disable if filled or game ended
      cell.textContent = val ? val : '';
      cell.addEventListener('click', onCellClick);
      boardEl.appendChild(cell);
    });
  }

  function onCellClick(e) {
    const idx = parseInt(e.currentTarget.dataset.index, 10);
    if (board[idx] || gameOver) return;
    board[idx] = current;
    updateAfterMove();
    // AI turn if applicable
    if (!gameOver && modeSelect.value === 'pve') {
      const aiPlayer = current; // updateAfterMove 已切换 current，所以此时 current 是 AI 标记
      if (aiPlayer === (firstPlayerSelect.value === 'X' ? 'O' : 'X')) {
        setTimeout(aiMove, 120); // 微延迟模拟思考
      }
    }
  }

  function updateAfterMove() {
    const winnerLine = getWinnerLine();
    if (winnerLine) {
      gameOver = true;
      const winner = board[winnerLine[0]];
      scores[winner]++;
      highlightWinner(winnerLine);
      statusEl.textContent = `玩家 ${winner} 胜利！`;
      updateScores();
      disableRemaining();
      return;
    }
    if (board.every(Boolean)) {
      gameOver = true;
      scores.draw++;
      statusEl.textContent = '平局';
      markDraw();
      updateScores();
      return;
    }
    current = current === 'X' ? 'O' : 'X';
    statusEl.textContent = `轮到 ${current}`;
    renderBoard();
  }

  function disableRemaining() {
    [...boardEl.children].forEach(btn => btn.disabled = true);
  }

  function markDraw() {
    [...boardEl.children].forEach(btn => {
      if (!btn.classList.contains('winning')) btn.classList.add('draw');
    });
  }

  function highlightWinner(line) {
    [...boardEl.children].forEach((btn,i) => {
      if (line.includes(i)) btn.classList.add('winning');
      btn.disabled = true;
    });
  }

  function getWinnerLine() {
    for (const line of winningLines) {
      const [a,b,c] = line;
      if (board[a] && board[a] === board[b] && board[b] === board[c]) return line;
    }
    return null;
  }

  function updateScores() {
    scoreXEl.textContent = scores.X;
    scoreOEl.textContent = scores.O;
    scoreDrawEl.textContent = scores.draw;
  }

  function reset() {
    board = Array(9).fill(null);
    gameOver = false;
    current = firstPlayerSelect.value;
    statusEl.textContent = `开始！先手 ${current}`;
    renderBoard();
    // 如果是人机模式且先手不是玩家，则 AI 立即走
    if (modeSelect.value === 'pve' && current !== firstPlayerSelect.value) {
      setTimeout(aiMove, 150);
    }
  }

  function aiMove() {
    if (gameOver) return;
    let move;
    const level = difficultySelect.value;
    if (level === 'easy') {
      move = randomMove();
    } else if (level === 'medium') {
      move = bestMove(current, 2); // 限制搜索深度
    } else { // hard
      move = bestMove(current); // 完全搜索
    }
    if (move == null) move = randomMove();
    board[move] = current;
    updateAfterMove();
  }

  function randomMove() {
    const candidates = board.map((v,i) => v ? null : i).filter(v => v != null);
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  // Minimax 搜索
  function bestMove(player, depthLimit) {
    const opponent = player === 'X' ? 'O' : 'X';
    let bestScore = -Infinity;
    let move = null;
    for (let i=0;i<9;i++) {
      if (!board[i]) {
        board[i] = player;
        const score = minimax(board, false, player, opponent, depthLimit, 0);
        board[i] = null;
        if (score > bestScore) { bestScore = score; move = i; }
      }
    }
    return move;
  }

  function minimax(state, isMax, player, opponent, depthLimit, currentDepth) {
    const winnerLine = evaluateWinner(state);
    if (winnerLine) {
      const w = state[winnerLine[0]];
      if (w === player) return 10 - currentDepth; // 快速获胜更好
      if (w === opponent) return currentDepth - 10; // 延迟失败更好
    }
    if (state.every(Boolean)) return 0; // draw
    if (depthLimit != null && currentDepth >= depthLimit) {
      return heuristic(state, player, opponent); // 估值
    }

    const symbol = isMax ? player : opponent;
    let best = isMax ? -Infinity : Infinity;
    for (let i=0;i<9;i++) {
      if (!state[i]) {
        state[i] = symbol;
        const score = minimax(state, !isMax, player, opponent, depthLimit, currentDepth+1);
        state[i] = null;
        if (isMax) {
          if (score > best) best = score;
        } else {
          if (score < best) best = score;
        }
      }
    }
    return best;
  }

  function heuristic(state, player, opponent) {
    // 简单估值：统计尚可赢的线
    let score = 0;
    for (const line of winningLines) {
      const symbols = line.map(i => state[i]);
      if (symbols.includes(opponent) && symbols.includes(player)) continue; // 双占，无价值
      const playerCount = symbols.filter(s => s === player).length;
      const oppCount = symbols.filter(s => s === opponent).length;
      if (playerCount && !oppCount) score += Math.pow(2, playerCount); // 自己潜在连线加权
      if (oppCount && !playerCount) score -= Math.pow(2, oppCount); // 对手潜在威胁减分
    }
    return score;
  }

  function evaluateWinner(state) {
    for (const line of winningLines) {
      const [a,b,c] = line;
      if (state[a] && state[a] === state[b] && state[b] === state[c]) return line;
    }
    return null;
  }

  // 事件绑定
  restartBtn.addEventListener('click', reset);
  modeSelect.addEventListener('change', () => {
    difficultyWrap.style.display = modeSelect.value === 'pve' ? 'flex' : 'none';
    reset();
  });
  difficultySelect.addEventListener('change', () => {
    if (modeSelect.value === 'pve') reset();
  });
  firstPlayerSelect.addEventListener('change', reset);
  themeToggle.addEventListener('click', () => {
    document.documentElement.classList.toggle('dark');
    themeToggle.textContent = document.documentElement.classList.contains('dark') ? '🌞' : '🌗';
  });

  // 初始
  difficultyWrap.style.display = modeSelect.value === 'pve' ? 'flex' : 'none';
  reset();
})();