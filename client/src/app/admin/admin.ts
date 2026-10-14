import { DatePipe } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { ApiService } from '../core/api.service';
import { AdminProject, AdminUser, Color, Pattern, Stats, TimelineDay } from '../core/models';
import { Nav } from '../shared/nav';

type Tab = 'dashboard' | 'colours' | 'patterns' | 'users' | 'designs' | 'settings';

const W = 640;
const H = 220;
const M = { l: 36, r: 8, t: 10, b: 28 };

@Component({
  selector: 'app-admin',
  imports: [Nav, DatePipe],
  templateUrl: './admin.html',
  styleUrl: './admin.scss',
})
export class Admin implements OnInit, OnDestroy {
  protected api = inject(ApiService);
  private timer?: ReturnType<typeof setInterval>;

  readonly tabs: { id: Tab; label: string }[] = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'colours', label: 'Colours' },
    { id: 'patterns', label: 'Patterns' },
    { id: 'users', label: 'Users' },
    { id: 'designs', label: 'Designs' },
    { id: 'settings', label: 'Settings' },
  ];
  readonly tab = signal<Tab>('dashboard');
  readonly msg = signal('');
  readonly confirmId = signal<string | null>(null);

  readonly stats = signal<Stats | null>(null);
  readonly timeline = signal<TimelineDay[]>([]);
  readonly showTable = signal(false);
  readonly hover = signal<number | null>(null);
  readonly updated = signal<Date | null>(null);

  readonly colors = signal<Color[]>([]);
  readonly patterns = signal<Pattern[]>([]);
  readonly users = signal<AdminUser[]>([]);
  readonly designs = signal<AdminProject[]>([]);

  // system configuration
  readonly settings = signal<{ key: string; value: unknown }[]>([]);
  readonly sKey = signal('');
  readonly sValue = signal('');
  // inline editing of a colour or pattern
  readonly editId = signal<string | null>(null);
  readonly eName = signal('');
  readonly eHex = signal('#000000');
  readonly eStyle = signal('');
  // new colour form
  readonly cName = signal('');
  readonly cHex = signal('#4f86c6');
  readonly cBrand = signal('');
  readonly cTags = signal('');
  // new pattern form
  readonly pName = signal('');
  readonly pStyle = signal('');
  readonly pFile = signal<File | null>(null);

  readonly chart = computed(() => {
    const data = this.timeline();
    const top = Math.max(1, ...data.map((d) => d.uploads));
    const max = top <= 4 ? 4 : Math.ceil(top / 4) * 4;
    const iw = W - M.l - M.r;
    const ih = H - M.t - M.b;
    const slot = iw / Math.max(1, data.length);
    const bars = data.map((d, i) => {
      const h = (d.uploads / max) * ih;
      return { ...d, x: M.l + i * slot + slot * 0.3, w: slot * 0.4, y: M.t + ih - h, h, cx: M.l + i * slot + slot / 2, label: d.day.slice(5) };
    });
    const ticks = [0, 1, 2, 3, 4].map((t) => ({ v: (max / 4) * t, y: M.t + ih - (t / 4) * ih }));
    return { bars, ticks, W, H, left: M.l, right: W - M.r, base: M.t + ih };
  });

  readonly sessionLabel = computed(() => {
    const s = this.stats()?.avgSessionSeconds ?? 0;
    return `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`;
  });

  ngOnInit() {
    this.loadDashboard();
    this.loadCatalogue();
    // Real-time KPIs: refresh the dashboard every 10 seconds.
    this.timer = setInterval(() => this.tab() === 'dashboard' && this.loadDashboard(), 10000);
  }

  ngOnDestroy() {
    clearInterval(this.timer);
  }

  setTab(t: Tab) {
    this.tab.set(t);
    this.msg.set('');
    this.confirmId.set(null);
    this.editId.set(null);
    if (t === 'settings') this.api.adminSettings().subscribe((s) => this.settings.set(s));
    if (t === 'users') this.api.adminUsers().subscribe((u) => this.users.set(u));
    if (t === 'designs') this.api.adminProjects().subscribe((d) => this.designs.set(d));
    if (t === 'dashboard') this.loadDashboard();
  }

  private loadDashboard() {
    this.api.adminStats().subscribe({ next: (s) => (this.stats.set(s), this.updated.set(new Date())), error: () => this.msg.set('Could not load stats.') });
    this.api.adminTimeline().subscribe((t) => this.timeline.set(t));
  }

  private loadCatalogue() {
    this.api.colors().subscribe((c) => this.colors.set(c));
    this.api.patterns().subscribe((p) => this.patterns.set(p));
  }

  private fail(err: { error?: { message?: string } }) {
    this.msg.set(err.error?.message ?? 'Something went wrong.');
  }

  // ---- system configuration ----
  saveSetting(e: Event) {
    e.preventDefault();
    const key = this.sKey().trim();
    if (!key) return;
    this.api.saveSetting(key, this.sValue()).subscribe({
      next: (s) => {
        this.settings.update((l) => [...l.filter((x) => x.key !== s.key), s].sort((a, b) => a.key.localeCompare(b.key)));
        this.sKey.set('');
        this.sValue.set('');
        this.msg.set(`Saved setting ${s.key}.`);
      },
      error: (err) => this.fail(err),
    });
  }

  editSetting(s: { key: string; value: unknown }) {
    this.sKey.set(s.key);
    this.sValue.set(String(s.value ?? ''));
  }

  // ---- inline edit (colours and patterns) ----
  startEditColor(c: Color) {
    this.editId.set(c._id);
    this.eName.set(c.name);
    this.eHex.set(c.hex);
  }

  saveColorEdit(c: Color) {
    this.api.updateColor(c._id, { name: this.eName(), hex: this.eHex() }).subscribe({
      next: (u) => {
        this.colors.update((l) => l.map((x) => (x._id === u._id ? u : x)));
        this.editId.set(null);
        this.msg.set(`Updated ${u.name}.`);
      },
      error: (err) => this.fail(err),
    });
  }

  startEditPattern(p: Pattern) {
    this.editId.set(p._id);
    this.eName.set(p.name);
    this.eStyle.set(p.style ?? '');
  }

  savePatternEdit(p: Pattern) {
    this.api.updatePattern(p._id, { name: this.eName(), style: this.eStyle() }).subscribe({
      next: (u) => {
        this.patterns.update((l) => l.map((x) => (x._id === u._id ? u : x)));
        this.editId.set(null);
        this.msg.set(`Updated ${u.name}.`);
      },
      error: (err) => this.fail(err),
    });
  }

  // ---- colours ----
  addColor(e: Event) {
    e.preventDefault();
    const tags = this.cTags().split(',').map((t) => t.trim()).filter(Boolean);
    this.api.addColor({ name: this.cName(), hex: this.cHex(), brand: this.cBrand() || undefined, tags }).subscribe({
      next: (c) => {
        this.colors.update((l) => [...l, c].sort((a, b) => a.name.localeCompare(b.name)));
        this.cName.set('');
        this.cTags.set('');
        this.msg.set(`Added ${c.name}.`);
      },
      error: (err) => this.fail(err),
    });
  }

  removeColor(c: Color) {
    this.api.deleteColor(c._id).subscribe({
      next: () => {
        this.colors.update((l) => l.filter((x) => x._id !== c._id));
        this.confirmId.set(null);
      },
      error: (err) => this.fail(err),
    });
  }

  // ---- patterns ----
  pickPatternFile(e: Event) {
    this.pFile.set((e.target as HTMLInputElement).files?.[0] ?? null);
  }

  addPattern(e: Event) {
    e.preventDefault();
    const file = this.pFile();
    if (!file) return;
    const form = new FormData();
    form.append('name', this.pName());
    form.append('style', this.pStyle());
    form.append('image', file);
    this.api.addPattern(form).subscribe({
      next: (p) => {
        this.patterns.update((l) => [...l, p]);
        this.pName.set('');
        this.pStyle.set('');
        this.pFile.set(null);
        this.msg.set(`Added ${p.name}.`);
      },
      error: (err) => this.fail(err),
    });
  }

  removePattern(p: Pattern) {
    this.api.deletePattern(p._id).subscribe({
      next: () => {
        this.patterns.update((l) => l.filter((x) => x._id !== p._id));
        this.confirmId.set(null);
      },
      error: (err) => this.fail(err),
    });
  }

  // ---- designs ----
  removeDesign(d: AdminProject) {
    this.api.adminDeleteProject(d._id).subscribe({
      next: () => {
        this.designs.update((l) => l.filter((x) => x._id !== d._id));
        this.confirmId.set(null);
      },
      error: (err) => this.fail(err),
    });
  }
}
