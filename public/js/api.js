import { saveCommunityKey, state } from "./state.js";

function headers() {
  return state.key
    ? { "Content-Type": "application/json", "X-Community-Key": state.key }
    : { "Content-Type": "application/json" };
}

export async function api(path, options = {}) {
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
      saveCommunityKey(key);
      return api(path, options);
    }
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "通信に失敗しました" }));
    throw new Error(error.error || "通信に失敗しました");
  }

  return response.json();
}
