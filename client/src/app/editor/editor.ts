import { Component, ElementRef, HostListener, OnDestroy, OnInit, computed, effect, inject, signal, viewChild } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ApiService } from '../core/api.service';
import { Color, Finish, Pattern, WallDto } from '../core/models';
import { PaintEngine, Pt, Wall, tracePath } from './paint-engine';

type Tool = 'select' | 'polygon' | 'brush';

const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);

@Component({
  selector: 'app-editor',
  imports: [RouterLink],
  templateUrl: './editor.html',
  styleUrl: './editor.scss',
})
export class Editor implements OnInit, OnDestroy {
  protected api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private engine = new PaintEngine();
  private mainRef = viewChild.required<ElementRef<HTMLCanvasElement>>('main');
  private overlayRef = viewChild.required<ElementRef<HTMLCanvasElement>>('overlay');

  projectId = '';
  readonly title = signal('Untitled design');
  readonly disclaimer = signal('');
  readonly status = signal('Loading…');
  readonly ready = signal(false);
  readonly busy = signal(false);

  readonly colors = signal<Color[]>([]);
  readonly query = signal('');
  readonly favourites = signal<Set<string>>(new Set());
  readonly favOnly = signal(false);
  readonly filteredColors = computed(() => {
    const q = this.query().trim().toLowerCase();
    const favs = this.favourites();
    return this.colors().filter((c) => (!q || c.name.toLowerCase().includes(q)) && (!this.favOnly() || favs.has(c._id)));
  });
  readonly brightness = signal(1);

  readonly patterns = signal<Pattern[]>([]);
  readonly panelTab = signal<'colours' | 'patterns'>('colours');
  readonly currentPattern = signal<Pattern | null>(null);
  readonly patternScale = signal(1);

  readonly walls = signal<Wall[]>([]);
  readonly selectedId = signal<string | null>(null);
  readonly selected = computed(() => this.walls().find((w) => w.id === this.selectedId()) ?? null);

  readonly tool = signal<Tool>('polygon');
  readonly currentColor = signal<Color | null>(null);
  readonly opacity = signal(0.85);
  readonly finish = signal<Finish>('matte');
  readonly brushSize = signal(36);
  readonly compare = signal(false);
  readonly comparePct = signal(50);
  readonly finishes: Finish[] = ['matte', 'satin', 'glossy'];

  private history: Wall[][] = [];
  private hIdx = -1;
  readonly canUndo = signal(false);
  readonly canRedo = signal(false);

  private draft: Pt[] = [];
  private hover: Pt | null = null;
  private stroke: Pt[] = [];
  private brushing = false;
  private dragging: { id: string; idx: number } | null = null;
  private dragMoved = false;
  private raf = 0;

  constructor() {
    effect(() => {
      this.walls();
      this.selectedId();
      this.compare();
      this.comparePct();
      this.ready();
      this.schedule();
    });
  }

  ngOnInit() {
    this.projectId = this.route.snapshot.paramMap.get('id')!;
    forkJoin({
      project: this.api.getProject(this.projectId),
      colors: this.api.colors(),
      patterns: this.api.patterns(),
      me: this.api.me(),
    }).subscribe({
      next: ({ project, colors, patterns, me }) => {
        this.favourites.set(new Set(me.favouriteColors.map((c) => c._id)));
        this.colors.set(colors);
        this.patterns.set(patterns);
        this.currentColor.set(colors[0] ?? null);
        this.title.set(project.project.title);
        this.disclaimer.set(project.disclaimer);
        this.loadImage(this.api.imageUrl(project.project.originalImageUrl), async () => {
          const byId = new Map(colors.map((c) => [c._id, c]));
          const patById = new Map(patterns.map((p) => [p._id, p]));
          await Promise.all(patterns.map((p) => this.engine.loadPattern(this.api.imageUrl(p.imageUrl))));
          this.walls.set(
            project.project.walls.map((w) => ({
              id: w._id ?? crypto.randomUUID(),
              type: w.type ?? 'polygon',
              points: w.points.map((p) => ({ x: p.x, y: p.y })),
              brushSize: w.brushSize,
              colorId: w.colorId,
              patternId: w.patternId,
              patternUrl: w.patternId && patById.get(w.patternId) ? this.api.imageUrl(patById.get(w.patternId)!.imageUrl) : undefined,
              patternScale: w.patternScale ?? 1,
              brightness: w.brightness ?? 1,
              hex: byId.get(w.colorId ?? '')?.hex ?? '#4F86C6',
              opacity: w.opacity ?? 0.85,
              finish: w.finish ?? 'matte',
            }))
          );
          this.commit();
          this.ready.set(true);
          this.status.set('Click on the wall corners to outline it. Double-click or click the first point to finish.');
        });
      },
      error: () => this.status.set('Could not load this project. Is the server running?'),
    });
  }

