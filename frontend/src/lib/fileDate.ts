/**
 * Work out what date a prescription or report is *about*, so an upload lands
 * in the right place on the timeline without the mother having to type it.
 *
 * Three sources, most trustworthy first:
 *   1. the file name — labs and clinics stamp the date into it
 *   2. embedded metadata — EXIF capture time on a photo, CreationDate in a PDF
 *   3. the file's own last-modified time, as a last resort
 *
 * None of these read the date *printed on the paper* — that needs OCR. Every
 * result is therefore a suggestion the mother can correct, and we say where
 * it came from so she can judge it.
 */

export type DateSource = 'filename' | 'photo' | 'pdf' | 'modified' | 'today';

export interface DetectedDate {
  /** YYYY-MM-DD */
  date: string;
  source: DateSource;
  /** shown next to the date field */
  label: string;
}

const SOURCE_LABEL: Record<DateSource, string> = {
  filename: 'from the file name',
  photo: 'from when the photo was taken',
  pdf: 'from the PDF',
  modified: 'from the file date',
  today: "today's date",
};

const pad = (n: number) => String(n).padStart(2, '0');
const iso = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;

export function todayISO() {
  const d = new Date();
  return iso(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

/** Rejects impossible dates, the future, and anything implausibly old. */
function plausible(y: number, m: number, d: number): string | null {
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  if (y < 2000) return null;
  const made = new Date(y, m - 1, d);
  if (made.getFullYear() !== y || made.getMonth() !== m - 1 || made.getDate() !== d) return null;
  // a document cannot be about the future
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  if (made > end) return null;
  return iso(y, m, d);
}

const MONTH_NAMES = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

/**
 * Pull a date out of a file name. Handles the shapes that actually turn up:
 * `report_2026-03-15`, `IMG_20260315_101500`, `15-03-2026`, `15 Mar 2026`.
 */
export function dateFromName(name: string): string | null {
  const base = name.replace(/\.[a-z0-9]+$/i, '');

  // YYYY-MM-DD / YYYY_MM_DD / YYYY.MM.DD
  let m = base.match(/(20\d{2})[-_.](\d{1,2})[-_.](\d{1,2})/);
  if (m) {
    const hit = plausible(+m[1], +m[2], +m[3]);
    if (hit) return hit;
  }

  // YYYYMMDD, as in IMG_20260315_101500 — anchored so it cannot eat a phone number
  m = base.match(/(?:^|[^\d])(20\d{2})(\d{2})(\d{2})(?:[^\d]|$)/);
  if (m) {
    const hit = plausible(+m[1], +m[2], +m[3]);
    if (hit) return hit;
  }

  // DD-MM-YYYY — day first, which is how clinics here write it
  m = base.match(/(\d{1,2})[-_.\/](\d{1,2})[-_.\/](20\d{2})/);
  if (m) {
    const dayFirst = plausible(+m[3], +m[2], +m[1]);
    if (dayFirst) return dayFirst;
    // fall back to month-first if day-first was impossible (e.g. 03-15-2026)
    const monthFirst = plausible(+m[3], +m[1], +m[2]);
    if (monthFirst) return monthFirst;
  }

  // 15 Mar 2026 / Mar 15 2026
  m = base.match(new RegExp(`(\\d{1,2})[\\s_-]*(${MONTH_NAMES.join('|')})[a-z]*[\\s_-]*(20\\d{2})`, 'i'));
  if (m) {
    const hit = plausible(+m[3], MONTH_NAMES.indexOf(m[2].toLowerCase()) + 1, +m[1]);
    if (hit) return hit;
  }
  m = base.match(new RegExp(`(${MONTH_NAMES.join('|')})[a-z]*[\\s_-]*(\\d{1,2})[\\s,_-]*(20\\d{2})`, 'i'));
  if (m) {
    const hit = plausible(+m[3], MONTH_NAMES.indexOf(m[1].toLowerCase()) + 1, +m[2]);
    if (hit) return hit;
  }

  return null;
}

/**
 * DateTimeOriginal out of a JPEG's EXIF block — when the photo was taken,
 * which for a phone snap of a prescription is the day she filed it.
 * Hand-rolled rather than pulling in a library for one tag.
 */
export function dateFromExif(buffer: ArrayBuffer): string | null {
  const view = new DataView(buffer);
  if (view.byteLength < 4 || view.getUint16(0) !== 0xffd8) return null; // not a JPEG

  let offset = 2;
  while (offset + 4 < view.byteLength) {
    if (view.getUint8(offset) !== 0xff) break;
    const marker = view.getUint8(offset + 1);
    const size = view.getUint16(offset + 2);
    if (size < 2) break;

    if (marker === 0xe1) {
      const start = offset + 4;
      // "Exif\0\0"
      if (start + 6 > view.byteLength || view.getUint32(start) !== 0x45786966) return null;
      const tiff = start + 6;
      if (tiff + 8 > view.byteLength) return null;

      const le = view.getUint16(tiff) === 0x4949;
      if (!le && view.getUint16(tiff) !== 0x4d4d) return null;

      const readShort = (p: number) => view.getUint16(p, le);
      const readLong = (p: number) => view.getUint32(p, le);

      /** Scan one IFD for a tag; returns its value offset, or 0. */
      const findTag = (ifd: number, tag: number): number => {
        if (ifd + 2 > view.byteLength) return 0;
        const count = readShort(ifd);
        for (let i = 0; i < count; i += 1) {
          const entry = ifd + 2 + i * 12;
          if (entry + 12 > view.byteLength) return 0;
          if (readShort(entry) === tag) return entry;
        }
        return 0;
      };

      const readAscii = (entry: number): string | null => {
        const len = readLong(entry + 4);
        const at = tiff + readLong(entry + 8);
        if (len < 10 || at + 10 > view.byteLength) return null;
        let out = '';
        for (let i = 0; i < 19 && at + i < view.byteLength; i += 1) {
          out += String.fromCharCode(view.getUint8(at + i));
        }
        return out;
      };

      const ifd0 = tiff + readLong(tiff + 4);
      // 0x8769 = pointer to the Exif sub-IFD, where DateTimeOriginal lives
      const exifPtr = findTag(ifd0, 0x8769);
      let stamp: string | null = null;

      if (exifPtr) {
        const sub = tiff + readLong(exifPtr + 8);
        const dto = findTag(sub, 0x9003) || findTag(sub, 0x9004);
        if (dto) stamp = readAscii(dto);
      }
      // 0x0132 = DateTime, present even when the sub-IFD is not
      if (!stamp) {
        const dt = findTag(ifd0, 0x0132);
        if (dt) stamp = readAscii(dt);
      }

      const m = stamp?.match(/^(\d{4}):(\d{2}):(\d{2})/);
      return m ? plausible(+m[1], +m[2], +m[3]) : null;
    }

    if (marker === 0xda) break; // start of scan — no metadata past here
    offset += 2 + size;
  }
  return null;
}

/** `/CreationDate (D:20260315...)` from a PDF's header region. */
export function dateFromPdf(buffer: ArrayBuffer): string | null {
  const head = new Uint8Array(buffer, 0, Math.min(buffer.byteLength, 64 * 1024));
  let text = '';
  for (let i = 0; i < head.length; i += 1) text += String.fromCharCode(head[i]);
  const m = text.match(/\/CreationDate\s*\(\s*D:(\d{4})(\d{2})(\d{2})/);
  return m ? plausible(+m[1], +m[2], +m[3]) : null;
}

/**
 * Best guess for the date a file is about. Always returns something, so the
 * caller can pre-fill the field and let the mother correct it.
 */
export async function detectDate(file: File): Promise<DetectedDate> {
  const make = (date: string, source: DateSource): DetectedDate =>
    ({ date, source, label: SOURCE_LABEL[source] });

  const named = dateFromName(file.name);
  if (named) return make(named, 'filename');

  try {
    // metadata sits at the front of both formats, so a slice is enough
    const head = await file.slice(0, 256 * 1024).arrayBuffer();
    if (file.type === 'application/pdf') {
      const pdf = dateFromPdf(head);
      if (pdf) return make(pdf, 'pdf');
    } else if (file.type === 'image/jpeg') {
      const exif = dateFromExif(head);
      if (exif) return make(exif, 'photo');
    }
  } catch {
    // unreadable metadata is not an error — fall through to the file date
  }

  if (file.lastModified) {
    const d = new Date(file.lastModified);
    const hit = plausible(d.getFullYear(), d.getMonth() + 1, d.getDate());
    if (hit) return make(hit, 'modified');
  }

  return make(todayISO(), 'today');
}
