
export interface Move {
	from: number;
	to: number;
	promotion?: 'queen' | 'rook' | 'bishop' | 'knight';
	enPassant?: boolean;
}
