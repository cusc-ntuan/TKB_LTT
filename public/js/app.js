import { resolveDefaultDay } from "./utils.js";

const DATE_EFFECTIVE = "19/10/2026";

const DAY_ORDER = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật", "CN"];
const MODE_LABEL = {
  lop: "Lớp",
  giao_vien: "Giáo viên",
  ho_va_ten: "Học sinh",
};

const PALETTE = [
  "#0f6e62", "#c45c26", "#1d4ed8", "#7c3aed", "#be185d",
  "#0f766e", "#b45309", "#0369a1", "#4d7c0f", "#9f1239",
];

const FILTER_STORAGE_KEY = "tkb-filters";
const PRESENCE_STORAGE_KEY = "tkb-client-id";
const PULL_REFRESH_THRESHOLD = 72;
const sharedParams = new URLSearchParams(window.location.search);
let lessonsRequestId = 0;

const savedFilters = (() => {
  try {
    return JSON.parse(localStorage.getItem(FILTER_STORAGE_KEY) || "{}");
  } catch (_err) {
    return {};
  }
})();

const state = {
  mode: MODE_LABEL[sharedParams.get("mode")] ? sharedParams.get("mode")
    : MODE_LABEL[savedFilters.mode] ? savedFilters.mode : "lop",
  view: sharedParams.get("view") === "day" || sharedParams.get("view") === "week"
    ? sharedParams.get("view") : savedFilters.view === "day" ? "day" : "week",
  day: sharedParams.get("day") || savedFilters.day || "",
  filters: null,
  lessons: [],
};

const $ = (id) => document.getElementById(id);

const uploadEl = $("file");
const schoolImportLink = document.querySelector(".school-import-link");
const isUploadPage = window.location.pathname === "/upload";
if (uploadEl && uploadEl.closest(".upload")) {
  uploadEl.closest(".upload").hidden = !isUploadPage;
}
if (schoolImportLink) schoolImportLink.hidden = !isUploadPage;

function dayRank(value) {
  const i = DAY_ORDER.findIndex((d) => d.toLowerCase() === String(value).toLowerCase());
  return i === -1 ? 99 : i;
}

function periodRank(value) {
  const n = parseInt(String(value).replace(/[^\d]/g, ""), 10);
  return Number.isNaN(n) ? 99 : n;
}

function periodLabel(value) {
  return String(value).replace(/^tiết\s*/i, "").trim();
}

function defaultDay() {
  return resolveDefaultDay(new Date(), state.filters?.thu || []);
}

const SESSION_TIMES = {
  Sáng: {
    note: "Tập trung 06:50 - 07:00 · Ra chơi 08:35 - 09:05",
    periods: {
      1: "07:00 - 07:45",
      2: "07:50 - 08:35",
      3: "09:05 - 09:50",
      4: "09:55 - 10:40",
      5: "10:45 - 11:30",
    },
  },
  Chiều: {
    note: "Bắt đầu từ tiết 2 · Giải lao 15:15 - 15:25",
    periods: {
      2: "13:40 - 14:25",
      3: "14:30 - 15:15",
      4: "15:25 - 16:10",
      5: "16:15 - 17:00",
    },
  },
};

function periodTime(session, value) {
  return SESSION_TIMES[session]?.periods[periodRank(value)] || "";
}

