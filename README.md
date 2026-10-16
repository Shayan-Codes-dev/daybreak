# Daybreak

Daybreak is an original, mobile-first internet playground made with love in Pakistan. Explore bite-sized quizzes and tools, share challenges with friends, and come back for a daily question.

## What’s inside

- **City match** — a four-question quiz that matches your answers to a Pakistani city
- **Chai calculator** — estimate a weekly and yearly chai budget
- **Pakistan, actually** — five quick trivia questions with explanations and a score
- **Aaj ka challenge** — the same date-based Pakistan question for everyone, a local streak, and links that let friends compare scores
- **Challenge a friend** — share your city-match result; friends can take the same quiz and compare outcomes
- Search, category filters, and a saved-experiences filter
- Save and remove favourites (stored locally in this browser)
- Optional Firebase email/password and Google sign-in, account creation, and password reset

Guest play does not require an account. Daily history and saved favourites stay in the current browser. Shared challenge links carry the challenge and result in the URL; there is no live multiplayer room or server-side leaderboard yet.

## Run locally

```powershell
npm install
Copy-Item .env.example .env
npm run dev
```

Fill in the `VITE_FIREBASE_*` values in `.env` from your Firebase web app configuration. In Firebase Console, enable **Email/Password** and **Google** under Authentication → Sign-in method, and add your local development host (normally `localhost`) under Authentication → Settings → Authorized domains.

Firebase is only used for optional account features; the playground works without signing in. Vite exposes `VITE_` environment values in the browser bundle, so use only Firebase web app configuration values here, never private server credentials. `.env` is ignored by Git.

Use `npm run build` to create a production build and `npm run lint` to run ESLint.
