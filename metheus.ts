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
	public swap?: Swap;
	private left: Move; // bst
	private right: Move; // bst

	// new move based on copy of given board
	public constructor(board: Board, swap?: Swap) {
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
		let s = "";
		for (let i = 0, len = this.board.slots.length; i < len; i++) {
			let slot = this.board.slots[i];
			let underline = (null != this.swap && (slot.quantity == this.board.slots[this.swap.a].quantity || slot.quantity == this.board.slots[this.swap.b].quantity));
			let bold = this.board.debugViewCorrectSlots[i];
			s += `${bold ? "<b>" : ""}${underline ? "<u>" : ""}${slot.quantity}${slot.deduction[0]}${underline ? "</u>" : ""}${bold ? "</b>" : ""} `;
		}
		s += ` = ${this.correct} (${this.delta < 0 ? this.delta : `+${this.delta}`})`;
		Log.html(s);
	}

	public score() {
		return this.correct + this.delta;
	}

	public static rankInsert(root: Move, move: Move) {
		let parent: Move = null;
		let current = move;
		while (true) {
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

	public static findMostValuableMove(root: Move): Move {
		if (null == root) return null;
		let current = root;
		let lastHighScore = current;
		while (true) {
			if (current.score() > lastHighScore.score())
			{
				current = current.left;
			}
			else
			{
				current = current.right;
			}
			if (null == current) {
				return lastHighScore;
			}
		}
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
	public rootMove: Move; // root BST node
	public lastMove: Move; // history of played moves

	public constructor(puzzle: Puzzle) {
		this.puzzle = puzzle;

		// begin with opening move
		this.rootMove = new Move(new Board(_.map(
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
		if (this.moves > MAX_GUESSES) {
			Log.out("Too many guesses; we lose.");
			return;
		}
		else {
			let correct = this.puzzle.test(move.board);
			let delta = correct - (null != move ? move.correct || 0 : 0);
			Move.rankInsert(this.rootMove, move);
			move.board.render();
			move.correct = correct;
			move.delta = delta;
			move.render();
			if (correct == this.puzzle.getSlotCount()) {
				Log.out(`You win in ${this.moves} moves.`);
				return;
			}
		}

		// decide what to do next


		if (null != move.swap) {
			if (move.delta == 0) {
				// no difference; both must be NO?
				move.swap.a.setDeduction(NO);
				move.swap.b.setDeduction(NO);
			}
			else if (move.delta == 1) {
				// difference; one is now right, but we don't know which
				// unless we have history to narrow it, then we have specific match
				move.swap.a.setDeduction(MAYBE);
				move.swap.b.setDeduction(MAYBE);
			}
			else if (move.delta == 2) {
				// very positive difference; both are now right for sure
				move.swap.a.setDeduction(YES);
				move.swap.b.setDeduction(YES);
			}
			else if (move.delta == -1) {
				// difference; one was right, but we don't know which
				// so first step is always to put it back
				move.swap.a.setDeduction(MAYBE);
				move.swap.b.setDeduction(MAYBE);
				this.rollback();
			}
			else if (move.delta == -2) {
				// difference; both were right for sure
				move.swap.a.setDeduction(YES);
				move.swap.b.setDeduction(YES);
				this.rollback();
			}
		}

		setTimeout(() => this.playMove(this.newMove(a, b)), GUESS_DELAY);
	}

	// determine whether a quantity has ever had a given deduction at a specific index in entire history
	public hadDeductionAtIndex(quantity: number, index: number, deduction: Deduction): boolean {
		while (null != this.lastMove.swap) {
			let pair = this.lastMove.swap;
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
		while (null != this.lastMove.swap) {
			let pair = this.lastMove.swap;
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

	public rollback() {
		Log.out("rollback");
		let move = new Move(this.lastMove.board, this.lastMove.swap.a.index, this.lastMove.swap.b.index);
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