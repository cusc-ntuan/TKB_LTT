function normalizeName(value) {
  const words = String(value ?? "").trim().split(/\s+/);
  if (words.length > 1 && words.at(-1).toLocaleLowerCase("vi") === words.at(-2).toLocaleLowerCase("vi")) {
    words.pop();
  }
  return words.join(" ");
}

function normalizeHeader(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const LESSON_FIELDS = [
  "ho_va_ten", "lop", "thu", "buoi", "tiet",
  "mon_hoc", "phong_hoc", "giao_vien", "loai_tiet", "ghi_chu",
];

function normalizeLesson(lesson) {
  return Object.fromEntries(LESSON_FIELDS.map((field) => [
    field,
    field === "ho_va_ten"
      ? normalizeName(lesson[field])
      : String(lesson[field] ?? "").trim(),
  ]));
}

function recordsFromObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Dữ liệu ${label} không đúng định dạng.`);
  }
  return value;
}

function normalizeSchoolLesson({ name = "", lop, raw, teacher, types }) {
  if (!Array.isArray(raw) || raw.length < 4) {
    throw new Error("Một dòng thời khóa biểu từ trường không đúng định dạng.");
  }
  const [day, session, period, subject, rowTeacher, options] = raw;
  if (day === null || day === undefined || session === null || session === undefined
    || period === null || period === undefined || !String(subject ?? "").trim()) {
    throw new Error("Một dòng thời khóa biểu từ trường bị thiếu ngày, buổi, tiết hoặc môn học.");
  }

  const normalizedDay = String(day).trim();
  const normalizedSession = String(session).trim().toUpperCase();
  const buoi = normalizedSession === "S" ? "Sáng"
    : normalizedSession === "C" ? "Chiều" : "";
  if (!/^[2-7]$/.test(normalizedDay) || !buoi) {
    throw new Error("Dữ liệu thời khóa biểu có thứ hoặc buổi không hợp lệ.");
  }
  const lessonOptions = options && typeof options === "object" && !Array.isArray(options)
    ? options : {};
  const typeIndex = Number.isInteger(lessonOptions.t) ? lessonOptions.t : 0;

  return normalizeLesson({
    ho_va_ten: name,
    lop,
    thu: `Thứ ${normalizedDay}`,
    buoi,
    tiet: period,
    mon_hoc: subject,
    phong_hoc: lessonOptions.r,
    giao_vien: rowTeacher ?? teacher,
    loai_tiet: types[typeIndex] || types[0],
    ghi_chu: lessonOptions.n,
  });
}

function normalizeSchoolTimetable({ classes, teachers, students }) {
  const classSchedules = recordsFromObject(classes, "theo lớp");
  const teacherSchedules = recordsFromObject(teachers, "theo giáo viên");
  const studentData = recordsFromObject(students, "theo học sinh");
  const studentSchedules = recordsFromObject(studentData.students, "danh sách học sinh");
  const types = Array.isArray(studentData.meta?.types) ? studentData.meta.types : [];
  const rows = [];
  const seen = new Set();
  const add = (row) => {
    if (!row.lop) throw new Error("Dữ liệu thời khóa biểu có dòng thiếu lớp.");
    const key = Object.values(row).join("\u0000");
    if (seen.has(key)) return;
    seen.add(key);
    rows.push(row);
  };

  for (const [lop, schedule] of Object.entries(classSchedules)) {
    if (!Array.isArray(schedule)) throw new Error(`Lịch của lớp ${lop} không đúng định dạng.`);
    for (const raw of schedule) add(normalizeSchoolLesson({ lop, raw, types }));
  }

  for (const [teacher, schedule] of Object.entries(teacherSchedules)) {
    if (!Array.isArray(schedule)) throw new Error(`Lịch của giáo viên ${teacher} không đúng định dạng.`);
    for (const raw of schedule) {
      if (!Array.isArray(raw) || raw.length < 5) {
        throw new Error(`Một dòng lịch của giáo viên ${teacher} không đúng định dạng.`);
      }
      const [day, session, period, lop, subject, ...rest] = raw;
      add(normalizeSchoolLesson({
        lop,
        raw: [day, session, period, subject, teacher, ...rest],
        types,
      }));
    }
  }

  for (const [name, student] of Object.entries(studentSchedules)) {
    if (!student || typeof student !== "object" || !Array.isArray(student.s)) {
      throw new Error(`Lịch của học sinh ${name} không đúng định dạng.`);
    }
    for (const raw of student.s) {
      add(normalizeSchoolLesson({
        name,
        lop: student.c,
        raw,
        types,
      }));
    }
  }

  if (!rows.length) {
    throw new Error("Không tìm thấy dòng thời khóa biểu hợp lệ trong dữ liệu của trường.");
  }
  return rows;
}

export {
  normalizeHeader,
  normalizeLesson,
  normalizeName,
  normalizeSchoolTimetable,
};
