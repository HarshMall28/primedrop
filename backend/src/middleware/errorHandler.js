function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  const isProd = process.env.NODE_ENV === 'production';

  console.error(`[${new Date().toISOString()}] ${req.method} ${req.path} — ${err.message}`);
  if (!isProd) {
    console.error(err.stack);
  }

  return res.status(status).json({
    error: isProd && status === 500 ? 'Internal server error' : err.message,
    status,
  });
}

export { errorHandler };
