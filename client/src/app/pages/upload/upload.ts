import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { Nav } from '../../shared/nav';

@Component({
  selector: 'app-upload',
  imports: [Nav],
  template: `
    <app-nav />

    <main class="wrap">
      <form class="card" (submit)="submit($event)">
        <h1>Upload your room photo</h1>
        <p class="sub">JPG or PNG, up to 8 MB. Use a clear, well-lit photo of the wall.</p>

        <label>Design name <input [value]="title()" (input)="title.set($any($event.target).value)" maxlength="80" /></label>
        <label>Room photo <input type="file" accept="image/jpeg,image/png" (change)="pick($event)" /></label>
        <button class="btn sample" type="button" [disabled]="busy()" (click)="useSample()">No photo handy? Use a sample room</button>
        @if (preview()) { <img class="preview" [src]="preview()" alt="Selected room photo preview" /> }

        <label class="check">
          <input type="checkbox" [checked]="owned()" (change)="owned.set($any($event.target).checked)" />
          I confirm this photo is original and owned by me.
        </label>
        <p class="note">Colours shown are a preview. Final results may vary due to lighting, screen calibration and wall texture.</p>

        @if (error()) { <p class="error" role="alert">{{ error() }}</p> }
        <button class="btn primary" type="submit" [disabled]="busy() || !file() || !owned()">{{ busy() ? 'Uploading…' : 'Continue to editor' }}</button>
      </form>
    </main>
  `,
  styles: `
    .wrap { display: grid; place-items: start center; padding: 32px 16px; }
    .card { width: 100%; max-width: 520px; display: flex; flex-direction: column; gap: 14px; }
    h1 { font-size: 22px; margin: 0; }
    .sub, .note { margin: 0; color: var(--muted); font-size: 13px; }
    label { display: flex; flex-direction: column; gap: 6px; font-size: 13px; color: var(--muted); }
    .check { flex-direction: row; align-items: center; color: var(--ink); font-size: 14px; }
    .preview { max-width: 100%; max-height: 260px; object-fit: contain; border-radius: 10px; border: 1px solid var(--line); }
    .error { margin: 0; color: #d33; font-size: 13px; }
    .sample { align-self: flex-start; border: 1px solid var(--accent); color: var(--accent); background: transparent; cursor: pointer; padding: 8px 12px; border-radius: 10px; font-size: 13px; }
    .sample:disabled { opacity: 0.6; cursor: default; }
  `,
})
export class Upload {
  private api = inject(ApiService);
  private router = inject(Router);

  readonly title = signal('My room');
  readonly file = signal<File | null>(null);
  readonly preview = signal('');
  readonly owned = signal(false);
  readonly error = signal('');
  readonly busy = signal(false);

  pick(e: Event) {
    const f = (e.target as HTMLInputElement).files?.[0] ?? null;
    this.error.set('');
    if (f && !['image/jpeg', 'image/png'].includes(f.type)) {
      this.error.set('Please choose a JPG or PNG image.');
      this.file.set(null);
      this.preview.set('');
      return;
    }
    if (f && f.size > 8 * 1024 * 1024) {
      this.error.set('Image is larger than 8 MB.');
      this.file.set(null);
      return;
    }
    this.file.set(f);
    this.preview.update((old) => {
      if (old) URL.revokeObjectURL(old);
      return f ? URL.createObjectURL(f) : '';
    });
  }

  /** Loads the bundled sample room (an illustration shipped with the app) so visitors can try the editor without a photo. */
  async useSample() {
    this.error.set('');
    try {
      const res = await fetch('/sample-room.png');
      if (!res.ok) throw new Error('missing');
      const f = new File([await res.blob()], 'sample-room.png', { type: 'image/png' });
      this.file.set(f);
      this.title.set('Sample living room');
      this.owned.set(true); // the app supplies this image, so there is nothing to confirm
      this.preview.update((old) => {
        if (old) URL.revokeObjectURL(old);
        return URL.createObjectURL(f);
      });
    } catch {
      this.error.set('Could not load the sample room. Please upload your own photo.');
    }
  }

  /** Shrinks big photos in the browser (the editor works at 1600 px anyway) so uploads stay small and fast. */
  private async shrink(file: File): Promise<Blob> {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / bitmap.width);
    if (scale === 1 && file.size <= 3 * 1024 * 1024) return file;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return new Promise((resolve) => canvas.toBlob((b) => resolve(b ?? file), 'image/jpeg', 0.9));
  }

  async submit(e: Event) {
    e.preventDefault();
    const f = this.file();
    if (!f || !this.owned()) return;
    this.busy.set(true);
    const image = await this.shrink(f).catch(() => f);
    const form = new FormData();
    form.append('title', this.title());
    form.append('confirmOwnership', 'true');
    form.append('image', image, image === f ? f.name : 'room.jpg');
    this.api.createProject(form).subscribe({
      next: (r) => this.router.navigate(['/editor', r.project._id]),
      error: (err) => {
        this.error.set(err.error?.message ?? 'Upload failed.');
        this.busy.set(false);
      },
    });
  }
}
