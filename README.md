# AI Predictive Maintenance

## Configuration

Set `DATABASE_URL` for the PostgreSQL database. Set `FRONTEND_ORIGINS` to a comma-separated list of deployed frontend origins; local Vite origins are used by default. Production frontend builds require `VITE_API_BASE_URL` to be set to the backend base URL. The `http://127.0.0.1:8000` fallback is development-only.

Keep environment files out of source control. The root `.gitignore` excludes `.env` files, Python environments, and generated frontend artifacts.

## Run the backend

From the project root, install backend dependencies and start the API:

```powershell
python -m pip install -r backend/requirements.txt
python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000
```

Start the frontend from `frontend` with `npm run dev`. For deployment, set `VITE_API_BASE_URL` before building with `npm run build`.
