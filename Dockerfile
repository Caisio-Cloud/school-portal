FROM node:18-alpine

WORKDIR /app

COPY backend/package*.json ./
RUN npm install --production
COPY backend/ ./

EXPOSE 5000

# Make sure backend/package.json has: "start": "node server.js"
CMD ["npm", "start"]
