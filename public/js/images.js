import { MAX_IMAGE_BYTES, VALID_IMAGE_TYPES } from "./constants.js";
import { elements } from "./dom.js";
import { escapeHtml } from "./format.js";
import { state } from "./state.js";

export function clearImage(kind) {
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

    if (!VALID_IMAGE_TYPES.includes(file.type)) {
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

export async function handleImagePick(kind, event) {
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
