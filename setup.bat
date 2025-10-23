@echo off
echo Setting up Student and Teacher Performance Tracker...
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed. Please install Node.js first.
    echo Visit: https://nodejs.org/
    pause
    exit /b 1
)

REM Check if npm is installed
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: npm is not installed. Please install npm first.
    pause
    exit /b 1
)

echo SUCCESS: Node.js and npm are installed
echo.

REM Install dependencies
echo Installing dependencies...
npm install

if %errorlevel% neq 0 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)

echo SUCCESS: Dependencies installed successfully
echo.

REM Create .env file if it doesn't exist
if not exist .env (
    echo PORT=3000 > .env
    echo MONGODB_URI=mongodb://localhost:27017/marks_tracking_system >> .env
    echo JWT_SECRET=your_jwt_secret_key_here_change_in_production >> .env
    echo NODE_ENV=development >> .env
    echo SUCCESS: Created .env file
) else (
    echo WARNING: .env file already exists, skipping creation
)

echo.
echo Setup complete!
echo.
echo Next steps:
echo    1. Make sure MongoDB is running on your system
echo    2. Run 'npm run dev' to start the development server
echo    3. Open http://localhost:3000 in your browser
echo.
echo For detailed instructions, see README.md
pause
