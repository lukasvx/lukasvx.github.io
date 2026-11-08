(function () {
    "use strict";

    var boardEl = document.getElementById("ttt-board");
    var statusEl = document.getElementById("ttt-status");
    var newBtn = document.getElementById("ttt-new");
    if (!boardEl || !statusEl || !newBtn) return;

    var LINES = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6]
    ];
    var CORNERS = [0, 2, 6, 8];
    var EDGES = [1, 3, 5, 7];
    var PLAYER = "X";
    var COMPUTER = "O";

    var cells = [];
    var board = [];
    var over = false;
    var busy = false;
    var computerStarts = false;
    var timer = 0;
    var result = null;

    function pick(list) {
        return list[Math.floor(Math.random() * list.length)];
    }

    function empties(list) {
        return list.filter(function (i) { return !board[i]; });
    }

    function findWinner() {
        for (var i = 0; i < LINES.length; i++) {
            var l = LINES[i];
            if (board[l[0]] && board[l[0]] === board[l[1]] && board[l[0]] === board[l[2]]) {
                return { who: board[l[0]], line: l };
            }
        }
        return null;
    }

    function completingMove(who) {
        for (var i = 0; i < LINES.length; i++) {
            var l = LINES[i];
            var marks = l.filter(function (c) { return board[c] === who; }).length;
            var free = l.filter(function (c) { return !board[c]; });
            if (marks === 2 && free.length === 1) return free[0];
        }
        return -1;
    }

    function chooseMove() {
        var win = completingMove(COMPUTER);
        if (win !== -1) return win;
        var block = completingMove(PLAYER);
        if (block !== -1 && Math.random() < 0.85) return block;
        if (!board[4]) return 4;
        var corners = empties(CORNERS);
        if (corners.length) return pick(corners);
        return pick(empties(EDGES));
    }

    function setStatus(text) {
        statusEl.textContent = text;
    }

    function render() {
        for (var i = 0; i < 9; i++) {
            var cell = cells[i];
            var mark = board[i] || "";
            var inWin = result && result.line.indexOf(i) !== -1;
            cell.textContent = mark;
            cell.className = "ttt-cell" + (mark ? " " + mark.toLowerCase() : "") + (inWin ? " win" : "");
            cell.setAttribute("aria-disabled", over || !!mark ? "true" : "false");
            cell.setAttribute(
                "aria-label",
                "row " + (Math.floor(i / 3) + 1) + ", column " + ((i % 3) + 1) + ", " + (mark || "empty")
            );
        }
    }

    function finishIfOver() {
        result = findWinner();
        if (result) {
            over = true;
            setStatus(result.who === PLAYER ? "you win!" : "ai wins!");
        } else if (empties([0, 1, 2, 3, 4, 5, 6, 7, 8]).length === 0) {
            over = true;
            setStatus("draw");
        }
        return over;
    }

    function computerTurn() {
        busy = false;
        board[chooseMove()] = COMPUTER;
        if (!finishIfOver()) setStatus("your turn (you are x)");
        render();
    }

    function startComputerTurn() {
        busy = true;
        setStatus("thinking...");
        render();
        timer = window.setTimeout(computerTurn, 350);
    }

    function onCell(i) {
        if (over || busy || board[i]) return;
        board[i] = PLAYER;
        if (finishIfOver()) {
            render();
            return;
        }
        startComputerTurn();
    }

    function newGame() {
        window.clearTimeout(timer);
        board = [null, null, null, null, null, null, null, null, null];
        over = false;
        busy = false;
        result = null;
        computerStarts = !computerStarts;
        if (computerStarts) {
            startComputerTurn();
        } else {
            setStatus("your turn (you are x)");
            render();
        }
    }

    for (var i = 0; i < 9; i++) {
        (function (index) {
            var cell = document.createElement("button");
            cell.type = "button";
            cell.addEventListener("click", function () { onCell(index); });
            boardEl.appendChild(cell);
            cells.push(cell);
        })(i);
    }

    newBtn.addEventListener("click", newGame);
    computerStarts = true;
    newGame();
})();
