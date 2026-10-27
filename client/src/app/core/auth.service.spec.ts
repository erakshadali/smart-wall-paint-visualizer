import { tokenExpired } from './auth.service';

const jwt = (payload: object) => `h.${btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_')}.s`;

describe('tokenExpired', () => {
  const now = 1_000_000_000_000;
  it('treats a missing or unreadable token as expired', () => {
    expect(tokenExpired(null, now)).toBeTrue();
    expect(tokenExpired('garbage', now)).toBeTrue();
  });
  it('compares the exp claim with the current time', () => {
    expect(tokenExpired(jwt({ exp: now / 1000 - 10 }), now)).toBeTrue();
    expect(tokenExpired(jwt({ exp: now / 1000 + 3600 }), now)).toBeFalse();
  });
});
