import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToolbarComponent } from './components/toolbar/toolbar.component';
import { CanvasComponent } from './components/canvas/canvas.component';
import { InstructionsComponent } from './components/instructions/instructions.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToolbarComponent, CanvasComponent, InstructionsComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected title = 'AutomataLab';
}
