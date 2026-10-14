import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-nav',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <header class="nav">
      <a routerLink="/" class="brand"><span class="logo" aria-hidden="true"></span>Wall Paint Visualizer</a>
      <nav aria-label="Main">
        @if (auth.isLoggedIn()) {
          <a routerLink="/designs" routerLinkActive="on">My designs</a>
          <a routerLink="/upload" routerLinkActive="on">New design</a>
        }
        <a routerLink="/how-to-use" routerLinkActive="on">How to use</a>
        @if (auth.user()?.role === 'admin') {
          <a routerLink="/admin" routerLinkActive="on">Admin</a>
        }
      </nav>
      <span class="spacer"></span>
      @if (auth.isLoggedIn()) {
        <span class="who">{{ auth.user()?.name }}</span>
        <button class="btn ghost" (click)="auth.logout()">Sign out</button>
      } @else {
        <a class="btn primary" routerLink="/login">Sign in</a>
      }
    </header>
  `,
  styles: `
    .nav { display: flex; align-items: center; gap: 18px; padding: 10px 20px; background: var(--surface); border-bottom: 1px solid var(--line); flex-wrap: wrap; }
    .brand { display: flex; align-items: center; gap: 8px; font-weight: 700; color: var(--ink); text-decoration: none; }
    .logo { width: 18px; height: 18px; border-radius: 5px; background: linear-gradient(135deg, var(--accent), #ff7a00); }
    nav { display: flex; gap: 4px; }
    nav a { padding: 6px 12px; border-radius: 8px; color: var(--muted); text-decoration: none; font-size: 14px; }
    nav a:hover { color: var(--ink); }
    nav a.on { background: var(--accent-soft); color: var(--accent); font-weight: 600; }
    .spacer { flex: 1; }
    .who { color: var(--muted); font-size: 14px; }
    a.btn { text-decoration: none; }
  `,
})
export class Nav {
  protected auth = inject(AuthService);
}
