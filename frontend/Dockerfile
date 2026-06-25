FROM node:20-alpine

WORKDIR /app

# Install system dependencies if needed (none are typically required for Next.js)
RUN apk add --no-cache libc6-compat

# Copy dependency configs
COPY package*.json /app/

# Install dependencies
RUN npm install

# Copy application files
COPY . /app/

# Expose port
EXPOSE 3000

# Next.js defaults to port 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
