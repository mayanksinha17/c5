@echo off
echo Starting Personal Task Automator...

echo.
echo Setting up backend...
cd Backend
if not exist node_modules (
    echo Installing backend dependencies...
    npm install
)

echo.
echo Starting backend server on port 3001...
start cmd /k "npm start"

echo.
echo Setting up frontend...
cd ..
echo Starting frontend server on port 8000...
start cmd /k "python -m http.server 8000"

echo.
echo Servers starting up...
timeout /t 3 /nobreak > nul

echo.
echo ============================================
echo Personal Task Automator is now running!
echo ============================================
echo.
echo Frontend: http://localhost:8000/np.html
echo Backend API: http://localhost:3001/api/tasks
echo Statistics: http://localhost:8000/tasks.html
echo.
echo Press any key to close this window...
pause > nul