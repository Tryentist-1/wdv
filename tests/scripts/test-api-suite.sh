#!/bin/bash
# Comprehensive API Test Runner
# Usage: ./test-api-suite.sh [test-type]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_header() {
    echo -e "\n${BLUE}=================================================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}=================================================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if server is running
check_server() {
    if curl -s http://localhost:8001/api/v1/health > /dev/null; then
        print_success "API server is running"
        return 0
    else
        print_error "API server not running. Please start with: npm run serve"
        return 1
    fi
}

# Run specific test suite
run_test_suite() {
    local test_type=$1
    
    case $test_type in
        "core")
            print_header "RUNNING CORE API TESTS"
            npm run test:api:core
            ;;
        "archers")
            print_header "RUNNING ARCHER API TESTS"
            npm run test:api:archers
            ;;
        "rounds")
            print_header "RUNNING ROUND API TESTS"
            npm run test:api:rounds
            ;;
        "events")
            print_header "RUNNING EVENT API TESTS"
            npm run test:api:events
            ;;
        "matches")
            print_header "RUNNING MATCH API TESTS"
            npm run test:api:matches
            ;;
        "integration")
            print_header "RUNNING INTEGRATION API TESTS"
            npm run test:api:integration
            ;;
        "all")
            print_header "RUNNING ALL API TESTS"
            npm run test:api:all
            ;;
        "coverage")
            print_header "RUNNING API TESTS WITH COVERAGE"
            npm run test:api:coverage
            ;;
        *)
            print_header "API TEST SUITE RUNNER"
            echo "Usage: ./test-api-suite.sh [test-type]"
            echo ""
            echo "Available test types:"
            echo "  core        - Core API functionality (health, auth)"
            echo "  archers     - Archer management APIs"
            echo "  rounds      - Round management APIs"
            echo "  events      - Event management APIs"
            echo "  matches     - Solo/Team match APIs"
            echo "  integration - Integration tests"
            echo "  all         - All API tests"
            echo "  coverage    - All tests with coverage report"
            echo ""
            echo "Examples:"
            echo "  ./test-api-suite.sh core"
            echo "  ./test-api-suite.sh all"
            echo "  ./test-api-suite.sh coverage"
            ;;
    esac
}

# Main execution
main() {
    # Check if server is running
    if ! check_server; then
        exit 1
    fi
    
    # Run requested test suite
    run_test_suite "${1:-help}"
}

main "$@"
