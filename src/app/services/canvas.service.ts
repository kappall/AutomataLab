import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CanvasService {
  private modeSubject = new BehaviorSubject<string>('move');
  currentMode$ = this.modeSubject.asObservable();

  private customNamesSubject = new BehaviorSubject<boolean>(false);
  customNames$ = this.customNamesSubject.asObservable();

  private fullscreenSubject = new BehaviorSubject<boolean>(false);
  fullscreen$ = this.fullscreenSubject.asObservable();

  private exportRequested = new Subject<void>();
  exportRequested$ = this.exportRequested.asObservable();

  setMode(mode: string): void {
    this.modeSubject.next(mode);
  }

  setCustomNames(enabled: boolean): void {
    this.customNamesSubject.next(enabled);
  }

  toggleFullscreen(isFs: boolean): void {
    this.fullscreenSubject.next(isFs);
  }

  exportCanvas(): void {
    this.exportRequested.next();
  }
}