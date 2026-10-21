const MS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 3600;
const BYTE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB'] as const;
const BYTES_PER_UNIT = 1024;

function pad2(value: number): string {
  return value.toString().padStart(2, '0');
}

/** Clock-style duration: "4:05", "1:02:03". */
export function formatClock(ms: number | undefined): string {
  const totalSeconds = Math.max(0, Math.floor((ms ?? 0) / MS_PER_SECOND));
  const hours = Math.floor(totalSeconds / SECONDS_PER_HOUR);
  const minutes = Math.floor((totalSeconds % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE);
  const seconds = totalSeconds % SECONDS_PER_MINUTE;
  return hours > 0
    ? `${hours}:${pad2(minutes)}:${pad2(seconds)}`
    : `${minutes}:${pad2(seconds)}`;
}

/** Human duration: "45 min", "2 h 5 min", "30 s". */
export function formatHumanDuration(ms: number | undefined): string {
  const totalSeconds = Math.max(0, Math.round((ms ?? 0) / MS_PER_SECOND));
  const hours = Math.floor(totalSeconds / SECONDS_PER_HOUR);
  const minutes = Math.floor((totalSeconds % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE);
  if (hours > 0) {
    return minutes > 0 ? `${hours} h ${minutes} min` : `${hours} h`;
  }
  if (minutes > 0) {
    return `${minutes} min`;
  }
  return `${totalSeconds} s`;
}

export function formatBytes(bytes: number | undefined): string {
  let value = Math.max(0, bytes ?? 0);
  let unit = 0;
  while (value >= BYTES_PER_UNIT && unit < BYTE_UNITS.length - 1) {
    value /= BYTES_PER_UNIT;
    unit++;
  }
  const digits = unit === 0 || value >= 100 ? 0 : 1;
  return `${value.toFixed(digits).replace('.', ',')} ${BYTE_UNITS[unit]}`;
}

export function formatPercent(ratio: number): string {
  const clamped = Math.min(1, Math.max(0, ratio));
  return `${Math.round(clamped * 100)}%`;
}

const RELATIVE_THRESHOLDS = {
  minute: 60 * MS_PER_SECOND,
  hour: 60 * 60 * MS_PER_SECOND,
  day: 24 * 60 * 60 * MS_PER_SECOND,
  week: 7 * 24 * 60 * 60 * MS_PER_SECOND,
};

/** "agora", "há 5 min", "há 3 h", "ontem", "há 4 dias" or a short date. */
export function formatRelativeDate(iso: string, nowMs: number = Date.now()): string {
  const time = Date.parse(iso);
  if (Number.isNaN(time)) {
    return '';
  }
  const diff = Math.max(0, nowMs - time);
  if (diff < RELATIVE_THRESHOLDS.minute) {
    return 'agora';
  }
  if (diff < RELATIVE_THRESHOLDS.hour) {
    return `há ${Math.floor(diff / RELATIVE_THRESHOLDS.minute)} min`;
  }
  if (diff < RELATIVE_THRESHOLDS.day) {
    return `há ${Math.floor(diff / RELATIVE_THRESHOLDS.hour)} h`;
  }
  const days = Math.floor(diff / RELATIVE_THRESHOLDS.day);
  if (days === 1) {
    return 'ontem';
  }
  if (diff < RELATIVE_THRESHOLDS.week) {
    return `há ${days} dias`;
  }
  const date = new Date(time);
  return `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}/${date.getFullYear()}`;
}

export function pluralize(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
