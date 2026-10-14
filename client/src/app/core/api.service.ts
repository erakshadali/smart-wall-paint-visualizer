import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { API_URL } from '../config';
import { AdminProject, AdminUser, Color, Pattern, Project, Stats, TimelineDay, User, WallDto } from './models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private url = (p: string) => `${API_URL}/api${p}`;

  login(email: string, password: string) {
    return this.http.post<{ token: string; user: User }>(this.url('/auth/login'), { email, password });
  }

  register(name: string, email: string, password: string) {
    return this.http.post<{ token: string; user: User }>(this.url('/auth/register'), { name, email, password });
  }

  // ---- catalogue ----
  colors() {
    return this.http.get<Color[]>(this.url('/colors'));
  }

  patterns() {
    return this.http.get<Pattern[]>(this.url('/patterns'));
  }

  // ---- projects ----
  projects() {
    return this.http.get<Project[]>(this.url('/projects'));
  }

  createProject(form: FormData) {
    return this.http.post<{ project: Project; disclaimer: string }>(this.url('/projects'), form);
  }

  getProject(id: string) {
    return this.http.get<{ project: Project; disclaimer: string }>(this.url(`/projects/${id}`));
  }

  saveProject(id: string, walls: WallDto[], title?: string) {
    return this.http.put<{ project: Project }>(this.url(`/projects/${id}`), { walls, title });
  }

  saveResult(id: string, image: Blob) {
    const form = new FormData();
    form.append('image', image, 'design.png');
    return this.http.post<{ project: Project }>(this.url(`/projects/${id}/result`), form);
  }

  duplicateProject(id: string) {
    return this.http.post<{ project: Project }>(this.url(`/projects/${id}/duplicate`), {});
  }

  deleteProject(id: string) {
    return this.http.delete<void>(this.url(`/projects/${id}`));
  }

  // ---- user feedback / KPIs ----
  sendFeedback(rating: number, comment: string) {
    return this.http.post<void>(this.url('/me/feedback'), { rating, comment });
  }

  // ---- admin ----
  adminStats() {
    return this.http.get<Stats>(this.url('/admin/stats'));
  }

  adminTimeline() {
    return this.http.get<TimelineDay[]>(this.url('/admin/timeline'));
  }

  adminUsers() {
    return this.http.get<AdminUser[]>(this.url('/admin/users'));
  }

  adminProjects() {
    return this.http.get<AdminProject[]>(this.url('/admin/projects'));
  }

  adminDeleteProject(id: string) {
    return this.http.delete<void>(this.url(`/admin/projects/${id}`));
  }

  addColor(c: Partial<Color>) {
    return this.http.post<Color>(this.url('/colors'), c);
  }

  updateColor(id: string, c: Partial<Color>) {
    return this.http.put<Color>(this.url(`/colors/${id}`), c);
  }

  deleteColor(id: string) {
    return this.http.delete<void>(this.url(`/colors/${id}`));
  }

  addPattern(form: FormData) {
    return this.http.post<Pattern>(this.url('/patterns'), form);
  }

  deletePattern(id: string) {
    return this.http.delete<void>(this.url(`/patterns/${id}`));
  }

  imageUrl(path: string) {
    return `${API_URL}${path}`;
  }
}