function colorFor(name) {
  let h = 0;
  for (const ch of String(name)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function fillSelect(el, values, placeholder) {
  const current = el.value;
  el.innerHTML = "";
  if (placeholder) {
    const first = document.createElement("option");
    first.value = "";
    first.textContent = placeholder;
    el.append(first);
  }
  for (const value of values) {
    const opt = document.createElement("option");
    opt.value = value;
    opt.textContent = value;
    el.append(opt);
  }
  el.value = values.includes(current) ? current : "";
}

function saveFilters() {
  const entityByMode = savedFilters.entityByMode || {};
  const entityEl = $("entity");

  if (entityEl) entityByMode[state.mode] = entityEl.value;
  savedFilters.mode = state.mode;
  savedFilters.view = state.view;
  savedFilters.entityByMode = entityByMode;
  delete savedFilters.buoi;
  delete savedFilters.q;
  savedFilters.day = state.day;

  try {
    localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(savedFilters));
  } catch (_err) {}
  syncFiltersToUrl();
}

function syncFiltersToUrl() {
  const url = new URL(window.location.href);
  const modeKeys = Object.keys(MODE_LABEL);
  for (const key of [...modeKeys, "mode", "buoi", "q", "view", "day"]) {
    url.searchParams.delete(key);
  }
  url.searchParams.set("mode", state.mode);
  const entity = $("entity")?.value.trim() || savedFilters.entityByMode?.[state.mode] || "";
  if (entity) url.searchParams.set(state.mode, entity);
  url.searchParams.set("view", state.view);
  if (state.view === "day" && state.day) url.searchParams.set("day", state.day);
  window.history.replaceState(null, "", url);
}

function ensureSelectedModeAvailable() {
  if (state.filters?.ho_va_ten?.length || state.mode !== "ho_va_ten") return;
  state.mode = "lop";
  savedFilters.mode = state.mode;
  savedFilters.entityByMode = savedFilters.entityByMode || {};
  const classes = state.filters?.lop || [];
  savedFilters.entityByMode.lop = classes[0] || "";
  try {
    localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(savedFilters));
  } catch (_err) {}
}

function syncModeButtons() {
  const modeSelect = $("mode-select");
  if (modeSelect) {
    modeSelect.value = state.mode;
    return;
  }

  const modeRoot = $("modes");
  if (!modeRoot) return;
  for (const button of modeRoot.querySelectorAll("button")) {
    button.classList.toggle("active", button.dataset.mode === state.mode);
  }
}

function syncViewControls() {
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === state.view);
  });
  document.querySelectorAll("[data-day]").forEach((button) => {
    button.classList.toggle("active", state.view === "day" && button.dataset.day === state.day);
  });
}

async function fetchJSON(url, options) {
  const res = await fetch(url, options);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Lỗi máy chủ");
  return data;
}

let flashTimeout;

function showFlash(message, isError = false) {
  const el = $("flash");
  if (!el) return;
  clearTimeout(flashTimeout);
  el.style.display = !message ? "none" : "";
  el.textContent = message;
  el.classList.toggle("error", isError);
  if (message) {
    flashTimeout = setTimeout(() => {
      el.style.display = "none";
      el.textContent = "";
    }, 5000);
  }
}

function dayNameForDate(date) {
  const names = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
  const preferred = names[date.getDay()];
  if (state.filters?.thu?.includes(preferred)) return preferred;
  if (preferred === "Chủ nhật" && state.filters?.thu?.includes("CN")) return "CN";
  return preferred;
}

async function loadStats() {
  const statsEl = $("stats");
  if (!statsEl) return;
  const s = await fetchJSON("/api/stats");
  statsEl.innerHTML = [
    ["Tiết học", s.total],
    ["Lớp", s.lop],
    ["Giáo viên", s.giao_vien],
  ]
    .map(([label, n]) => `<div class="stat"><b>${escapeHtml(n)}</b><span>${escapeHtml(label)}</span></div>`)
    .join("");
}

function clientId() {
  let id = sessionStorage.getItem(PRESENCE_STORAGE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(PRESENCE_STORAGE_KEY, id);
  }
  return id;
}

async function updatePresence() {
  try {
    const result = await fetchJSON("/api/presence", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId: clientId() }),
    });
    const onlineEl = $("online-count");
    if (onlineEl) onlineEl.textContent = result.online;
  } catch (_err) {}
}

async function updateAnalytics() {
  try {
    const result = await fetchJSON("/api/analytics");
    const todayEl = $("today-viewers");
    const totalEl = $("total-viewers");
    if (!todayEl || !totalEl) return;

    const todayValue = result.todayVisitors ?? null;
    const totalValue = result.totalVisitors ?? null;

    todayEl.textContent = todayValue === null || todayValue === undefined ? "—" : todayValue;
    totalEl.textContent = totalValue === null || totalValue === undefined ? "—" : totalValue;

    const title = totalValue === null ? "Bật Web Analytics trên Vercel để hiển thị số người từng xem." : "Lượt truy cập hôm nay và tổng số truy cập từ Vercel Analytics.";
    todayEl.title = title;
    totalEl.title = title;
  } catch (_err) {
    const todayEl = $("today-viewers");
    const totalEl = $("total-viewers");
    if (todayEl) todayEl.textContent = "—";
    if (totalEl) totalEl.textContent = "—";
  }
}

