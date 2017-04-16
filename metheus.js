/// <reference path="node_modules/@types/jquery/index.d.ts" />
/// <reference path="node_modules/@types/lodash/index.d.ts" />
var Log = (function () {
    function Log() {
    }
    Log.out = function (msg) {
        this.state += msg + "\n";
        $("#pre").text(this.state);
    };
    return Log;
}());
Log.state = "";
var PuzzleDemo = (function () {
    function PuzzleDemo(solution) {
        this.solution = [];
        this.solution = solution;
        Log.out("Puzzle: " + solution.join(" "));
    }
    PuzzleDemo.random = function (length) {
        return new PuzzleDemo(_.shuffle(_.map(new Array(length), function (v, k) { return k + 1; })));
    };
    PuzzleDemo.prototype.getSlotCount = function () {
        return this.solution.length;
    };
    PuzzleDemo.prototype.test = function (board) {
        var correct = 0;
        for (var i = 0, len = this.solution.length; i < len; i++) {
            if (board.getSlot(i).quantity == this.solution[i]) {
                correct++;
            }
        }
        return correct;
    };
    return PuzzleDemo;
}());
var HumanPuzzleInterface = (function () {
    function HumanPuzzleInterface(slotCount) {
        this.slotCount;
    }
    HumanPuzzleInterface.prototype.getSlotCount = function () {
        return this.slotCount;
    };
    HumanPuzzleInterface.prototype.test = function (board) {
        var answer;
        do {
            answer = parseInt(prompt("Please try:\n\t" + board + "\n\nHow many are correct?"), 10);
        } while (!isNaN(answer));
        return answer;
    };
    return HumanPuzzleInterface;
}());
var Solver = (function () {
    function Solver(puzzle) {
        this.guesses = 0;
        this.puzzle = puzzle;
        // first guess
        this.board = new Board(_.map(new Array(this.puzzle.getSlotCount()), function (v, k) { return k + 1; }));
        // begin
        this.testGuess();
    }
    Solver.solve = function (puzzle) {
        return new Solver(puzzle);
    };
    Solver.prototype.testGuess = function () {
        var _this = this;
        this.guesses++;
        if (this.guesses > MAX_GUESSES) {
            Log.out("Too many guesses; we lose.");
            return;
        }
        var correct = this.puzzle.test(this.board);
        var delta = correct - this.lastCorrect || 0;
        Log.out(correct + " (" + (delta < 0 ? delta : "+" + delta) + ")  " + this.board);
        this.board.render();
        if (correct == this.puzzle.getSlotCount()) {
            Log.out("You win in " + this.guesses + " guesses.");
            return;
        }
        // try again
        var move = this.board.getMove(-1);
        var twoMovesAgo = this.board.getMove(-2);
        var priorityCandidates = [];
        var nonCandidates = [];
        if (null != move) {
            move.delta = delta;
            if (delta == 0) {
                // no difference; both must be NO?
                move.after.a.setDeduction("NO");
                move.after.b.setDeduction("NO");
                if ((null != twoMovesAgo && twoMovesAgo.delta == 1 &&
                    // and it was M,M
                    twoMovesAgo.after.a.deduction == "MAYBE" &&
                    twoMovesAgo.after.b.deduction == "MAYBE")) {
                    Log.out("experimental 2");
                    // then the slot that we moved last
                    // which was part of the pair two moves ago
                    // must be Y
                    // and the other N
                    if ((move.after.a.quantity == twoMovesAgo.after.a.quantity) ||
                        (move.after.b.quantity == twoMovesAgo.after.a.quantity)) {
                        this.board.getSlot(twoMovesAgo.after.b.index).setDeduction("YES");
                    }
                    else {
                        this.board.getSlot(twoMovesAgo.after.a.index).setDeduction("YES");
                    }
                }
            }
            else if (delta == 1) {
                // // if either of these MAYBEs has ever been NO before, then the other is YES now
                // if (this.board.hadDeductionAtIndex(move.after.a, "NO")) {
                // 	this.board.getSlot(move.after.a.index).setDeduction("YES");
                // 	this.board.getSlot(move.after.b.index).setDeduction("NO");
                // }
                // else if (this.board.hadDeductionAtIndex(move.after.b, "NO")) {
                // 	this.board.getSlot(move.after.b.index).setDeduction("YES");
                // 	this.board.getSlot(move.after.a.index).setDeduction("NO");
                // }
                // else {
                // difference; one is now right, but we don't know which
                // unless we have history to narrow it, then we have specific match
                // now decide what to do with this information
                //if ( // if two moves ago we gained one
                //	(null != twoMovesAgo && twoMovesAgo.delta == 1 &&
                //		// and it was M,M
                //		twoMovesAgo.after.a.deduction == "MAYBE" &&
                //		twoMovesAgo.after.b.deduction == "MAYBE")
                //) {
                //	Log.out("experimental 3");
                //
                //	if (
                //		(move.after.a.quantity == twoMovesAgo.after.a.quantity)	||
                //		(move.after.a.quantity == twoMovesAgo.after.b.quantity)
                //	) {
                //		move.after.a.setDeduction("YES");
                //		move.after.b.setDeduction("MAYBE");
                //	}
                //	else {
                //		move.after.a.setDeduction("MAYBE");
                //		move.after.b.setDeduction("YES");
                //	}
                //}
                //else {
                move.after.a.setDeduction("MAYBE");
                move.after.b.setDeduction("MAYBE");
                //}
            }
            else if (delta == 2) {
                // very positive difference; both are now right for sure
                move.after.a.setDeduction("YES");
                move.after.b.setDeduction("YES");
                // if last two were also maybes, then the third is YES
            }
            else if (delta == -1) {
                // difference; one was right, but we don't know which
                // so first step is always to put it back
                this.board.unswap();
                correct = this.lastCorrect;
                move = this.board.getMove(-1);
                twoMovesAgo = this.board.getMove(-2);
                var threeMovesAgo = this.board.getMove(-3);
                // now decide what to do with this information
                //if ( // if two moves ago we gained one
                //	(null != threeMovesAgo && threeMovesAgo.delta == 1 &&
                //		// and it was M,M
                //		threeMovesAgo.after.a.deduction == "MAYBE" &&
                //		threeMovesAgo.after.b.deduction == "MAYBE")
                //) {
                //	Log.out("experimental");
                //	// then the slot that we moved last
                //	// which was part of the pair two moves ago
                //	// must be Y
                //	// and the other N
                //
                //	// note: assumes A is the one we always chose to reswap
                //
                //	// 3 and 4 were the previous two
                //	// we kept 3 and tried 6 but lost one
                //	// therefore 3 (being present in now and prev) is YES
                //	// and 6 is NO
                //
                //	if (
                //		(move.after.a.quantity == threeMovesAgo.after.a.quantity)
                //	) {
                //		move.after.a.setDeduction("YES");
                //		move.after.b.setDeduction("NO");
                //	}
                //	else {
                //		move.after.a.setDeduction("NO");
                //		move.after.b.setDeduction("YES");
                //	}
                //}
                //else {
                move.after.a.setDeduction("MAYBE");
                move.after.b.setDeduction("MAYBE");
                //}
                // TRICKY: if swap MAYBE, NO = -1 then REVERSE and deduce MAYBE => YES
                // if previously MAYBE, MAYBE, but now -1, then a is YES
                //if (move.after.a.deduction == "MAYBE" && move.after.b.deduction == "MAYBE") {
                //	this.board.getSlot(move.after.a.index)
                //}
                //this.board.setRemainderDeduction("MAYBE", "MAYBE", "YES");
            }
            else if (delta == -2) {
                // difference; both were right for sure
                this.board.unswap();
                correct = this.lastCorrect;
                move = this.board.getMove(-1);
                twoMovesAgo = this.board.getMove(-2);
                move.after.a.setDeduction("YES");
                move.after.b.setDeduction("YES");
                // if last two were also maybes, then the third is YES
            }
            // M,M and N,N are good to iterate with 
            // since you know one of them is going to be Y or N when resolved
            if ((move.after.a.deduction == "MAYBE" && move.after.b.deduction == "MAYBE") ||
                (move.after.a.deduction == "NO" && move.after.b.deduction == "NO")) {
                // ensure next swap contains one slot from this last pair
                // and one random other slot
                priorityCandidates.push(move.after.a);
                // which is not the other slot we just tried
                nonCandidates.push(move.after.b);
            }
        }
        var a, b, allGood = false;
        do {
            // select next pair
            var randomCandidates = [];
            for (var i = 0, len = this.puzzle.getSlotCount(); i < len; i++) {
                var slot = this.board.getSlot(i);
                if ("YES" != slot.deduction && priorityCandidates[0] != slot) {
                    randomCandidates.push(slot);
                }
            }
            var candidates = _.difference((randomCandidates).concat(priorityCandidates), nonCandidates);
            if (candidates.length < 2) {
                Log.out("Only one unknown remains yet puzzle isn't solved? Impossible!");
                console.log(candidates);
                return;
            }
            Log.out("--");
            var format = function (a) {
                return _.map(a, function (slot) { return slot.quantity + " " + slot.deduction; }).join(", ");
            };
            Log.out("priorityCandidates: " + format(priorityCandidates));
            Log.out("randomCandidates: " + format(randomCandidates));
            Log.out("nonCandidates: " + format(nonCandidates));
            Log.out("candidates: " + format(candidates));
            // if any of these candidates have ever returned N before
            // while in the positions we're about to swap into
            // don't try it again
            a = candidates.pop();
            b = candidates.pop();
            if (this.board.hadDeductionAtIndex(a.quantity, b.index, "NO")) {
                nonCandidates.push(a);
            }
            else if (this.board.hadDeductionAtIndex(b.quantity, a.index, "NO")) {
                nonCandidates.push(b);
            }
            else if (this.board.alreadyTried(a.quantity, b.index, b.quantity, a.index)) {
                b = candidates.pop();
            }
            else {
                allGood = true;
            }
        } while (!allGood);
        this.board.swap(a.index, b.index);
        this.lastCorrect = correct;
        setTimeout(function () { return _this.testGuess(); }, GUESS_DELAY);
    };
    return Solver;
}());
var Slot = (function () {
    function Slot() {
    }
    Slot.prototype.setDeduction = function (deduction) {
        this.deduction = deduction;
        Log.out("          " + this.quantity + " " + this.deduction[0] + " => " + deduction[0] + (deduction == "YES" ? " FOUND" : ""));
    };
    Slot.prototype.toString = function () {
        return this.quantity;
    };
    return Slot;
}());
var Pair = (function () {
    function Pair() {
    }
    Pair.prototype.matchesDeductions = function (a, b) {
        return this.a.deduction == a && this.b.deduction == b;
    };
    return Pair;
}());
var Move = (function () {
    function Move() {
    }
    return Move;
}());
var Board = (function () {
    function Board(quantities) {
        this.board = [];
        this.history = []; // history of moves
        for (var i = 0, len = quantities.length; i < len; i++) {
            var slot = new Slot();
            slot.index = i;
            slot.quantity = quantities[i];
            slot.deduction = "UNKNOWN";
            this.board.push(slot);
        }
    }
    Board.prototype.swap = function (aIndex, bIndex) {
        // record before
        var a = this.board[aIndex];
        var b = this.board[bIndex];
        Log.out("          " + a.quantity + " <> " + b.quantity);
        var move = new Move();
        move.before = new Pair();
        move.before.a = new Slot();
        move.before.a.index = a.index;
        move.before.a.quantity = a.quantity;
        move.before.a.deduction = a.deduction;
        move.before.b = new Slot();
        move.before.b.index = b.index;
        move.before.b.quantity = b.quantity;
        move.before.b.deduction = b.deduction;
        // move
        // note: copy-on-write
        var aa = new Slot();
        aa.index = b.index;
        aa.quantity = a.quantity;
        aa.deduction = a.deduction;
        var bb = new Slot();
        bb.index = a.index;
        bb.quantity = b.quantity;
        bb.deduction = b.deduction;
        this.board[aIndex] = bb;
        this.board[bIndex] = aa;
        // record after
        move.after = new Pair();
        move.after.a = this.board[aIndex];
        move.after.b = this.board[bIndex];
        this.history.push(move);
    };
    // determine whether a quantity has ever had a given deduction at a specific index in entire history
    Board.prototype.hadDeductionAtIndex = function (quantity, index, deduction) {
        for (var i = 0, len = this.history.length; i < len; i++) {
            var pair = this.history[i].after;
            if ((pair.a.quantity == quantity &&
                pair.a.deduction == deduction &&
                pair.a.index == index) ||
                (pair.b.quantity == quantity &&
                    pair.b.deduction == deduction &&
                    pair.b.index == index)) {
                Log.out(quantity + " index " + index + " deduction " + deduction[0] + " happened before at move " + i);
                return true;
            }
        }
        return false;
    };
    Board.prototype.alreadyTried = function (q1, i1, q2, i2) {
        for (var i = 0, len = this.history.length; i < len; i++) {
            var pair = this.history[i].after;
            if ((pair.a.quantity == q1 &&
                pair.a.index == i1) ||
                (pair.b.quantity == q2 &&
                    pair.b.index == i2)) {
                Log.out(q1 + ":" + i1 + "," + q2 + ":" + i2 + " happened before at move " + i);
                return true;
            }
        }
        return false;
    };
    Board.prototype.setRemainderDeduction = function (a, b, c) {
        var previous = this.getMove(-1);
        if (previous.before.matchesDeductions(a, b)) {
            var slot = this.getSlot(previous.before.a.index);
            slot.setDeduction(c);
        }
    };
    Board.prototype.unswap = function () {
        var lastPair = this.history[this.history.length - 1].after;
        this.swap(lastPair.a.index, lastPair.b.index);
        this.getMove(-1).delta = this.getMove(-2).delta * -1;
        Log.out("        " + this);
    };
    Board.prototype.toString = function () {
        return this.board.join(" ");
    };
    Board.prototype.getMove = function (delta) {
        return this.history[this.history.length + delta];
    };
    Board.prototype.getSlot = function (index) {
        return this.board[index];
    };
    Board.prototype.render = function () {
        for (var i = 0, len = this.board.length; i < len; i++) {
            var slot = this.getSlot(i);
            $("td#c" + i).text(slot.quantity + " " + slot.deduction[0]);
        }
    };
    return Board;
}());
var GUESS_DELAY = 50; // ms
var MAX_GUESSES = 99;
var SLOT_COUNT = 6;
//let puzzle = PuzzleDemo.random(SLOT_COUNT);
//let puzzle = new PuzzleDemo([2, 3, 4, 1, 6, 5]);
var puzzle = new PuzzleDemo([2, 4, 6, 1, 5, 3]);
//let puzzle = new PuzzleDemo([2, 1, 5, 6, 3, 4]);
// TODO: try a puzzle where numbers can repeat
//let human = new HumanPuzzleInterface(SLOT_COUNT);
Solver.solve(puzzle);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWV0aGV1cy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIm1ldGhldXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsOERBQThEO0FBQzlELDhEQUE4RDtBQUU5RDtJQUFBO0lBTUEsQ0FBQztJQUpjLE9BQUcsR0FBakIsVUFBa0IsR0FBVztRQUM1QixJQUFJLENBQUMsS0FBSyxJQUFPLEdBQUcsT0FBSSxDQUFDO1FBQ3pCLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQzVCLENBQUM7SUFDRixVQUFDO0FBQUQsQ0FBQyxBQU5EO0FBQ2dCLFNBQUssR0FBRyxFQUFFLENBQUM7QUFZM0I7SUFHQyxvQkFBbUIsUUFBa0I7UUFGN0IsYUFBUSxHQUFhLEVBQUUsQ0FBQztRQUcvQixJQUFJLENBQUMsUUFBUSxHQUFHLFFBQVEsQ0FBQztRQUN6QixHQUFHLENBQUMsR0FBRyxDQUFDLGFBQVcsUUFBUSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUcsQ0FBQyxDQUFDO0lBQzFDLENBQUM7SUFFYSxpQkFBTSxHQUFwQixVQUFxQixNQUFjO1FBQ2xDLE1BQU0sQ0FBQyxJQUFJLFVBQVUsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQ3BDLElBQUksS0FBSyxDQUFDLE1BQU0sQ0FBQyxFQUFFLFVBQVUsQ0FBQyxFQUFFLENBQUMsSUFBSSxNQUFNLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUMxRCxDQUFDO0lBRU0saUNBQVksR0FBbkI7UUFDQyxNQUFNLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUM7SUFDN0IsQ0FBQztJQUVNLHlCQUFJLEdBQVgsVUFBWSxLQUFZO1FBQ3ZCLElBQUksT0FBTyxHQUFHLENBQUMsQ0FBQztRQUNoQixHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxD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LElBQU0sV0FBVyxHQUFHLEVBQUUsQ0FBQztBQUN2QixJQUFNLFVBQVUsR0FBRyxDQUFDLENBQUM7QUFDckIsNkNBQTZDO0FBQzdDLGtEQUFrRDtBQUNsRCxJQUFJLE1BQU0sR0FBRyxJQUFJLFVBQVUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNoRCxrREFBa0Q7QUFDbEQsOENBQThDO0FBQzlDLG1EQUFtRDtBQUNuRCxNQUFNLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIm5vZGVfbW9kdWxlcy9AdHlwZXMvanF1ZXJ5L2luZGV4LmQudHNcIiAvPlxyXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwibm9kZV9tb2R1bGVzL0B0eXBlcy9sb2Rhc2gvaW5kZXguZC50c1wiIC8+XHJcblxyXG5jbGFzcyBMb2cge1xyXG5cdHByaXZhdGUgc3RhdGljIHN0YXRlID0gXCJcIjtcclxuXHRwdWJsaWMgc3RhdGljIG91dChtc2c6IHN0cmluZyk6IHZvaWQge1xyXG5cdFx0dGhpcy5zdGF0ZSArPSBgJHttc2d9XFxuYDtcclxuXHRcdCQoXCIjcHJlXCIpLnRleHQodGhpcy5zdGF0ZSk7XHJcblx0fVxyXG59XHJcblxyXG5pbnRlcmZhY2UgUHV6emxlIHtcclxuXHR0ZXN0KGJvYXJkOiBCb2FyZCk6IG51bWJlcjtcclxuXHRnZXRTbG90Q291bnQoKTogbnVtYmVyO1xyXG59XHJcblxyXG5jbGFzcyBQdXp6bGVEZW1vIGltcGxlbWVudHMgUHV6emxlIHtcclxuXHRwcml2YXRlIHNvbHV0aW9uOiBudW1iZXJbXSA9IFtdO1xyXG5cclxuXHRwdWJsaWMgY29uc3RydWN0b3Ioc29sdXRpb246IG51bWJlcltdKSB7XHJcblx0XHR0aGlzLnNvbHV0aW9uID0gc29sdXRpb247XHJcblx0XHRMb2cub3V0KGBQdXp6bGU6ICR7c29sdXRpb24uam9pbihcIiBcIil9YCk7XHJcblx0fVxyXG5cclxuXHRwdWJsaWMgc3RhdGljIHJhbmRvbShsZW5ndGg6IG51bWJlcik6IFB1enpsZSB7XHJcblx0XHRyZXR1cm4gbmV3IFB1enpsZURlbW8oXy5zaHVmZmxlKF8ubWFwKFxyXG5cdFx0XHRuZXcgQXJyYXkobGVuZ3RoKSwgZnVuY3Rpb24gKHYsIGspIHsgcmV0dXJuIGsgKyAxOyB9KSkpO1xyXG5cdH1cclxuXHJcblx0cHVibGljIGdldFNsb3RDb3VudCgpOiBudW1iZXIge1xyXG5cdFx0cmV0dXJuIHRoaXMuc29sdXRpb24ubGVuZ3RoO1xyXG5cdH1cclxuXHJcblx0cHVibGljIHRlc3QoYm9hcmQ6IEJvYXJkKTogbnVtYmVyIHtcclxuXHRcdGxldCBjb3JyZWN0ID0gMDtcclxuXHRcdGZvciAobGV0IGkgPSAwLCBsZW4gPSB0aGlzLnNvbHV0aW9uLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XHJcblx0XHRcdGlmIChib2FyZC5nZXRTbG90KGkpLnF1YW50aXR5ID09IHRoaXMuc29sdXRpb25baV0pIHtcclxuXHRcdFx0XHRjb3JyZWN0Kys7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHRcdHJldHVybiBjb3JyZWN0O1xyXG5cdH1cclxufVxyXG5cclxuY2xhc3MgSHVtYW5QdXp6bGVJbnRlcmZhY2UgaW1wbGVtZW50cyBQdXp6bGUge1xyXG5cdHByaXZhdGUgc2xvdENvdW50OiBudW1iZXI7XHJcblxyXG5cdHB1YmxpYyBjb25zdHJ1Y3RvcihzbG90Q291bnQ6IG51bWJlcikge1xyXG5cdFx0dGhpcy5zbG90Q291bnQ7XHJcblx0fVxyXG5cclxuXHRwdWJsaWMgZ2V0U2xvdENvdW50KCk6IG51bWJlciB7XHJcblx0XHRyZXR1cm4gdGhpcy5zbG90Q291bnQ7XHJcblx0fVxyXG5cclxuXHRwdWJsaWMgdGVzdChib2FyZDogQm9hcmQpOiBudW1iZXIge1xyXG5cdFx0bGV0IGFuc3dlcjtcclxuXHRcdGRvIHtcclxuXHRcdFx0YW5zd2VyID0gcGFyc2VJbnQocHJvbXB0KFxyXG5cdFx0XHRcdGBQbGVhc2UgdHJ5OlxcblxcdCR7Ym9hcmR9XFxuXFxuSG93IG1hbnkgYXJlIGNvcnJlY3Q/YCksIDEwKTtcclxuXHRcdH1cclxuXHRcdHdoaWxlICghaXNOYU4oYW5zd2VyKSk7XHJcblx0XHRyZXR1cm4gYW5zd2VyO1xyXG5cdH1cclxufVxyXG5cclxuY2xhc3MgU29sdmVyIHtcclxuXHRwcml2YXRlIHB1enpsZTogUHV6emxlO1xyXG5cdHByaXZhdGUgYm9hcmQ6IEJvYXJkO1xyXG5cdHByaXZhdGUgbGFzdENvcnJlY3Q6IG51bWJlcjtcclxuXHJcblx0cHVibGljIGNvbnN0cnVjdG9yKHB1enpsZTogUHV6emxlKSB7XHJcblx0XHR0aGlzLnB1enpsZSA9IHB1enpsZTtcclxuXHJcblx0XHQvLyBmaXJzdCBndWVzc1xyXG5cdFx0dGhpcy5ib2FyZCA9IG5ldyBCb2FyZChfLm1hcChuZXcgQXJyYXkodGhpcy5wdXp6bGUuZ2V0U2xvdENvdW50KCkpLFxyXG5cdFx0XHRmdW5jdGlvbiAodiwgaykgeyByZXR1cm4gayArIDE7IH0pKTtcclxuXHJcblx0XHQvLyBiZWdpblxyXG5cdFx0dGhpcy50ZXN0R3Vlc3MoKTtcclxuXHR9XHJcblxyXG5cdHB1YmxpYyBzdGF0aWMgc29sdmUocHV6emxlOiBQdXp6bGUpIHtcclxuXHRcdHJldHVybiBuZXcgU29sdmVyKHB1enpsZSk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGd1ZXNzZXMgPSAwO1xyXG5cdHB1YmxpYyB0ZXN0R3Vlc3MoKSB7XHJcblx0XHR0aGlzLmd1ZXNzZXMrKztcclxuXHRcdGlmICh0aGlzLmd1ZXNzZXMgPiBNQVhfR1VFU1NFUykge1xyXG5cdFx0XHRMb2cub3V0KFwiVG9vIG1hbnkgZ3Vlc3Nlczsgd2UgbG9zZS5cIik7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHRcdGxldCBjb3JyZWN0ID0gdGhpcy5wdXp6bGUudGVzdCh0aGlzLmJvYXJkKTtcclxuXHRcdGxldCBkZWx0YSA9IGNvcnJlY3QgLSB0aGlzLmxhc3RDb3JyZWN0IHx8IDA7XHJcblx0XHRMb2cub3V0KGAke2NvcnJlY3R9ICgke2RlbHRhIDwgMCA/IGRlbHRhIDogYCske2RlbHRhfWB9KSAgJHt0aGlzLmJvYXJkfWApO1xyXG5cdFx0dGhpcy5ib2FyZC5yZW5kZXIoKTtcclxuXHRcdGlmIChjb3JyZWN0ID09IHRoaXMucHV6emxlLmdldFNsb3RDb3VudCgpKSB7XHJcblx0XHRcdExvZy5vdXQoYFlvdSB3aW4gaW4gJHt0aGlzLmd1ZXNzZXN9IGd1ZXNzZXMuYCk7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHJcblx0XHQvLyB0cnkgYWdhaW5cclxuXHRcdGxldCBtb3ZlID0gdGhpcy5ib2FyZC5nZXRNb3ZlKC0xKTtcclxuXHRcdGxldCB0d29Nb3Zlc0FnbyA9IHRoaXMuYm9hcmQuZ2V0TW92ZSgtMik7XHJcblx0XHRsZXQgcHJpb3JpdHlDYW5kaWRhdGVzID0gW107XHJcblx0XHRsZXQgbm9uQ2FuZGlkYXRlcyA9IFtdO1xyXG5cdFx0aWYgKG51bGwgIT0gbW92ZSkge1xyXG5cdFx0XHRtb3ZlLmRlbHRhID0gZGVsdGE7XHJcblx0XHRcdGlmIChkZWx0YSA9PSAwKSB7XHJcblx0XHRcdFx0Ly8gbm8gZGlmZmVyZW5jZTsgYm90aCBtdXN0IGJlIE5PP1xyXG5cdFx0XHRcdG1vdmUuYWZ0ZXIuYS5zZXREZWR1Y3Rpb24oXCJOT1wiKTtcclxuXHRcdFx0XHRtb3ZlLmFmdGVyLmIuc2V0RGVkdWN0aW9uKFwiTk9cIik7XHJcblxyXG5cdFx0XHRcdGlmICggLy8gaWYgdHdvIG1vdmVzIGFnbyB3ZSBnYWluZWQgb25lXHJcblx0XHRcdFx0XHQobnVsbCAhPSB0d29Nb3Zlc0FnbyAmJiB0d29Nb3Zlc0Fnby5kZWx0YSA9PSAxICYmXHJcblx0XHRcdFx0XHRcdC8vIGFuZCBpdCB3YXMgTSxNXHJcblx0XHRcdFx0XHRcdHR3b01vdmVzQWdvLmFmdGVyLmEuZGVkdWN0aW9uID09IFwiTUFZQkVcIiAmJlxyXG5cdFx0XHRcdFx0XHR0d29Nb3Zlc0Fnby5hZnRlci5iLmRlZHVjdGlvbiA9PSBcIk1BWUJFXCIpXHJcblx0XHRcdFx0KSB7XHJcblx0XHRcdFx0XHRMb2cub3V0KFwiZXhwZXJpbWVudGFsIDJcIik7XHJcblx0XHRcdFx0XHQvLyB0aGVuIHRoZSBzbG90IHRoYXQgd2UgbW92ZWQgbGFzdFxyXG5cdFx0XHRcdFx0Ly8gd2hpY2ggd2FzIHBhcnQgb2YgdGhlIHBhaXIgdHdvIG1vdmVzIGFnb1xyXG5cdFx0XHRcdFx0Ly8gbXVzdCBiZSBZXHJcblx0XHRcdFx0XHQvLyBhbmQgdGhlIG90aGVyIE5cclxuXHRcdFx0XHRcdGlmIChcclxuXHRcdFx0XHRcdFx0KG1vdmUuYWZ0ZXIuYS5xdWFudGl0eSA9PSB0d29Nb3Zlc0Fnby5hZnRlci5hLnF1YW50aXR5KSB8fFxyXG5cdFx0XHRcdFx0XHQobW92ZS5hZnRlci5iLnF1YW50aXR5ID09IHR3b01vdmVzQWdvLmFmdGVyLmEucXVhbnRpdHkpXHJcblx0XHRcdFx0XHQpIHtcclxuXHRcdFx0XHRcdFx0dGhpcy5ib2FyZC5nZXRTbG90KHR3b01vdmVzQWdvLmFmdGVyLmIuaW5kZXgpLnNldERlZHVjdGlvbihcIllFU1wiKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdGVsc2Uge1xyXG5cdFx0XHRcdFx0XHR0aGlzLmJvYXJkLmdldFNsb3QodHdvTW92ZXNBZ28uYWZ0ZXIuYS5pbmRleCkuc2V0RGVkdWN0aW9uKFwiWUVTXCIpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0XHRlbHNlIGlmIChkZWx0YSA9PSAxKSB7XHJcblx0XHRcdFx0Ly8gLy8gaWYgZWl0aGVyIG9mIHRoZXNlIE1BWUJFcyBoYXMgZXZlciBiZWVuIE5PIGJlZm9yZSwgdGhlbiB0aGUgb3RoZXIgaXMgWUVTIG5vd1xyXG5cdFx0XHRcdC8vIGlmICh0aGlzLmJvYXJkLmhhZERlZHVjdGlvbkF0SW5kZXgobW92ZS5hZnRlci5hLCBcIk5PXCIpKSB7XHJcblx0XHRcdFx0Ly8gXHR0aGlzLmJvYXJkLmdldFNsb3QobW92ZS5hZnRlci5hLmluZGV4KS5zZXREZWR1Y3Rpb24oXCJZRVNcIik7XHJcblx0XHRcdFx0Ly8gXHR0aGlzLmJvYXJkLmdldFNsb3QobW92ZS5hZnRlci5iLmluZGV4KS5zZXREZWR1Y3Rpb24oXCJOT1wiKTtcclxuXHRcdFx0XHQvLyB9XHJcblx0XHRcdFx0Ly8gZWxzZSBpZiAodGhpcy5ib2FyZC5oYWREZWR1Y3Rpb25BdEluZGV4KG1vdmUuYWZ0ZXIuYiwgXCJOT1wiKSkge1xyXG5cdFx0XHRcdC8vIFx0dGhpcy5ib2FyZC5nZXRTbG90KG1vdmUuYWZ0ZXIuYi5pbmRleCkuc2V0RGVkdWN0aW9uKFwiWUVTXCIpO1xyXG5cdFx0XHRcdC8vIFx0dGhpcy5ib2FyZC5nZXRTbG90KG1vdmUuYWZ0ZXIuYS5pbmRleCkuc2V0RGVkdWN0aW9uKFwiTk9cIik7XHJcblx0XHRcdFx0Ly8gfVxyXG5cdFx0XHRcdC8vIGVsc2Uge1xyXG5cdFx0XHRcdC8vIGRpZmZlcmVuY2U7IG9uZSBpcyBub3cgcmlnaHQsIGJ1dCB3ZSBkb24ndCBrbm93IHdoaWNoXHJcblx0XHRcdFx0Ly8gdW5sZXNzIHdlIGhhdmUgaGlzdG9yeSB0byBuYXJyb3cgaXQsIHRoZW4gd2UgaGF2ZSBzcGVjaWZpYyBtYXRjaFxyXG5cclxuXHJcblx0XHRcdFx0Ly8gbm93IGRlY2lkZSB3aGF0IHRvIGRvIHdpdGggdGhpcyBpbmZvcm1hdGlvblxyXG5cdFx0XHRcdC8vaWYgKCAvLyBpZiB0d28gbW92ZXMgYWdvIHdlIGdhaW5lZCBvbmVcclxuXHRcdFx0XHQvL1x0KG51bGwgIT0gdHdvTW92ZXNBZ28gJiYgdHdvTW92ZXNBZ28uZGVsdGEgPT0gMSAmJlxyXG5cdFx0XHRcdC8vXHRcdC8vIGFuZCBpdCB3YXMgTSxNXHJcblx0XHRcdFx0Ly9cdFx0dHdvTW92ZXNBZ28uYWZ0ZXIuYS5kZWR1Y3Rpb24gPT0gXCJNQVlCRVwiICYmXHJcblx0XHRcdFx0Ly9cdFx0dHdvTW92ZXNBZ28uYWZ0ZXIuYi5kZWR1Y3Rpb24gPT0gXCJNQVlCRVwiKVxyXG5cdFx0XHRcdC8vKSB7XHJcblx0XHRcdFx0Ly9cdExvZy5vdXQoXCJleHBlcmltZW50YWwgM1wiKTtcclxuXHRcdFx0XHQvL1xyXG5cdFx0XHRcdC8vXHRpZiAoXHJcblx0XHRcdFx0Ly9cdFx0KG1vdmUuYWZ0ZXIuYS5xdWFudGl0eSA9PSB0d29Nb3Zlc0Fnby5hZnRlci5hLnF1YW50aXR5KVx0fHxcclxuXHRcdFx0XHQvL1x0XHQobW92ZS5hZnRlci5hLnF1YW50aXR5ID09IHR3b01vdmVzQWdvLmFmdGVyLmIucXVhbnRpdHkpXHJcblx0XHRcdFx0Ly9cdCkge1xyXG5cdFx0XHRcdC8vXHRcdG1vdmUuYWZ0ZXIuYS5zZXREZWR1Y3Rpb24oXCJZRVNcIik7XHJcblx0XHRcdFx0Ly9cdFx0bW92ZS5hZnRlci5iLnNldERlZHVjdGlvbihcIk1BWUJFXCIpO1xyXG5cdFx0XHRcdC8vXHR9XHJcblx0XHRcdFx0Ly9cdGVsc2Uge1xyXG5cdFx0XHRcdC8vXHRcdG1vdmUuYWZ0ZXIuYS5zZXREZWR1Y3Rpb24oXCJNQVlCRVwiKTtcclxuXHRcdFx0XHQvL1x0XHRtb3ZlLmFmdGVyLmIuc2V0RGVkdWN0aW9uKFwiWUVTXCIpO1xyXG5cdFx0XHRcdC8vXHR9XHJcblx0XHRcdFx0Ly99XHJcblx0XHRcdFx0Ly9lbHNlIHtcclxuXHRcdFx0XHRtb3ZlLmFmdGVyLmEuc2V0RGVkdWN0aW9uKFwiTUFZQkVcIik7XHJcblx0XHRcdFx0bW92ZS5hZnRlci5iLnNldERlZHVjdGlvbihcIk1BWUJFXCIpO1xyXG5cdFx0XHRcdC8vfVxyXG5cdFx0XHR9XHJcblx0XHRcdGVsc2UgaWYgKGRlbHRhID09IDIpIHtcclxuXHRcdFx0XHQvLyB2ZXJ5IHBvc2l0aXZlIGRpZmZlcmVuY2U7IGJvdGggYXJlIG5vdyByaWdodCBmb3Igc3VyZVxyXG5cdFx0XHRcdG1vdmUuYWZ0ZXIuYS5zZXREZWR1Y3Rpb24oXCJZRVNcIik7XHJcblx0XHRcdFx0bW92ZS5hZnRlci5iLnNldERlZHVjdGlvbihcIllFU1wiKTtcclxuXHJcblx0XHRcdFx0Ly8gaWYgbGFzdCB0d28gd2VyZSBhbHNvIG1heWJlcywgdGhlbiB0aGUgdGhpcmQgaXMgWUVTXHJcblx0XHRcdH1cclxuXHRcdFx0ZWxzZSBpZiAoZGVsdGEgPT0gLTEpIHtcclxuXHRcdFx0XHQvLyBkaWZmZXJlbmNlOyBvbmUgd2FzIHJpZ2h0LCBidXQgd2UgZG9uJ3Qga25vdyB3aGljaFxyXG5cdFx0XHRcdC8vIHNvIGZpcnN0IHN0ZXAgaXMgYWx3YXlzIHRvIHB1dCBpdCBiYWNrXHJcblx0XHRcdFx0dGhpcy5ib2FyZC51bnN3YXAoKTtcclxuXHRcdFx0XHRjb3JyZWN0ID0gdGhpcy5sYXN0Q29ycmVjdDtcclxuXHRcdFx0XHRtb3ZlID0gdGhpcy5ib2FyZC5nZXRNb3ZlKC0xKTtcclxuXHRcdFx0XHR0d29Nb3Zlc0FnbyA9IHRoaXMuYm9hcmQuZ2V0TW92ZSgtMik7XHJcblx0XHRcdFx0bGV0IHRocmVlTW92ZXNBZ28gPSB0aGlzLmJvYXJkLmdldE1vdmUoLTMpO1xyXG5cclxuXHRcdFx0XHQvLyBub3cgZGVjaWRlIHdoYXQgdG8gZG8gd2l0aCB0aGlzIGluZm9ybWF0aW9uXHJcblx0XHRcdFx0Ly9pZiAoIC8vIGlmIHR3byBtb3ZlcyBhZ28gd2UgZ2FpbmVkIG9uZVxyXG5cdFx0XHRcdC8vXHQobnVsbCAhPSB0aHJlZU1vdmVzQWdvICYmIHRocmVlTW92ZXNBZ28uZGVsdGEgPT0gMSAmJlxyXG5cdFx0XHRcdC8vXHRcdC8vIGFuZCBpdCB3YXMgTSxNXHJcblx0XHRcdFx0Ly9cdFx0dGhyZWVNb3Zlc0Fnby5hZnRlci5hLmRlZHVjdGlvbiA9PSBcIk1BWUJFXCIgJiZcclxuXHRcdFx0XHQvL1x0XHR0aHJlZU1vdmVzQWdvLmFmdGVyLmIuZGVkdWN0aW9uID09IFwiTUFZQkVcIilcclxuXHRcdFx0XHQvLykge1xyXG5cdFx0XHRcdC8vXHRMb2cub3V0KFwiZXhwZXJpbWVudGFsXCIpO1xyXG5cdFx0XHRcdC8vXHQvLyB0aGVuIHRoZSBzbG90IHRoYXQgd2UgbW92ZWQgbGFzdFxyXG5cdFx0XHRcdC8vXHQvLyB3aGljaCB3YXMgcGFydCBvZiB0aGUgcGFpciB0d28gbW92ZXMgYWdvXHJcblx0XHRcdFx0Ly9cdC8vIG11c3QgYmUgWVxyXG5cdFx0XHRcdC8vXHQvLyBhbmQgdGhlIG90aGVyIE5cclxuXHRcdFx0XHQvL1xyXG5cdFx0XHRcdC8vXHQvLyBub3RlOiBhc3N1bWVzIEEgaXMgdGhlIG9uZSB3ZSBhbHdheXMgY2hvc2UgdG8gcmVzd2FwXHJcblx0XHRcdFx0Ly9cclxuXHRcdFx0XHQvL1x0Ly8gMyBhbmQgNCB3ZXJlIHRoZSBwcmV2aW91cyB0d29cclxuXHRcdFx0XHQvL1x0Ly8gd2Uga2VwdCAzIGFuZCB0cmllZCA2IGJ1dCBsb3N0IG9uZVxyXG5cdFx0XHRcdC8vXHQvLyB0aGVyZWZvcmUgMyAoYmVpbmcgcHJlc2VudCBpbiBub3cgYW5kIHByZXYpIGlzIFlFU1xyXG5cdFx0XHRcdC8vXHQvLyBhbmQgNiBpcyBOT1xyXG5cdFx0XHRcdC8vXHJcblx0XHRcdFx0Ly9cdGlmIChcclxuXHRcdFx0XHQvL1x0XHQobW92ZS5hZnRlci5hLnF1YW50aXR5ID09IHRocmVlTW92ZXNBZ28uYWZ0ZXIuYS5xdWFudGl0eSlcclxuXHRcdFx0XHQvL1x0KSB7XHJcblx0XHRcdFx0Ly9cdFx0bW92ZS5hZnRlci5hLnNldERlZHVjdGlvbihcIllFU1wiKTtcclxuXHRcdFx0XHQvL1x0XHRtb3ZlLmFmdGVyLmIuc2V0RGVkdWN0aW9uKFwiTk9cIik7XHJcblx0XHRcdFx0Ly9cdH1cclxuXHRcdFx0XHQvL1x0ZWxzZSB7XHJcblx0XHRcdFx0Ly9cdFx0bW92ZS5hZnRlci5hLnNldERlZHVjdGlvbihcIk5PXCIpO1xyXG5cdFx0XHRcdC8vXHRcdG1vdmUuYWZ0ZXIuYi5zZXREZWR1Y3Rpb24oXCJZRVNcIik7XHJcblx0XHRcdFx0Ly9cdH1cclxuXHRcdFx0XHQvL31cclxuXHRcdFx0XHQvL2Vsc2Uge1xyXG5cdFx0XHRcdG1vdmUuYWZ0ZXIuYS5zZXREZWR1Y3Rpb24oXCJNQVlCRVwiKTtcclxuXHRcdFx0XHRtb3ZlLmFmdGVyLmIuc2V0RGVkdWN0aW9uKFwiTUFZQkVcIik7XHJcblx0XHRcdFx0Ly99XHJcblxyXG5cclxuXHJcblx0XHRcdFx0Ly8gVFJJQ0tZOiBpZiBzd2FwIE1BWUJFLCBOTyA9IC0xIHRoZW4gUkVWRVJTRSBhbmQgZGVkdWNlIE1BWUJFID0+IFlFU1xyXG5cclxuXHRcdFx0XHQvLyBpZiBwcmV2aW91c2x5IE1BWUJFLCBNQVlCRSwgYnV0IG5vdyAtMSwgdGhlbiBhIGlzIFlFU1xyXG5cdFx0XHRcdC8vaWYgKG1vdmUuYWZ0ZXIuYS5kZWR1Y3Rpb24gPT0gXCJNQVlCRVwiICYmIG1vdmUuYWZ0ZXIuYi5kZWR1Y3Rpb24gPT0gXCJNQVlCRVwiKSB7XHJcblx0XHRcdFx0Ly9cdHRoaXMuYm9hcmQuZ2V0U2xvdChtb3ZlLmFmdGVyLmEuaW5kZXgpXHJcblx0XHRcdFx0Ly99XHJcblxyXG5cclxuXHJcblx0XHRcdFx0Ly90aGlzLmJvYXJkLnNldFJlbWFpbmRlckRlZHVjdGlvbihcIk1BWUJFXCIsIFwiTUFZQkVcIiwgXCJZRVNcIik7XHJcblx0XHRcdH1cclxuXHRcdFx0ZWxzZSBpZiAoZGVsdGEgPT0gLTIpIHtcclxuXHRcdFx0XHQvLyBkaWZmZXJlbmNlOyBib3RoIHdlcmUgcmlnaHQgZm9yIHN1cmVcclxuXHRcdFx0XHR0aGlzLmJvYXJkLnVuc3dhcCgpO1xyXG5cdFx0XHRcdGNvcnJlY3QgPSB0aGlzLmxhc3RDb3JyZWN0O1xyXG5cdFx0XHRcdG1vdmUgPSB0aGlzLmJvYXJkLmdldE1vdmUoLTEpO1xyXG5cdFx0XHRcdHR3b01vdmVzQWdvID0gdGhpcy5ib2FyZC5nZXRNb3ZlKC0yKTtcclxuXHRcdFx0XHRtb3ZlLmFmdGVyLmEuc2V0RGVkdWN0aW9uKFwiWUVTXCIpO1xyXG5cdFx0XHRcdG1vdmUuYWZ0ZXIuYi5zZXREZWR1Y3Rpb24oXCJZRVNcIik7XHJcblxyXG5cdFx0XHRcdC8vIGlmIGxhc3QgdHdvIHdlcmUgYWxzbyBtYXliZXMsIHRoZW4gdGhlIHRoaXJkIGlzIFlFU1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBNLE0gYW5kIE4sTiBhcmUgZ29vZCB0byBpdGVyYXRlIHdpdGggXHJcblx0XHRcdC8vIHNpbmNlIHlvdSBrbm93IG9uZSBvZiB0aGVtIGlzIGdvaW5nIHRvIGJlIFkgb3IgTiB3aGVuIHJlc29sdmVkXHJcblx0XHRcdGlmIChcclxuXHRcdFx0XHQobW92ZS5hZnRlci5hLmRlZHVjdGlvbiA9PSBcIk1BWUJFXCIgJiYgbW92ZS5hZnRlci5iLmRlZHVjdGlvbiA9PSBcIk1BWUJFXCIpIHx8XHJcblx0XHRcdFx0KG1vdmUuYWZ0ZXIuYS5kZWR1Y3Rpb24gPT0gXCJOT1wiICYmIG1vdmUuYWZ0ZXIuYi5kZWR1Y3Rpb24gPT0gXCJOT1wiKVxyXG5cdFx0XHQpIHtcclxuXHRcdFx0XHQvLyBlbnN1cmUgbmV4dCBzd2FwIGNvbnRhaW5zIG9uZSBzbG90IGZyb20gdGhpcyBsYXN0IHBhaXJcclxuXHRcdFx0XHQvLyBhbmQgb25lIHJhbmRvbSBvdGhlciBzbG90XHJcblx0XHRcdFx0cHJpb3JpdHlDYW5kaWRhdGVzLnB1c2gobW92ZS5hZnRlci5hKTtcclxuXHRcdFx0XHQvLyB3aGljaCBpcyBub3QgdGhlIG90aGVyIHNsb3Qgd2UganVzdCB0cmllZFxyXG5cdFx0XHRcdG5vbkNhbmRpZGF0ZXMucHVzaChtb3ZlLmFmdGVyLmIpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0bGV0IGEsIGIsIGFsbEdvb2QgPSBmYWxzZTtcclxuXHRcdGRvIHtcclxuXHRcdFx0Ly8gc2VsZWN0IG5leHQgcGFpclxyXG5cdFx0XHRsZXQgcmFuZG9tQ2FuZGlkYXRlczogU2xvdFtdID0gW107XHJcblx0XHRcdGZvciAobGV0IGkgPSAwLCBsZW4gPSB0aGlzLnB1enpsZS5nZXRTbG90Q291bnQoKTsgaSA8IGxlbjsgaSsrKSB7XHJcblx0XHRcdFx0bGV0IHNsb3QgPSB0aGlzLmJvYXJkLmdldFNsb3QoaSk7XHJcblx0XHRcdFx0aWYgKFwiWUVTXCIgIT0gc2xvdC5kZWR1Y3Rpb24gJiYgcHJpb3JpdHlDYW5kaWRhdGVzWzBdICE9IHNsb3QpIHtcclxuXHRcdFx0XHRcdHJhbmRvbUNhbmRpZGF0ZXMucHVzaChzbG90KTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdFx0bGV0IGNhbmRpZGF0ZXMgPSBfLmRpZmZlcmVuY2UoKHJhbmRvbUNhbmRpZGF0ZXMpLmNvbmNhdChwcmlvcml0eUNhbmRpZGF0ZXMpLCBub25DYW5kaWRhdGVzKTtcclxuXHRcdFx0aWYgKGNhbmRpZGF0ZXMubGVuZ3RoIDwgMikge1xyXG5cdFx0XHRcdExvZy5vdXQoXCJPbmx5IG9uZSB1bmtub3duIHJlbWFpbnMgeWV0IHB1enpsZSBpc24ndCBzb2x2ZWQ/IEltcG9zc2libGUhXCIpO1xyXG5cdFx0XHRcdGNvbnNvbGUubG9nKGNhbmRpZGF0ZXMpO1xyXG5cdFx0XHRcdHJldHVybjtcclxuXHRcdFx0fVxyXG5cdFx0XHRMb2cub3V0KFwiLS1cIik7XHJcblx0XHRcdGxldCBmb3JtYXQgPSAoYTogU2xvdFtdKSA9PlxyXG5cdFx0XHRcdF8ubWFwKGEsIChzbG90KSA9PiBgJHtzbG90LnF1YW50aXR5fSAke3Nsb3QuZGVkdWN0aW9ufWApLmpvaW4oXCIsIFwiKTtcclxuXHRcdFx0TG9nLm91dChcInByaW9yaXR5Q2FuZGlkYXRlczogXCIgKyBmb3JtYXQocHJpb3JpdHlDYW5kaWRhdGVzKSk7XHJcblx0XHRcdExvZy5vdXQoXCJyYW5kb21DYW5kaWRhdGVzOiBcIiArIGZvcm1hdChyYW5kb21DYW5kaWRhdGVzKSk7XHJcblx0XHRcdExvZy5vdXQoXCJub25DYW5kaWRhdGVzOiBcIiArIGZvcm1hdChub25DYW5kaWRhdGVzKSk7XHJcblx0XHRcdExvZy5vdXQoXCJjYW5kaWRhdGVzOiBcIiArIGZvcm1hdChjYW5kaWRhdGVzKSk7XHJcblxyXG5cdFx0XHQvLyBpZiBhbnkgb2YgdGhlc2UgY2FuZGlkYXRlcyBoYXZlIGV2ZXIgcmV0dXJuZWQgTiBiZWZvcmVcclxuXHRcdFx0Ly8gd2hpbGUgaW4gdGhlIHBvc2l0aW9ucyB3ZSdyZSBhYm91dCB0byBzd2FwIGludG9cclxuXHRcdFx0Ly8gZG9uJ3QgdHJ5IGl0IGFnYWluXHJcblxyXG5cdFx0XHRhID0gY2FuZGlkYXRlcy5wb3AoKTtcclxuXHRcdFx0YiA9IGNhbmRpZGF0ZXMucG9wKCk7XHJcblxyXG5cdFx0XHRpZiAodGhpcy5ib2FyZC5oYWREZWR1Y3Rpb25BdEluZGV4KGEucXVhbnRpdHksIGIuaW5kZXgsIFwiTk9cIikpIHtcclxuXHRcdFx0XHRub25DYW5kaWRhdGVzLnB1c2goYSk7XHJcblx0XHRcdH1cclxuXHRcdFx0ZWxzZSBpZiAodGhpcy5ib2FyZC5oYWREZWR1Y3Rpb25BdEluZGV4KGIucXVhbnRpdHksIGEuaW5kZXgsIFwiTk9cIikpIHtcclxuXHRcdFx0XHRub25DYW5kaWRhdGVzLnB1c2goYik7XHJcblx0XHRcdH1cclxuXHRcdFx0ZWxzZSBpZiAodGhpcy5ib2FyZC5hbHJlYWR5VHJpZWQoYS5xdWFudGl0eSwgYi5pbmRleCwgYi5xdWFudGl0eSwgYS5pbmRleCkpIHtcclxuXHRcdFx0XHRiID0gY2FuZGlkYXRlcy5wb3AoKTtcclxuXHRcdFx0fVx0XHRcdFxyXG5cdFx0XHRlbHNlIHtcclxuXHRcdFx0XHRhbGxHb29kID0gdHJ1ZTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdFx0d2hpbGUgKCFhbGxHb29kKTtcclxuXHRcdHRoaXMuYm9hcmQuc3dhcChhLmluZGV4LCBiLmluZGV4KTtcclxuXHJcblx0XHR0aGlzLmxhc3RDb3JyZWN0ID0gY29ycmVjdDtcclxuXHRcdHNldFRpbWVvdXQoKCkgPT4gdGhpcy50ZXN0R3Vlc3MoKSwgR1VFU1NfREVMQVkpO1xyXG5cdH1cclxufVxyXG5cclxuXHJcblxyXG4vLyBoaXN0b3J5OiBNb3ZlOiBQYWlyOiBTbG90XHJcblxyXG50eXBlIERlZHVjdGlvbiA9IFwiVU5LTk9XTlwiIHwgXCJOT1wiIHwgXCJNQVlCRVwiIHwgXCJZRVNcIjtcclxuXHJcbmNsYXNzIFNsb3Qge1xyXG5cdGluZGV4OiBudW1iZXI7XHJcblx0cXVhbnRpdHk6IG51bWJlcjtcclxuXHRkZWR1Y3Rpb246IERlZHVjdGlvbjtcclxuXHJcblx0cHVibGljIHNldERlZHVjdGlvbihkZWR1Y3Rpb246IERlZHVjdGlvbikge1xyXG5cdFx0dGhpcy5kZWR1Y3Rpb24gPSBkZWR1Y3Rpb247XHJcblx0XHRMb2cub3V0KGAgICAgICAgICAgJHt0aGlzLnF1YW50aXR5fSAke3RoaXMuZGVkdWN0aW9uWzBdfSA9PiAke2RlZHVjdGlvblswXX0ke2RlZHVjdGlvbiA9PSBcIllFU1wiID8gXCIgRk9VTkRcIiA6IFwiXCJ9YCk7XHJcblx0fVxyXG5cclxuXHRwdWJsaWMgdG9TdHJpbmcoKSB7XHJcblx0XHRyZXR1cm4gdGhpcy5xdWFudGl0eTtcclxuXHR9XHJcbn1cclxuXHJcbmNsYXNzIFBhaXIge1xyXG5cdHB1YmxpYyBhOiBTbG90O1xyXG5cdHB1YmxpYyBiOiBTbG90O1xyXG5cclxuXHRwdWJsaWMgbWF0Y2hlc0RlZHVjdGlvbnMoYTogRGVkdWN0aW9uLCBiOiBEZWR1Y3Rpb24pOiBib29sZWFuIHtcclxuXHRcdHJldHVybiB0aGlzLmEuZGVkdWN0aW9uID09IGEgJiYgdGhpcy5iLmRlZHVjdGlvbiA9PSBiO1xyXG5cdH1cclxuXHJcbn1cclxuXHJcbmNsYXNzIE1vdmUge1xyXG5cdGJlZm9yZTogUGFpcjtcclxuXHRhZnRlcjogUGFpcjtcclxuXHRkZWx0YTogbnVtYmVyO1xyXG59XHJcblxyXG5jbGFzcyBCb2FyZCB7XHJcblx0cHJpdmF0ZSBib2FyZDogU2xvdFtdID0gW107XHJcblx0cHJpdmF0ZSBoaXN0b3J5OiBNb3ZlW10gPSBbXTsgLy8gaGlzdG9yeSBvZiBtb3Zlc1xyXG5cclxuXHRwdWJsaWMgY29uc3RydWN0b3IocXVhbnRpdGllczogbnVtYmVyW10pIHtcclxuXHRcdGZvciAobGV0IGkgPSAwLCBsZW4gPSBxdWFudGl0aWVzLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XHJcblx0XHRcdGxldCBzbG90ID0gbmV3IFNsb3QoKTtcclxuXHRcdFx0c2xvdC5pbmRleCA9IGk7XHJcblx0XHRcdHNsb3QucXVhbnRpdHkgPSBxdWFudGl0aWVzW2ldO1xyXG5cdFx0XHRzbG90LmRlZHVjdGlvbiA9IFwiVU5LTk9XTlwiO1xyXG5cdFx0XHR0aGlzLmJvYXJkLnB1c2goc2xvdCk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRwdWJsaWMgc3dhcChhSW5kZXg6IG51bWJlciwgYkluZGV4OiBudW1iZXIpIHtcclxuXHRcdC8vIHJlY29yZCBiZWZvcmVcclxuXHRcdGxldCBhID0gdGhpcy5ib2FyZFthSW5kZXhdO1xyXG5cdFx0bGV0IGIgPSB0aGlzLmJvYXJkW2JJbmRleF07XHJcblx0XHRMb2cub3V0KGAgICAgICAgICAgJHthLnF1YW50aXR5fSA8PiAke2IucXVhbnRpdHl9YCk7XHJcblx0XHRsZXQgbW92ZSA9IG5ldyBNb3ZlKCk7XHJcblx0XHRtb3ZlLmJlZm9yZSA9IG5ldyBQYWlyKCk7XHJcblx0XHRtb3ZlLmJlZm9yZS5hID0gbmV3IFNsb3QoKTtcclxuXHRcdG1vdmUuYmVmb3JlLmEuaW5kZXggPSBhLmluZGV4O1xyXG5cdFx0bW92ZS5iZWZvcmUuYS5xdWFudGl0eSA9IGEucXVhbnRpdHk7XHJcblx0XHRtb3ZlLmJlZm9yZS5hLmRlZHVjdGlvbiA9IGEuZGVkdWN0aW9uO1xyXG5cdFx0bW92ZS5iZWZvcmUuYiA9IG5ldyBTbG90KCk7XHJcblx0XHRtb3ZlLmJlZm9yZS5iLmluZGV4ID0gYi5pbmRleDtcclxuXHRcdG1vdmUuYmVmb3JlLmIucXVhbnRpdHkgPSBiLnF1YW50aXR5O1xyXG5cdFx0bW92ZS5iZWZvcmUuYi5kZWR1Y3Rpb24gPSBiLmRlZHVjdGlvbjtcclxuXHJcblx0XHQvLyBtb3ZlXHJcblx0XHQvLyBub3RlOiBjb3B5LW9uLXdyaXRlXHJcblx0XHRsZXQgYWEgPSBuZXcgU2xvdCgpO1xyXG5cdFx0YWEuaW5kZXggPSBiLmluZGV4O1xyXG5cdFx0YWEucXVhbnRpdHkgPSBhLnF1YW50aXR5O1xyXG5cdFx0YWEuZGVkdWN0aW9uID0gYS5kZWR1Y3Rpb247XHJcblx0XHRsZXQgYmIgPSBuZXcgU2xvdCgpO1xyXG5cdFx0YmIuaW5kZXggPSBhLmluZGV4O1xyXG5cdFx0YmIucXVhbnRpdHkgPSBiLnF1YW50aXR5O1xyXG5cdFx0YmIuZGVkdWN0aW9uID0gYi5kZWR1Y3Rpb247XHJcblx0XHR0aGlzLmJvYXJkW2FJbmRleF0gPSBiYjtcclxuXHRcdHRoaXMuYm9hcmRbYkluZGV4XSA9IGFhO1xyXG5cclxuXHRcdC8vIHJlY29yZCBhZnRlclxyXG5cdFx0bW92ZS5hZnRlciA9IG5ldyBQYWlyKCk7XHJcblx0XHRtb3ZlLmFmdGVyLmEgPSB0aGlzLmJvYXJkW2FJbmRleF07XHJcblx0XHRtb3ZlLmFmdGVyLmIgPSB0aGlzLmJvYXJkW2JJbmRleF07XHJcblx0XHR0aGlzLmhpc3RvcnkucHVzaChtb3ZlKTtcclxuXHR9XHJcblxyXG5cdC8vIGRldGVybWluZSB3aGV0aGVyIGEgcXVhbnRpdHkgaGFzIGV2ZXIgaGFkIGEgZ2l2ZW4gZGVkdWN0aW9uIGF0IGEgc3BlY2lmaWMgaW5kZXggaW4gZW50aXJlIGhpc3RvcnlcclxuXHRwdWJsaWMgaGFkRGVkdWN0aW9uQXRJbmRleChxdWFudGl0eTogbnVtYmVyLCBpbmRleDogbnVtYmVyLCBkZWR1Y3Rpb246IERlZHVjdGlvbik6IGJvb2xlYW4ge1xyXG5cdFx0Zm9yIChsZXQgaSA9IDAsIGxlbiA9IHRoaXMuaGlzdG9yeS5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xyXG5cdFx0XHRsZXQgcGFpciA9IHRoaXMuaGlzdG9yeVtpXS5hZnRlcjtcclxuXHRcdFx0aWYgKFxyXG5cdFx0XHRcdChwYWlyLmEucXVhbnRpdHkgPT0gcXVhbnRpdHkgJiZcclxuXHRcdFx0XHRcdHBhaXIuYS5kZWR1Y3Rpb24gPT0gZGVkdWN0aW9uICYmXHJcblx0XHRcdFx0XHRwYWlyLmEuaW5kZXggPT0gaW5kZXgpIHx8XHJcblx0XHRcdFx0KHBhaXIuYi5xdWFudGl0eSA9PSBxdWFudGl0eSAmJlxyXG5cdFx0XHRcdFx0cGFpci5iLmRlZHVjdGlvbiA9PSBkZWR1Y3Rpb24gJiZcclxuXHRcdFx0XHRcdHBhaXIuYi5pbmRleCA9PSBpbmRleClcclxuXHRcdFx0KSB7XHJcblx0XHRcdFx0TG9nLm91dChgJHtxdWFudGl0eX0gaW5kZXggJHtpbmRleH0gZGVkdWN0aW9uICR7ZGVkdWN0aW9uWzBdfSBoYXBwZW5lZCBiZWZvcmUgYXQgbW92ZSAke2l9YCk7XHJcblx0XHRcdFx0cmV0dXJuIHRydWU7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHRcdHJldHVybiBmYWxzZTtcclxuXHR9XHJcblxyXG5cdHB1YmxpYyBhbHJlYWR5VHJpZWQocTE6IG51bWJlciwgaTE6IG51bWJlciwgcTI6IG51bWJlciwgaTI6IG51bWJlcik6IGJvb2xlYW4ge1xyXG5cdFx0Zm9yIChsZXQgaSA9IDAsIGxlbiA9IHRoaXMuaGlzdG9yeS5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xyXG5cdFx0XHRsZXQgcGFpciA9IHRoaXMuaGlzdG9yeVtpXS5hZnRlcjtcclxuXHRcdFx0aWYgKFxyXG5cdFx0XHRcdChwYWlyLmEucXVhbnRpdHkgPT0gcTEgJiZcclxuXHRcdFx0XHRcdHBhaXIuYS5pbmRleCA9PSBpMSkgfHxcclxuXHRcdFx0XHQocGFpci5iLnF1YW50aXR5ID09IHEyICYmXHJcblx0XHRcdFx0XHRwYWlyLmIuaW5kZXggPT0gaTIpXHJcblx0XHRcdCkge1xyXG5cdFx0XHRcdExvZy5vdXQoYCR7cTF9OiR7aTF9LCR7cTJ9OiR7aTJ9IGhhcHBlbmVkIGJlZm9yZSBhdCBtb3ZlICR7aX1gKTtcclxuXHRcdFx0XHRyZXR1cm4gdHJ1ZTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdFx0cmV0dXJuIGZhbHNlO1xyXG5cdH1cdFxyXG5cclxuXHRwdWJsaWMgc2V0UmVtYWluZGVyRGVkdWN0aW9uKGE6IERlZHVjdGlvbiwgYjogRGVkdWN0aW9uLCBjOiBEZWR1Y3Rpb24pIHtcclxuXHRcdGxldCBwcmV2aW91cyA9IHRoaXMuZ2V0TW92ZSgtMSk7XHJcblx0XHRpZiAocHJldmlvdXMuYmVmb3JlLm1hdGNoZXNEZWR1Y3Rpb25zKGEsIGIpKSB7XHJcblx0XHRcdGxldCBzbG90ID0gdGhpcy5nZXRTbG90KHByZXZpb3VzLmJlZm9yZS5hLmluZGV4KTtcclxuXHRcdFx0c2xvdC5zZXREZWR1Y3Rpb24oYyk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRwdWJsaWMgdW5zd2FwKCkge1xyXG5cdFx0bGV0IGxhc3RQYWlyID0gdGhpcy5oaXN0b3J5W3RoaXMuaGlzdG9yeS5sZW5ndGggLSAxXS5hZnRlcjtcclxuXHRcdHRoaXMuc3dhcChsYXN0UGFpci5hLmluZGV4LCBsYXN0UGFpci5iLmluZGV4KTtcclxuXHRcdHRoaXMuZ2V0TW92ZSgtMSkuZGVsdGEgPSB0aGlzLmdldE1vdmUoLTIpLmRlbHRhICogLTE7XHJcblx0XHRMb2cub3V0KGAgICAgICAgICR7dGhpc31gKTtcclxuXHR9XHJcblxyXG5cdHB1YmxpYyB0b1N0cmluZygpOiBzdHJpbmcge1xyXG5cdFx0cmV0dXJuIHRoaXMuYm9hcmQuam9pbihcIiBcIik7XHJcblx0fVxyXG5cclxuXHRwdWJsaWMgZ2V0TW92ZShkZWx0YTogbnVtYmVyKSB7XHJcblx0XHRyZXR1cm4gdGhpcy5oaXN0b3J5W3RoaXMuaGlzdG9yeS5sZW5ndGggKyBkZWx0YV07XHJcblx0fVxyXG5cclxuXHRwdWJsaWMgZ2V0U2xvdChpbmRleDogbnVtYmVyKSB7XHJcblx0XHRyZXR1cm4gdGhpcy5ib2FyZFtpbmRleF07XHJcblx0fVxyXG5cclxuXHRwdWJsaWMgcmVuZGVyKCkge1xyXG5cdFx0Zm9yIChsZXQgaSA9IDAsIGxlbiA9IHRoaXMuYm9hcmQubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcclxuXHRcdFx0bGV0IHNsb3QgPSB0aGlzLmdldFNsb3QoaSk7XHJcblx0XHRcdCQoXCJ0ZCNjXCIgKyBpKS50ZXh0KHNsb3QucXVhbnRpdHkgKyBcIiBcIiArIHNsb3QuZGVkdWN0aW9uWzBdKTtcclxuXHRcdH1cclxuXHR9XHJcbn1cclxuXHJcblxyXG5jb25zdCBHVUVTU19ERUxBWSA9IDUwOyAvLyBtc1xyXG5jb25zdCBNQVhfR1VFU1NFUyA9IDk5O1xyXG5jb25zdCBTTE9UX0NPVU5UID0gNjtcclxuLy9sZXQgcHV6emxlID0gUHV6emxlRGVtby5yYW5kb20oU0xPVF9DT1VOVCk7XHJcbi8vbGV0IHB1enpsZSA9IG5ldyBQdXp6bGVEZW1vKFsyLCAzLCA0LCAxLCA2LCA1XSk7XHJcbmxldCBwdXp6bGUgPSBuZXcgUHV6emxlRGVtbyhbMiwgNCwgNiwgMSwgNSwgM10pO1xyXG4vL2xldCBwdXp6bGUgPSBuZXcgUHV6emxlRGVtbyhbMiwgMSwgNSwgNiwgMywgNF0pO1xyXG4vLyBUT0RPOiB0cnkgYSBwdXp6bGUgd2hlcmUgbnVtYmVycyBjYW4gcmVwZWF0XHJcbi8vbGV0IGh1bWFuID0gbmV3IEh1bWFuUHV6emxlSW50ZXJmYWNlKFNMT1RfQ09VTlQpO1xyXG5Tb2x2ZXIuc29sdmUocHV6emxlKTsiXX0=