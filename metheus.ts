/// <reference path="node_modules/@types/jquery/index.d.ts" />
/// <reference path="node_modules/@types/lodash/index.d.ts" />

class Log {
	private static state = "";
	public static out(msg: string): void {
		this.state += `${msg}\n`;
		$("#pre").text(this.state);
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
		Log.out(`Puzzle: ${solution.join(" ")}`);
	}

	public static random(length: number): Puzzle {
		return new PuzzleDemo(_.shuffle(_.map(
			new Array(length), function (v, k) { return k + 1; })));
	}

	public getSlotCount(): number {
		return this.solution.length;
	}

	public test(board: Board): number {
		let correct = 0;
		for (let i = 0, len = this.solution.length; i < len; i++) {
			if (board.getSlot(i).quantity == this.solution[i]) {
				correct++;
			}
		}
		return correct;
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

class Solver {
	private puzzle: Puzzle;
	private board: Board;
	private lastCorrect: number;

	public constructor(puzzle: Puzzle) {
		this.puzzle = puzzle;

		// first guess
		this.board = new Board(_.map(new Array(this.puzzle.getSlotCount()),
			function (v, k) { return k + 1; }));

		// begin
		this.testGuess();
	}

	public static solve(puzzle: Puzzle) {
		return new Solver(puzzle);
	}

	private guesses = 0;
	public testGuess() {
		this.guesses++;
		let correct = this.puzzle.test(this.board);
		let delta = correct - this.lastCorrect || 0;
		Log.out(`${correct} (${delta < 0 ? delta : `+${delta}`})  ${this.board}`);
		this.board.render();
		if (correct == this.puzzle.getSlotCount()) {
			Log.out(`You win in ${this.guesses} guesses.`);
			return;
		}

		let twoMaybes = false;
		// try again
		let previous = this.board.getMove(-1);
		if (null != previous) {
			if (delta == 0) {
				// no difference; both are wrong
				this.board.setDeduction("NO", "NO");

				// TRICKY: if previous swap was MAYBE, MAYBE deduce remaining MAYBE => YES
				this.board.setRemainderDeduction("MAYBE", "MAYBE", "YES");
			}
			else if (delta == 1) {
				// if either of these MAYBEs has ever been NO before, then the other is YES now
				if (this.board.hadDeductionAtIndex(previous.after.a, "NO")) {
					this.board.getSlot(previous.after.a.index).setDeduction("YES");
					this.board.getSlot(previous.after.b.index).setDeduction("NO");
				}
				else if (this.board.hadDeductionAtIndex(previous.after.b, "NO")) {
					this.board.getSlot(previous.after.b.index).setDeduction("YES");
					this.board.getSlot(previous.after.a.index).setDeduction("NO");
				}
				else {
					// difference; one is now right, but we don't know which
					// unless we have history to narrow it, then we have specific match
					this.board.setDeduction("MAYBE", "MAYBE");
					twoMaybes = true;
				}
			}
			else if (delta == 2) {
				// very positive difference; both are now right for sure
				this.board.setDeduction("YES", "YES");

				// if last two were also maybes, then the third is YES
			}
			else if (delta == -1) {
				// difference; one was right, but we don't know which

				// TRICKY: if swap MAYBE, NO = -1 then REVERSE and deduce MAYBE => YES

				// if previously MAYBE, MAYBE, but now -1, then a is YES
				if (previous.after.a.deduction == "MAYBE" && previous.after.b.deduction == "MAYBE")
				{
					this.board.getSlot(previous.after.a.index)
				}

				this.board.unswap();
				correct = this.lastCorrect;
				this.board.setDeduction("MAYBE", "MAYBE");
				twoMaybes = true;

				this.board.setRemainderDeduction("MAYBE", "MAYBE", "YES");
			}
			else if (delta == -2) {
				// difference; both were right for sure
				this.board.unswap();
				correct = this.lastCorrect;
				this.board.setDeduction("YES", "YES");
				// if last two were also maybes, then the third is YES
			}
		}
		// swap next pair
		let candidates: number[] = [];
		let priorityCandidates = [];
		if (twoMaybes) {
			// a MAYBE, MAYBE result should always be followed by 
			// a swap containing a) one of the original maybes, and b) one new maybe
			priorityCandidates.push(this.board.getMove(-1).after.a.index);
		}
		for (let i = 0, len = this.puzzle.getSlotCount(); i < len; i++) {
			//console.log("candidate ", { i: i, d: this.board.getSlot(i).deduction });
			if ("YES" != this.board.getSlot(i).deduction && priorityCandidates[0] != i) {
				candidates.push(i);
			}
		}
		if (candidates.length < 2) {
			Log.out("Only one unknown remains yet puzzle isn't solved? Impossible!");
			console.log(candidates);
			return;
		}
		candidates = _.shuffle(candidates).concat(priorityCandidates);
		this.board.swap(candidates.pop(), candidates.pop());

		this.lastCorrect = correct;
		setTimeout(() => this.testGuess(), GUESS_DELAY);
	}
}



// history: Move: Pair: Slot

type Deduction = "UNKNOWN" | "NO" | "MAYBE" | "YES";

class Slot {
	index: number;
	symbol: string;
	quantity: number;
	deduction: Deduction;
	remainder: Slot;

	public setDeduction(deduction: Deduction)
	{
		this.deduction = deduction;
		Log.out(`          ${this.quantity} ${this.deduction[0]} => ${deduction[0]}`);
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

class Move {
	before: Pair;
	after: Pair;
}

class Board {
	private static symbols = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
	private board: Slot[] = [];
	private history: Move[] = []; // history of moves

	public constructor(quantities: number[]) {
		for (let i = 0, len = quantities.length; i < len; i++) {
			let slot = new Slot();
			slot.index = i;
			slot.symbol = Board.symbols.substr(i, 1);
			slot.quantity = quantities[i];
			slot.deduction = "UNKNOWN";
			this.board.push(slot);
		}
	}

	public swap(a: number, b: number) {
		// record before
		let move = new Move();
		let pairBefore = new Pair();
		pairBefore.a = _.clone(this.board[a]);
		pairBefore.b = _.clone(this.board[b]);
		move.before = pairBefore;

		// move
		Log.out(`          ${this.board[a].quantity} <> ${this.board[b].quantity}`);
		let c = this.board[a];
		this.board[a] = this.board[b];
		this.board[b] = c;
		this.board[a].index = b;
		this.board[b].index = a;

		// record after
		let pairAfter = new Pair();
		pairAfter.a = this.board[a];
		pairAfter.b = this.board[b];
		move.after = pairAfter;
		this.history.push(move);
	}

	// determine whether a quantity has ever had a given deduction at a specific index in entire history
	public hadDeductionAtIndex(slot: Slot, deduction: Deduction): boolean {
		for (let i=0,len=this.history.length; i<len; i++) {
			let pair = this.history[i].after;
			if (
				(pair.a.quantity == slot.quantity && 
				 pair.a.deduction == deduction && 
				 pair.a.index == slot.index) ||
				(pair.b.quantity == slot.quantity && 
				 pair.b.deduction == deduction && 
				 pair.b.index == slot.index)
			) {
				return true;
			}
		}
		return false;
	}

	public setRemainderDeduction(a: Deduction, b: Deduction, c: Deduction) {
		let previous = this.getMove(-1);
		if (previous.before.matchesDeductions(a, b)) {
			let slot = this.getSlot(previous.before.a.index);
			slot.setDeduction(c);
		}
	}

	public setDeduction(a: Deduction, b: Deduction) {
		let lastPair = this.history[this.history.length - 1].after;
		lastPair.a.setDeduction(a);
		lastPair.b.setDeduction(b);
	}

	public unswap() {
		let lastPair = this.history[this.history.length - 1].after;
		this.swap(lastPair.a.index, lastPair.b.index);
		Log.out(`        ${this}`);
	}

	public toString(): string {
		return this.board.join(" ");
	}

	public getMove(delta: number) {
		return this.history[this.history.length + delta];
	}

	public getSlot(index: number) {
		return this.board[index];
	}

	public render() {
		for (let i = 0, len = this.board.length; i < len; i++) {
			let slot = this.getSlot(i);
			$("td#c" + i).text(slot.quantity + " " + slot.deduction[0]);
		}
	}
}


const GUESS_DELAY = 250; // ms
const SLOT_COUNT = 6;
//let puzzle = PuzzleDemo.random(SLOT_COUNT);
let puzzle = new PuzzleDemo([2, 3, 4, 1, 6, 5]);
//let human = new HumanPuzzleInterface(SLOT_COUNT);
Solver.solve(puzzle);