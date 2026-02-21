import dns from 'node:dns';
import mongoose from 'mongoose';
// Ensure all models are registered once per process
import './models.js';

const MONGODB_URI = process.env.MONGODB_URI?.trim();
const FALLBACK_DNS_SERVERS = ['8.8.8.8', '8.8.4.4', '1.1.1.1'];

function ensureMongoDnsResolution() {
  if (!MONGODB_URI?.startsWith('mongodb+srv://')) {
    return;
  }

  const currentServers = dns.getServers();
  const hasNonLoopbackDns = currentServers.some(
    (server) => server !== '127.0.0.1' && server !== '::1'
  );

  if (hasNonLoopbackDns) {
    return;
  }

  try {
    dns.setServers(FALLBACK_DNS_SERVERS);
  } catch (error) {
    console.warn('Failed to set fallback DNS servers for MongoDB:', error?.message || error);
  }
}

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable in your deployment environment');
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  ensureMongoDnsResolution();

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;

    const dnsCode = e?.cause?.cause?.code || e?.cause?.code || e?.code;
    if (
      MONGODB_URI.startsWith('mongodb+srv://') &&
      (dnsCode === 'ENOTFOUND' || dnsCode === 'ECONNREFUSED')
    ) {
      throw new Error(
        `MongoDB SRV DNS lookup failed (${dnsCode}). Check DNS/internet connectivity and verify MONGODB_URI points to an existing Atlas cluster.`,
        { cause: e }
      );
    }

    throw e;
  }

  return cached.conn;
}

export default dbConnect;
