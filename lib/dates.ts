export function addOneMonth(date: Date) {
  const newDate = new Date(date);
  newDate.setMonth(newDate.getMonth() + 1);
  return newDate;
}

export function isSameMonth(date1: Date, date2: Date): boolean {
  return date1.getMonth() === date2.getMonth() && date1.getFullYear() === date2.getFullYear();
}

export function stringifyDate(date: Date): string {
  const Y = date.getUTCFullYear();
  const M = (date.getUTCMonth() + 1).toString().padStart(2, '0');
  const D = date.getUTCDate().toString().padStart(2, '0');
  return `${Y}-${M}-${D}`;
}
