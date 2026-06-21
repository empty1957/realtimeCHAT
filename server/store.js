const crypto = require("crypto");
const { COMMENT_LIMIT, THREAD_LIMIT } = require("./config");
const { sanitizeBody, sanitizeImage, sanitizeText } = require("./sanitize");

const threads = new Map();

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

function addComment(thread, comment) {
  thread.comments.push(comment);
  while (thread.comments.length > COMMENT_LIMIT) thread.comments.shift();
  if (!comment.sage) thread.bumpedAt = comment.createdAt;
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
    requiresKey: Boolean(process.env.COMMUNITY_KEY || ""),
    threads: boardSnapshot(),
    threadBodies: Object.fromEntries(Array.from(threads.values()).map(thread => [thread.id, thread]))
  };
}

function getThread(threadId) {
  return threads.get(threadId);
}

function seedBoard() {
  if (threads.size) return;
  createThread({
    title: "雑談スレ",
    author: "system",
    body: "リアルタイム掲示板が起動しました。スレ立て、画像共有、軽い相談に使ってください。"
  });
}

function threadCount() {
  return threads.size;
}

module.exports = {
  addComment,
  boardSnapshot,
  createComment,
  createThread,
  fullSnapshot,
  getThread,
  seedBoard,
  summarizeThread,
  threadCount
};
