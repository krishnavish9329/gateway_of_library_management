const { createProxyMiddleware } = require('http-proxy-middleware');
const logger = require('../utils/logger');

/**
 * Creates a proxy to an internal service.
 *
 * pathRewrite strips the gateway-facing prefix (e.g. /api/library) if the
 * downstream service doesn't expect it - adjust per service as needed.
 *
 * Forwards the authenticated user's identity to the downstream service via
 * trusted internal headers, so services don't need to re-verify the JWT
 * themselves (they trust the gateway because it's on a private network).
 */
function createServiceProxy({ target, pathRewrite }) {
  return createProxyMiddleware({
    target,
    changeOrigin: true,
    pathRewrite,
    // http-proxy-middleware v3 nests hooks under `on`
    // (top-level onProxyReq/onError from v2 are silently ignored in v3).
    on: {
      proxyReq(proxyReq, req) {
        if (req.requestId) {
          proxyReq.setHeader('x-request-id', req.requestId);
        }
        if (req.user) {
          proxyReq.setHeader('x-user-id', req.user.sub || '');
          proxyReq.setHeader('x-user-role', req.user.role || '');
        }

        // Re-stream JSON body: express.json() already consumed the stream,
        // so we need to write it back out for the proxied request.
        if (req.body && Object.keys(req.body).length) {
          const bodyData = JSON.stringify(req.body);
          proxyReq.setHeader('Content-Type', 'application/json');
          proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
          proxyReq.write(bodyData);
        }
      },
      error(err, req, res) {
        logger.error('proxy_error', {
          requestId: req.requestId,
          target,
          message: err.message,
        });
        if (!res.headersSent) {
          res.writeHead(502, { 'Content-Type': 'application/json' });
        }
        res.end(JSON.stringify({ success: false, message: 'Upstream service unavailable' }));
      },
    },
  });
}

module.exports = { createServiceProxy };
