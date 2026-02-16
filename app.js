"use strict";

const PIECE_TILE_MAP = {
  wk: { x: 0, y: 0 },
  wq: { x: 1, y: 0 },
  wb: { x: 2, y: 0 },
  wn: { x: 3, y: 0 },
  wr: { x: 4, y: 0 },
  wp: { x: 5, y: 0 },
  wo: { x: 6, y: 0 },
  wu: { x: 0, y: 3 },
  bk: { x: 0, y: 1 },
  bq: { x: 1, y: 1 },
  bb: { x: 2, y: 1 },
  bn: { x: 3, y: 1 },
  br: { x: 4, y: 1 },
  bp: { x: 5, y: 1 },
  bo: { x: 6, y: 1 },
  bu: { x: 0, y: 2 }
};

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
const SPRITE_SHEET = { columns: 7, rows: 4 };

const KNIGHT_LEAPS = [
  [-2, -1],
  [-2, 1],
  [-1, -2],
  [-1, 2],
  [1, -2],
  [1, 2],
  [2, -1],
  [2, 1]
];

const ORTHOGONAL_THREE_LEAPS = [
  [-3, 0],
  [3, 0],
  [0, -3],
  [0, 3]
];

const BISHOP_RAYS = [
  [-1, -1],
  [-1, 1],
  [1, -1],
  [1, 1]
];

const ROOK_RAYS = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1]
];

const KING_STEPS = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1]
];

const CASTLING_ROUTES = {
  w: {
    kingside: {
      flag: "wK",
      kingFrom: 60,
      kingTo: 62,
      rookFrom: 63,
      rookTo: 61,
      emptySquares: [61, 62],
      safeSquares: [61, 62]
    },
    queenside: {
      flag: "wQ",
      kingFrom: 60,
      kingTo: 58,
      rookFrom: 56,
      rookTo: 59,
      emptySquares: [59, 58, 57],
      safeSquares: [59, 58]
    }
  },
  b: {
    kingside: {
      flag: "bK",
      kingFrom: 4,
      kingTo: 6,
      rookFrom: 7,
      rookTo: 5,
      emptySquares: [5, 6],
      safeSquares: [5, 6]
    },
    queenside: {
      flag: "bQ",
      kingFrom: 4,
      kingTo: 2,
      rookFrom: 0,
      rookTo: 3,
      emptySquares: [3, 2, 1],
      safeSquares: [3, 2]
    }
  }
};

const CUSTOM_SVG_RENDERERS = {};

const PIECE_SETS = [
  {
    id: "classic",
    name: "Classic",
    description: "Standard chess movement for every piece.",
    promotionType: "q",
    pieces: createClassicPieceDefinitions(),
    layout: createClassicLayout()
  },
  {
    id: "overknight",
    name: "Overknight",
    description: "Redesigned knights with extra 3-square orthogonal leaps.",
    promotionType: "q",
    pieces: createOverknightPieceDefinitions(),
    layout: createClassicLayout()
  },
  {
    id: "bureaucrat",
    name: "The Bureaucrat",
    description: "Adds a redeployable bureaucrat that moves to any empty square and cannot capture.",
    promotionType: "q",
    pieces: createBureaucratPieceDefinitions(),
    layout: createBureaucratLayout()
  },
  {
    id: "royal-pawns",
    name: "Royal Pawns",
    description: "Pawns can capture one square on any diagonal, forward or backward.",
    promotionType: "q",
    pieces: createRoyalPawnsPieceDefinitions(),
    layout: createClassicLayout()
  }
];

const boardEl = document.querySelector("#board");
const reserveBlackEl = document.querySelector("#reserve-black");
const reserveWhiteEl = document.querySelector("#reserve-white");
const statusEl = document.querySelector("#status");
const blackClockEl = document.querySelector("#clock-black");
const whiteClockEl = document.querySelector("#clock-white");
const whiteSetPrevBtn = document.querySelector("#white-set-prev");
const whiteSetNameEl = document.querySelector("#white-set-name");
const whiteSetNextBtn = document.querySelector("#white-set-next");
const whiteSetDescriptionEl = document.querySelector("#white-set-description");
const blackSetPrevBtn = document.querySelector("#black-set-prev");
const blackSetNameEl = document.querySelector("#black-set-name");
const blackSetNextBtn = document.querySelector("#black-set-next");
const blackSetDescriptionEl = document.querySelector("#black-set-description");
const baseMinutesInput = document.querySelector("#base-minutes");
const incrementSecondsInput = document.querySelector("#increment-seconds");
const toggleClockBtn = document.querySelector("#toggle-clock");
const newGameBtn = document.querySelector("#new-game");

const pieceSetSelection = { w: 0, b: 0 };
const customPieceImageCache = new Map();

let gameState = createInitialGameState();
let gameStarted = false;
let selectedSquare = null;
let selectedReserve = null;
let legalTargets = [];
let legalCaptureTargets = [];
let lastMove = null;
let statusMessage = "";
let suppressNextClick = false;

const dragState = {
  active: false,
  pointerId: null,
  from: null,
  moved: false,
  startX: 0,
  startY: 0,
  pieceRef: null,
  ghostEl: null
};

const clockState = {
  baseMs: 10 * 60 * 1000,
  incrementMs: 5 * 1000,
  remaining: { w: 10 * 60 * 1000, b: 10 * 60 * 1000 },
  running: false,
  activeColor: "w",
  lastTick: performance.now()
};

