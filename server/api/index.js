// Vercel serverless entry: the compiled Express app handles every request.
import app from '../dist/app.js';

export default function handler(req, res) {
  return app(req, res);
}
