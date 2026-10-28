import { showToast } from '../utils.js';

/* ─── BMI CALCULATOR ─────────────────────────────────────────── */
let bmiHeightUnit = 'cm';
let bmiWeightUnit = 'kg';

function setBmiHeightUnit(unit) {
    bmiHeightUnit = unit;
    document.getElementById('unitCm').classList.toggle('active', unit === 'cm');
    document.getElementById('unitFtIn').classList.toggle('active', unit === 'ftin');
    document.getElementById('unitCmAlt').classList.toggle('active', unit === 'cm');
    document.getElementById('unitFtInAlt').classList.toggle('active', unit === 'ftin');
    document.getElementById('bmiHeightCmWrap').style.display = unit === 'cm' ? 'block' : 'none';
    document.getElementById('bmiHeightFtInWrap').style.display = unit === 'ftin' ? 'block' : 'none';
    document.getElementById('bmiHeight').value = '';
    document.getElementById('bmiHeightFt').value = '';
    document.getElementById('bmiHeightIn').value = '';
    calcBMI();
}
function setBmiWeightUnit(unit) {
    bmiWeightUnit = unit;
    document.getElementById('unitKg').classList.toggle('active', unit === 'kg');
    document.getElementById('unitLb').classList.toggle('active', unit === 'lb');
    const w = document.getElementById('bmiWeight');
    w.value = '';
    w.placeholder = unit === 'kg' ? 'e.g. 70' : 'e.g. 154';
    calcBMI();
}

function getBmiHeightCm() {
    if (bmiHeightUnit === 'cm') {
        return parseFloat(document.getElementById('bmiHeight').value);
    }
    const ft = parseFloat(document.getElementById('bmiHeightFt').value) || 0;
    const inches = parseFloat(document.getElementById('bmiHeightIn').value) || 0;
    if (ft <= 0 && inches <= 0) return NaN;
    return (ft * 12 + inches) * 2.54;
}

function calcBMI() {
    let h = getBmiHeightCm();
    let w = parseFloat(document.getElementById('bmiWeight').value);
    if (!h || !w || h <= 0 || w <= 0) {
        document.getElementById('bmiResult').style.display = 'none';
        document.getElementById('bmiPlaceholder').style.display = 'flex';
        return;
    }
    if (bmiWeightUnit === 'lb') w = w * 0.453592;
    const hM = h / 100;
    const bmi = w / (hM * hM);
    showBMIResult(bmi);
}

function showBMIResult(bmi) {
    document.getElementById('bmiPlaceholder').style.display = 'none';
    document.getElementById('bmiResult').style.display = 'flex';
    document.getElementById('bmiNumber').textContent = bmi.toFixed(1);
    if (window.FlowEnh) FlowEnh.bmiExtra(bmi);

    let cls, desc, color, needlePos;
    if (bmi < 18.5) {
        cls = 'Underweight'; desc = 'BMI below 18.5. Consider consulting a nutritionist for a balanced diet plan.'; color = '#60a5fa';
        needlePos = Math.max(0, ((bmi - 16) / 2.5) * 25);
    } else if (bmi < 25) {
        cls = 'Normal Weight'; desc = 'Great! You\'re in the healthy BMI range. Keep maintaining your lifestyle!'; color = '#34d399';
        needlePos = 25 + ((bmi - 18.5) / 6.5) * 25;
    } else if (bmi < 30) {
        cls = 'Overweight'; desc = 'Slightly above normal. Regular exercise and a balanced diet can help.'; color = '#fbbf24';
        needlePos = 50 + ((bmi - 25) / 5) * 25;
    } else {
        cls = 'Obese'; desc = 'BMI above 30. Please consult a healthcare professional for guidance.'; color = '#f87171';
        needlePos = Math.min(100, 75 + ((bmi - 30) / 10) * 25);
    }

    const badge = document.getElementById('bmiClassBadge');
    badge.textContent = cls;
    badge.style.cssText = `background:${color}22;color:${color};border-color:${color}55`;
    document.getElementById('bmiClassDesc').textContent = desc;

    // Ring arc
    const circ = 2 * Math.PI * 50;
    const pct = Math.min(bmi / 40, 1);
    const arc = document.getElementById('bmiRingArc');
    arc.style.strokeDashoffset = circ * (1 - pct);
    arc.style.stroke = color;

    // Scale needle
    document.getElementById('bmiNeedle').style.left = needlePos + '%';
}

