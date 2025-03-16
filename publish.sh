#!/bin/bash
set -e

echo "Building state-reactor for npm..."
npm install
npm run build

# Check if build was successful
if [ ! -d "dist" ]; then
  echo "Error: Build failed, 'dist' directory does not exist."
  exit 1
fi

echo "Running linting checks..."
npm run lint

echo "Running tests..."
npm test

# Check version
PACKAGE_VERSION=$(node -p "require('./package.json').version")
echo "Current version is v$PACKAGE_VERSION"

# Ask if user wants to update version
read -p "Do you want to update the version? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo "Select version type to bump:"
  echo "1) patch (0.1.0 -> 0.1.1)"
  echo "2) minor (0.1.0 -> 0.2.0)"
  echo "3) major (0.1.0 -> 1.0.0)"
  read -p "Enter choice (1-3): " VERSION_CHOICE
  
  case $VERSION_CHOICE in
    1)
      npm version patch
      ;;
    2)
      npm version minor
      ;;
    3)
      npm version major
      ;;
    *)
      echo "Invalid choice. Keeping current version."
      ;;
  esac
  
  # Get updated version
  PACKAGE_VERSION=$(node -p "require('./package.json').version")
  echo "Updated version to v$PACKAGE_VERSION"
fi

# Publish confirmation
read -p "Ready to publish v$PACKAGE_VERSION to npm. Continue? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  # Check if user is logged in to npm
  NPM_USERNAME=$(npm whoami 2>/dev/null || echo "")
  
  if [ -z "$NPM_USERNAME" ]; then
    echo "You are not logged in to npm. Please log in:"
    npm login
  else
    echo "Publishing as $NPM_USERNAME"
  fi
  
  # Publish to npm
  npm publish
  
  echo "✅ Successfully published state-reactor v$PACKAGE_VERSION to npm!"
else
  echo "Publication cancelled."
fi