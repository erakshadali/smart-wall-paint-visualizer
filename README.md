# Smart Wall Paint Visualizer

A MEAN-stack web app that lets people preview paint colours and wall patterns on **their own room photos**
before painting. Built as a Unified Mentor Full-stack Web Development internship project.

> Colours shown are a preview. Final results may vary due to lighting, screen calibration and wall texture.

## Features

**Users**
- Register / log in (JWT)
- Upload a JPG or PNG room photo (confirming it is their own original photo)
- Select walls manually with a **polygon** tool or a **brush**; edit, drag points, delete, undo / redo
- Apply solid colours or tiled **patterns**; opacity, matte / satin / glossy finish, pattern size
- Dual-tone rooms (each wall has its own colour), realistic blending that keeps the photo's light and shadow
- Before / After slider, save designs, duplicate a design to try another scheme, download a PNG
- Favourites, feedback and a "How to use" guide

**Admin**
- Manage colours and patterns (add / delete, pattern image upload)
- View users and all saved designs, remove designs
- KPI dashboard (refreshes every 10 s): images uploaded, designs saved, average session duration, user satisfaction, plus a 14-day uploads chart

## Tech stack

| Layer | Technology |
|-------|------------|
| Frontend | Angular 20, TypeScript, SCSS, HTML5 Canvas |
| Backend | Node.js, Express 5, TypeScript, REST API, JWT |
| Database | MongoDB (Mongoose): users, projects, colours, patterns, images, sessions, feedback |
| Hosting | Vercel (client), Render (API), MongoDB Atlas (database) |

## Project structure

```
client/   Angular app (pages: home, login, upload, editor, designs, how-to, admin)
server/   Express API (models, routes, middleware, seed script)
render.yaml   Render blueprint for the API
```

How the realistic paint works: for every pixel in a selected wall the app keeps its brightness relative to the
wall's average brightness and applies it to the chosen colour (or pattern pixel), so shadows and light falloff stay
visible. See `client/src/app/editor/paint-engine.ts`.

## Run locally

Prerequisites: Node 20+, a MongoDB connection string (local MongoDB or a free MongoDB Atlas cluster).

```bash
# 1. API
cd server
npm install
cp .env.example .env        # then edit MONGODB_URI and JWT_SECRET
npm run seed                # 40 colours, 6 patterns, admin account
npm run dev                 # http://localhost:5000

# 2. Client (new terminal)
cd client
npm install
npm start                   # http://localhost:4200
```

`server/.env`

| Variable | Purpose |
|----------|---------|
| `MONGODB_URI` | MongoDB connection string (include the database name) |
| `JWT_SECRET` | Long random string used to sign tokens |
| `CLIENT_URL` | Allowed browser origin(s), comma separated (e.g. `http://localhost:4200`) |
| `PORT` | API port (default 5000) |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Admin account created by `npm run seed`. **Change the password before deploying.** |

## API reference

All endpoints are under `/api`. Protected routes need `Authorization: Bearer <token>`.

| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | `/health` | public | Health check |
| POST | `/auth/register` | public | `{ name, email, password }` (8+ chars) returns `{ token, user }` |
| POST | `/auth/login` | public | `{ email, password }` returns `{ token, user }` |
| GET | `/colors` | public | List colours (`?q=` name search, `?tag=`) |
| POST / PUT / DELETE | `/colors`, `/colors/:id` | admin | Manage colours (`name`, `hex` `#RRGGBB`, `brand`, `tags`) |
| GET | `/patterns` | public | List patterns |
| POST | `/patterns` | admin | Multipart: `name`, `style`, `image` |
| PUT / DELETE | `/patterns/:id` | admin | Update / delete a pattern |
| GET | `/projects` | user | Your designs |
| POST | `/projects` | user | Multipart: `image`, `title`, `confirmOwnership=true` |
| GET | `/projects/:id` | owner | One design + disclaimer |
| PUT | `/projects/:id` | owner | Save `{ title, walls[] }` (polygon needs 3+ points, brush 2+) |
| POST | `/projects/:id/result` | owner | Multipart `image`: the rendered painted PNG |
| POST | `/projects/:id/duplicate` | owner | Copy a design |
| DELETE | `/projects/:id` | owner | Delete a design |
| GET | `/me` | user | Profile with favourites |
| POST | `/me/favourites/:kind/:id` | user | Toggle favourite (`kind` = `colors` or `patterns`) |
| POST | `/me/session` | user | `{ seconds }` session duration (KPI) |
| POST | `/me/feedback` | user | `{ rating 1-5, comment }` |
| GET | `/admin/stats` | admin | KPI numbers |
| GET | `/admin/timeline` | admin | Uploads per day, last 14 days |
| GET | `/admin/users`, `/admin/projects` | admin | Users, all designs |
| DELETE | `/admin/projects/:id` | admin | Remove a design |
| GET / PUT | `/admin/settings`, `/admin/settings/:key` | admin | System configuration values |

Stored images are served from `/uploads/:name` (outside `/api`) using random, unguessable file names.

A wall looks like:

```json
{ "type": "polygon", "points": [{ "x": 120, "y": 80 }, { "x": 640, "y": 90 }, { "x": 600, "y": 410 }],
  "colorId": "…", "patternId": null, "patternScale": 1, "opacity": 0.85, "finish": "matte" }
```

## Security and data handling

- Passwords hashed with bcrypt; JWT auth; role checks on admin routes; users can only access their own designs
- Uploads: JPG / PNG only, 8 MB max, the file **signature** is verified (not just the MIME type), random file names
- Photos are stored in MongoDB, so the API is stateless and works on hosts with ephemeral disks
- Helmet, CORS allow-list, rate limiting, request body size limits
- Users must confirm they own the photo they upload

## Deploy

1. **Database**: create a free MongoDB Atlas cluster and a database user, and allow network access for your host
   (Atlas, Network Access). Copy the connection string and add the database name (`/wall-paint-visualizer`).
2. **API on Render**: push the repo to GitHub, create a Render *Blueprint* from `render.yaml`, and set
   `MONGODB_URI` and `CLIENT_URL` (your Vercel URL). Run `npm run seed` once against the same `MONGODB_URI`
   (locally is fine). Note the API URL, e.g. `https://wall-paint-visualizer-api.onrender.com`.
3. **Client on Vercel**: import the repo with *Root Directory* `client`. Before deploying, set `apiUrl` in
   `client/src/environments/environment.ts` to your API URL. `client/vercel.json` already handles the Angular
   build output and single-page routing.
4. Add the final Vercel URL to `CLIENT_URL` on Render, then redeploy the API.
5. Log in as the admin, change the admin password, and check the dashboard.

On Render's free plan the API sleeps when idle, so the first request after a break can take about 30 seconds.

## Scripts

| Where | Command | What it does |
|-------|---------|--------------|
| server | `npm run dev` | API with auto-reload |
| server | `npm run build` / `npm start` | Compile and run in production |
| server | `npm run seed` | Seed colours, patterns and the admin account (safe to re-run) |
| client | `npm start` | Dev server on port 4200 |
| client | `npm run build` | Production build into `dist/client/browser` |

## Roadmap (future enhancements)

AI-based automatic wall detection, advanced textures and 3D previews, day / night lighting simulation,
and integration with paint brands and retailers.
