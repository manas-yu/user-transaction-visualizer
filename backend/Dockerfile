FROM node:18-alpine

WORKDIR /usr/src/app

# Copy package files first to install dependencies
COPY package*.json ./

RUN npm install

# Copy all source files
COPY . .

EXPOSE 3000

CMD ["npm", "start"]