# Agent instructions: Face Attendance System

## Goal
Build an independent, local-only computer vision interview demo: a consenting participant enrolls their face, selects their own profile, verifies it with their webcam, and records one attendance event per day. Do not use employer data, source code, screenshots, or credentials. Do not present the demo as production-ready or claim the models were trained by the author.

## Stack
- Python 3.10–3.12, FastAPI, Uvicorn, OpenCV (opencv-python-headless), NumPy, SQLite.
- Vanilla HTML/CSS/JavaScript; browser getUserMedia on localhost. No frontend build step, cloud, GPU, paid API or external runtime services.
- OpenCV Zoo YuNet face detector and SFace face embedding ONNX models. Download through an explicit setup script, validate files are not Git LFS pointers; do not commit model weights without verifying licenses.

## Scope and architecture
- Browser camera preview; capture a JPEG only when the user clicks. Send it to localhost API via multipart.
- Enrollment: explicit consent, chosen display name, exactly one face in the frame. Align with detected landmarks, extract and normalize an embedding. Store embedding locally, never the raw photograph.
- Verification: participant explicitly selects their enrolled profile. Compare only against that profile's embedding using cosine similarity, not against an entire gallery. Reject no-face, multiple-face, unknown profile or below-threshold results. Display similarity score (not probability). Require successful verification and deliberate attendance action; never record bystander faces.
- SQLite: profiles (id, unique name, embedding, created_at), attendance (id, profile_id, date, timestamp), unique(profile_id, date). Use parameterized SQL, foreign keys, atomic insertion, and local timezone documented in README.
- Provide dashboard of today's records, enrolled profiles, CSV export, and deletion/reset of locally enrolled data. No silent tracking, background recognition, remote exposure, or raw image persistence.
- Basic prototype lacks liveness detection, demographic performance validation, authentication, and encryption at rest. State these clearly in UI and README. Do not use for actual workplace decisions, access control, payroll or monitoring.

## Implementation
Suggested layout: app.py, face_engine.py, database.py, static/index.html, scripts/download_models.py, tests/, requirements.txt, README.md, .gitignore, AGENTS.md.
API: GET /api/health, GET /api/profiles, POST /api/enroll, POST /api/attendance, GET /api/attendance, GET /api/attendance.csv, DELETE /api/profiles/{id}.
Use cv2.FaceDetectorYN.create and setInputSize for each image, cv2.FaceRecognizerSF.create, alignCrop, feature. Guard shared model instances with a lock. Normalize vectors, compute dot product. OpenCV documents 0.363 as a benchmark starting threshold, not a universal security threshold; make it configurable and explain false accept/reject tradeoffs. Reject malformed or oversized input, validate names, handle missing models and camera denial cleanly. Bind 127.0.0.1 only. No permissive CORS, telemetry, remote uploads, or external JS/CDN.
UI: responsive clean dashboard with camera preview, consent checkbox, enrollment form, profile selection, verify-and-check-in button, result status, attendance table and CSV download. Clear camera after use. Escape user-generated content. Offer deletion and camera stop.
.gitignore must exclude data/, models/*.onnx, *.db, *.sqlite*, embeddings, images from enrollment, .env, .venv/, __pycache__, and test caches. Never commit real biometric data.

## Acceptance criteria
1. Fresh clone can install dependencies, download models and launch with documented commands.
2. User can enroll with consent; no-face/multi-face and invalid image are rejected.
3. User selects own profile, submits webcam snapshot; verification failure never creates attendance.
4. Duplicate check-in on same local date is idempotent; CSV exports correctly.
5. Deleting profile removes associated biometric and attendance data.
6. App can gracefully report unavailable models or camera permissions.
7. Tests cover normalized similarity, threshold, malformed input, duplicate attendance, deletion and CSV. Mock inference for automated tests; do not use real faces in CI.
8. Run python compileall and pytest; report exact outcomes, distinguish automated tests from manual camera checks.
9. README explains detection vs verification, landmark alignment, embeddings, cosine similarity, threshold calibration, false accepts/rejects, limitations, setup for Windows and Linux, and short demo script.
10. Keep scope small; finish working core features before optional enhancements.

## Reference
https://docs.opencv.org/4.x/d0/dd4/tutorial_dnn_face.html
https://github.com/opencv/opencv_zoo/tree/main/models/face_detection_yunet
https://github.com/opencv/opencv_zoo/tree/main/models/face_recognition_sface

## Agent workflow
Read this file, implement the smallest complete solution, run tests, fix issues, and summarize actual changes and remaining limitations. Do not only generate a plan. Ask before adding cloud services, external integrations, or production deployment.