function localDateInputValue() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function updateEffectiveDate(value) {
  const date = value ? value.split("-").reverse().join("/") : "";
  const effectiveDateValueEl = $("effective-date-value");
  if (effectiveDateValueEl) {
    effectiveDateValueEl.textContent = date || DATE_EFFECTIVE;
  }

  const metaDescriptionEl = document.querySelector('meta[name="description"]');
  if (metaDescriptionEl) {
    const description = "Tra cứu thời khóa biểu (TKB) Trường THPT Chuyên Lý Tự Trọng, Cần Thơ.";
    metaDescriptionEl.setAttribute("content", date ? `${description} Áp dụng từ ${date}.` : description);
  }
}

async function loadDataStatus() {
  const status = await fetchJSON("/api/data-status");
  updateEffectiveDate(status.effectiveDate);
  const effectiveDateInput = $("import-effective-date");
  if (effectiveDateInput) effectiveDateInput.value = status.effectiveDate || localDateInputValue();
}

async function loadFilters() {
  const urlParams = new URLSearchParams(window.location.search);
  state.filters = await fetchJSON("/api/filters");
  ensureSelectedModeAvailable();
  const studentModeOption = $("mode-select")?.querySelector('option[value="ho_va_ten"]');
  const hasStudents = (state.filters.ho_va_ten || []).length > 0;
  if (studentModeOption) {
    studentModeOption.hidden = !hasStudents;
    studentModeOption.disabled = !hasStudents;
  }
  const buoiEl = $("buoi");
  if (buoiEl) {
    fillSelect(buoiEl, state.filters.buoi, "Cả ngày");
  }
  state.day = state.filters.thu.includes(urlParams.get("day"))
    ? urlParams.get("day") : state.filters.thu.includes(savedFilters.day)
      ? savedFilters.day : defaultDay();

  updateEntitySelect();
  const entityEl = $("entity");
  if (!entityEl) {
    syncModeButtons();
    syncViewControls();
    return;
  }

  const sharedEntity = urlParams.get(state.mode);
  const savedEntity = sharedEntity ?? savedFilters.entityByMode?.[state.mode] ?? "";
  if (sharedEntity !== null) {
    savedFilters.entityByMode = savedFilters.entityByMode || {};
    savedFilters.entityByMode[state.mode] = sharedEntity;
  }
  const entityValues = state.filters[state.mode] || [];
  if (entityEl.tagName === "INPUT" || entityValues.includes(savedEntity)) {
    entityEl.value = savedEntity;
  }
  const qEl = $("q");
  if (qEl) qEl.value = "";
  syncModeButtons();
  syncViewControls();
}

window.addEventListener("storage", (event) => {
  if (event.key !== FILTER_STORAGE_KEY || !event.newValue) return;
  try {
    const updatedFilters = JSON.parse(event.newValue);
    state.mode = MODE_LABEL[updatedFilters.mode] ? updatedFilters.mode : state.mode;
    Object.assign(savedFilters, updatedFilters);
    ensureSelectedModeAvailable();
  } catch (_err) {}
});

function updateEntitySelect() {
  const control = $("entity-control");
  if (!control) return;
  control.setAttribute("aria-label", MODE_LABEL[state.mode]);

  const values = state.filters?.[state.mode] || [];
  const current = savedFilters.entityByMode?.[state.mode] || $("entity")?.value || "";
  const defaultValue = values.includes(current) ? current : (values[0] || "");

  if (!savedFilters.entityByMode) savedFilters.entityByMode = {};
  if (defaultValue && !savedFilters.entityByMode[state.mode]) {
    savedFilters.entityByMode[state.mode] = defaultValue;
  }

  if (state.mode === "ho_va_ten") {
    control.innerHTML = `<input id="entity" type="search" list="student-names" placeholder="Tìm học sinh..." autocomplete="on" />
      <datalist id="student-names"></datalist>`;
    const datalist = $("student-names");
    for (const name of values) {
      const opt = document.createElement("option");
      opt.value = name;
      datalist.append(opt);
    }
    const entityEl = $("entity");
    if (entityEl) entityEl.value = defaultValue;
    return;
  }

  control.innerHTML = `<select id="entity"></select>`;
  const entityEl = $("entity");
  fillSelect(entityEl, values, `Chọn ${MODE_LABEL[state.mode].toLowerCase()}`);
  entityEl.value = defaultValue;
}

