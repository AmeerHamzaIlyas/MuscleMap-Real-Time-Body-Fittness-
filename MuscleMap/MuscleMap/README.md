# MuscleMap (Semester Project)

MuscleMap is an interactive web app for exploring exercises by muscle group with a 3D anatomy viewer (Sketchfab).

**Tech stack:** ASP.NET Core 10 (C#) backend + HTML/CSS/JavaScript frontend.

## How to run

You need the [.NET 10 SDK](https://dotnet.microsoft.com/download/dotnet/10.0) installed.

From the project folder:

```bash
dotnet run --project MuscleMap.Web
```

Then open **http://localhost:5180/splash.html** in your browser.

> Requires internet for the Sketchfab 3D model.  
> Do not open HTML files directly (`file://`) — auth and data use the .NET server.

## Features

- Animated splash screen with MuscleMap logo
- User registration & login (cookie auth, hashed passwords)
- **SQLite database** on the server for users, preferences, and favorites
- Profile page with stats, settings, and logout
- 3D anatomy viewer with per-muscle camera alignment
- Exercise search, filters, favorites, workout generator

## Project structure

| Path | Purpose |
|------|---------|
| `MuscleMap.sln` | Visual Studio / Rider solution |
| `MuscleMap.Web/` | ASP.NET Core 10 web host and API |
| `MuscleMap.Web/Controllers/` | Auth and user API |
| `MuscleMap.Web/Data/` | Entity Framework + SQLite |
| `splash.html` | App entry — logo animation → login or main app |
| `login.html` / `register.html` | Authentication UI |
| `index.html` | Main app |
| `profile.html` | User profile & settings |
| `js/db.js` | Client API wrapper (replaces IndexedDB) |
| `js/auth.js` | Login/register session handling |
| `js/app.js` | Exercises, favorites, camera tools |
| `js/model.js` | Sketchfab 3D viewer |
| `assets/logo.svg` | App logo |

## Database (SQLite)

File: `MuscleMap.Web/musclemap.db` (created on first run)

| Table | Stores |
|-------|--------|
| `Users` | name, email, password hash, createdAt |
| `Preferences` | theme, units, difficulty default, animations |
| `Favorites` | starred exercises per user |

API endpoints:

- `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
- `GET/PUT /api/user/preferences`, `GET/PUT /api/user/favorites`, `GET /api/user/profile`

## Notes

- Camera poses are saved per user in SQLite (`/api/user/camera-poses`) and mirrored in browser `localStorage` for offline backup.
- UI and exercise data are unchanged; only user storage moved to the .NET backend.
