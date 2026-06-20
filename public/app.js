const MAX_IMAGE_BYTES = 1_200_000;

const state = {
  threads: [],
  threadBodies: new Map(),
  activeThreadId: localStorage.getItem("threadBoard.activeThread") || "",
  key: localStorage.getItem("communityChat.key") || "",
  threadImage: null,
  commentImage: null
};

const elements = {
  status: document.querySelector("#connectionStatus"),
  signalLabel: document.querySelector("#signalLabel"),
  signalName: document.querySelector("#signalName"),
  signalText: document.querySelector("#signalText"),
  threadForm: document.querySelector("#threadForm"),
  threadTitle: document.querySelector("#threadTitle"),
  threadAuthor: document.querySelector("#threadAuthor"),
  threadBody: document.querySelector("#threadBody"),
  threadImage: document.querySelector("#threadImage"),
  threadImagePreview: document.querySelector("#threadImagePreview"),
  threadList: document.querySelector("#threadList"),
  threadCount: document.querySelector("#threadCount"),
  activeThreadTitle: document.querySelector("#activeThreadTitle"),
  threadMeta: document.querySelector("#threadMeta"),
  comments: document.querySelector("#comments"),
  commentForm: document.querySelector("#commentForm"),
  commentAuthor: document.querySelector("#commentAuthor"),
  commentBody: document.querySelector("#commentBody"),
  commentImage: document.querySelector("#commentImage"),
  commentImagePreview: document.querySelector("#commentImagePreview"),
  sage: document.querySelector("#sage"),
  helper: document.querySelector("#helperText"),
  copyThreadLink: document.querySelector("#copyThreadLink")
};

const savedName = localStorage.getItem("threadBoard.author");
if (savedName) {
  elements.threadAuthor.value = savedName;
  elements.commentAuthor.value = savedName;
}

function headers() {
  return state.key ? { "Content-Type": "application/json", "X-Community-Key": state.key } : { "Content-Type": "application/json" };
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatStamp(value) {
  return new Intl.DateTimeFormat("ja-JP", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function reactionLabel(type) {
  return {
    pulse: "いいね",
    agree: "同意",
    watch: "見てる"
  }[type] || type;
}

function getActiveThread() {
  return state.threadBodies.get(state.activeThreadId);
}

function setStatus(online) {
  elements.status.classList.toggle("is-online", online);
  elements.status.lastChild.textContent = online ? " 接続中" : " オフライン";
}

async function loadBoardSignal() {
  try {
    const signal = await api("/api/signal");
    elements.signalLabel.textContent = signal.label || "今日の出来事";
    elements.signalName.textContent = signal.title || "小ネタ";
    elements.signalText.textContent = signal.text || "表示できる小ネタがありません。";
  } catch {
    elements.signalLabel.textContent = "掲示板メモ";
    elements.signalName.textContent = "運用ヒント";
    elements.signalText.textContent = "短いスレタイほど一覧で見つけやすくなります。";
  }
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      ...headers(),
      ...(options.headers || {})
    }
  });

  if (response.status === 401) {
    const key = window.prompt("コミュニティの合言葉");
    if (key) {
      state.key = key.trim();
      localStorage.setItem("communityChat.key", state.key);
      return api(path, options);
    }
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "通信に失敗しました" }));
    throw new Error(error.error || "通信に失敗しました");
  }

  return response.json();
}

function syncThreadSummary(summary) {
  const index = state.threads.findIndex(thread => thread.id === summary.id);
  if (index >= 0) state.threads[index] = summary;
  else state.threads.unshift(summary);
  state.threads.sort((a, b) => new Date(b.bumpedAt) - new Date(a.bumpedAt));
}

