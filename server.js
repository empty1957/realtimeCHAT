const http = require("http");
const { HOST, PORT } = require("./server/config");
const { handleApi } = require("./server/api");
const { serveStatic } = require("./server/static");
const { sendJson } = require("./server/http");
const { seedBoard } = require("./server/store");

seedBoard();

const server = http.createServer((req, res) => {
  if (req.url.startsWith("/api/")) {
    handleApi(req, res);
    return;
  }

  if (req.method !== "GET") {
    sendJson(res, 405, { error: "許可されていない操作です" });
    return;
  }

  serveStatic(req, res);
});

server.listen(PORT, HOST, () => {
  console.log(`Realtime thread board listening on http://${HOST}:${PORT}`);
});
