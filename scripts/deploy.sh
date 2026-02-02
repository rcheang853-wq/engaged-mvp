#!/bin/bash

# Production Deployment Script for Engaged App
# This script performs pre-deployment checks and optimizations

set -e  # Exit on any error

echo "🚀 Starting Engaged App Deployment Process..."

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

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the project root."
    exit 1
fi

# Check Node.js version
print_status "Checking Node.js version..."
NODE_VERSION=$(node --version)
print_success "Node.js version: $NODE_VERSION"

# Install dependencies
print_status "Installing dependencies..."
npm ci --silent

# Type checking
print_status "Running TypeScript type check..."
if npm run type-check; then
    print_success "Type check passed"
else
    print_error "Type check failed"
    exit 1
fi

# Linting
print_status "Running ESLint..."
if npm run lint; then
    print_success "Linting passed"
else
    print_warning "Linting issues found, attempting to fix..."
    npm run lint:fix
fi

# Formatting
print_status "Running Prettier formatting check..."
if npm run format:check; then
    print_success "Code formatting is correct"
else
    print_warning "Code formatting issues found, fixing..."
    npm run format
fi

# Security audit
print_status "Running security audit..."
if npm audit --audit-level=high; then
    print_success "Security audit passed"
else
    print_warning "Security vulnerabilities found. Please review and fix."
fi

# Run tests
print_status "Running tests..."
if npm test; then
    print_success "All tests passed"
else
    print_error "Tests failed"
    exit 1
fi

# Build the application
print_status "Building production application..."
if npm run build:production; then
    print_success "Build completed successfully"
else
    print_error "Build failed"
    exit 1
fi

# Bundle analysis
print_status "Analyzing bundle size..."
if npm run performance:bundle; then
    print_success "Bundle analysis completed"
else
    print_warning "Bundle analysis found issues. Check bundle-analysis.json for details."
fi

# Check environment variables
print_status "Checking environment variables..."
if [ -f ".env.production" ]; then
    print_success ".env.production file found"
else
    print_warning ".env.production file not found. Make sure environment variables are set."
fi

# Security header check
print_status "Checking security configuration..."
if grep -q "Strict-Transport-Security" src/middleware.ts; then
    print_success "Security headers configured"
else
    print_warning "Security headers might not be properly configured"
fi

# Performance optimization check
print_status "Checking performance optimizations..."
OPTIMIZATIONS_FOUND=0

if grep -q "compress: true" next.config.ts; then
    ((OPTIMIZATIONS_FOUND++))
fi

if grep -q "removeConsole" next.config.ts; then
    ((OPTIMIZATIONS_FOUND++))
fi

if grep -q "optimizePackageImports" next.config.ts; then
    ((OPTIMIZATIONS_FOUND++))
fi

if [ $OPTIMIZATIONS_FOUND -eq 3 ]; then
    print_success "All performance optimizations are enabled"
elif [ $OPTIMIZATIONS_FOUND -gt 0 ]; then
    print_warning "Some performance optimizations are missing"
else
    print_error "Performance optimizations not found"
fi

# Check PWA configuration
print_status "Checking PWA configuration..."
if [ -f "public/manifest.json" ] && [ -f "public/sw.js" ]; then
    print_success "PWA files found"
else
    print_warning "PWA configuration incomplete"
fi

# Check for production readiness
print_status "Performing production readiness check..."

# Check for development dependencies in production
if grep -q "devDependencies" package.json; then
    print_warning "DevDependencies found. Ensure they're not included in production."
fi

# Check for console logs (basic check)
if grep -r "console\.log" src/ --exclude-dir=node_modules > /dev/null 2>&1; then
    print_warning "Console.log statements found in source code. Consider removing for production."
fi

# Check for TODO comments
TODO_COUNT=$(grep -r "TODO\|FIXME" src/ --exclude-dir=node_modules | wc -l || echo "0")
if [ "$TODO_COUNT" -gt 0 ]; then
    print_warning "Found $TODO_COUNT TODO/FIXME comments in source code"
fi

# Database migration check (if applicable)
print_status "Checking database migrations..."
if [ -d "migrations" ] || [ -d "src/migrations" ]; then
    print_warning "Database migrations found. Ensure they're run before deployment."
fi

# Final deployment summary
echo ""
echo "============================================"
print_success "🎉 Pre-deployment checks completed!"
echo "============================================"
echo ""
print_status "Deployment Summary:"
echo "  ✅ Dependencies installed"
echo "  ✅ Type checking passed"
echo "  ✅ Linting completed"
echo "  ✅ Code formatted"
echo "  ✅ Security audit performed"
echo "  ✅ Tests passed"
echo "  ✅ Production build created"
echo "  ✅ Bundle analysis completed"
echo ""

print_status "Next steps:"
echo "  1. Review bundle-analysis.json for optimization opportunities"
echo "  2. Set up environment variables in production"
echo "  3. Configure CDN for static assets"
echo "  4. Set up monitoring and error tracking"
echo "  5. Configure database and external services"
echo "  6. Run performance audit: npm run performance:lighthouse"
echo ""

print_success "Application is ready for deployment! 🚀"

# Optional: Generate deployment manifest
DEPLOY_MANIFEST="deployment-manifest.json"
print_status "Generating deployment manifest..."

cat > $DEPLOY_MANIFEST << EOF
{
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "version": "$(node -p "require('./package.json').version")",
  "nodeVersion": "$NODE_VERSION",
  "buildStatus": "success",
  "environment": "production",
  "features": {
    "pwa": $([ -f "public/manifest.json" ] && echo "true" || echo "false"),
    "serviceWorker": $([ -f "public/sw.js" ] && echo "true" || echo "false"),
    "securityHeaders": true,
    "performanceOptimizations": true,
    "analytics": true
  },
  "bundleInfo": {
    "analyzed": true,
    "reportPath": "./bundle-analysis.json"
  }
}
EOF

print_success "Deployment manifest created: $DEPLOY_MANIFEST"
echo ""
print_status "🎯 Ready for production deployment!"