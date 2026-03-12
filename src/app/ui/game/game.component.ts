import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { GameOverDialogComponent } from './game-over-dialog/game-over-dialog.component';
import { PromotionDialogComponent } from './promotion-dialog/promotion-dialog.component';
import { BOARD_SIZE } from '../../core/constants/chess.constants';
import { IGameService } from '../../interfaces/game-service.interface';
import { LocalGameService } from '../../services/local-game.service';
import { SoundService } from '../../services/sound.service';

@Component({
	selector: 'app-game',
	standalone: true,
	imports: [CommonModule, GameOverDialogComponent, PromotionDialogComponent],
	templateUrl: './game.component.html',
	styleUrls: ['./game.component.css']
})
export class GameComponent implements OnInit {
	ranks = Array.from({ length: BOARD_SIZE }, (_, i) => 7 - i);
	files = Array.from({ length: BOARD_SIZE }, (_, i) => i);

	gameService: IGameService | null = null;

	get state() { return this.gameService?.state; }
	get selectedSquare() { return this.gameService?.selectedSquare ?? null; }
	get legalMoves() { return this.gameService?.legalMoves ?? []; }
	get showGameOverDialog() { return this.gameService?.showGameOverDialog ?? false; }
	get showPromotionDialog() { return this.gameService?.showPromotionDialog ?? false; }
	get pendingPromotionMoves() { return this.gameService?.pendingPromotionMoves ?? null; }

	constructor(private route: ActivatedRoute, private soundService: SoundService) { }

	ngOnInit(): void {
		this.route.paramMap.subscribe(params => {
			const mode = params.get('mode');
			console.log('Gamemode : ', mode);
			this.selectService(mode);
		});
	}

	private selectService(mode: string | null): void {
		switch (mode) {
			case 'local':
				this.gameService = new LocalGameService(this.soundService);
				break;
			default:
				console.error('Modo de juego no soportado:', mode);
				this.gameService = null;
		}
	}

	pieceToImage(piece: any): string | null {
		if (!piece) return null;
		return `../../assets/pieces/${piece.color}-${piece.type}.png`;
	}

	onSquareClick(rank: number, file: number): void {
		this.gameService?.handleSquareClick(rank, file);
	}

	isLegalTarget(square: number): boolean {
		return this.legalMoves.some(m => m.to === square);
	}

	resetGame(): void {
		this.gameService?.resetGame();
	}

	getResultMessage(): string {
		return this.gameService?.getResultMessage() ?? '';
	}

	onPromotionSelected(pieceType: 'queen' | 'rook' | 'bishop' | 'knight'): void {
		this.gameService?.onPromotionSelected(pieceType);
	}

	closePromotionDialog(): void {
		this.gameService?.closePromotionDialog();
	}

	onRestart(): void {
		this.resetGame();
	}

	onExit(): void {
		this.gameService?.closeGameOverDialog();
	}
}