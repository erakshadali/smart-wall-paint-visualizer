import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-login',
  template: `
    <main class="auth">
      <form class="card" (submit)="submit($event)">
        <h1>Smart Wall Paint Visualizer</h1>
        <p class="sub">{{ mode() === 'login' ? 'Sign in to preview paint on your own room photos.' : 'Create an account to start.' }}</p>

        @if (mode() === 'register') {
          <label>Name <input name="name" required autocomplete="name" [value]="name()" (input)="name.set($any($event.target).value)" /></label>
        }
        <label>Email <input name="email" type="email" required autocomplete="email" [value]="email()" (input)="email.set($any($event.target).value)" /></label>
        <label>
          Password
          <input name="password" type="password" required minlength="8" autocomplete="current-password" [value]="password()" (input)="password.set($any($event.target).value)" />
        </label>

        @if (error()) { <p class="error" role="alert">{{ error() }}</p> }
        <button class="btn primary" type="submit" [disabled]="busy()">{{ mode() === 'login' ? 'Sign in' : 'Create account' }}</button>
        <button class="link" type="button" (click)="toggle()">
          {{ mode() === 'login' ? "New here? Create an account" : 'Have an account? Sign in' }}
        </button>
      </form>
    </main>
  `,
  styles: `
    .auth { min-height: 100vh; display: grid; place-items: center; padding: 16px; }
    .card { width: 100%; max-width: 380px; display: flex; flex-direction: column; gap: 14px; }
    h1 { font-size: 22px; margin: 0; }
    .sub { margin: 0; color: var(--muted); font-size: 14px; }
    label { display: flex; flex-direction: column; gap: 6px; font-size: 13px; color: var(--muted); }
    .error { margin: 0; color: #d33; font-size: 13px; }
    .link { background: none; border: 0; color: var(--accent); cursor: pointer; font-size: 13px; }
  `,
})
export class Login {
  private auth = inject(AuthService);
  private router = inject(Router);

  readonly mode = signal<'login' | 'register'>('login');
  readonly name = signal('');
  readonly email = signal('');
  readonly password = signal('');
  readonly error = signal('');
  readonly busy = signal(false);

  toggle() {
    this.mode.update((m) => (m === 'login' ? 'register' : 'login'));
    this.error.set('');
  }

  submit(e: Event) {
    e.preventDefault();
    this.busy.set(true);
    this.error.set('');
    const req =
      this.mode() === 'login'
        ? this.auth.login(this.email(), this.password())
        : this.auth.register(this.name(), this.email(), this.password());
    req.subscribe({
      next: () => this.router.navigateByUrl('/upload'),
      error: (err) => {
        this.error.set(err.error?.message ?? 'Could not reach the server.');
        this.busy.set(false);
      },
    });
  }
}
