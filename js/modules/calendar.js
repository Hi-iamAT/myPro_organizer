import { dayKeyStr } from '../utils.js';

/* ─── LIVE CALENDAR ─────────────────────────────────────────── */
let calendarDate = new Date();
let selectedDate = new Date();
// ─ events & notes removed from the calendar; replaced by live prayer times ─

const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

function initCalendar() {
    // Populate Month Select
    const mSelect = document.getElementById('calMonthSelect');
    if (mSelect) {
        mSelect.innerHTML = '';
        monthNames.forEach((m, idx) => {
            const opt = document.createElement('option');
            opt.value = idx;
            opt.textContent = m;
            mSelect.appendChild(opt);
        });
    }

    // Populate Year Select (current year - 20 to current year + 20)
    const ySelect = document.getElementById('calYearSelect');
    if (ySelect) {
        ySelect.innerHTML = '';
        const currentYear = new Date().getFullYear();
        for (let y = currentYear - 20; y <= currentYear + 20; y++) {
            const opt = document.createElement('option');
            opt.value = y;
            opt.textContent = y;
            ySelect.appendChild(opt);
        }
    }

    syncCalendarSelectors();
    renderCalendar();
    selectCalendarDate(new Date());
}

function syncCalendarSelectors() {
    const m = document.getElementById('calMonthSelect');
    const y = document.getElementById('calYearSelect');
    if (m) m.value = calendarDate.getMonth();
    if (y) y.value = calendarDate.getFullYear();
}

function changeCalendarMonthYear() {
    const m = parseInt(document.getElementById('calMonthSelect').value);
    const y = parseInt(document.getElementById('calYearSelect').value);
    calendarDate.setFullYear(y);
    calendarDate.setMonth(m);
    renderCalendar();
}

function prevCalendarMonth() {
    calendarDate.setMonth(calendarDate.getMonth() - 1);
    syncCalendarSelectors();
    renderCalendar();
}

function nextCalendarMonth() {
    calendarDate.setMonth(calendarDate.getMonth() + 1);
    syncCalendarSelectors();
    renderCalendar();
}

function jumpToToday() {
    calendarDate = new Date();
    syncCalendarSelectors();
    renderCalendar();
    selectCalendarDate(new Date());
}

/* Custom Bengali Date Converter (Bangla Academy Revised Calendar) */
function getBengaliDate(date) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1; // 1-12
    const day = date.getDate();
    const isLeap = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);

    let bYear = year - 593;
    let bMonth = 1;
    let bDay = 1;

    if (month === 4) { // April
        if (day >= 14) { bMonth = 1; bDay = day - 13; }
        else { bMonth = 12; bDay = day + 17; bYear--; }
    } else if (month === 5) { // May
        if (day >= 15) { bMonth = 2; bDay = day - 14; }
        else { bMonth = 1; bDay = day + 17; }
    } else if (month === 6) { // June
        if (day >= 15) { bMonth = 3; bDay = day - 14; }
        else { bMonth = 2; bDay = day + 17; }
    } else if (month === 7) { // July
        if (day >= 16) { bMonth = 4; bDay = day - 15; }
        else { bMonth = 3; bDay = day + 16; }
    } else if (month === 8) { // August
        if (day >= 16) { bMonth = 5; bDay = day - 15; }
        else { bMonth = 4; bDay = day + 16; }
    } else if (month === 9) { // September
        if (day >= 16) { bMonth = 6; bDay = day - 15; }
        else { bMonth = 5; bDay = day + 16; }
    } else if (month === 10) { // October
        if (day >= 17) { bMonth = 7; bDay = day - 16; }
        else { bMonth = 6; bDay = day + 15; }
    } else if (month === 11) { // November
        if (day >= 16) { bMonth = 8; bDay = day - 15; }
        else { bMonth = 7; bDay = day + 15; }
    } else if (month === 12) { // December
        if (day >= 16) { bMonth = 9; bDay = day - 15; }
        else { bMonth = 8; bDay = day + 15; }
    } else if (month === 1) { // January
        if (day >= 15) { bMonth = 10; bDay = day - 14; }
        else { bMonth = 9; bDay = day + 16; }
        bYear--;
    } else if (month === 2) { // February
        if (day >= 14) { bMonth = 11; bDay = day - 13; }
        else { bMonth = 10; bDay = day + 17; }
        bYear--;
    } else if (month === 3) { // March
        if (day >= 15) { bMonth = 12; bDay = day - 14; }
        else { bMonth = 11; bDay = day + (isLeap ? 16 : 15); }
        bYear--;
    }

    const banglaMonths = [
        "Boishakh", "Jyaistha", "Ashadh", "Shravan", "Bhadra", "Ashwin",
        "Kartik", "Agrahayan", "Poush", "Magh", "Falgun", "Chaitra"
    ];
    const banglaMonthsBn = [
        "বৈশাখ", "জ্যৈষ্ঠ", "আষাঢ়", "শ্রাবণ", "ভাদ্র", "আশ্বিন",
        "কার্তিক", "অগ্রহায়ণ", "পৌষ", "মাঘ", "ফাল্গুন", "চৈত্র"
    ];

    const toBnDigits = (num) => {
        const digits = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
        return num.toString().split('').map(d => digits[d] || d).join('');
    };

    return {
        day: bDay,
        month: bMonth,
        year: bYear,
        monthName: banglaMonths[bMonth - 1],
        monthNameBn: banglaMonthsBn[bMonth - 1],
        dayBn: toBnDigits(bDay),
        yearBn: toBnDigits(bYear),
        dateString: `${bDay} ${banglaMonths[bMonth - 1]} ${bYear}`,
        dateStringBn: `${toBnDigits(bDay)} ${banglaMonthsBn[bMonth - 1]} ${toBnDigits(bYear)}`
    };
}

