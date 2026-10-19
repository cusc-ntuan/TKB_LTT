const $ = (id) => document.getElementById(id);
const schoolDataUrl = $("school-data-url");

async function fetchJSON(url, options) {
  const response = await fetch(url, options);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Lỗi máy chủ.");
  return data;
}

const versionSelect = $("school-version");
const loadPreviewButton = $("load-school-preview");
const confirmImportButton = $("confirm-school-import");
const status = $("school-import-status");
const previewSection = $("school-preview");
let currentPreview;

function invalidatePreview() {
  currentPreview = null;
  previewSection.hidden = true;
  confirmImportButton.disabled = true;
  setStatus("");
}

versionSelect.addEventListener("change", invalidatePreview);
schoolDataUrl.addEventListener("input", () => {
  invalidatePreview();
  versionSelect.replaceChildren(new Option("Nhập URL để tải phiên bản", ""));
  versionSelect.disabled = true;
  loadPreviewButton.disabled = true;
  setStatus(schoolDataUrl.value.trim()
    ? "Nhấn Enter hoặc rời khỏi ô URL để tải danh sách phiên bản."
    : "Nhập URL dữ liệu của trường.");
});

function setStatus(message, isError = false) {
  status.textContent = message;
  status.classList.toggle("error", isError);
}

function renderPreview(preview) {
  currentPreview = preview;
  $("school-preview-title").textContent =
    `${preview.version.label} (${preview.version.id}) · Áp dụng từ ${preview.version.date}`;
  $("school-preview-summary").textContent =
    `${preview.rowCount} dòng, ${preview.classCount} lớp, ${preview.dayCount} ngày.`;
  const sample = $("school-preview-sample");
  sample.replaceChildren();
  for (const lesson of preview.sample) {
    const row = document.createElement("tr");
    for (const value of [
      lesson.thu, lesson.buoi, lesson.tiet, lesson.lop, lesson.ho_va_ten, lesson.mon_hoc, lesson.giao_vien,
    ]) {
      const cell = document.createElement("td");
      cell.textContent = value || "—";
      row.append(cell);
    }
    sample.append(row);
  }
  previewSection.hidden = false;
  confirmImportButton.disabled = false;
}

loadPreviewButton.addEventListener("click", async () => {
  previewSection.hidden = true;
  currentPreview = null;
  confirmImportButton.disabled = true;
  loadPreviewButton.disabled = true;
  versionSelect.disabled = true;
  setStatus("Đang tải và kiểm tra dữ liệu…");
  try {
    const preview = await fetchJSON(
      `/api/import/preview?baseUrl=${encodeURIComponent(schoolDataUrl.value)}&version=${encodeURIComponent(versionSelect.value)}`
    );
    renderPreview(preview);
    setStatus("");
  } catch (error) {
    setStatus(error.message, true);
  } finally {
    loadPreviewButton.disabled = false;
    versionSelect.disabled = false;
  }
});

confirmImportButton.addEventListener("click", async () => {
  if (!currentPreview) return;
  const confirmed = window.confirm(
    `Thay thế toàn bộ dữ liệu hiện tại bằng ${currentPreview.version.label} (${currentPreview.version.id})?`
  );
  if (!confirmed) return;

  confirmImportButton.disabled = true;
  loadPreviewButton.disabled = true;
  versionSelect.disabled = true;
  setStatus("Đang thay thế dữ liệu…");
  try {
    const result = await fetchJSON("/api/import/json", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ baseUrl: schoolDataUrl.value, version: currentPreview.version.id }),
    });
    setStatus(result.message);
    currentPreview = null;
  } catch (error) {
    setStatus(error.message, true);
    confirmImportButton.disabled = false;
  } finally {
    loadPreviewButton.disabled = false;
    versionSelect.disabled = false;
  }
});

async function loadVersions() {
  if (!schoolDataUrl.value.trim()) {
    versionSelect.replaceChildren(new Option("Nhập URL để tải phiên bản", ""));
    versionSelect.disabled = true;
    loadPreviewButton.disabled = true;
    setStatus("Nhập URL dữ liệu của trường.");
    return;
  }
  versionSelect.disabled = true;
  loadPreviewButton.disabled = true;
  setStatus("Đang tải danh sách phiên bản…");
  try {
    const { versions } = await fetchJSON(
      `/api/import/versions?baseUrl=${encodeURIComponent(schoolDataUrl.value)}`
    );
    versionSelect.replaceChildren();
    for (const version of versions) {
      const option = document.createElement("option");
      option.value = version.id;
      option.textContent = `${version.label} (${version.id}) · ${version.date}`;
      option.selected = version.default;
      versionSelect.append(option);
    }
    if (!versions.some((version) => version.default)) versionSelect.selectedIndex = 0;
    versionSelect.disabled = false;
    loadPreviewButton.disabled = false;
    setStatus("");
  } catch (error) {
    versionSelect.replaceChildren(new Option("Không tải được phiên bản", ""));
    setStatus(error.message, true);
  }
}

schoolDataUrl.addEventListener("change", loadVersions);

setStatus("Nhập URL dữ liệu của trường.");
