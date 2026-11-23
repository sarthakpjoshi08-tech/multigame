const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Game state
const games = new Map();
const players = new Map();

// Generate a random game code
function generateGameCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Create a new game
function createGame(hostId, playerName) {
  const gameCode = generateGameCode();
  const game = {
    code: gameCode,
    host: hostId,
    players: new Map(),
    state: 'waiting', // waiting, playing, finished
    board: Array(9).fill(null),
    currentPlayer: 'X',
    winner: null,
    winningLine: null
  };
  games.set(gameCode, game);
  return gameCode;
}

// Add player to game
function addPlayerToGame(gameCode, playerId, playerName) {
  const game = games.get(gameCode);
  if (!game) return { success: false, message: 'Game not found' };

  if (game.state !== 'waiting') {
    return { success: false, message: 'Game already started' };
  }

  if (game.players.size >= 2) {
    return { success: false, message: 'Game is full' };
  }

  const symbol = game.players.size === 0 ? 'X' : 'O';
  const player = {
    id: playerId,
    name: playerName,
    symbol: symbol,
    isHost: game.players.size === 0
  };

  game.players.set(playerId, player);
  players.set(playerId, { gameCode, ...player });

  return { success: true, game, player };
}

// Handle player move
function handleMove(gameCode, playerId, position) {
  const game = games.get(gameCode);
  if (!game) return { success: false, message: 'Game not found' };

  const player = game.players.get(playerId);
  if (!player) return { success: false, message: 'Player not in game' };

  if (game.state !== 'playing') return { success: false, message: 'Game not in progress' };
  if (game.currentPlayer !== player.symbol) return { success: false, message: 'Not your turn' };
  if (game.board[position] !== null) return { success: false, message: 'Position already taken' };

  game.board[position] = player.symbol;

  // Check for winner
  const winner = checkWinner(game.board);
  if (winner) {
    game.state = 'finished';
    game.winner = winner.symbol;
    game.winningLine = winner.line;
  } else if (game.board.every(cell => cell !== null)) {
    game.state = 'finished';
    game.winner = 'draw';
  } else {
    game.currentPlayer = game.currentPlayer === 'X' ? 'O' : 'X';
  }

  return { success: true, game };
}

function checkWinner(board) {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
    [0, 4, 8], [2, 4, 6] // diagonals
  ];

  for (const line of lines) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { symbol: board[a], line };
    }
  }
  return null;
}

// Remove player from game
function removePlayer(playerId) {
  const playerData = players.get(playerId);
  if (!playerData) return;

  const game = games.get(playerData.gameCode);
  if (game) {
    game.players.delete(playerId);
    if (game.players.size === 0) {
      games.delete(playerData.gameCode);
    } else if (game.state === 'playing') {
      game.state = 'finished';
      game.winner = 'abandoned';
    }
  }
  players.delete(playerId);
}

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Create new game
  socket.on('create-game', (playerName) => {
    const gameCode = createGame(socket.id, playerName);
    const result = addPlayerToGame(gameCode, socket.id, playerName);

    if (result.success) {
      socket.join(gameCode);
      socket.emit('game-created', { gameCode, player: result.player, game: result.game });
    } else {
      socket.emit('error', { message: result.message });
    }
  });

  // Join existing game
  socket.on('join-game', (data) => {
    const { gameCode, playerName } = data;
    const result = addPlayerToGame(gameCode.toUpperCase(), socket.id, playerName);

    if (result.success) {
      socket.join(gameCode);
      socket.emit('game-joined', { gameCode, player: result.player, game: result.game });

      // Notify host that someone joined
      socket.to(gameCode).emit('player-joined', {
        player: result.player,
        game: result.game
      });

      // Start game if 2 players
      if (result.game.players.size === 2) {
        result.game.state = 'playing';
        io.to(gameCode).emit('game-started', { game: result.game });
      }
    } else {
      socket.emit('error', { message: result.message });
    }
  });

  // Make a move
  socket.on('make-move', (data) => {
    const { gameCode, position } = data;
    const result = handleMove(gameCode, socket.id, position);

    if (result.success) {
      io.to(gameCode).emit('move-made', {
        position,
        playerId: socket.id,
        game: result.game
      });

      if (result.game.state === 'finished') {
        io.to(gameCode).emit('game-ended', {
          winner: result.game.winner,
          winningLine: result.game.winningLine,
          game: result.game
        });
      }
    } else {
      socket.emit('error', { message: result.message });
    }
  });

  // Restart game
  socket.on('restart-game', (gameCode) => {
    const game = games.get(gameCode);
    if (!game) return;

    const player = game.players.get(socket.id);
    if (!player || !player.isHost) return;

    game.board = Array(9).fill(null);
    game.currentPlayer = 'X';
    game.state = 'playing';
    game.winner = null;
    game.winningLine = null;

    io.to(gameCode).emit('game-restarted', { game });
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    const playerData = players.get(socket.id);
    if (playerData) {
      const gameCode = playerData.gameCode;
      removePlayer(socket.id);
      socket.to(gameCode).emit('player-left', { playerId: socket.id });
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});