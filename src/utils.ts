/**
 * Calculations for operational business hours (9:00 AM to 7:00 PM)
 * 9:00 AM = 9 * 60 = 540 minutes
 * 7:00 PM = 19 * 60 = 1140 minutes
 */
export function calculateOperationalMinutes(startDateStr: string, endDateStr: string): number {
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
    return 0;
  }
  return Math.floor((end.getTime() - start.getTime()) / 60000);
}

/**
 * Generates an alphanumeric token matching the required format 91P-XXXX
 * where XXXX are 4 randomized uppercase alphanumeric characters.
 */
export function generateToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let rand = '';
  for (let i = 0; i < 4; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `91P-${rand}`;
}

/**
 * Securely generated client-side unique identifiers (UUID-like strings).
 */
export function generateUUID(): string {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }
  // Safe simple fallback UUID generator
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Formats ISO date-time into a readable local clock string with timezone.
 */
export function formatReadableDateTime(isoString: string): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return isoString;
  
  // Format beautifully: YYYY-MM-DD hh:mm AM/PM
  const pad = (n: number) => String(n).padStart(2, '0');
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  
  let hours = date.getHours();
  const minutes = pad(date.getMinutes());
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  const strTime = `${pad(hours)}:${minutes} ${ampm}`;
  
  return `${yyyy}-${mm}-${dd} ${strTime}`;
}
