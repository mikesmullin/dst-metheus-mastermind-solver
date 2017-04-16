/// <reference path="node_modules/@types/jquery/index.d.ts" />
/// <reference path="node_modules/@types/lodash/index.d.ts" />

const DEBUG = true;

class Log {
	public static out(msg: string) {
		$("<pre/>").text(`${msg}\n`).appendTo("#log");
	}
	public static html(html: string) {
		$("<div/>").html(html).appendTo("#log");
	}
}

interface Puzzle {
	test(board: Board): number;
	getSlotCount(): number;
}

class PuzzleDemo implements Puzzle {
	private solution: number[] = [];

	public constructor(solution: number[]) {
		this.solution = solution;
		Log.out(`Puzzle:\n${solution.join("  ")}`);
	}

	public static random(length: number): Puzzle {
		return new PuzzleDemo(_.shuffle(_.map(
			new Array(length), function (v, k) { return k + 1; })));
	}

	public getSlotCount(): number {
		return this.solution.length;
	}

	public test(board: Board): number {
		let count = 0;
		for (let i = 0, len = this.solution.length; i < len; i++) {
			let correct = board.slots[i].quantity == this.solution[i];
			if (correct) count++;
			if (DEBUG) board.debugViewCorrectSlots[i] = correct;
		}
		return count;
	}
}

class HumanPuzzleInterface implements Puzzle {
	private slotCount: number;

	public constructor(slotCount: number) {
		this.slotCount;
	}

	public getSlotCount(): number {
		return this.slotCount;
	}

	public test(board: Board): number {
		let answer;
		do {
			answer = parseInt(prompt(
				`Please try:\n\t${board}\n\nHow many are correct?`), 10);
		}
		while (!isNaN(answer));
		return answer;
	}
}

type Deduction = "UNKNOWN" | "NO" | "MAYBE" | "YES";
const UNKNOWN = "UNKNOWN";
const NO = "NO";
const MAYBE = "MAYBE";
const YES = "YES";

class Move {
	public num: number;
	public prev?: Move;
	public board: Board;
	public pair?: Pair;
	public correct: number;
	public delta: number;

	// new move based on given board
	public constructor(board: Board, aIndex?: number, bIndex?: number) {
		if (null != aIndex && null != bIndex) {
			let oldA = _.cloneDeep(board.slots[aIndex]);
			let oldB = _.cloneDeep(board.slots[bIndex]);
			board.slots[aIndex] = oldB;
			board.slots[aIndex].index = aIndex;
			board.slots[bIndex] = oldA;
			board.slots[bIndex].index = bIndex;
		}
		move.board = _.cloneDeep(board);
		if (null != aIndex && null != bIndex) {
			move.pair = new Pair();
			move.pair.a = _.cloneDeep(board.slots[aIndex]);
			move.pair.b = _.cloneDeep(board.slots[bIndex]);
		}
		return move;
	}

	public render() {
		let s = "";
		for (let i = 0, len = this.board.slots.length; i < len; i++) {
			let slot = this.board.slots[i];
			let underline = (null != this.pair && (slot.quantity == this.pair.a.quantity || slot.quantity == this.pair.b.quantity));
			let bold = this.board.debugViewCorrectSlots[i];
			s += `${bold ? "<b>" : ""}${underline ? "<u>" : ""}${slot.quantity}${slot.deduction[0]}${underline ? "</u>" : ""}${bold ? "</b>" : ""} `;
		}
		s += ` = ${this.correct} (${this.delta < 0 ? this.delta : `+${this.delta}`})`;
		Log.html(s);
	}
}

class Slot {
	public index: number;
	public quantity: number;
	public deduction: Deduction;

	public setDeduction(deduction: Deduction) {
		this.deduction = deduction;
		Log.out(`          ${this.quantity} ${this.deduction[0]} => ${deduction[0]}${deduction == YES ? " FOUND" : ""}`);
	}

	public toString() {
		return this.quantity;
	}
}

class Pair {
	public a: Slot;
	public b: Slot;

	public matchesDeductions(a: Deduction, b: Deduction): boolean {
		return this.a.deduction == a && this.b.deduction == b;
	}
}

class Board {
	public slots: Slot[];
	public debugViewCorrectSlots: boolean[] = [];

	public constructor(slots: Slot[]) {
		this.slots = slots;
	}

	public findAll(fn) {
		return _.filter(this.slots, fn);
	}

	public findOne(fn) {
		return this.findAll(fn)[0];
	}

	// find the adjacent pair in given two moves
	// adj pair in two moves =
	// if move1 = a,b and move2 = b,c then ajc pair = a
	public setDeduction() {

	}

	public render() {
		for (let i = 0, len = this.slots.length; i < len; i++) {
			$("td#c" + i).text(this.slots[i].quantity + " " + this.slots[i].deduction[0]);
		}
	}

