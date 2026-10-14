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

@Injectable({ providedIn: 'root' })
export class AuthService {
  private api = inject(ApiService);
  private router = inject(Router);

  readonly token = signal<string | null>(read(TOKEN_KEY));
  readonly user = signal<User | null>(JSON.parse(read(USER_KEY) ?? 'null'));
  readonly isLoggedIn = computed(() => !!this.token());

  login(email: string, password: string) {
    return this.api.login(email, password).pipe(tap((r) => this.store(r.token, r.user)));
  }

  register(name: string, email: string, password: string) {
    return this.api.register(name, email, password).pipe(tap((r) => this.store(r.token, r.user)));
  }

  logout() {
    this.token.set(null);
    this.user.set(null);
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } catch {}
    this.router.navigateByUrl('/login');
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
