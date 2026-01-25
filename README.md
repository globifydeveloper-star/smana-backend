# Smana Hotel Backend

## Overview
This is the Node.js/Express backend for Smana Hotels.

## Setup

1.  **Install Dependencies:**
    ```bash
    npm install
    ```

2.  **Environment Variables:**
    Create a `.env` file in the root directory (copy `.env.example`).
    ```env
    PORT=5000
    MONGO_URI=mongodb://localhost:27017/smana_hotel
    JWT_SECRET=your_jwt_secret
    NODE_ENV=development
    
    # URL of the Admin Frontend (for CORS)
    CLIENT_URL=http://localhost:3000
    
    # Payment Gateway
    HYPERPAY_BASE_URL=...
    ```

3.  **Run Locally:**
    ```bash
    npm run dev
    ```

## Production Deployment
- Hosted at: `https://api.smanahotels.com`
- Ensure `NODE_ENV=production`.
- Set `CLIENT_URL=https://admin.smanahotels.com` (or the actual admin domain).
- Use a process manager like PM2: `pm2 start dist/server.js --name smana-backend`

## API Endpoints
- Base URL: `/api`
- Sockets: Root `/`

## Scripts
- `npm run build`: Compile TypeScript.
- `npm start`: Run production build.
- `npm run seed`: Seed database.
