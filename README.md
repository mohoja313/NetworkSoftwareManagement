# Network Software Management (Network Software Hub)

A lightweight software sharing & management platform for a LAN (or the internet).
Any machine builds and runs **one single JAR**; everyone else on the network opens
`http://<SERVER-IP>:<PORT>`, browses and downloads freely. Uploading requires
sign-in with a **Gmail address** (6-digit email code).

- **Backend:** Java 21 + Spring Boot 3 (Web, Data JPA, Validation, Mail) + file-based H2 (no setup)
- **Frontend:** React + Vite + TypeScript + Tailwind + Framer Motion, bundled into the same JAR
- **License:** AGPL-3.0 (see [License](#license))
- Listens on `0.0.0.0` so the whole network can reach it

## Technology stack

**Backend — Java 21 + Spring Boot 3.2**
- `spring-boot-starter-web` — REST API + static hosting of the frontend (one JAR).
- `spring-boot-starter-data-jpa` (Hibernate) — persistence, cleanly layered
  `Controller → Service → Repository`, DTOs on the boundary (entities never leak).
- `spring-boot-starter-validation` — input validation with a uniform error envelope.
- `spring-boot-starter-mail` — Gmail OTP delivery; without SMTP config the code is
  logged (dev mode).
- Auth is a dependency-free HS256 JWT (`JwtService`) + `JwtAuthFilter`; OTP codes are
  stored only as SHA-256 hashes with expiry, attempt limits and rate limiting.

**Database — H2 (file-based, zero setup)**
- JDBC `jdbc:h2:file:${DATA_PATH}/nsm` — the DB lives next to the app in `./data`,
  no server to install; schema auto-managed by Hibernate (`ddl-auto: update`).
- Tables: `publishers` (id, email unique, displayName, createdAt),
  `software` (name, version, description, platform enum, original + UUID stored names,
  size, SHA-256, icon, download counter, publisher FK, uploader IP, publishedAt),
  `otp_codes` (email unique, code hash, expiry, attempts) — with indexes on platform,
  publisher, name, publish date and download count.
- Uploaded blobs are **not** in the DB: they stream to disk (`STORAGE_PATH`) under
  random UUID names while SHA-256 is computed on the fly (no full RAM load).

**Frontend — React 18 + Vite + TypeScript + Tailwind CSS 3 + Framer Motion + lucide-react**
- `frontend/src`: `pages/` (Home, Browse, Detail, Publishers, PublisherDetail, Upload),
  `components/` (Header, AuthModal, PlatformCards, SoftwareCard, Skeletons, States),
  plus `api.ts` (fetch + XHR upload with progress), `i18n` (fa/en, RTL/LTR),
  `theme` (dark/light), `toast`, `auth`.
- `npm run build` emits `frontend/dist`, which `build.*` copies into
  `src/main/resources/static` so Spring serves the SPA from the same JAR
  (deep links handled by `SpaController`).

**Build / run / deploy**
- `build.bat` / `build.sh`: `npm install + build` → copy `dist/` → `mvn package` → one JAR.
- `run.bat` / `run.sh`: `java -jar target/*.jar` (default port **8099**, overridable).
- `Dockerfile` (multi-stage: node build → maven package → JRE 21 runtime) and
  `docker-compose.yml` (persistent `/data` volume).

## Quick start

Prerequisites: **Java 21+** and **Maven 3.9+** (Node 20+ only needed once, to build the frontend).

```bash
# Windows
build.bat
run.bat

# Linux / macOS
./build.sh
./run.sh
```

Then open `http://localhost:8099`. From another machine on the same network:
`http://<SERVER-IP>:8099` (replace `<SERVER-IP>` with the server's LAN address,
e.g. `http://192.168.1.50:8099`).

> Windows: allow Java through the firewall when prompted (or open the port manually).
> Linux: `sudo ufw allow 8099/tcp` (adjust to your port).

## Configuration (env vars)

| Variable | Default | Description |
|---|---|---|
| `SERVER_PORT` | `8099` | HTTP port |
| `STORAGE_PATH` | `./data/storage` | Uploaded files & icons directory |
| `DATA_PATH` | `./data` | H2 database files directory |
| `APP_JWT_SECRET` | dev default | **Change in production!** JWT signing secret |
| `APP_ADMIN_USERNAME` | `Admin` | Manager login name (typed instead of an email) |
| `APP_ADMIN_PASSWORD` | `admin` | **Change in production!** Manager (`Admin`) password |
| `APP_ADMIN_EMAIL` | _(empty)_ | Manager Gmail (sender for user passwords/codes; also set after first Admin login) |
| `APP_MAX_FILE_SIZE` | `2GB` | Max upload size (Spring multipart) |
| `MAIL_HOST` | _(empty)_ | SMTP host. **Empty = dev mode:** the OTP code is printed to the console log instead of emailed |
| `MAIL_PORT` | `587` | SMTP port |
| `MAIL_USERNAME` / `MAIL_PASSWORD` | _(empty)_ | SMTP credentials |
| `MAIL_FROM` | `noreply@example.com` | Sender address |
| `MAIL_SMTP_AUTH` / `MAIL_SMTP_STARTTLS` | `false` | Set `true` for Gmail App-Password etc. |

Gmail SMTP example:

```bash
MAIL_HOST=smtp.gmail.com MAIL_PORT=587 MAIL_USERNAME=you@gmail.com \
MAIL_PASSWORD="your-app-password" MAIL_SMTP_AUTH=true MAIL_SMTP_STARTTLS=true \
SERVER_PORT=8099 ./run.sh
```

## How it works

- **Download** is public, with HTTP Range (resume) + streaming + per-file download counter.
- **Upload** needs Gmail login, two ways:
  - Code: `POST /api/auth/request-code` → 6-digit code (10 min, 5 attempts,
    rate-limited) → `POST /api/auth/verify-code` → JWT (`Authorization: Bearer`).
  - Password: the server manager sets a password for you → `POST /api/auth/password-login`
    `{email, password}` → JWT. No code needed.
- **Server manager (Admin) — one-time login:** in the login box type `Admin` instead of an email,
  then enter the initial password (default `admin` — change it in `application.yml`
  `app.admin.password` or via the `APP_ADMIN_PASSWORD` env var). **This works only once:**
  right there you register your own Gmail + password, and from that moment the `Admin`
  name is dead — every later manager login uses your own email + password
  (`POST /api/auth/password-login`, you get an admin token). Then, in the Admin panel,
  you enter each member's Gmail, define a password for them, and it is emailed to them
  **from your email** (needs SMTP config with your address) — or just tell them the
  password, both work. The manager can also publish and edit/delete any software,
  and change his own password later in the panel.
- Every upload records **publisher Gmail, uploader IP** (proxy-aware via `X-Forwarded-For`),
  timestamp, mandatory **platform label** (Android/Windows/Linux/macOS), extension check per
  platform, SHA-256 hash, optional icon. Owners can edit/delete their own software.
- Files are stored under random UUID names (no path traversal), always served as `attachment`.

## API

```
POST /api/auth/request-code        {email}            -> {message}
POST /api/auth/verify-code         {email, code}      -> {token, email, displayName, ...}
POST /api/auth/password-login      {email, password}  -> {token, email, displayName, ...}
POST /api/auth/admin-login         {username, password} -> {token, ...} (ONE-TIME only, then 410)
POST /api/auth/admin-setup         (admin) {email, password} -> {token, ...} (register manager's own credentials)
POST /api/auth/admin/email         (admin) {email}    -> {token, ...}  (change manager Gmail later)
POST /api/admin/password           (admin) {currentPassword, newPassword}
GET  /api/admin/info               (admin)            -> {username, email, emailSetup}
GET  /api/admin/users              (admin)            -> [{id, email, displayName, hasPassword}]
POST /api/admin/users              (admin) {email, password, displayName?, sendEmail?}
DELETE /api/admin/users/{id}/password (admin)        -> clears the user password
GET  /api/auth/me                  (auth)             -> {email, displayName}
GET  /api/software?platform=&publisherId=&q=&sort=newest|popular|size|oldest&page=&size=
GET  /api/software/{id}
POST /api/software                 (auth, multipart: file, icon?, name, version, description, platform)
PUT  /api/software/{id}            (auth, owner)      {name, version, description, platform?}
DELETE /api/software/{id}          (auth, owner)
GET  /api/software/{id}/download   (public, Range OK)
GET  /api/software/{id}/icon       (public)
GET  /api/publishers  |  GET /api/publishers/{id}  |  GET /api/stats
```

Errors share one envelope: `{"error":{"code","message"},"path","timestamp"}`.

## Docker

```bash
docker compose up --build -d
# open http://<SERVER-IP>:8099 ; data persists in the nsm-data volume
```

## Project layout

```
pom.xml  build.sh/bat  run.sh/bat  Dockerfile  docker-compose.yml
frontend/                       # React+Vite+TS client (dist/ is bundled into the JAR)
src/main/java/com/networksoftware/
  config/ (AppProperties, WebConfig)  controller/  entity/ (Publisher, Software, OtpCode, Platform)
  repository/  service/ (Otp, Jwt, Storage, Software, Publisher, Stats, RateLimit)
  security/ (JwtAuthFilter, AuthContext, ClientIpUtil, SecurityHeadersFilter)
  dto/
src/test/java/com/networksoftware/  # unit + integration tests
```

## Tests

```bash
mvn test
```

Covers OTP round-trip/attempts/expiry/cooldown, platform extension matrix,
and a full upload → search → download (incl. Range) → edit/delete + ownership flow.

## License

Distributed under the **GNU Affero General Public License v3.0 (AGPL-3.0)** —
see [`LICENSE`](LICENSE).

In short: you may use, modify and share this software, but any distributed or
network-hosted modified version must stay open under the same license with its
copyright/attribution notices intact — it cannot be taken proprietary or re-sold
as someone else's closed product. If you build on it, keep the original
attribution (developed by MohammadHosseinJafary) and state your changes.
