import { api } from "./api.js";
import { render } from "./render.js";
import { state } from "./state.js";

export async function bootstrap() {
  const data = await api("/api/bootstrap");
  state.threads = data.threads || [];
  state.threadBodies = new Map(Object.entries(data.threadBodies || {}));

  if (!state.activeThreadId || !state.threadBodies.has(state.activeThreadId)) {
    state.activeThreadId = state.threads[0] ? state.threads[0].id : "";
  }

  render();
}
