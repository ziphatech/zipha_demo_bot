const { RateLimiterMongo } = require('rate-limiter-flexible');
const points = 5; // Number of requests allowed
const duration = 1; // Per second
const keyPrefix = 'telegram-api-rate-limit';

module.exports = function rateLimiter(client, db) {
  const rateLimiter = new RateLimiterMongo({
    storeClient: client,
    dbName:db,
    points,
    duration,
    keyPrefix,
  });
  return async function rateLimiterMiddleware(req, res, next) {
    try {
      await rateLimiter.consume(req.ip);
      next();
    } catch (error) {
      console.error('Error with rate limiter:', error);
      res.status(429).send('Too many requests');
    } finally {
      await client.close();
    }
  };
}