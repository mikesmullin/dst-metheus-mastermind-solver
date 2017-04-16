/// <reference path="node_modules/@types/jquery/index.d.ts" />
/// <reference path="node_modules/@types/lodash/index.d.ts" />
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
            if (board.slots[i].quantity == this.solution[i]) {
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
var UNKNOWN = "UNKNOWN";
var NO = "NO";
var MAYBE = "MAYBE";
var YES = "YES";
var Move = (function () {
    function Move() {
    }
    Move.prototype.render = function () {
        var s = "";
        for (var i = 0, len = this.board.slots.length; i < len; i++) {
            var slot = this.board.slots[i];
            s += (slot.quantity == this.pair.a.quantity ||
                slot.quantity == this.pair.b.quantity) ?
                "<b>" + slot.quantity + slot.deduction[0] + "</b> "
                :
                    "" + slot.quantity + slot.deduction[0] + " ";
        }
        s += " = " + this.correct + " (" + (this.delta < 0 ? this.delta : "+" + this.delta) + ")";
        Log.html(s);
    };
    return Move;
}());
var Slot = (function () {
    function Slot() {
    }
    Slot.prototype.setDeduction = function (deduction) {
        this.deduction = deduction;
        Log.out("          " + this.quantity + " " + this.deduction[0] + " => " + deduction[0] + (deduction == YES ? " FOUND" : ""));
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
var Board = (function () {
    function Board(slots) {
        this.slots = slots;
    }
    Board.prototype.findAll = function (fn) {
        return _.filter(this.slots, fn);
    };
    Board.prototype.findOne = function (fn) {
        return this.findAll(fn)[0];
    };
    // find the adjacent pair in given two moves
    // adj pair in two moves =
    // if move1 = a,b and move2 = b,c then ajc pair = a
    Board.prototype.setDeduction = function () {
    };
    Board.prototype.render = function () {
        for (var i = 0, len = this.slots.length; i < len; i++) {
            $("td#c" + i).text(this.slots[i].quantity + " " + this.slots[i].deduction[0]);
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
        // first guess
        this.board = new Board(_.map(new Array(this.puzzle.getSlotCount()), function (nil, i) {
            var slot = new Slot();
            slot.index = i;
            slot.quantity = i + 1;
            slot.deduction = UNKNOWN;
            return slot;
        }));
        // begin
        this.testGuess();
    }
    Solver.solve = function (puzzle) {
        return new Solver(puzzle);
    };
    Solver.prototype.testGuess = function () {
        var _this = this;
        if (this.moves > MAX_GUESSES) {
            Log.out("Too many guesses; we lose.");
            return;
        }
        {
            var correct = this.puzzle.test(this.board);
            var delta = correct - (null != this.lastMove ? this.lastMove.correct : 0);
            this.board.render();
            if (null != this.lastMove) {
                this.lastMove.correct = correct;
                this.lastMove.delta = delta;
                this.lastMove.render();
            }
            if (correct == this.puzzle.getSlotCount()) {
                Log.out("You win in " + this.moves + " moves.");
                return;
            }
        }
        // try again
        var priorityCandidates = [];
        var nonCandidates = [];
        if (null != this.lastMove) {
            if (this.lastMove.delta == 0) {
                // no difference; both must be NO?
                this.lastMove.pair.a.setDeduction(NO);
                this.lastMove.pair.b.setDeduction(NO);
                //				if ( // if two moves ago we gained one
                //					null != this.lastMove.prev && this.lastMove.prev.delta == 1 &&
                //					// and it was M,M
                //					this.lastMove.prev.pair.matchesDeductions(MAYBE, MAYBE)
                //				) {
                //					Log.out("experimental 2");
                //					// then the slot that we moved last
                //					// which was part of the pair two moves ago
                //					// must be Y
                //					// and the other N
                //					if (
                //						(this.lastMove.pair.a.quantity == this.lastMove.prev.pair.a.quantity) ||
                //						(this.lastMove.pair.b.quantity == this.lastMove.prev.pair.a.quantity)
                //					) {
                //						this.board.findOne((s) => s.index == this.lastMove.prev.pair.b.index).setDeduction(YES);
                //					}
                //					else {
                //						this.board.findOne((s) => s.index == this.lastMove.prev.pair.a.index).setDeduction(YES);
                //					}
                //				}
            }
            else if (this.lastMove.delta == 1) {
                // // if either of these MAYBEs has ever been NO before, then the other is YES now
                // if (this.board.hadDeductionAtIndex(move.after.a, NO)) {
                // 	this.board.getSlot(move.after.a.index).setDeduction(YES);
                // 	this.board.getSlot(move.after.b.index).setDeduction(NO);
                // }
                // else if (this.board.hadDeductionAtIndex(move.after.b, NO)) {
                // 	this.board.getSlot(move.after.b.index).setDeduction(YES);
                // 	this.board.getSlot(move.after.a.index).setDeduction(NO);
                // }
                // else {
                // difference; one is now right, but we don't know which
                // unless we have history to narrow it, then we have specific match
                // now decide what to do with this information
                //if ( // if two moves ago we gained one
                //	(null != twoMovesAgo && twoMovesAgo.delta == 1 &&
                //		// and it was M,M
                //		twoMovesAgo.after.a.deduction == MAYBE &&
                //		twoMovesAgo.after.b.deduction == MAYBE)
                //) {
                //	Log.out("experimental 3");
                //
                //	if (
                //		(move.after.a.quantity == twoMovesAgo.after.a.quantity)	||
                //		(move.after.a.quantity == twoMovesAgo.after.b.quantity)
                //	) {
                //		move.after.a.setDeduction(YES);
                //		move.after.b.setDeduction(MAYBE);
                //	}
                //	else {
                //		move.after.a.setDeduction(MAYBE);
                //		move.after.b.setDeduction(YES);
                //	}
                //}
                //else {
                this.lastMove.pair.a.setDeduction(MAYBE);
                this.lastMove.pair.b.setDeduction(MAYBE);
                //}
            }
            else if (this.lastMove.delta == 2) {
                // very positive difference; both are now right for sure
                this.lastMove.pair.a.setDeduction(YES);
                this.lastMove.pair.b.setDeduction(YES);
                // if last two were also maybes, then the third is YES
            }
            else if (this.lastMove.delta == -1) {
                // difference; one was right, but we don't know which
                // so first step is always to put it back
                this.unswap();
                // now decide what to do with this information
                //if ( // if two moves ago we gained one
                //	(null != threeMovesAgo && threeMovesAgo.delta == 1 &&
                //		// and it was M,M
                //		threeMovesAgo.after.a.deduction == MAYBE &&
                //		threeMovesAgo.after.b.deduction == MAYBE)
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
                //		move.after.a.setDeduction(YES);
                //		move.after.b.setDeduction(NO);
                //	}
                //	else {
                //		move.after.a.setDeduction(NO);
                //		move.after.b.setDeduction(YES);
                //	}
                //}
                //else {
                this.lastMove.pair.a.setDeduction(MAYBE);
                this.lastMove.pair.b.setDeduction(MAYBE);
                //}
                // TRICKY: if swap MAYBE, NO = -1 then REVERSE and deduce MAYBE => YES
                // if previously MAYBE, MAYBE, but now -1, then a is YES
                //if (move.after.a.deduction == MAYBE && move.after.b.deduction == MAYBE) {
                //	this.board.getSlot(move.after.a.index)
                //}
                //this.board.setRemainderDeduction(MAYBE, MAYBE, YES);
            }
            else if (this.lastMove.delta == -2) {
                // difference; both were right for sure
                this.unswap();
                this.lastMove.pair.a.setDeduction(YES);
                this.lastMove.pair.b.setDeduction(YES);
                // if last two were also maybes, then the third is YES
            }
            // M,M and N,N are good to iterate with 
            // since you know one of them is going to be Y or N when resolved
            if ((this.lastMove.pair.a.deduction == MAYBE && this.lastMove.pair.b.deduction == MAYBE) ||
                (this.lastMove.pair.a.deduction == NO && this.lastMove.pair.b.deduction == NO)) {
                // ensure next swap contains one slot from this last pair
                // and one random other slot
                priorityCandidates.push(this.lastMove.pair.a);
                // which is not the other slot we just tried
                nonCandidates.push(this.lastMove.pair.b);
            }
        }
        var a, b, allGood = false;
        do {
            // select next pair
            var randomCandidates = [];
            for (var i = 0, len = this.puzzle.getSlotCount(); i < len; i++) {
                var slot = this.board.slots[i];
                if (YES != slot.deduction && priorityCandidates[0] != slot) {
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
                return _.map(a, function (slot) { return "" + slot.quantity + slot.deduction[0] + "@" + slot.index; }).join(", ");
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
            if (this.hadDeductionAtIndex(a.quantity, b.index, NO)) {
                nonCandidates.push(a);
            }
            else if (this.hadDeductionAtIndex(b.quantity, a.index, NO)) {
                nonCandidates.push(b);
            }
            else if (this.alreadyTried(a.quantity, b.index, b.quantity, a.index)) {
                b = candidates.pop();
            }
            else {
                allGood = true;
            }
        } while (!allGood);
        this.swap(a.index, b.index);
        setTimeout(function () { return _this.testGuess(); }, GUESS_DELAY);
    };
    Solver.prototype.swap = function (aIndex, bIndex) {
        var move = new Move();
        move.num = ++this.moves;
        var oldA = _.cloneDeep(this.board.slots[aIndex]);
        var oldB = _.cloneDeep(this.board.slots[bIndex]);
        this.board.slots[aIndex] = oldB;
        this.board.slots[aIndex].index = aIndex;
        this.board.slots[bIndex] = oldA;
        this.board.slots[bIndex].index = bIndex;
        move.board = _.cloneDeep(this.board);
        move.pair = new Pair();
        move.pair.a = _.cloneDeep(this.board.slots[aIndex]);
        move.pair.b = _.cloneDeep(this.board.slots[bIndex]);
        move.prev = this.lastMove;
        this.lastMove = move;
        Log.out("          " + move.pair.a.quantity + " <> " + move.pair.b.quantity);
    };
    // determine whether a quantity has ever had a given deduction at a specific index in entire history
    Solver.prototype.hadDeductionAtIndex = function (quantity, index, deduction) {
        while (null != this.lastMove) {
            var pair = this.lastMove.pair;
            if ((pair.a.quantity == quantity &&
                pair.a.deduction == deduction &&
                pair.a.index == index) ||
                (pair.b.quantity == quantity &&
                    pair.b.deduction == deduction &&
                    pair.b.index == index)) {
                Log.out(quantity + " index " + index + " deduction " + deduction[0] + " happened before at move " + this.lastMove.num);
                return true;
            }
            this.lastMove = this.lastMove.prev;
        }
        return false;
    };
    Solver.prototype.alreadyTried = function (q1, i1, q2, i2) {
        while (null != this.lastMove) {
            var pair = this.lastMove.pair;
            if ((pair.a.quantity == q1 &&
                pair.a.index == i1) ||
                (pair.b.quantity == q2 &&
                    pair.b.index == i2)) {
                Log.out(q1 + ":" + i1 + "," + q2 + ":" + i2 + " happened before at move " + this.lastMove.num);
                return true;
            }
            this.lastMove = this.lastMove.prev;
        }
        return false;
    };
    Solver.prototype.unswap = function () {
        this.swap(this.lastMove.pair.a.index, this.lastMove.pair.b.index);
        // assume result is same as before
        this.lastMove.correct = this.lastMove.prev.correct;
        this.lastMove.delta = this.lastMove.prev.delta;
    };
    return Solver;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWV0aGV1cy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIm1ldGhldXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsOERBQThEO0FBQzlELDhEQUE4RDtBQUU5RDtJQUFBO0lBT0EsQ0FBQztJQU5jLE9BQUcsR0FBakIsVUFBa0IsR0FBVztRQUM1QixDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsSUFBSSxDQUFJLEdBQUcsT0FBSSxDQUFDLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQy9DLENBQUM7SUFDYSxRQUFJLEdBQWxCLFVBQW1CLElBQVk7UUFDOUIsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDekMsQ0FBQztJQUNGLFVBQUM7QUFBRCxDQUFDLEFBUEQsSUFPQztBQU9EO0lBR0Msb0JBQW1CLFFBQWtCO1FBRjdCLGFBQVEsR0FBYSxFQUFFLENBQUM7UUFHL0IsSUFBSSxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUM7UUFDekIsR0FBRyxDQUFDLEdBQUcsQ0FBQyxhQUFXLFFBQVEsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFHLENBQUMsQ0FBQztJQUMxQyxDQUFDO0lBRWEsaUJBQU0sR0FBcEIsVUFBcUIsTUFBYztRQUNsQyxNQUFNLENBQUMsSUFBSSxVQUFVLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUNwQyxJQUFJLEtBQUssQ0FBQyxNQUFNLENBQUMsRUFBRSxVQUFVLENBQUMsRUFBRSxDQUFDLElBQUksTUFBTSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDMUQsQ0FBQztJQUVNLGlDQUFZLEdBQW5CO1FBQ0MsTUFBTSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDO0lBQzdCLENBQUM7SUFFTSx5QkFBSSxHQUFYLFVB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RyxDQUFDLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7UUFDakQsSUFBSSxJQUFJLEdBQUcsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO1FBQ2pELElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQztRQUNoQyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxLQUFLLEdBQUcsTUFBTSxDQUFDO1FBQ3hDLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQztRQUNoQyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxLQUFLLEdBQUcsTUFBTSxDQUFDO1FBQ3hDLElBQUksQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDckMsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLElBQUksRUFBRSxDQUFDO1FBQ3ZCLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztRQUNwRCxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7UUFDcEQsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDO1FBQzFCLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDO1FBQ3JCLEdBQUcsQ0FBQyxHQUFHLENBQUMsZUFBYSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxR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QUFHLEVBQUUsQ0FBQztBQUN2QixJQUFNLFVBQVUsR0FBRyxDQUFDLENBQUM7QUFDckIsNkNBQTZDO0FBQzdDLGtEQUFrRDtBQUNsRCxJQUFJLE1BQU0sR0FBRyxJQUFJLFVBQVUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNoRCxrREFBa0Q7QUFDbEQsOENBQThDO0FBQzlDLG1EQUFtRDtBQUNuRCxNQUFNLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIm5vZGVfbW9kdWxlcy9AdHlwZXMvanF1ZXJ5L2luZGV4LmQudHNcIiAvPlxyXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwibm9kZV9tb2R1bGVzL0B0eXBlcy9sb2Rhc2gvaW5kZXguZC50c1wiIC8+XHJcblxyXG5jbGFzcyBMb2cge1xyXG5cdHB1YmxpYyBzdGF0aWMgb3V0KG1zZzogc3RyaW5nKSB7XHJcblx0XHQkKFwiPHByZS8+XCIpLnRleHQoYCR7bXNnfVxcbmApLmFwcGVuZFRvKFwiI2xvZ1wiKTtcclxuXHR9XHJcblx0cHVibGljIHN0YXRpYyBodG1sKGh0bWw6IHN0cmluZykge1xyXG5cdFx0JChcIjxkaXYvPlwiKS5odG1sKGh0bWwpLmFwcGVuZFRvKFwiI2xvZ1wiKTtcclxuXHR9XHJcbn1cclxuXHJcbmludGVyZmFjZSBQdXp6bGUge1xyXG5cdHRlc3QoYm9hcmQ6IEJvYXJkKTogbnVtYmVyO1xyXG5cdGdldFNsb3RDb3VudCgpOiBudW1iZXI7XHJcbn1cclxuXHJcbmNsYXNzIFB1enpsZURlbW8gaW1wbGVtZW50cyBQdXp6bGUge1xyXG5cdHByaXZhdGUgc29sdXRpb246IG51bWJlcltdID0gW107XHJcblxyXG5cdHB1YmxpYyBjb25zdHJ1Y3Rvcihzb2x1dGlvbjogbnVtYmVyW10pIHtcclxuXHRcdHRoaXMuc29sdXRpb24gPSBzb2x1dGlvbjtcclxuXHRcdExvZy5vdXQoYFB1enpsZTogJHtzb2x1dGlvbi5qb2luKFwiIFwiKX1gKTtcclxuXHR9XHJcblxyXG5cdHB1YmxpYyBzdGF0aWMgcmFuZG9tKGxlbmd0aDogbnVtYmVyKTogUHV6emxlIHtcclxuXHRcdHJldHVybiBuZXcgUHV6emxlRGVtbyhfLnNodWZmbGUoXy5tYXAoXHJcblx0XHRcdG5ldyBBcnJheShsZW5ndGgpLCBmdW5jdGlvbiAodiwgaykgeyByZXR1cm4gayArIDE7IH0pKSk7XHJcblx0fVxyXG5cclxuXHRwdWJsaWMgZ2V0U2xvdENvdW50KCk6IG51bWJlciB7XHJcblx0XHRyZXR1cm4gdGhpcy5zb2x1dGlvbi5sZW5ndGg7XHJcblx0fVxyXG5cclxuXHRwdWJsaWMgdGVzdChib2FyZDogQm9hcmQpOiBudW1iZXIge1xyXG5cdFx0bGV0IGNvcnJlY3QgPSAwO1xyXG5cdFx0Zm9yIChsZXQgaSA9IDAsIGxlbiA9IHRoaXMuc29sdXRpb24ubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcclxuXHRcdFx0aWYgKGJvYXJkLnNsb3RzW2ldLnF1YW50aXR5ID09IHRoaXMuc29sdXRpb25baV0pIHtcclxuXHRcdFx0XHRjb3JyZWN0Kys7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHRcdHJldHVybiBjb3JyZWN0O1xyXG5cdH1cclxufVxyXG5cclxuY2xhc3MgSHVtYW5QdXp6bGVJbnRlcmZhY2UgaW1wbGVtZW50cyBQdXp6bGUge1xyXG5cdHByaXZhdGUgc2xvdENvdW50OiBudW1iZXI7XHJcblxyXG5cdHB1YmxpYyBjb25zdHJ1Y3RvcihzbG90Q291bnQ6IG51bWJlcikge1xyXG5cdFx0dGhpcy5zbG90Q291bnQ7XHJcblx0fVxyXG5cclxuXHRwdWJsaWMgZ2V0U2xvdENvdW50KCk6IG51bWJlciB7XHJcblx0XHRyZXR1cm4gdGhpcy5zbG90Q291bnQ7XHJcblx0fVxyXG5cclxuXHRwdWJsaWMgdGVzdChib2FyZDogQm9hcmQpOiBudW1iZXIge1xyXG5cdFx0bGV0IGFuc3dlcjtcclxuXHRcdGRvIHtcclxuXHRcdFx0YW5zd2VyID0gcGFyc2VJbnQocHJvbXB0KFxyXG5cdFx0XHRcdGBQbGVhc2UgdHJ5OlxcblxcdCR7Ym9hcmR9XFxuXFxuSG93IG1hbnkgYXJlIGNvcnJlY3Q/YCksIDEwKTtcclxuXHRcdH1cclxuXHRcdHdoaWxlICghaXNOYU4oYW5zd2VyKSk7XHJcblx0XHRyZXR1cm4gYW5zd2VyO1xyXG5cdH1cclxufVxyXG5cclxudHlwZSBEZWR1Y3Rpb24gPSBcIlVOS05PV05cIiB8IFwiTk9cIiB8IFwiTUFZQkVcIiB8IFwiWUVTXCI7XHJcbmNvbnN0IFVOS05PV04gPSBcIlVOS05PV05cIjtcclxuY29uc3QgTk8gPSBcIk5PXCI7XHJcbmNvbnN0IE1BWUJFID0gXCJNQVlCRVwiO1xyXG5jb25zdCBZRVMgPSBcIllFU1wiO1xyXG5cclxuY2xhc3MgTW92ZSB7XHJcblx0bnVtOiBudW1iZXI7XHJcblx0cHJldjogTW92ZTtcclxuXHRib2FyZDogQm9hcmQ7XHJcblx0cGFpcjogUGFpcjtcclxuXHRjb3JyZWN0OiBudW1iZXI7XHJcblx0ZGVsdGE6IG51bWJlcjtcclxuXHJcblx0cHVibGljIHJlbmRlcigpIHtcclxuXHRcdGxldCBzID0gXCJcIjtcclxuXHRcdGZvciAobGV0IGkgPSAwLCBsZW4gPSB0aGlzLmJvYXJkLnNsb3RzLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XHJcblx0XHRcdGxldCBzbG90ID0gdGhpcy5ib2FyZC5zbG90c1tpXTtcclxuXHRcdFx0cyArPSAoXHJcblx0XHRcdFx0c2xvdC5xdWFudGl0eSA9PSB0aGlzLnBhaXIuYS5xdWFudGl0eSB8fFxyXG5cdFx0XHRcdHNsb3QucXVhbnRpdHkgPT0gdGhpcy5wYWlyLmIucXVhbnRpdHlcclxuXHRcdFx0KSA/XHJcblx0XHRcdFx0YDxiPiR7c2xvdC5xdWFudGl0eX0ke3Nsb3QuZGVkdWN0aW9uWzBdfTwvYj4gYFxyXG5cdFx0XHRcdDpcclxuXHRcdFx0XHRgJHtzbG90LnF1YW50aXR5fSR7c2xvdC5kZWR1Y3Rpb25bMF19IGA7XHJcblx0XHR9XHJcblx0XHRzICs9IGAgPSAke3RoaXMuY29ycmVjdH0gKCR7dGhpcy5kZWx0YSA8IDAgPyB0aGlzLmRlbHRhIDogYCske3RoaXMuZGVsdGF9YH0pYDtcclxuXHRcdExvZy5odG1sKHMpO1xyXG5cdH1cclxufVxyXG5cclxuY2xhc3MgU2xvdCB7XHJcblx0aW5kZXg6IG51bWJlcjtcclxuXHRxdWFudGl0eTogbnVtYmVyO1xyXG5cdGRlZHVjdGlvbjogRGVkdWN0aW9uO1xyXG5cclxuXHRwdWJsaWMgc2V0RGVkdWN0aW9uKGRlZHVjdGlvbjogRGVkdWN0aW9uKSB7XHJcblx0XHR0aGlzLmRlZHVjdGlvbiA9IGRlZHVjdGlvbjtcclxuXHRcdExvZy5vdXQoYCAgICAgICAgICAke3RoaXMucXVhbnRpdHl9ICR7dGhpcy5kZWR1Y3Rpb25bMF19ID0+ICR7ZGVkdWN0aW9uWzBdfSR7ZGVkdWN0aW9uID09IFlFUyA/IFwiIEZPVU5EXCIgOiBcIlwifWApO1xyXG5cdH1cclxuXHJcblx0cHVibGljIHRvU3RyaW5nKCkge1xyXG5cdFx0cmV0dXJuIHRoaXMucXVhbnRpdHk7XHJcblx0fVxyXG59XHJcblxyXG5jbGFzcyBQYWlyIHtcclxuXHRwdWJsaWMgYTogU2xvdDtcclxuXHRwdWJsaWMgYjogU2xvdDtcclxuXHJcblx0cHVibGljIG1hdGNoZXNEZWR1Y3Rpb25zKGE6IERlZHVjdGlvbiwgYjogRGVkdWN0aW9uKTogYm9vbGVhbiB7XHJcblx0XHRyZXR1cm4gdGhpcy5hLmRlZHVjdGlvbiA9PSBhICYmIHRoaXMuYi5kZWR1Y3Rpb24gPT0gYjtcclxuXHR9XHJcbn1cclxuXHJcbmNsYXNzIEJvYXJkIHtcclxuXHRwdWJsaWMgc2xvdHM6IFNsb3RbXTtcclxuXHJcblx0cHVibGljIGNvbnN0cnVjdG9yKHNsb3RzOiBTbG90W10pIHtcclxuXHRcdHRoaXMuc2xvdHMgPSBzbG90cztcclxuXHR9XHJcblxyXG5cdHB1YmxpYyBmaW5kQWxsKGZuKSB7XHJcblx0XHRyZXR1cm4gXy5maWx0ZXIodGhpcy5zbG90cywgZm4pO1xyXG5cdH1cclxuXHJcblx0cHVibGljIGZpbmRPbmUoZm4pIHtcclxuXHRcdHJldHVybiB0aGlzLmZpbmRBbGwoZm4pWzBdO1xyXG5cdH1cclxuXHJcblx0Ly8gZmluZCB0aGUgYWRqYWNlbnQgcGFpciBpbiBnaXZlbiB0d28gbW92ZXNcclxuXHQvLyBhZGogcGFpciBpbiB0d28gbW92ZXMgPVxyXG5cdC8vIGlmIG1vdmUxID0gYSxiIGFuZCBtb3ZlMiA9IGIsYyB0aGVuIGFqYyBwYWlyID0gYVxyXG5cdHB1YmxpYyBzZXREZWR1Y3Rpb24oKSB7XHJcblxyXG5cdH1cclxuXHJcblx0cHVibGljIHJlbmRlcigpIHtcclxuXHRcdGZvciAobGV0IGkgPSAwLCBsZW4gPSB0aGlzLnNsb3RzLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XHJcblx0XHRcdCQoXCJ0ZCNjXCIgKyBpKS50ZXh0KHRoaXMuc2xvdHNbaV0ucXVhbnRpdHkgKyBcIiBcIiArIHRoaXMuc2xvdHNbaV0uZGVkdWN0aW9uWzBdKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHB1YmxpYyB0b1N0cmluZygpIHtcclxuXHRcdHJldHVybiB0aGlzLnNsb3RzLmpvaW4oXCIgXCIpO1xyXG5cdH1cclxufVxyXG5cclxuY2xhc3MgU29sdmVyIHtcclxuXHRwcml2YXRlIHB1enpsZTogUHV6emxlO1xyXG5cdHByaXZhdGUgYm9hcmQ6IEJvYXJkO1xyXG5cdHByaXZhdGUgbW92ZXM6IG51bWJlciA9IDA7XHJcblx0cHVibGljIGxhc3RNb3ZlOiBNb3ZlOyAvLyBoaXN0b3J5IG9mIG1vdmVzXHJcblxyXG5cdHB1YmxpYyBzdGF0aWMgc29sdmUocHV6emxlOiBQdXp6bGUpIHtcclxuXHRcdHJldHVybiBuZXcgU29sdmVyKHB1enpsZSk7XHJcblx0fVxyXG5cclxuXHRwdWJsaWMgY29uc3RydWN0b3IocHV6emxlOiBQdXp6bGUpIHtcclxuXHRcdHRoaXMucHV6emxlID0gcHV6emxlO1xyXG5cclxuXHRcdC8vIGZpcnN0IGd1ZXNzXHJcblx0XHR0aGlzLmJvYXJkID0gbmV3IEJvYXJkKF8ubWFwKG5ldyBBcnJheSh0aGlzLnB1enpsZS5nZXRTbG90Q291bnQoKSksIChuaWwsIGkpID0+IHtcclxuXHRcdFx0bGV0IHNsb3QgPSBuZXcgU2xvdCgpO1xyXG5cdFx0XHRzbG90LmluZGV4ID0gaTtcclxuXHRcdFx0c2xvdC5xdWFudGl0eSA9IGkgKyAxO1xyXG5cdFx0XHRzbG90LmRlZHVjdGlvbiA9IFVOS05PV047XHJcblx0XHRcdHJldHVybiBzbG90O1xyXG5cdFx0fSkpO1xyXG5cclxuXHRcdC8vIGJlZ2luXHJcblx0XHR0aGlzLnRlc3RHdWVzcygpO1xyXG5cdH1cclxuXHJcblx0cHVibGljIHRlc3RHdWVzcygpIHtcclxuXHRcdGlmICh0aGlzLm1vdmVzID4gTUFYX0dVRVNTRVMpIHtcclxuXHRcdFx0TG9nLm91dChcIlRvbyBtYW55IGd1ZXNzZXM7IHdlIGxvc2UuXCIpO1xyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblxyXG5cdFx0e1xyXG5cdFx0XHRsZXQgY29ycmVjdCA9IHRoaXMucHV6emxlLnRlc3QodGhpcy5ib2FyZCk7XHJcblx0XHRcdGxldCBkZWx0YSA9IGNvcnJlY3QgLSAobnVsbCAhPSB0aGlzLmxhc3RNb3ZlID8gdGhpcy5sYXN0TW92ZS5jb3JyZWN0IDogMCk7XHJcblx0XHRcdHRoaXMuYm9hcmQucmVuZGVyKCk7XHJcblx0XHRcdGlmIChudWxsICE9IHRoaXMubGFzdE1vdmUpIHtcclxuXHRcdFx0XHR0aGlzLmxhc3RNb3ZlLmNvcnJlY3QgPSBjb3JyZWN0O1xyXG5cdFx0XHRcdHRoaXMubGFzdE1vdmUuZGVsdGEgPSBkZWx0YTtcclxuXHRcdFx0XHR0aGlzLmxhc3RNb3ZlLnJlbmRlcigpO1xyXG5cdFx0XHR9XHRcdFx0XHJcblx0XHRcdGlmIChjb3JyZWN0ID09IHRoaXMucHV6emxlLmdldFNsb3RDb3VudCgpKSB7XHJcblx0XHRcdFx0TG9nLm91dChgWW91IHdpbiBpbiAke3RoaXMubW92ZXN9IG1vdmVzLmApO1xyXG5cdFx0XHRcdHJldHVybjtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdC8vIHRyeSBhZ2FpblxyXG5cdFx0bGV0IHByaW9yaXR5Q2FuZGlkYXRlcyA9IFtdO1xyXG5cdFx0bGV0IG5vbkNhbmRpZGF0ZXMgPSBbXTtcclxuXHRcdGlmIChudWxsICE9IHRoaXMubGFzdE1vdmUpIHtcclxuXHRcdFx0aWYgKHRoaXMubGFzdE1vdmUuZGVsdGEgPT0gMCkge1xyXG5cdFx0XHRcdC8vIG5vIGRpZmZlcmVuY2U7IGJvdGggbXVzdCBiZSBOTz9cclxuXHRcdFx0XHR0aGlzLmxhc3RNb3ZlLnBhaXIuYS5zZXREZWR1Y3Rpb24oTk8pO1xyXG5cdFx0XHRcdHRoaXMubGFzdE1vdmUucGFpci5iLnNldERlZHVjdGlvbihOTyk7XHJcblxyXG4vL1x0XHRcdFx0aWYgKCAvLyBpZiB0d28gbW92ZXMgYWdvIHdlIGdhaW5lZCBvbmVcclxuLy9cdFx0XHRcdFx0bnVsbCAhPSB0aGlzLmxhc3RNb3ZlLnByZXYgJiYgdGhpcy5sYXN0TW92ZS5wcmV2LmRlbHRhID09IDEgJiZcclxuLy9cdFx0XHRcdFx0Ly8gYW5kIGl0IHdhcyBNLE1cclxuLy9cdFx0XHRcdFx0dGhpcy5sYXN0TW92ZS5wcmV2LnBhaXIubWF0Y2hlc0RlZHVjdGlvbnMoTUFZQkUsIE1BWUJFKVxyXG4vL1x0XHRcdFx0KSB7XHJcbi8vXHRcdFx0XHRcdExvZy5vdXQoXCJleHBlcmltZW50YWwgMlwiKTtcclxuLy9cdFx0XHRcdFx0Ly8gdGhlbiB0aGUgc2xvdCB0aGF0IHdlIG1vdmVkIGxhc3RcclxuLy9cdFx0XHRcdFx0Ly8gd2hpY2ggd2FzIHBhcnQgb2YgdGhlIHBhaXIgdHdvIG1vdmVzIGFnb1xyXG4vL1x0XHRcdFx0XHQvLyBtdXN0IGJlIFlcclxuLy9cdFx0XHRcdFx0Ly8gYW5kIHRoZSBvdGhlciBOXHJcbi8vXHRcdFx0XHRcdGlmIChcclxuLy9cdFx0XHRcdFx0XHQodGhpcy5sYXN0TW92ZS5wYWlyLmEucXVhbnRpdHkgPT0gdGhpcy5sYXN0TW92ZS5wcmV2LnBhaXIuYS5xdWFudGl0eSkgfHxcclxuLy9cdFx0XHRcdFx0XHQodGhpcy5sYXN0TW92ZS5wYWlyLmIucXVhbnRpdHkgPT0gdGhpcy5sYXN0TW92ZS5wcmV2LnBhaXIuYS5xdWFudGl0eSlcclxuLy9cdFx0XHRcdFx0KSB7XHJcbi8vXHRcdFx0XHRcdFx0dGhpcy5ib2FyZC5maW5kT25lKChzKSA9PiBzLmluZGV4ID09IHRoaXMubGFzdE1vdmUucHJldi5wYWlyLmIuaW5kZXgpLnNldERlZHVjdGlvbihZRVMpO1xyXG4vL1x0XHRcdFx0XHR9XHJcbi8vXHRcdFx0XHRcdGVsc2Uge1xyXG4vL1x0XHRcdFx0XHRcdHRoaXMuYm9hcmQuZmluZE9uZSgocykgPT4gcy5pbmRleCA9PSB0aGlzLmxhc3RNb3ZlLnByZXYucGFpci5hLmluZGV4KS5zZXREZWR1Y3Rpb24oWUVTKTtcclxuLy9cdFx0XHRcdFx0fVxyXG4vL1x0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHRcdGVsc2UgaWYgKHRoaXMubGFzdE1vdmUuZGVsdGEgPT0gMSkge1xyXG5cdFx0XHRcdC8vIC8vIGlmIGVpdGhlciBvZiB0aGVzZSBNQVlCRXMgaGFzIGV2ZXIgYmVlbiBOTyBiZWZvcmUsIHRoZW4gdGhlIG90aGVyIGlzIFlFUyBub3dcclxuXHRcdFx0XHQvLyBpZiAodGhpcy5ib2FyZC5oYWREZWR1Y3Rpb25BdEluZGV4KG1vdmUuYWZ0ZXIuYSwgTk8pKSB7XHJcblx0XHRcdFx0Ly8gXHR0aGlzLmJvYXJkLmdldFNsb3QobW92ZS5hZnRlci5hLmluZGV4KS5zZXREZWR1Y3Rpb24oWUVTKTtcclxuXHRcdFx0XHQvLyBcdHRoaXMuYm9hcmQuZ2V0U2xvdChtb3ZlLmFmdGVyLmIuaW5kZXgpLnNldERlZHVjdGlvbihOTyk7XHJcblx0XHRcdFx0Ly8gfVxyXG5cdFx0XHRcdC8vIGVsc2UgaWYgKHRoaXMuYm9hcmQuaGFkRGVkdWN0aW9uQXRJbmRleChtb3ZlLmFmdGVyLmIsIE5PKSkge1xyXG5cdFx0XHRcdC8vIFx0dGhpcy5ib2FyZC5nZXRTbG90KG1vdmUuYWZ0ZXIuYi5pbmRleCkuc2V0RGVkdWN0aW9uKFlFUyk7XHJcblx0XHRcdFx0Ly8gXHR0aGlzLmJvYXJkLmdldFNsb3QobW92ZS5hZnRlci5hLmluZGV4KS5zZXREZWR1Y3Rpb24oTk8pO1xyXG5cdFx0XHRcdC8vIH1cclxuXHRcdFx0XHQvLyBlbHNlIHtcclxuXHRcdFx0XHQvLyBkaWZmZXJlbmNlOyBvbmUgaXMgbm93IHJpZ2h0LCBidXQgd2UgZG9uJ3Qga25vdyB3aGljaFxyXG5cdFx0XHRcdC8vIHVubGVzcyB3ZSBoYXZlIGhpc3RvcnkgdG8gbmFycm93IGl0LCB0aGVuIHdlIGhhdmUgc3BlY2lmaWMgbWF0Y2hcclxuXHJcblxyXG5cdFx0XHRcdC8vIG5vdyBkZWNpZGUgd2hhdCB0byBkbyB3aXRoIHRoaXMgaW5mb3JtYXRpb25cclxuXHRcdFx0XHQvL2lmICggLy8gaWYgdHdvIG1vdmVzIGFnbyB3ZSBnYWluZWQgb25lXHJcblx0XHRcdFx0Ly9cdChudWxsICE9IHR3b01vdmVzQWdvICYmIHR3b01vdmVzQWdvLmRlbHRhID09IDEgJiZcclxuXHRcdFx0XHQvL1x0XHQvLyBhbmQgaXQgd2FzIE0sTVxyXG5cdFx0XHRcdC8vXHRcdHR3b01vdmVzQWdvLmFmdGVyLmEuZGVkdWN0aW9uID09IE1BWUJFICYmXHJcblx0XHRcdFx0Ly9cdFx0dHdvTW92ZXNBZ28uYWZ0ZXIuYi5kZWR1Y3Rpb24gPT0gTUFZQkUpXHJcblx0XHRcdFx0Ly8pIHtcclxuXHRcdFx0XHQvL1x0TG9nLm91dChcImV4cGVyaW1lbnRhbCAzXCIpO1xyXG5cdFx0XHRcdC8vXHJcblx0XHRcdFx0Ly9cdGlmIChcclxuXHRcdFx0XHQvL1x0XHQobW92ZS5hZnRlci5hLnF1YW50aXR5ID09IHR3b01vdmVzQWdvLmFmdGVyLmEucXVhbnRpdHkpXHR8fFxyXG5cdFx0XHRcdC8vXHRcdChtb3ZlLmFmdGVyLmEucXVhbnRpdHkgPT0gdHdvTW92ZXNBZ28uYWZ0ZXIuYi5xdWFudGl0eSlcclxuXHRcdFx0XHQvL1x0KSB7XHJcblx0XHRcdFx0Ly9cdFx0bW92ZS5hZnRlci5hLnNldERlZHVjdGlvbihZRVMpO1xyXG5cdFx0XHRcdC8vXHRcdG1vdmUuYWZ0ZXIuYi5zZXREZWR1Y3Rpb24oTUFZQkUpO1xyXG5cdFx0XHRcdC8vXHR9XHJcblx0XHRcdFx0Ly9cdGVsc2Uge1xyXG5cdFx0XHRcdC8vXHRcdG1vdmUuYWZ0ZXIuYS5zZXREZWR1Y3Rpb24oTUFZQkUpO1xyXG5cdFx0XHRcdC8vXHRcdG1vdmUuYWZ0ZXIuYi5zZXREZWR1Y3Rpb24oWUVTKTtcclxuXHRcdFx0XHQvL1x0fVxyXG5cdFx0XHRcdC8vfVxyXG5cdFx0XHRcdC8vZWxzZSB7XHJcblx0XHRcdFx0dGhpcy5sYXN0TW92ZS5wYWlyLmEuc2V0RGVkdWN0aW9uKE1BWUJFKTtcclxuXHRcdFx0XHR0aGlzLmxhc3RNb3ZlLnBhaXIuYi5zZXREZWR1Y3Rpb24oTUFZQkUpO1xyXG5cdFx0XHRcdC8vfVxyXG5cdFx0XHR9XHJcblx0XHRcdGVsc2UgaWYgKHRoaXMubGFzdE1vdmUuZGVsdGEgPT0gMikge1xyXG5cdFx0XHRcdC8vIHZlcnkgcG9zaXRpdmUgZGlmZmVyZW5jZTsgYm90aCBhcmUgbm93IHJpZ2h0IGZvciBzdXJlXHJcblx0XHRcdFx0dGhpcy5sYXN0TW92ZS5wYWlyLmEuc2V0RGVkdWN0aW9uKFlFUyk7XHJcblx0XHRcdFx0dGhpcy5sYXN0TW92ZS5wYWlyLmIuc2V0RGVkdWN0aW9uKFlFUyk7XHJcblxyXG5cdFx0XHRcdC8vIGlmIGxhc3QgdHdvIHdlcmUgYWxzbyBtYXliZXMsIHRoZW4gdGhlIHRoaXJkIGlzIFlFU1xyXG5cdFx0XHR9XHJcblx0XHRcdGVsc2UgaWYgKHRoaXMubGFzdE1vdmUuZGVsdGEgPT0gLTEpIHtcclxuXHRcdFx0XHQvLyBkaWZmZXJlbmNlOyBvbmUgd2FzIHJpZ2h0LCBidXQgd2UgZG9uJ3Qga25vdyB3aGljaFxyXG5cdFx0XHRcdC8vIHNvIGZpcnN0IHN0ZXAgaXMgYWx3YXlzIHRvIHB1dCBpdCBiYWNrXHJcblx0XHRcdFx0dGhpcy51bnN3YXAoKTtcclxuXHJcblx0XHRcdFx0Ly8gbm93IGRlY2lkZSB3aGF0IHRvIGRvIHdpdGggdGhpcyBpbmZvcm1hdGlvblxyXG5cdFx0XHRcdC8vaWYgKCAvLyBpZiB0d28gbW92ZXMgYWdvIHdlIGdhaW5lZCBvbmVcclxuXHRcdFx0XHQvL1x0KG51bGwgIT0gdGhyZWVNb3Zlc0FnbyAmJiB0aHJlZU1vdmVzQWdvLmRlbHRhID09IDEgJiZcclxuXHRcdFx0XHQvL1x0XHQvLyBhbmQgaXQgd2FzIE0sTVxyXG5cdFx0XHRcdC8vXHRcdHRocmVlTW92ZXNBZ28uYWZ0ZXIuYS5kZWR1Y3Rpb24gPT0gTUFZQkUgJiZcclxuXHRcdFx0XHQvL1x0XHR0aHJlZU1vdmVzQWdvLmFmdGVyLmIuZGVkdWN0aW9uID09IE1BWUJFKVxyXG5cdFx0XHRcdC8vKSB7XHJcblx0XHRcdFx0Ly9cdExvZy5vdXQoXCJleHBlcmltZW50YWxcIik7XHJcblx0XHRcdFx0Ly9cdC8vIHRoZW4gdGhlIHNsb3QgdGhhdCB3ZSBtb3ZlZCBsYXN0XHJcblx0XHRcdFx0Ly9cdC8vIHdoaWNoIHdhcyBwYXJ0IG9mIHRoZSBwYWlyIHR3byBtb3ZlcyBhZ29cclxuXHRcdFx0XHQvL1x0Ly8gbXVzdCBiZSBZXHJcblx0XHRcdFx0Ly9cdC8vIGFuZCB0aGUgb3RoZXIgTlxyXG5cdFx0XHRcdC8vXHJcblx0XHRcdFx0Ly9cdC8vIG5vdGU6IGFzc3VtZXMgQSBpcyB0aGUgb25lIHdlIGFsd2F5cyBjaG9zZSB0byByZXN3YXBcclxuXHRcdFx0XHQvL1xyXG5cdFx0XHRcdC8vXHQvLyAzIGFuZCA0IHdlcmUgdGhlIHByZXZpb3VzIHR3b1xyXG5cdFx0XHRcdC8vXHQvLyB3ZSBrZXB0IDMgYW5kIHRyaWVkIDYgYnV0IGxvc3Qgb25lXHJcblx0XHRcdFx0Ly9cdC8vIHRoZXJlZm9yZSAzIChiZWluZyBwcmVzZW50IGluIG5vdyBhbmQgcHJldikgaXMgWUVTXHJcblx0XHRcdFx0Ly9cdC8vIGFuZCA2IGlzIE5PXHJcblx0XHRcdFx0Ly9cclxuXHRcdFx0XHQvL1x0aWYgKFxyXG5cdFx0XHRcdC8vXHRcdChtb3ZlLmFmdGVyLmEucXVhbnRpdHkgPT0gdGhyZWVNb3Zlc0Fnby5hZnRlci5hLnF1YW50aXR5KVxyXG5cdFx0XHRcdC8vXHQpIHtcclxuXHRcdFx0XHQvL1x0XHRtb3ZlLmFmdGVyLmEuc2V0RGVkdWN0aW9uKFlFUyk7XHJcblx0XHRcdFx0Ly9cdFx0bW92ZS5hZnRlci5iLnNldERlZHVjdGlvbihOTyk7XHJcblx0XHRcdFx0Ly9cdH1cclxuXHRcdFx0XHQvL1x0ZWxzZSB7XHJcblx0XHRcdFx0Ly9cdFx0bW92ZS5hZnRlci5hLnNldERlZHVjdGlvbihOTyk7XHJcblx0XHRcdFx0Ly9cdFx0bW92ZS5hZnRlci5iLnNldERlZHVjdGlvbihZRVMpO1xyXG5cdFx0XHRcdC8vXHR9XHJcblx0XHRcdFx0Ly99XHJcblx0XHRcdFx0Ly9lbHNlIHtcclxuXHRcdFx0XHR0aGlzLmxhc3RNb3ZlLnBhaXIuYS5zZXREZWR1Y3Rpb24oTUFZQkUpO1xyXG5cdFx0XHRcdHRoaXMubGFzdE1vdmUucGFpci5iLnNldERlZHVjdGlvbihNQVlCRSk7XHJcblx0XHRcdFx0Ly99XHJcblxyXG5cclxuXHJcblx0XHRcdFx0Ly8gVFJJQ0tZOiBpZiBzd2FwIE1BWUJFLCBOTyA9IC0xIHRoZW4gUkVWRVJTRSBhbmQgZGVkdWNlIE1BWUJFID0+IFlFU1xyXG5cclxuXHRcdFx0XHQvLyBpZiBwcmV2aW91c2x5IE1BWUJFLCBNQVlCRSwgYnV0IG5vdyAtMSwgdGhlbiBhIGlzIFlFU1xyXG5cdFx0XHRcdC8vaWYgKG1vdmUuYWZ0ZXIuYS5kZWR1Y3Rpb24gPT0gTUFZQkUgJiYgbW92ZS5hZnRlci5iLmRlZHVjdGlvbiA9PSBNQVlCRSkge1xyXG5cdFx0XHRcdC8vXHR0aGlzLmJvYXJkLmdldFNsb3QobW92ZS5hZnRlci5hLmluZGV4KVxyXG5cdFx0XHRcdC8vfVxyXG5cclxuXHJcblxyXG5cdFx0XHRcdC8vdGhpcy5ib2FyZC5zZXRSZW1haW5kZXJEZWR1Y3Rpb24oTUFZQkUsIE1BWUJFLCBZRVMpO1xyXG5cdFx0XHR9XHJcblx0XHRcdGVsc2UgaWYgKHRoaXMubGFzdE1vdmUuZGVsdGEgPT0gLTIpIHtcclxuXHRcdFx0XHQvLyBkaWZmZXJlbmNlOyBib3RoIHdlcmUgcmlnaHQgZm9yIHN1cmVcclxuXHRcdFx0XHR0aGlzLnVuc3dhcCgpO1xyXG5cdFx0XHRcdHRoaXMubGFzdE1vdmUucGFpci5hLnNldERlZHVjdGlvbihZRVMpO1xyXG5cdFx0XHRcdHRoaXMubGFzdE1vdmUucGFpci5iLnNldERlZHVjdGlvbihZRVMpO1xyXG5cclxuXHRcdFx0XHQvLyBpZiBsYXN0IHR3byB3ZXJlIGFsc28gbWF5YmVzLCB0aGVuIHRoZSB0aGlyZCBpcyBZRVNcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gTSxNIGFuZCBOLE4gYXJlIGdvb2QgdG8gaXRlcmF0ZSB3aXRoIFxyXG5cdFx0XHQvLyBzaW5jZSB5b3Uga25vdyBvbmUgb2YgdGhlbSBpcyBnb2luZyB0byBiZSBZIG9yIE4gd2hlbiByZXNvbHZlZFxyXG5cdFx0XHRpZiAoXHJcblx0XHRcdFx0KHRoaXMubGFzdE1vdmUucGFpci5hLmRlZHVjdGlvbiA9PSBNQVlCRSAmJiB0aGlzLmxhc3RNb3ZlLnBhaXIuYi5kZWR1Y3Rpb24gPT0gTUFZQkUpIHx8XHJcblx0XHRcdFx0KHRoaXMubGFzdE1vdmUucGFpci5hLmRlZHVjdGlvbiA9PSBOTyAmJiB0aGlzLmxhc3RNb3ZlLnBhaXIuYi5kZWR1Y3Rpb24gPT0gTk8pXHJcblx0XHRcdCkge1xyXG5cdFx0XHRcdC8vIGVuc3VyZSBuZXh0IHN3YXAgY29udGFpbnMgb25lIHNsb3QgZnJvbSB0aGlzIGxhc3QgcGFpclxyXG5cdFx0XHRcdC8vIGFuZCBvbmUgcmFuZG9tIG90aGVyIHNsb3RcclxuXHRcdFx0XHRwcmlvcml0eUNhbmRpZGF0ZXMucHVzaCh0aGlzLmxhc3RNb3ZlLnBhaXIuYSk7XHJcblx0XHRcdFx0Ly8gd2hpY2ggaXMgbm90IHRoZSBvdGhlciBzbG90IHdlIGp1c3QgdHJpZWRcclxuXHRcdFx0XHRub25DYW5kaWRhdGVzLnB1c2godGhpcy5sYXN0TW92ZS5wYWlyLmIpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0bGV0IGEsIGIsIGFsbEdvb2QgPSBmYWxzZTtcclxuXHRcdGRvIHtcclxuXHRcdFx0Ly8gc2VsZWN0IG5leHQgcGFpclxyXG5cdFx0XHRsZXQgcmFuZG9tQ2FuZGlkYXRlczogU2xvdFtdID0gW107XHJcblx0XHRcdGZvciAobGV0IGkgPSAwLCBsZW4gPSB0aGlzLnB1enpsZS5nZXRTbG90Q291bnQoKTsgaSA8IGxlbjsgaSsrKSB7XHJcblx0XHRcdFx0bGV0IHNsb3QgPSB0aGlzLmJvYXJkLnNsb3RzW2ldO1xyXG5cdFx0XHRcdGlmIChZRVMgIT0gc2xvdC5kZWR1Y3Rpb24gJiYgcHJpb3JpdHlDYW5kaWRhdGVzWzBdICE9IHNsb3QpIHtcclxuXHRcdFx0XHRcdHJhbmRvbUNhbmRpZGF0ZXMucHVzaChzbG90KTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdFx0bGV0IGNhbmRpZGF0ZXMgPSBfLmRpZmZlcmVuY2UoKHJhbmRvbUNhbmRpZGF0ZXMpLmNvbmNhdChwcmlvcml0eUNhbmRpZGF0ZXMpLCBub25DYW5kaWRhdGVzKTtcclxuXHRcdFx0aWYgKGNhbmRpZGF0ZXMubGVuZ3RoIDwgMikge1xyXG5cdFx0XHRcdExvZy5vdXQoXCJPbmx5IG9uZSB1bmtub3duIHJlbWFpbnMgeWV0IHB1enpsZSBpc24ndCBzb2x2ZWQ/IEltcG9zc2libGUhXCIpO1xyXG5cdFx0XHRcdGNvbnNvbGUubG9nKGNhbmRpZGF0ZXMpO1xyXG5cdFx0XHRcdHJldHVybjtcclxuXHRcdFx0fVxyXG5cdFx0XHRMb2cub3V0KFwiLS1cIik7XHJcblx0XHRcdGxldCBmb3JtYXQgPSAoYTogU2xvdFtdKSA9PlxyXG5cdFx0XHRcdF8ubWFwKGEsIChzbG90KSA9PiBgJHtzbG90LnF1YW50aXR5fSR7c2xvdC5kZWR1Y3Rpb25bMF19QCR7c2xvdC5pbmRleH1gKS5qb2luKFwiLCBcIik7XHJcblx0XHRcdExvZy5vdXQoXCJwcmlvcml0eUNhbmRpZGF0ZXM6IFwiICsgZm9ybWF0KHByaW9yaXR5Q2FuZGlkYXRlcykpO1xyXG5cdFx0XHRMb2cub3V0KFwicmFuZG9tQ2FuZGlkYXRlczogXCIgKyBmb3JtYXQocmFuZG9tQ2FuZGlkYXRlcykpO1xyXG5cdFx0XHRMb2cub3V0KFwibm9uQ2FuZGlkYXRlczogXCIgKyBmb3JtYXQobm9uQ2FuZGlkYXRlcykpO1xyXG5cdFx0XHRMb2cub3V0KFwiY2FuZGlkYXRlczogXCIgKyBmb3JtYXQoY2FuZGlkYXRlcykpO1xyXG5cclxuXHRcdFx0Ly8gaWYgYW55IG9mIHRoZXNlIGNhbmRpZGF0ZXMgaGF2ZSBldmVyIHJldHVybmVkIE4gYmVmb3JlXHJcblx0XHRcdC8vIHdoaWxlIGluIHRoZSBwb3NpdGlvbnMgd2UncmUgYWJvdXQgdG8gc3dhcCBpbnRvXHJcblx0XHRcdC8vIGRvbid0IHRyeSBpdCBhZ2FpblxyXG5cclxuXHRcdFx0YSA9IGNhbmRpZGF0ZXMucG9wKCk7XHJcblx0XHRcdGIgPSBjYW5kaWRhdGVzLnBvcCgpO1xyXG5cclxuXHRcdFx0aWYgKHRoaXMuaGFkRGVkdWN0aW9uQXRJbmRleChhLnF1YW50aXR5LCBiLmluZGV4LCBOTykpIHtcclxuXHRcdFx0XHRub25DYW5kaWRhdGVzLnB1c2goYSk7XHJcblx0XHRcdH1cclxuXHRcdFx0ZWxzZSBpZiAodGhpcy5oYWREZWR1Y3Rpb25BdEluZGV4KGIucXVhbnRpdHksIGEuaW5kZXgsIE5PKSkge1xyXG5cdFx0XHRcdG5vbkNhbmRpZGF0ZXMucHVzaChiKTtcclxuXHRcdFx0fVxyXG5cdFx0XHRlbHNlIGlmICh0aGlzLmFscmVhZHlUcmllZChhLnF1YW50aXR5LCBiLmluZGV4LCBiLnF1YW50aXR5LCBhLmluZGV4KSkge1xyXG5cdFx0XHRcdGIgPSBjYW5kaWRhdGVzLnBvcCgpO1xyXG5cdFx0XHR9XHJcblx0XHRcdGVsc2Uge1xyXG5cdFx0XHRcdGFsbEdvb2QgPSB0cnVlO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0XHR3aGlsZSAoIWFsbEdvb2QpO1xyXG5cdFx0dGhpcy5zd2FwKGEuaW5kZXgsIGIuaW5kZXgpO1xyXG5cclxuXHRcdHNldFRpbWVvdXQoKCkgPT4gdGhpcy50ZXN0R3Vlc3MoKSwgR1VFU1NfREVMQVkpO1xyXG5cdH1cclxuXHJcblx0cHVibGljIHN3YXAoYUluZGV4OiBudW1iZXIsIGJJbmRleDogbnVtYmVyKSB7XHJcblx0XHRsZXQgbW92ZSA9IG5ldyBNb3ZlKCk7XHJcblx0XHRtb3ZlLm51bSA9ICsrdGhpcy5tb3ZlcztcclxuXHRcdGxldCBvbGRBID0gXy5jbG9uZURlZXAodGhpcy5ib2FyZC5zbG90c1thSW5kZXhdKTtcclxuXHRcdGxldCBvbGRCID0gXy5jbG9uZURlZXAodGhpcy5ib2FyZC5zbG90c1tiSW5kZXhdKTtcclxuXHRcdHRoaXMuYm9hcmQuc2xvdHNbYUluZGV4XSA9IG9sZEI7XHJcblx0XHR0aGlzLmJvYXJkLnNsb3RzW2FJbmRleF0uaW5kZXggPSBhSW5kZXg7XHJcblx0XHR0aGlzLmJvYXJkLnNsb3RzW2JJbmRleF0gPSBvbGRBO1xyXG5cdFx0dGhpcy5ib2FyZC5zbG90c1tiSW5kZXhdLmluZGV4ID0gYkluZGV4O1xyXG5cdFx0bW92ZS5ib2FyZCA9IF8uY2xvbmVEZWVwKHRoaXMuYm9hcmQpO1xyXG5cdFx0bW92ZS5wYWlyID0gbmV3IFBhaXIoKTtcclxuXHRcdG1vdmUucGFpci5hID0gXy5jbG9uZURlZXAodGhpcy5ib2FyZC5zbG90c1thSW5kZXhdKTtcclxuXHRcdG1vdmUucGFpci5iID0gXy5jbG9uZURlZXAodGhpcy5ib2FyZC5zbG90c1tiSW5kZXhdKTtcclxuXHRcdG1vdmUucHJldiA9IHRoaXMubGFzdE1vdmU7XHJcblx0XHR0aGlzLmxhc3RNb3ZlID0gbW92ZTtcclxuXHRcdExvZy5vdXQoYCAgICAgICAgICAke21vdmUucGFpci5hLnF1YW50aXR5fSA8PiAke21vdmUucGFpci5iLnF1YW50aXR5fWApO1xyXG5cdH1cclxuXHJcblx0Ly8gZGV0ZXJtaW5lIHdoZXRoZXIgYSBxdWFudGl0eSBoYXMgZXZlciBoYWQgYSBnaXZlbiBkZWR1Y3Rpb24gYXQgYSBzcGVjaWZpYyBpbmRleCBpbiBlbnRpcmUgaGlzdG9yeVxyXG5cdHB1YmxpYyBoYWREZWR1Y3Rpb25BdEluZGV4KHF1YW50aXR5OiBudW1iZXIsIGluZGV4OiBudW1iZXIsIGRlZHVjdGlvbjogRGVkdWN0aW9uKTogYm9vbGVhbiB7XHJcblx0XHR3aGlsZSAobnVsbCAhPSB0aGlzLmxhc3RNb3ZlKSB7XHJcblx0XHRcdGxldCBwYWlyID0gdGhpcy5sYXN0TW92ZS5wYWlyO1xyXG5cdFx0XHRpZiAoXHJcblx0XHRcdFx0KHBhaXIuYS5xdWFudGl0eSA9PSBxdWFudGl0eSAmJlxyXG5cdFx0XHRcdFx0cGFpci5hLmRlZHVjdGlvbiA9PSBkZWR1Y3Rpb24gJiZcclxuXHRcdFx0XHRcdHBhaXIuYS5pbmRleCA9PSBpbmRleCkgfHxcclxuXHRcdFx0XHQocGFpci5iLnF1YW50aXR5ID09IHF1YW50aXR5ICYmXHJcblx0XHRcdFx0XHRwYWlyLmIuZGVkdWN0aW9uID09IGRlZHVjdGlvbiAmJlxyXG5cdFx0XHRcdFx0cGFpci5iLmluZGV4ID09IGluZGV4KVxyXG5cdFx0XHQpIHtcclxuXHRcdFx0XHRMb2cub3V0KGAke3F1YW50aXR5fSBpbmRleCAke2luZGV4fSBkZWR1Y3Rpb24gJHtkZWR1Y3Rpb25bMF19IGhhcHBlbmVkIGJlZm9yZSBhdCBtb3ZlICR7dGhpcy5sYXN0TW92ZS5udW19YCk7XHJcblx0XHRcdFx0cmV0dXJuIHRydWU7XHJcblx0XHRcdH1cclxuXHRcdFx0dGhpcy5sYXN0TW92ZSA9IHRoaXMubGFzdE1vdmUucHJldjtcclxuXHRcdH1cclxuXHRcdHJldHVybiBmYWxzZTtcclxuXHR9XHJcblxyXG5cdHB1YmxpYyBhbHJlYWR5VHJpZWQocTE6IG51bWJlciwgaTE6IG51bWJlciwgcTI6IG51bWJlciwgaTI6IG51bWJlcik6IGJvb2xlYW4ge1xyXG5cdFx0d2hpbGUgKG51bGwgIT0gdGhpcy5sYXN0TW92ZSkge1xyXG5cdFx0XHRsZXQgcGFpciA9IHRoaXMubGFzdE1vdmUucGFpcjtcclxuXHRcdFx0aWYgKFxyXG5cdFx0XHRcdChwYWlyLmEucXVhbnRpdHkgPT0gcTEgJiZcclxuXHRcdFx0XHRcdHBhaXIuYS5pbmRleCA9PSBpMSkgfHxcclxuXHRcdFx0XHQocGFpci5iLnF1YW50aXR5ID09IHEyICYmXHJcblx0XHRcdFx0XHRwYWlyLmIuaW5kZXggPT0gaTIpXHJcblx0XHRcdCkge1xyXG5cdFx0XHRcdExvZy5vdXQoYCR7cTF9OiR7aTF9LCR7cTJ9OiR7aTJ9IGhhcHBlbmVkIGJlZm9yZSBhdCBtb3ZlICR7dGhpcy5sYXN0TW92ZS5udW19YCk7XHJcblx0XHRcdFx0cmV0dXJuIHRydWU7XHJcblx0XHRcdH1cclxuXHRcdFx0dGhpcy5sYXN0TW92ZSA9IHRoaXMubGFzdE1vdmUucHJldjtcclxuXHRcdH1cclxuXHRcdHJldHVybiBmYWxzZTtcclxuXHR9XHJcblxyXG5cdHB1YmxpYyB1bnN3YXAoKSB7XHJcblx0XHR0aGlzLnN3YXAodGhpcy5sYXN0TW92ZS5wYWlyLmEuaW5kZXgsIHRoaXMubGFzdE1vdmUucGFpci5iLmluZGV4KTtcclxuXHRcdC8vIGFzc3VtZSByZXN1bHQgaXMgc2FtZSBhcyBiZWZvcmVcclxuXHRcdHRoaXMubGFzdE1vdmUuY29ycmVjdCA9IHRoaXMubGFzdE1vdmUucHJldi5jb3JyZWN0O1xyXG5cdFx0dGhpcy5sYXN0TW92ZS5kZWx0YSA9IHRoaXMubGFzdE1vdmUucHJldi5kZWx0YTtcclxuXHR9XHJcbn1cclxuXHJcblxyXG5jb25zdCBHVUVTU19ERUxBWSA9IDUwOyAvLyBtc1xyXG5jb25zdCBNQVhfR1VFU1NFUyA9IDk5O1xyXG5jb25zdCBTTE9UX0NPVU5UID0gNjtcclxuLy9sZXQgcHV6emxlID0gUHV6emxlRGVtby5yYW5kb20oU0xPVF9DT1VOVCk7XHJcbi8vbGV0IHB1enpsZSA9IG5ldyBQdXp6bGVEZW1vKFsyLCAzLCA0LCAxLCA2LCA1XSk7XHJcbmxldCBwdXp6bGUgPSBuZXcgUHV6emxlRGVtbyhbMiwgNCwgNiwgMSwgNSwgM10pO1xyXG4vL2xldCBwdXp6bGUgPSBuZXcgUHV6emxlRGVtbyhbMiwgMSwgNSwgNiwgMywgNF0pO1xyXG4vLyBUT0RPOiB0cnkgYSBwdXp6bGUgd2hlcmUgbnVtYmVycyBjYW4gcmVwZWF0XHJcbi8vbGV0IGh1bWFuID0gbmV3IEh1bWFuUHV6emxlSW50ZXJmYWNlKFNMT1RfQ09VTlQpO1xyXG5Tb2x2ZXIuc29sdmUocHV6emxlKTsiXX0=