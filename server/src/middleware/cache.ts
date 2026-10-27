import { RequestHandler } from 'express';

/** Lets the CDN reuse public, rarely-changing lists for a minute so most visitors skip the slow origin round trip. */
export const edgeCache: RequestHandler = (_req, res, next) => {
  res.set('Cache-Control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=600');
  next();
};