/* Custom Arabic/Hijri Converter — pure algorithmic (Umm al-Qura approximation).
 * Used as fallback when Intl.DateTimeFormat doesn't support islamic calendar. */
function _gregorianToHijriAlgorithmic(gYear, gMonth, gDay) {
    const a = Math.floor((14 - gMonth) / 12);
    const y = gYear + 4800 - a;
    const m = gMonth + 12 * a - 3;
    const jdn = gDay + Math.floor((153 * m + 2) / 5) + 365 * y
        + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;

    const l = jdn - 1948440 + 10632;
    const n = Math.floor((l - 1) / 10631);
    const remainder = l - 10631 * n + 354;
    const j = Math.floor((10985 - remainder) / 5316)
        * Math.floor((50 * remainder) / 17719)
        + Math.floor(remainder / 5670)
        * Math.floor((43 * remainder) / 15238);
    const remaining = remainder - Math.floor((30 - j) / 15)
        * Math.floor((17719 * j) / 50)
        - Math.floor(j / 16)
        * Math.floor((15238 * j) / 43) + 29;
    const hMonth = Math.floor((24 * remaining) / 709);
    const hDay = remaining - Math.floor((709 * hMonth) / 24);
    const hYear = 30 * n + j - 30;

    return { year: hYear, month: hMonth, day: hDay };
}

const HIJRI_MONTH_NAMES_EN = [
    '', 'Muharram', 'Safar', "Rabi' I", "Rabi' II",
    'Jumada I', 'Jumada II', 'Rajab', "Sha'ban",
    'Ramadan', 'Shawwal', "Dhul Qi'dah", 'Dhul Hijjah'
];
const HIJRI_MONTH_NAMES_AR = [
    '', 'محرم', 'صفر', 'ربيع الأول', 'ربيع الآخر',
    'جمادى الأولى', 'جمادى الآخرة', 'رجب', 'شعبان',
    'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة'
];

// Convert number to Eastern Arabic numerals
function _toArabicNumerals(num) {
    const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    return String(num).replace(/\d/g, d => arabicDigits[d]);
}

// Check if Intl actually produces a valid Islamic calendar result
function _intlSupportsIslamicCalendar() {
    try {
        const testDate = new Date(2024, 0, 1); // Jan 1, 2024
        const fmt = new Intl.DateTimeFormat('en-US-u-ca-islamic-umalqura', {
            day: 'numeric', month: 'long', year: 'numeric'
        });
        const parts = fmt.formatToParts(testDate);
        const yearPart = parts.find(p => p.type === 'year');
        if (yearPart) {
            const yr = parseInt(yearPart.value);
            if (yr >= 1400 && yr <= 1500) return true;
        }
        const result = fmt.format(testDate);
        if (result.includes('BC') || result.includes('B.C')) return false;
        return false;
    } catch (e) {
        return false;
    }
}

const _useIntlHijri = _intlSupportsIslamicCalendar();

function getHijriDate(date) {
    try {
        // Adjust for Bangladesh (usually 1 day behind Umm al-Qura)
        const adjustedDate = new Date(date);
        adjustedDate.setDate(adjustedDate.getDate() - 1);

        if (_useIntlHijri) {
            const fmtAr = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', { day: 'numeric', month: 'long', year: 'numeric' });
            const fmtEn = new Intl.DateTimeFormat('en-US-u-ca-islamic-umalqura', { day: 'numeric', month: 'long', year: 'numeric' });
            const fmtDayAr = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', { day: 'numeric' });
            return {
                ar: fmtAr.format(adjustedDate),
                en: fmtEn.format(adjustedDate),
                dayAr: fmtDayAr.format(adjustedDate)
            };
        }

        // Fallback: pure algorithmic conversion
        const h = _gregorianToHijriAlgorithmic(
            adjustedDate.getFullYear(),
            adjustedDate.getMonth() + 1,
            adjustedDate.getDate()
        );

        const enStr = `${HIJRI_MONTH_NAMES_EN[h.month]} ${h.day}, ${h.year} AH`;
        const arStr = `${_toArabicNumerals(h.day)} ${HIJRI_MONTH_NAMES_AR[h.month]} ${_toArabicNumerals(h.year)} هـ`;
        const dayArStr = _toArabicNumerals(h.day);

        return { ar: arStr, en: enStr, dayAr: dayArStr };
    } catch (e) {
        return { ar: '--', en: '--', dayAr: '' };
    }
}

/* ─── BANGLADESH PUBLIC HOLIDAYS ────────────────────────────── */
// Lookup table for variable lunar holidays (Hindu/Buddhist) 2024-2030
const BD_LUNAR_HOLIDAYS = {
    // Durga Puja – Bijoya Dashami (Govt holiday)
    'durga_puja': {
        2024: '2024-10-12', 2025: '2025-10-02', 2026: '2026-10-21',
        2027: '2027-10-11', 2028: '2028-09-29', 2029: '2029-10-18', 2030: '2030-10-07'
    },
    // Janmashtami
    'janmashtami': {
        2024: '2024-08-26', 2025: '2025-08-16', 2026: '2026-09-04',
        2027: '2027-08-25', 2028: '2028-08-13', 2029: '2029-09-01', 2030: '2030-08-22'
    },
    // Buddha Purnima
    'buddha_purnima': {
        2024: '2024-05-23', 2025: '2025-05-12', 2026: '2026-05-01',
        2027: '2027-05-20', 2028: '2028-05-09', 2029: '2029-05-28', 2030: '2030-05-17'
    }
};

