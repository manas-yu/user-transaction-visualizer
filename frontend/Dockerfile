FROM node:18-alpine

WORKDIR /usr/src/app

# Copy package files first to install dependencies
COPY package*.json ./

RUN npm install

# Copy all source files
COPY . .

EXPOSE 5173

# Run dev server with host flag to make it accessible outside container
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]