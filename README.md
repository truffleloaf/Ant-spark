# Last Ringgit

A 30-day money survival game for students and first-time earners. Real sign-in and profiles use Supabase. Decisions, reports, and rewind comparisons are calculated locally; game progress stays in this browser, separated by account ID.

```sh
npm install
npm run dev
npm run test
npm run build
```

## Connect authentication

1. Create a Supabase project. Run `supabase/schema.sql` once in its SQL Editor.
2. Copy `.env.example` to `.env.local`. Fill in the project URL and **publishable** key (legacy anon key also supported). Never use a secret/service-role key in this frontend.
3. In Supabase Authentication URL Configuration, set Site URL to your deployed URL, and allow that URL plus `http://localhost:5173` and `http://127.0.0.1:5173` as redirect URLs. Email confirmation and password reset use these URLs.
4. Restart Vite after editing environment variables. Create an account, confirm the email, sign in, and complete onboarding. Email delivery/rate limits depend on your Supabase project; prepare a confirmed account before judging.
5. For Vercel, add the same `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` environment variables and redeploy. Build command: `npm run build`; output: `dist`.

Without configuration, the app explicitly offers demo mode; it does not pretend to authenticate. The profile and access policies must be set up before real sign-in is usable end to end.

## Teammate integration

- `src/auth/AccountGate.tsx`: sign-up, login, password recovery, profile form, session restoration, and sign-out. Wrapped around the existing App in `src/main.tsx`.
- `src/game/profile.ts`: player data validation and supported income/budget presets.
- `src/game/scenarios.ts`: team-authored scenarios. Keep stable IDs, chronological days, valid parent conditions, and an affordable fallback. Negative cashChange means spending. Cashback example uses the net cost. These amounts are illustrative, not verified market prices.
- `src/game/usePlayerGame.ts`: game hook; exposes state, config, profile, engine, report, choose, setSplit, rewindPreview, applyRewind, restoreOriginal, confidence, setConfidence, and reset.
- `src/game/engine.ts`: deterministic calculations. Student profiles use RM250 bills / RM10 daily essentials; working profiles use RM400 / RM15. Day 1 is the income/split day; daily costs are charged on days 2–30. Cash shortfalls reduce essentials coverage; savings are used for choices only when selected.
- `supabase/schema.sql`: profiles tied to auth user IDs with per-user row-level access policies. No game database or custom API server is required.

Browser saves use `last-ringgit:v2:<userId>`. An existing game's profile is snapshotted; a new game uses the current profile. Original history is retained when applying rewind. Later choices are reused where affordable, otherwise the cheapest option is selected, as explained in the comparison. Game state is educational and client-controlled; do not use it for financial assessments or a trusted competitive leaderboard.

## Fast judging demo

Sign in → choose student or first salary → set a savings goal → play through the cashback offer → see the report and confidence question → rewind the purchase → compare the result → restore the original timeline.

## Verification

`npm test` covers deterministic replay, affordability, conditional events, rewind consistency, profile validation, corrupt save recovery, and 480 varied playthroughs across all four income presets. `npm run build` checks TypeScript and produces the static site.

Live checks after Supabase setup: sign up/confirm/sign in, refresh to restore session, save and reload profile, sign out, sign in as a second user and verify independent progress, and test password reset. The SQL policies should be verified with two authenticated users before relying on them for real personal data.
