import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { Nav } from '../../shared/nav';

@Component({
  selector: 'app-home',
  imports: [RouterLink, Nav],
  template: `
    <app-nav />
    <main>
      <section class="hero">
        <p class="eyebrow">Virtual room paint &amp; design preview</p>
        <h1>See the colour on your own wall before you open the tin.</h1>
        <p class="lead">
          Upload a photo of your room, outline the walls, and try paint colours and patterns with realistic light and shadow.
          Compare before and after, then save or download your favourite.
        </p>
        <div class="cta">
          <a class="btn primary big" [routerLink]="auth.isLoggedIn() ? '/upload' : '/login'">Start designing</a>
          <a class="btn big" routerLink="/how-to-use">How it works</a>
        </div>
      </section>

      <section class="features" aria-label="Features">
        @for (f of features; track f.title) {
          <article class="card">
            <h2>{{ f.title }}</h2>
            <p>{{ f.text }}</p>
          </article>
        }
      </section>

      <p class="note">
        Colours shown are a preview. Final results may vary due to lighting, screen calibration and wall texture.
      </p>
    </main>
  `,
  styles: `
    main { max-width: 1040px; margin: 0 auto; padding: 0 16px 48px; }
    .hero { padding: 64px 0 40px; max-width: 720px; }
    .eyebrow { color: var(--accent); font-weight: 600; font-size: 14px; margin: 0 0 8px; }
    h1 { font-size: clamp(30px, 5vw, 46px); line-height: 1.1; margin: 0 0 16px; letter-spacing: -0.02em; }
    .lead { font-size: 18px; color: var(--muted); margin: 0 0 24px; }
    .cta { display: flex; gap: 12px; flex-wrap: wrap; }
    .big { padding: 12px 22px; text-decoration: none; }
    .features { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-top: 16px; }
    .card h2 { font-size: 17px; margin: 0 0 6px; }
    .card p { margin: 0; color: var(--muted); font-size: 14px; }
    .note { margin-top: 32px; font-size: 13px; color: var(--muted); }
    @media (max-width: 600px) {
      .hero { padding: 28px 0 20px; }
      .lead { font-size: 16px; }
      .cta .big { flex: 1 1 140px; text-align: center; }
    }
  `,
})
export class Home {
  protected auth = inject(AuthService);

  readonly features = [
    { title: 'Your own room', text: 'Upload a JPG or PNG of your real room, so the preview reflects your lighting and space.' },
    { title: 'Precise wall selection', text: 'Outline walls with the polygon tool or paint over them with the brush. Edit points any time.' },
    { title: 'Realistic paint', text: 'Colours keep the wall’s shadows and highlights. Choose matte, satin or glossy and tune opacity.' },
    { title: 'Compare and save', text: 'Slide between before and after, try several designs per photo, and download the result.' },
  ];
}
