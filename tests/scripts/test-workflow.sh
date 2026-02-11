#!/bin/bash
# Comprehensive Testing Workflow Script
# Usage: ./test-workflow.sh [development|pre-deployment|post-deployment]

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
print_header() {
    echo -e "\n${BLUE}=================================================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}=================================================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if server is running
check_server() {
    if curl -s http://localhost:8001 > /dev/null; then
        print_success "Local server is running"
        return 0
    else
        print_warning "Local server not running. Starting server..."
        npm run serve &
        SERVER_PID=$!
        sleep 3
        if curl -s http://localhost:8001 > /dev/null; then
            print_success "Server started successfully"
            return 0
        else
            print_error "Failed to start server"
            return 1
        fi
    fi
}

# Development workflow
development_workflow() {
    print_header "DEVELOPMENT TESTING WORKFLOW"
    
    print_info "Starting development testing workflow..."
    
    # 1. Check local server
    print_info "Step 1: Checking local development server"
    if ! check_server; then
        print_error "Cannot proceed without local server"
        exit 1
    fi
    
    # 2. Component library verification
    print_info "Step 2: Component library verification"
    echo "Opening component library for visual verification..."
    echo "URL: http://localhost:8001/tests/components/style-guide.html"
    echo "Please verify:"
    echo "  - All components render correctly"
    echo "  - Dark/light mode toggle works"
    echo "  - Mobile responsiveness"
    echo "  - Touch targets (44px minimum)"
    read -p "Press Enter when component verification is complete..."
    print_success "Component library verified"
    
    # 3. Unit tests
    print_info "Step 3: Running unit tests"
    echo "Opening QUnit test runner..."
    echo "URL: http://localhost:8001/tests/index.html"
    echo "Please verify all unit tests pass"
    read -p "Press Enter when unit tests are verified..."
    print_success "Unit tests verified"
    
    # 4. Local E2E tests
    print_info "Step 4: Running local E2E tests"
    if npm run test:local; then
        print_success "Local E2E tests passed"
    else
        print_error "Local E2E tests failed"
        echo "Check test results and fix issues before continuing"
        exit 1
    fi
    
    # 5. API tests
    print_info "Step 5: Running local API tests"
    if ./tests/scripts/test_phase1_local.sh; then
        print_success "Local API tests passed"
    else
        print_error "Local API tests failed"
        echo "Check API configuration and database connection"
        exit 1
    fi
    
    print_success "Development testing workflow completed successfully!"
    echo ""
    echo "Next steps:"
    echo "  - Continue development"
    echo "  - Run pre-deployment tests before deploying"
    echo "  - Use 'npm run test:workflow:pre' or './tests/scripts/test-workflow.sh pre-deployment' when ready"
}

# Pre-deployment workflow
pre_deployment_workflow() {
    print_header "PRE-DEPLOYMENT TESTING WORKFLOW"
    
    print_info "Starting pre-deployment testing workflow..."
    
    # 1. Build CSS
    print_info "Step 1: Building production CSS"
    if npm run build:css:prod; then
        print_success "Production CSS built successfully"
    else
        print_error "Failed to build production CSS"
        exit 1
    fi
    
    # 2. Full E2E test suite
    print_info "Step 2: Running full E2E test suite"
    if npm test; then
        print_success "All E2E tests passed (42/42)"
    else
        print_error "E2E tests failed"
        echo "View detailed report: npx playwright show-report"
        exit 1
    fi
    
    # 3. API health check
    print_info "Step 3: Running API health check"
    if ./tests/scripts/test_api.sh; then
        print_success "API health check passed"
    else
        print_error "API health check failed"
        echo "Check production API endpoints"
        exit 1
    fi
    
    # 4. Manual sanity check
    print_info "Step 4: Manual sanity check"
    echo "Please review the manual testing checklist:"
    cat tests/manual_sanity_check.md
    read -p "Have you completed the manual sanity check? (y/n): " manual_check
    if [[ $manual_check == "y" || $manual_check == "Y" ]]; then
        print_success "Manual sanity check completed"
    else
        print_error "Manual sanity check not completed"
        echo "Please complete manual testing before deployment"
        exit 1
    fi
    
    # 5. Component library production check
    print_info "Step 5: Component library production verification"
    echo "Please verify component library on production:"
    echo "URL: https://archery.tryentist.com/tests/components/style-guide.html (local: http://localhost:8001/tests/components/style-guide.html)"
    read -p "Press Enter when production component library is verified..."
    print_success "Production component library verified"
    
    print_success "Pre-deployment testing completed successfully!"
    echo ""
    echo "✅ Ready for deployment!"
    echo "Next steps:"
    echo "  - Deploy: ./DeployFTP.sh"
    echo "  - Run post-deployment tests: npm run test:workflow:post"
}

# Post-deployment workflow
post_deployment_workflow() {
    print_header "POST-DEPLOYMENT TESTING WORKFLOW"
    
    print_info "Starting post-deployment testing workflow..."
    
    # 1. Production E2E tests
    print_info "Step 1: Running production E2E tests"
    if npm run test:remote; then
        print_success "Production E2E tests passed"
    else
        print_error "Production E2E tests failed"
        echo "View detailed report: npx playwright show-report"
        echo "Consider rollback if critical functionality is broken"
        exit 1
    fi
    
    # 2. Production API health check
    print_info "Step 2: Running production API health check"
    if ./tests/scripts/test_api.sh; then
        print_success "Production API health check passed"
    else
        print_error "Production API health check failed"
        echo "Check production server status and API endpoints"
        exit 1
    fi
    
    # 3. Production component library
    print_info "Step 3: Production component library verification"
    echo "Verifying production component library..."
    echo "URL: https://archery.tryentist.com/tests/components/style-guide.html"
    echo "Please verify:"
    echo "  - All components load correctly"
    echo "  - Styling is consistent"
    echo "  - Mobile responsiveness works"
    echo "  - Dark mode functions properly"
    read -p "Press Enter when production component library is verified..."
    print_success "Production component library verified"
    
    # 4. Cache purge (if available)
    print_info "Step 4: Cache purge"
    if [ -f "./tests/scripts/test_cloudflare.sh" ]; then
        if ./tests/scripts/test_cloudflare.sh; then
            print_success "Cloudflare cache purged successfully"
        else
            print_warning "Cache purge failed - may need manual intervention"
        fi
    else
        print_warning "Cache purge script not found - manual cache purge may be needed"
    fi
    
    # 5. Generate test summary
    print_info "Step 5: Generating test summary"
    SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
    if "$SCRIPT_DIR/test-summary.sh"; then
        print_success "Test summary generated"
    else
        print_warning "Test summary generation failed"
    fi
    
    print_success "Post-deployment testing completed successfully!"
    echo ""
    echo "🎉 Deployment verified and ready for use!"
    echo ""
    echo "Production URLs:"
    echo "  - Main app: https://archery.tryentist.com/"
    echo "  - Coach console: https://archery.tryentist.com/coach.html"
    echo "  - Component library: https://archery.tryentist.com/tests/components/style-guide.html"
    echo "  - Live results: https://archery.tryentist.com/results.html"
}

# Main script logic
main() {
    case "${1:-}" in
        "development")
            development_workflow
            ;;
        "pre-deployment")
            pre_deployment_workflow
            ;;
        "post-deployment")
            post_deployment_workflow
            ;;
        *)
            print_header "WDV TESTING WORKFLOW"
            echo "Usage: ./test-workflow.sh [workflow-type]"
            echo ""
            echo "Available workflows:"
            echo "  development      - Development testing workflow"
            echo "  pre-deployment   - Pre-deployment testing workflow"
            echo "  post-deployment  - Post-deployment testing workflow"
            echo ""
            echo "Examples:"
            echo "  ./test-workflow.sh development"
            echo "  ./test-workflow.sh pre-deployment"
            echo "  ./test-workflow.sh post-deployment"
            echo ""
            echo "For more information, see:"
            echo "  - docs/testing/TESTING_GUIDE.md"
            echo "  - tests/TEST_ORGANIZATION.md"
            ;;
    esac
}

# Cleanup function
cleanup() {
    if [ ! -z "${SERVER_PID:-}" ]; then
        print_info "Cleaning up server process..."
        kill $SERVER_PID 2>/dev/null || true
    fi
}

# Set up cleanup trap
trap cleanup EXIT

# Run main function
main "$@"
