FROM node:18-alpine

WORKDIR /usr/src/app

# Copy package files first to install dependencies
COPY backend/package*.json ./

RUN npm install

# Copy all source files from backend
COPY backend/ .

EXPOSE 3000

CMD ["npm", "start"]