function getBangladeshHoliday(date) {
    const y = date.getFullYear();
    const m = date.getMonth() + 1; // 1-indexed
    const d = date.getDate();
    const mmStr = String(m).padStart(2, '0');
    const ddStr = String(d).padStart(2, '0');
    const dateStr = `${y}-${mmStr}-${ddStr}`;

    // ── 1. Fixed Solar Holidays ──────────────────────────
    const fixed = {
        '02-21': 'Shaheed Day & International Mother Language Day',
        '03-17': "Sheikh Mujibur Rahman's Birthday & Children's Day",
        '03-26': 'Independence Day',
        '04-14': 'Pahela Baishakh – Bengali New Year',
        '05-01': 'International Labour Day (May Day)',
        '08-15': 'National Mourning Day',
        '12-16': 'Victory Day',
        '12-25': 'Christmas Day'
    };
    const monthDay = `${mmStr}-${ddStr}`;
    if (fixed[monthDay]) return fixed[monthDay];

    // ── 2. Hindu/Buddhist Lunar Holidays (lookup table) ──
    for (const key of Object.keys(BD_LUNAR_HOLIDAYS)) {
        const yearMap = BD_LUNAR_HOLIDAYS[key];
        if (yearMap[y] === dateStr) {
            if (key === 'durga_puja') return 'Durga Puja – Bijoya Dashami';
            if (key === 'janmashtami') return 'Janmashtami';
            if (key === 'buddha_purnima') return 'Buddha Purnima (Vesak)';
        }
    }

    // ── 3. Hijri-based Islamic Holidays ──────────────────
    try {
        // Adjust for Bangladesh (usually 1 day behind Umm al-Qura)
        const adjustedDate = new Date(date);
        adjustedDate.setDate(adjustedDate.getDate() - 1);

        const parts = new Intl.DateTimeFormat('en-US-u-ca-islamic-umalqura', {
            day: 'numeric', month: 'numeric', year: 'numeric'
        }).formatToParts(adjustedDate);

        let hDay = 0, hMonth = 0;
        parts.forEach(p => {
            if (p.type === 'day') hDay = parseInt(p.value);
            if (p.type === 'month') hMonth = parseInt(p.value);
        });

        // Muharram 10 – Ashura
        if (hMonth === 1 && hDay === 10) return 'Ashura (10 Muharram)';
        // Rabi al-Awwal 12 – Eid-e-Milad-un-Nabi
        if (hMonth === 3 && hDay === 12) return 'Eid-e-Milad-un-Nabi (Prophet\'s Birthday)';
        // Sha'ban 15 – Shab-e-Barat
        if (hMonth === 8 && hDay === 15) return 'Shab-e-Barat';
        // Ramadan 27 – Laylat al-Qadr (Shab-e-Qadr)
        if (hMonth === 9 && hDay === 27) return 'Laylat al-Qadr (Shab-e-Qadr)';
        // Shawwal 1,2,3 – Eid-ul-Fitr
        if (hMonth === 10 && (hDay === 1 || hDay === 2 || hDay === 3)) {
            return `Eid-ul-Fitr – Day ${hDay}`;
        }
        // Dhu al-Hijja 10,11,12 – Eid-ul-Adha
        if (hMonth === 12 && (hDay === 10 || hDay === 11 || hDay === 12)) {
            return `Eid-ul-Adha – Day ${hDay - 9}`;
        }
    } catch (e) { /* Intl not supported */ }

    return null; // Not a holiday
}

/* ── Calendar Grid (CSS classes: calendar-day-cell · cell-gregorian/bengali/arabic) ── */
function renderCalendar() {
    const grid = document.getElementById('calendarDaysGrid');
    if (!grid) return;
    grid.innerHTML = '';

    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const prevTotalDays = new Date(year, month, 0).getDate();

    const today = new Date();

    const getLocalDateString = (d) => {
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    };

    // Previous month buffer days
    for (let i = firstDayIndex; i > 0; i--) {
        const day = prevTotalDays - i + 1;
        const dateObj = new Date(year, month - 1, day);
        createDayCell(dateObj, true, grid, getLocalDateString(dateObj), today);
    }

    // Current month days
    for (let day = 1; day <= totalDays; day++) {
        const dateObj = new Date(year, month, day);
        createDayCell(dateObj, false, grid, getLocalDateString(dateObj), today);
    }

    // Next month buffer days
    const gridLength = firstDayIndex + totalDays;
    const remainingDays = gridLength % 7 === 0 ? 0 : 7 - (gridLength % 7);
    for (let i = 1; i <= remainingDays; i++) {
        const dateObj = new Date(year, month + 1, i);
        createDayCell(dateObj, true, grid, getLocalDateString(dateObj), today);
    }
}

