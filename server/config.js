const path = require("path");

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "0.0.0.0";
const THREAD_LIMIT = Number(process.env.THREAD_LIMIT || 80);
const COMMENT_LIMIT = Number(process.env.COMMENT_LIMIT || 300);
const MAX_BODY_BYTES = Number(process.env.MAX_BODY_BYTES || 1_750_000);
const MAX_IMAGE_BYTES = Number(process.env.MAX_IMAGE_BYTES || 1_200_000);
const COMMUNITY_KEY = process.env.COMMUNITY_KEY || "";
const PUBLIC_DIR = path.join(__dirname, "..", "public");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8"
};

module.exports = {
  COMMENT_LIMIT,
  COMMUNITY_KEY,
  HOST,
  MAX_BODY_BYTES,
  MAX_IMAGE_BYTES,
  MIME_TYPES,
  PORT,
  PUBLIC_DIR,
  THREAD_LIMIT
};
