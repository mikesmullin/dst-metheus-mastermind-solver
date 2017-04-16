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
		if (this.guesses > MAX_GUESSES) {
			Log.out("Too many guesses; we lose.");
			return;
		}
		let correct = this.puzzle.test(this.board);
		let delta = correct - this.lastCorrect || 0;
		Log.out(`${correct} (${delta < 0 ? delta : `+${delta}`})  ${this.board}`);
		this.board.render();
		if (correct == this.puzzle.getSlotCount()) {
			Log.out(`You win in ${this.guesses} guesses.`);
			return;
		}

		// try again
		let move = this.board.getMove(-1);
		let twoMovesAgo = this.board.getMove(-2);
		let priorityCandidates = [];
		let nonCandidates = [];
		if (null != move) {
			move.delta = delta;
			if (delta == 0) {
				// no difference; both must be NO?
				move.after.a.setDeduction("NO");
				move.after.b.setDeduction("NO");

				if ( // if two moves ago we gained one
					(null != twoMovesAgo && twoMovesAgo.delta == 1 &&
						// and it was M,M
						twoMovesAgo.after.a.deduction == "MAYBE" &&
						twoMovesAgo.after.b.deduction == "MAYBE")
				) {
					Log.out("experimental 2");
					// then the slot that we moved last
					// which was part of the pair two moves ago
					// must be Y
					// and the other N
					if (
						(move.after.a.quantity == twoMovesAgo.after.a.quantity) ||
						(move.after.b.quantity == twoMovesAgo.after.a.quantity)
					) {
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
				let threeMovesAgo = this.board.getMove(-3);

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
			if (
				(move.after.a.deduction == "MAYBE" && move.after.b.deduction == "MAYBE") ||
				(move.after.a.deduction == "NO" && move.after.b.deduction == "NO")
			) {
				// ensure next swap contains one slot from this last pair
				// and one random other slot
				priorityCandidates.push(move.after.a);
				// which is not the other slot we just tried
				nonCandidates.push(move.after.b);
			}
		}

		let a, b, allGood = false;
		do {
			// select next pair
			let randomCandidates: Slot[] = [];
			for (let i = 0, len = this.puzzle.getSlotCount(); i < len; i++) {
				let slot = this.board.getSlot(i);
				if ("YES" != slot.deduction && priorityCandidates[0] != slot) {
					randomCandidates.push(slot);
				}
			}
			let candidates = _.difference((randomCandidates).concat(priorityCandidates), nonCandidates);
			if (candidates.length < 2) {
				Log.out("Only one unknown remains yet puzzle isn't solved? Impossible!");
				console.log(candidates);
				return;
			}
			Log.out("--");
			let format = (a: Slot[]) =>
				_.map(a, (slot) => `${slot.quantity} ${slot.deduction}`).join(", ");
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
		}
		while (!allGood);
		this.board.swap(a.index, b.index);

		this.lastCorrect = correct;
		setTimeout(() => this.testGuess(), GUESS_DELAY);
	}
}



// history: Move: Pair: Slot

type Deduction = "UNKNOWN" | "NO" | "MAYBE" | "YES";

class Slot {
	index: number;
	quantity: number;
	deduction: Deduction;

	public setDeduction(deduction: Deduction) {
		this.deduction = deduction;
		Log.out(`          ${this.quantity} ${this.deduction[0]} => ${deduction[0]}${deduction == "YES" ? " FOUND" : ""}`);
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
	delta: number;
}

class Board {
	private board: Slot[] = [];
	private history: Move[] = []; // history of moves

	public constructor(quantities: number[]) {
		for (let i = 0, len = quantities.length; i < len; i++) {
			let slot = new Slot();
			slot.index = i;
			slot.quantity = quantities[i];
			slot.deduction = "UNKNOWN";
			this.board.push(slot);
		}
	}

	public swap(aIndex: number, bIndex: number) {
		// record before
		let a = this.board[aIndex];
		let b = this.board[bIndex];
		Log.out(`          ${a.quantity} <> ${b.quantity}`);
		let move = new Move();
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
		let aa = new Slot();
		aa.index = b.index;
		aa.quantity = a.quantity;
		aa.deduction = a.deduction;
		let bb = new Slot();
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
	}

	// determine whether a quantity has ever had a given deduction at a specific index in entire history
	public hadDeductionAtIndex(quantity: number, index: number, deduction: Deduction): boolean {
		for (let i = 0, len = this.history.length; i < len; i++) {
			let pair = this.history[i].after;
			if (
				(pair.a.quantity == quantity &&
					pair.a.deduction == deduction &&
					pair.a.index == index) ||
				(pair.b.quantity == quantity &&
					pair.b.deduction == deduction &&
					pair.b.index == index)
			) {
				Log.out(`${quantity} index ${index} deduction ${deduction[0]} happened before at move ${i}`);
				return true;
			}
		}
		return false;
	}

	public alreadyTried(q1: number, i1: number, q2: number, i2: number): boolean {
		for (let i = 0, len = this.history.length; i < len; i++) {
			let pair = this.history[i].after;
			if (
				(pair.a.quantity == q1 &&
					pair.a.index == i1) ||
				(pair.b.quantity == q2 &&
					pair.b.index == i2)
			) {
				Log.out(`${q1}:${i1},${q2}:${i2} happened before at move ${i}`);
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

	public unswap() {
		let lastPair = this.history[this.history.length - 1].after;
		this.swap(lastPair.a.index, lastPair.b.index);
		this.getMove(-1).delta = this.getMove(-2).delta * -1;
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


const GUESS_DELAY = 50; // ms
const MAX_GUESSES = 99;
const SLOT_COUNT = 6;
//let puzzle = PuzzleDemo.random(SLOT_COUNT);
//let puzzle = new PuzzleDemo([2, 3, 4, 1, 6, 5]);
let puzzle = new PuzzleDemo([2, 4, 6, 1, 5, 3]);
//let puzzle = new PuzzleDemo([2, 1, 5, 6, 3, 4]);
// TODO: try a puzzle where numbers can repeat
//let human = new HumanPuzzleInterface(SLOT_COUNT);
Solver.solve(puzzle);