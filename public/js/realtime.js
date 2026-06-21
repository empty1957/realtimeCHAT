import { state } from "./state.js";
import { render, renderComments, setActiveThread, setStatus, syncThreadSummary } from "./render.js";

export function connectEvents() {
  const sourceUrl = state.key ? `/api/events?key=${encodeURIComponent(state.key)}` : "/api/events";
  const source = new EventSource(sourceUrl);

  source.addEventListener("open", () => setStatus(true));
  source.addEventListener("error", () => setStatus(false));

  source.addEventListener("thread", event => {
    const data = JSON.parse(event.data).payload;
    state.threadBodies.set(data.thread.id, data.thread);
    state.threads = data.threads;
    if (!state.activeThreadId) setActiveThread(data.thread.id);
    render();
  });

  source.addEventListener("comment", event => {
    const data = JSON.parse(event.data).payload;
    const thread = state.threadBodies.get(data.threadId);
    if (thread) {
      thread.comments.push(data.comment);
      while (thread.comments.length > 300) thread.comments.shift();
    }
    syncThreadSummary(data.thread);
    render();
  });

  source.addEventListener("reaction", event => {
    const data = JSON.parse(event.data).payload;
    const thread = state.threadBodies.get(data.threadId);
    const comment = thread ? thread.comments.find(item => item.id === data.commentId) : null;
    if (comment) {
      comment.reactions = data.reactions;
      renderComments();
    }
  });
}
