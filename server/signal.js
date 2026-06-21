const { sanitizeBody } = require("./sanitize");

let signalCache = null;

function pickIndex(seed, length) {
  if (!length) return 0;
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash % length;
}

async function getBoardSignal() {
  const now = new Date();
  const cacheKey = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}-${now.getHours()}`;
  const fallbackSignals = [
    "この掲示板はメモリ上で軽く動いています。長期運用なら永続化を追加すると安心です。",
    "sage を使うと、スレッドを一覧の上に上げずに静かに返信できます。",
    "画像は 1.2MB まで添付できます。スクショ共有くらいなら軽快に使えます。",
    "短いスレタイほど一覧で見つけやすくなります。"
  ];

  if (signalCache && signalCache.key === cacheKey) return signalCache.value;

  try {
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const response = await fetch(`https://ja.wikipedia.org/api/rest_v1/feed/onthisday/events/${month}/${day}`, {
      headers: {
        "Accept": "application/json",
        "User-Agent": "realtime-community-board/1.0"
      }
    });

    if (!response.ok) throw new Error("Signal API unavailable");

    const data = await response.json();
    const events = Array.isArray(data.events) ? data.events : [];
    const event = events[pickIndex(cacheKey, events.length)];
    if (!event) throw new Error("No signal event");

    signalCache = {
      key: cacheKey,
      value: {
        label: "今日の出来事",
        title: event.year ? `${event.year}年` : "Wikipedia",
        text: sanitizeBody(event.text, 160),
        sourceUrl: event.pages && event.pages[0] ? event.pages[0].content_urls.desktop.page : ""
      }
    };
    return signalCache.value;
  } catch {
    signalCache = {
      key: cacheKey,
      value: {
        label: "掲示板メモ",
        title: "運用ヒント",
        text: fallbackSignals[pickIndex(cacheKey, fallbackSignals.length)],
        sourceUrl: ""
      }
    };
    return signalCache.value;
  }
}

module.exports = {
  getBoardSignal
};