function createClassicPieceDefinitions() {
  return {
    p: {
      name: "Pawn",
      render: { kind: "sprite", code: "p" },
      movement: { pawn: true },
      traits: { pawn: true }
    },
    n: {
      name: "Knight",
      render: { kind: "sprite", code: "n" },
      movement: { leaps: KNIGHT_LEAPS }
    },
    b: {
      name: "Bishop",
      render: { kind: "sprite", code: "b" },
      movement: { rays: BISHOP_RAYS }
    },
    r: {
      name: "Rook",
      render: { kind: "sprite", code: "r" },
      movement: { rays: ROOK_RAYS },
      traits: { castlingRook: true }
    },
    q: {
      name: "Queen",
      render: { kind: "sprite", code: "q" },
      movement: { rays: [...ROOK_RAYS, ...BISHOP_RAYS] }
    },
    k: {
      name: "King",
      render: { kind: "sprite", code: "k" },
      movement: { leaps: KING_STEPS, castling: true },
      traits: { royal: true, castlingKing: true }
    }
  };
}

function createOverknightPieceDefinitions() {
  const pieces = createClassicPieceDefinitions();
  pieces.n = {
    name: "Overknight",
    render: { kind: "sprite", code: "o" },
    movement: { leaps: [...KNIGHT_LEAPS, ...ORTHOGONAL_THREE_LEAPS] }
  };

  // Example 7th piece type support. Not placed by default.
  pieces.o = {
    name: "Outrider",
    render: { kind: "sprite", code: "o" },
    movement: {
      leaps: [
        [-3, -1],
        [-3, 1],
        [3, -1],
        [3, 1],
        [-1, -3],
        [-1, 3],
        [1, -3],
        [1, 3]
      ]
    }
  };

  return pieces;
}

function createBureaucratPieceDefinitions() {
  const pieces = createClassicPieceDefinitions();
  pieces.u = {
    name: "Bureaucrat",
    render: { kind: "sprite", code: "u" },
    movement: { anyEmptySquare: true },
    traits: { redeployable: true }
  };
  return pieces;
}

function createRoyalPawnsPieceDefinitions() {
  const pieces = createClassicPieceDefinitions();
  pieces.p = {
    ...pieces.p,
    movement: {
      ...pieces.p.movement,
      captureDirections: [
        [-1, -1],
        [-1, 1],
        [1, -1],
        [1, 1]
      ]
    }
  };
  return pieces;
}

function createClassicLayout() {
  const backRank = ["r", "n", "b", "q", "k", "b", "n", "r"];
  return {
    w: [...createRankLayout(1, backRank), ...createFilledRankLayout(2, "p")],
    b: [...createRankLayout(8, backRank), ...createFilledRankLayout(7, "p")]
  };
}

function createBureaucratLayout() {
  const classic = createClassicLayout();
  return {
    w: [...classic.w, { type: "u", square: "a3" }],
    b: [...classic.b, { type: "u", square: "h6" }]
  };
}

function createRankLayout(rank, types) {
  return types.map((type, index) => ({ type, square: `${FILES[index]}${rank}` }));
}

function createFilledRankLayout(rank, type) {
  return FILES.map((file) => ({ type, square: `${file}${rank}` }));
}

function inBounds(row, col) {
  return row >= 0 && row < 8 && col >= 0 && col < 8;
}

function indexFromRowCol(row, col) {
  return row * 8 + col;
}

function rowFromIndex(index) {
  return Math.floor(index / 8);
}

function colFromIndex(index) {
  return index % 8;
}

function indexFromAlgebraic(square) {
  if (typeof square !== "string" || square.length < 2) {
    return -1;
  }
  const file = square[0].toLowerCase();
  const rank = Number(square.slice(1));
  const col = FILES.indexOf(file);
  if (col < 0 || !Number.isInteger(rank) || rank < 1 || rank > 8) {
    return -1;
  }
  const row = 8 - rank;
  return indexFromRowCol(row, col);
}

function oppositeColor(color) {
  return color === "w" ? "b" : "w";
}

function colorName(color) {
  return color === "w" ? "White" : "Black";
}

function getPieceSetForColor(color) {
  return PIECE_SETS[pieceSetSelection[color]];
}

function getPieceDefinition(color, type) {
  const pieceSet = getPieceSetForColor(color);
  if (!pieceSet || !pieceSet.pieces) {
    return null;
  }
  return pieceSet.pieces[type] || null;
}

function pieceHasTrait(piece, trait) {
  if (!piece) {
    return false;
  }
  const def = getPieceDefinition(piece.color, piece.type);
  return Boolean(def && def.traits && def.traits[trait]);
}

function getPromotionTypeForColor(color) {
  const pieceSet = getPieceSetForColor(color);
  if (!pieceSet || !pieceSet.pieces) {
    return null;
  }

  if (pieceSet.promotionType && pieceSet.pieces[pieceSet.promotionType]) {
    return pieceSet.promotionType;
  }

  return Object.keys(pieceSet.pieces).find((type) => !pieceSet.pieces[type].traits?.pawn) || null;
}

function createInitialBoard() {
  const board = new Array(64).fill(null);
  applyLayoutForColor(board, "w");
  applyLayoutForColor(board, "b");
  return board;
}

function applyLayoutForColor(board, color) {
  const pieceSet = getPieceSetForColor(color);
  const placements = pieceSet?.layout?.[color] || [];

  for (const placement of placements) {
    if (!placement || !pieceSet.pieces[placement.type]) {
      continue;
    }

    const square = typeof placement.square === "number"
      ? placement.square
      : indexFromAlgebraic(placement.square);

    if (!Number.isInteger(square) || square < 0 || square > 63) {
      continue;
    }

    board[square] = { color, type: placement.type };
  }
}

