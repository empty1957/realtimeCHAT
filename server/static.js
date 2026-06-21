const fs = require("fs");
const path = require("path");
const { MIME_TYPES, PUBLIC_DIR } = require("./config");
const { sendJson } = require("./http");

function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const requestPath = url.pathname === "/" ? "/index.html" : url.pathname;
  const resolvedPath = path.normalize(path.join(PUBLIC_DIR, requestPath));
  const publicRoot = `${PUBLIC_DIR}${path.sep}`;

  if (resolvedPath !== PUBLIC_DIR && !resolvedPath.startsWith(publicRoot)) {
    sendJson(res, 403, { error: "Forbidden" });
    return;
  }

  fs.readFile(resolvedPath, (err, content) => {
    if (err) {
      sendJson(res, 404, { error: "Not found" });
      return;
    }
    const ext = path.extname(resolvedPath);
    res.writeHead(200, {
      "Content-Type": MIME_TYPES[ext] || "application/octet-stream",
      "Cache-Control": "no-store"
    });
    res.end(content);
  });
}

module.exports = {
  serveStatic
};