function createDayCell(dateObj, isInactive, container, dateStr, today) {
    const cell = document.createElement('div');
    cell.className = 'calendar-day-cell';
    if (isInactive) cell.classList.add('inactive');

    // Today indicator
    if (dateObj.getDate() === today.getDate() &&
        dateObj.getMonth() === today.getMonth() &&
        dateObj.getFullYear() === today.getFullYear()) {
        cell.classList.add('today');
    }

    // Selected indicator
    if (dateObj.getDate() === selectedDate.getDate() &&
        dateObj.getMonth() === selectedDate.getMonth() &&
        dateObj.getFullYear() === selectedDate.getFullYear()) {
        cell.classList.add('selected');
    }

    // Friday indicator
    if (dateObj.getDay() === 5) {
        cell.classList.add('is-friday');
    }

    // Holiday indicator
    const holidayName = getBangladeshHoliday(dateObj);
    if (holidayName) {
        cell.classList.add('is-holiday');
        cell.title = holidayName;
    }

    const bn = getBengaliDate(dateObj);
    const ar = getHijriDate(dateObj);

    // Gregorian number
    const mainDay = document.createElement('span');
    mainDay.className = 'cell-gregorian';
    mainDay.textContent = dateObj.getDate();

    // Bengali number
    const bnDay = document.createElement('span');
    bnDay.className = 'cell-bengali';
    bnDay.textContent = bn.dayBn;
    bnDay.title = bn.dateStringBn;

    // Arabic number
    const arDay = document.createElement('span');
    arDay.className = 'cell-arabic';
    arDay.textContent = ar.dayAr;
    arDay.title = ar.ar;

    cell.appendChild(mainDay);
    cell.appendChild(bnDay);
    cell.appendChild(arDay);

    if (cell.classList.contains('has-events')) {
        const dot = document.createElement('div');
        dot.className = 'event-dot';
        cell.appendChild(dot);
    }

    cell.onclick = () => {
        selectedDate = new Date(dateObj);
        if (isInactive) {
            calendarDate = new Date(dateObj);
            syncCalendarSelectors();
        }
        renderCalendar();
        selectCalendarDate(dateObj);
    };

    container.appendChild(cell);
}

function selectCalendarDate(dateObj) {
    selectedDate = dateObj;
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const greg = document.getElementById('selectedDateGregorian');
    if (greg) greg.textContent = dateObj.toLocaleDateString('en-US', options);

    const bn = getBengaliDate(dateObj);
    const bnEl = document.getElementById('selectedDateBengali');
    if (bnEl) bnEl.textContent = `${bn.dateStringBn} (${bn.dateString})`;

    const ar = getHijriDate(dateObj);
    const arEl = document.getElementById('selectedDateHijri');
    if (arEl) arEl.textContent = `${ar.ar} / ${ar.en}`;

    // Show/hide holiday banner
    const banner = document.getElementById('calendarHolidayBanner');
    const holidayName = getBangladeshHoliday(dateObj);
    const nameEl = document.getElementById('calendarHolidayName');
    if (holidayName) {
        if (nameEl) nameEl.textContent = holidayName;
        if (banner) banner.style.display = 'flex';
    } else {
        if (banner) banner.style.display = 'none';
    }

    // Show Friday label (element optional in markup)
    const fridayNote = document.getElementById('calendarFridayNote');
    if (fridayNote) fridayNote.style.display = dateObj.getDay() === 5 ? 'flex' : 'none';

    // Keep the prayer panel in sync — it now shows this date's times
    prayerOnDateChange(dateObj);
}

/* ─── LIVE PRAYER TIMES (Aladhan API — free, no key) ────────── */
const PRAYER_CACHE_KEY = 'flowdesk_prayer_cache';
const PRAYER_METHOD_KEY = 'flowdesk_prayer_method';
const PRAYER_COORDS_KEY = 'flowdesk_prayer_coords';
const PRAYER_METHODS = {
    1: 'Karachi (Hanafi)',
    2: 'ISNA',
    3: 'Muslim World League',
    4: 'Umm al-Qura',
    5: 'Egyptian',
    8: 'Gulf Region',
    9: 'Kuwait',
    10: 'Qatar',
    11: 'Singapore',
    13: 'Turkey',
    16: 'Moonsighting',
    21: 'Dubai'
};
// Hanafi Asr: school=1 makes Aladhan compute the Asr start by the
// shadow-factor ×2 rule (Hanafi) instead of the ×1 Shafi'i rule.
const PRAYER_ORDER = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
const PRAYER_META = {
    Fajr: { name: 'Fajr', icon: '🌅' },
    Sunrise: { name: 'Sunrise', icon: '🌄' },
    Dhuhr: { name: 'Dhuhr', icon: '☀️' },
    Asr: { name: 'Asr', icon: '🌤️' },
    Maghrib: { name: 'Maghrib', icon: '🌇' },
    Isha: { name: 'Isha', icon: '🌙' }
};