function computeInitialCastlingRights(board) {
  const rights = { wK: false, wQ: false, bK: false, bQ: false };

  for (const color of ["w", "b"]) {
    const routes = CASTLING_ROUTES[color];
    if (!routes) {
      continue;
    }

    const king = board[routes.kingside.kingFrom];
    const kingValid = king && king.color === color && pieceHasTrait(king, "castlingKing");
    if (!kingValid) {
      continue;
    }

    const kingsideRook = board[routes.kingside.rookFrom];
    if (kingsideRook && kingsideRook.color === color && pieceHasTrait(kingsideRook, "castlingRook")) {
      rights[routes.kingside.flag] = true;
    }

    const queensideRook = board[routes.queenside.rookFrom];
    if (queensideRook && queensideRook.color === color && pieceHasTrait(queensideRook, "castlingRook")) {
      rights[routes.queenside.flag] = true;
    }
  }

  return rights;
}

function createInitialGameState() {
  const board = createInitialBoard();
  return {
    board,
    reserves: { w: [], b: [] },
    turn: "w",
    castling: computeInitialCastlingRights(board),
    enPassant: null,
    gameOver: false,
    winner: null
  };
}

function cloneGameState(state) {
  return {
    board: state.board.map((piece) => (piece ? { ...piece } : null)),
    reserves: {
      w: state.reserves.w.map((piece) => ({ ...piece })),
      b: state.reserves.b.map((piece) => ({ ...piece }))
    },
    turn: state.turn,
    castling: { ...state.castling },
    enPassant: state.enPassant,
    gameOver: state.gameOver,
    winner: state.winner
  };
}

function getCustomPieceImage(svgId, color) {
  const key = `${svgId}:${color}`;
  const cached = customPieceImageCache.get(key);
  if (cached) {
    return cached;
  }

  const renderer = CUSTOM_SVG_RENDERERS[svgId];
  if (!renderer) {
    return null;
  }

  const svg = renderer(color);
  const encoded = encodeURIComponent(svg);
  const image = `url("data:image/svg+xml;utf8,${encoded}")`;
  customPieceImageCache.set(key, image);
  return image;
}

function buildPieceEl(piece) {
  const pieceEl = document.createElement("div");
  pieceEl.className = "piece";
  pieceEl.dataset.color = piece.color;
  pieceEl.dataset.type = piece.type;

  const def = getPieceDefinition(piece.color, piece.type);
  if (!def) {
    pieceEl.classList.add("piece-missing-art");
    return pieceEl;
  }

  const render = def.render || {};

  if (render.kind === "svg") {
    const image = getCustomPieceImage(render.svgId, piece.color);
    if (image) {
      pieceEl.style.backgroundImage = image;
      pieceEl.style.backgroundSize = "100% 100%";
      pieceEl.style.backgroundPosition = "50% 50%";
      pieceEl.style.backgroundRepeat = "no-repeat";
      pieceEl.classList.add("piece-custom-art");
      return pieceEl;
    }
  }

  const spriteCode = render.code || piece.type;
  const tile = PIECE_TILE_MAP[`${piece.color}${spriteCode}`];
  if (!tile) {
    pieceEl.classList.add("piece-missing-art");
    return pieceEl;
  }

  const xStep = SPRITE_SHEET.columns > 1 ? 100 / (SPRITE_SHEET.columns - 1) : 0;
  const yStep = SPRITE_SHEET.rows > 1 ? 100 / (SPRITE_SHEET.rows - 1) : 0;
  pieceEl.style.setProperty("--bg-x", `${tile.x * xStep}%`);
  pieceEl.style.setProperty("--bg-y", `${tile.y * yStep}%`);
  return pieceEl;
}

function renderBoard() {
  boardEl.innerHTML = "";
  const legalTargetSet = new Set(legalTargets);
  const legalCaptureTargetSet = new Set(legalCaptureTargets);

  for (let square = 0; square < 64; square += 1) {
    const row = rowFromIndex(square);
    const col = colFromIndex(square);
    const squareEl = document.createElement("div");
    squareEl.className = `square ${(row + col) % 2 === 0 ? "square-light" : "square-dark"}`;
    squareEl.dataset.square = String(square);

    if (selectedSquare === square) {
      squareEl.classList.add("square-selected");
    }
    if (lastMove && (lastMove.from === square || lastMove.to === square)) {
      squareEl.classList.add("square-last");
    }

    if (legalTargetSet.has(square)) {
      squareEl.classList.add(legalCaptureTargetSet.has(square) ? "square-capture" : "square-legal");
    }

    const piece = gameState.board[square];
    if (piece) {
      const pieceEl = buildPieceEl(piece);
      if (dragState.active && dragState.moved && dragState.from === square) {
        pieceEl.classList.add("piece-hidden");
      }
      squareEl.append(pieceEl);
    }

    boardEl.append(squareEl);
  }
}

function renderReserveForColor(color, containerEl) {
  if (!containerEl) {
    return;
  }

  containerEl.innerHTML = "";

  const labelEl = document.createElement("p");
  labelEl.className = "reserve-label";
  labelEl.textContent = `${colorName(color)} reserve`;
  containerEl.append(labelEl);

  const trayEl = document.createElement("div");
  trayEl.className = "reserve-tray";

  const reservePieces = gameState.reserves[color] || [];
  if (reservePieces.length === 0) {
    const emptyEl = document.createElement("span");
    emptyEl.className = "reserve-empty";
    emptyEl.textContent = "empty";
    trayEl.append(emptyEl);
  } else {
    reservePieces.forEach((piece, index) => {
      const pieceName = getPieceDefinition(piece.color, piece.type)?.name || piece.type;
      const buttonEl = document.createElement("button");
      buttonEl.className = "reserve-piece";
      buttonEl.type = "button";
      buttonEl.dataset.color = color;
      buttonEl.dataset.index = String(index);
      buttonEl.setAttribute("aria-label", `${colorName(color)} ${pieceName} in reserve`);
      if (selectedReserve && selectedReserve.color === color && selectedReserve.index === index) {
        buttonEl.classList.add("reserve-piece-selected");
      }

      buttonEl.append(buildPieceEl(piece));
      trayEl.append(buttonEl);
    });
  }

  containerEl.append(trayEl);
}

