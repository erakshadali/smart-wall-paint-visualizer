import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { Project } from '../../core/models';
import { Nav } from '../../shared/nav';

@Component({
  selector: 'app-designs',
  imports: [RouterLink, Nav, DatePipe],
  template: `
    <app-nav />
    <main>
      <div class="head">
        <h1>My designs</h1>
        <a class="btn primary" routerLink="/upload">New design</a>
      </div>

      @if (loading()) {
        <p class="muted">Loading your designs…</p>
      } @else if (!projects().length) {
        <div class="card empty">
          <h2>No designs yet</h2>
          <p>Upload a photo of your room to preview your first paint colour.</p>
          <a class="btn primary" routerLink="/upload">Upload a room photo</a>
        </div>
      } @else {
        <div class="grid">
          @for (p of projects(); track p._id) {
            <article class="card item">
              <a [routerLink]="['/editor', p._id]" class="thumb" [attr.aria-label]="'Open ' + p.title">
                <img [src]="api.imageUrl(p.resultImageUrl ?? p.originalImageUrl)" [alt]="p.title + ' preview'" loading="lazy" />
              </a>
              <div class="meta">
                <strong>{{ p.title }}</strong>
                <small>{{ p.walls.length }} wall{{ p.walls.length === 1 ? '' : 's' }} · {{ p.updatedAt | date: 'mediumDate' }}</small>
              </div>
              <div class="actions">
                <a class="btn" [routerLink]="['/editor', p._id]">Open</a>
                <button class="btn" (click)="duplicate(p)">Duplicate</button>
                @if (confirmId() === p._id) {
                  <button class="btn danger" (click)="remove(p)">Yes, delete</button>
                  <button class="btn" (click)="confirmId.set(null)">Cancel</button>
                } @else {
                  <button class="btn" (click)="confirmId.set(p._id)">Delete</button>
                }
              </div>
            </article>
          }
        </div>
      }

      @if (error()) { <p class="error" role="alert">{{ error() }}</p> }

      <section class="card feedback" aria-label="Feedback">
        <h2>How was your experience?</h2>
        @if (sent()) {
          <p class="muted">Thank you for your feedback!</p>
        } @else {
          <div class="stars" role="radiogroup" aria-label="Rating">
            @for (n of [1, 2, 3, 4, 5]; track n) {
              <button type="button" role="radio" [attr.aria-checked]="rating() === n" [class.on]="n <= rating()" (click)="rating.set(n)" [attr.aria-label]="n + ' star' + (n > 1 ? 's' : '')">★</button>
            }
          </div>
          <textarea placeholder="Anything we should improve? (optional)" maxlength="500" [value]="comment()" (input)="comment.set($any($event.target).value)"></textarea>
          <button class="btn primary" [disabled]="!rating()" (click)="sendFeedback()">Send feedback</button>
        }
      </section>
    </main>
  `,
  styles: `
    main { max-width: 1040px; margin: 0 auto; padding: 24px 16px 56px; display: flex; flex-direction: column; gap: 20px; }
    .head { display: flex; align-items: center; justify-content: space-between; }
    h1 { margin: 0; font-size: 26px; }
    h2 { margin: 0 0 6px; font-size: 17px; }
    .muted, .empty p { color: var(--muted); font-size: 14px; margin: 0; }
    .empty { display: flex; flex-direction: column; gap: 10px; align-items: flex-start; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; }
    .item { padding: 0; overflow: hidden; display: flex; flex-direction: column; }
    .thumb { display: block; aspect-ratio: 3 / 2; background: var(--bg); }
    .thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .meta { padding: 12px 14px 4px; display: flex; flex-direction: column; }
    .meta small { color: var(--muted); }
    .actions { padding: 8px 14px 14px; display: flex; gap: 6px; flex-wrap: wrap; }
    .actions .btn { padding: 6px 12px; font-size: 13px; text-decoration: none; }
    .danger { background: #d33; border-color: #d33; color: #fff; }
    .error { color: #d33; margin: 0; font-size: 14px; }
    .feedback { display: flex; flex-direction: column; gap: 10px; align-items: flex-start; max-width: 520px; }
    .stars { display: flex; gap: 4px; }
    .stars button { background: none; border: 0; font-size: 28px; color: var(--line); cursor: pointer; padding: 0 2px; }
    .stars button.on { color: #f4b400; }
    textarea { width: 100%; min-height: 70px; padding: 10px 12px; border: 1px solid var(--line); border-radius: 8px; background: var(--bg); color: var(--ink); font: inherit; resize: vertical; }
  `,
})
export class Designs implements OnInit {
  protected api = inject(ApiService);
  private router = inject(Router);

  readonly projects = signal<Project[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly confirmId = signal<string | null>(null);

  readonly rating = signal(0);
  readonly comment = signal('');
  readonly sent = signal(false);

  ngOnInit() {
    this.api.projects().subscribe({
      next: (p) => {
        this.projects.set(p);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Could not load your designs. Is the server running?');
        this.loading.set(false);
      },
    });
  }

  duplicate(p: Project) {
    this.api.duplicateProject(p._id).subscribe({
      next: (r) => this.router.navigate(['/editor', r.project._id]),
      error: () => this.error.set('Could not duplicate this design.'),
    });
  }

  remove(p: Project) {
    this.api.deleteProject(p._id).subscribe({
      next: () => {
        this.projects.update((list) => list.filter((x) => x._id !== p._id));
        this.confirmId.set(null);
      },
      error: () => this.error.set('Could not delete this design.'),
    });
  }

  sendFeedback() {
    this.api.sendFeedback(this.rating(), this.comment()).subscribe({
      next: () => this.sent.set(true),
      error: () => this.error.set('Could not send feedback. Please try again.'),
    });
  }
}
