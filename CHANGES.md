# Fixes applied — Event Registration (Task 1)

## Login credentials — verdict
The auth design itself is sound: no hardcoded admin username/password, real
bcrypt-hashed passwords (never stored/logged in plaintext), RS256 JWTs with a
12h expiry, and every `/api/admin/**` route requires a valid token. Two real
gaps were fixed below (duplicate usernames, weak username format), and two
are worth knowing about but were left alone since fixing them changes the
architecture rather than fixing a bug — see "Known trade-offs" at the bottom.

## Bugs fixed

1. **Race condition on signup (duplicate usernames possible).**
   `AuthResource.signup` checked `User.usernameTaken()` and then wrote the
   new user in two separate steps. Two signups for the same username sent at
   the same moment could both pass the check and both get created — silently
   breaking the "usernames are unique" guarantee the whole login system
   depends on.
   - Added `MongoIndexInitializer`, which creates a **unique index** on
     `users.username` at startup, so Mongo itself now enforces uniqueness.
   - `AuthResource.signup` now catches the resulting duplicate-key error and
     returns the same friendly `409 "That username is already taken"` a
     normal collision gets, instead of leaking a 500.

2. **Usernames could contain arbitrary characters.** `SignupRequest` only
   checked length (3–30 chars), so usernames like `" "` or `a/b?c` were
   accepted — awkward since the username is later shown in the UI. Added
   `@Pattern` restricting it to letters, numbers, `_ . -`, matched by a
   client-side check in `Signup.tsx` for immediate feedback.

3. **Phone number field accepted anything non-blank**, including letters or
   a single character. Added a `@Pattern` on `RegistrationRequest.phone`
   (server) and a matching regex in `RegistrationForm.tsx` (client).

4. **No signup confirm-password field.** A typo in the password field was
   undetectable until the next login attempt. Added a "Confirm Password"
   field with a client-side match check.

5. **Unbounded string field lengths.** `fullName`, `email`, `department`,
   `eventName` had no `@Size` cap, so an oversized payload could bloat a
   Mongo document. Added sane max lengths.

6. **Stale/out-of-order search results in the admin dashboard.** If an admin
   typed a new search before the previous one finished loading, a slow
   response for the *old* query could arrive after the new one and overwrite
   it with wrong results. `AdminDashboard.tsx` now tags each request and
   ignores any response that isn't the latest one.

7. **Whitespace wasn't trimmed** before validating/submitting the
   registration form or before login/signup usernames — e.g. `"  "` passed
   the "required" check, and `"alice "` and `"alice"` were treated as
   different logins. Both are now trimmed consistently.

## Accessibility fixes