function renderReserves() {
  renderReserveForColor("b", reserveBlackEl);
  renderReserveForColor("w", reserveWhiteEl);
}

function renderStatus() {
  statusEl.textContent = statusMessage;
}

function formatTime(ms) {
  const clamped = Math.max(0, ms);
  const totalSeconds = Math.floor(clamped / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (clamped < 10_000) {
    const tenths = Math.floor((clamped % 1000) / 100);
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${tenths}`;
  }
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function getDisplayedRemaining(color) {
  let ms = clockState.remaining[color];
  if (clockState.running && !gameState.gameOver && clockState.activeColor === color) {
    ms -= performance.now() - clockState.lastTick;
  }
  return Math.max(0, ms);
}

function renderClocks() {
  const whiteMs = getDisplayedRemaining("w");
  const blackMs = getDisplayedRemaining("b");
  whiteClockEl.textContent = formatTime(whiteMs);
  blackClockEl.textContent = formatTime(blackMs);
  whiteClockEl.classList.toggle("clock-active", clockState.running && clockState.activeColor === "w");
  blackClockEl.classList.toggle("clock-active", clockState.running && clockState.activeColor === "b");
}

function renderControls() {
  toggleClockBtn.textContent = clockState.running ? "Pause Clock" : "Start Clock";
}

function canChangePieceSets() {
  return !gameStarted;
}

function renderPieceSetSelectors() {
  const whiteSet = getPieceSetForColor("w");
  const blackSet = getPieceSetForColor("b");

  whiteSetNameEl.textContent = whiteSet.name;
  blackSetNameEl.textContent = blackSet.name;

  if (whiteSetDescriptionEl) {
    whiteSetDescriptionEl.textContent = whiteSet.description || "";
  }
  if (blackSetDescriptionEl) {
    blackSetDescriptionEl.textContent = blackSet.description || "";
  }

  const disableArrows = !canChangePieceSets() || PIECE_SETS.length <= 1;
  whiteSetPrevBtn.disabled = disableArrows;
  whiteSetNextBtn.disabled = disableArrows;
  blackSetPrevBtn.disabled = disableArrows;
  blackSetNextBtn.disabled = disableArrows;
}

function onPieceSetChanged() {
  resetGame();
}

function cyclePieceSet(color, direction) {
  if (!canChangePieceSets() || PIECE_SETS.length <= 1) {
    return;
  }
  const max = PIECE_SETS.length;
  pieceSetSelection[color] = (pieceSetSelection[color] + direction + max) % max;
  onPieceSetChanged();
}

function markGameStarted() {
  if (gameStarted) {
    return;
  }
  gameStarted = true;
  renderPieceSetSelectors();
}

function clearSelection() {
  selectedSquare = null;
  selectedReserve = null;
  legalTargets = [];
  legalCaptureTargets = [];
}

function selectSquare(square) {
  const piece = gameState.board[square];
  if (!piece || piece.color !== gameState.turn || gameState.gameOver) {
    clearSelection();
    return;
  }

  selectedSquare = square;
  selectedReserve = null;
  const legalMoves = getLegalMovesForSquare(square, gameState);
  legalTargets = legalMoves.map((move) => move.to);
  legalCaptureTargets = legalMoves
    .filter((move) => Boolean(move.capturedPiece))
    .map((move) => move.to);
}

function generatePseudoReserveMoves(piece, color, reserveIndex, state) {
  if (!piece || piece.color !== color) {
    return [];
  }

  const pieceDef = getPieceDefinition(color, piece.type);
  if (!pieceDef?.movement?.anyEmptySquare) {
    return [];
  }

  const moves = [];
  for (let to = 0; to < 64; to += 1) {
    if (state.board[to]) {
      continue;
    }
    moves.push({
      fromReserve: true,
      reserveColor: color,
      reserveIndex,
      piece: { ...piece },
      to
    });
  }
  return moves;
}

function getLegalMovesForReservePiece(color, reserveIndex, state) {
  if (color !== state.turn) {
    return [];
  }
  const reservePieces = state.reserves[color] || [];
  const piece = reservePieces[reserveIndex];
  if (!piece) {
    return [];
  }
  const pseudoMoves = generatePseudoReserveMoves(piece, color, reserveIndex, state);
  return pseudoMoves.filter((move) => isMoveLegal(move, color, state));
}

function selectReservePiece(color, reserveIndex) {
  if (gameState.gameOver || color !== gameState.turn) {
    clearSelection();
    return;
  }

  const reservePieces = gameState.reserves[color] || [];
  if (!reservePieces[reserveIndex]) {
    clearSelection();
    return;
  }

  selectedSquare = null;
  selectedReserve = { color, index: reserveIndex };
  const legalMoves = getLegalMovesForReservePiece(color, reserveIndex, gameState);
  legalTargets = legalMoves.map((move) => move.to);
  legalCaptureTargets = [];
}

function consumeActiveClock() {
  if (!clockState.running || gameState.gameOver) {
    return;
  }
  const now = performance.now();
  const elapsed = now - clockState.lastTick;
  clockState.lastTick = now;
  clockState.remaining[clockState.activeColor] = Math.max(
    0,
    clockState.remaining[clockState.activeColor] - elapsed
  );
}

function handleTimeout(loserColor) {
  if (gameState.gameOver) {
    return;
  }
  gameState.gameOver = true;
  gameState.winner = oppositeColor(loserColor);
  clockState.running = false;
  statusMessage = `${colorName(gameState.winner)} wins on time.`;
  clearSelection();
  renderBoard();
  renderReserves();
  renderStatus();
  renderControls();
}

function setStatusFromPosition() {
  if (gameState.gameOver) {
    return;
  }

  const sideToMove = gameState.turn;
  const legalMoves = getAllLegalMoves(sideToMove, gameState);
  const inCheck = isInCheck(sideToMove, gameState);

  if (legalMoves.length === 0) {
    gameState.gameOver = true;
    clockState.running = false;
    if (inCheck) {
      const winner = oppositeColor(sideToMove);
      gameState.winner = winner;
      statusMessage = `Checkmate. ${colorName(winner)} wins.`;
    } else {
      gameState.winner = null;
      statusMessage = "Stalemate.";
    }
    clearSelection();
    return;
  }

  statusMessage = inCheck
    ? `${colorName(sideToMove)} to move. Check.`
    : `${colorName(sideToMove)} to move.`;
}

function commitMove(move) {
  if (gameState.gameOver) {
    return false;
  }

  const movingColor = gameState.turn;

  if (clockState.running) {
    consumeActiveClock();
    if (clockState.remaining[movingColor] <= 0) {
      handleTimeout(movingColor);
      return false;
    }
  }

  applyMoveToState(gameState, move);
  markGameStarted();
  lastMove = { from: move.from, to: move.to };
  clearSelection();

  if (clockState.running) {
    clockState.remaining[movingColor] += clockState.incrementMs;
    clockState.activeColor = gameState.turn;
    clockState.lastTick = performance.now();
  }

  setStatusFromPosition();
  renderBoard();
  renderReserves();
  renderStatus();
  renderControls();
  return true;
}

function tryMove(from, to) {
  if (from == null || to == null) {
    return false;
  }
  const legalMoves = getLegalMovesForSquare(from, gameState);
  const selectedMove = legalMoves.find((move) => move.to === to);
  if (!selectedMove) {
    return false;
  }
  return commitMove(selectedMove);
}

function tryReserveMove(color, reserveIndex, to) {
  if (to == null) {
    return false;
  }
  const legalMoves = getLegalMovesForReservePiece(color, reserveIndex, gameState);
  const selectedMove = legalMoves.find((move) => move.to === to);
  if (!selectedMove) {
    return false;
  }
  return commitMove(selectedMove);
}

function getSquareFromPoint(clientX, clientY) {
  const target = document.elementFromPoint(clientX, clientY);
  if (!target) {
    return null;
  }
  const squareEl = target.closest(".square");
  if (!squareEl) {
    return null;
  }
  return Number(squareEl.dataset.square);
}

function createDragGhost(pieceRef, clientX, clientY) {
  const ghost = buildPieceEl(pieceRef);
  ghost.classList.add("drag-ghost");
  const squareEl = boardEl.querySelector(".square");
  const pieceSize = squareEl ? squareEl.getBoundingClientRect().width * 0.88 : 56;
  ghost.style.width = `${pieceSize}px`;
  ghost.style.height = `${pieceSize}px`;
  document.body.append(ghost);
  updateDragGhostPosition(clientX, clientY);
  return ghost;
}

function updateDragGhostPosition(clientX, clientY) {
  if (!dragState.ghostEl) {
    return;
  }
  dragState.ghostEl.style.left = `${clientX}px`;
  dragState.ghostEl.style.top = `${clientY}px`;
}

function clearDragState() {
  if (dragState.ghostEl) {
    dragState.ghostEl.remove();
  }
  dragState.active = false;
  dragState.pointerId = null;
  dragState.from = null;
  dragState.moved = false;
  dragState.startX = 0;
  dragState.startY = 0;
  dragState.pieceRef = null;
  dragState.ghostEl = null;
}

function onBoardClick(event) {
  if (suppressNextClick) {
    return;
  }
  const squareEl = event.target.closest(".square");
  if (!squareEl || gameState.gameOver) {
    return;
  }

  const square = Number(squareEl.dataset.square);
  const piece = gameState.board[square];

  if (selectedSquare == null && !selectedReserve) {
    if (piece && piece.color === gameState.turn) {
      selectSquare(square);
      renderBoard();
      renderReserves();
    }
    return;
  }

  if (selectedReserve) {
    if (tryReserveMove(selectedReserve.color, selectedReserve.index, square)) {
      return;
    }

    if (piece && piece.color === gameState.turn) {
      selectSquare(square);
    } else {
      clearSelection();
    }
    renderBoard();
    renderReserves();
    return;
  }

  if (square === selectedSquare) {
    clearSelection();
    renderBoard();
    renderReserves();
    return;
  }

  if (tryMove(selectedSquare, square)) {
    return;
  }

  if (piece && piece.color === gameState.turn) {
    selectSquare(square);
  } else {
    clearSelection();
  }
  renderBoard();
  renderReserves();
}

function onReserveClick(event) {
  const reservePieceEl = event.target.closest(".reserve-piece");
  if (!reservePieceEl || gameState.gameOver) {
    return;
  }

  const color = reservePieceEl.dataset.color;
  const index = Number(reservePieceEl.dataset.index);
  if (!color || !Number.isInteger(index)) {
    return;
  }

  if (selectedReserve && selectedReserve.color === color && selectedReserve.index === index) {
    clearSelection();
  } else {
    selectReservePiece(color, index);
  }

  renderBoard();
  renderReserves();
}

function onPointerDown(event) {
  const pieceEl = event.target.closest(".piece");
  if (!pieceEl || gameState.gameOver) {
    return;
  }
  const squareEl = pieceEl.closest(".square");
  if (!squareEl) {
    return;
  }

  const from = Number(squareEl.dataset.square);
  const piece = gameState.board[from];
  if (!piece || piece.color !== gameState.turn) {
    return;
  }

  dragState.active = true;
  dragState.pointerId = event.pointerId;
  dragState.from = from;
  dragState.moved = false;
  dragState.startX = event.clientX;
  dragState.startY = event.clientY;
  dragState.pieceRef = { color: piece.color, type: piece.type };
}

function onPointerMove(event) {
  if (!dragState.active || event.pointerId !== dragState.pointerId) {
    return;
  }

  const dx = event.clientX - dragState.startX;
  const dy = event.clientY - dragState.startY;
  const traveled = Math.hypot(dx, dy);

  if (!dragState.moved && traveled > 8) {
    dragState.moved = true;
    if (selectedSquare !== dragState.from) {
      selectSquare(dragState.from);
    }
    dragState.ghostEl = createDragGhost(dragState.pieceRef, event.clientX, event.clientY);
    renderBoard();
    renderReserves();
  }

  if (dragState.moved) {
    updateDragGhostPosition(event.clientX, event.clientY);
  }
}

function onPointerUp(event) {
  if (!dragState.active || event.pointerId !== dragState.pointerId) {
    return;
  }
  const didDrag = dragState.moved;
  if (didDrag) {
    const to = getSquareFromPoint(event.clientX, event.clientY);
    tryMove(dragState.from, to);
    suppressNextClick = true;
    setTimeout(() => {
      suppressNextClick = false;
    }, 0);
  }
  clearDragState();
  if (didDrag) {
    renderBoard();
    renderReserves();
  }
}

function onPointerCancel(event) {
  if (!dragState.active || event.pointerId !== dragState.pointerId) {
    return;
  }
  const didDrag = dragState.moved;
  clearDragState();
  if (didDrag) {
    renderBoard();
    renderReserves();
  }
}

function onToggleClock() {
  if (gameState.gameOver) {
    return;
  }

  if (clockState.running) {
    consumeActiveClock();
    if (clockState.remaining[clockState.activeColor] <= 0) {
      handleTimeout(clockState.activeColor);
      return;
    }
    clockState.running = false;
  } else {
    markGameStarted();
    clockState.activeColor = gameState.turn;
    clockState.lastTick = performance.now();
    clockState.running = true;
  }

  renderControls();
  renderClocks();
}

function getClockInputSettings() {
  const baseMinutesRaw = Number(baseMinutesInput.value);
  const incrementSecondsRaw = Number(incrementSecondsInput.value);
  const baseMinutes = Number.isFinite(baseMinutesRaw) ? Math.min(180, Math.max(1, baseMinutesRaw)) : 10;
  const incrementSeconds = Number.isFinite(incrementSecondsRaw)
    ? Math.min(60, Math.max(0, incrementSecondsRaw))
    : 5;

  baseMinutesInput.value = String(baseMinutes);
  incrementSecondsInput.value = String(incrementSeconds);

  return {
    baseMs: baseMinutes * 60 * 1000,
    incrementMs: incrementSeconds * 1000
  };
}

function resetGame() {
  const { baseMs, incrementMs } = getClockInputSettings();
  gameState = createInitialGameState();
  gameStarted = false;
  selectedSquare = null;
  selectedReserve = null;
  legalTargets = [];
  legalCaptureTargets = [];
  lastMove = null;
  clearDragState();

  clockState.baseMs = baseMs;
  clockState.incrementMs = incrementMs;
  clockState.remaining.w = baseMs;
  clockState.remaining.b = baseMs;
  clockState.running = false;
  clockState.activeColor = "w";
  clockState.lastTick = performance.now();

  statusMessage = "White to move.";
  renderBoard();
  renderReserves();
  renderStatus();
  renderClocks();
  renderControls();
  renderPieceSetSelectors();
}

function gameLoop() {
  renderClocks();
  if (clockState.running && !gameState.gameOver) {
    const activeRemaining = getDisplayedRemaining(clockState.activeColor);
    if (activeRemaining <= 0) {
      clockState.remaining[clockState.activeColor] = 0;
      handleTimeout(clockState.activeColor);
    }
  }
  requestAnimationFrame(gameLoop);
}

function getPawnDirection(movement, color) {
  if (typeof movement.forward === "number") {
    return movement.forward;
  }
  if (movement.forward && typeof movement.forward[color] === "number") {
    return movement.forward[color];
  }
  return color === "w" ? -1 : 1;
}

function getPawnStartRows(movement, color) {
  if (Array.isArray(movement.startRows)) {
    return movement.startRows;
  }
  if (movement.startRows && Array.isArray(movement.startRows[color])) {
    return movement.startRows[color];
  }
  return color === "w" ? [6] : [1];
}

function getPawnPromotionRows(movement, color) {
  if (Array.isArray(movement.promotionRows)) {
    return movement.promotionRows;
  }
  if (movement.promotionRows && Array.isArray(movement.promotionRows[color])) {
    return movement.promotionRows[color];
  }
  return color === "w" ? [0] : [7];
}

function getPawnCaptureDirections(movement, color) {
  if (Array.isArray(movement.captureDirections)) {
    return movement.captureDirections;
  }
  if (movement.captureDirections && Array.isArray(movement.captureDirections[color])) {
    return movement.captureDirections[color];
  }

  const dir = getPawnDirection(movement, color);
  return [
    [dir, -1],
    [dir, 1]
  ];
}

function generatePseudoMoves(square, state, options = {}) {
  const { attacksOnly = false } = options;
  const piece = state.board[square];
  if (!piece) {
    return [];
  }

  const pieceDef = getPieceDefinition(piece.color, piece.type);
  if (!pieceDef) {
    return [];
  }

  const movement = pieceDef.movement || {};
  const moves = [];
  const row = rowFromIndex(square);
  const col = colFromIndex(square);

  const addMove = (to, extras = {}) => {
    const target = state.board[to];
    if (attacksOnly) {
      moves.push({ from: square, to, ...extras });
      return;
    }
    if (!target || target.color !== piece.color) {
      moves.push({
        from: square,
        to,
        capturedPiece: target ? { ...target } : null,
        ...extras
      });
    }
  };

  const addLeaperMoves = (offsets) => {
    for (const [dr, dc] of offsets) {
      const targetRow = row + dr;
      const targetCol = col + dc;
      if (!inBounds(targetRow, targetCol)) {
        continue;
      }
      const to = indexFromRowCol(targetRow, targetCol);
      if (attacksOnly) {
        addMove(to);
        continue;
      }
      const target = state.board[to];
      if (!target || target.color !== piece.color) {
        addMove(to);
      }
    }
  };

  const addRayMoves = (directions, maxSteps = 8) => {
    for (const [dr, dc] of directions) {
      let r = row + dr;
      let c = col + dc;
      let steps = 1;
      while (inBounds(r, c) && steps <= maxSteps) {
        const to = indexFromRowCol(r, c);
        const target = state.board[to];

        if (attacksOnly) {
          addMove(to);
          if (target) {
            break;
          }
          r += dr;
          c += dc;
          steps += 1;
          continue;
        }

        if (!target) {
          addMove(to);
          r += dr;
          c += dc;
          steps += 1;
          continue;
        }

        if (target.color !== piece.color) {
          addMove(to);
        }
        break;
      }
    }
  };

  if (movement.pawn) {
    const dir = getPawnDirection(movement, piece.color);
    const startRows = getPawnStartRows(movement, piece.color);
    const promotionRows = new Set(getPawnPromotionRows(movement, piece.color));
    const captureDirections = getPawnCaptureDirections(movement, piece.color);

    if (!attacksOnly) {
      const oneStepRow = row + dir;
      if (inBounds(oneStepRow, col)) {
        const oneStepSquare = indexFromRowCol(oneStepRow, col);
        if (!state.board[oneStepSquare]) {
          if (promotionRows.has(oneStepRow)) {
            const promotionType = getPromotionTypeForColor(piece.color);
            if (promotionType && promotionType !== piece.type) {
              addMove(oneStepSquare, { promotion: promotionType });
            } else {
              addMove(oneStepSquare);
            }
          } else {
            addMove(oneStepSquare);
          }

          if (startRows.includes(row)) {
            const twoStepRow = row + dir * 2;
            if (inBounds(twoStepRow, col)) {
              const twoStepSquare = indexFromRowCol(twoStepRow, col);
              if (!state.board[twoStepSquare]) {
                addMove(twoStepSquare, { doublePawn: true });
              }
            }
          }
        }
      }
    }

    for (const [captureDr, captureDc] of captureDirections) {
      const targetRow = row + captureDr;
      const targetCol = col + captureDc;
      if (!inBounds(targetRow, targetCol)) {
        continue;
      }

      const to = indexFromRowCol(targetRow, targetCol);
      if (attacksOnly) {
        addMove(to);
        continue;
      }

      const targetPiece = state.board[to];
      if (targetPiece && targetPiece.color !== piece.color) {
        if (promotionRows.has(targetRow)) {
          const promotionType = getPromotionTypeForColor(piece.color);
          if (promotionType && promotionType !== piece.type) {
            addMove(to, { promotion: promotionType });
          } else {
            addMove(to);
          }
        } else {
          addMove(to);
        }
        continue;
      }

      if (captureDr === dir && state.enPassant === to) {
        const capturedSquare = indexFromRowCol(row, targetCol);
        const capturedPiece = state.board[capturedSquare];
        if (capturedPiece && capturedPiece.color !== piece.color && pieceHasTrait(capturedPiece, "pawn")) {
          moves.push({
            from: square,
            to,
            enPassant: true,
            captureSquare: capturedSquare,
            capturedPiece: { ...capturedPiece }
          });
        }
      }
    }
  }

  if (!attacksOnly && movement.anyEmptySquare) {
    for (let to = 0; to < 64; to += 1) {
      if (!state.board[to]) {
        addMove(to);
      }
    }
  }

  if (Array.isArray(movement.leaps) && movement.leaps.length > 0) {
    addLeaperMoves(movement.leaps);
  }

  if (Array.isArray(movement.rays) && movement.rays.length > 0) {
    const maxSteps = Number.isInteger(movement.maxRaySteps) ? movement.maxRaySteps : 8;
    addRayMoves(movement.rays, maxSteps);
  }

  if (!attacksOnly && movement.castling) {
    const routes = CASTLING_ROUTES[piece.color];
    if (routes && !isSquareAttacked(square, oppositeColor(piece.color), state)) {
      for (const side of ["kingside", "queenside"]) {
        const route = routes[side];
        if (!route || !state.castling[route.flag]) {
          continue;
        }
        if (square !== route.kingFrom) {
          continue;
        }
        if (route.emptySquares.some((sq) => state.board[sq])) {
          continue;
        }
        if (route.safeSquares.some((sq) => isSquareAttacked(sq, oppositeColor(piece.color), state))) {
          continue;
        }

        const rook = state.board[route.rookFrom];
        if (!rook || rook.color !== piece.color || !pieceHasTrait(rook, "castlingRook")) {
          continue;
        }

        moves.push({
          from: square,
          to: route.kingTo,
          castle: side,
          rookFrom: route.rookFrom,
          rookTo: route.rookTo
        });
      }
    }
  }

  return moves;
}

function clearCastlingRightsForColor(state, color) {
  if (color === "w") {
    state.castling.wK = false;
    state.castling.wQ = false;
  } else {
    state.castling.bK = false;
    state.castling.bQ = false;
  }
}

function clearCastlingRookRightBySquare(state, color, square) {
  const routes = CASTLING_ROUTES[color];
  if (!routes) {
    return;
  }
  if (square === routes.kingside.rookFrom) {
    state.castling[routes.kingside.flag] = false;
  }
  if (square === routes.queenside.rookFrom) {
    state.castling[routes.queenside.flag] = false;
  }
}

function applyMoveToState(state, move) {
  if (move.fromReserve) {
    const reservePieces = state.reserves[move.reserveColor];
    if (!reservePieces || !reservePieces[move.reserveIndex]) {
      return;
    }
    if (state.board[move.to]) {
      return;
    }
    const piece = reservePieces[move.reserveIndex];
    reservePieces.splice(move.reserveIndex, 1);
    state.board[move.to] = { ...piece };
    state.enPassant = null;
    state.turn = oppositeColor(state.turn);
    return;
  }

  const piece = state.board[move.from];
  if (!piece) {
    return;
  }

  const color = piece.color;
  state.board[move.from] = null;

  if (move.enPassant) {
    state.board[move.captureSquare] = null;
  }

  if (move.castle) {
    const rook = state.board[move.rookFrom];
    state.board[move.rookFrom] = null;
    state.board[move.rookTo] = rook;
  }

  state.board[move.to] = move.promotion ? { color, type: move.promotion } : piece;

  if (pieceHasTrait(piece, "castlingKing")) {
    clearCastlingRightsForColor(state, color);
  }

  if (pieceHasTrait(piece, "castlingRook")) {
    clearCastlingRookRightBySquare(state, color, move.from);
  }

  const captured = move.capturedPiece || null;
  if (captured && pieceHasTrait(captured, "redeployable")) {
    state.reserves[captured.color].push({ ...captured });
  }
  if (captured && pieceHasTrait(captured, "castlingRook")) {
    clearCastlingRookRightBySquare(state, captured.color, move.to);
  }

  if (pieceHasTrait(piece, "pawn") && move.doublePawn) {
    const startRow = rowFromIndex(move.from);
    const startCol = colFromIndex(move.from);
    const pieceDef = getPieceDefinition(piece.color, piece.type);
    const dir = getPawnDirection(pieceDef?.movement || {}, piece.color);
    state.enPassant = indexFromRowCol(startRow + dir, startCol);
  } else {
    state.enPassant = null;
  }

  state.turn = oppositeColor(state.turn);
}

function findRoyalSquare(color, state) {
  for (let i = 0; i < 64; i += 1) {
    const piece = state.board[i];
    if (piece && piece.color === color && pieceHasTrait(piece, "royal")) {
      return i;
    }
  }
  return -1;
}

function isSquareAttacked(square, byColor, state) {
  for (let i = 0; i < 64; i += 1) {
    const piece = state.board[i];
    if (!piece || piece.color !== byColor) {
      continue;
    }
    const attackMoves = generatePseudoMoves(i, state, { attacksOnly: true });
    if (attackMoves.some((move) => move.to === square)) {
      return true;
    }
  }
  return false;
}

function isInCheck(color, state) {
  const royalSquare = findRoyalSquare(color, state);
  if (royalSquare < 0) {
    return false;
  }
  return isSquareAttacked(royalSquare, oppositeColor(color), state);
}

function isMoveLegal(move, color, state) {
  const draft = cloneGameState(state);
  applyMoveToState(draft, move);
  return !isInCheck(color, draft);
}

function getLegalMovesForSquare(square, state) {
  const piece = state.board[square];
  if (!piece || piece.color !== state.turn) {
    return [];
  }
  const pseudoMoves = generatePseudoMoves(square, state);
  return pseudoMoves.filter((move) => isMoveLegal(move, piece.color, state));
}

function getAllLegalMoves(color, state) {
  const allMoves = [];
  for (let i = 0; i < 64; i += 1) {
    const piece = state.board[i];
    if (!piece || piece.color !== color) {
      continue;
    }
    const pseudoMoves = generatePseudoMoves(i, state);
    for (const move of pseudoMoves) {
      if (isMoveLegal(move, color, state)) {
        allMoves.push(move);
      }
    }
  }

  const reservePieces = state.reserves[color] || [];
  for (let i = 0; i < reservePieces.length; i += 1) {
    const pseudoMoves = generatePseudoReserveMoves(reservePieces[i], color, i, state);
    for (const move of pseudoMoves) {
      if (isMoveLegal(move, color, state)) {
        allMoves.push(move);
      }
    }
  }
  return allMoves;
}

boardEl.addEventListener("click", onBoardClick);
if (reserveBlackEl) {
  reserveBlackEl.addEventListener("click", onReserveClick);
}
if (reserveWhiteEl) {
  reserveWhiteEl.addEventListener("click", onReserveClick);
}
boardEl.addEventListener("pointerdown", onPointerDown);
window.addEventListener("pointermove", onPointerMove, { passive: true });
window.addEventListener("pointerup", onPointerUp, { passive: true });
window.addEventListener("pointercancel", onPointerCancel, { passive: true });
whiteSetPrevBtn.addEventListener("click", () => cyclePieceSet("w", -1));
whiteSetNextBtn.addEventListener("click", () => cyclePieceSet("w", 1));
blackSetPrevBtn.addEventListener("click", () => cyclePieceSet("b", -1));
blackSetNextBtn.addEventListener("click", () => cyclePieceSet("b", 1));
toggleClockBtn.addEventListener("click", onToggleClock);
newGameBtn.addEventListener("click", resetGame);

resetGame();
requestAnimationFrame(gameLoop);
