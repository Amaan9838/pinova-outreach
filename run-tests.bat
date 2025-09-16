@echo off
echo 🚀 Starting Pinova Outreach Campaign Tests
echo ===========================================

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed. Please install Node.js first.
    pause
    exit /b 1
)

REM Check if npm is installed
npm --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] npm is not installed. Please install npm first.
    pause
    exit /b 1
)

echo [INFO] Checking if Playwright is installed...

REM Check if Playwright is installed
npm list @playwright/test >nul 2>&1
if errorlevel 1 (
    echo [INFO] Installing Playwright...
    npm install -D @playwright/test
    
    echo [INFO] Installing Playwright browsers...
    npx playwright install
) else (
    echo [SUCCESS] Playwright is already installed
)

REM Check if dev server is running
echo [INFO] Checking if development server is running...
powershell -Command "(Invoke-WebRequest -Uri 'http://localhost:3000' -UseBasicParsing -TimeoutSec 2).StatusCode" >nul 2>&1
if errorlevel 1 (
    echo [WARNING] Development server is not running
    echo [INFO] Starting development server...
    start "" cmd /c "npm run dev"
    
    REM Wait for server to start
    echo Waiting for server to start...
    timeout /t 10 /nobreak >nul
    
    REM Check again
    powershell -Command "(Invoke-WebRequest -Uri 'http://localhost:3000' -UseBasicParsing -TimeoutSec 5).StatusCode" >nul 2>&1
    if errorlevel 1 (
        echo [ERROR] Failed to start development server
        pause
        exit /b 1
    )
    echo [SUCCESS] Development server started
) else (
    echo [SUCCESS] Development server is running
)

echo.
echo [INFO] Running Playwright tests...
echo ===========================================

REM Run tests based on arguments
if "%1"=="--headed" (
    echo [INFO] Running tests in headed mode (visible browser)...
    npx playwright test --headed --project=chromium
) else if "%1"=="--debug" (
    echo [INFO] Running tests in debug mode...
    npx playwright test --debug --project=chromium
) else if "%1"=="--ui" (
    echo [INFO] Opening Playwright UI mode...
    npx playwright test --ui
) else if "%1"=="--specific" (
    if not "%2"=="" (
        echo [INFO] Running specific test: %2
        npx playwright test --grep "%2"
    ) else (
        echo [ERROR] Please provide a test name after --specific
        goto end
    )
) else (
    echo [INFO] Running all tests in headless mode...
    npx playwright test
)

set TEST_EXIT_CODE=%errorlevel%

echo.
echo ===========================================

if %TEST_EXIT_CODE% == 0 (
    echo [SUCCESS] All tests passed! ✅
) else (
    echo [ERROR] Some tests failed! ❌
)

REM Check if report was generated
if exist "playwright-report\index.html" (
    echo [INFO] Test report generated at: playwright-report\index.html
    echo [INFO] To view the report, run: npx playwright show-report
)

:end
echo.
echo [INFO] Test run completed.
echo.
echo Available options:
echo   run-tests.bat                 - Run all tests (headless)
echo   run-tests.bat --headed        - Run tests with visible browser
echo   run-tests.bat --debug         - Run tests in debug mode
echo   run-tests.bat --ui             - Open Playwright UI mode
echo   run-tests.bat --specific "test name" - Run specific test

pause
exit /b %TEST_EXIT_CODE%
