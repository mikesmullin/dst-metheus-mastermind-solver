/// <reference path="node_modules/@types/jquery/index.d.ts" />
/// <reference path="node_modules/@types/lodash/index.d.ts" />

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
			if (board.slots[i].quantity == this.solution[i]) {
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

type Deduction = "UNKNOWN" | "NO" | "MAYBE" | "YES";
const UNKNOWN = "UNKNOWN";
const NO = "NO";
const MAYBE = "MAYBE";
const YES = "YES";

class Move {
	num: number;
	prev: Move;
	board: Board;
	pair: Pair;
	correct: number;
	delta: number;

	public render() {
		let s = "";
		for (let i = 0, len = this.board.slots.length; i < len; i++) {
			let slot = this.board.slots[i];
			s += (
				slot.quantity == this.pair.a.quantity ||
				slot.quantity == this.pair.b.quantity
			) ?
				`<b>${slot.quantity}${slot.deduction[0]}</b> `
				:
				`${slot.quantity}${slot.deduction[0]} `;
		}
		s += ` = ${this.correct} (${this.delta < 0 ? this.delta : `+${this.delta}`})`;
		Log.html(s);
	}
}

class Slot {
	index: number;
	quantity: number;
	deduction: Deduction;

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
	private board: Board;
	private moves: number = 0;
	public lastMove: Move; // history of moves

	public static solve(puzzle: Puzzle) {
		return new Solver(puzzle);
	}

	public constructor(puzzle: Puzzle) {
		this.puzzle = puzzle;

		// first guess
		this.board = new Board(_.map(new Array(this.puzzle.getSlotCount()), (nil, i) => {
			let slot = new Slot();
			slot.index = i;
			slot.quantity = i + 1;
			slot.deduction = UNKNOWN;
			return slot;
		}));

		// begin
		this.testGuess();
	}

	public testGuess() {
		if (this.moves > MAX_GUESSES) {
			Log.out("Too many guesses; we lose.");
			return;
		}

		{
			let correct = this.puzzle.test(this.board);
			let delta = correct - (null != this.lastMove ? this.lastMove.correct : 0);
			this.board.render();
			if (null != this.lastMove) {
				this.lastMove.correct = correct;
				this.lastMove.delta = delta;
				this.lastMove.render();
			}			
			if (correct == this.puzzle.getSlotCount()) {
				Log.out(`You win in ${this.moves} moves.`);
				return;
			}
		}

		// try again
		let priorityCandidates = [];
		let nonCandidates = [];
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
			if (
				(this.lastMove.pair.a.deduction == MAYBE && this.lastMove.pair.b.deduction == MAYBE) ||
				(this.lastMove.pair.a.deduction == NO && this.lastMove.pair.b.deduction == NO)
			) {
				// ensure next swap contains one slot from this last pair
				// and one random other slot
				priorityCandidates.push(this.lastMove.pair.a);
				// which is not the other slot we just tried
				nonCandidates.push(this.lastMove.pair.b);
			}
		}

		let a, b, allGood = false;
		do {
			// select next pair
			let randomCandidates: Slot[] = [];
			for (let i = 0, len = this.puzzle.getSlotCount(); i < len; i++) {
				let slot = this.board.slots[i];
				if (YES != slot.deduction && priorityCandidates[0] != slot) {
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
				_.map(a, (slot) => `${slot.quantity}${slot.deduction[0]}@${slot.index}`).join(", ");
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
		}
		while (!allGood);
		this.swap(a.index, b.index);

		setTimeout(() => this.testGuess(), GUESS_DELAY);
	}

	public swap(aIndex: number, bIndex: number) {
		let move = new Move();
		move.num = ++this.moves;
		let oldA = _.cloneDeep(this.board.slots[aIndex]);
		let oldB = _.cloneDeep(this.board.slots[bIndex]);
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
		Log.out(`          ${move.pair.a.quantity} <> ${move.pair.b.quantity}`);
	}

	// determine whether a quantity has ever had a given deduction at a specific index in entire history
	public hadDeductionAtIndex(quantity: number, index: number, deduction: Deduction): boolean {
		while (null != this.lastMove) {
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
		while (null != this.lastMove) {
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
		this.swap(this.lastMove.pair.a.index, this.lastMove.pair.b.index);
		// assume result is same as before
		this.lastMove.correct = this.lastMove.prev.correct;
		this.lastMove.delta = this.lastMove.prev.delta;
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