function updatePrintHeading(entity = $("entity")?.value.trim() || "") {
  const heading = $("print-heading");
  if (!heading) return;
  const parts = [MODE_LABEL[state.mode], entity];
  if (state.view === "day") parts.push(state.day);
  else parts.push("Cả tuần");
  heading.textContent = `Thời khóa biểu${entity ? ` ${parts.join(" · ")}` : ""}`;
}

async function loadLessons() {
  const requestId = ++lessonsRequestId;
  saveFilters();
  const params = new URLSearchParams();
  const entityEl = $("entity");
  const buoiEl = $("buoi");
  const qEl = $("q");

  const entity = entityEl ? entityEl.value.trim() : (savedFilters.entityByMode?.[state.mode] || "");
  const buoi = buoiEl?.value || "";
  const q = qEl?.value.trim() || "";
  updatePrintHeading(entity);

  if (!entity) {
    state.lessons = [];
    renderFilterPrompt();
    return;
  }

  if (entity) params.set(state.mode, entity);
  if (buoi) params.set("buoi", buoi);
  if (q) params.set("q", q);
  if (state.view === "day" && state.day) params.set("thu", state.day);
  const lessons = await fetchJSON(`/api/lessons?${params}`);
  if (requestId !== lessonsRequestId) return;
  state.lessons = lessons;
  renderBoard();
}

function renderFilterPrompt() {
  const board = $("board");
  const legend = $("legend");
  if (legend) legend.innerHTML = "";
  if (!board) return;
  board.innerHTML = `<p class="empty">Vui lòng chọn ${MODE_LABEL[state.mode].toLowerCase()} ở bộ lọc phía trên để xem thời khóa biểu.</p>`;
}

function uniqueSorted(values, rankFn) {
  return [...new Set(values)].sort((a, b) => {
    const ra = rankFn(a);
    const rb = rankFn(b);
    return ra === rb ? String(a).localeCompare(String(b), "vi") : ra - rb;
  });
}