function resetBMI() {
    document.getElementById('bmiHeight').value = '';
    document.getElementById('bmiHeightFt').value = '';
    document.getElementById('bmiHeightIn').value = '';
    document.getElementById('bmiWeight').value = '';
    document.getElementById('bmiResult').style.display = 'none';
    document.getElementById('bmiPlaceholder').style.display = 'flex';
}

/* ─── DAILY UNIT CONVERTER ───────────────────────────────────── */
// Categories tuned for everyday use. Linear categories convert via a
// base-unit factor; temperature uses dedicated to/from formulas.
const convCategories = {
    temperature: {
        label: 'Temperature', icon: '🌡️',
        units: {
            '°C': { name: 'Celsius (°C)', toBase: v => v, fromBase: v => v },
            '°F': { name: 'Fahrenheit (°F)', toBase: v => (v - 32) * 5 / 9, fromBase: v => v * 9 / 5 + 32 },
            'K': { name: 'Kelvin (K)', toBase: v => v - 273.15, fromBase: v => v + 273.15 }
        }
    },
    length: {
        label: 'Length', icon: '📏',
        base: 'm',
        units: {
            'mm': { name: 'Millimeter (mm)', f: 0.001 },
            'cm': { name: 'Centimeter (cm)', f: 0.01 },
            'm': { name: 'Meter (m)', f: 1 },
            'km': { name: 'Kilometer (km)', f: 1000 },
            'in': { name: 'Inch (in)', f: 0.0254 },
            'ft': { name: 'Foot (ft)', f: 0.3048 },
            'yd': { name: 'Yard (yd)', f: 0.9144 },
            'mi': { name: 'Mile (mi)', f: 1609.344 }
        }
    },
    weight: {
        label: 'Weight', icon: '⚖️',
        base: 'g',
        units: {
            'g': { name: 'Gram (g)', f: 1 },
            'kg': { name: 'Kilogram (kg)', f: 1000 },
            't': { name: 'Metric ton (t)', f: 1e6 },
            'oz': { name: 'Ounce (oz)', f: 28.349523125 },
            'lb': { name: 'Pound (lb)', f: 453.59237 },
            'st': { name: 'Stone (st)', f: 6350.29318 }
        }
    },
    volume: {
        label: 'Volume', icon: '🥛',
        base: 'ml',
        units: {
            'ml': { name: 'Milliliter (ml)', f: 1 },
            'l': { name: 'Liter (L)', f: 1000 },
            'fl oz': { name: 'Fluid ounce (fl oz)', f: 29.5735295625 },
            'cup': { name: 'Cup (US)', f: 236.5882365 },
            'pt': { name: 'Pint (US)', f: 473.176473 },
            'qt': { name: 'Quart (US)', f: 946.352946 },
            'gal': { name: 'Gallon (US)', f: 3785.411784 }
        }
    },
    speed: {
        label: 'Speed', icon: '🏃',
        base: 'km/h',
        units: {
            'km/h': { name: 'Kilometers per hour (km/h)', f: 1 },
            'm/s': { name: 'Meters per second (m/s)', f: 3.6 },
            'mph': { name: 'Miles per hour (mph)', f: 1.609344 },
            'kn': { name: 'Knot (kn)', f: 1.852 }
        }
    }
};

let convState = (() => {
    try {
        const v = JSON.parse(localStorage.getItem('flowdesk_converter'));
        return (v && typeof v === 'object') ? v : { cat: 'temperature', from: '°F', to: '°C', value: '1' };
    } catch (_) {
        return { cat: 'temperature', from: '°F', to: '°C', value: '1' };
    }
})();

const saveConvState = () => localStorage.setItem('flowdesk_converter', JSON.stringify(convState));

function convIsLinear(cat) { return 'base' in convCategories[cat]; }

// Convert value between units of a category
function convCalc(cat, val, from, to) {
    const u = convCategories[cat].units;
    if (!u[from] || !u[to]) return NaN;
    if (convIsLinear(cat)) return val * u[from].f / u[to].f;
    return u[to].fromBase(u[from].toBase(val));
}

