#!/bin/bash
set -e

echo "Setting up the State Reactor demo..."

cd /home/alex/code/state-reactor/demo

# Install dependencies
echo "Installing dependencies..."
npm install

# Make sure we have the correct Vite config
echo "Configuring Vite..."
cat > vite.config.js << EOF
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true
  }
});
EOF

# Start the dev server
echo "Starting demo with Vite..."
echo "---------------------------------------------"
echo "IMPORTANT: When browser opens, navigate to http://localhost:5173/"
echo "Check browser console for debugging info"
echo "The application includes detailed logging to help"
echo "you understand how message passing works."
echo "---------------------------------------------"
npm start