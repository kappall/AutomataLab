import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CanvasService } from 'app/services/canvas.service';

@Component({
  selector: 'app-toolbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toolbar.component.html',
  styleUrls: ['./toolbar.component.scss']
})
export class ToolbarComponent {
  currentMode: string = 'move';
  customNames: boolean = false;
  isFullscreen: boolean = false;

  constructor(private canvasService: CanvasService) {}

  setMode(mode: string): void {
    this.currentMode = mode;
    this.canvasService.setMode(mode);
  }

  isActive(mode: string): boolean {
    return this.currentMode === mode;
  }

  toggleCustomNames(): void {
    this.customNames = !this.customNames;
    this.canvasService.setCustomNames(this.customNames);
  }

  exportCanvas(): void {
    this.canvasService.exportCanvas();
  }

  toggleFullscreen(): void {
    this.isFullscreen = !this.isFullscreen;
    this.canvasService.toggleFullscreen(this.isFullscreen);
  }
}