// ── Inline SVG icon set (stroke = currentColor, tinted via CSS) ──
const P = inner => `<svg class="prayer-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
const PRAYER_ICON = {
    Fajr: P(`<path d="M2 19h20"/><path d="M7 15.5a5 5 0 0 1 10 0"/><path d="M7.3 10.4 6 9.1"/><path d="M16.7 10.4 18 9.1"/><path d="M12 7.2V5.6"/><path d="M19 3v3"/><path d="M17.5 4.5h3"/>`),
    Sunrise: P(`<path d="M12 2v7"/><path d="m9 6 3-3 3 3"/><path d="M2 22h20"/><path d="M16 18a4 4 0 0 0-8 0"/><path d="M4.9 9.9 3.5 8.5"/><path d="M19.1 9.9 20.5 8.5"/>`),
    Dhuhr: P(`<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>`),
    Asr: P(`<circle cx="12" cy="13" r="4"/><path d="M12 3v2"/><path d="M7.2 5.9 5.9 4.6"/><path d="M16.8 5.9 18.1 4.6"/><path d="M2 21h20"/>`),
    Maghrib: P(`<path d="M12 9V2"/><path d="m16 6-4 4-4-4"/><path d="M2 22h20"/><path d="M16 18a4 4 0 0 0-8 0"/><path d="M4.9 9.9 3.5 8.5"/><path d="M19.1 9.9 20.5 8.5"/>`),
    Isha: P(`<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/><path d="M18.5 4v3"/><path d="M17 5.5h3"/>`)
};
const PROHIB_SVG = P(`<circle cx="12" cy="12" r="9"/><path d="M5.75 5.75l12.5 12.5"/>`);
const PROHIB_ACTIVE_SVG = `<svg class="prayer-svg" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="currentColor"/><path d="M5.5 18.5l13-13" stroke="#ffffff" stroke-width="2.6" stroke-linecap="round"/><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="1.6" opacity="0.55"/></svg>`;

function prayerIcon(name) { return PRAYER_ICON[name] || ''; }

const fmtTime12 = hhmm => {
    const [h, m] = hhmm.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hh = h % 12 === 0 ? 12 : h % 12;
    return `${hh}:${String(m).padStart(2, '0')} ${ampm}`;
};

let prayerMethod = localStorage.getItem(PRAYER_METHOD_KEY) || '1';
let prayerCoords = (() => {
    try {
        const v = JSON.parse(localStorage.getItem(PRAYER_COORDS_KEY));
        return (v && typeof v.lat === 'number') ? v : null;
    } catch (_) { return null; }
})();
// prayerData is ALWAYS today's dataset — it powers the dashboard's
// Next-Prayer card and the live countdown. The panel itself renders
// prayerPanelData: the date currently selected in the calendar.
let prayerData = null;   // { dateKey, method, timings: {Fajr:'HH:MM',...}, locLabel, ts, stale }
let prayerLoading = false;
let prayerPanelDate = null;   // 'YYYY-MM-DD' shown in the panel; null → today
let prayerPanelData = null;   // timings entry rendered in the panel
let prayerLoadSeq = 0;        // request token: the newest date click wins

// "05:03 (BST)" → "05:03" ; invalid → null
function prayerStripTiming(v) {
    const m = (v || '').match(/(\d{1,2}:\d{2})/);
    return m ? m[1] : null;
}

const prayerMinute = t => { const m = (t || '').match(/(\d{1,2}):(\d{2})/); return m ? (+m[1]) * 60 + (+m[2]) : null; };

// Cache schema version: v3 = the cache is a per-date MAP, so any calendar
// day the user opens is saved, not just today.
const PRAYER_CACHE_V = 3;

// All cached dates: { 'YYYY-MM-DD': entry }
function prayerCacheAll() {
    try {
        const v = JSON.parse(localStorage.getItem(PRAYER_CACHE_KEY));
        return (v && typeof v === 'object' && !Array.isArray(v)) ? v : {};
    } catch (_) { return {}; }
}
function prayerCacheGet(dk) {
    const c = prayerCacheAll()[dk];
    return (c && c.timings && c.timings.Fajr && c.v === PRAYER_CACHE_V && String(c.method) === String(prayerMethod)) ? c : null;
}
function prayerCachePut(entry) {
    const all = prayerCacheAll();
    all[entry.dateKey] = entry;
    const keys = Object.keys(all);
    if (keys.length > 60) { // keep roughly the last two months of visited days
        keys.sort((a, b) => (all[a].ts || 0) - (all[b].ts || 0));
        keys.slice(0, keys.length - 60).forEach(k => delete all[k]);
    }
    localStorage.setItem(PRAYER_CACHE_KEY, JSON.stringify(all));
}
function getCachedPrayer() { return prayerCacheGet(dayKeyStr(new Date())); } // today

function prayerGetCoords() {
    if (prayerCoords) return Promise.resolve(prayerCoords);
    return new Promise(resolve => {
        if (!('geolocation' in navigator)) return resolve({ lat: 23.8103, lon: 90.4125, label: 'Dhaka (approx.)' });
        navigator.geolocation.getCurrentPosition(
            pos => {
                prayerCoords = { lat: pos.coords.latitude, lon: pos.coords.longitude, label: 'Your location' };
                localStorage.setItem(PRAYER_COORDS_KEY, JSON.stringify(prayerCoords));
                resolve(prayerCoords);
            },
            () => resolve({ lat: 23.8103, lon: 90.4125, label: 'Dhaka (approx.)' }),
            { timeout: 8000, maximumAge: 600000 }
        );
    });
}

function prayerSetStatus(msg, retryFn) {
    const box = document.getElementById('prayerStatus');
    const msgEl = document.getElementById('prayerStatusMsg');
    const retry = document.getElementById('prayerRetryBtn');
    if (!box) return;
    box.style.display = msg ? 'flex' : 'none';
    if (msgEl) msgEl.textContent = msg || '';
    if (retry) {
        retry.style.display = msg && retryFn ? 'inline-flex' : 'none';
        if (retryFn) retry.onclick = retryFn;
    }
}

async function prayerLoad(force) {
    if (prayerLoading) return;
    const dk = dayKeyStr(new Date());
    const panelHere = !prayerPanelDate || prayerPanelDate === dk; // panel is on today?
    const cached = getCachedPrayer();
    if (!force && cached && cached.dateKey === dk && String(cached.method) === String(prayerMethod)) {
        prayerData = cached;
        if (panelHere) prayerPanelData = cached;
        renderPrayerTimes();
        return;
    }
    prayerLoading = true;
    if (!prayerData) {
        if (cached) {
            prayerData = cached;
            if (panelHere) prayerPanelData = cached;
            renderPrayerTimes();
        } // stale until fresh arrives
        prayerSetStatus('Loading prayer times…');
    } else {
        renderPrayerTimes(); // keep showing old card, silent refetch
    }
    try {
        const c = await prayerGetCoords();
        const now = new Date();
        const ddmm = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`;
        const url = `https://api.aladhan.com/v1/timings/${ddmm}?latitude=${c.lat}&longitude=${c.lon}&method=${prayerMethod}&school=1`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const json = await res.json();
        const t = json && json.data && json.data.timings;
        if (!t || !t.Fajr) throw new Error('bad payload');
        const entry = {
            v: PRAYER_CACHE_V,
            dateKey: dk,
            method: prayerMethod,
            timings: Object.fromEntries(Object.entries(t).map(([k, v]) => [k, prayerStripTiming(v)])),
            locLabel: c.label,
            ts: Date.now()
        };
        prayerCachePut(entry);
        prayerData = entry;
        if (panelHere) {
            prayerPanelData = entry; // never clobber another date's panel
            prayerSetStatus('');
        }
    } catch (e) {
        if (prayerData && prayerData.dateKey === dk) {
            prayerData.stale = true; // old-but-same-day cache survived
            if (panelHere) prayerSetStatus('Offline — showing saved timings for today');
        } else if (panelHere) {
            prayerSetStatus('Could not load prayer times. Check your connection.', () => prayerLoad(true));
        }
    }
    prayerLoading = false;
    if (panelHere) renderPrayerTimes();
    if (window.FlowEnh && FlowEnh.refreshDashboard) FlowEnh.refreshDashboard();
}

