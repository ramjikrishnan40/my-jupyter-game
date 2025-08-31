# Stage 1: Build the React application
# Use an official Node.js image to build our project
FROM node:20-alpine AS build-stage
WORKDIR /app
# Copy package.json and package-lock.json to leverage Docker cache
COPY package*.json ./
# Install dependencies
RUN npm install
# Copy the rest of the application source code
COPY . .
# Build the application for production
RUN npm run build

# Stage 2: Serve the application with Nginx
# Use a lightweight Nginx image for the final container
FROM nginx:stable-alpine
# Copy the built static files from the build-stage
COPY --from=build-stage /app/dist /usr/share/nginx/html
# Copy our custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf
# Expose port 80 to the outside world
EXPOSE 80
# The default Nginx command will start the server
CMD ["nginx", "-g", "daemon off;"]