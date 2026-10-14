import { Routes } from '@angular/router';
import { adminGuard } from './core/admin.guard';
import { authGuard } from './core/auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', loadComponent: () => import('./pages/home/home').then((m) => m.Home) },
  { path: 'login', loadComponent: () => import('./pages/login/login').then((m) => m.Login) },
  { path: 'how-to-use', loadComponent: () => import('./pages/howto/howto').then((m) => m.Howto) },
  { path: 'upload', canActivate: [authGuard], loadComponent: () => import('./pages/upload/upload').then((m) => m.Upload) },
  { path: 'designs', canActivate: [authGuard], loadComponent: () => import('./pages/designs/designs').then((m) => m.Designs) },
  { path: 'editor/:id', canActivate: [authGuard], loadComponent: () => import('./editor/editor').then((m) => m.Editor) },
  { path: 'admin', canActivate: [adminGuard], loadComponent: () => import('./admin/admin').then((m) => m.Admin) },
  { path: '**', redirectTo: '' },
];
