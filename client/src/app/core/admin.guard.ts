import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  if (!auth.isLoggedIn()) return inject(Router).createUrlTree(['/login']);
  return auth.user()?.role === 'admin' ? true : inject(Router).createUrlTree(['/designs']);
};
