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
		Log.out(`Puzzle:\n   ${solution.join(" ")}`);
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
		this.slotCount = slotCount;
	}

	public getSlotCount(): number {
		return this.slotCount;
	}

	private lastSequence: number[] = [];
	public test(board: Board): number {
		let answer;
		do {
			let n = _.map(board.slots, (s) => s.quantity);
			let display = _.map(n, (d, i) => this.lastSequence.length > 0 && d == this.lastSequence[i] ? d : `(${d})`);
			this.lastSequence = n;
			answer = parseInt(prompt(
				`Please input the following sequence:\n\n    ${display.join("  ")}\n\nAfter each player clicks their blue button\nhow many yellow lights are lit?`), 10);
		}
		while (isNaN(answer));
		return answer;
	}
}

type Deduction = "U" | "MN" | "N" | "MY" | "Y";
const UNKNOWN = "U";
const MAYBE_NO = "MN";
const NO = "N";
const MAYBE_YES = "MY";
const YES = "Y";

class Swap {
	public a: number;
	public b: number;

	public constructor(a: number, b: number) {
		this.a = a;
		this.b = b;
	}
}

class Move {
	public num: number;
	public board: Board;
	public correct: number; // score
	public delta: number; // score
	public prev?: Move; // play sequence
	public base: Move; // copied from
	public swap?: Swap;

	// new move based on copy of given move
	public constructor(base: Move, board: Board, swap?: Swap) {
		this.base = base;
		this.board = _.cloneDeep(board);
		if (null != swap) {
			let tmp = this.board.slots[swap.a];
			this.board.slots[swap.a] = this.board.slots[swap.b];
			this.board.slots[swap.b] = tmp;
			this.board.slots[swap.a].index = swap.a;
			this.board.slots[swap.b].index = swap.b;
			this.swap = swap;
		}
	}

	public render() {
		let s = `${this.num}: `;
		for (let i = 0, len = this.board.slots.length; i < len; i++) {
			let slot = this.board.slots[i];
			let underline = (null != this.swap && (slot.quantity == this.board.slots[this.swap.a].quantity || slot.quantity == this.board.slots[this.swap.b].quantity));
			let bold = this.board.debugViewCorrectSlots[i];
			s += `${bold ? "<b>" : ""}${underline ? "(" : ""}${slot.quantity}${underline ? ")" : ""}${bold ? "</b>" : ""} `;
		}
		s += (this.num === 1 ? "FIRST" :
			` = ${this.correct} (${this.delta < 0 ? this.delta : `+${this.delta}`}) score: ${this.score()}`);
		Log.html(s);
	}

	public score() {
		return this.correct + (this.delta * .5)
	}

	public getSwapA() {
		return this.board.slots[this.swap.a];
	}

	public getSwapB() {
		return this.board.slots[this.swap.b];
	}

	public getSwapInBase(k: string) {
		return _.find(this.base.board.slots, (s) =>
			s.quantity === this.board.slots[this.swap[k]].quantity);
	}

	public hasSwapDeduction(a: Deduction, b: Deduction) {
		return this.getSwapA().deduction == a &&
			this.getSwapB().deduction == b;
	}

	// TODO: find the adjacent pair in given two moves
	// adj pair in two moves =
	// if move1 = a,b and move2 = b,c then ajc pair = a

	public static copyMostValuableMove(history: Move[]): Move {
		let mostValuable: Move;
		for (let i = 0, len = history.length; i < len; i++) {
			let current = history[i];
			if (null == mostValuable || mostValuable.score() < current.score()) {
				mostValuable = current;
			}
		}
		return mostValuable.clone();
	}

	public clone(): Move {
		let move = new Move(this, this.board);
		move.num = this.num;
		move.correct = this.correct;
		move.delta = this.delta;
		return move;
	}

	public static rejectWasteMove(history: Move[], candidate: Move): boolean {
		for (let i = 0, len = history.length; i < len; i++) {
			let current = history[i];

			// reject if this board has been played before
			if (Board.compare(current.board, candidate.board)) {
				if (DEBUG) Log.out(`Rejecting board played before at move ${current.num} ${candidate.board.slots.join(" ")}`);
				return true;
			}

			for (let i = 0, len = current.board.slots.length; i < len; i++) {
				let cur = current.board.slots[i];
				let can = candidate.board.slots[i];

				// reject if history contains a YES that isn't included here
				if (YES === cur.deduction && can.quantity !== cur.quantity) {
					if (DEBUG) Log.out(`Rejecting index ${can.quantity}${can.deduction.substr(0, 2)}@${can.index} which was ${cur.quantity}${cur.deduction.substr(0, 2)}@${cur.index} before at move ${current.num}`);
					return true;
				}

				// reject if history contains a NO that is included again here
				if (NO === cur.deduction && can.quantity === cur.quantity) {
					if (DEBUG) Log.out(`Rejecting index ${can.quantity}${can.deduction.substr(0, 2)}@${can.index} which was ${cur.quantity}${cur.deduction.substr(0, 2)}@${cur.index} before at move ${current.num}`);
					return true;
				}
			}

			return false;
		}
	}