function prayerSetMethod(m) {
    prayerMethod = m;
    localStorage.setItem(PRAYER_METHOD_KEY, m);
    prayerData = null;
    prayerPanelData = null;
    localStorage.removeItem(PRAYER_CACHE_KEY); // cache is method-specific
    const today = dayKeyStr(new Date());
    if (!prayerPanelDate || prayerPanelDate === today) return prayerLoad(true);
    // The panel is on another date — reload today (dashboard) then that date
    return prayerLoad(true).then(() => prayerLoadForDate(prayerPanelDate));
}

function prayerRefresh() {
    const dk = prayerPanelDate || dayKeyStr(new Date());
    if (dk !== dayKeyStr(new Date())) return prayerLoadForDate(dk, true);
    return prayerLoad(true);
}

/* ═══ DATE-SYNCED PANEL — follows the calendar's selected date ═══ */
function prayerOnDateChange(dateObj) {
    const dk = dayKeyStr(dateObj);
    if (prayerPanelDate === dk && prayerPanelData) return; // already showing
    prayerLoadForDate(dk);
}

async function prayerLoadForDate(dk, force) {
    const seq = ++prayerLoadSeq;      // request token: newest click wins
    prayerPanelDate = dk;
    const today = dayKeyStr(new Date());
    if (dk === today) {
        // today → reuse the live dataset (single source of truth)
        if (prayerData && prayerData.dateKey === today) {
            prayerPanelData = prayerData;
            renderPrayerTimes();
        } else if (!prayerLoading) {
            prayerLoad(false);        // the loader sets prayerPanelData itself
        }
        return;
    }
    const cached = force ? null : prayerCacheGet(dk);
    if (cached) {
        prayerPanelData = cached;     // instant — cache hit
        renderPrayerTimes();
        return;
    }
    prayerPanelData = null;
    renderPrayerTimes();              // clear the panel while loading
    prayerSetStatus('Loading prayer times…');
    try {
        const c = await prayerGetCoords();
        const [yy, mm, dd] = dk.split('-').map(Number);
        const ddmm = `${String(dd).padStart(2, '0')}-${String(mm).padStart(2, '0')}-${yy}`;
        const url = `https://api.aladhan.com/v1/timings/${ddmm}?latitude=${c.lat}&longitude=${c.lon}&method=${prayerMethod}&school=1`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const json = await res.json();
        const t = json && json.data && json.data.timings;
        if (!t || !t.Fajr) throw new Error('bad payload');
        if (seq !== prayerLoadSeq) return; // the user moved to another date already
        const entry = {
            v: PRAYER_CACHE_V,
            dateKey: dk,
            method: prayerMethod,
            timings: Object.fromEntries(Object.entries(t).map(([k, v]) => [k, prayerStripTiming(v)])),
            locLabel: c.label,
            ts: Date.now()
        };
        prayerCachePut(entry);
        prayerPanelData = entry;
        prayerSetStatus('');
        renderPrayerTimes();
    } catch (e) {
        if (seq !== prayerLoadSeq) return;
        console.error('[FlowDesk] date timetable load failed:', e);
        prayerSetStatus('Could not load prayer times. Check your connection.',
            () => { if (prayerPanelDate === dk) prayerLoadForDate(dk, true); });
    }
}

/* State machine over the day cycle: current window + next prayer.
 * Live fields (currentName/nextName/countdown) are only computed when
 * the dataset IS today — other days can't have a "now". */
function prayerState(d) {
    const data = d || prayerData;
    if (!data || !data.timings) return null;
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
    const mins = {};
    PRAYER_ORDER.forEach(k => { mins[k] = prayerMinute(data.timings[k]); });
    const isToday = data.dateKey === dayKeyStr(now);
    let currentName = null, nextName = null, nextInMin = 0;
    if (isToday) {
        let curIdx = -1;
        for (let i = PRAYER_ORDER.length - 1; i >= 0; i--) {
            if (mins[PRAYER_ORDER[i]] !== null && nowMin >= mins[PRAYER_ORDER[i]]) { curIdx = i; break; }
        }
        // before Fajr → we are in yesterday's Isha window
        currentName = curIdx >= 0 ? PRAYER_ORDER[curIdx] : 'Isha';
        // next prayer = first prayer strictly after now; else tomorrow's Fajr
        for (let i = 0; i < PRAYER_ORDER.length; i++) {
            const m = mins[PRAYER_ORDER[i]];
            if (m !== null && m > nowMin) { nextName = PRAYER_ORDER[i]; nextInMin = m - nowMin; break; }
        }
        if (!nextName) { nextName = 'Fajr'; nextInMin = 1440 - nowMin + (mins.Fajr ?? 0); }
    }
    return { nowMin, mins, isToday, currentName, nextName, nextInMin, now };
}

