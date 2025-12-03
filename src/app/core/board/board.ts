import { Piece, PieceColor } from './piece';

export type Square = number;

/**
 * Board index reference (0..63)
 *
 *    a   b   c   d   e   f   g   h
 *  ---------------------------------
 * 8| 56  57  58  59  60  61  62  63
 * 7| 48  49  50  51  52  53  54  55
 * 6| 40  41  42  43  44  45  46  47
 * 5| 32  33  34  35  36  37  38  39
 * 4| 24  25  26  27  28  29  30  31
 * 3| 16  17  18  19  20  21  22  23
 * 2|  8   9  10  11  12  13  14  15
 * 1|  0   1   2   3   4   5   6   7
 *  ---------------------------------
 *
 * index = rank * 8 + file
 * rank = Math.floor(index / 8)
 * file = index % 8
 *
 * Examples:
 *
 *  const pawnSquare = toIndex(1, 4);
 *  rank 1, file 4 → square "e2" → index 12
 *
 *  const kingSquare = toIndex(0, 4);
 *  rank 0, file 4 → square "e1" → index 4
 *
 *  const queenSquare = toIndex(3, 3);
 *  rank 0, file 2 → square "d1" → index 3
 */


export class Board {
	squares: (Piece | null)[] = new Array(64).fill(null);

	constructor(initial?: (Piece | null)[]) {
		if (initial) this.squares = [...initial];
	}

	get(square: Square): Piece | null {
		return this.squares[square];
	}

	set(square: Square, piece: Piece | null): void {
		this.squares[square] = piece;
	}

	clone(): Board {
		return new Board([...this.squares]);
	}

	findKing(color: PieceColor): number {
		for (let square = 0; square < 64; square++) {
			const piece = this.squares[square];
			if (piece && piece.type === 'king' && piece.color === color) {
				return square;
			}
		}
		throw new Error(`King of color ${color} not found on board`);
	}
}

/**
 * Converts (rank, file) → index 0..63
 * rank: 0..7  → rows (0 = rank 1)
 * file: 0..7  → columns (0 = column a)
 */
export function toIndex(rank: number, file: number): number {
	return rank * 8 + file;
}

/**
 * Converts index 0..63 → { rank, file }
 */
export function fromIndex(index: number): { rank: number; file: number } {
	return {
		rank: Math.floor(index / 8),
		file: index % 8
	};
}
