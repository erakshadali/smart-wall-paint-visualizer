import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { API_URL } from '../config';
import { Color, Project, User, WallDto } from './models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);

  login(email: string, password: string) {
    return this.http.post<{ token: string; user: User }>(`${API_URL}/api/auth/login`, { email, password });
  }

  register(name: string, email: string, password: string) {
    return this.http.post<{ token: string; user: User }>(`${API_URL}/api/auth/register`, { name, email, password });
  }

  colors() {
    return this.http.get<Color[]>(`${API_URL}/api/colors`);
  }

  createProject(form: FormData) {
    return this.http.post<{ project: Project; disclaimer: string }>(`${API_URL}/api/projects`, form);
  }

  getProject(id: string) {
    return this.http.get<{ project: Project; disclaimer: string }>(`${API_URL}/api/projects/${id}`);
  }

  saveProject(id: string, walls: WallDto[], title?: string) {
    return this.http.put<{ project: Project }>(`${API_URL}/api/projects/${id}`, { walls, title });
  }

  saveResult(id: string, image: Blob) {
    const form = new FormData();
    form.append('image', image, 'design.png');
    return this.http.post<{ project: Project }>(`${API_URL}/api/projects/${id}/result`, form);
  }

  imageUrl(path: string) {
    return `${API_URL}${path}`;
  }
}
