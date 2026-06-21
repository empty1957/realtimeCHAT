const { MAX_IMAGE_BYTES } = require("./config");

function sanitizeText(value, maxLength) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function sanitizeBody(value, maxLength) {
  return String(value || "")
    .replace(/\r/g, "")
    .trim()
    .slice(0, maxLength);
}

function sanitizeImage(image) {
  if (!image || typeof image !== "object") return null;
  const type = sanitizeText(image.type, 32).toLowerCase();
  const name = sanitizeText(image.name, 80) || "添付画像";
  const data = String(image.data || "");
  const allowed = new Set(["image/png", "image/jpeg", "image/gif", "image/webp"]);

  if (!allowed.has(type)) throw new Error("対応していない画像形式です");
  if (!data.startsWith(`data:${type};base64,`)) throw new Error("画像データが不正です");

  const base64 = data.split(",")[1] || "";
  const bytes = Buffer.byteLength(base64, "base64");
  if (bytes > MAX_IMAGE_BYTES) throw new Error("画像サイズが大きすぎます");

  return { name, type, data, bytes };
}

module.exports = {
  sanitizeBody,
  sanitizeImage,
  sanitizeText
};
