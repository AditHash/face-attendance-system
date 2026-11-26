# VisionAttend: agent guide

VisionAttend is a local face-recognition attendance system and portfolio demo. It runs on CPU and binds only to 127.0.0.1. Persistence is real (SQLite) and inference is live. It is not ready for production use at a workplace. The user-facing docs are in README.md. This file describes how the code works and the rules for changing it.

## Current behavior (keep docs in sync with this)

- **Enrollment** (`/register`): name, email (unique, case-insensitive), and explicit biometric consent.
  - Collect exactly 5 samples. Each sample must have:
    - exactly one face, at least 72 px
    - a Laplacian variance of at least 45
    - a gap of at least 0.45 s from the previous sample, and different frame bytes
    - cosine similarity of at least 0.363 to the first sample
  - Store the normalized mean of the normalized SFace embeddings as one template.
  - Samples live only in memory: 300 s TTL, at most 32 sessions.
  - The user and template are created atomically. The public ID (`VA-000001`, ...) is generated server-side.
  - Re-enrolling replaces the template and its revision.
- **Attendance** (`/attendance`) uses automatic 1:N identification. There is no claimed ID and no token.
  - Each frame can contain up to 8 faces. Each face is matched against all templates for the current `MODEL_VERSION`.
  - A face matches only when all of these hold:
    - best cosine is at or above the threshold (default 0.363, configurable)
    - best minus second-best is at least `MATCH_GAP` (0.05)
    - no other face in the same frame matched the same profile
  - After `stable_frames` consecutive matching frames (default 3, range 2–8), `Store.mark` inserts one row per profile per local date. Inserts are idempotent through `UNIQUE (user_uuid, attendance_date)` and the template `revision` check.
  - The timestamp comes from the server's UTC clock. The date comes from `VISIONATTEND_TIMEZONE` (default `Asia/Kolkata`).
  - Streaks reset in these cases:
    - the policy changes
    - more than 2 s pass between frames
    - a frame has no faces
    - the source disconnects
- **Camera sources:**
  - Browser webcam.
  - IP camera: RTSP over TCP, or HTTP(S) MJPEG, through `/ws/ip-camera` and an isolated `ip_camera_worker.py` subprocess. The URL is passed on stdin. Only private IPv4 addresses are allowed, redirects are refused, at most 4 cameras run at once, and HTTPS certificates are verified, so self-signed certificates fail.
  - Phone browser paired by QR code through the separate HTTPS listener in `vision_phone.py`. The pairing link is single-use with a 120 s TTL.
- **Other pages:**
  - `/` is the dashboard (real counts and a 7-day chart).
  - `/users` lists profiles (search, pagination, re-enroll, delete with cascade).
  - `/records` shows records (filters, pagination, CSV export with formula escaping).
  - `/settings` holds model health, the default camera, the threshold, and stable frames.
  - `/docs` is the API reference, using Swagger assets bundled locally.
- **Terminal UI:**
  - Face boxes and cards are color-coded by state: ok, pending, or bad. Each card shows a `MatchStrength` meter (bands relative to the threshold).
  - The panel flashes on each new check-in.
  - Kiosk mode hides the sidebar, requests fullscreen, and shows a 3 s banner on each check-in: a time-of-day greeting with "Welcome" or "Welcome back", plus a WebAudio chime for new check-ins.
  - The IP URL is kept only in component state.
- **Theming:** `ui.tsx` (`ThemeToggle`, `applyTheme`) sets `data-theme` on `<html>` to system, light, or dark, and saves the choice in localStorage. All colors are CSS custom properties in `style.css`, including the chart's. Add new colors as tokens in both the light and dark blocks.
- **Dashboard** includes `absent`: up to 50 profiles with no row for today.

## Layout