function prayerRangeLabel(name, st) {
    const idx = PRAYER_ORDER.indexOf(name);
    const start = st.mins[name];
    if (start === null) return null;
    // window end = the next time in the day cycle (wraps to Fajr after Isha)
    let end, endObj;
    if (idx < PRAYER_ORDER.length - 1) {
        end = st.mins[PRAYER_ORDER[idx + 1]]; endObj = null;
    } else {
        end = st.mins.Fajr; endObj = 'tomorrow';
    }
    const fmt = m => m === null ? '--:--' : fmtTime12(`${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(Math.floor(m % 60)).padStart(2, '0')}`);
    return { start: fmt(start), end: fmt(end), endNote: endObj, startMin: start, endMin: end };
}

function fmtCountdown(mins) {
    const total = Math.max(0, Math.round(mins * 60));
    const h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60), s = total % 60;
    return (h ? `${h}h ` : '') + `${m}m ` + `${String(s).padStart(2, '0')}s`;
}

/* ── Prohibited (impure) prayer times ──
 * The three daily windows when prayer is religiously prohibited —
 * fixed lengths matching mainstream prayer tables:
 *  1. Sunrise  — sunrise +15 min ("ishraq" guard length)
 *  2. Zawal    — Dhuhr −5 min (sun crosses/leaves its zenith)
 *  3. Sunset   — Maghrib −15 min
 * All windows are clamped so times can't go negative, overlap a window
 * that comes before it, or spill past midnight. */
const PROHIB_SUNRISE_MIN = 15;   // after sunrise
const PROHIB_ZAWAL_MIN = 5;      // before Dhuhr
const PROHIB_SUNSET_MIN = 15;    // before Maghrib

function prayerProhibited(st) {
    const m = st.mins;
    const rows = [];

    if (m.Sunrise !== null) {
        rows.push({
            label: 'Sunrise',
            note: 'Forbidden until the sun fully clears the horizon',
            start: m.Sunrise,
            end: m.Sunrise + PROHIB_SUNRISE_MIN
        });
    }
    if (m.Dhuhr !== null) {
        const afterRise = (m.Sunrise !== null) ? m.Sunrise + PROHIB_SUNRISE_MIN : 0;
        rows.push({
            label: 'Zawal (solar noon)',
            note: 'Forbidden while the sun crosses its zenith',
            start: Math.max(m.Dhuhr - PROHIB_ZAWAL_MIN, afterRise), // never bleeds into the sunrise window
            end: m.Dhuhr
        });
    }
    if (m.Maghrib !== null) {
        rows.push({
            label: 'Sunset',
            note: 'Forbidden while the sun yellows at the horizon',
            start: Math.max(m.Maghrib - PROHIB_SUNSET_MIN, 0),
            end: m.Maghrib
        });
    }
    // Sanity: keep rows chronological and non-overlapping
    rows.sort((a, b) => a.start - b.start);
    rows.forEach((r, i) => {
        r.end = Math.min(r.end, 1440);
        if (i > 0) r.start = Math.max(r.start, rows[i - 1].end);
        r.isLive = false; // filled in during render
    });
    return rows.filter(r => r.end > r.start);
}