function renderThreadList() {
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

function renderComments() {
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

function render() {
  renderThreadList();
  renderComments();
}

function setActiveThread(threadId) {
  state.activeThreadId = threadId;
  localStorage.setItem("threadBoard.activeThread", threadId);
  render();
}

function clearImage(kind) {
  state[`${kind}Image`] = null;
  elements[`${kind}Image`].value = "";
  elements[`${kind}ImagePreview`].hidden = true;
  elements[`${kind}ImagePreview`].innerHTML = "";
}

function previewImage(kind, image) {
  const preview = elements[`${kind}ImagePreview`];
  preview.hidden = false;
  preview.innerHTML = `
    <img src="${image.data}" alt="">
    <span>${escapeHtml(image.name)} / ${Math.round(image.bytes / 1024)}KB</span>
    <button type="button" data-clear-image="${kind}">削除</button>
  `;
}

function readImageFile(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      resolve(null);
      return;
    }

    if (!["image/png", "image/jpeg", "image/gif", "image/webp"].includes(file.type)) {
      reject(new Error("PNG、JPEG、GIF、WebP の画像を選んでください。"));
      return;
    }

    if (file.size > MAX_IMAGE_BYTES) {
      reject(new Error("画像は 1.2MB 以下にしてください。"));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => resolve({
      name: file.name,
      type: file.type,
      bytes: file.size,
      data: reader.result
    });
    reader.onerror = () => reject(new Error("画像を読み込めませんでした。"));
    reader.readAsDataURL(file);
  });
}

async function handleImagePick(kind, event) {
  try {
    const image = await readImageFile(event.target.files[0]);
    if (!image) return;
    state[`${kind}Image`] = image;
    previewImage(kind, image);
  } catch (error) {
    clearImage(kind);
    elements.helper.textContent = error.message;
  }
}

async function bootstrap() {
  const data = await api("/api/bootstrap");
  state.threads = data.threads || [];
  state.threadBodies = new Map(Object.entries(data.threadBodies || {}));

  if (!state.activeThreadId || !state.threadBodies.has(state.activeThreadId)) {
    state.activeThreadId = state.threads[0] ? state.threads[0].id : "";
  }

  render();
}

function connectEvents() {
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

elements.threadForm.addEventListener("submit", async event => {
  event.preventDefault();
  const title = elements.threadTitle.value.trim();
  const author = elements.threadAuthor.value.trim() || "匿名さん";
  const body = elements.threadBody.value.trim();
  if (!title) return;

  elements.helper.textContent = "スレ立て中...";
  try {
    localStorage.setItem("threadBoard.author", author);
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
});

elements.threadList.addEventListener("click", event => {
  const button = event.target.closest(".thread-item");
  if (button) setActiveThread(button.dataset.threadId);
});

elements.commentForm.addEventListener("submit", async event => {
  event.preventDefault();
  const thread = getActiveThread();
  if (!thread) return;

  const author = elements.commentAuthor.value.trim() || "匿名さん";
  const body = elements.commentBody.value.trim();
  if (!body && !state.commentImage) return;

  elements.helper.textContent = "書き込み中...";
  try {
    localStorage.setItem("threadBoard.author", author);
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
});

elements.comments.addEventListener("click", async event => {
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
});

document.addEventListener("click", event => {
  const button = event.target.closest("[data-clear-image]");
  if (button) clearImage(button.dataset.clearImage);
});

elements.threadImage.addEventListener("change", event => handleImagePick("thread", event));
elements.commentImage.addEventListener("change", event => handleImagePick("comment", event));

elements.copyThreadLink.addEventListener("click", async () => {
  const thread = getActiveThread();
  if (!thread) return;
  const url = `${location.origin}${location.pathname}#${thread.id}`;
  await navigator.clipboard.writeText(url).catch(() => {});
  elements.helper.textContent = "スレ URL をコピーしました。";
});

window.addEventListener("hashchange", () => {
  const threadId = location.hash.slice(1);
  if (state.threadBodies.has(threadId)) setActiveThread(threadId);
});

loadBoardSignal();
bootstrap()
  .then(() => {
    const threadId = location.hash.slice(1);
    if (state.threadBodies.has(threadId)) setActiveThread(threadId);
    connectEvents();
  })
  .catch(error => {
    setStatus(false);
    elements.helper.textContent = error.message;
  });
