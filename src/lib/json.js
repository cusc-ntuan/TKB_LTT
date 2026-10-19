function schoolDateToISO(value) {
  if (typeof value !== "string") throw new Error("Phiên bản không có ngày áp dụng hợp lệ.");
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) throw new Error("Phiên bản không có ngày áp dụng hợp lệ.");
  const [, day, month, year] = match;
  const iso = `${year}-${month}-${day}`;
  const date = new Date(`${iso}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== iso) {
    throw new Error("Ngày áp dụng trong phiên bản không hợp lệ.");
  }
  return iso;
}

export { schoolDateToISO };
