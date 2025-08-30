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
}

module.exports = nextConfig
