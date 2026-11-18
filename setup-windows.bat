@echo off
echo Creating Python virtual environment...
cd backend
py -m venv .venv
call .venv\Scripts\activate
pip install -r requirements.txt
if not exist .env copy .env.example .env
echo Backend setup complete. Edit backend\.env before running migrations.
pause
