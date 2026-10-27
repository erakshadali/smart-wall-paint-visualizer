import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { API_URL } from '../config';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // inject() only works here, not inside the async error callback below.
  const auth = inject(AuthService);
  const token = auth.token();
  if (token && req.url.startsWith(API_URL)) {
    req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }
  // A rejected token (expired, or from an older session) means the saved login is no good: sign out and ask for a fresh one.
  return next(req).pipe(
    catchError((err) => {
      if (token && err?.status === 401 && !req.url.includes('/auth/')) auth.logout(true);
      return throwError(() => err);
    })
  );
};
