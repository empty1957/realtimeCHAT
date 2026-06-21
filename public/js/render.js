import { elements } from "./dom.js";
import { escapeHtml, formatStamp, reactionLabel } from "./format.js";
import { getActiveThread, saveActiveThread, state } from "./state.js";

export function setStatus(online) {
  elements.status.classList.toggle("is-online", online);
  elements.status.lastChild.textContent = online ? " 接続中" : " オフライン";
}

export function syncThreadSummary(summary) {
  const index = state.threads.findIndex(thread => thread.id === summary.id);
  if (index >= 0) state.threads[index] = summary;
  else state.threads.unshift(summary);
  state.threads.sort((a, b) => new Date(b.bumpedAt) - new Date(a.bumpedAt));
}

export function renderThreadList() {
  elements.threadCount.textContent = state.threads.length;
  if (!state.threads.length) {
    elements.threadList.innerHTML = '<p class="empty-state">まだスレがありません。</p>';
    return;
  }

  elements.threadList.innerHTML = state.threads
    .map((thread, index) => `
      <button class="thread-item ${thread.id === state.activeThreadId ? "is-active" : ""}" data-thread-id="${thread.id}">
        <span class="thread-rank">${String(index + 1).padStart(2, "0")}</span>
        <span class="thread-copy">
          <strong>${escapeHtml(thread.title)}${thread.hasImage ? '<span class="image-dot">画像</span>' : ""}</strong>
          <small>${thread.count}件 / ${escapeHtml(thread.latestBy)} / ${formatStamp(thread.latestAt)}</small>
        </span>
      </button>
    `)
    .join("");
}

function renderImage(image) {
  if (!image) return "";
  return `
    <figure class="comment-image">
      <img src="${image.data}" alt="${escapeHtml(image.name)}" loading="lazy">
      <figcaption>${escapeHtml(image.name)} / ${Math.round(image.bytes / 1024)}KB</figcaption>
    </figure>
  `;
}

export function renderComments() {
  const thread = getActiveThread();
  if (!thread) {
    elements.activeThreadTitle.textContent = "スレが選択されていません";
    elements.threadMeta.textContent = "スレを選択";
    elements.comments.innerHTML = '<p class="empty-state">左の一覧からスレを選んでください。</p>';
    elements.commentBody.disabled = true;
    return;
  }

  elements.commentBody.disabled = false;
  elements.activeThreadTitle.textContent = thread.title;
  elements.threadMeta.textContent = `${thread.comments.length}件 / 作成 ${formatStamp(thread.createdAt)} / ${thread.author}`;

  elements.comments.innerHTML = thread.comments
    .map((comment, index) => {
      const reactions = Object.entries(comment.reactions)
        .map(([type, count]) => `<button class="reaction" data-comment-id="${comment.id}" data-reaction="${type}">${reactionLabel(type)} ${count}</button>`)
        .join("");

      return `
        <article class="comment" id="res-${comment.id}">
          <header>
            <span class="res-no">${index + 1}</span>
            <strong>${escapeHtml(comment.author)}</strong>
            <time datetime="${comment.createdAt}">${formatStamp(comment.createdAt)}</time>
            ${comment.sage ? '<span class="sage-mark">sage</span>' : ""}
          </header>
          ${comment.body ? `<p>${escapeHtml(comment.body)}</p>` : ""}
          ${renderImage(comment.image)}
          <div class="reactions">${reactions}</div>
        </article>
      `;
    })
    .join("");

  elements.comments.scrollTop = elements.comments.scrollHeight;
}

export function render() {
  renderThreadList();
  renderComments();
}

export function setActiveThread(threadId) {
  saveActiveThread(threadId);
  render();
}
