/// <reference path="node_modules/@types/jquery/index.d.ts" />
/// <reference path="node_modules/@types/lodash/index.d.ts" />
var DEBUG = true;
var Log = (function () {
    function Log() {
    }
    Log.out = function (msg) {
        $("<pre/>").text(msg + "\n").appendTo("#log");
    };
    Log.html = function (html) {
        $("<div/>").html(html).appendTo("#log");
    };
    return Log;
}());
var PuzzleDemo = (function () {
    function PuzzleDemo(solution) {
        this.solution = [];
        this.solution = solution;
        Log.out("Puzzle:\n   " + solution.join(" "));
    }
    PuzzleDemo.random = function (length) {
        return new PuzzleDemo(_.shuffle(_.map(new Array(length), function (v, k) { return k + 1; })));
    };
    PuzzleDemo.prototype.getSlotCount = function () {
        return this.solution.length;
    };
    PuzzleDemo.prototype.test = function (board) {
        var count = 0;
        for (var i = 0, len = this.solution.length; i < len; i++) {
            var correct = board.slots[i].quantity == this.solution[i];
            if (correct)
                count++;
            if (DEBUG)
                board.debugViewCorrectSlots[i] = correct;
        }
        return count;
    };
    return PuzzleDemo;
}());
var HumanPuzzleInterface = (function () {
    function HumanPuzzleInterface(slotCount) {
        this.lastSequence = [];
        this.slotCount = slotCount;
    }
    HumanPuzzleInterface.prototype.getSlotCount = function () {
        return this.slotCount;
    };
    HumanPuzzleInterface.prototype.test = function (board) {
        var _this = this;
        var answer;
        do {
            var n = _.map(board.slots, function (s) { return s.quantity; });
            var display = _.map(n, function (d, i) { return _this.lastSequence.length > 0 && d == _this.lastSequence[i] ? d : "(" + d + ")"; });
            this.lastSequence = n;
            answer = parseInt(prompt("Please input the following sequence:\n\n    " + display.join("  ") + "\n\nAfter each player clicks their blue button\nhow many yellow lights are lit?"), 10);
        } while (isNaN(answer));
        return answer;
    };
    return HumanPuzzleInterface;
}());
var UNKNOWN = "U";
var MAYBE_NO = "MN";
var NO = "N";
var MAYBE_YES = "MY";
var YES = "Y";
var Swap = (function () {
    function Swap(a, b) {
        this.a = a;
        this.b = b;
    }
    return Swap;
}());
var Move = (function () {
    // new move based on copy of given move
    function Move(base, board, swap) {
        this.base = base;
        this.board = _.cloneDeep(board);
        if (null != swap) {
            var tmp = this.board.slots[swap.a];
            this.board.slots[swap.a] = this.board.slots[swap.b];
            this.board.slots[swap.b] = tmp;
            this.board.slots[swap.a].index = swap.a;
            this.board.slots[swap.b].index = swap.b;
            this.swap = swap;
        }
    }
    Move.prototype.render = function () {
        var s = this.num + ": ";
        for (var i = 0, len = this.board.slots.length; i < len; i++) {
            var slot = this.board.slots[i];
            var underline = (null != this.swap && (slot.quantity == this.board.slots[this.swap.a].quantity || slot.quantity == this.board.slots[this.swap.b].quantity));
            var bold = this.board.debugViewCorrectSlots[i];
            s += "" + (bold ? "<b>" : "") + (underline ? "(" : "") + slot.quantity + (underline ? ")" : "") + (bold ? "</b>" : "") + " ";
        }
        s += (this.num === 1 ? "FIRST" :
            " = " + this.correct + " (" + (this.delta < 0 ? this.delta : "+" + this.delta) + ") score: " + this.score());
        Log.html(s);
    };
    Move.prototype.score = function () {
        return this.correct + (this.delta * .5);
    };
    Move.prototype.getSwapA = function () {
        return this.board.slots[this.swap.a];
    };
    Move.prototype.getSwapB = function () {
        return this.board.slots[this.swap.b];
    };
    Move.prototype.getSwapInBase = function (k) {
        var _this = this;
        return _.find(this.base.board.slots, function (s) {
            return s.quantity === _this.board.slots[_this.swap[k]].quantity;
        });
    };
    Move.prototype.hasSwapDeduction = function (a, b) {
        return this.getSwapA().deduction == a &&
            this.getSwapB().deduction == b;
    };
    // TODO: find the adjacent pair in given two moves
    // adj pair in two moves =
    // if move1 = a,b and move2 = b,c then ajc pair = a
    Move.copyMostValuableMove = function (history) {
        var mostValuable;
        for (var i = 0, len = history.length; i < len; i++) {
            var current = history[i];
            if (null == mostValuable || mostValuable.score() < current.score()) {
                mostValuable = current;
            }
        }
        return mostValuable.clone();
    };
    Move.prototype.clone = function () {
        var move = new Move(this, this.board);
        move.num = this.num;
        move.correct = this.correct;
        move.delta = this.delta;
        return move;
    };
    Move.rejectWasteMove = function (history, candidate) {
        for (var i = 0, len = history.length; i < len; i++) {
            var current = history[i];
            // reject if this board has been played before
            if (Board.compare(current.board, candidate.board)) {
                if (DEBUG)
                    Log.out("Rejecting board played before at move " + current.num + " " + candidate.board.slots.join(" "));
                return true;
            }
            for (var i_1 = 0, len_1 = current.board.slots.length; i_1 < len_1; i_1++) {
                var cur = current.board.slots[i_1];
                var can = candidate.board.slots[i_1];
                // reject if history contains a YES that isn't included here
                if (YES === cur.deduction && can.quantity !== cur.quantity) {
                    if (DEBUG)
                        Log.out("Rejecting index " + can.quantity + can.deduction.substr(0, 2) + "@" + can.index + " which was " + cur.quantity + cur.deduction.substr(0, 2) + "@" + cur.index + " before at move " + current.num);
                    return true;
                }
                // reject if history contains a NO that is included again here
                if (NO === cur.deduction && can.quantity === cur.quantity) {
                    if (DEBUG)
                        Log.out("Rejecting index " + can.quantity + can.deduction.substr(0, 2) + "@" + can.index + " which was " + cur.quantity + cur.deduction.substr(0, 2) + "@" + cur.index + " before at move " + current.num);
                    return true;
                }
            }
            return false;
        }
    };
    Move.crossJoinCandidates = function (candidates) {
        var result = [];
        for (var x = 0, xlen = candidates.length; x < xlen; x++) {
            for (var y = 0, ylen = candidates.length; y < ylen; y++) {
                if (x != y)
                    result.push(candidates[x], candidates[y]);
            }
        }
        return result;
    };
    return Move;
}());
var Slot = (function () {
    function Slot() {
    }
    Slot.prototype.setDeduction = function (deduction, board, index) {
        if (YES === this.deduction || NO === this.deduction)
            return; // hard conclusions to change
        if (DEBUG) {
            Log.out("    " + this.quantity + this.deduction.substr(0, 2) + "@" + this.index + " => " + deduction.substr(0, 2) + (deduction == YES ? " FOUND" : ""));
            if (YES === deduction && !board.debugViewCorrectSlots[index]) {
                Log.out("      but its wrong");
                debugger;
            }
        }
        this.deduction = deduction;
    };
    Slot.prototype.toString = function () {
        return "" + this.quantity + this.deduction.substr(0, 2) + "@" + this.index;
    };
    return Slot;
}());
var Board = (function () {
    function Board(slots) {
        this.debugViewCorrectSlots = [];
        this.slots = slots;
    }
    Board.prototype.findAll = function (fn) {
        return _.filter(this.slots, fn);
    };
    Board.prototype.findOne = function (fn) {
        return this.findAll(fn)[0];
    };
    Board.compare = function (a, b) {
        if (a.slots.length != b.slots.length)
            return false;
        for (var i = 0, len = a.slots.length; i < len; i++) {
            if (a.slots[i].quantity != b.slots[i].quantity) {
                return false;
            }
        }
        return true;
    };
    Board.prototype.render = function () {
        for (var i = 0, len = this.slots.length; i < len; i++) {
            $("td#c" + i).text(this.slots[i].quantity + " " + this.slots[i].deduction.substr(0, 2));
        }
    };
    Board.prototype.toString = function () {
        return this.slots.join(" ");
    };
    return Board;
}());
var Solver = (function () {
    function Solver(puzzle) {
        this.moves = 0;
        this.puzzle = puzzle;
        // begin with opening move
        this.rootMove = new Move(null, new Board(_.map(new Array(this.puzzle.getSlotCount()), function (nil, i) {
            var slot = new Slot();
            slot.index = i;
            slot.quantity = i + 1;
            slot.deduction = UNKNOWN;
            return slot;
        })));
        this.playMove(this.rootMove);
    }
    Solver.prototype.getHistory = function () {
        var current = this.lastMove;
        var history = [];
        while (null != current) {
            history.push(current);
            current = current.prev;
        }
        return history;
    };
    Solver.prototype.playMove = function (move) {
        // sequence move into play
        move.num = ++this.moves;
        move.prev = this.lastMove;
        this.lastMove = move;
        // test and score the move
        move.correct = this.puzzle.test(move.board);
        move.delta = move.correct - (null != move.base ? move.base.correct || 0 : 0);
        if (this.moves > MAX_GUESSES) {
            Log.out("Too many guesses; we lose.");
            return;
        }
        // update user view
        move.board.render();
        move.render();
        if (move.correct >= this.puzzle.getSlotCount()) {
            Log.out("You win in " + this.moves + " moves.");
            return;
        }
        if (null != move.swap) {
            // apply swap deductions
            if (move.delta == 0) {
                // no difference; both must be NO
                move.getSwapA().setDeduction(NO, move.board, move.swap.a);
                move.getSwapB().setDeduction(NO, move.board, move.swap.b);
                move.getSwapInBase("a").setDeduction(NO, move.base.board, move.swap.a);
                move.getSwapInBase("b").setDeduction(NO, move.base.board, move.swap.b);
            }
            else if (move.delta == 1) {
                // difference; one is now right, but we don't know which
                move.getSwapA().setDeduction(MAYBE_YES, move.board, move.swap.a);
                move.getSwapB().setDeduction(MAYBE_YES, move.board, move.swap.b);
                //move.getSwapInBase("a").setDeduction(MAYBE_NO, move.base.board, move.swap.a);
                //move.getSwapInBase("b").setDeduction(MAYBE_NO, move.base.board, move.swap.b);
            }
            else if (move.delta == 2) {
                // very positive difference; both are now right for sure
                move.getSwapA().setDeduction(YES, move.board, move.swap.a);
                move.getSwapB().setDeduction(YES, move.board, move.swap.b);
                move.getSwapInBase("a").setDeduction(NO, move.base.board, move.swap.a);
                move.getSwapInBase("b").setDeduction(NO, move.base.board, move.swap.b);
            }
            else if (move.delta == -1) {
                // difference; one was right, but we don't know which
                //move.getSwapA().setDeduction(MAYBE, move.board, move.swap.a);
                //move.getSwapB().setDeduction(MAYBE, move.board, move.swap.b);
                move.getSwapInBase("a").setDeduction(MAYBE_YES, move.base.board, move.swap.a);
                move.getSwapInBase("b").setDeduction(MAYBE_YES, move.base.board, move.swap.b);
            }
            else if (move.delta == -2) {
                // difference; both were right for sure
                move.getSwapA().setDeduction(NO, move.board, move.swap.a);
                move.getSwapB().setDeduction(NO, move.board, move.swap.b);
                move.getSwapInBase("a").setDeduction(YES, move.base.board, move.swap.a);
                move.getSwapInBase("b").setDeduction(YES, move.base.board, move.swap.b);
            }
        }
        this.decide();
    };
    Solver.prototype.decide = function () {
        var _this = this;
        // decide what to do next
        var nextMove;
        var candidates;
        var u, x;
        if (1 === this.moves) {
            // just play a swap of the first two positions
            nextMove = new Move(this.lastMove, this.lastMove.board, new Swap(0, 1));
        }
        else {
            var move = Move.copyMostValuableMove(this.getHistory());
            // try a unique new swap from non-yes deductions
            var tries = 0;
            var _loop_1 = function () {
                //				// if the previous swap was M,M or N,N
                //				if (
                //					(move.hasSwapDeduction(MAYBE, MAYBE) ||
                //						move.hasSwapDeduction(NO, NO))
                //				) {
                //					// it should reuse A from the previous move
                //					// unless that resulted in a no change or unexpected gain
                //					// in which case it should now reuse B from two moves ago
                //				}
                //				else {
                //					// rotate through untested swaps remaining
                //
                //				}
                var rank = { MAYBE_YES: 1, NO: 2, UNKNOWN: 3, MAYBE_NO: 4 };
                if (null == candidates) {
                    candidates = _.filter(move.board.slots, function (s) {
                        return _.includes([UNKNOWN, MAYBE_NO, MAYBE_YES, NO], s.deduction);
                    });
                    candidates = _.sortBy(candidates, function (s) { return rank[s.deduction]; });
                    candidates = Move.crossJoinCandidates(candidates);
                }
                else {
                    Log.out("repeated while: " + x + ", " + u);
                }
                Log.out(_.map(candidates, function (s) { return "" + s.quantity + s.deduction.substr(0, 2) + "@" + s.index; }).join(" "));
                var a = candidates.shift().index, b = candidates.shift().index;
                nextMove = new Move(move, move.board, new Swap(a, b));
            };
            do {
                _loop_1();
            } while ((x = Move.rejectWasteMove(this.getHistory(), nextMove))
                && (u = tries++) < LOOP_BREAKER);
            if (DEBUG && tries > LOOP_BREAKER)
                Log.out("candidates not original enough; exhausting retries");
            Log.out("escaped while: " + x + ", " + u);
        }
        if (null == nextMove) {
            Log.out("Unable to find next move.");
            return;
        }
        setTimeout(function () { return _this.playMove(nextMove); }, GUESS_DELAY);
    };
    return Solver;
}());
var LOOP_BREAKER = 999;
var GUESS_DELAY = 50; // ms
var MAX_GUESSES = 13;
var SLOT_COUNT = 6;
var puzzle;
if (DEBUG) {
    //puzzle = PuzzleDemo.random(SLOT_COUNT);
    puzzle = new PuzzleDemo([1, 6, 3, 5, 4, 2]);
    //puzzle = new PuzzleDemo([2, 3, 4, 1, 6, 5]);
    //puzzle = new PuzzleDemo([2, 4, 6, 1, 5, 3]);
    //puzzle = new PuzzleDemo([2, 1, 5, 6, 3, 4]);
    // TODO: try a puzzle where numbers can repeat
}
else {
    puzzle = new HumanPuzzleInterface(SLOT_COUNT);
}
new Solver(puzzle);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWV0aGV1cy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIm1ldGhldXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsOERBQThEO0FBQzlELDhEQUE4RDtBQUU5RCxJQUFNLEtBQUssR0FBRyxJQUFJLENBQUM7QUFFbkI7SUFBQTtJQU9BLENBQUM7SUFOYyxPQUFHLEdBQWpCLFVBQWtCLEdBQVc7UUFDNUIsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLElBQUksQ0FBSSxHQUFHLE9BQUksQ0FBQyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUMvQyxDQUFDO0lBQ2EsUUFBSSxHQUFsQixVQUFtQixJQUFZO1FBQzlCLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ3pDLENBQUM7SUFDRixVQUFDO0FBQUQsQ0FBQyxBQVBELElBT0M7QUFPRDtJQUdDLG9CQUFtQixRQUFrQjtRQUY3QixhQUFRLEdBQWEsRUFBRSxDQUFDO1FBRy9CLElBQUksQ0FBQyxRQUFRLEdBQUcsUUFBUSxDQUFDO1FBQ3pCLEdBQUcsQ0FBQyxHQUFHLENBQUMsaUJBQWUsUUFBUSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUcsQ0FBQyxDQUFDO0lBQzlDLENBQUM7SUFFYSxpQkFBTSxHQUFwQixVQUFxQixNQUFjO1FBQ2xDLE1BQU0sQ0FBQyxJQUFJLFVBQVUsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQ3BDLElBQUksS0FBSyxDQUFDLE1BQU0sQ0FBQyxFQUFFLFVBQVUsQ0FBQyxFQUFFLENBQUMsSUFBSSxNQUFNLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUMxRCxDQUFDO0lBRU0saUNBQVksR0FBbkI7UUFDQyxNQUFNLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENB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QUFVLENBQUMsY0FBTSxPQUFBLEtBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLEVBQXZCLENBQXVCLEVBQUUsV0FBVyxDQUFDLENBQUM7SUFDeEQsQ0FBQztJQUNGLGFBQUM7QUFBRCxDQUFDLEFBdEpELElBc0pDO0FBRUQsSUFBTSxZQUFZLEdBQUcsR0FBRyxDQUFDO0FBQ3pCLElBQU0sV0FBVyxHQUFHLEVBQUUsQ0FBQyxDQUFDLEtBQUs7QUFDN0IsSUFBTSxXQUFXLEdBQUcsRUFBRSxDQUFDO0FBQ3ZCLElBQU0sVUFBVSxHQUFHLENBQUMsQ0FBQztBQUVyQixJQUFJLE1BQU0sQ0FBQztBQUNYLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7SUFDWCx5Q0FBeUM7SUFDekMsTUFBTSxHQUFHLElBQUksVUFBVSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzVDLDhDQUE4QztJQUM5Qyw4Q0FBOEM7SUFDOUMsOENBQThDO0lBQzlDLDhDQUE4QztBQUMvQyxDQUFDO0FBQ0QsSUFBSSxDQUFDLENBQUM7SUFDTCxNQUFNLEdBQUcsSUFBSSxvQkFBb0IsQ0FBQyxVQUFVLENBQUMsQ0FBQztBQUMvQyxDQUFDO0FBQ0QsSUFBSSxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvLy8gPHJlZmVyZW5jZSBwYXRoPVwibm9kZV9tb2R1bGVzL0B0eXBlcy9qcXVlcnkvaW5kZXguZC50c1wiIC8+XHJcbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJub2RlX21vZHVsZXMvQHR5cGVzL2xvZGFzaC9pbmRleC5kLnRzXCIgLz5cclxuXHJcbmNvbnN0IERFQlVHID0gdHJ1ZTtcclxuXHJcbmNsYXNzIExvZyB7XHJcblx0cHVibGljIHN0YXRpYyBvdXQobXNnOiBzdHJpbmcpIHtcclxuXHRcdCQoXCI8cHJlLz5cIikudGV4dChgJHttc2d9XFxuYCkuYXBwZW5kVG8oXCIjbG9nXCIpO1xyXG5cdH1cclxuXHRwdWJsaWMgc3RhdGljIGh0bWwoaHRtbDogc3RyaW5nKSB7XHJcblx0XHQkKFwiPGRpdi8+XCIpLmh0bWwoaHRtbCkuYXBwZW5kVG8oXCIjbG9nXCIpO1xyXG5cdH1cclxufVxyXG5cclxuaW50ZXJmYWNlIFB1enpsZSB7XHJcblx0dGVzdChib2FyZDogQm9hcmQpOiBudW1iZXI7XHJcblx0Z2V0U2xvdENvdW50KCk6IG51bWJlcjtcclxufVxyXG5cclxuY2xhc3MgUHV6emxlRGVtbyBpbXBsZW1lbnRzIFB1enpsZSB7XHJcblx0cHJpdmF0ZSBzb2x1dGlvbjogbnVtYmVyW10gPSBbXTtcclxuXHJcblx0cHVibGljIGNvbnN0cnVjdG9yKHNvbHV0aW9uOiBudW1iZXJbXSkge1xyXG5cdFx0dGhpcy5zb2x1dGlvbiA9IHNvbHV0aW9uO1xyXG5cdFx0TG9nLm91dChgUHV6emxlOlxcbiAgICR7c29sdXRpb24uam9pbihcIiBcIil9YCk7XHJcblx0fVxyXG5cclxuXHRwdWJsaWMgc3RhdGljIHJhbmRvbShsZW5ndGg6IG51bWJlcik6IFB1enpsZSB7XHJcblx0XHRyZXR1cm4gbmV3IFB1enpsZURlbW8oXy5zaHVmZmxlKF8ubWFwKFxyXG5cdFx0XHRuZXcgQXJyYXkobGVuZ3RoKSwgZnVuY3Rpb24gKHYsIGspIHsgcmV0dXJuIGsgKyAxOyB9KSkpO1xyXG5cdH1cclxuXHJcblx0cHVibGljIGdldFNsb3RDb3VudCgpOiBudW1iZXIge1xyXG5cdFx0cmV0dXJuIHRoaXMuc29sdXRpb24ubGVuZ3RoO1xyXG5cdH1cclxuXHJcblx0cHVibGljIHRlc3QoYm9hcmQ6IEJvYXJkKTogbnVtYmVyIHtcclxuXHRcdGxldCBjb3VudCA9IDA7XHJcblx0XHRmb3IgKGxldCBpID0gMCwgbGVuID0gdGhpcy5zb2x1dGlvbi5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xyXG5cdFx0XHRsZXQgY29ycmVjdCA9IGJvYXJkLnNsb3RzW2ldLnF1YW50aXR5ID09IHRoaXMuc29sdXRpb25baV07XHJcblx0XHRcdGlmIChjb3JyZWN0KSBjb3VudCsrO1xyXG5cdFx0XHRpZiAoREVCVUcpIGJvYXJkLmRlYnVnVmlld0NvcnJlY3RTbG90c1tpXSA9IGNvcnJlY3Q7XHJcblx0XHR9XHJcblx0XHRyZXR1cm4gY291bnQ7XHJcblx0fVxyXG59XHJcblxyXG5jbGFzcyBIdW1hblB1enpsZUludGVyZmFjZSBpbXBsZW1lbnRzIFB1enpsZSB7XHJcblx0cHJpdmF0ZSBzbG90Q291bnQ6IG51bWJlcjtcclxuXHJcblx0cHVibGljIGNvbnN0cnVjdG9yKHNsb3RDb3VudDogbnVtYmVyKSB7XHJcblx0XHR0aGlzLnNsb3RDb3VudCA9IHNsb3RDb3VudDtcclxuXHR9XHJcblxyXG5cdHB1YmxpYyBnZXRTbG90Q291bnQoKTogbnVtYmVyIHtcclxuXHRcdHJldHVybiB0aGlzLnNsb3RDb3VudDtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgbGFzdFNlcXVlbmNlOiBudW1iZXJbXSA9IFtdO1xyXG5cdHB1YmxpYyB0ZXN0KGJvYXJkOiBCb2FyZCk6IG51bWJlciB7XHJcblx0XHRsZXQgYW5zd2VyO1xyXG5cdFx0ZG8ge1xyXG5cdFx0XHRsZXQgbiA9IF8ubWFwKGJvYXJkLnNsb3RzLCAocykgPT4gcy5xdWFudGl0eSk7XHJcblx0XHRcdGxldCBkaXNwbGF5ID0gXy5tYXAobiwgKGQsIGkpID0+IHRoaXMubGFzdFNlcXVlbmNlLmxlbmd0aCA+IDAgJiYgZCA9PSB0aGlzLmxhc3RTZXF1ZW5jZVtpXSA/IGQgOiBgKCR7ZH0pYCk7XHJcblx0XHRcdHRoaXMubGFzdFNlcXVlbmNlID0gbjtcclxuXHRcdFx0YW5zd2VyID0gcGFyc2VJbnQocHJvbXB0KFxyXG5cdFx0XHRcdGBQbGVhc2UgaW5wdXQgdGhlIGZvbGxvd2luZyBzZXF1ZW5jZTpcXG5cXG4gICAgJHtkaXNwbGF5LmpvaW4oXCIgIFwiKX1cXG5cXG5BZnRlciBlYWNoIHBsYXllciBjbGlja3MgdGhlaXIgYmx1ZSBidXR0b25cXG5ob3cgbWFueSB5ZWxsb3cgbGlnaHRzIGFyZSBsaXQ/YCksIDEwKTtcclxuXHRcdH1cclxuXHRcdHdoaWxlIChpc05hTihhbnN3ZXIpKTtcclxuXHRcdHJldHVybiBhbnN3ZXI7XHJcblx0fVxyXG59XHJcblxyXG50eXBlIERlZHVjdGlvbiA9IFwiVVwiIHwgXCJNTlwiIHwgXCJOXCIgfCBcIk1ZXCIgfCBcIllcIjtcclxuY29uc3QgVU5LTk9XTiA9IFwiVVwiO1xyXG5jb25zdCBNQVlCRV9OTyA9IFwiTU5cIjtcclxuY29uc3QgTk8gPSBcIk5cIjtcclxuY29uc3QgTUFZQkVfWUVTID0gXCJNWVwiO1xyXG5jb25zdCBZRVMgPSBcIllcIjtcclxuXHJcbmNsYXNzIFN3YXAge1xyXG5cdHB1YmxpYyBhOiBudW1iZXI7XHJcblx0cHVibGljIGI6IG51bWJlcjtcclxuXHJcblx0cHVibGljIGNvbnN0cnVjdG9yKGE6IG51bWJlciwgYjogbnVtYmVyKSB7XHJcblx0XHR0aGlzLmEgPSBhO1xyXG5cdFx0dGhpcy5iID0gYjtcclxuXHR9XHJcbn1cclxuXHJcbmNsYXNzIE1vdmUge1xyXG5cdHB1YmxpYyBudW06IG51bWJlcjtcclxuXHRwdWJsaWMgYm9hcmQ6IEJvYXJkO1xyXG5cdHB1YmxpYyBjb3JyZWN0OiBudW1iZXI7IC8vIHNjb3JlXHJcblx0cHVibGljIGRlbHRhOiBudW1iZXI7IC8vIHNjb3JlXHJcblx0cHVibGljIHByZXY/OiBNb3ZlOyAvLyBwbGF5IHNlcXVlbmNlXHJcblx0cHVibGljIGJhc2U6IE1vdmU7IC8vIGNvcGllZCBmcm9tXHJcblx0cHVibGljIHN3YXA/OiBTd2FwO1xyXG5cclxuXHQvLyBuZXcgbW92ZSBiYXNlZCBvbiBjb3B5IG9mIGdpdmVuIG1vdmVcclxuXHRwdWJsaWMgY29uc3RydWN0b3IoYmFzZTogTW92ZSwgYm9hcmQ6IEJvYXJkLCBzd2FwPzogU3dhcCkge1xyXG5cdFx0dGhpcy5iYXNlID0gYmFzZTtcclxuXHRcdHRoaXMuYm9hcmQgPSBfLmNsb25lRGVlcChib2FyZCk7XHJcblx0XHRpZiAobnVsbCAhPSBzd2FwKSB7XHJcblx0XHRcdGxldCB0bXAgPSB0aGlzLmJvYXJkLnNsb3RzW3N3YXAuYV07XHJcblx0XHRcdHRoaXMuYm9hcmQuc2xvdHNbc3dhcC5hXSA9IHRoaXMuYm9hcmQuc2xvdHNbc3dhcC5iXTtcclxuXHRcdFx0dGhpcy5ib2FyZC5zbG90c1tzd2FwLmJdID0gdG1wO1xyXG5cdFx0XHR0aGlzLmJvYXJkLnNsb3RzW3N3YXAuYV0uaW5kZXggPSBzd2FwLmE7XHJcblx0XHRcdHRoaXMuYm9hcmQuc2xvdHNbc3dhcC5iXS5pbmRleCA9IHN3YXAuYjtcclxuXHRcdFx0dGhpcy5zd2FwID0gc3dhcDtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHB1YmxpYyByZW5kZXIoKSB7XHJcblx0XHRsZXQgcyA9IGAke3RoaXMubnVtfTogYDtcclxuXHRcdGZvciAobGV0IGkgPSAwLCBsZW4gPSB0aGlzLmJvYXJkLnNsb3RzLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XHJcblx0XHRcdGxldCBzbG90ID0gdGhpcy5ib2FyZC5zbG90c1tpXTtcclxuXHRcdFx0bGV0IHVuZGVybGluZSA9IChudWxsICE9IHRoaXMuc3dhcCAmJiAoc2xvdC5xdWFudGl0eSA9PSB0aGlzLmJvYXJkLnNsb3RzW3RoaXMuc3dhcC5hXS5xdWFudGl0eSB8fCBzbG90LnF1YW50aXR5ID09IHRoaXMuYm9hcmQuc2xvdHNbdGhpcy5zd2FwLmJdLnF1YW50aXR5KSk7XHJcblx0XHRcdGxldCBib2xkID0gdGhpcy5ib2FyZC5kZWJ1Z1ZpZXdDb3JyZWN0U2xvdHNbaV07XHJcblx0XHRcdHMgKz0gYCR7Ym9sZCA/IFwiPGI+XCIgOiBcIlwifSR7dW5kZXJsaW5lID8gXCIoXCIgOiBcIlwifSR7c2xvdC5xdWFudGl0eX0ke3VuZGVybGluZSA/IFwiKVwiIDogXCJcIn0ke2JvbGQgPyBcIjwvYj5cIiA6IFwiXCJ9IGA7XHJcblx0XHR9XHJcblx0XHRzICs9ICh0aGlzLm51bSA9PT0gMSA/IFwiRklSU1RcIiA6XHJcblx0XHRcdGAgPSAke3RoaXMuY29ycmVjdH0gKCR7dGhpcy5kZWx0YSA8IDAgPyB0aGlzLmRlbHRhIDogYCske3RoaXMuZGVsdGF9YH0pIHNjb3JlOiAke3RoaXMuc2NvcmUoKX1gKTtcclxuXHRcdExvZy5odG1sKHMpO1xyXG5cdH1cclxuXHJcblx0cHVibGljIHNjb3JlKCkge1xyXG5cdFx0cmV0dXJuIHRoaXMuY29ycmVjdCArICh0aGlzLmRlbHRhICogLjUpXHJcblx0fVxyXG5cclxuXHRwdWJsaWMgZ2V0U3dhcEEoKSB7XHJcblx0XHRyZXR1cm4gdGhpcy5ib2FyZC5zbG90c1t0aGlzLnN3YXAuYV07XHJcblx0fVxyXG5cclxuXHRwdWJsaWMgZ2V0U3dhcEIoKSB7XHJcblx0XHRyZXR1cm4gdGhpcy5ib2FyZC5zbG90c1t0aGlzLnN3YXAuYl07XHJcblx0fVxyXG5cclxuXHRwdWJsaWMgZ2V0U3dhcEluQmFzZShrOiBzdHJpbmcpIHtcclxuXHRcdHJldHVybiBfLmZpbmQodGhpcy5iYXNlLmJvYXJkLnNsb3RzLCAocykgPT5cclxuXHRcdFx0cy5xdWFudGl0eSA9PT0gdGhpcy5ib2FyZC5zbG90c1t0aGlzLnN3YXBba11dLnF1YW50aXR5KTtcclxuXHR9XHJcblxyXG5cdHB1YmxpYyBoYXNTd2FwRGVkdWN0aW9uKGE6IERlZHVjdGlvbiwgYjogRGVkdWN0aW9uKSB7XHJcblx0XHRyZXR1cm4gdGhpcy5nZXRTd2FwQSgpLmRlZHVjdGlvbiA9PSBhICYmXHJcblx0XHRcdHRoaXMuZ2V0U3dhcEIoKS5kZWR1Y3Rpb24gPT0gYjtcclxuXHR9XHJcblxyXG5cdC8vIFRPRE86IGZpbmQgdGhlIGFkamFjZW50IHBhaXIgaW4gZ2l2ZW4gdHdvIG1vdmVzXHJcblx0Ly8gYWRqIHBhaXIgaW4gdHdvIG1vdmVzID1cclxuXHQvLyBpZiBtb3ZlMSA9IGEsYiBhbmQgbW92ZTIgPSBiLGMgdGhlbiBhamMgcGFpciA9IGFcclxuXHJcblx0cHVibGljIHN0YXRpYyBjb3B5TW9zdFZhbHVhYmxlTW92ZShoaXN0b3J5OiBNb3ZlW10pOiBNb3ZlIHtcclxuXHRcdGxldCBtb3N0VmFsdWFibGU6IE1vdmU7XHJcblx0XHRmb3IgKGxldCBpID0gMCwgbGVuID0gaGlzdG9yeS5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xyXG5cdFx0XHRsZXQgY3VycmVudCA9IGhpc3RvcnlbaV07XHJcblx0XHRcdGlmIChudWxsID09IG1vc3RWYWx1YWJsZSB8fCBtb3N0VmFsdWFibGUuc2NvcmUoKSA8IGN1cnJlbnQuc2NvcmUoKSkge1xyXG5cdFx0XHRcdG1vc3RWYWx1YWJsZSA9IGN1cnJlbnQ7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHRcdHJldHVybiBtb3N0VmFsdWFibGUuY2xvbmUoKTtcclxuXHR9XHJcblxyXG5cdHB1YmxpYyBjbG9uZSgpOiBNb3ZlIHtcclxuXHRcdGxldCBtb3ZlID0gbmV3IE1vdmUodGhpcywgdGhpcy5ib2FyZCk7XHJcblx0XHRtb3ZlLm51bSA9IHRoaXMubnVtO1xyXG5cdFx0bW92ZS5jb3JyZWN0ID0gdGhpcy5jb3JyZWN0O1xyXG5cdFx0bW92ZS5kZWx0YSA9IHRoaXMuZGVsdGE7XHJcblx0XHRyZXR1cm4gbW92ZTtcclxuXHR9XHJcblxyXG5cdHB1YmxpYyBzdGF0aWMgcmVqZWN0V2FzdGVNb3ZlKGhpc3Rvcnk6IE1vdmVbXSwgY2FuZGlkYXRlOiBNb3ZlKTogYm9vbGVhbiB7XHJcblx0XHRmb3IgKGxldCBpID0gMCwgbGVuID0gaGlzdG9yeS5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xyXG5cdFx0XHRsZXQgY3VycmVudCA9IGhpc3RvcnlbaV07XHJcblxyXG5cdFx0XHQvLyByZWplY3QgaWYgdGhpcyBib2FyZCBoYXMgYmVlbiBwbGF5ZWQgYmVmb3JlXHJcblx0XHRcdGlmIChCb2FyZC5jb21wYXJlKGN1cnJlbnQuYm9hcmQsIGNhbmRpZGF0ZS5ib2FyZCkpIHtcclxuXHRcdFx0XHRpZiAoREVCVUcpIExvZy5vdXQoYFJlamVjdGluZyBib2FyZCBwbGF5ZWQgYmVmb3JlIGF0IG1vdmUgJHtjdXJyZW50Lm51bX0gJHtjYW5kaWRhdGUuYm9hcmQuc2xvdHMuam9pbihcIiBcIil9YCk7XHJcblx0XHRcdFx0cmV0dXJuIHRydWU7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGZvciAobGV0IGkgPSAwLCBsZW4gPSBjdXJyZW50LmJvYXJkLnNsb3RzLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XHJcblx0XHRcdFx0bGV0IGN1ciA9IGN1cnJlbnQuYm9hcmQuc2xvdHNbaV07XHJcblx0XHRcdFx0bGV0IGNhbiA9IGNhbmRpZGF0ZS5ib2FyZC5zbG90c1tpXTtcclxuXHJcblx0XHRcdFx0Ly8gcmVqZWN0IGlmIGhpc3RvcnkgY29udGFpbnMgYSBZRVMgdGhhdCBpc24ndCBpbmNsdWRlZCBoZXJlXHJcblx0XHRcdFx0aWYgKFlFUyA9PT0gY3VyLmRlZHVjdGlvbiAmJiBjYW4ucXVhbnRpdHkgIT09IGN1ci5xdWFudGl0eSkge1xyXG5cdFx0XHRcdFx0aWYgKERFQlVHKSBMb2cub3V0KGBSZWplY3RpbmcgaW5kZXggJHtjYW4ucXVhbnRpdHl9JHtjYW4uZGVkdWN0aW9uLnN1YnN0cigwLCAyKX1AJHtjYW4uaW5kZXh9IHdoaWNoIHdhcyAke2N1ci5xdWFudGl0eX0ke2N1ci5kZWR1Y3Rpb24uc3Vic3RyKDAsIDIpfUAke2N1ci5pbmRleH0gYmVmb3JlIGF0IG1vdmUgJHtjdXJyZW50Lm51bX1gKTtcclxuXHRcdFx0XHRcdHJldHVybiB0cnVlO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0Ly8gcmVqZWN0IGlmIGhpc3RvcnkgY29udGFpbnMgYSBOTyB0aGF0IGlzIGluY2x1ZGVkIGFnYWluIGhlcmVcclxuXHRcdFx0XHRpZiAoTk8gPT09IGN1ci5kZWR1Y3Rpb24gJiYgY2FuLnF1YW50aXR5ID09PSBjdXIucXVhbnRpdHkpIHtcclxuXHRcdFx0XHRcdGlmIChERUJVRykgTG9nLm91dChgUmVqZWN0aW5nIGluZGV4ICR7Y2FuLnF1YW50aXR5fSR7Y2FuLmRlZHVjdGlvbi5zdWJzdHIoMCwgMil9QCR7Y2FuLmluZGV4fSB3aGljaCB3YXMgJHtjdXIucXVhbnRpdHl9JHtjdXIuZGVkdWN0aW9uLnN1YnN0cigwLCAyKX1AJHtjdXIuaW5kZXh9IGJlZm9yZSBhdCBtb3ZlICR7Y3VycmVudC5udW19YCk7XHJcblx0XHRcdFx0XHRyZXR1cm4gdHJ1ZTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHJldHVybiBmYWxzZTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHB1YmxpYyBzdGF0aWMgY3Jvc3NKb2luQ2FuZGlkYXRlcyhjYW5kaWRhdGVzOiBTbG90W10pIHtcclxuXHRcdGxldCByZXN1bHQ6IFNsb3RbXSA9IFtdO1xyXG5cdFx0Zm9yIChsZXQgeCA9IDAsIHhsZW4gPSBjYW5kaWRhdGVzLmxlbmd0aDsgeCA8IHhsZW47IHgrKykge1xyXG5cdFx0XHRmb3IgKGxldCB5ID0gMCwgeWxlbiA9IGNhbmRpZGF0ZXMubGVuZ3RoOyB5IDwgeWxlbjsgeSsrKSB7XHJcblx0XHRcdFx0aWYgKHggIT0geSlcclxuXHRcdFx0XHRcdHJlc3VsdC5wdXNoKGNhbmRpZGF0ZXNbeF0sIGNhbmRpZGF0ZXNbeV0pO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0XHRyZXR1cm4gcmVzdWx0O1xyXG5cdH1cclxufVxyXG5cclxuY2xhc3MgU2xvdCB7XHJcblx0cHVibGljIGluZGV4OiBudW1iZXI7XHJcblx0cHVibGljIHF1YW50aXR5OiBudW1iZXI7XHJcblx0cHVibGljIGRlZHVjdGlvbjogRGVkdWN0aW9uO1xyXG5cclxuXHRwdWJsaWMgc2V0RGVkdWN0aW9uKGRlZHVjdGlvbjogRGVkdWN0aW9uLCBib2FyZDogQm9hcmQsIGluZGV4OiBudW1iZXIpIHtcclxuXHRcdGlmIChZRVMgPT09IHRoaXMuZGVkdWN0aW9uIHx8IE5PID09PSB0aGlzLmRlZHVjdGlvbikgcmV0dXJuOyAvLyBoYXJkIGNvbmNsdXNpb25zIHRvIGNoYW5nZVxyXG5cdFx0aWYgKERFQlVHKSB7XHJcblx0XHRcdExvZy5vdXQoYCAgICAke3RoaXMucXVhbnRpdHl9JHt0aGlzLmRlZHVjdGlvbi5zdWJzdHIoMCwgMil9QCR7dGhpcy5pbmRleH0gPT4gJHtkZWR1Y3Rpb24uc3Vic3RyKDAsIDIpfSR7ZGVkdWN0aW9uID09IFlFUyA/IFwiIEZPVU5EXCIgOiBcIlwifWApO1xyXG5cdFx0XHRpZiAoWUVTID09PSBkZWR1Y3Rpb24gJiYgIWJvYXJkLmRlYnVnVmlld0NvcnJlY3RTbG90c1tpbmRleF0pIHtcclxuXHRcdFx0XHRMb2cub3V0KGAgICAgICBidXQgaXRzIHdyb25nYCk7XHJcblx0XHRcdFx0ZGVidWdnZXI7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHRcdHRoaXMuZGVkdWN0aW9uID0gZGVkdWN0aW9uO1xyXG5cdH1cclxuXHJcblx0cHVibGljIHRvU3RyaW5nKCkge1xyXG5cdFx0cmV0dXJuIGAke3RoaXMucXVhbnRpdHl9JHt0aGlzLmRlZHVjdGlvbi5zdWJzdHIoMCwgMil9QCR7dGhpcy5pbmRleH1gO1xyXG5cdH1cclxufVxyXG5cclxuXHJcbmNsYXNzIEJvYXJkIHtcclxuXHRwdWJsaWMgc2xvdHM6IFNsb3RbXTtcclxuXHRwdWJsaWMgZGVidWdWaWV3Q29ycmVjdFNsb3RzOiBib29sZWFuW10gPSBbXTtcclxuXHJcblx0cHVibGljIGNvbnN0cnVjdG9yKHNsb3RzOiBTbG90W10pIHtcclxuXHRcdHRoaXMuc2xvdHMgPSBzbG90cztcclxuXHR9XHJcblxyXG5cdHB1YmxpYyBmaW5kQWxsKGZuKSB7XHJcblx0XHRyZXR1cm4gXy5maWx0ZXIodGhpcy5zbG90cywgZm4pO1xyXG5cdH1cclxuXHJcblx0cHVibGljIGZpbmRPbmUoZm4pIHtcclxuXHRcdHJldHVybiB0aGlzLmZpbmRBbGwoZm4pWzBdO1xyXG5cdH1cclxuXHJcblx0cHVibGljIHN0YXRpYyBjb21wYXJlKGE6IEJvYXJkLCBiOiBCb2FyZCkge1xyXG5cdFx0aWYgKGEuc2xvdHMubGVuZ3RoICE9IGIuc2xvdHMubGVuZ3RoKSByZXR1cm4gZmFsc2U7XHJcblx0XHRmb3IgKGxldCBpID0gMCwgbGVuID0gYS5zbG90cy5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xyXG5cdFx0XHRpZiAoYS5zbG90c1tpXS5xdWFudGl0eSAhPSBiLnNsb3RzW2ldLnF1YW50aXR5KSB7XHJcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0XHRyZXR1cm4gdHJ1ZTtcclxuXHR9XHJcblxyXG5cdHB1YmxpYyByZW5kZXIoKSB7XHJcblx0XHRmb3IgKGxldCBpID0gMCwgbGVuID0gdGhpcy5zbG90cy5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xyXG5cdFx0XHQkKFwidGQjY1wiICsgaSkudGV4dCh0aGlzLnNsb3RzW2ldLnF1YW50aXR5ICsgXCIgXCIgKyB0aGlzLnNsb3RzW2ldLmRlZHVjdGlvbi5zdWJzdHIoMCwgMikpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0cHVibGljIHRvU3RyaW5nKCkge1xyXG5cdFx0cmV0dXJuIHRoaXMuc2xvdHMuam9pbihcIiBcIik7XHJcblx0fVxyXG59XHJcblxyXG5jbGFzcyBTb2x2ZXIge1xyXG5cdHByaXZhdGUgcHV6emxlOiBQdXp6bGU7XHJcblx0cHJpdmF0ZSBtb3ZlczogbnVtYmVyID0gMDtcclxuXHRwdWJsaWMgcm9vdE1vdmU6IE1vdmU7IC8vIHJvb3QgQlNUIG5vZGVcclxuXHRwdWJsaWMgbGFzdE1vdmU6IE1vdmU7IC8vIGhpc3Rvcnkgb2YgcGxheWVkIG1vdmVzXHJcblx0cHVibGljIHNvbHV0aW9uOiBudW1iZXJbXTtcclxuXHJcblx0cHVibGljIGNvbnN0cnVjdG9yKHB1enpsZTogUHV6emxlKSB7XHJcblx0XHR0aGlzLnB1enpsZSA9IHB1enpsZTtcclxuXHJcblx0XHQvLyBiZWdpbiB3aXRoIG9wZW5pbmcgbW92ZVxyXG5cdFx0dGhpcy5yb290TW92ZSA9IG5ldyBNb3ZlKG51bGwsIG5ldyBCb2FyZChfLm1hcChcclxuXHRcdFx0bmV3IEFycmF5KHRoaXMucHV6emxlLmdldFNsb3RDb3VudCgpKSxcclxuXHRcdFx0KG5pbCwgaSkgPT4ge1xyXG5cdFx0XHRcdGxldCBzbG90ID0gbmV3IFNsb3QoKTtcclxuXHRcdFx0XHRzbG90LmluZGV4ID0gaTtcclxuXHRcdFx0XHRzbG90LnF1YW50aXR5ID0gaSArIDE7XHJcblx0XHRcdFx0c2xvdC5kZWR1Y3Rpb24gPSBVTktOT1dOO1xyXG5cdFx0XHRcdHJldHVybiBzbG90O1xyXG5cdFx0XHR9KSkpO1xyXG5cdFx0dGhpcy5wbGF5TW92ZSh0aGlzLnJvb3RNb3ZlKTtcclxuXHR9XHJcblxyXG5cdHB1YmxpYyBnZXRIaXN0b3J5KCkge1xyXG5cdFx0bGV0IGN1cnJlbnQgPSB0aGlzLmxhc3RNb3ZlO1xyXG5cdFx0bGV0IGhpc3Rvcnk6IE1vdmVbXSA9IFtdO1xyXG5cdFx0d2hpbGUgKG51bGwgIT0gY3VycmVudCkge1xyXG5cdFx0XHRoaXN0b3J5LnB1c2goY3VycmVudCk7XHJcblx0XHRcdGN1cnJlbnQgPSBjdXJyZW50LnByZXY7XHJcblx0XHR9XHJcblx0XHRyZXR1cm4gaGlzdG9yeTtcclxuXHR9XHJcblxyXG5cdHB1YmxpYyBwbGF5TW92ZShtb3ZlOiBNb3ZlKSB7XHJcblx0XHQvLyBzZXF1ZW5jZSBtb3ZlIGludG8gcGxheVxyXG5cdFx0bW92ZS5udW0gPSArK3RoaXMubW92ZXM7XHJcblx0XHRtb3ZlLnByZXYgPSB0aGlzLmxhc3RNb3ZlO1xyXG5cdFx0dGhpcy5sYXN0TW92ZSA9IG1vdmU7XHJcblxyXG5cdFx0Ly8gdGVzdCBhbmQgc2NvcmUgdGhlIG1vdmVcclxuXHRcdG1vdmUuY29ycmVjdCA9IHRoaXMucHV6emxlLnRlc3QobW92ZS5ib2FyZCk7XHJcblx0XHRtb3ZlLmRlbHRhID0gbW92ZS5jb3JyZWN0IC0gKG51bGwgIT0gbW92ZS5iYXNlID8gbW92ZS5iYXNlLmNvcnJlY3QgfHwgMCA6IDApO1xyXG5cdFx0aWYgKHRoaXMubW92ZXMgPiBNQVhfR1VFU1NFUykge1xyXG5cdFx0XHRMb2cub3V0KFwiVG9vIG1hbnkgZ3Vlc3Nlczsgd2UgbG9zZS5cIik7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHRcdC8vIHVwZGF0ZSB1c2VyIHZpZXdcclxuXHRcdG1vdmUuYm9hcmQucmVuZGVyKCk7XHJcblx0XHRtb3ZlLnJlbmRlcigpO1xyXG5cdFx0aWYgKG1vdmUuY29ycmVjdCA+PSB0aGlzLnB1enpsZS5nZXRTbG90Q291bnQoKSkge1xyXG5cdFx0XHRMb2cub3V0KGBZb3Ugd2luIGluICR7dGhpcy5tb3Zlc30gbW92ZXMuYCk7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHRcdGlmIChudWxsICE9IG1vdmUuc3dhcCkge1xyXG5cdFx0XHQvLyBhcHBseSBzd2FwIGRlZHVjdGlvbnNcclxuXHRcdFx0aWYgKG1vdmUuZGVsdGEgPT0gMCkge1xyXG5cdFx0XHRcdC8vIG5vIGRpZmZlcmVuY2U7IGJvdGggbXVzdCBiZSBOT1xyXG5cdFx0XHRcdG1vdmUuZ2V0U3dhcEEoKS5zZXREZWR1Y3Rpb24oTk8sIG1vdmUuYm9hcmQsIG1vdmUuc3dhcC5hKTtcclxuXHRcdFx0XHRtb3ZlLmdldFN3YXBCKCkuc2V0RGVkdWN0aW9uKE5PLCBtb3ZlLmJvYXJkLCBtb3ZlLnN3YXAuYik7XHJcblx0XHRcdFx0bW92ZS5nZXRTd2FwSW5CYXNlKFwiYVwiKS5zZXREZWR1Y3Rpb24oTk8sIG1vdmUuYmFzZS5ib2FyZCwgbW92ZS5zd2FwLmEpO1xyXG5cdFx0XHRcdG1vdmUuZ2V0U3dhcEluQmFzZShcImJcIikuc2V0RGVkdWN0aW9uKE5PLCBtb3ZlLmJhc2UuYm9hcmQsIG1vdmUuc3dhcC5iKTtcclxuXHRcdFx0fVxyXG5cdFx0XHRlbHNlIGlmIChtb3ZlLmRlbHRhID09IDEpIHtcclxuXHRcdFx0XHQvLyBkaWZmZXJlbmNlOyBvbmUgaXMgbm93IHJpZ2h0LCBidXQgd2UgZG9uJ3Qga25vdyB3aGljaFxyXG5cdFx0XHRcdG1vdmUuZ2V0U3dhcEEoKS5zZXREZWR1Y3Rpb24oTUFZQkVfWUVTLCBtb3ZlLmJvYXJkLCBtb3ZlLnN3YXAuYSk7XHJcblx0XHRcdFx0bW92ZS5nZXRTd2FwQigpLnNldERlZHVjdGlvbihNQVlCRV9ZRVMsIG1vdmUuYm9hcmQsIG1vdmUuc3dhcC5iKTtcclxuXHRcdFx0XHQvL21vdmUuZ2V0U3dhcEluQmFzZShcImFcIikuc2V0RGVkdWN0aW9uKE1BWUJFX05PLCBtb3ZlLmJhc2UuYm9hcmQsIG1vdmUuc3dhcC5hKTtcclxuXHRcdFx0XHQvL21vdmUuZ2V0U3dhcEluQmFzZShcImJcIikuc2V0RGVkdWN0aW9uKE1BWUJFX05PLCBtb3ZlLmJhc2UuYm9hcmQsIG1vdmUuc3dhcC5iKTtcclxuXHRcdFx0fVxyXG5cdFx0XHRlbHNlIGlmIChtb3ZlLmRlbHRhID09IDIpIHtcclxuXHRcdFx0XHQvLyB2ZXJ5IHBvc2l0aXZlIGRpZmZlcmVuY2U7IGJvdGggYXJlIG5vdyByaWdodCBmb3Igc3VyZVxyXG5cdFx0XHRcdG1vdmUuZ2V0U3dhcEEoKS5zZXREZWR1Y3Rpb24oWUVTLCBtb3ZlLmJvYXJkLCBtb3ZlLnN3YXAuYSk7XHJcblx0XHRcdFx0bW92ZS5nZXRTd2FwQigpLnNldERlZHVjdGlvbihZRVMsIG1vdmUuYm9hcmQsIG1vdmUuc3dhcC5iKTtcclxuXHRcdFx0XHRtb3ZlLmdldFN3YXBJbkJhc2UoXCJhXCIpLnNldERlZHVjdGlvbihOTywgbW92ZS5iYXNlLmJvYXJkLCBtb3ZlLnN3YXAuYSk7XHJcblx0XHRcdFx0bW92ZS5nZXRTd2FwSW5CYXNlKFwiYlwiKS5zZXREZWR1Y3Rpb24oTk8sIG1vdmUuYmFzZS5ib2FyZCwgbW92ZS5zd2FwLmIpO1xyXG5cdFx0XHR9XHJcblx0XHRcdGVsc2UgaWYgKG1vdmUuZGVsdGEgPT0gLTEpIHtcclxuXHRcdFx0XHQvLyBkaWZmZXJlbmNlOyBvbmUgd2FzIHJpZ2h0LCBidXQgd2UgZG9uJ3Qga25vdyB3aGljaFxyXG5cdFx0XHRcdC8vbW92ZS5nZXRTd2FwQSgpLnNldERlZHVjdGlvbihNQVlCRSwgbW92ZS5ib2FyZCwgbW92ZS5zd2FwLmEpO1xyXG5cdFx0XHRcdC8vbW92ZS5nZXRTd2FwQigpLnNldERlZHVjdGlvbihNQVlCRSwgbW92ZS5ib2FyZCwgbW92ZS5zd2FwLmIpO1xyXG5cdFx0XHRcdG1vdmUuZ2V0U3dhcEluQmFzZShcImFcIikuc2V0RGVkdWN0aW9uKE1BWUJFX1lFUywgbW92ZS5iYXNlLmJvYXJkLCBtb3ZlLnN3YXAuYSk7XHJcblx0XHRcdFx0bW92ZS5nZXRTd2FwSW5CYXNlKFwiYlwiKS5zZXREZWR1Y3Rpb24oTUFZQkVfWUVTLCBtb3ZlLmJhc2UuYm9hcmQsIG1vdmUuc3dhcC5iKTtcclxuXHRcdFx0fVxyXG5cdFx0XHRlbHNlIGlmIChtb3ZlLmRlbHRhID09IC0yKSB7XHJcblx0XHRcdFx0Ly8gZGlmZmVyZW5jZTsgYm90aCB3ZXJlIHJpZ2h0IGZvciBzdXJlXHJcblx0XHRcdFx0bW92ZS5nZXRTd2FwQSgpLnNldERlZHVjdGlvbihOTywgbW92ZS5ib2FyZCwgbW92ZS5zd2FwLmEpO1xyXG5cdFx0XHRcdG1vdmUuZ2V0U3dhcEIoKS5zZXREZWR1Y3Rpb24oTk8sIG1vdmUuYm9hcmQsIG1vdmUuc3dhcC5iKTtcclxuXHRcdFx0XHRtb3ZlLmdldFN3YXBJbkJhc2UoXCJhXCIpLnNldERlZHVjdGlvbihZRVMsIG1vdmUuYmFzZS5ib2FyZCwgbW92ZS5zd2FwLmEpO1xyXG5cdFx0XHRcdG1vdmUuZ2V0U3dhcEluQmFzZShcImJcIikuc2V0RGVkdWN0aW9uKFlFUywgbW92ZS5iYXNlLmJvYXJkLCBtb3ZlLnN3YXAuYik7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHR0aGlzLmRlY2lkZSgpO1xyXG5cdH1cclxuXHJcblx0cHVibGljIGRlY2lkZSgpIHtcclxuXHRcdC8vIGRlY2lkZSB3aGF0IHRvIGRvIG5leHRcclxuXHRcdGxldCBuZXh0TW92ZTogTW92ZTtcclxuXHRcdGxldCBjYW5kaWRhdGVzOiBTbG90W107XHJcblx0XHRsZXQgdSwgeDtcclxuXHRcdGlmICgxID09PSB0aGlzLm1vdmVzKSB7IC8vIGZvbGxvdy11cCB0byBmaXJzdCBtb3ZlXHJcblx0XHRcdC8vIGp1c3QgcGxheSBhIHN3YXAgb2YgdGhlIGZpcnN0IHR3byBwb3NpdGlvbnNcclxuXHRcdFx0bmV4dE1vdmUgPSBuZXcgTW92ZSh0aGlzLmxhc3RNb3ZlLCB0aGlzLmxhc3RNb3ZlLmJvYXJkLCBuZXcgU3dhcCgwLCAxKSk7XHJcblx0XHR9XHJcblx0XHRlbHNlIHsgLy8gc3Vic2VxdWVudCBtb3Zlc1xyXG5cdFx0XHRsZXQgbW92ZSA9IE1vdmUuY29weU1vc3RWYWx1YWJsZU1vdmUodGhpcy5nZXRIaXN0b3J5KCkpO1xyXG5cdFx0XHQvLyB0cnkgYSB1bmlxdWUgbmV3IHN3YXAgZnJvbSBub24teWVzIGRlZHVjdGlvbnNcclxuXHRcdFx0bGV0IHRyaWVzID0gMDtcclxuXHRcdFx0ZG8ge1xyXG5cdFx0XHRcdC8vXHRcdFx0XHQvLyBpZiB0aGUgcHJldmlvdXMgc3dhcCB3YXMgTSxNIG9yIE4sTlxyXG5cdFx0XHRcdC8vXHRcdFx0XHRpZiAoXHJcblx0XHRcdFx0Ly9cdFx0XHRcdFx0KG1vdmUuaGFzU3dhcERlZHVjdGlvbihNQVlCRSwgTUFZQkUpIHx8XHJcblx0XHRcdFx0Ly9cdFx0XHRcdFx0XHRtb3ZlLmhhc1N3YXBEZWR1Y3Rpb24oTk8sIE5PKSlcclxuXHRcdFx0XHQvL1x0XHRcdFx0KSB7XHJcblx0XHRcdFx0Ly9cdFx0XHRcdFx0Ly8gaXQgc2hvdWxkIHJldXNlIEEgZnJvbSB0aGUgcHJldmlvdXMgbW92ZVxyXG5cdFx0XHRcdC8vXHRcdFx0XHRcdC8vIHVubGVzcyB0aGF0IHJlc3VsdGVkIGluIGEgbm8gY2hhbmdlIG9yIHVuZXhwZWN0ZWQgZ2FpblxyXG5cdFx0XHRcdC8vXHRcdFx0XHRcdC8vIGluIHdoaWNoIGNhc2UgaXQgc2hvdWxkIG5vdyByZXVzZSBCIGZyb20gdHdvIG1vdmVzIGFnb1xyXG5cdFx0XHRcdC8vXHRcdFx0XHR9XHJcblx0XHRcdFx0Ly9cdFx0XHRcdGVsc2Uge1xyXG5cdFx0XHRcdC8vXHRcdFx0XHRcdC8vIHJvdGF0ZSB0aHJvdWdoIHVudGVzdGVkIHN3YXBzIHJlbWFpbmluZ1xyXG5cdFx0XHRcdC8vXHJcblx0XHRcdFx0Ly9cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0bGV0IHJhbmsgPSB7IE1BWUJFX1lFUzogMSwgTk86IDIsIFVOS05PV046IDMsIE1BWUJFX05POiA0IH07XHJcblx0XHRcdFx0aWYgKG51bGwgPT0gY2FuZGlkYXRlcykge1xyXG5cdFx0XHRcdFx0Y2FuZGlkYXRlcyA9IF8uZmlsdGVyKG1vdmUuYm9hcmQuc2xvdHMsIChzKSA9PlxyXG5cdFx0XHRcdFx0XHRfLmluY2x1ZGVzKFtVTktOT1dOLCBNQVlCRV9OTywgTUFZQkVfWUVTLCBOT10sIHMuZGVkdWN0aW9uKSk7XHJcblx0XHRcdFx0XHRjYW5kaWRhdGVzID0gXy5zb3J0QnkoY2FuZGlkYXRlcywgKHMpID0+IHJhbmtbcy5kZWR1Y3Rpb25dKTtcclxuXHRcdFx0XHRcdGNhbmRpZGF0ZXMgPSBNb3ZlLmNyb3NzSm9pbkNhbmRpZGF0ZXMoY2FuZGlkYXRlcyk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdGVsc2Uge1xyXG5cdFx0XHRcdFx0TG9nLm91dChgcmVwZWF0ZWQgd2hpbGU6ICR7eH0sICR7dX1gKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0TG9nLm91dChfLm1hcChjYW5kaWRhdGVzLCAocykgPT4gYCR7cy5xdWFudGl0eX0ke3MuZGVkdWN0aW9uLnN1YnN0cigwLCAyKX1AJHtzLmluZGV4fWApLmpvaW4oXCIgXCIpKTtcclxuXHRcdFx0XHRsZXQgYSA9IGNhbmRpZGF0ZXMuc2hpZnQoKS5pbmRleCwgYiA9IGNhbmRpZGF0ZXMuc2hpZnQoKS5pbmRleDtcclxuXHRcdFx0XHRuZXh0TW92ZSA9IG5ldyBNb3ZlKG1vdmUsIG1vdmUuYm9hcmQsIG5ldyBTd2FwKGEsIGIpKTtcclxuXHRcdFx0fVxyXG5cdFx0XHR3aGlsZSAoXHJcblx0XHRcdFx0KHggPSBNb3ZlLnJlamVjdFdhc3RlTW92ZSh0aGlzLmdldEhpc3RvcnkoKSwgbmV4dE1vdmUpKVxyXG5cdFx0XHRcdCYmICh1ID0gdHJpZXMrKykgPCBMT09QX0JSRUFLRVIpO1xyXG5cdFx0XHRpZiAoREVCVUcgJiYgdHJpZXMgPiBMT09QX0JSRUFLRVIpIExvZy5vdXQoXCJjYW5kaWRhdGVzIG5vdCBvcmlnaW5hbCBlbm91Z2g7IGV4aGF1c3RpbmcgcmV0cmllc1wiKTtcclxuXHRcdFx0TG9nLm91dChgZXNjYXBlZCB3aGlsZTogJHt4fSwgJHt1fWApO1xyXG5cdFx0fVxyXG5cdFx0aWYgKG51bGwgPT0gbmV4dE1vdmUpIHtcclxuXHRcdFx0TG9nLm91dChcIlVuYWJsZSB0byBmaW5kIG5leHQgbW92ZS5cIik7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHJcblx0XHRzZXRUaW1lb3V0KCgpID0+IHRoaXMucGxheU1vdmUobmV4dE1vdmUpLCBHVUVTU19ERUxBWSk7XHJcblx0fVxyXG59XHJcblxyXG5jb25zdCBMT09QX0JSRUFLRVIgPSA5OTk7XHJcbmNvbnN0IEdVRVNTX0RFTEFZID0gNTA7IC8vIG1zXHJcbmNvbnN0IE1BWF9HVUVTU0VTID0gMTM7XHJcbmNvbnN0IFNMT1RfQ09VTlQgPSA2O1xyXG5cclxubGV0IHB1enpsZTtcclxuaWYgKERFQlVHKSB7XHJcblx0Ly9wdXp6bGUgPSBQdXp6bGVEZW1vLnJhbmRvbShTTE9UX0NPVU5UKTtcclxuXHRwdXp6bGUgPSBuZXcgUHV6emxlRGVtbyhbMSwgNiwgMywgNSwgNCwgMl0pO1xyXG5cdC8vcHV6emxlID0gbmV3IFB1enpsZURlbW8oWzIsIDMsIDQsIDEsIDYsIDVdKTtcclxuXHQvL3B1enpsZSA9IG5ldyBQdXp6bGVEZW1vKFsyLCA0LCA2LCAxLCA1LCAzXSk7XHJcblx0Ly9wdXp6bGUgPSBuZXcgUHV6emxlRGVtbyhbMiwgMSwgNSwgNiwgMywgNF0pO1xyXG5cdC8vIFRPRE86IHRyeSBhIHB1enpsZSB3aGVyZSBudW1iZXJzIGNhbiByZXBlYXRcclxufVxyXG5lbHNlIHtcclxuXHRwdXp6bGUgPSBuZXcgSHVtYW5QdXp6bGVJbnRlcmZhY2UoU0xPVF9DT1VOVCk7XHJcbn1cclxubmV3IFNvbHZlcihwdXp6bGUpOyJdfQ==