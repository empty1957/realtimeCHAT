const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "0.0.0.0";
const THREAD_LIMIT = Number(process.env.THREAD_LIMIT || 80);
const COMMENT_LIMIT = Number(process.env.COMMENT_LIMIT || 300);
const MAX_BODY_BYTES = Number(process.env.MAX_BODY_BYTES || 1_750_000);
const MAX_IMAGE_BYTES = Number(process.env.MAX_IMAGE_BYTES || 1_200_000);
const COMMUNITY_KEY = process.env.COMMUNITY_KEY || "";
const PUBLIC_DIR = path.join(__dirname, "public");

const clients = new Set();
const threads = new Map();
let lastEventId = 0;
let signalCache = null;

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
      if (Buffer.byteLength(body) > MAX_BODY_BYTES) {
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

function requireCommunityKey(req, res, url) {
  if (!COMMUNITY_KEY) return true;
  const provided = req.headers["x-community-key"];
  const queryKey = url ? url.searchParams.get("key") : "";
  if (provided === COMMUNITY_KEY || queryKey === COMMUNITY_KEY) return true;
  sendJson(res, 401, { error: "コミュニティの合言葉が必要です" });
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

function createComment({ author, body, image, sage = false }) {
  return {
    id: crypto.randomUUID(),
    author: sanitizeText(author, 32) || "匿名さん",
    body: sanitizeBody(body, 1200),
    image: sanitizeImage(image),
    sage: Boolean(sage),
    reactions: { pulse: 0, agree: 0, watch: 0 },
    createdAt: new Date().toISOString()
  };
}

function createThread({ title, author, body, image }) {
  const now = new Date().toISOString();
  const thread = {
    id: crypto.randomUUID(),
    title: sanitizeText(title, 80),
    author: sanitizeText(author, 32) || "匿名さん",
    comments: [],
    createdAt: now,
    bumpedAt: now
  };

  if (body || image) {
    const firstComment = createComment({ author: thread.author, body, image });
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
    latestBy: lastComment ? lastComment.author : thread.author,
    hasImage: thread.comments.some(comment => Boolean(comment.image))
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
    threadBodies: Object.fromEntries(Array.from(threads.values()).map(thread => [thread.id, thread]))
  };
}

function pickIndex(seed, length) {
  if (!length) return 0;
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash % length;
}

async function getBoardSignal() {
  const now = new Date();
  const cacheKey = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}-${now.getHours()}`;
  const fallbackSignals = [
    "この掲示板はメモリ上で軽く動いています。長期運用なら永続化を追加すると安心です。",
    "sage を使うと、スレッドを一覧の上に上げずに静かに返信できます。",
    "画像は 1.2MB まで添付できます。スクショ共有くらいなら軽快に使えます。",
    "短いスレタイほど一覧で見つけやすくなります。"
  ];

  if (signalCache && signalCache.key === cacheKey) return signalCache.value;

  try {
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const response = await fetch(`https://ja.wikipedia.org/api/rest_v1/feed/onthisday/events/${month}/${day}`, {
      headers: {
        "Accept": "application/json",
        "User-Agent": "realtime-community-board/1.0"
      }
    });

    if (!response.ok) throw new Error("Signal API unavailable");

    const data = await response.json();
    const events = Array.isArray(data.events) ? data.events : [];
    const event = events[pickIndex(cacheKey, events.length)];
    if (!event) throw new Error("No signal event");

    signalCache = {
      key: cacheKey,
      value: {
        label: "今日の出来事",
        title: event.year ? `${event.year}年` : "Wikipedia",
        text: sanitizeBody(event.text, 160),
        sourceUrl: event.pages && event.pages[0] ? event.pages[0].content_urls.desktop.page : ""
      }
    };
    return signalCache.value;
  } catch {
    signalCache = {
      key: cacheKey,
      value: {
        label: "掲示板メモ",
        title: "運用ヒント",
        text: fallbackSignals[pickIndex(cacheKey, fallbackSignals.length)],
        sourceUrl: ""
      }
    };
    return signalCache.value;
  }
}

function seedBoard() {
  if (threads.size) return;
  createThread({
    title: "雑談スレ",
    author: "system",
    body: "リアルタイム掲示板が起動しました。スレ立て、画像共有、軽い相談に使ってください。"
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
      "Cache-Control": "no-store"
    });
    res.end(content);
  });
}

async function handleApi(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === "GET" && url.pathname === "/api/health") {
    sendJson(res, 200, { ok: true, clients: clients.size, threads: threads.size });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/bootstrap") {
    if (!requireCommunityKey(req, res, url)) return;
    sendJson(res, 200, fullSnapshot());
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/signal") {
    sendJson(res, 200, await getBoardSignal());
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
        sendJson(res, 400, { error: "スレタイを入力してください" });
        return;
      }

      const thread = createThread({
        title,
        author: body.author,
        body: firstBody,
        image: body.image
      });

      publish("thread", { thread, threads: boardSnapshot() });
      sendJson(res, 201, { thread, threads: boardSnapshot() });
    } catch (error) {
      sendJson(res, 400, { error: error.message || "リクエストが不正です" });
    }
    return;
  }

  const commentMatch = url.pathname.match(/^\/api\/threads\/([^/]+)\/comments$/);
  if (req.method === "POST" && commentMatch) {
    if (!requireCommunityKey(req, res, url)) return;

    try {
      const thread = threads.get(commentMatch[1]);
      if (!thread) {
        sendJson(res, 404, { error: "スレが見つかりません" });
        return;
      }

      const body = JSON.parse(await readBody(req));
      const comment = createComment({
        author: body.author,
        body: body.body,
        image: body.image,
        sage: body.sage
      });

      if (!comment.body && !comment.image) {
        sendJson(res, 400, { error: "本文または画像を入力してください" });
        return;
      }

      thread.comments.push(comment);
      while (thread.comments.length > COMMENT_LIMIT) thread.comments.shift();
      if (!comment.sage) thread.bumpedAt = comment.createdAt;

      publish("comment", { threadId: thread.id, comment, thread: summarizeThread(thread) });
      sendJson(res, 201, { comment, thread: summarizeThread(thread) });
    } catch (error) {
      sendJson(res, 400, { error: error.message || "リクエストが不正です" });
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
        sendJson(res, 404, { error: "リアクション対象が見つかりません" });
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
      sendJson(res, 400, { error: error.message || "リクエストが不正です" });
    }
    return;
  }

  sendJson(res, 404, { error: "見つかりません" });
}

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
