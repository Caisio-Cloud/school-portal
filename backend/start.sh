#!/bin/bash

echo "Starting School Portal Backend..."

# Check if DATABASE_URL exists
if [ -z "$DATABASE_URL" ]; then
    echo "Warning: DATABASE_URL not set. Railway should provide this automatically."
fi

# Install dependencies
npm install

# Run database migrations
node migrate.js

# Seed admin if needed
node seed.js

# Start the application
npm start
