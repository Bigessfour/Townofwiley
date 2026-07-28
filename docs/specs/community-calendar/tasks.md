# Community Calendar — Tasks

1. Spec docs under `docs/specs/community-calendar/` (unified UI + admin CRUD).
2. Backend: public GET/POST + email approve/reject + Cognito staff admin routes; Python tests.
3. Angular: merge community into `/meetings` (filters, FullCalendar styling, list, submit form).
4. Redirect `/community-calendar` → `/meetings#community`; update nav / Quick Tasks.
5. `/admin` clerk task “Manage community calendar” (HttpClient + StaffAuthService bearer).
6. Runtime-config, CSP, AWS manifest + deploy script (Cognito env + CORS for PUT/DELETE).
7. Playwright smoke: redirect + meetings community section; keep Python tests green.
