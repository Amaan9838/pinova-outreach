/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    MONGODB_URI: process.env.MONGODB_URI,
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
    AWS_REGION: process.env.AWS_REGION,
    JWT_SECRET: process.env.JWT_SECRET,
    TRACKING_DOMAIN: process.env.TRACKING_DOMAIN,
  },
  // Fix aggressive hot reload
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
        ignored: [
          '**/node_modules',
          '**/logs/**',
          '**/tests/**',
          '**/scripts/**',
          '**/*.test.js',
          '**/test-*.js',
          '**/quick-test.js'
        ]
      }
    }
    return config
  },
}

module.exports = nextConfig
