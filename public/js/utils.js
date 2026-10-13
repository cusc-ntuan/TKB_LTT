function resolveDefaultDay(date = new Date(), allowedDays = []) {
  const candidate = new Date(date);
  if (candidate.getHours() >= 18) candidate.setDate(candidate.getDate() + 1);

  const day = candidate.getDay();
  const sundayOptions = ["Chủ nhật", "CN"];
  const names = [
    "Chủ nhật",
    "Thứ 2",
    "Thứ 3",
    "Thứ 4",
    "Thứ 5",
    "Thứ 6",
    "Thứ 7",
  ];

  const preferred = day === 0 ? sundayOptions.find((value) => allowedDays.includes(value)) || "CN" : names[day] || "Thứ 2";

  if (!allowedDays.length) return preferred;
  if (allowedDays.includes(preferred)) return preferred;

  const fallback = allowedDays.find((value) => value.toLowerCase() === preferred.toLowerCase()) || allowedDays[0];
  return fallback;
}

export { resolveDefaultDay };
export default resolveDefaultDay;
