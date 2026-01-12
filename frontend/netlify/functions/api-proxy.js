// Netlify Function to proxy API requests to your backend
// This allows your frontend to call /api/* which will be proxied to your backend server

export const handler = async (event, context) => {
  // Handle CORS preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      },
      body: '',
    }
  }

  // Get the backend API URL from environment variable
  // Set this in Netlify: Site settings → Environment variables
  // Example: https://your-backend.railway.app or https://your-backend.render.com
  const BACKEND_URL = process.env.BACKEND_API_URL || 'http://localhost:3000'
  
  if (!BACKEND_URL || BACKEND_URL === 'http://localhost:3000') {
    console.warn('⚠️ BACKEND_API_URL not set! Using localhost. Set this in Netlify environment variables.')
  }
  
  // Get the path from the request
  // event.path will be like "/.netlify/functions/api-proxy/api/users"
  // We need to extract "/api/users" part
  let path = event.path
  if (path.includes('/.netlify/functions/api-proxy')) {
    path = path.replace('/.netlify/functions/api-proxy', '')
  }
  
  // If path doesn't start with /api, add it
  if (!path.startsWith('/api')) {
    path = `/api${path}`
  }
  
  const queryString = event.queryStringParameters 
    ? '?' + new URLSearchParams(event.queryStringParameters).toString() 
    : ''
  
  const targetUrl = `${BACKEND_URL}${path}${queryString}`
  
  console.log(`Proxying ${event.httpMethod} ${path} to ${targetUrl}`)
  
  try {
    // Prepare headers (exclude host and connection headers)
    const headers = {}
    if (event.headers['content-type']) {
      headers['Content-Type'] = event.headers['content-type']
    }
    if (event.headers.authorization) {
      headers['Authorization'] = event.headers.authorization
    }
    
    // Forward the request to your backend
    const response = await fetch(targetUrl, {
      method: event.httpMethod,
      headers,
      body: event.httpMethod !== 'GET' && event.httpMethod !== 'HEAD' && event.body
        ? event.body 
        : undefined,
    })
    
    const data = await response.text()
    
    // Get response headers
    const responseHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    }
    
    const contentType = response.headers.get('content-type')
    if (contentType) {
      responseHeaders['Content-Type'] = contentType
    }
    
    return {
      statusCode: response.status,
      headers: responseHeaders,
      body: data,
    }
  } catch (error) {
    console.error('Proxy error:', error)
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        error: 'Proxy error', 
        message: error.message,
        targetUrl: targetUrl,
      }),
    }
  }
}