	public static crossJoinCandidates(candidates: Slot[]) {
		let result: Slot[] = [];
		for (let x = 0, xlen = candidates.length; x < xlen; x++) {
			for (let y = 0, ylen = candidates.length; y < ylen; y++) {
				if (x != y)
					result.push(candidates[x], candidates[y]);
			}
		}
		return result;
	}
}

class Slot {
	public index: number;
	public quantity: number;
	public deduction: Deduction;

	public setDeduction(deduction: Deduction, board: Board, index: number) {
		if (YES === this.deduction || NO === this.deduction) return; // hard conclusions to change
		if (DEBUG) {
			Log.out(`    ${this.quantity}${this.deduction.substr(0, 2)}@${this.index} => ${deduction.substr(0, 2)}${deduction == YES ? " FOUND" : ""}`);
			if (YES === deduction && !board.debugViewCorrectSlots[index]) {
				Log.out(`      but its wrong`);
				debugger;
			}
		}
		this.deduction = deduction;
	}

	public toString() {
		return `${this.quantity}${this.deduction.substr(0, 2)}@${this.index}`;
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

	public static compare(a: Board, b: Board) {
		if (a.slots.length != b.slots.length) return false;
		for (let i = 0, len = a.slots.length; i < len; i++) {
			if (a.slots[i].quantity != b.slots[i].quantity) {
				return false;
			}
		}
		return true;
	}

	public render() {
		for (let i = 0, len = this.slots.length; i < len; i++) {
			$("td#c" + i).text(this.slots[i].quantity + " " + this.slots[i].deduction.substr(0, 2));
		}
	}

	public toString() {
		return this.slots.join(" ");
	}
}

class Solver {
	private puzzle: Puzzle;
	private moves: number = 0;
	public rootMove: Move; // root BST node
	public lastMove: Move; // history of played moves
	public solution: number[];

	public constructor(puzzle: Puzzle) {
		this.puzzle = puzzle;

		// begin with opening move
		this.rootMove = new Move(null, new Board(_.map(
			new Array(this.puzzle.getSlotCount()),
			(nil, i) => {
				let slot = new Slot();
				slot.index = i;
				slot.quantity = i + 1;
				slot.deduction = UNKNOWN;
				return slot;
			})));
		this.playMove(this.rootMove);
	}

	public getHistory() {
		let current = this.lastMove;
		let history: Move[] = [];
		while (null != current) {
			history.push(current);
			current = current.prev;
		}
		return history;
	}

	public playMove(move: Move) {
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
			Log.out(`You win in ${this.moves} moves.`);
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
	}

	public decide() {
		// decide what to do next
		let nextMove: Move;
		let candidates: Slot[];
		let u, x;
		if (1 === this.moves) { // follow-up to first move
			// just play a swap of the first two positions
			nextMove = new Move(this.lastMove, this.lastMove.board, new Swap(0, 1));
		}
		else { // subsequent moves
			let move = Move.copyMostValuableMove(this.getHistory());
			// try a unique new swap from non-yes deductions
			let tries = 0;
			do {
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

				let rank = { MAYBE_YES: 1, NO: 2, UNKNOWN: 3, MAYBE_NO: 4 };
				if (null == candidates) {
					candidates = _.filter(move.board.slots, (s) =>
						_.includes([UNKNOWN, MAYBE_NO, MAYBE_YES, NO], s.deduction));
					candidates = _.sortBy(candidates, (s) => rank[s.deduction]);
					candidates = Move.crossJoinCandidates(candidates);
				}
				else {
					Log.out(`repeated while: ${x}, ${u}`);
				}
				Log.out(_.map(candidates, (s) => `${s.quantity}${s.deduction.substr(0, 2)}@${s.index}`).join(" "));
				let a = candidates.shift().index, b = candidates.shift().index;
				nextMove = new Move(move, move.board, new Swap(a, b));
			}
			while (
				(x = Move.rejectWasteMove(this.getHistory(), nextMove))
				&& (u = tries++) < LOOP_BREAKER);
			if (DEBUG && tries > LOOP_BREAKER) Log.out("candidates not original enough; exhausting retries");
			Log.out(`escaped while: ${x}, ${u}`);
		}
		if (null == nextMove) {
			Log.out("Unable to find next move.");
			return;
		}

		setTimeout(() => this.playMove(nextMove), GUESS_DELAY);
	}
}

const LOOP_BREAKER = 999;
const GUESS_DELAY = 50; // ms
const MAX_GUESSES = 13;
const SLOT_COUNT = 6;

let puzzle;
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