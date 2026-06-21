import { api } from "./api.js";
import { elements } from "./dom.js";
import { clearImage, handleImagePick } from "./images.js";
import { renderComments, setActiveThread } from "./render.js";
import { getActiveThread, saveAuthor, state } from "./state.js";

export function bindEvents() {
  elements.threadForm.addEventListener("submit", handleThreadSubmit);
  elements.threadList.addEventListener("click", handleThreadListClick);
  elements.commentForm.addEventListener("submit", handleCommentSubmit);
  elements.comments.addEventListener("click", handleCommentClick);
  document.addEventListener("click", handleDocumentClick);
  elements.threadImage.addEventListener("change", event => handleImagePick("thread", event));
  elements.commentImage.addEventListener("change", event => handleImagePick("comment", event));
  elements.copyThreadLink.addEventListener("click", handleCopyThreadLink);
  window.addEventListener("hashchange", handleHashChange);
}

async function handleThreadSubmit(event) {
  event.preventDefault();
  const title = elements.threadTitle.value.trim();
  const author = elements.threadAuthor.value.trim() || "匿名さん";
  const body = elements.threadBody.value.trim();
  if (!title) return;

  elements.helper.textContent = "スレ立て中...";
  try {
    saveAuthor(author);
    const data = await api("/api/threads", {
      method: "POST",
      body: JSON.stringify({ title, author, body, image: state.threadImage })
    });
    state.threadBodies.set(data.thread.id, data.thread);
    state.threads = data.threads;
    elements.threadTitle.value = "";
    elements.threadBody.value = "";
    clearImage("thread");
    setActiveThread(data.thread.id);
    elements.helper.textContent = "スレを立てました。";
  } catch (error) {
    elements.helper.textContent = error.message;
  }
}

function handleThreadListClick(event) {
  const button = event.target.closest(".thread-item");
  if (button) setActiveThread(button.dataset.threadId);
}

async function handleCommentSubmit(event) {
  event.preventDefault();
  const thread = getActiveThread();
  if (!thread) return;

  const author = elements.commentAuthor.value.trim() || "匿名さん";
  const body = elements.commentBody.value.trim();
  if (!body && !state.commentImage) return;

  elements.helper.textContent = "書き込み中...";
  try {
    saveAuthor(author);
    await api(`/api/threads/${thread.id}/comments`, {
      method: "POST",
      body: JSON.stringify({ author, body, image: state.commentImage, sage: elements.sage.checked })
    });
    elements.commentBody.value = "";
    clearImage("comment");
    elements.helper.textContent = elements.sage.checked ? "sage で書き込みました。" : "書き込みました。";
  } catch (error) {
    elements.helper.textContent = error.message;
  }
}

async function handleCommentClick(event) {
  const button = event.target.closest(".reaction");
  const thread = getActiveThread();
  if (!button || !thread) return;

  try {
    await api(`/api/threads/${thread.id}/comments/${button.dataset.commentId}/react`, {
      method: "POST",
      body: JSON.stringify({ reaction: button.dataset.reaction })
    });
  } catch (error) {
    elements.helper.textContent = error.message;
  }
}

function handleDocumentClick(event) {
  const button = event.target.closest("[data-clear-image]");
  if (button) clearImage(button.dataset.clearImage);
}

async function handleCopyThreadLink() {
  const thread = getActiveThread();
  if (!thread) return;
  const url = `${location.origin}${location.pathname}#${thread.id}`;
  await navigator.clipboard.writeText(url).catch(() => {});
  elements.helper.textContent = "スレ URL をコピーしました。";
}

function handleHashChange() {
  const threadId = location.hash.slice(1);
  if (state.threadBodies.has(threadId)) setActiveThread(threadId);
}

export function applyInitialHash() {
  const threadId = location.hash.slice(1);
  if (state.threadBodies.has(threadId)) setActiveThread(threadId);
}
