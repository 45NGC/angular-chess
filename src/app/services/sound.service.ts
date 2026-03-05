import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SoundService {
  private moveAudio = new Audio('assets/sounds/move.mp3');
  private captureAudio = new Audio('assets/sounds/capture.mp3');
  private checkAudio = new Audio('assets/sounds/check.mp3');
  private endAudio = new Audio('assets/sounds/end.mp3');

  constructor() {
    this.moveAudio.load();
    this.captureAudio.load();
    this.checkAudio.load();
    this.endAudio.load();
  }

  playMove(): void {
    this.play(this.moveAudio);
  }

  playCapture(): void {
    this.play(this.captureAudio);
  }


  playCheck(): void {
    this.play(this.checkAudio);
  }


  playEnd(): void {
    this.play(this.endAudio);
  }

  private play(audio: HTMLAudioElement): void {
    audio.currentTime = 0;
    audio.play().catch(error => console.warn('Audio play failed:', error));
  }
}