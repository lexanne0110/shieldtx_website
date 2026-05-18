'use strict';

/**
 * In-memory IP-keyed rate limiter. Survives only within a single warm
 * function instance — Vercel scales horizontally, so this is not a hard
 * bucket. It's a courtesy speed bump that filters obvious abuse without
 * adding a Redis dependency. Move to KV or Upstash when traffic warrants.
 */

const buckets = new Map();

function nowMs() { return Date.now(); }

function getClientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length > 0) {
    return fwd.split(',')[0].trim();
  }
  return req.headers['x-real-ip'] || req.socket?.remoteAddress || '0.0.0.0';
}

/**
 * @param {object} req - Vercel/Node request
 * @param {string} key - Logical limiter name (e.g. "request-access")
 * @param {object} opts - { max: requests, windowMs: ms }
 * @returns {{ allowed: boolean, remaining: number, retryAfterSec: number }}
 */
function check(req, key, { max = 10, windowMs = 10 * 60 * 1000 } = {}) {
  const ip = getClientIp(req);
  const bucketKey = `${key}:${ip}`;
  const t = nowMs();
  const entry = buckets.get(bucketKey);

  if (!entry || t - entry.start > windowMs) {
    buckets.set(bucketKey, { start: t, count: 1 });
    return { allowed: true, remaining: max - 1, retryAfterSec: 0 };
  }

  entry.count += 1;
  if (entry.count > max) {
    const retryAfterSec = Math.max(1, Math.ceil((entry.start + windowMs - t) / 1000));
    return { allowed: false, remaining: 0, retryAfterSec };
  }
  return { allowed: true, remaining: Math.max(0, max - entry.count), retryAfterSec: 0 };
}

module.exports = { check, getClientIp };
