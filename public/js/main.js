import { bootstrap } from "./bootstrap.js";
import { restoreSavedName, elements } from "./dom.js";
import { applyInitialHash, bindEvents } from "./events.js";
import { connectEvents } from "./realtime.js";
import { setStatus } from "./render.js";
import { loadBoardSignal } from "./signal.js";

restoreSavedName();
bindEvents();
loadBoardSignal();

bootstrap()
  .then(() => {
    applyInitialHash();
    connectEvents();
  })
  .catch(error => {
    setStatus(false);
    elements.helper.textContent = error.message;
  });
