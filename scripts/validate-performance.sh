#!/bin/bash

# Performance Validation Script for Engaged App
# This script validates the performance optimizations implemented

set -e

echo "🚀 Performance Validation Script"
echo "================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if required tools are installed
echo -e "${BLUE}Checking prerequisites...${NC}"

# Check for Node.js and npm
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Node.js and npm are available${NC}"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing dependencies...${NC}"
    npm ci
fi

# 1. Build the application
echo -e "${BLUE}Building application for production...${NC}"
if npm run build; then
    echo -e "${GREEN}✅ Build successful${NC}"
else
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi

# 2. Run bundle analysis
echo -e "${BLUE}Analyzing bundle size...${NC}"
if ANALYZE=true npm run build; then
    echo -e "${GREEN}✅ Bundle analysis completed${NC}"
    echo -e "${YELLOW}📊 Check .next/analyze/ for detailed reports${NC}"
else
    echo -e "${YELLOW}⚠️  Bundle analysis failed, continuing...${NC}"
fi

# 3. Start production server in background
echo -e "${BLUE}Starting production server...${NC}"
npm start &
SERVER_PID=$!
sleep 10

# Function to cleanup server
cleanup() {
    echo -e "${YELLOW}Stopping server...${NC}"
    kill $SERVER_PID 2>/dev/null || true
}
trap cleanup EXIT

# 4. Check if server is running
if curl -f http://localhost:3000/ > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Production server is running${NC}"
else
    echo -e "${RED}❌ Production server failed to start${NC}"
    exit 1
fi

# 5. Run performance audit
echo -e "${BLUE}Running performance audit...${NC}"
if node claudedocs/performance-audit-playwright.js; then
    echo -e "${GREEN}✅ Performance audit completed${NC}"
else
    echo -e "${YELLOW}⚠️  Performance audit had issues, check logs${NC}"
fi

# 6. Check bundle sizes
echo -e "${BLUE}Checking bundle sizes...${NC}"

if [ -d ".next/static/chunks" ]; then
    # Calculate total bundle size
    TOTAL_SIZE=$(find .next/static/chunks -name "*.js" -exec ls -la {} \; | awk '{total += $5} END {print total/1024/1024}')
    echo -e "${BLUE}Total JavaScript bundle size: ${TOTAL_SIZE} MB${NC}"

    if (( $(echo "$TOTAL_SIZE < 1.0" | bc -l) )); then
        echo -e "${GREEN}✅ Bundle size is under 1MB target${NC}"
    else
        echo -e "${YELLOW}⚠️  Bundle size exceeds 1MB, consider further optimization${NC}"
    fi

    # List largest chunks
    echo -e "${BLUE}Largest chunks:${NC}"
    find .next/static/chunks -name "*.js" -exec ls -lah {} \; | sort -k5 -hr | head -5
else
    echo -e "${YELLOW}⚠️  Build chunks not found${NC}"
fi

# 7. Check optimization implementations
echo -e "${BLUE}Validating optimizations...${NC}"

# Check React Query optimization
if grep -q "process.env.NODE_ENV === 'development'" src/lib/react-query.tsx; then
    echo -e "${GREEN}✅ React Query devtools conditional loading implemented${NC}"
else
    echo -e "${RED}❌ React Query devtools optimization missing${NC}"
fi

# Check font optimization
if grep -q "display: 'swap'" src/app/layout.tsx; then
    echo -e "${GREEN}✅ Font display optimization implemented${NC}"
else
    echo -e "${RED}❌ Font display optimization missing${NC}"
fi

# Check metadata
if [ -f "src/app/discover/page.tsx" ] && grep -q "description:" src/app/discover/page.tsx; then
    echo -e "${GREEN}✅ SEO metadata implemented${NC}"
else
    echo -e "${RED}❌ SEO metadata missing${NC}"
fi

# Check Next.js config optimizations
if grep -q "optimizePackageImports" next.config.ts; then
    echo -e "${GREEN}✅ Package import optimization configured${NC}"
else
    echo -e "${RED}❌ Package import optimization missing${NC}"
fi

# 8. Performance summary
echo -e "\n${BLUE}Performance Validation Summary${NC}"
echo "=============================="

if [ -f "claudedocs/performance-results/audit-*.json" ]; then
    # Parse latest audit results
    LATEST_AUDIT=$(ls -t claudedocs/performance-results/audit-*.json | head -1)
    if [ -f "$LATEST_AUDIT" ]; then
        echo -e "${GREEN}📊 Latest performance audit results:${NC}"
        # You could add JSON parsing here to extract specific metrics
        echo -e "${YELLOW}💡 Check $LATEST_AUDIT for detailed metrics${NC}"
    fi
fi

echo -e "\n${GREEN}🎉 Performance validation completed!${NC}"
echo -e "${BLUE}Next steps:${NC}"
echo "1. Review bundle analysis reports in .next/analyze/"
echo "2. Check performance audit results in claudedocs/performance-results/"
echo "3. Monitor Core Web Vitals in production"
echo "4. Set up Lighthouse CI for continuous monitoring"

echo -e "\n${BLUE}📚 Additional Resources:${NC}"
echo "- Performance optimization plan: claudedocs/performance-optimization-plan.md"
echo "- Audit summary: claudedocs/performance-audit-summary.md"
echo "- Bundle analyzer: Open .next/analyze/client.html in browser"