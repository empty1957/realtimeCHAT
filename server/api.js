const { MAX_BODY_BYTES } = require("./config");
const { requireCommunityKey } = require("./auth");
const { clientCount, publish, subscribe } = require("./events");
const { readBody, sendJson } = require("./http");
const { getBoardSignal } = require("./signal");
const { sanitizeBody, sanitizeText } = require("./sanitize");
const {
  addComment,
  boardSnapshot,
  createComment,
  createThread,
  fullSnapshot,
  getThread,
  summarizeThread,
  threadCount
} = require("./store");

async function handleApi(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === "GET" && url.pathname === "/api/health") {
    sendJson(res, 200, { ok: true, clients: clientCount(), threads: threadCount() });
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
    subscribe(req, res);
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/threads") {
    await handleCreateThread(req, res, url);
    return;
  }

  const commentMatch = url.pathname.match(/^\/api\/threads\/([^/]+)\/comments$/);
  if (req.method === "POST" && commentMatch) {
    await handleCreateComment(req, res, url, commentMatch[1]);
    return;
  }

  const reactMatch = url.pathname.match(/^\/api\/threads\/([^/]+)\/comments\/([^/]+)\/react$/);
  if (req.method === "POST" && reactMatch) {
    await handleReact(req, res, url, reactMatch[1], reactMatch[2]);
    return;
  }

  sendJson(res, 404, { error: "見つかりません" });
}

async function handleCreateThread(req, res, url) {
  if (!requireCommunityKey(req, res, url)) return;

  try {
    const body = JSON.parse(await readBody(req, MAX_BODY_BYTES));
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
}

async function handleCreateComment(req, res, url, threadId) {
  if (!requireCommunityKey(req, res, url)) return;

  try {
    const thread = getThread(threadId);
    if (!thread) {
      sendJson(res, 404, { error: "スレが見つかりません" });
      return;
    }

    const body = JSON.parse(await readBody(req, MAX_BODY_BYTES));
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

    addComment(thread, comment);

    publish("comment", { threadId: thread.id, comment, thread: summarizeThread(thread) });
    sendJson(res, 201, { comment, thread: summarizeThread(thread) });
  } catch (error) {
    sendJson(res, 400, { error: error.message || "リクエストが不正です" });
  }
}

async function handleReact(req, res, url, threadId, commentId) {
  if (!requireCommunityKey(req, res, url)) return;

  try {
    const thread = getThread(threadId);
    const comment = thread ? thread.comments.find(item => item.id === commentId) : null;
    const body = JSON.parse(await readBody(req, MAX_BODY_BYTES));
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
}

module.exports = {
  handleApi
};
