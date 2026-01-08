# Use Node.js 18 Alpine (smaller image)
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy backend package files
COPY backend/package*.json ./

# Install dependencies
RUN npm install --production

# Copy the rest of backend code
COPY backend/ ./

# Expose port
EXPOSE 5000

# Start the application
CMD ["node", "server.js"]
