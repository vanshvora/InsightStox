FROM node:20-alpine

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy project files
COPY . .

# Expose Vite's default port
EXPOSE 5173

# Run the Vite development server
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
