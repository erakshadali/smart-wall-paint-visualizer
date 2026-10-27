import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
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
          <span class="pw">
            <input name="password" [type]="showPassword() ? 'text' : 'password'" required minlength="8" [attr.autocomplete]="mode() === 'login' ? 'current-password' : 'new-password'" [value]="password()" (input)="password.set($any($event.target).value)" />
            <button class="toggle" type="button" (click)="showPassword.set(!showPassword())" [attr.aria-pressed]="showPassword()" [attr.aria-label]="showPassword() ? 'Hide password' : 'Show password'">
              {{ showPassword() ? 'Hide' : 'Show' }}
            </button>
          </span>
        </label>

        @if (error()) { <p class="error" role="alert">{{ error() }}</p> }
        <button class="btn primary" type="submit" [disabled]="busy()">{{ mode() === 'login' ? 'Sign in' : 'Create account' }}</button>
        <button class="link" type="button" (click)="toggle()">
          {{ mode() === 'login' ? "New here? Create an account" : 'Have an account? Sign in' }}
        </button>

        <div class="divider" role="separator"><span>or</span></div>
        <button class="btn demo" type="button" [disabled]="busy()" (click)="tryDemo()">
          {{ busy() ? 'Starting demo…' : 'Try the demo' }}
        </button>
        <p class="hint">No sign-up needed. You get a temporary account and can use a sample room, so you can try colours, patterns and presets in under a minute.</p>
      </form>
    </main>
  `,
  styles: `
    .auth { min-height: 100vh; display: grid; place-items: center; padding: 16px; }
    .card { width: 100%; max-width: 380px; display: flex; flex-direction: column; gap: 14px; }
    h1 { font-size: 22px; margin: 0; }
    .sub { margin: 0; color: var(--muted); font-size: 14px; }
    label { display: flex; flex-direction: column; gap: 6px; font-size: 13px; color: var(--muted); }
    .pw { position: relative; display: block; }
    .pw input { width: 100%; box-sizing: border-box; padding-right: 64px; }
    .toggle { position: absolute; right: 8px; top: 50%; transform: translateY(-50%); background: none; border: 0; color: var(--accent); cursor: pointer; font-size: 13px; padding: 4px 6px; }
    .error { margin: 0; color: #d33; font-size: 13px; }
    .link { background: none; border: 0; color: var(--accent); cursor: pointer; font-size: 13px; }
    .divider { display: flex; align-items: center; gap: 10px; color: var(--muted); font-size: 12px; }
    .divider::before, .divider::after { content: ''; flex: 1; height: 1px; background: var(--line); }
    .demo { width: 100%; border: 1px solid var(--accent); color: var(--accent); background: transparent; cursor: pointer; padding: 10px 14px; border-radius: 10px; font-size: 14px; font-weight: 600; }
    .demo:disabled { opacity: 0.6; cursor: default; }
    .hint { margin: 0; color: var(--muted); font-size: 12px; line-height: 1.4; }
  `,
})
export class Login {
  private auth = inject(AuthService);
  private router = inject(Router);

  readonly mode = signal<'login' | 'register'>('login');
  readonly name = signal('');
  readonly email = signal('');
  readonly password = signal('');
  readonly error = signal(inject(ActivatedRoute).snapshot.queryParamMap.has('expired') ? 'Your session expired. Please sign in again.' : '');
  readonly busy = signal(false);
  readonly showPassword = signal(false);

  toggle() {
    this.mode.update((m) => (m === 'login' ? 'register' : 'login'));
    this.error.set('');
  }

  tryDemo() {
    this.busy.set(true);
    this.error.set('');
    this.auth.demo().subscribe({
      next: () => this.router.navigateByUrl('/upload'),
      error: (err) => {
        this.error.set(err.error?.message ?? 'Could not start the demo. Please try again.');
        this.busy.set(false);
      },
    });
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
      next: () => this.router.navigateByUrl('/designs'),
      error: (err) => {
        this.error.set(err.error?.message ?? 'Could not reach the server.');
        this.busy.set(false);
      },
    });
  }
}
