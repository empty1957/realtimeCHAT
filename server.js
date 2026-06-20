const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "0.0.0.0";
const THREAD_LIMIT = Number(process.env.THREAD_LIMIT || 80);
const COMMENT_LIMIT = Number(process.env.COMMENT_LIMIT || 300);
const COMMUNITY_KEY = process.env.COMMUNITY_KEY || "";
const PUBLIC_DIR = path.join(__dirname, "public");

const clients = new Set();
const threads = new Map();
let lastEventId = 0;

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8"
};

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "no-store"
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => {
      body += chunk;
      if (body.length > 24_576) {
        reject(new Error("Request body is too large"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

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

function requireCommunityKey(req, res, url) {
  if (!COMMUNITY_KEY) return true;
  const provided = req.headers["x-community-key"];
  const queryKey = url ? url.searchParams.get("key") : "";
  if (provided === COMMUNITY_KEY || queryKey === COMMUNITY_KEY) return true;
  sendJson(res, 401, { error: "Community key is required" });
  return false;
}

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

function createComment({ author, body, sage = false }) {
  return {
    id: crypto.randomUUID(),
    author: sanitizeText(author, 32) || "名無しさん",
    body: sanitizeBody(body, 1200),
    sage: Boolean(sage),
    reactions: { w: 0, agree: 0, watch: 0 },
    createdAt: new Date().toISOString()
  };
}

function createThread({ title, author, body }) {
  const now = new Date().toISOString();
  const thread = {
    id: crypto.randomUUID(),
    title: sanitizeText(title, 80),
    author: sanitizeText(author, 32) || "名無しさん",
    comments: [],
    createdAt: now,
    bumpedAt: now
  };

  if (body) {
    const firstComment = createComment({ author: thread.author, body });
    thread.comments.push(firstComment);
  }

  threads.set(thread.id, thread);
  pruneThreads();
  return thread;
}

function pruneThreads() {
  const sorted = Array.from(threads.values()).sort((a, b) => new Date(b.bumpedAt) - new Date(a.bumpedAt));
  for (const thread of sorted.slice(THREAD_LIMIT)) threads.delete(thread.id);
}

function summarizeThread(thread) {
  const lastComment = thread.comments.at(-1);
  return {
    id: thread.id,
    title: thread.title,
    author: thread.author,
    count: thread.comments.length,
    createdAt: thread.createdAt,
    bumpedAt: thread.bumpedAt,
    latestAt: lastComment ? lastComment.createdAt : thread.createdAt,
    latestBy: lastComment ? lastComment.author : thread.author
  };
}

function boardSnapshot() {
  return Array.from(threads.values())
    .map(summarizeThread)
    .sort((a, b) => new Date(b.bumpedAt) - new Date(a.bumpedAt));
}

function fullSnapshot() {
  return {
    requiresKey: Boolean(COMMUNITY_KEY),
    threads: boardSnapshot(),
    threadBodies: Object.fromEntries(
      Array.from(threads.values()).map(thread => [thread.id, thread])
    )
  };
}

function seedBoard() {
  if (threads.size) return;
  createThread({
    title: "雑談スレ",
    author: "管理人",
    body: "ここはコミュニティ用のリアルタイム掲示板です。スレ立てしてゆるく話してください。"
  });
}

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
      "Content-Type": mimeTypes[ext] || "application/octet-stream",
      "Cache-Control": ext === ".html" ? "no-store" : "public, max-age=3600"
    });
    res.end(content);
  });
}

async function handleApi(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === "GET" && url.pathname === "/api/health") {
    sendJson(res, 200, {
      ok: true,
      clients: clients.size,
      threads: threads.size
    });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/bootstrap") {
    if (!requireCommunityKey(req, res, url)) return;
    sendJson(res, 200, fullSnapshot());
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/events") {
    if (!requireCommunityKey(req, res, url)) return;

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
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/threads") {
    if (!requireCommunityKey(req, res, url)) return;

    try {
      const body = JSON.parse(await readBody(req));
      const title = sanitizeText(body.title, 80);
      const firstBody = sanitizeBody(body.body, 1200);

      if (!title) {
        sendJson(res, 400, { error: "Thread title is required" });
        return;
      }

      const thread = createThread({
        title,
        author: body.author,
        body: firstBody
      });

      publish("thread", { thread, threads: boardSnapshot() });
      sendJson(res, 201, { thread, threads: boardSnapshot() });
    } catch (error) {
      sendJson(res, 400, { error: error.message || "Invalid request" });
    }
    return;
  }

  const commentMatch = url.pathname.match(/^\/api\/threads\/([^/]+)\/comments$/);
  if (req.method === "POST" && commentMatch) {
    if (!requireCommunityKey(req, res, url)) return;

    try {
      const thread = threads.get(commentMatch[1]);
      if (!thread) {
        sendJson(res, 404, { error: "Thread was not found" });
        return;
      }

      const body = JSON.parse(await readBody(req));
      const comment = createComment({
        author: body.author,
        body: body.body,
        sage: body.sage
      });

      if (!comment.body) {
        sendJson(res, 400, { error: "Comment body is required" });
        return;
      }

      thread.comments.push(comment);
      while (thread.comments.length > COMMENT_LIMIT) thread.comments.shift();
      if (!comment.sage) thread.bumpedAt = comment.createdAt;

      publish("comment", { threadId: thread.id, comment, thread: summarizeThread(thread) });
      sendJson(res, 201, { comment, thread: summarizeThread(thread) });
    } catch (error) {
      sendJson(res, 400, { error: error.message || "Invalid request" });
    }
    return;
  }

  const reactMatch = url.pathname.match(/^\/api\/threads\/([^/]+)\/comments\/([^/]+)\/react$/);
  if (req.method === "POST" && reactMatch) {
    if (!requireCommunityKey(req, res, url)) return;

    try {
      const thread = threads.get(reactMatch[1]);
      const comment = thread ? thread.comments.find(item => item.id === reactMatch[2]) : null;
      const body = JSON.parse(await readBody(req));
      const reaction = sanitizeText(body.reaction, 12);

      if (!comment || !Object.prototype.hasOwnProperty.call(comment.reactions, reaction)) {
        sendJson(res, 404, { error: "Reaction target was not found" });
        return;
      }

      comment.reactions[reaction] += 1;
      publish("reaction", {
        threadId: thread.id,
        commentId: comment.id,
        reactions: comment.reactions
      });
      sendJson(res, 200, { comment });
    } catch (error) {
      sendJson(res, 400, { error: error.message || "Invalid request" });
    }
    return;
  }

  sendJson(res, 404, { error: "Not found" });
}

seedBoard();

const server = http.createServer((req, res) => {
  if (req.url.startsWith("/api/")) {
    handleApi(req, res);
    return;
  }

  if (req.method !== "GET") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  serveStatic(req, res);
});

server.listen(PORT, HOST, () => {
  console.log(`Realtime thread board listening on http://${HOST}:${PORT}`);
});
