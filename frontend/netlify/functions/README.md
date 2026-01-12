# Netlify Functions

This directory contains Netlify serverless functions.

## api-proxy.js

This function proxies API requests from your frontend to your backend server.

### Setup

1. **Deploy your backend** to a service like:
   - Railway (https://railway.app)
   - Render (https://render.com)
   - Heroku (https://heroku.com)
   - Or any Node.js hosting service

2. **Set environment variable in Netlify**:
   - Go to: Site settings → Environment variables
   - Add: `BACKEND_API_URL` = `https://your-backend-url.com`
   - Example: `https://your-app.railway.app` or `https://your-app.onrender.com`

3. **Redeploy** your site on Netlify

### How it works

- Frontend makes request to `/api/*`
- Netlify redirects to `/.netlify/functions/api-proxy`
- Function forwards request to your backend server
- Response is returned to frontend

### Alternative: Direct API URL

If you prefer not to use the proxy, you can:
1. Update `frontend/src/lib/api.ts` to use your backend URL directly
2. Set `baseURL` to your backend URL (e.g., `https://your-backend.railway.app/api`)
3. Remove the proxy function and redirect
