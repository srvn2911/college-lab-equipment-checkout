# College Lab Equipment Checkout

A full-stack equipment checkout and inventory application built with **React + Django REST Framework + Supabase PostgreSQL**.

## Features
- Dashboard with equipment, active checkout, overdue and fine summaries
- Equipment and category management
- Student profiles
- Barcode-based equipment lookup
- Checkout and return workflow
- Return inspections
- Automatic overdue fine calculation
- Transaction-safe checkout to prevent double booking

## Architecture
- `frontend/`: React + Vite
- `backend/`: Django + Django REST Framework
- Supabase: hosted PostgreSQL database (Django connects using `DATABASE_URL`)

> Supabase is used as the PostgreSQL database. The application does not require a Supabase service-role key in the browser. Keep database credentials on the backend only.

## 1. Requirements
- Python 3.10+
- Node.js 18+
- A Supabase project

## 2. Configure Supabase
1. Create a Supabase project.
2. Open **Project Settings → Database → Connection string**.
3. Copy the connection string (prefer the session pooler if your network requires it).
4. In `backend/`, copy `.env.example` to `.env`.
5. Set `DATABASE_URL` to the Supabase PostgreSQL connection string. URL-encode special characters in the password.

Example:
```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT.supabase.co:5432/postgres
DJANGO_SECRET_KEY=replace-with-a-long-random-secret
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:5173
FINE_PER_DAY=10
```

For Supabase pooler connections, use the host, port, username and password shown in the Supabase dashboard. If using a pooler, follow Supabase's SSL and connection-pooling guidance.

## 3. Run the Django backend
```bash
cd backend
python -m venv .venv
# Windows PowerShell:
.venv\Scripts\Activate.ps1
# macOS/Linux:
# source .venv/bin/activate

pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```
Backend: `http://127.0.0.1:8000/api/`  
Django admin: `http://127.0.0.1:8000/admin/`

## 4. Run the React frontend
Open a second terminal:
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```
On Windows, create `.env` by copying `.env.example` manually if `cp` is unavailable.

Frontend: `http://localhost:5173`

## 5. First-use workflow
1. Sign in to Django admin and create categories, students and equipment.
2. Open the React dashboard.
3. Use **Check out** to issue an available equipment item.
4. Use **Returns** to record the return condition and inspection.
5. Overdue fines are calculated by the backend using the configured `FINE_PER_DAY`.

## API endpoints
| Method | Endpoint | Purpose |
|---|---|---|
| GET/POST | `/api/categories/` | List/create categories |
| GET/POST | `/api/equipment/` | List/create equipment |
| GET/PUT/PATCH/DELETE | `/api/equipment/{id}/` | Manage equipment |
| GET/POST | `/api/students/` | List/create student profiles |
| GET | `/api/checkouts/` | List checkout records |
| POST | `/api/checkouts/` | Check out an item |
| POST | `/api/checkouts/{id}/return_item/` | Return and inspect item |
| GET | `/api/fines/` | List overdue fines |
| GET | `/api/dashboard/` | Dashboard summary |

## Concurrency protection
Checkout creation runs inside `transaction.atomic()` and locks the selected equipment row using `select_for_update()`. The availability check and checkout creation therefore happen as one database transaction. Keep this logic on the server; never implement checkout as a frontend-only availability check.

## Notes before production
- This starter uses an open development API for quick local evaluation. Add authentication and role-based permissions before deploying or exposing it publicly.
- Configure Supabase network access, SSL and database connection limits for your deployment.
- Set `DEBUG=False`, a strong secret key, secure hosts and HTTPS in production.
- The barcode field stores/scans barcode values; connect a USB barcode scanner (usually behaves like keyboard input) or a camera scanning library if camera scanning is required.
- Fine amount defaults to ₹10 per overdue day and can be changed with `FINE_PER_DAY`.
- Use real student consent and your institution's retention rules when storing student information.

## GitHub
From the project root:
```bash
git init
git add .
git commit -m "Initial college lab equipment checkout project"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/college-lab-equipment-checkout.git
git push -u origin main
```
Create an empty GitHub repository first. Never commit `.env`, passwords, service keys or other secrets.