function renderBoard(emptyMessage = "Không có tiết phù hợp bộ lọc. Hãy nhập Excel hoặc đổi bộ lọc.") {
  const board = $("board");
  if (!board) return;

  const lessons = state.view === "day"
    ? state.lessons.filter((lesson) => lesson.thu === state.day)
    : state.lessons;
  if (!lessons.length) {
    const legend = $("legend");
    if (legend) legend.innerHTML = "";
    board.innerHTML = `<p class="empty">${escapeHtml(emptyMessage)}</p>`;
    return;
  }

  const days = uniqueSorted(lessons.map((l) => l.thu), dayRank);
  const sessions = uniqueSorted(lessons.map((l) => l.buoi || "—"), (value) => {
    if (value === "Sáng") return 0;
    if (value === "Chiều") return 1;
    return 99;
  });

  const map = new Map();
  for (const lesson of lessons) {
    const key = `${lesson.thu}|||${lesson.buoi || "—"}|||${lesson.tiet}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(lesson);
  }

  const subjects = uniqueSorted(lessons.map((l) => l.mon_hoc), (v) => v.localeCompare(v, "vi"));
  const legend = $("legend");
  if (legend) {
    legend.innerHTML = subjects
      .map((s) => `<span class="chip" style="border-color:${colorFor(s)};color:${colorFor(s)}">${escapeHtml(s)}</span>`)
      .join("");
  }

  if (state.view === "day") {
    const dayName = state.day || days[0] || "";
    const slots = uniqueSorted(lessons.map((lesson) => lesson.tiet), periodRank);

    const body = slots
      .map((slot) => {
        const morning = map.get(`${dayName}|||Sáng|||${slot}`) || [];
        const afternoon = map.get(`${dayName}|||Chiều|||${slot}`) || [];
        const sessionInfo = morning.length ? periodTime("Sáng", slot) : periodTime("Chiều", slot);
        const period = `Tiết ${escapeHtml(periodLabel(slot))}`;
        const renderCell = (items) => {
          const seen = new Set();
          const unique = (items || []).filter((item) => {
            const k = [item.mon_hoc, item.giao_vien, item.phong_hoc, item.lop, item.loai_tiet].join("|");
            if (seen.has(k)) return false;
            seen.add(k);
            return true;
          });
          return unique.length ? unique.map(card).join("") : "<span class=\"empty-cell\">-</span>";
        };

        return `<tr><td><strong>${period}</strong>${sessionInfo ? `<small>${escapeHtml(sessionInfo)}</small>` : ""}</td><td>${renderCell(morning)}</td><td>${renderCell(afternoon)}</td></tr>`;
      })
      .join("");

    board.innerHTML = `
      <section class="session-board">
        <div class="session-title"><span></span><div><h2>${escapeHtml(dayName)}</h2><p>Thời khóa biểu theo ngày</p></div></div>
        <table class="grid day-grid"><thead><tr><th>Tiết</th><th>Sáng</th><th>Chiều</th></tr></thead><tbody>${body}</tbody></table>
      </section>
    `;
    return;
  }

  board.innerHTML = sessions
    .map((session) => {
      const slots = uniqueSorted(
        lessons.filter((lesson) => (lesson.buoi || "—") === session).map((lesson) => lesson.tiet),
        periodRank
      );
      const thead = `<tr><th>Tiết</th>${days.map((d) => `<th>${escapeHtml(d)}</th>`).join("")}</tr>`;
      const body = slots
        .map((slot) => {
          const cells = days
            .map((day) => {
              const items = map.get(`${day}|||${session}|||${slot}`) || [];
              const seen = new Set();
              const unique = items.filter((item) => {
                const k = [item.mon_hoc, item.giao_vien, item.phong_hoc, item.lop, item.loai_tiet].join("|");
                if (seen.has(k)) return false;
                seen.add(k);
                return true;
              });
              return `<td>${unique.map(card).join("")}</td>`;
            })
            .join("");
          const time = periodTime(session, slot);
          const period = `Tiết ${escapeHtml(periodLabel(slot))}`;
          return `<tr><td><strong>${period}</strong>${time ? `<small>${escapeHtml(time)}</small>` : ""}</td>${cells}</tr>`;
        })
        .join("");

      const sessionInfo = SESSION_TIMES[session];
      const title = session === "—" ? "Chưa xác định" : `Buổi ${session}`;
      return `<section class="session-board">
        <div class="session-title"><span></span><div><h2>${escapeHtml(title)}</h2>${sessionInfo?.note ? `<p>${escapeHtml(sessionInfo.note)}</p>` : ""}</div></div>
        <table class="grid"><thead>${thead}</thead><tbody>${body}</tbody></table>
      </section>`;
    })
    .join("");
}

function card(lesson) {
  const extra = {
    lop: `${lesson.giao_vien}${lesson.phong_hoc ? " · " + lesson.phong_hoc : ""}`,
    giao_vien: `${lesson.lop}${lesson.phong_hoc ? " · " + lesson.phong_hoc : ""}`,
    ho_va_ten: `${lesson.lop} · ${lesson.giao_vien}`,
  }[state.mode];

  const note = lesson.ghi_chu ? `<p>${escapeHtml(lesson.ghi_chu)}</p>` : "";
  const type = lesson.loai_tiet ? `<span class="tag">${escapeHtml(lesson.loai_tiet)}</span>` : "";
  return `<article class="lesson" style="--c:${colorFor(lesson.mon_hoc)}">
    <h3>${escapeHtml(lesson.mon_hoc || "(Trống)")}</h3>
    <p>${escapeHtml(extra)}</p>
    ${note}
    ${type}
  </article>`;
}

const modeSelect = $("mode-select");
if (modeSelect) {
  modeSelect.addEventListener("change", (e) => {
    saveFilters();
    state.mode = e.target.value;
    syncModeButtons();
    updateEntitySelect();
    loadLessons();
  });
}

const modesEl = $("modes");
if (modesEl) {
  modesEl.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    saveFilters();
    state.mode = btn.dataset.mode;
    syncModeButtons();
    updateEntitySelect();
    loadLessons();
  });
}

const viewControlsEl = $("view-controls");
if (viewControlsEl) {
  viewControlsEl.addEventListener("click", (e) => {
    const button = e.target.closest("[data-view]");
    if (!button) return;
    state.view = button.dataset.view;
    saveFilters();
    syncViewControls();
    updatePrintHeading();
    loadLessons();
  });
}

const entityControl = $("entity-control");
if (entityControl) {
  entityControl.addEventListener("change", loadLessons);
  entityControl.addEventListener("input", (e) => {
    if (e.target.id !== "entity") return;
    clearTimeout(e.target._t);
    e.target._t = setTimeout(loadLessons, 220);
  });
}

const buoiEl = $("buoi");
if (buoiEl) buoiEl.addEventListener("change", loadLessons);

const dayButtons = $("day-buttons");
if (dayButtons) {
  dayButtons.addEventListener("click", (e) => {
    const button = e.target.closest("[data-day]");
    if (!button) return;
    state.view = "day";
    state.day = button.dataset.day;
    saveFilters();
    syncViewControls();
    updatePrintHeading();
    loadLessons();
  });
}

const todayBtn = $("today");
if (todayBtn) {
  todayBtn.addEventListener("click", () => {
    state.view = "day";
    state.day = dayNameForDate(new Date());
    saveFilters();
    syncViewControls();
    updatePrintHeading();
    loadLessons();
  });
}

const searchEl = $("q");
if (searchEl) {
  searchEl.addEventListener("input", () => {
    clearTimeout(searchEl._t);
    searchEl._t = setTimeout(loadLessons, 220);
  });
}

const fileEl = $("file");
let pendingImportFile;
const importPreviewDialog = $("import-preview-dialog");
const importPreviewForm = $("import-preview-form");
const importPreviewStatus = $("import-preview-status");
const confirmImportBtn = $("confirm-import");
const effectiveDateInput = $("import-effective-date");
if (effectiveDateInput) effectiveDateInput.value = localDateInputValue();

function closeImportPreview() {
  pendingImportFile = null;
  importPreviewDialog?.close();
}

function renderImportPreview(preview) {
  const summary = $("import-preview-summary");
  const sample = $("import-preview-sample");
  if (summary) {
    const classes = preview.classes.length ? ` Lớp: ${preview.classes.join(", ")}${preview.classCount > preview.classes.length ? ", …" : ""}.` : "";
    summary.textContent = `${preview.filename}: ${preview.rowCount} dòng, ${preview.classCount} lớp, ${preview.dayCount} ngày.${classes}`;
  }
  if (sample) {
    sample.replaceChildren();
    for (const lesson of preview.sample) {
      const row = document.createElement("tr");
      for (const value of [lesson.thu, lesson.buoi, lesson.tiet, lesson.lop, lesson.mon_hoc]) {
        const cell = document.createElement("td");
        cell.textContent = value || "—";
        row.append(cell);
      }
      sample.append(row);
    }
  }
}

if (fileEl) {
  fileEl.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    const body = new FormData();
    body.append("file", file);
    try {
      showFlash("Đang phân tích file để xem trước…");
      const preview = await fetchJSON("/api/import/preview", { method: "POST", body });
      pendingImportFile = file;
      renderImportPreview(preview);
      if (importPreviewStatus) importPreviewStatus.textContent = "";
      importPreviewDialog?.showModal();
      showFlash("");
    } catch (err) {
      showFlash(err.message, true);
    }
  });
}

if (importPreviewForm && importPreviewDialog && importPreviewStatus && confirmImportBtn && effectiveDateInput) {
  $("close-import-preview")?.addEventListener("click", closeImportPreview);
  $("cancel-import-preview")?.addEventListener("click", closeImportPreview);
  importPreviewDialog.addEventListener("close", () => { pendingImportFile = null; });
  importPreviewForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!pendingImportFile) {
      importPreviewStatus.textContent = "Không còn file để nhập. Vui lòng chọn lại file.";
      return;
    }
    const body = new FormData();
    body.append("file", pendingImportFile);
    body.append("effectiveDate", effectiveDateInput.value);
    importPreviewStatus.textContent = "Đang thay thế dữ liệu…";
    confirmImportBtn.disabled = true;
    try {
      const result = await fetchJSON("/api/import", { method: "POST", body });
      updateEffectiveDate(result.effectiveDate);
      importPreviewDialog.close();
      showFlash(result.message);
      await Promise.all([loadStats(), loadFilters()]);
      await loadLessons();
    } catch (error) {
      importPreviewStatus.textContent = error.message;
      showFlash(error.message, true);
    } finally {
      confirmImportBtn.disabled = false;
    }
  });
}

const printBtn = $("print");
if (printBtn) printBtn.addEventListener("click", () => window.print());

function visibleLessons() {
  return state.view === "day"
    ? state.lessons.filter((lesson) => lesson.thu === state.day)
    : state.lessons;
}

async function copyText(value) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.append(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  if (!copied) throw new Error("Trình duyệt không cho phép sao chép. Hãy kiểm tra quyền clipboard.");
}

const shareLinkBtn = $("share-link");
if (shareLinkBtn) {
  shareLinkBtn.addEventListener("click", async () => {
    saveFilters();
    const shareData = {
      title: document.title,
      text: "Thời khóa biểu THPT Chuyên Lý Tự Trọng, Cần Thơ",
      url: window.location.href,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        showFlash("Đã chia sẻ liên kết thời khóa biểu.");
      } else {
        await copyText(shareData.url);
        showFlash("Thiết bị không hỗ trợ chia sẻ trực tiếp; đã sao chép liên kết.");
      }
    } catch (error) {
      if (error.name === "AbortError") return;
      showFlash(error.message, true);
    }
  });
}

const reloadBtn = $("reload");
if (reloadBtn) reloadBtn.addEventListener("click", () => window.location.reload());

const feedbackDialog = $("feedback-dialog");
const feedbackForm = $("feedback-form");
const feedbackStatus = $("feedback-status");
const feedbackSubmit = $("submit-feedback");
const openFeedbackBtn = $("open-feedback");
if (feedbackDialog && feedbackForm && feedbackStatus && feedbackSubmit && openFeedbackBtn) {
  openFeedbackBtn.addEventListener("click", () => feedbackDialog.showModal());
  $("close-feedback")?.addEventListener("click", () => feedbackDialog.close());
  $("cancel-feedback")?.addEventListener("click", () => feedbackDialog.close());
  feedbackForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    feedbackStatus.textContent = "Đang gửi góp ý…";
    feedbackStatus.classList.remove("error");
    feedbackSubmit.disabled = true;

    const formData = new FormData(feedbackForm);
    try {
      const result = await fetchJSON("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(formData)),
      });
      feedbackForm.reset();
      feedbackStatus.textContent = `${result.message}`;
    } catch (error) {
      feedbackStatus.textContent = error.message;
      feedbackStatus.classList.add("error");
    } finally {
      feedbackSubmit.disabled = false;
    }
  });
}

const pullRefreshEl = $("pull-refresh");
let pullStartY = 0;
let pullDistance = 0;
let isPulling = false;

function resetPullRefresh() {
  pullStartY = 0;
  pullDistance = 0;
  isPulling = false;
  if (!pullRefreshEl) return;
  pullRefreshEl.classList.remove("visible", "ready");
  pullRefreshEl.style.setProperty("--pull-distance", "0px");
}

if (pullRefreshEl) {
  document.addEventListener("touchstart", (event) => {
    if (window.scrollY > 0 || event.touches.length !== 1) return;
    pullStartY = event.touches[0].clientY;
    isPulling = true;
  }, { passive: true });

  document.addEventListener("touchmove", (event) => {
    if (!isPulling || event.touches.length !== 1) return;
    pullDistance = Math.max(0, event.touches[0].clientY - pullStartY);
    if (!pullDistance) return;
    event.preventDefault();
    const visibleDistance = Math.min(pullDistance, PULL_REFRESH_THRESHOLD + 24);
    pullRefreshEl.classList.add("visible");
    pullRefreshEl.classList.toggle("ready", pullDistance >= PULL_REFRESH_THRESHOLD);
    pullRefreshEl.style.setProperty("--pull-distance", `${visibleDistance}px`);
    pullRefreshEl.textContent = pullDistance >= PULL_REFRESH_THRESHOLD
      ? "Thả để tải lại"
      : "Kéo xuống để tải lại";
  }, { passive: false });

  document.addEventListener("touchend", () => {
    if (!isPulling) return;
    const shouldReload = pullDistance >= PULL_REFRESH_THRESHOLD;
    resetPullRefresh();
    if (shouldReload) window.location.reload();
  }, { passive: true });

  document.addEventListener("touchcancel", resetPullRefresh, { passive: true });
}

(async function init() {
  try {
    showFlash("Đang tải dữ liệu…");
    await Promise.all([
      updatePresence(),
      updateAnalytics(),
      loadStats(),
      loadFilters(),
      loadDataStatus(),
    ]);
    await loadLessons();
    showFlash("");
  } catch (err) {
    showFlash(err.message, true);
  }
})();
