const cors = require('cors');
const express = require('express');
const routes = require('./routes');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('../swagger');

 // Initialize express app
const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.set('trust proxy', true);
console.log('[bootstrap] CORS enabled with origin=*');

// Lightweight response logger for tracing response content types and statuses
app.use((req, res, next) => {
  const start = Date.now();
  const origJson = res.json.bind(res);
  const origSend = res.send.bind(res);

  // wrap to log after response is sent
  function logResponse(bodySample) {
    const duration = Date.now() - start;
    const ct = res.get('Content-Type') || '';
    console.log('[resp]', {
      method: req.method,
      path: req.originalUrl || req.url,
      status: res.statusCode,
      contentType: ct,
      durationMs: duration,
      sample: typeof bodySample === 'string'
        ? bodySample.slice(0, 60)
        : (bodySample && typeof bodySample === 'object' ? '[json]' : String(bodySample).slice(0, 60))
    });
  }

  res.json = (data) => {
    try { return origJson(data); } finally { logResponse('[json body]'); }
  };
  res.send = (data) => {
    try { return origSend(data); } finally { logResponse(data); }
  };
  next();
});

app.use('/docs', swaggerUi.serve, (req, res, next) => {
  const host = req.get('host');           // may or may not include port
  let protocol = req.protocol;          // http or https

  const actualPort = req.socket.localPort;
  const hasPort = host.includes(':');
  
  const needsPort =
    !hasPort &&
    ((protocol === 'http' && actualPort !== 80) ||
     (protocol === 'https' && actualPort !== 443));
  const fullHost = needsPort ? `${host}:${actualPort}` : host;
  protocol = req.secure ? 'https' : protocol;

  const dynamicSpec = {
    ...swaggerSpec,
    servers: [
      {
        url: `${protocol}://${fullHost}`,
      },
    ],
  };
  swaggerUi.setup(dynamicSpec)(req, res, next);
});

// Expose OpenAPI JSON with dynamic server injected
app.get('/openapi.json', (req, res) => {
  const host = req.get('host');
  let protocol = req.protocol;
  const actualPort = req.socket.localPort;
  const hasPort = host.includes(':');
  const needsPort =
    !hasPort &&
    ((protocol === 'http' && actualPort !== 80) ||
      (protocol === 'https' && actualPort !== 443));
  const fullHost = needsPort ? `${host}:${actualPort}` : host;
  protocol = req.secure ? 'https' : protocol;

  const dynamicSpec = {
    ...swaggerSpec,
    servers: [{ url: `${protocol}://${fullHost}` }],
  };
  res.type('application/json').send(JSON.stringify(dynamicSpec, null, 2));
});

// Parse JSON request body
app.use(express.json());
console.log('[bootstrap] express.json() parser enabled');

// Mount routes
app.use('/', routes);
console.log('[bootstrap] Main router mounted at "/" (includes /api/auth/*, /health, /debug/routes)');

 // Error handling middleware (always return JSON)
app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  const code = err.code || 'internal_error';
  const message = err.expose ? err.message : 'Internal Server Error';
  const traceId = req.headers['x-request-id'] || undefined;

  // Avoid sending HTML by forcing JSON content type
  if (!res.headersSent) {
    res.status(status).type('application/json').json({
      success: false,
      error: code,
      message,
      traceId,
    });
  } else {
    console.error('[error] headers already sent, cannot format JSON error');
  }

  // Log error detail for debugging (stack hidden from clients)
  console.error('[app.error]', {
    method: req.method,
    path: req.originalUrl || req.url,
    status,
    code,
    msg: err.message,
  });
});

module.exports = app;
