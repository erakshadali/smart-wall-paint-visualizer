import 'dotenv/config';
import app, { connectDb } from './app.js';

const port = process.env.PORT || 5000;
connectDb()
  .then(() => app.listen(port, () => console.log(`API running on http://localhost:${port}`)))
  .catch((err) => {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  });
