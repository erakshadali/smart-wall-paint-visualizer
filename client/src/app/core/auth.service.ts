import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { ApiService } from './api.service';
import { User } from './models';

const TOKEN_KEY = 'wpv_token';
const USER_KEY = 'wpv_user';

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** True when a JWT's own expiry time has passed (or it cannot be read), so stale logins are dropped up front. */
export function tokenExpired(token: string | null, now = Date.now()): boolean {
  if (!token) return true;
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return typeof payload.exp === 'number' && payload.exp * 1000 <= now;
  } catch {
    return true;
  }
}

function readToken(): string | null {
  const t = read(TOKEN_KEY);
  if (!tokenExpired(t)) return t;
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {}
  return null;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private api = inject(ApiService);
  private router = inject(Router);

  readonly token = signal<string | null>(readToken());
  readonly user = signal<User | null>(this.token() ? JSON.parse(read(USER_KEY) ?? 'null') : null);
  readonly isLoggedIn = computed(() => !!this.token());

  login(email: string, password: string) {
    return this.api.login(email, password).pipe(tap((r) => this.store(r.token, r.user)));
  }

  demo() {
    return this.api.demo().pipe(tap((r) => this.store(r.token, r.user)));
  }

  register(name: string, email: string, password: string) {
    return this.api.register(name, email, password).pipe(tap((r) => this.store(r.token, r.user)));
  }

  logout(expired = false) {
    this.token.set(null);
    this.user.set(null);
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } catch {}
    this.router.navigate(['/login'], expired ? { queryParams: { expired: 1 } } : {});
  }

  private store(token: string, user: User) {
    this.token.set(token);
    this.user.set(user);
    try {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch {}
  }
}