  ngOnDestroy() {
    cancelAnimationFrame(this.raf);
  }

  private loadImage(url: string, done: () => void) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      this.engine.load(img);
      const size = { width: this.engine.width, height: this.engine.height };
      Object.assign(this.mainRef().nativeElement, size);
      Object.assign(this.overlayRef().nativeElement, size);
      done();
    };
    img.onerror = () => this.status.set('Could not load the room photo.');
    img.src = url;
  }

  // ---------- rendering ----------
  private schedule() {
    if (!this.ready() && !this.engine.width) return;
    cancelAnimationFrame(this.raf);
    this.raf = requestAnimationFrame(() => this.draw());
  }

  private draw() {
    if (!this.engine.width) return;
    const compareX = this.compare() ? (this.comparePct() / 100) * this.engine.width : null;
    this.engine.render(this.mainRef().nativeElement, this.walls(), compareX);

    const overlay = this.overlayRef().nativeElement;
    const ctx = overlay.getContext('2d')!;
    ctx.clearRect(0, 0, overlay.width, overlay.height);
    const k = this.pxScale();
    ctx.lineWidth = 2 * k;
    ctx.lineJoin = ctx.lineCap = 'round';

    const sel = this.selected();
    if (sel && this.tool() === 'select') {
      ctx.strokeStyle = '#6d5efc';
      ctx.setLineDash([8 * k, 6 * k]);
      if (sel.type === 'polygon') {
        tracePath(ctx, sel);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#ffffff';
        for (const p of sel.points) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 6 * k, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      } else {
        tracePath(ctx, sel);
        ctx.stroke();
      }
      ctx.setLineDash([]);
    }

    if (this.draft.length) {
      ctx.strokeStyle = '#ff7a00';
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      this.draft.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      if (this.hover) ctx.lineTo(this.hover.x, this.hover.y);
      ctx.stroke();
      this.draft.forEach((p, i) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, (i === 0 ? 7 : 4.5) * k, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });
    }

    if (this.brushing && this.stroke.length) {
      ctx.strokeStyle = 'rgba(255,122,0,0.55)';
      ctx.lineWidth = this.brushSize();
      ctx.beginPath();
      this.stroke.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      if (this.stroke.length === 1) ctx.lineTo(this.stroke[0].x + 0.01, this.stroke[0].y);
      ctx.stroke();
    }
  }

  /** Canvas pixels per on-screen pixel, so handles keep a constant visual size. */
  private pxScale() {
    const r = this.overlayRef().nativeElement.getBoundingClientRect();
    return r.width ? this.engine.width / r.width : 1;
  }

  private point(e: MouseEvent): Pt {
    const r = this.overlayRef().nativeElement.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) * this.engine.width) / r.width,
      y: ((e.clientY - r.top) * this.engine.height) / r.height,
    };
  }

  // ---------- pointer interaction ----------
  onDown(e: PointerEvent) {
    if (!this.ready()) return;
    const p = this.point(e);
    const k = this.pxScale();
    const tool = this.tool();

    if (tool === 'polygon') {
      if (this.draft.length >= 3 && dist(p, this.draft[0]) < 12 * k) return this.finishPolygon();
      this.draft.push(p);
      this.status.set(`${this.draft.length} points. Need 3+ to finish (double-click or click the first point).`);
      this.schedule();
    } else if (tool === 'brush') {
      this.brushing = true;
      this.stroke = [p];
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      this.schedule();
    } else {
      const sel = this.selected();
      if (sel?.type === 'polygon') {
        const idx = sel.points.findIndex((q) => dist(q, p) < 11 * k);
        if (idx >= 0) {
          this.dragging = { id: sel.id, idx };
          this.dragMoved = false;
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
          return;
        }
      }
      this.selectWall(this.hitTest(p));
    }
  }

  onMove(e: PointerEvent) {
    if (!this.ready()) return;
    const p = this.point(e);
    if (this.dragging) {
      const { id, idx } = this.dragging;
      this.dragMoved = true;
      this.walls.update((ws) => ws.map((w) => (w.id === id ? { ...w, points: w.points.map((q, i) => (i === idx ? p : q)) } : w)));
    } else if (this.brushing) {
      if (dist(this.stroke[this.stroke.length - 1], p) > 3) {
        this.stroke.push(p);
        this.schedule();
      }
    } else if (this.draft.length) {
      this.hover = p;
      this.schedule();
    }
  }

  onUp() {
    if (this.dragging) {
      if (this.dragMoved) this.commit();
      this.dragging = null;
    }
    if (this.brushing) {
      this.brushing = false;
      const pts = this.stroke.length === 1 ? [this.stroke[0], { x: this.stroke[0].x + 0.5, y: this.stroke[0].y }] : this.stroke;
      this.stroke = [];
      this.addWall('brush', pts);
    }
  }

  onDouble() {
    if (this.tool() === 'polygon' && this.draft.length >= 3) this.finishPolygon();
  }

  private hitTest(p: Pt): string | null {
    const ctx = this.overlayRef().nativeElement.getContext('2d')!;
    const walls = this.walls();
    for (let i = walls.length - 1; i >= 0; i--) {
      const w = walls[i];
      tracePath(ctx, w);
      if (w.type === 'polygon' ? ctx.isPointInPath(p.x, p.y) : ((ctx.lineWidth = w.brushSize ?? 24), ctx.isPointInStroke(p.x, p.y))) {
        return w.id;
      }
    }
    return null;
  }

  private finishPolygon() {
    const pts = this.draft;
    this.draft = [];
    this.hover = null;
    this.addWall('polygon', pts);
    this.status.set('Wall added. Pick another colour for the next wall, or use the Select tool to edit.');
  }

  private addWall(type: 'polygon' | 'brush', points: Pt[]) {
    const c = this.currentColor();
    const pat = this.panelTab() === 'patterns' ? this.currentPattern() : null;
    const wall: Wall = {
      id: crypto.randomUUID(),
      type,
      points,
      brushSize: type === 'brush' ? this.brushSize() : undefined,
      colorId: c?._id,
      patternId: pat?._id,
      patternUrl: pat ? this.api.imageUrl(pat.imageUrl) : undefined,
      patternScale: this.patternScale(),
      brightness: this.brightness(),
      hex: c?.hex ?? '#4F86C6',
      opacity: this.opacity(),
      finish: this.finish(),
    };
    this.walls.update((ws) => [...ws, wall]);
    this.selectedId.set(wall.id);
    this.commit();
  }

  // ---------- editing ----------
  setTool(t: Tool) {
    this.tool.set(t);
    this.draft = [];
    this.hover = null;
    this.status.set(
      t === 'polygon'
        ? 'Click the wall corners to outline it. Double-click or click the first point to finish.'
        : t === 'brush'
          ? 'Hold and drag to paint over the wall area.'
          : 'Click a painted wall to select it, then drag its points or change its colour.'
    );
    this.schedule();
  }

  selectWall(id: string | null) {
    this.selectedId.set(id);
    const w = this.walls().find((x) => x.id === id);
    if (w) {
      this.opacity.set(w.opacity);
      this.finish.set(w.finish);
      this.currentColor.set(this.colors().find((c) => c._id === w.colorId) ?? this.currentColor());
      this.patternScale.set(w.patternScale ?? 1);
      this.brightness.set(w.brightness ?? 1);
      const pat = this.patterns().find((p) => p._id === w.patternId) ?? null;
      this.currentPattern.set(pat);
      this.panelTab.set(pat ? 'patterns' : 'colours');
    }
  }

  pickColor(c: Color) {
    this.currentColor.set(c);
    this.panelTab.set('colours');
    const id = this.selectedId();
    if (id) {
      this.walls.update((ws) =>
        ws.map((w) => (w.id === id ? { ...w, colorId: c._id, hex: c.hex, patternId: undefined, patternUrl: undefined } : w))
      );
      this.commit();
    }
  }

  pickPattern(p: Pattern) {
    this.currentPattern.set(p);
    this.panelTab.set('patterns');
    const url = this.api.imageUrl(p.imageUrl);
    const id = this.selectedId();
    if (id) {
      this.walls.update((ws) => ws.map((w) => (w.id === id ? { ...w, patternId: p._id, patternUrl: url } : w)));
      this.commit();
    }
  }

  setPatternScale(v: number, final: boolean) {
    this.patternScale.set(v);
    const id = this.selectedId();
    if (id) this.walls.update((ws) => ws.map((w) => (w.id === id && w.patternUrl ? { ...w, patternScale: v } : w)));
    if (final && id) this.commit();
  }

  setOpacity(v: number, final: boolean) {
    this.opacity.set(v);
    const id = this.selectedId();
    if (id) this.walls.update((ws) => ws.map((w) => (w.id === id ? { ...w, opacity: v } : w)));
    if (final && id) this.commit();
  }

  setBrightness(v: number, final: boolean) {
    this.brightness.set(v);
    const id = this.selectedId();
    if (id) this.walls.update((ws) => ws.map((w) => (w.id === id ? { ...w, brightness: v } : w)));
    if (final && id) this.commit();
  }

  toggleFavourite(c: Color) {
    this.favourites.update((s) => {
      const next = new Set(s);
      next.has(c._id) ? next.delete(c._id) : next.add(c._id);
      return next;
    });
    this.api.toggleFavourite('colors', c._id).subscribe({
      error: () => this.favourites.update((s) => {
        const next = new Set(s);
        next.has(c._id) ? next.delete(c._id) : next.add(c._id);
        return next;
      }),
    });
  }

  setFinish(f: Finish) {
    this.finish.set(f);
    const id = this.selectedId();
    if (id) {
      this.walls.update((ws) => ws.map((w) => (w.id === id ? { ...w, finish: f } : w)));
      this.commit();
    }
  }

  deleteWall(id: string | null = this.selectedId()) {
    if (!id) return;
    this.walls.update((ws) => ws.filter((w) => w.id !== id));
    if (this.selectedId() === id) this.selectedId.set(null);
    this.commit();
  }

  // ---------- undo / redo ----------
  private commit() {
    this.history = this.history.slice(Math.max(0, this.hIdx - 48), this.hIdx + 1);
    this.history.push(structuredClone(this.walls()));
    this.hIdx = this.history.length - 1;
    this.syncHistory();
  }

  undo() {
    if (this.hIdx <= 0) return;
    this.restore(--this.hIdx);
  }

  redo() {
    if (this.hIdx >= this.history.length - 1) return;
    this.restore(++this.hIdx);
  }

  private restore(i: number) {
    this.walls.set(structuredClone(this.history[i]));
    if (!this.walls().some((w) => w.id === this.selectedId())) this.selectedId.set(null);
    this.syncHistory();
  }

  private syncHistory() {
    this.canUndo.set(this.hIdx > 0);
    this.canRedo.set(this.hIdx < this.history.length - 1);
  }

  @HostListener('window:keydown', ['$event'])
  onKey(e: KeyboardEvent) {
    if ((e.target as HTMLElement)?.tagName === 'INPUT' && (e.target as HTMLInputElement).type !== 'range') return;
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      e.shiftKey ? this.redo() : this.undo();
    } else if (mod && e.key.toLowerCase() === 'y') {
      e.preventDefault();
      this.redo();
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      this.deleteWall();
    } else if (e.key === 'Escape') {
      this.draft = [];
      this.hover = null;
      this.schedule();
    } else if (e.key === 'Enter' && this.draft.length >= 3) {
      this.finishPolygon();
    }
  }

  // ---------- save & download ----------
  private renderBlob(): Promise<Blob> {
    const canvas = document.createElement('canvas');
    this.engine.render(canvas, this.walls(), null);
    return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('render failed'))), 'image/png'));
  }

  private toDto(): WallDto[] {
    return this.walls().map((w) => ({
      type: w.type,
      points: w.points.map((p) => ({ x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10 })),
      brushSize: w.brushSize,
      colorId: w.colorId,
      patternId: w.patternId,
      patternScale: w.patternScale,
      brightness: w.brightness,
      opacity: w.opacity,
      finish: w.finish,
    }));
  }

  async save() {
    this.busy.set(true);
    this.status.set('Saving…');
    try {
      await new Promise<void>((res, rej) => this.api.saveProject(this.projectId, this.toDto(), this.title()).subscribe({ next: () => res(), error: rej }));
      const blob = await this.renderBlob();
      await new Promise<void>((res, rej) => this.api.saveResult(this.projectId, blob).subscribe({ next: () => res(), error: rej }));
      this.status.set('Design saved.');
    } catch {
      this.status.set('Save failed. Check your connection and try again.');
    } finally {
      this.busy.set(false);
    }
  }

  async download() {
    const blob = await this.renderBlob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${this.title().replace(/[^\w-]+/g, '_') || 'design'}.png`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  onTitle(e: Event) {
    this.title.set((e.target as HTMLInputElement).value);
  }
}
