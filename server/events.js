const clients = new Set();
let lastEventId = 0;

function publish(type, payload) {
  const event = {
    id: ++lastEventId,
    type,
    payload,
    createdAt: new Date().toISOString()
  };
  const data = `id: ${event.id}\nevent: ${type}\ndata: ${JSON.stringify(event)}\n\n`;
  for (const res of clients) res.write(data);
}

function subscribe(req, res) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no"
  });
  res.write(": connected\n\n");
  clients.add(res);

  const heartbeat = setInterval(() => {
    res.write(`: heartbeat ${Date.now()}\n\n`);
  }, 25_000);

  req.on("close", () => {
    clearInterval(heartbeat);
    clients.delete(res);
  });
}

function clientCount() {
  return clients.size;
}

module.exports = {
  clientCount,
  publish,
  subscribe
};
