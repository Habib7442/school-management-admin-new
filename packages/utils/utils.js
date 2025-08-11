export function formatDate(date) {
  return new Intl.DateTimeFormat('en-US').format(date);
}

export function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}
