import { Injectable } from '@angular/core';

@Injectable({
	providedIn: 'root'
})
export class OnlineRoomCodeService {
	private readonly alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

	generateCode(length = 6): string {
		let code = '';
		for (let index = 0; index < length; index++) {
			const randomIndex = Math.floor(Math.random() * this.alphabet.length);
			code += this.alphabet[randomIndex];
		}
		return code;
	}

	normalizeCode(value: string | null | undefined): string {
		return (value ?? '')
			.toUpperCase()
			.replace(/[^A-Z0-9]/g, '')
			.slice(0, 6);
	}

	isValidCode(value: string | null | undefined): boolean {
		return this.normalizeCode(value).length === 6;
	}
}