- **Insufficient color contrast.** `--text-faint` (used for the "at least 8
  characters" style hint text) was `#545e82` on the app's dark background —
  only ~2.9:1 contrast, below the WCAG AA minimum of 4.5:1 for normal text.
  Lightened to `#8b94b9` (~6.3:1).
- **Missing `autocomplete` attributes** on all username/password/email
  fields — added `username`, `current-password`, `new-password`, `email`,
  `name`, `tel`, `organization` as appropriate, so password managers and
  browser autofill work correctly.
- **Form errors weren't associated with their fields.** Error text appeared
  visually next to a field but wasn't linked for screen readers. Added
  `aria-invalid` + `aria-describedby` wiring the input to its error message,
  plus `role="alert"` on each error so it's announced when it appears.
- **Failed validation didn't move focus.** On submit with errors, keyboard/
  screen-reader users had no way to find the problem field except scanning
  the whole form. Now focuses the first invalid field.
- **Admin search input had no accessible label**, relying on placeholder
  text alone (which disappears once typed, and isn't reliably announced by
  all screen readers). Added a visually-hidden `<label>` and `role="search"`
  on the form; added a `.visually-hidden` utility class to `styles.css`.

## Known trade-offs (not changed, flagged for awareness)

- **JWT kept in `localStorage`.** This is what makes "stay logged in across
  a refresh" work, but it's readable by any JS on the page, so it's
  vulnerable to XSS in a way an httpOnly cookie wouldn't be. Switching to a
  cookie-based session would need CORS/CSRF changes on the backend, so it
  wasn't done here — worth considering if this goes to real production use.

---

# Round 2 — tests, rate limiting, admin CRUD, pagination, ops

## New backend capabilities

- **Rate limiting.** `/api/auth/login` and `/api/auth/signup` now go through
  a small in-memory sliding-window limiter (`RateLimiter`): 10 login
  attempts/min per (IP, username), 20 signups/min per IP. It's in-process
  only (not shared across multiple backend instances), which is a real
  limitation if this is ever horizontally scaled — but it stops the basic
  case (one attacker hammering the endpoint) with zero extra infrastructure.
- **Duplicate registrations blocked.** Added a unique compound index on
  `registrations.(email, eventName)`, so the same person can't end up
  registered twice for the same event (e.g. from a double-clicked submit
  button). `POST /api/registrations` now returns `409` for that case instead
  of silently creating a duplicate row.
- **Admin can edit and delete registrations.** New `PUT` and `DELETE
  /api/admin/registrations/{id}` endpoints, both behind the same
  `@RolesAllowed("user")` check as the rest of the dashboard. The dashboard
  table now has inline Edit/Save/Cancel and Delete (with a confirm prompt)
  per row.
- **Pagination.** `GET /api/admin/registrations` now accepts `page`/`size`
  query params (default size 25, capped at 200) and returns `X-Total-Count`
  so the UI isn't pulling the entire table on every load. The dashboard has
  Prev/Next controls.
- **CSV export respects the current filter.** `GET
  /api/admin/registrations/export?event=...` exports what's currently
  filtered/visible, not always the whole table.
- **Health check.** Added `quarkus-smallrye-health`, which exposes
  `/q/health`, `/q/health/live`, and `/q/health/ready` (the last one
  automatically includes Mongo connectivity) with no extra code needed —
  useful for a platform like Koyeb/Render to actually know if the app is up.
- **Backend tests.** `AuthResourceTest` and `RegistrationResourceTest`
  (RestAssured + `@QuarkusTest`) cover: signup/login happy path, duplicate
  username, invalid username/password format, wrong-password login, the
  rate limiter tripping after repeated failures, duplicate registration
  rejection, admin list/search/edit/delete, and CSV export auth. Tests use
  **Quarkus Dev Services**: the Mongo connection string is now scoped to
  `%dev`/`%prod` only, so with nothing configured for `%test`, Quarkus spins
  up a throwaway Mongo container automatically via Testcontainers. **This
  needs Docker available wherever `mvn test` runs** (already true on
  GitHub-hosted CI runners).
- **Fresh JWT keypair.** Generated new `privateKey.pem`/`publicKey.pem` for
  this project instead of reusing the previous checked-in ones (worth doing
  any time a template like this gets reused, since anyone with the old
  private key could forge tokens for it).

## New frontend capabilities

- **Admin dashboard**: pagination controls, inline edit (with the same
  validation rules as the public registration form), delete with a confirm
  prompt, and CSV export that now passes the active search filter through.
  `client.ts` gained `deleteRegistration`, `updateRegistration`, and an
  updated `fetchRegistrations`/`downloadCsv` to match.
- **Frontend tests** (Vitest + React Testing Library):
  `RegistrationForm.test.tsx` (validation errors + focus, phone-format
  rejection, trimmed submission, server-error surfacing) and
  `Signup.test.tsx` (password mismatch, username format, duplicate-username
  server error, success path). Run with `npm test`; `npm run build` no
  longer type-checks test files (they're excluded from the strict app
  `tsconfig.json`, since Vitest transpiles them independently).
- **Shared `EVENTS` constant** (`src/constants.ts`) so the event list has a
  single source of truth instead of being duplicated in the registration
  form and (now) the admin edit form.

## CI

- Added `.github/workflows/ci.yml`: runs backend tests (`mvn test`, which
  needs Docker for Dev Services) and frontend tests + build (`npm test`,
  `npm run build`) on every push/PR to `main`.

## Still not done (flagged, not silently skipped)

- **No answer shuffling** — not applicable to this project (that was a
  Task 2 suggestion); nothing to do here.
- **JWT in localStorage** — unchanged from Round 1, same reasoning.
- **Rate limiter is per-instance, not distributed** — fine for a single
  Quarkus instance (which is how this is deployed), would need Redis or
  similar if ever scaled horizontally.
