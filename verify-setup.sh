#!/bin/bash

# BVB Portfolio Tracker - Setup Verification Script
# Run this to verify your project structure is complete

echo "🔍 BVB Portfolio Tracker - Project Verification"
echo "================================================"
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counter
PASSED=0
FAILED=0

# Function to check if file exists
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $1"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} $1 (MISSING)"
        ((FAILED++))
    fi
}

# Function to check if directory exists
check_dir() {
    if [ -d "$1" ]; then
        echo -e "${GREEN}✓${NC} $1/"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} $1/ (MISSING)"
        ((FAILED++))
    fi
}

echo "Checking Core Application Files:"
echo "--------------------------------"
check_file "app/_layout.tsx"
check_file "app/index.tsx"
check_file "app/stock/[symbol].tsx"

echo ""
echo "Checking Source Files:"
echo "---------------------"
check_dir "src"
check_file "src/types/Stock.ts"
check_file "src/services/bvbApi.ts"
check_file "src/context/PortfolioContext.tsx"
check_file "src/hooks/usePortfolio.ts"

echo ""
echo "Checking i18n Files:"
echo "-------------------"
check_dir "src/i18n"
check_file "src/i18n/index.ts"
check_file "src/i18n/ro.json"
check_file "src/i18n/en.json"

echo ""
echo "Checking Asset Files:"
echo "--------------------"
check_file "assets/portfolio.json"

echo ""
echo "Checking Configuration Files:"
echo "----------------------------"
check_file "tsconfig.json"
check_file "app.json"
check_file "package.json"

echo ""
echo "Checking Documentation:"
echo "---------------------"
check_file "ARCHITECTURE.md"
check_file "DEVELOPMENT.md"

echo ""
echo "================================================"
echo -e "${GREEN}Passed: $PASSED${NC} | ${RED}Failed: $FAILED${NC}"

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All files present! Ready to run.${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. npm install"
    echo "  2. npx expo start"
    echo "  3. Press 'i' for iOS Simulator"
    exit 0
else
    echo -e "${RED}✗ Some files are missing. Check above.${NC}"
    exit 1
fi
