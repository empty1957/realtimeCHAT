export const elements = {
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

export function restoreSavedName() {
  const savedName = localStorage.getItem("threadBoard.author");
  if (!savedName) return;
  elements.threadAuthor.value = savedName;
  elements.commentAuthor.value = savedName;
}