function convDefaultUnits(cat) {
    const u = convCategories[cat].units;
    const keys = Object.keys(u);
    const from = keys.includes(convState.from) ? convState.from : keys[0];
    let to = keys.includes(convState.to) ? convState.to : keys[1] || keys[0];
    to = (from === to && keys[1]) ? keys[1] : to; // avoid from==to when possible
    return { from, to };
}

function renderConvCats() {
    const host = document.getElementById('convCats');
    if (!host) return;
    host.innerHTML = '';
    // 5 static categories + the live Currency category
    Object.entries(convCategories).forEach(([key, c]) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'filter-chip' + (key === convState.cat ? ' active' : '');
        btn.textContent = `${c.icon} ${c.label}`;
        btn.onclick = () => {
            convState.cat = key;
            const { from, to } = convDefaultUnits(key);
            convState.from = from; convState.to = to;
            saveConvState();
            renderConvCats();
            renderConvUnits();
            convConvert();
        };
        host.appendChild(btn);
    });
    // Currency chip (live rates)
    const curBtn = document.createElement('button');
    curBtn.type = 'button';
    curBtn.className = 'filter-chip' + (convState.cat === 'currency' ? ' active' : '');
    curBtn.textContent = '💱 Currency';
    curBtn.onclick = async () => {
        convState.cat = 'currency';
        // The saved from/to may be stale (e.g. °F left over from the
        // Temperature category) — only keep them if they're valid codes.
        const cached = readCachedRates();
        const codes = cached ? currencyCodeList(cached.rates) : null;
        if (!codes || !codes.includes(convState.from) || !codes.includes(convState.to)) {
            convState.from = 'USD'; convState.to = 'BDT';
        }
        saveConvState();
        renderConvCats();
        updateConvRateStatus('💱 Fetching live rates…');
        await convFetchRates(false);
        renderConvUnits();
        convConvert();
        updateConvRateStatus();
    };
    host.appendChild(curBtn);
}

function renderConvUnits() {
    const cat = convState.cat;
    const fromSel = document.getElementById('convFrom');
    const toSel = document.getElementById('convTo');
    if (!fromSel || !toSel) return;
    fromSel.innerHTML = ''; toSel.innerHTML = '';

    if (cat === 'currency') {
        const build = rates => {
            currencyCodeList(rates).forEach(code => {
                [fromSel, toSel].forEach(sel => {
                    const opt = document.createElement('option');
                    opt.value = code;
                    opt.textContent = curOptionLabel(code);
                    sel.appendChild(opt);
                });
            });
            fromSel.value = convState.from || 'USD';
            toSel.value = convState.to || 'BDT';
        };
        if (convRates) build(convRates.rates);
        else {
            // placeholder until rates arrive
            ['USD', 'BDT', 'EUR', 'GBP', 'INR', 'PKR'].forEach(code => {
                [fromSel, toSel].forEach(sel => {
                    const opt = document.createElement('option');
                    opt.value = code;
                    opt.textContent = CUR_NAMES[code] ? `${code} · ${CUR_NAMES[code]}` : code;
                    sel.appendChild(opt);
                });
            });
            fromSel.value = convState.from || 'USD';
            toSel.value = convState.to || 'BDT';
        }
        return;
    }

    const c = convCategories[cat];
    Object.entries(c.units).forEach(([key, u]) => {
        [fromSel, toSel].forEach(sel => {
            const opt = document.createElement('option');
            opt.value = key;
            opt.textContent = u.name;
            sel.appendChild(opt);
        });
    });
    fromSel.value = convState.from;
    toSel.value = convState.to;
}

function fmtConvNumber(n) {
    if (!isFinite(n)) return '--';
    const abs = Math.abs(n);
    if (abs !== 0 && (abs >= 1e6 || abs < 1e-6)) return n.toExponential(3);
    return n.toLocaleString('en-US', { maximumFractionDigits: 4 });
}

function convConvert() {
    const valInput = document.getElementById('convVal');
    const outInput = document.getElementById('convOut');
    if (!valInput || !outInput) return;
    const sameCat = convState.cat;
    convState.from = document.getElementById('convFrom').value;
    convState.to = document.getElementById('convTo').value;
    convState.value = valInput.value;
    saveConvState();

    const val = parseFloat(convState.value);
    if (isNaN(val)) { outInput.value = ''; document.getElementById('convQuick').innerHTML = ''; return; }

    if (sameCat === 'currency') {
        if (!convRates) { outInput.value = ''; document.getElementById('convQuick').innerHTML = ''; return; }
        outInput.value = fmtConvNumber(convCalcCurrency(val, convState.from, convState.to));
        renderConvQuick(val);
        return;
    }

    outInput.value = fmtConvNumber(convCalc(sameCat, val, convState.from, convState.to));
    renderConvQuick(val);
}

