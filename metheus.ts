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
	private left: Move; // bst
	private right: Move; // bst

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
			s += `${bold ? "<b>" : ""}${underline ? "<u>" : ""}${slot.quantity}${slot.deduction[0]}${underline ? "</u>" : ""}${bold ? "</b>" : ""} `;
		}
		console.log("num: ", this.num);
		s += (this.num === 1 ? "FIRST" :
			` = ${this.correct} (${this.delta < 0 ? this.delta : `+${this.delta}`}) score: ${this.score()}`);
		Log.html(s);
	}

	public score() {
		return this.correct + (this.delta *.5)
	}

	public getSwapA() {
		return this.board.slots[this.swap.a];
	}

	public getSwapB() {
		return this.board.slots[this.swap.b];
	}

	public hasSwapDeduction(a: Deduction, b: Deduction) {
		return this.getSwapA().deduction == a &&
			this.getSwapB().deduction == b;
	}

	public static rankInsert(root: Move, move: Move) {
		let parent: Move = null;
		let current = root;
		let i=0;
		while (i++<LOOP_BREAKER) {
			parent = current;
			if (move.score() < parent.score()) {
				current = parent.left;
				if (null == current) {
					parent.left = move;
					return;
				}
			}
			else {
				current = parent.right;
				if (null == current) {
					parent.right = move;
					return;
				}
			}
		}
	}

	// TODO: find the adjacent pair in given two moves
	// adj pair in two moves =
	// if move1 = a,b and move2 = b,c then ajc pair = a

	public static copyMostValuableMove(root: Move): Move {
		if (null == root) return null;
		let current = root;
		let mostValuable = current;
		let i=0;
		while (i++<LOOP_BREAKER) {
			if (mostValuable.score() < current.score()) {
				mostValuable = current;
			}
			if (current.right && current.score() < current.right.score()) {
				current = current.right;
			}
			else if (current.left && current.score() < current.left.score()) {
				current = current.left;
			}
			else {
				return mostValuable.clone();
			}
		}
	}

	public clone(): Move {
		let move = new Move(this, this.board);
		move.num = this.num;
		move.correct = this.correct;
		move.delta = this.delta;
		return move;
	}

	public static havePlayedBefore(last: Move, candidate: Move): boolean {
		let current = last;
		let i=0;
		while (null != current && i++<LOOP_BREAKER) {		
			if (Board.compare(current.board, candidate.board)) {
				return true;
			}
			current = current.prev;
		}
		return false;
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
		if (null != move.swap) {
			// apply swap deductions
			if (move.delta == 0) {
				// no difference; both must be NO
				move.getSwapA().setDeduction(NO);
				move.getSwapB().setDeduction(NO);
			}
			else if (move.delta == 1) {
				// difference; one is now right, but we don't know which
				move.getSwapA().setDeduction(MAYBE);
				move.getSwapB().setDeduction(MAYBE);
			}
			else if (move.delta == 2) {
				// very positive difference; both are now right for sure
				move.getSwapA().setDeduction(YES);
				move.getSwapB().setDeduction(YES);
			}
			else if (move.delta == -1) {
				// difference; one was right, but we don't know which
				move.getSwapA().setDeduction(MAYBE);
				move.getSwapB().setDeduction(MAYBE);
			}
			else if (move.delta == -2) {
				// difference; both were right for sure
				move.getSwapA().setDeduction(YES);
				move.getSwapB().setDeduction(YES);
			}
		}
		if (this.rootMove != move) {
			Move.rankInsert(this.rootMove, move);
		}

		// update user view
		move.board.render();
		move.render();
		if (move.correct == this.puzzle.getSlotCount()) {
			Log.out(`You win in ${this.moves} moves.`);
			return;
		}

		this.decide();
	}

	public decide() {
		// decide what to do next
		let nextMove: Move;
		if (1 === this.moves) { // follow-up to first move
			// just play a swap of the first two positions
			nextMove = new Move(this.lastMove, this.lastMove.board, new Swap(0, 1));
		}
		else { // subsequent moves
			let move = Move.copyMostValuableMove(this.rootMove);
			Log.out(`** Most valuable score: ${move.score()}`);
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
				//
				//					
				//
				//				}
				//				else {
				//					// rotate through untested swaps remaining
				//
				//				}

				nextMove = new Move(move, move.board, new Swap(
					Math.floor(Math.random() * move.board.slots.length),
					Math.floor(Math.random() * move.board.slots.length)
				));
				console.log("candidate next move ", nextMove);
			}
			// TODO: fix this; its retrying previous combos
			while (
				(Move.havePlayedBefore(this.lastMove, nextMove) ||
					YES == nextMove.getSwapA().deduction ||
					YES == nextMove.getSwapB().deduction) &&
				tries++ < 100);
		}
		if (null == nextMove) {
			Log.out("Unable to find next move.");
			return;
		}
		console.log("accepted next move ", nextMove);

		setTimeout(() => this.playMove(nextMove), GUESS_DELAY);
	}

	// // determine whether a quantity has ever had a given deduction at a specific index in entire history
	// public hadDeductionAtIndex(quantity: number, index: number, deduction: Deduction): boolean {
	// 	while (null != this.lastMove.swap) {
	// 		let pair = this.lastMove.swap;
	// 		if (
	// 			(pair.a.quantity == quantity &&
	// 				pair.a.deduction == deduction &&
	// 				pair.a.index == index) ||
	// 			(pair.b.quantity == quantity &&
	// 				pair.b.deduction == deduction &&
	// 				pair.b.index == index)
	// 		) {
	// 			Log.out(`${quantity} index ${index} deduction ${deduction[0]} happened before at move ${this.lastMove.num}`);
	// 			return true;
	// 		}
	// 		this.lastMove = this.lastMove.prev;
	// 	}
	// 	return false;
	// }

	// public alreadyTried(q1: number, i1: number, q2: number, i2: number): boolean {
	// 	while (null != this.lastMove.swap) {
	// 		let pair = this.lastMove.swap;
	// 		if (
	// 			(pair.a.quantity == q1 &&
	// 				pair.a.index == i1) ||
	// 			(pair.b.quantity == q2 &&
	// 				pair.b.index == i2)
	// 		) {
	// 			Log.out(`${q1}:${i1},${q2}:${i2} happened before at move ${this.lastMove.num}`);
	// 			return true;
	// 		}
	// 		this.lastMove = this.lastMove.prev;
	// 	}
	// 	return false;
	// }

	// public rollback() {
	// 	Log.out("rollback");
	// 	let move = new Move(this.lastMove.board, this.lastMove.swap.a.index, this.lastMove.swap.b.index);
	// 	// assume result is same as before
	// 	move.correct = this.lastMove.correct;
	// 	move.delta = this.lastMove.delta * -1; // assume opposite
	// }
}

const LOOP_BREAKER = 999;
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