```
app.py                 FastAPI app factory create_app(): REST, WebSockets, host/origin boundary, SPA routes
run_visionattend.py    Launcher: loopback app, plus the optional phone HTTPS listener (--phone-ip --cert --key)
vision_models.py       FaceEngine (YuNet + SFace, one lock), JPEG validation, quality gating
vision_attendance.py   LiveAttendance: per-socket matching, streaks, check-in
vision_sessions.py     Enrollments: transient sample sessions
vision_db.py           Store: SQLite schema and all queries (WAL, foreign keys, parameterized SQL)
vision_ip_camera.py    IPCameras WebSocket relay and worker lifecycle
ip_camera_worker.py    RTSP/MJPEG reader subprocess (frames sent as length-prefixed JPEGs on stdout)
vision_phone.py        PhoneRelay pairing and the camera-only phone app
download_models.py     Downloads YuNet/SFace from the OpenCV Zoo and checks pinned SHA-256 hashes
frontend/src/          React + TS + Vite: main.tsx (routes), camera.tsx (useCamera, CameraPanel),
                       terminal.tsx (useLiveAttendance, kiosk), register.tsx, pages.tsx, phone.tsx, api.ts
tests/                 pytest with a temporary DB, FakeEngine, and simulated cameras
.github/workflows/ci.yml  Backend and frontend tests and build on push and PR
```

Tables: `users`, `face_templates` (one template per user, with `model_version` and `revision`), `attendance`, `settings` (a single row: threshold, stable_frames, last_public_id).

## Rules

- **Local only.** Bind to 127.0.0.1. Keep the host/origin checks in `desktop_boundary` and `valid_socket`. Don't add permissive CORS, public binding, cloud services, telemetry, or external APIs.
- **No biometric data in git or logs.** Never persist raw frames. Never return embeddings from the API. Never log camera URLs, because they can contain credentials. Keep `data/`, `models/*.onnx`, `*.db`, `*.pem`, `*.key`, `.env`, `node_modules/`, and `frontend/dist/` ignored.
- **Honest metrics.** Cosine similarity is a raw score from −1 to 1. Detector confidence is a separate score from 0 to 1. Never present either one as a probability or as accuracy. FPS and latency must be measured, not estimated.
- **Don't block the event loop.** Run CV and SQLite work through `run_in_threadpool`. Drop stale frames instead of queuing them. Allow at most one frame in flight per socket.
- **Validate at trust boundaries.** Check frame size (≤ 512 KiB, ≤ 640 px edge), JPEG format, WebSocket message size and sequence, URL scheme and private IP, and Pydantic models on every input.
- **Keep the scope disclosed.** There is no authentication, liveness detection, encryption at rest, or validation for real deployments, and a photo can fool it. Keep this stated in the UI and README. Use it only with consenting adults.
- Keep code small and explainable. Extend the module that owns a behavior instead of adding layers.

## Checks (run before finishing)

```sh
uv run pytest                      # on Windows, if temp is blocked: --basetemp data/pytest-local
uv run python -m compileall -q app.py vision_*.py ip_camera_worker.py run_visionattend.py download_models.py
cd frontend && npm test && npm run build   # the build runs tsc --noEmit first
```

Tests use fake vectors and simulated cameras, and real faces never go into CI. If you couldn't check the live camera or browser behavior, say so explicitly.

## Git

- Commit messages are plain. Do **not** add `Co-Authored-By` trailers for Claude, Codex, or any other AI, and don't add "Generated with" lines.
- Commit with the GitHub noreply email, not a personal address.
- Never force-push or rewrite published history unless explicitly asked.

## Known gaps / next steps

- Recognition needs the browser tab open, because the browser forwards IP-camera frames. A server-side worker per camera would remove that dependency.
- Frames are downscaled to 640 px, faces must be at least 72 px, and a frame is rejected entirely if it has more than 8 faces. This limits distant or crowded scenes.
- There is no per-face tracker (streaks are tracked per identity), no best-crop evidence for check-ins, and no check-out.
- `FaceEngine` uses one lock, so inference for all cameras runs one frame at a time.
- Planned: passive liveness with MiniFAS ONNX from facenox/face-antispoof-onnx (128×128 RGB, 1.5× square crop, Real/Spoof). Run it through `cv2.dnn` on the non-quantized model, gate streak frames on "real", add a `spoof_suspected` state, and expose a toggle and threshold in Settings. Pin a SHA-256 in `download_models.py` and verify the preprocessing against the reference code first. Self-reported accuracy is 98.2% on CelebA-Spoof. It does not stop 3D masks.
- Planned: mood-aware greeting text from a facial-expression estimate. Only the greeting may change. Never store or log the estimate or act on it, and mention the legal limits (the EU AI Act bans emotion recognition at work and in schools).

## References

- https://docs.opencv.org/4.x/d0/dd4/tutorial_dnn_face.html
- https://github.com/opencv/opencv_zoo/tree/main/models/face_detection_yunet
- https://github.com/opencv/opencv_zoo/tree/main/models/face_recognition_sface
