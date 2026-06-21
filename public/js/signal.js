import { api } from "./api.js";
import { elements } from "./dom.js";

export async function loadBoardSignal() {
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
