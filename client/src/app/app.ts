import { Component, HostListener, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { API_URL } from './config';
import { AuthService } from './core/auth.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private auth = inject(AuthService);
  private since = Date.now();

  /** Reports time spent in the app (the "average session duration" KPI) when the tab is hidden or closed. */
  @HostListener('document:visibilitychange')
  onVisibility() {
    if (document.visibilityState === 'hidden') this.report();
    else this.since = Date.now();
  }

  @HostListener('window:pagehide')
  report() {
    const seconds = Math.round((Date.now() - this.since) / 1000);
    const token = this.auth.token();
    this.since = Date.now();
    if (!token || seconds < 5) return;
    fetch(`${API_URL}/api/me/session`, {
      method: 'POST',
      keepalive: true,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ seconds: Math.min(seconds, 7200) }),
    }).catch(() => {});
  }
}
