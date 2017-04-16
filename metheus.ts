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
		
		// try again
		if (null != this.board.getMove(-1)) {
			if (correct == this.lastCorrect) {
				// no difference; both are wrong
				this.board.setDeduction("NO", "NO");
			}
			else if (correct == this.lastCorrect + 1) {
				// difference; one is now right, but we don't know which
				// unless we have history to narrow it, then we have specific match
				this.board.setDeduction("MAYBE", "MAYBE");
			}
			else if (correct == this.lastCorrect + 2) {
				// very positive difference; both are now right for sure
				this.board.setDeduction("YES", "YES");
			}
			else if (correct == this.lastCorrect - 1) {
				// difference; one was right, but we don't know which

				// if one was a maybe and one was not, then one is now a for sure

				this.board.unswap();
				correct = this.lastCorrect;
				this.board.setDeduction("MAYBE", "MAYBE");
			}
			else if (correct == this.lastCorrect - 2) {
				// difference; both were right for sure
				this.board.unswap();
				correct = this.lastCorrect;
				this.board.setDeduction("YES", "YES");
			}
		}
		// swap next pair
		let candidates: number[] = [];
		for (let i = 0, len = this.puzzle.getSlotCount(); i < len; i++) {
			//console.log("candidate ", { i: i, d: this.board.getSlot(i).deduction });
			if ("YES" != this.board.getSlot(i).deduction) {
				candidates.push(i);
			}
		}
		if (candidates.length < 2) {
			Log.out("Only one unknown remains yet puzzle isn't solved? Impossible!");
			console.log(candidates);
			return;
		}
		candidates = _.shuffle(candidates);
		this.board.swap(candidates.pop(), candidates.pop());

		this.lastCorrect = correct;
		setTimeout(() => this.testGuess(), GUESS_DELAY);
	}
}



// history: Move: Pair: Slot

type Deduction = "UNKNOWN" | "NO" | "MAYBE" | "YES";

class Slot {
	symbol: string;
	quantity: number;
	deduction: Deduction;

	public toString() {
		return this.quantity;
	}
}

class Pair {
	public a: Slot;
	public b: Slot;
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
		Log.out(`        m: ${this.board[a].quantity} <> ${this.board[b].quantity}`);
		let c = this.board[a];
		this.board[a] = this.board[b];
		this.board[b] = c;

		// record after
		let pairAfter = new Pair();
		pairAfter.a = _.clone(this.board[a]);
		pairAfter.b = _.clone(this.board[b]);
		move.after = pairAfter;
		this.history.push(move);
	}

	public setDeduction(a: Deduction, b: Deduction) {
		let lastPair = this.history[this.history.length - 1].after;
		Log.out(`        d: ${lastPair.a.quantity} ${lastPair.a.deduction[0]} => ${a[0]}, ${lastPair.b.quantity} ${lastPair.b.deduction[0]} => ${b[0]}`);
		let ai = this.board.indexOf(lastPair.a);
		lastPair.a.deduction = this.board[this.findSlotIndex(lastPair.a)].deduction = a;
		lastPair.b.deduction = this.board[this.findSlotIndex(lastPair.b)].deduction = b;
	}

	public findSlotIndex(slot: Slot): number
	{
		for (let i=0,len=this.board.length; i<len; i++)
		{
			if (slot.quantity == this.board[i].quantity)
			{
				return i;
			}
		}
		throw "Quantity not found on board? Impossible!";
	}

	public unswap() {
		let lastPair = this.history[this.history.length - 1].after;
		this.swap(this.findSlotIndex(lastPair.a), this.findSlotIndex(lastPair.b));
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
			$("td#c" + i).text(slot.quantity +" "+ slot.deduction[0]);
		}
	}
}


const GUESS_DELAY = 250; // ms
const SLOT_COUNT = 6;
let puzzle = PuzzleDemo.random(SLOT_COUNT);
//let human = new HumanPuzzleInterface(SLOT_COUNT);
Solver.solve(puzzle);