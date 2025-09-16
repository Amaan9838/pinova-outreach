#!/bin/bash

echo "🚀 Starting Pinova Outreach Campaign Tests"
echo "==========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install npm first."
    exit 1
fi

print_status "Checking if Playwright is installed..."

# Install Playwright if not present
if ! npm list @playwright/test &> /dev/null; then
    print_status "Installing Playwright..."
    npm install -D @playwright/test
    
    print_status "Installing Playwright browsers..."
    npx playwright install
else
    print_success "Playwright is already installed"
fi

# Check if dev server is running
print_status "Checking if development server is running..."

if curl -s http://localhost:3000 > /dev/null; then
    print_success "Development server is running"
    DEV_SERVER_RUNNING=true
else
    print_warning "Development server is not running"
    print_status "Starting development server..."
    npm run dev &
    DEV_SERVER_PID=$!
    DEV_SERVER_RUNNING=false
    
    # Wait for server to start
    echo "Waiting for server to start..."
    for i in {1..30}; do
        if curl -s http://localhost:3000 > /dev/null; then
            print_success "Development server started"
            break
        fi
        sleep 2
        echo -n "."
    done
    
    if ! curl -s http://localhost:3000 > /dev/null; then
        print_error "Failed to start development server"
        exit 1
    fi
fi

echo ""
print_status "Running Playwright tests..."
echo "==========================================="

# Run tests with different modes based on arguments
if [ "$1" = "--headed" ]; then
    print_status "Running tests in headed mode (visible browser)..."
    npx playwright test --headed --project=chromium
elif [ "$1" = "--debug" ]; then
    print_status "Running tests in debug mode..."
    npx playwright test --debug --project=chromium
elif [ "$1" = "--ui" ]; then
    print_status "Opening Playwright UI mode..."
    npx playwright test --ui
elif [ "$1" = "--specific" ] && [ -n "$2" ]; then
    print_status "Running specific test: $2"
    npx playwright test --grep "$2"
else
    print_status "Running all tests in headless mode..."
    npx playwright test
fi

# Capture exit code
TEST_EXIT_CODE=$?

echo ""
echo "==========================================="

if [ $TEST_EXIT_CODE -eq 0 ]; then
    print_success "All tests passed! ✅"
else
    print_error "Some tests failed! ❌"
fi

# Generate and show report
if [ -f "playwright-report/index.html" ]; then
    print_status "Test report generated at: playwright-report/index.html"
    print_status "To view the report, run: npx playwright show-report"
fi

# Stop dev server if we started it
if [ "$DEV_SERVER_RUNNING" = false ] && [ -n "$DEV_SERVER_PID" ]; then
    print_status "Stopping development server..."
    kill $DEV_SERVER_PID
fi

echo ""
print_status "Test run completed."

# Exit with the test result code
exit $TEST_EXIT_CODE
