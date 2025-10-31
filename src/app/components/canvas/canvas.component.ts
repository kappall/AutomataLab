import { Component, ElementRef, ViewChild, OnInit, AfterViewInit, OnDestroy, Renderer2 } from '@angular/core';
import { CanvasService } from 'app/services/canvas.service';
import { Subscription } from 'rxjs';
import { State } from '../../models/state.model';
import { Transition } from '../../models/transition.model';

@Component({
  selector: 'app-canvas',
  templateUrl: './canvas.component.html',
  styleUrls: ['./canvas.component.scss']
})
export class CanvasComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  states: State[] = [];
  transitions: Transition[] = [];
  currentMode: string = 'move';
  isDragging = false;
  selectedState: State | null = null;
  transitionStart: State | null = null;
  dragOffsetX = 0;
  dragOffsetY = 0;
  stateCounter = 0;
  stateRadius = 30;

  private ctx!: CanvasRenderingContext2D;
  private subs: Subscription[] = [];
  private customNames = false;
  private isFullscreen = false;

  constructor(
    private canvasService: CanvasService,
    private renderer: Renderer2
  ) {}

  ngOnInit() {
    this.subs.push(this.canvasService.currentMode$.subscribe(m => {
      this.currentMode = m;
      this.setCursorForMode(m);
    }));
    window.addEventListener('resize', () => this.resizeCanvas());
    this.subs.push(this.canvasService.customNames$.subscribe(v => this.customNames = v));
    // Fullscreen: use Fullscreen API if possible, but always toggle CSS classes.
    this.subs.push(this.canvasService.fullscreen$.subscribe(fs => {
      this.isFullscreen = fs;
      const main = document.querySelector('.main-container') as HTMLElement | null;
      const toolbar = document.querySelector('.toolbar') as HTMLElement | null;
      const wrapper = this.hasCanvas() ? this.canvasRef.nativeElement.parentElement as HTMLElement : null;

      if (fs) {
        main?.classList.add('fullscreen');
        toolbar?.classList.add('fullscreen-toolbar');
        wrapper?.classList.add('fullscreen-canvas');
        // request browser fullscreen for the main container if not already full
        if (!document.fullscreenElement && main && typeof main.requestFullscreen === 'function') {
          const p = main.requestFullscreen();
          if (p && typeof p.then === 'function') p.catch(() => {/* ignore user-block */});
        }
      } else {
        main?.classList.remove('fullscreen');
        toolbar?.classList.remove('fullscreen-toolbar');
        wrapper?.classList.remove('fullscreen-canvas');
        // exit browser fullscreen if currently in one
        if (document.fullscreenElement && typeof document.exitFullscreen === 'function') {
          const p = document.exitFullscreen();
          if (p && typeof p.then === 'function') p.catch(() => {/* ignore */});
        }
      }
      if (this.hasCanvas()) this.resizeCanvas();
    }));
    this.subs.push(this.canvasService.exportRequested$.subscribe(() => this.exportCanvas()));
  }

  ngAfterViewInit() {
    this.ctx = this.canvasRef.nativeElement.getContext('2d')!;
    this.resizeCanvas();
    this.setCursorForMode(this.currentMode);

    const c = this.canvasRef.nativeElement;
    c.addEventListener('mousedown', this.onCanvasMouseDown);
    c.addEventListener('mousemove', this.onCanvasMouseMove);
    c.addEventListener('mouseup', this.onCanvasMouseUp);
    c.addEventListener('mouseleave', this.onCanvasMouseUp);
    c.addEventListener('click', this.onCanvasClick);
  }

  ngOnDestroy() {
    this.subs.forEach(s => s.unsubscribe());
    const c = this.canvasRef?.nativeElement;
    if (c) {
      c.removeEventListener('mousedown', this.onCanvasMouseDown);
      c.removeEventListener('mousemove', this.onCanvasMouseMove);
      c.removeEventListener('mouseup', this.onCanvasMouseUp);
      c.removeEventListener('mouseleave', this.onCanvasMouseUp);
      c.removeEventListener('click', this.onCanvasClick);
    }
  }

  // event wrappers to preserve `this`
  private onCanvasClick = (e: MouseEvent) => this.handleClick(e);
  private onCanvasMouseDown = (e: MouseEvent) => this.handleMouseDown(e);
  private onCanvasMouseMove = (e: MouseEvent) => this.handleMouseMove(e);
  private onCanvasMouseUp = (e: MouseEvent) => this.handleMouseUp(e);

  private handleClick(event: MouseEvent) {
    const pos = this.getMousePos(event);
    const clicked = this.getStateAtPos(pos);

    switch (this.currentMode) {
      case 'addState': {
        let nameSuffix = this.stateCounter;
        if (this.customNames) {
          const val = window.prompt('Enter state name:', `${nameSuffix}`);
          const newState: State = {
            id: `${this.stateCounter}`,
            name: `${val}`,
            x: pos.x,
            y: pos.y,
            isInitial: this.states.length === 0,
            isFinal: false
          };
          this.states.push(newState);
          this.stateCounter++;
          break;
        }
        const newState: State = {
          id: `${this.stateCounter}`,
          name: `q${nameSuffix}`,
          x: pos.x,
          y: pos.y,
          isInitial: this.states.length === 0,
          isFinal: false
        };
        this.states.push(newState);
        this.stateCounter++;
        break;
      }

      case 'addTransition': {
        if (clicked) {
          if (!this.transitionStart) {
            this.transitionStart = clicked;
          } else {
            const symbol = window.prompt('Enter transition symbol(s):', 'a');
            if (symbol !== null && symbol !== '') {
              this.transitions.push({
                id: `${Date.now()}`,
                from: this.transitionStart.id,
                to: clicked.id,
                symbol
              });
            }
            this.transitionStart = null;
          }
        }
        break;
      }

      case 'setInitial': {
        if (clicked) {
          this.states.forEach(s => s.isInitial = (s.id === clicked.id));
        }
        break;
      }

      case 'setFinal': {
        if (clicked) {
          clicked.isFinal = !clicked.isFinal;
        }
        break;
      }

      case 'delete': {
        if (clicked) {
          this.states = this.states.filter(s => s.id !== clicked.id);
          this.transitions = this.transitions.filter(t => t.from !== clicked.id && t.to !== clicked.id);
          if (this.states.length === 0) this.stateCounter = 0;
        }
        break;
      }
    }
    this.draw();
  }

  private handleMouseDown(event: MouseEvent) {
    const pos = this.getMousePos(event);
    const clicked = this.getStateAtPos(pos);
    if (this.currentMode=== 'move') {
      if (clicked) {
        this.isDragging = true;
        this.selectedState = clicked;
        this.dragOffsetX = pos.x - clicked.x;
        this.dragOffsetY = pos.y - clicked.y;
        this.canvasRef.nativeElement.style.cursor = 'grabbing';
      }
    }
  }

  private handleMouseMove(event: MouseEvent) {
    if (this.isDragging && this.selectedState) {
      const pos = this.getMousePos(event);
      this.selectedState.x = pos.x - this.dragOffsetX;
      this.selectedState.y = pos.y - this.dragOffsetY;
      this.draw();
    }
  }

  private handleMouseUp(event: MouseEvent) {
    if (this.isDragging) {
      this.isDragging = false;
      this.selectedState = null;
      this.canvasRef.nativeElement.style.cursor = this.getCursorForMode(this.currentMode);
    }
  }

  private getCursorForMode(mode: string) {
    switch (mode) {
      case 'addState': return 'crosshair';
      case 'addTransition': return 'pointer';
      case 'setInitial':
      case 'setFinal':
      case 'delete': return 'pointer';
      case 'move': return 'grab';
      default: return 'default';
    }
  }

  private getMousePos(e: MouseEvent) {
    if (!this.hasCanvas()) return { x: 0, y: 0 };
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();

    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  private getStateAtPos(pos: { x: number; y: number; }) {
    for (let i = this.states.length - 1; i >= 0; i--) {
      const s = this.states[i];
      const d = Math.hypot(pos.x - s.x, pos.y - s.y);
      if (d <= this.stateRadius) return s;
    }
    return null;
  }

  private draw() {
    this.clearCanvas();
    // background
    this.ctx.fillStyle = '#f9fafb';
    this.ctx.fillRect(0, 0, this.canvasRef.nativeElement.width, this.canvasRef.nativeElement.height);
    this.drawTransitions();
    this.drawStates();
  }

  private clearCanvas() {
    const c = this.canvasRef.nativeElement;
    this.ctx.clearRect(0, 0, c.width, c.height);
  }

  private drawStates() {
    this.states.forEach(state => {
      this.ctx.save();
      // outer circle
      this.ctx.beginPath();
      this.ctx.arc(state.x, state.y, this.stateRadius, 0, Math.PI * 2);
      this.ctx.fillStyle = 'white';
      this.ctx.fill();
      this.ctx.strokeStyle = '#4b5563';
      this.ctx.lineWidth = 2;
      this.ctx.stroke();

      // final double circle
      if (state.isFinal) {
        this.ctx.beginPath();
        this.ctx.arc(state.x, state.y, this.stateRadius - 6, 0, Math.PI * 2);
        this.ctx.strokeStyle = '#4b5563';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
      }

      // label
      this.ctx.fillStyle = '#1f2937';
      this.ctx.font = '16px Inter';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(state.name, state.x, state.y);

      // initial arrow
      if (state.isInitial) {
        const arrowStartX = state.x - this.stateRadius - 30;
        const arrowStartY = state.y;
        this.drawArrow(arrowStartX, arrowStartY, state.x - this.stateRadius, state.y, '#4b5563');
      }
      this.ctx.restore();
    });
  }

  private drawTransitions() {
    this.transitions.forEach(t => {
      const from = this.states.find(s => s.id === t.from);
      const to = this.states.find(s => s.id === t.to);
      if (!from || !to) return;

      this.ctx.save();
      this.ctx.strokeStyle = '#374151';
      this.ctx.fillStyle = '#374151';
      this.ctx.lineWidth = 2;

      const angle = Math.atan2(to.y - from.y, to.x - from.x);

      if (from.id === to.id) {
        // self-loop
        const loopRadius = this.stateRadius / 2;
        const cx = from.x;
        const cy = from.y - this.stateRadius - loopRadius;
        const startAngle = Math.PI * 0.6;
        const endAngle = Math.PI * 2.4;
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, loopRadius, startAngle, endAngle);
        this.ctx.stroke();

        const arrowAngle = 0.4 * Math.PI;
        const arrowPoint = {
          x: cx + loopRadius * Math.cos(arrowAngle),
          y: cy + loopRadius * Math.sin(arrowAngle)
        };
        this.drawArrowhead(arrowPoint.x, arrowPoint.y, arrowAngle);

        // label
        this.ctx.font = '14px Inter';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'bottom';
        this.ctx.fillText(t.symbol, cx, cy - loopRadius - 4);
      } else {
        // curved between nodes
        const start = {
          x: from.x + this.stateRadius * Math.cos(angle),
          y: from.y + this.stateRadius * Math.sin(angle)
        };
        const end = {
          x: to.x - this.stateRadius * Math.cos(angle),
          y: to.y - this.stateRadius * Math.sin(angle)
        };

        const mid = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
        const controlOffset = 30;
        const reverseExists = this.transitions.some(tt => tt.from === to.id && tt.to === from.id);
        let control = { x: mid.x, y: mid.y };
        if (reverseExists) {
          control.x += controlOffset * Math.sin(angle);
          control.y -= controlOffset * Math.cos(angle);
        }

        this.ctx.beginPath();
        this.ctx.moveTo(start.x, start.y);
        this.ctx.quadraticCurveTo(control.x, control.y, end.x, end.y);
        this.ctx.stroke();

        // arrowhead at end using derivative approx
        const p1 = control;
        const p2 = end;
        const arrowAngle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
        this.drawArrowhead(end.x, end.y, arrowAngle);

        // label near control point
        const labelPos = {
          x: control.x + 15 * Math.sin(angle),
          y: control.y - 15 * Math.cos(angle)
        };
        this.ctx.font = '14px Inter';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(t.symbol, labelPos.x, labelPos.y);
      }
      this.ctx.restore();
    });
  }

  private drawArrow(fromx: number, fromy: number, tox: number, toy: number, color: string) {
    const angle = Math.atan2(toy - fromy, tox - fromx);
    this.ctx.save();
    this.ctx.strokeStyle = color;
    this.ctx.fillStyle = color;
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(fromx, fromy);
    this.ctx.lineTo(tox, toy);
    this.ctx.stroke();
    this.drawArrowhead(tox, toy, angle);
    this.ctx.restore();
  }

  private drawArrowhead(x: number, y: number, angle: number) {
    const headlen = 10;
    this.ctx.beginPath();
    this.ctx.moveTo(x, y);
    this.ctx.lineTo(x - headlen * Math.cos(angle - Math.PI / 6), y - headlen * Math.sin(angle - Math.PI / 6));
    this.ctx.lineTo(x - headlen * Math.cos(angle + Math.PI / 6), y - headlen * Math.sin(angle + Math.PI / 6));
    this.ctx.closePath();
    this.ctx.fill();
  }

  private getAutomataBounds() {
    if (this.states.length === 0) return null;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    this.states.forEach(s => {
      minX = Math.min(minX, s.x - this.stateRadius - 40);
      maxX = Math.max(maxX, s.x + this.stateRadius + 40);
      minY = Math.min(minY, s.y - this.stateRadius - 40);
      maxY = Math.max(maxY, s.y + this.stateRadius + 40);
    });
    return { minX, maxX, minY, maxY };
  }

  private exportCanvas() {
    if (this.states.length === 0) {
      window.alert('Nothing to export! Add some states first.');
      return;
    }
    const bounds = this.getAutomataBounds();
    if (!bounds) return;
    const padding = 20;
    const w = bounds.maxX - bounds.minX + padding * 2;
    const h = bounds.maxY - bounds.minY + padding * 2;

    const ex = document.createElement('canvas');
    ex.width = w;
    ex.height = h;
    const ec = ex.getContext('2d')!;
    ec.fillStyle = '#ffffff';
    ec.fillRect(0, 0, w, h);

    ec.save();
    ec.translate(padding - bounds.minX, padding - bounds.minY);

    // draw transitions
    this.transitions.forEach(t => {
      const from = this.states.find(s => s.id === t.from);
      const to = this.states.find(s => s.id === t.to);
      if (!from || !to) return;
      ec.strokeStyle = '#374151';
      ec.fillStyle = '#374151';
      ec.lineWidth = 2;

      const angle = Math.atan2(to.y - from.y, to.x - from.x);
      if (from.id === to.id) {
        const loopRadius = this.stateRadius / 2;
        const cx = from.x;
        const cy = from.y - this.stateRadius - loopRadius;
        ec.beginPath();
        ec.arc(cx, cy, loopRadius, Math.PI * 0.6, Math.PI * 2.4);
        ec.stroke();
        const arrowAngle = 0.4 * Math.PI;
        const arrowPoint = { x: cx + loopRadius * Math.cos(arrowAngle), y: cy + loopRadius * Math.sin(arrowAngle) };
        this.drawExportArrowhead(ec, arrowPoint.x, arrowPoint.y, arrowAngle);
        ec.font = '14px Inter';
        ec.textAlign = 'center';
        ec.textBaseline = 'bottom';
        ec.fillText(t.symbol, cx, cy - loopRadius - 4);
      } else {
        const start = { x: from.x + this.stateRadius * Math.cos(angle), y: from.y + this.stateRadius * Math.sin(angle) };
        const end = { x: to.x - this.stateRadius * Math.cos(angle), y: to.y - this.stateRadius * Math.sin(angle) };
        const mid = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
        const controlOffset = 30;
        const reverseExists = this.transitions.some(tt => tt.from === to.id && tt.to === from.id);
        let control = { x: mid.x, y: mid.y };
        if (reverseExists) {
          control.x += controlOffset * Math.sin(angle);
          control.y -= controlOffset * Math.cos(angle);
        }
        ec.beginPath();
        ec.moveTo(start.x, start.y);
        ec.quadraticCurveTo(control.x, control.y, end.x, end.y);
        ec.stroke();

        const arrowAngle = Math.atan2(end.y - control.y, end.x - control.x);
        this.drawExportArrowhead(ec, end.x, end.y, arrowAngle);

        const labelPos = { x: control.x + 15 * Math.sin(angle), y: control.y - 15 * Math.cos(angle) };
        ec.font = '14px Inter';
        ec.textAlign = 'center';
        ec.fillText(t.symbol, labelPos.x, labelPos.y);
      }
    });

    // draw states
    this.states.forEach(s => {
      ec.beginPath();
      ec.arc(s.x, s.y, this.stateRadius, 0, Math.PI * 2);
      ec.strokeStyle = '#4b5563';
      ec.lineWidth = 2;
      ec.fillStyle = 'white';
      ec.fill();
      ec.stroke();
      if (s.isFinal) {
        ec.beginPath();
        ec.arc(s.x, s.y, this.stateRadius - 6, 0, Math.PI * 2);
        ec.strokeStyle = '#4b5563';
        ec.lineWidth = 2;
        ec.stroke();
      }
      ec.fillStyle = '#1f2937';
      ec.font = '16px Inter';
      ec.textAlign = 'center';
      ec.textBaseline = 'middle';
      ec.fillText(s.name, s.x, s.y);
      if (s.isInitial) {
        this.drawExportArrow(ec, s.x - this.stateRadius - 30, s.y, s.x - this.stateRadius, s.y, '#4b5563');
      }
    });

    ec.restore();

    const link = document.createElement('a');
    link.download = 'automata.png';
    link.href = ex.toDataURL('image/png').replace('image/png', 'image/octet-stream');
    link.click();
  }

  private drawExportArrowhead(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number) {
    const headlen = 10;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - headlen * Math.cos(angle - Math.PI / 6), y - headlen * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(x - headlen * Math.cos(angle + Math.PI / 6), y - headlen * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();
  }

  private drawExportArrow(ctx: CanvasRenderingContext2D, fromx: number, fromy: number, tox: number, toy: number, color: string) {
    const angle = Math.atan2(toy - fromy, tox - fromx);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(fromx, fromy);
    ctx.lineTo(tox, toy);
    ctx.stroke();
    this.drawExportArrowhead(ctx, tox, toy, angle);
  }

  private resizeCanvas() {
    if (!this.hasCanvas()) return;
    const canvas = this.canvasRef.nativeElement as HTMLCanvasElement;
    const container = canvas.parentElement as HTMLElement | null;
    if (!container) return;

    // Use the container's CSS size as the layout size (in CSS pixels)
    const cssWidth = container.clientWidth;
    const cssHeight = container.clientHeight || Math.min(window.innerHeight * 0.6, 600);

    // Scale the backing store for devicePixelRatio to avoid stretching / blurriness.
    const dpr = Math.max(1, window.devicePixelRatio || 1);

    // Maintain CSS size via style and set actual buffer size multiplied by DPR
    canvas.style.width = `${cssWidth}px`;
    canvas.style.height = `${cssHeight}px`;
    canvas.width = Math.max(1, Math.floor(cssWidth * dpr));
    canvas.height = Math.max(1, Math.floor(cssHeight * dpr));

    // Reset/prepare the 2D context so drawing uses CSS pixels (1 unit = 1 CSS px)
    this.ctx = canvas.getContext('2d')!;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this.draw();
  }

  private hasCanvas(): boolean {
    return !!(this.canvasRef && this.canvasRef.nativeElement);
  }

  private setCursorForMode(mode: string) {
    if (!this.hasCanvas()) return;
    const cursor = this.getCursorForMode(mode);
    this.renderer.setStyle(this.canvasRef.nativeElement, 'cursor', cursor);
  }
}