	public toString() {
		return this.slots.join(" ");
	}
}

class Solver {
	private puzzle: Puzzle;
	private moves: number = 0;
	public lastMove: Move; // history of moves

	public constructor(puzzle: Puzzle) {
		this.puzzle = puzzle;

		// play opening move
		this.playMove(this.newMove(new Board(_.map(
			new Array(this.puzzle.getSlotCount()),
			(nil, i) => {
				let slot = new Slot();
				slot.index = i;
				slot.quantity = i + 1;
				slot.deduction = UNKNOWN;
				return slot;
			}))));
	}

	public playMove(move: Move) {
		// sequence move into play
		move.num = ++this.moves;
		move.prev = this.lastMove;
		this.lastMove = move;

		if (this.moves > MAX_GUESSES) {
			Log.out("Too many guesses; we lose.");
			return;
		}

		{
			let correct = this.puzzle.test(this.lastMove.board);
			let delta = correct - (null != this.lastMove ? this.lastMove.correct || 0 : 0);
			this.lastMove.board.render();
			this.lastMove.correct = correct;
			this.lastMove.delta = delta;
			this.lastMove.render();
			if (correct == this.puzzle.getSlotCount()) {
				Log.out(`You win in ${this.moves} moves.`);
				return;
			}
		}

		// try again
		if (null != this.lastMove.pair) {
			if (this.lastMove.delta == 0) {
				// no difference; both must be NO?
				this.lastMove.pair.a.setDeduction(NO);
				this.lastMove.pair.b.setDeduction(NO);
			}
			else if (this.lastMove.delta == 1) {
				// difference; one is now right, but we don't know which
				// unless we have history to narrow it, then we have specific match
				this.lastMove.pair.a.setDeduction(MAYBE);
				this.lastMove.pair.b.setDeduction(MAYBE);
			}
			else if (this.lastMove.delta == 2) {
				// very positive difference; both are now right for sure
				this.lastMove.pair.a.setDeduction(YES);
				this.lastMove.pair.b.setDeduction(YES);
			}
			else if (this.lastMove.delta == -1) {
				// difference; one was right, but we don't know which
				// so first step is always to put it back
				this.lastMove.pair.a.setDeduction(MAYBE);
				this.lastMove.pair.b.setDeduction(MAYBE);
				this.unswap();
			}
			else if (this.lastMove.delta == -2) {
				// difference; both were right for sure
				this.lastMove.pair.a.setDeduction(YES);
				this.lastMove.pair.b.setDeduction(YES);
				this.unswap();
			}
		}

		setTimeout(() => this.playMove(this.newMove(a, b)), GUESS_DELAY);
	}

	// determine whether a quantity has ever had a given deduction at a specific index in entire history
	public hadDeductionAtIndex(quantity: number, index: number, deduction: Deduction): boolean {
		while (null != this.lastMove.pair) {
			let pair = this.lastMove.pair;
			if (
				(pair.a.quantity == quantity &&
					pair.a.deduction == deduction &&
					pair.a.index == index) ||
				(pair.b.quantity == quantity &&
					pair.b.deduction == deduction &&
					pair.b.index == index)
			) {
				Log.out(`${quantity} index ${index} deduction ${deduction[0]} happened before at move ${this.lastMove.num}`);
				return true;
			}
			this.lastMove = this.lastMove.prev;
		}
		return false;
	}

	public alreadyTried(q1: number, i1: number, q2: number, i2: number): boolean {
		while (null != this.lastMove.pair) {
			let pair = this.lastMove.pair;
			if (
				(pair.a.quantity == q1 &&
					pair.a.index == i1) ||
				(pair.b.quantity == q2 &&
					pair.b.index == i2)
			) {
				Log.out(`${q1}:${i1},${q2}:${i2} happened before at move ${this.lastMove.num}`);
				return true;
			}
			this.lastMove = this.lastMove.prev;
		}
		return false;
	}

	public unswap() {
		let move = this.newMove(this.lastMove.board, this.lastMove.pair.a.index, this.lastMove.pair.b.index);
		// assume result is same as before
		move.correct = this.lastMove.correct;
		move.delta = this.lastMove.delta * -1; // assume opposite
	}
}


const GUESS_DELAY = 50; // ms
const MAX_GUESSES = 99;
const SLOT_COUNT = 6;

let puzzle;
if (DEBUG) {
	//puzzle = PuzzleDemo.random(SLOT_COUNT);
	puzzle = new PuzzleDemo([2, 3, 4, 1, 6, 5]);
	//puzzle = new PuzzleDemo([2, 4, 6, 1, 5, 3]);
	//puzzle = new PuzzleDemo([2, 1, 5, 6, 3, 4]);
	// TODO: try a puzzle where numbers can repeat
}
else {
	puzzle = new HumanPuzzleInterface(SLOT_COUNT);
}
new Solver(puzzle);