// Quick cards: the entered value in every other unit of the category
function renderConvQuick(val) {
    const host = document.getElementById('convQuick');
    if (!host) return;
    host.innerHTML = '';

    if (convState.cat === 'currency') {
        if (!convRates) return;
        POPULAR_CURRENCIES.forEach(code => {
            if (code === convState.from) return;
            const out = convCalcCurrency(val, convState.from, code);
            if (!isFinite(out)) return;
            const card = document.createElement('div');
            card.className = 'weather-card conv-card';
            const icon = document.createElement('div');
            icon.className = 'wc-icon';
            icon.textContent = '💱';
            const value = document.createElement('span');
            value.className = 'wc-value';
            value.textContent = `${fmtConvNumber(out)} ${code}`;
            const label = document.createElement('span');
            label.className = 'wc-label';
            label.textContent = CUR_NAMES[code] || code;
            value.title = `${label.textContent}: ${fmtConvNumber(out)} ${code}`;
            card.append(icon, value, label);
            host.appendChild(card);
        });
        return;
    }

    const cat = convCategories[convState.cat];
    Object.entries(cat.units).forEach(([key, u]) => {
        if (key === convState.from) return;
        const out = convCalc(convState.cat, val, convState.from, key);
        if (!isFinite(out)) return;
        const card = document.createElement('div');
        card.className = 'weather-card conv-card';
        const icon = document.createElement('div');
        icon.className = 'wc-icon';
        icon.textContent = cat.icon;
        const value = document.createElement('span');
        value.className = 'wc-value';
        value.textContent = `${fmtConvNumber(out)} ${key}`;
        const label = document.createElement('span');
        label.className = 'wc-label';
        label.textContent = u.name;
        value.title = `${label.textContent}: ${fmtConvNumber(out)} ${key}`;
        card.append(icon, value, label);
        host.appendChild(card);
    });
}

function convSwap() {
    [convState.from, convState.to] = [convState.to, convState.from];
    saveConvState();
    renderConvUnits();
    convConvert();
}

/* ─── LIVE CURRENCY (6th converter category, runtime-backed) ─── */
// Primary API: open.er-api.com (free, no key, ~160 currencies).
// Fallback: Frankfurter/ECB. Rates cached in localStorage for 1 h so
// the converter also works offline with slightly stale rates.
const CONV_CURRENCY_KEY = 'flowdesk_currency_rates';
const CUR_TTL = 60 * 60 * 1000;
const POPULAR_CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'INR', 'PKR', 'BDT', 'SAR', 'AED', 'CNY'];
const CUR_NAMES = {
    USD: 'US Dollar', EUR: 'Euro', GBP: 'British Pound', JPY: 'Japanese Yen',
    AUD: 'Australian Dollar', CAD: 'Canadian Dollar', CHF: 'Swiss Franc',
    INR: 'Indian Rupee', PKR: 'Pakistani Rupee', BDT: 'Bangladeshi Taka',
    SAR: 'Saudi Riyal', AED: 'UAE Dirham', CNY: 'Chinese Yuan', RUB: 'Russian Ruble',
    MYR: 'Malaysian Ringgit', SGD: 'Singapore Dollar', TRY: 'Turkish Lira',
    NZD: 'New Zealand Dollar', LKR: 'Sri Lankan Rupee', NPR: 'Nepalese Rupee',
    KRW: 'South Korean Won', THB: 'Thai Baht', IDR: 'Indonesian Rupiah',
    PHP: 'Philippine Peso', VND: 'Vietnamese Dong', SEK: 'Swedish Krona',
    NOK: 'Norwegian Krone', DKK: 'Danish Krone', PLN: 'Polish Zloty',
    ZAR: 'South African Rand', BRL: 'Brazilian Real', MXN: 'Mexican Peso',
    EGP: 'Egyptian Pound', NGN: 'Nigerian Naira', QAR: 'Qatari Riyal',
    KWD: 'Kuwaiti Dinar', OMR: 'Omani Rial', BHD: 'Bahraini Dinar'
};