function renderPrayerTimes() {
    const methodSel = document.getElementById('prayerMethodSelect');
    if (methodSel) {
        methodSel.innerHTML = '';
        Object.entries(PRAYER_METHODS).forEach(([num, label]) => {
            const o = document.createElement('option');
            o.value = num; o.textContent = label;
            methodSel.appendChild(o);
        });
        methodSel.value = String(prayerMethod);
    }

    // The panel shows the date selected in the calendar (prayerPanelData);
    // null = a date is still loading → don't fall back to today's data
    const data = prayerPanelData;
    const st = data ? prayerState(data) : null;
    const hero = document.getElementById('prayerHero');
    const sched = document.getElementById('prayerSchedule');
    const proh = document.getElementById('prayerProh');
    const updated = document.getElementById('prayerUpdated');
    if (!st) {
        if (hero) { hero.style.display = 'none'; hero.classList.remove('active'); }
        if (sched) sched.innerHTML = '';
        if (proh) proh.innerHTML = '';
        if (updated) updated.textContent = '';
        return;
    }

    // ── hero (live countdown — only while the panel shows today) ──
    if (hero) {
        hero.style.display = st.isToday ? '' : 'none';
        if (st.isToday) {
            const meta = PRAYER_META[st.nextName];
            const nameEl = document.getElementById('prayerHeroName');
            const iconEl = document.getElementById('prayerHeroIcon');
            if (nameEl) nameEl.textContent = meta.name;
            if (iconEl) iconEl.innerHTML = prayerIcon(st.nextName);
            hero.classList.add('active');
        }
    }

    const fm = m => fmtTime12(`${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(Math.floor(m % 60)).padStart(2, '0')}`);

    // ── full-day schedule rows (single display) ──
    if (sched) {
        sched.innerHTML = '';
        PRAYER_ORDER.forEach(name => {
            const range = prayerRangeLabel(name, st);
            if (!range) return;
            const rowEl = document.createElement('div');
            rowEl.className = 'prayer-sch-row' + (st.isToday && name === st.currentName ? ' ongoing' : '') + (st.isToday && name === st.nextName ? ' next' : '');
            const ic = document.createElement('span'); ic.className = 'prayer-sch-icon'; ic.innerHTML = prayerIcon(name);
            const lab = document.createElement('span'); lab.className = 'prayer-sch-name'; lab.textContent = PRAYER_META[name].name;
            if (st.isToday && name === st.nextName) { const chip = document.createElement('span'); chip.className = 'prayer-badge next'; chip.textContent = 'Next'; lab.appendChild(chip); }
            else if (st.isToday && name === st.currentName) { const chip = document.createElement('span'); chip.className = 'prayer-badge ongoing'; chip.textContent = 'Now'; lab.appendChild(chip); }
            const rng = document.createElement('span'); rng.className = 'prayer-sch-range'; rng.textContent = `${range.start} – ${range.end}${range.endNote ? ' ⁺' : ''}`;
            rowEl.append(ic, lab, rng);
            sched.appendChild(rowEl);
        });
    }

    // ── prohibited (impure) times — live windows from the sun path ──
    if (proh) {
        proh.innerHTML = '';
        prayerProhibited(st).forEach(p => {
            const inNow = st.isToday && st.nowMin >= p.start && st.nowMin < p.end;
            const rowEl = document.createElement('div');
            rowEl.className = 'prayer-sch-row proh' + (inNow ? ' active' : '');
            rowEl.title = p.note;
            const ic = document.createElement('span'); ic.className = 'prayer-sch-icon'; ic.innerHTML = inNow ? PROHIB_ACTIVE_SVG : PROHIB_SVG;
            const txt = document.createElement('span'); txt.className = 'prayer-sch-text';
            const lab = document.createElement('span'); lab.className = 'prayer-sch-name'; lab.textContent = p.label;
            const rng = document.createElement('span'); rng.className = 'prayer-sch-range'; rng.textContent = `${fm(p.start)} – ${fm(p.end)}`;
            const sub = document.createElement('span'); sub.className = 'prayer-sch-sub'; sub.textContent = p.note;
            if (inNow) { const chip = document.createElement('span'); chip.className = 'prayer-badge proh'; chip.textContent = 'Active'; lab.appendChild(chip); }
            txt.append(lab, rng, sub);
            rowEl.append(ic, txt);
            proh.appendChild(rowEl);
        });
    }

    if (updated) {
        const when = data.ts ? new Date(data.ts) : null;
        const whenTxt = when ? ` · loaded ${when.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}` : '';
        const dateBit = !st.isToday && data.dateKey
            ? ` · ${(() => { const [yy, mm, dd] = data.dateKey.split('-').map(Number); return new Date(yy, mm - 1, dd).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }); })()}`
            : '';
        updated.textContent = `🕌 ${data.locLabel} · ${PRAYER_METHODS[data.method].split(' (')[0]}${dateBit}${whenTxt}${data.stale && st.isToday ? ' (offline)' : ''}`;
    }
    updatePrayerLive();
}

/* 1-second ticker: keeps the countdown, "Ongoing/Next" badges and the
 * dashboard's Next-Prayer card fresh as the live clock moves. The
 * dashboard ALWAYS uses today's dataset, even while the prayer panel
 * shows another selected calendar date. */
function updatePrayerLive() {
    const st = prayerState();              // today's dataset
    if (!st) return;
    const today = dayKeyStr(new Date());
    const panelToday = !prayerPanelDate || prayerPanelDate === today;
    if (panelToday) {
        const heroCountdown = document.getElementById('prayerHeroCountdown');
        const heroAt = document.getElementById('prayerHeroAt');
        if (heroCountdown) heroCountdown.textContent = fmtCountdown(st.nextInMin);
        if (heroAt) {
            heroAt.textContent = `at ${fmtTime12(`${String(Math.floor(st.mins[st.nextName] / 60) % 24).padStart(2, '0')}:${String(Math.floor(st.mins[st.nextName] % 60)).padStart(2, '0')}`)}`;
        }
    }

    // ── auto-synchronization ──
    // (1) Midnight rollover: silently refetch today's timings when the tab
    //     stayed open past midnight (prayerLoading guards double-fires).
    if (prayerData && prayerData.dateKey && !prayerLoading) {
        if (prayerData.dateKey !== dayKeyStr(new Date())) {
            prayerData.stale = true;
            prayerLoad(false);
        }
    }

    // (2) Cheap reconciliation — only while the panel shows today: re-render
    //     the row badges whenever the prayer state OR the live "Active"
    //     prohibited window changes, so rows flip in/out of amber exactly
    //     at the window boundary.
    if (panelToday) {
        const prohNow = prayerProhibited(st).find(p => st.nowMin >= p.start && st.nowMin < p.end);
        const tickKey = `${st.currentName}|${st.nextName}|${prohNow ? prohNow.label : ''}`;
        if (window._prayerTickKey !== tickKey) {
            window._prayerTickKey = tickKey;
            renderPrayerTimes();
        }
    }
    const dash = document.getElementById('dashPrayerCountdown');
    if (dash) dash.textContent = fmtCountdown(st.nextInMin);
}

// Bridge used by the dashboard (enhance.js): next prayer snapshot
window.FlowPrayer = {
    ready: () => !!(prayerData && prayerData.timings),
    next: () => {
        const st = prayerState();
        if (!st) return null;
        const m = st.mins[st.nextName];
        return {
            name: PRAYER_META[st.nextName].name,
            icon: PRAYER_META[st.nextName].icon,
            countdown: fmtCountdown(st.nextInMin),
            at: fmtTime12(`${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(Math.floor(m % 60)).padStart(2, '0')}`)
        };
    }
};

/* ── Module API ─────────────────────────────────────────────── */
export const CalendarModule = {
    init() {
        initCalendar();
        setInterval(updatePrayerLive, 1000);
        prayerLoad(false);
    },
    prevCalendarMonth, nextCalendarMonth, jumpToToday,
    changeCalendarMonthYear,
    prayerSetMethod, prayerRefresh
};
