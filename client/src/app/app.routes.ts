import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./pages/login/login').then((m) => m.Login) },
  { path: 'upload', canActivate: [authGuard], loadComponent: () => import('./pages/upload/upload').then((m) => m.Upload) },
  { path: 'editor/:id', canActivate: [authGuard], loadComponent: () => import('./editor/editor').then((m) => m.Editor) },
  { path: '', pathMatch: 'full', redirectTo: 'upload' },
  { path: '**', redirectTo: 'upload' },
];
