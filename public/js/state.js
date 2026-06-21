export const state = {
  threads: [],
  threadBodies: new Map(),
  activeThreadId: localStorage.getItem("threadBoard.activeThread") || "",
  key: localStorage.getItem("communityChat.key") || "",
  threadImage: null,
  commentImage: null
};

export function getActiveThread() {
  return state.threadBodies.get(state.activeThreadId);
}

export function saveActiveThread(threadId) {
  state.activeThreadId = threadId;
  localStorage.setItem("threadBoard.activeThread", threadId);
}

export function saveCommunityKey(key) {
  state.key = key.trim();
  localStorage.setItem("communityChat.key", state.key);
}

export function saveAuthor(author) {
  localStorage.setItem("threadBoard.author", author);
}