let convRates = null;        // { base:'USD', rates:{CODE:v}, ts }
let convRatesLoading = false;

function readCachedRates() {
    try {
        const v = JSON.parse(localStorage.getItem(CONV_CURRENCY_KEY));
        if (v && v.rates && v.rates.USD) return v;
    } catch (_) { }
    return null;
}

async function convFetchRates(force) {
    if (convRatesLoading) return convRates;
    const cached = readCachedRates();
    if (!force && cached && Date.now() - cached.ts < CUR_TTL) { convRates = cached; return convRates; }
    convRatesLoading = true;
    try {
        const res = await fetch('https://open.er-api.com/v6/latest/USD');
        const data = await res.json();
        if (!data || data.result !== 'success' || !data.rates) throw new Error('bad payload');
        convRates = { base: 'USD', rates: data.rates, ts: Date.now() };
        localStorage.setItem(CONV_CURRENCY_KEY, JSON.stringify(convRates));
    } catch (_) {
        try {
            // Fallback: Frankfurter (ECB) — fewer currencies, still free/no-key
            const res2 = await fetch('https://api.frankfurter.app/latest?from=USD');
            const data2 = await res2.json();
            if (!data2 || !data2.rates) throw new Error('bad payload');
            convRates = { base: 'USD', rates: { USD: 1, ...data2.rates }, ts: Date.now(), partial: true };
            localStorage.setItem(CONV_CURRENCY_KEY, JSON.stringify(convRates));
        } catch (__) {
            convRates = cached; // gracefully go offline with stale rates
        }
    }
    convRatesLoading = false;
    return convRates;
}

async function convRefreshRates() {
    showToast('Refreshing exchange rates…', 'info');
    await convFetchRates(true);
    if (convState.cat === 'currency') { renderConvUnits(); convConvert(); }
    updateConvRateStatus();
    if (convRates) showToast('Rates updated ✓', 'success');
    else showToast('Could not load rates — check your connection', 'error');
}

function updateConvRateStatus(mode) {
    const bar = document.getElementById('convRateBar');
    const status = document.getElementById('convRateStatus');
    if (!bar) return;
    if (convState.cat !== 'currency') { bar.style.display = 'none'; return; }
    bar.style.display = 'flex';
    if (mode) { status.textContent = mode; return; }
    if (!convRates) { status.textContent = 'No rates yet — hit "Refresh rates" to load them'; return; }
    const ageMin = Math.round((Date.now() - convRates.ts) / 60000);
    const when = ageMin < 1 ? 'just now' : ageMin < 60 ? `${ageMin} min ago` : `${Math.round(ageMin / 60)}h ago`;
    const note = convRates.partial ? 'ECB subset' : 'live';
    status.textContent = `💱 USD base · ${note} · updated ${when}`;
}

function currencyCodeList(rates) {
    const codes = Object.keys(rates).filter(c => c.length === 3 && /^[A-Z]{3}$/.test(c));
    codes.sort((a, b) =>
        (POPULAR_CURRENCIES.indexOf(b) !== -1) - (POPULAR_CURRENCIES.indexOf(a) !== -1) ||
        a.localeCompare(b));
    return codes;
}

function convCalcCurrency(val, from, to) {
    if (!convRates || !convRates.rates[from] || !convRates.rates[to]) return NaN;
    return val / convRates.rates[from] * convRates.rates[to];
}

function curOptionLabel(code) {
    const name = CUR_NAMES[code];
    return name ? `${code} · ${name}` : code;
}

/* ── Module API ─────────────────────────────────────────────── */
export const BmiModule = {
    init() {
        renderConvCats();
        renderConvUnits();
        const valInput = document.getElementById('convVal');
        if (valInput) valInput.value = convState.value || '1';
        convConvert(); // populate the To-field & quick-reference cards on load
        // Warm the currency cache in the background so 💱 is instant on first use
        convFetchRates(false).then(rates => {
            if (rates && convState.cat === 'currency') { renderConvUnits(); convConvert(); }
            updateConvRateStatus();
        });
    },
    calcBMI, setBmiHeightUnit, setBmiWeightUnit, resetBMI,
    convConvert, convSwap, convRefreshRates
};
