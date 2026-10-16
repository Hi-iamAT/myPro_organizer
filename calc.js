/* FlowDesk scientific calculator (fx-991ES style).
 * Safe evaluation: tokens → recursive-descent parser → numbers. No eval/Function.
 * Persistent state lives in localStorage key 'flowdesk_calc' (JSON):
 *   { angle: 'DEG'|'RAD'|'GRAD', ans: number, memory: number, history: [{expr, result}] }
 */
(function () {
    'use strict';

    const STORE_KEY = 'flowdesk_calc';
    const MAX_HISTORY = 50;

    // ── Engine ───────────────────────────────────────────────
    class CalcError extends Error {
        constructor(kind) { super(kind); this.kind = kind; }
    }
    const syntax = () => new CalcError('Syntax ERROR');
    const matherr = () => new CalcError('Math ERROR');

    // Function tokens (display text includes the opening paren).
    const FUNCS = {
        'sin(': 'sin', 'cos(': 'cos', 'tan(': 'tan',
        'sin⁻¹(': 'asin', 'cos⁻¹(': 'acos', 'tan⁻¹(': 'atan',
        'sinh(': 'sinh', 'cosh(': 'cosh', 'tanh(': 'tanh',
        'sinh⁻¹(': 'asinh', 'cosh⁻¹(': 'acosh', 'tanh⁻¹(': 'atanh',
        'log(': 'log', 'ln(': 'ln', '10^(': 'pow10', 'e^(': 'exp',
        '√(': 'sqrt', '³√(': 'cbrt', 'Abs(': 'abs'
    };

    function toRad(x, mode) {
        if (mode === 'RAD') return x;
        if (mode === 'GRAD') return x * Math.PI / 200;
        return x * Math.PI / 180;
    }
    function fromRad(x, mode) {
        if (mode === 'RAD') return x;
        if (mode === 'GRAD') return x * 200 / Math.PI;
        return x * 180 / Math.PI;
    }
    // Snap tiny floating-point noise (e.g. sin(180°) = 1.2e-16 → 0).
    const snap = v => (Math.abs(v) < 1e-12 ? 0 : v);

    function applyFunc(name, x, mode) {
        switch (name) {
            case 'sin': return snap(Math.sin(toRad(x, mode)));
            case 'cos': return snap(Math.cos(toRad(x, mode)));
            case 'tan': {
                const r = toRad(x, mode);
                if (Math.abs(snap(Math.cos(r))) === 0) throw matherr();
                return snap(Math.tan(r));
            }
            case 'asin': if (x < -1 || x > 1) throw matherr(); return fromRad(Math.asin(x), mode);
            case 'acos': if (x < -1 || x > 1) throw matherr(); return fromRad(Math.acos(x), mode);
            case 'atan': return fromRad(Math.atan(x), mode);
            case 'sinh': return Math.sinh(x);
            case 'cosh': return Math.cosh(x);
            case 'tanh': return Math.tanh(x);
            case 'asinh': return Math.asinh(x);
            case 'acosh': if (x < 1) throw matherr(); return Math.acosh(x);
            case 'atanh': if (x <= -1 || x >= 1) throw matherr(); return Math.atanh(x);
            case 'log': if (x <= 0) throw matherr(); return Math.log10(x);
            case 'ln': if (x <= 0) throw matherr(); return Math.log(x);
            case 'pow10': return Math.pow(10, x);
            case 'exp': return Math.exp(x);
            case 'sqrt': if (x < 0) throw matherr(); return Math.sqrt(x);
            case 'cbrt': return Math.cbrt(x);
            case 'abs': return Math.abs(x);
        }
        throw syntax();
    }

    function factorial(n) {
        if (n < 0 || !Number.isInteger(n) || n > 170) throw matherr();
        let r = 1;
        for (let i = 2; i <= n; i++) r *= i;
        return r;
    }
    function nPr(n, r) {
        if (!Number.isInteger(n) || !Number.isInteger(r) || n < 0 || r < 0 || r > n) throw matherr();
        let v = 1;
        for (let i = 0; i < r; i++) v *= (n - i);
        return v;
    }
    function nCr(n, r) {
        if (!Number.isInteger(n) || !Number.isInteger(r) || n < 0 || r < 0 || r > n) throw matherr();
        r = Math.min(r, n - r);
        let v = 1;
        for (let i = 1; i <= r; i++) v = v * (n - r + i) / i;
        return Math.round(v);
    }
    function power(a, b) {
        if (a === 0 && b < 0) throw matherr();
        if (a < 0 && !Number.isInteger(b)) {
            // Allow odd roots of negatives, e.g. (−8)^(1/3)
            const inv = 1 / b, k = Math.round(inv);
            if (Math.abs(inv - k) < 1e-9 && k % 2 !== 0) return -Math.pow(-a, b);
            throw matherr();
        }
        return Math.pow(a, b);
    }
    function xroot(y, x) { // y-th root of x
        if (y === 0) throw matherr();
        if (x < 0) {
            if (Number.isInteger(y) && Math.abs(y) % 2 === 1) return -Math.pow(-x, 1 / y);
            throw matherr();
        }
        return Math.pow(x, 1 / y);
    }

    /** Merge display tokens into lexical tokens. Accepts the calculator's token array. */
    function lex(tokens) {
        const out = [];
        let num = '';
        const flush = () => {
            if (!num) return;
            if (num === '.' || (num.match(/\./g) || []).length > 1) throw syntax();
            out.push({ type: 'num', value: parseFloat(num) });
            num = '';
        };
        for (const t of tokens) {
            if (/^[0-9.]$/.test(t)) { num += t; continue; }
            flush();
            if (FUNCS[t]) out.push({ type: 'func', value: FUNCS[t] });
            else out.push({ type: 'op', value: t });
        }
        flush();
        return out;
    }

    /** Recursive-descent parser/evaluator. */
    function evaluate(tokens, ctx) {
        const toks = lex(tokens);
        let pos = 0;
        const peek = () => toks[pos];
        const isOp = (v) => peek() && peek().type === 'op' && peek().value === v;
        const startsPrimary = () => {
            const t = peek();
            if (!t) return false;
            if (t.type === 'num' || t.type === 'func') return true;
            return ['(', 'π', 'e', 'Ans', 'M'].includes(t.value);
        };

        function parseAdd() {
            let v = parseMul();
            while (isOp('+') || isOp('−')) {
                const op = toks[pos++].value;
                const r = parseMul();
                v = op === '+' ? v + r : v - r;
            }
            return v;
        }
        function parseMul() {
            let v = parsePerm();
            for (;;) {
                if (isOp('×') || isOp('÷')) {
                    const op = toks[pos++].value;
                    const r = parsePerm();
                    if (op === '÷') { if (r === 0) throw matherr(); v = v / r; }
                    else v = v * r;
                } else if (startsPrimary()) { // implicit multiplication: 2π, 3(4), 2sin(30)
                    v = v * parsePerm();
                } else break;
            }
            return v;
        }
        function parsePerm() {
            let v = parseUnary();
            while (isOp('P') || isOp('C')) {
                const op = toks[pos++].value;
                const r = parseUnary();
                v = op === 'P' ? nPr(v, r) : nCr(v, r);
            }
            return v;
        }
        function parseUnary() {
            if (isOp('−')) { pos++; return -parseUnary(); }
            if (isOp('+')) { pos++; return parseUnary(); }
            return parsePow();
        }
        function parsePow() {
            const base = parsePostfix();
            if (isOp('^')) { pos++; return power(base, parseUnary()); }
            if (isOp('ˣ√')) { pos++; return xroot(base, parseUnary()); }
            return base;
        }
        function parsePostfix() {
            let v = parsePrimary();
            for (;;) {
                if (isOp('²')) { pos++; v = v * v; }
                else if (isOp('³')) { pos++; v = v * v * v; }
                else if (isOp('⁻¹')) { pos++; if (v === 0) throw matherr(); v = 1 / v; }
                else if (isOp('!')) { pos++; v = factorial(v); }
                else if (isOp('%')) { pos++; v = v / 100; }
                else break;
            }
            return v;
        }
        function closeParen() {
            if (isOp(')')) { pos++; return; }
            if (pos >= toks.length) return; // auto-close at end, like the fx-991ES
            throw syntax();
        }
        function parsePrimary() {
            const t = peek();
            if (!t) throw syntax();
            if (t.type === 'num') {
                pos++;
                let v = t.value;
                if (isOp('E')) { // scientific notation: 1.5E−3
                    pos++;
                    let sign = 1;
                    if (isOp('−')) { pos++; sign = -1; } else if (isOp('+')) pos++;
                    const e = peek();
                    if (!e || e.type !== 'num') throw syntax();
                    pos++;
                    v = v * Math.pow(10, sign * e.value);
                }
                return v;
            }
            if (t.type === 'func') {
                pos++;
                const arg = parseAdd();
                closeParen();
                return applyFunc(t.value, arg, ctx.angle);
            }
            if (t.value === '(') {
                pos++;
                const v = parseAdd();
                closeParen();
                return v;
            }
            if (t.value === 'π') { pos++; return Math.PI; }
            if (t.value === 'e') { pos++; return Math.E; }
            if (t.value === 'Ans') { pos++; return ctx.ans; }
            if (t.value === 'M') { pos++; return ctx.memory; }
            throw syntax();
        }

        if (!toks.length) throw syntax();
        const v = parseAdd();
        if (pos !== toks.length) throw syntax();
        if (!Number.isFinite(v)) throw matherr();
        return v;
    }

    // ── Formatting ───────────────────────────────────────────
    function formatNumber(v) {
        if (v === 0) return '0';
        const a = Math.abs(v);
        if (a >= 1e10 || a < 1e-9) {
            const [m, e] = v.toExponential(9).split('e');
            const mant = String(parseFloat(m));
            return mant + '×10^' + (e.startsWith('+') ? e.slice(1) : e);
        }
        return String(parseFloat(v.toPrecision(10)));
    }
    /** Best rational approximation (continued fractions). Returns null if not "nice". */
    function toFraction(v) {
        if (!Number.isFinite(v) || Number.isInteger(v) || Math.abs(v) >= 1e10) return null;
        const sign = v < 0 ? -1 : 1;
        let x = Math.abs(v), h0 = 0, h1 = 1, k0 = 1, k1 = 0;
        for (let i = 0; i < 40; i++) {
            const a = Math.floor(x);
            [h0, h1] = [h1, a * h1 + h0];
            [k0, k1] = [k1, a * k1 + k0];
            if (k1 > 1e6) return null;
            if (Math.abs(h1 / k1 - Math.abs(v)) < 1e-10 * Math.max(1, Math.abs(v))) {
                return k1 === 1 ? null : { n: sign * h1, d: k1 };
            }
            const f = x - a;
            if (f < 1e-12) break;
            x = 1 / f;
        }
        return null;
    }

    // Expose engine for tests / reuse.
    window.FlowCalcEngine = { evaluate, formatNumber, toFraction, CalcError };

    // ── State ────────────────────────────────────────────────
    function loadState() {
        let s = {};
        try { s = JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch (_) { s = {}; }
        return {
            angle: ['DEG', 'RAD', 'GRAD'].includes(s.angle) ? s.angle : 'DEG',
            ans: Number.isFinite(s.ans) ? s.ans : 0,
            memory: Number.isFinite(s.memory) ? s.memory : 0,
            history: Array.isArray(s.history)
                ? s.history.filter(h => h && Array.isArray(h.tokens)).slice(0, MAX_HISTORY) : []
        };
    }
    const state = loadState();
    let tokens = [];
    let shift = false, hyp = false;
    let justEvaluated = false;  // last key was '='
    let lastResult = null;      // numeric value currently shown
    let showFraction = false;
    let errorShown = false;

    function persist() {
        try {
            localStorage.setItem(STORE_KEY, JSON.stringify({
                angle: state.angle, ans: state.ans, memory: state.memory, history: state.history
            }));
        } catch (_) { /* storage full / disabled: keep working in memory */ }
    }

    // ── DOM ──────────────────────────────────────────────────
    const $ = id => document.getElementById(id);
    const exprEl = $('calcExprText');
    const resultEl = $('calcDisplay');
    if (!exprEl || !resultEl) return;

    function renderResult() {
        if (lastResult === null) { resultEl.textContent = tokens.length ? '' : '0'; return; }
        const f = showFraction ? toFraction(lastResult) : null;
        resultEl.textContent = f ? `${f.n}/${f.d}` : formatNumber(lastResult);
    }
    function render() {
        exprEl.textContent = tokens.join('');
        const exprBox = $('calcExpression');
        exprBox.scrollLeft = exprBox.scrollWidth;
        resultEl.classList.toggle('error', errorShown);
        if (!errorShown) renderResult();
        $('calcIndShift').classList.toggle('on', shift);
        $('calcIndHyp').classList.toggle('on', hyp);
        $('calcIndMem').classList.toggle('on', state.memory !== 0);
        $('calcIndAngle').textContent = state.angle === 'DEG' ? 'D' : state.angle === 'RAD' ? 'R' : 'G';
        $('calcIndFrac').classList.toggle('on', showFraction && lastResult !== null && !!toFraction(lastResult));
        document.getElementById('sciCalc').classList.toggle('shift-on', shift);
        document.querySelectorAll('#calcKeys [data-hyp]').forEach(b => b.classList.toggle('hyp-on', hyp));
    }

    function showError(kind) {
        errorShown = true;
        lastResult = null;
        resultEl.textContent = kind;
        render();
    }

    function clearErrorIfAny() {
        if (errorShown) { errorShown = false; }
    }

    const OPERATOR_STARTS = ['+', '−', '×', '÷', '^', 'ˣ√', '²', '³', '⁻¹', '!', '%', 'P', 'C', 'E'];

    function insert(tok) {
        clearErrorIfAny();
        if (justEvaluated) {
            // Like Casio: an operator continues from Ans, anything else starts fresh.
            tokens = OPERATOR_STARTS.includes(tok) ? ['Ans'] : [];
            justEvaluated = false;
            lastResult = null;
        }
        tokens.push(tok);
        render();
    }

    function del() {
        clearErrorIfAny();
        if (justEvaluated) { justEvaluated = false; lastResult = null; }
        tokens.pop();
        render();
    }

    function allClear() {
        tokens = [];
        justEvaluated = false;
        lastResult = null;
        errorShown = false;
        showFraction = false;
        shift = false; hyp = false;
        render();
    }

    function equals() {
        if (!tokens.length) return;
        try {
            const v = evaluate(tokens, state);
            lastResult = v;
            state.ans = v;
            errorShown = false;
            justEvaluated = true;
            showFraction = false;
            state.history.unshift({ tokens: tokens.slice(), result: v });
            if (state.history.length > MAX_HISTORY) state.history.length = MAX_HISTORY;
            persist();
            render();
            renderHistory();
        } catch (e) {
            showError(e instanceof CalcError ? e.kind : 'Math ERROR');
        }
    }

    // Value used by M+/M−: evaluates current expression (or current result).
    function currentValue() {
        if (justEvaluated && lastResult !== null) return lastResult;
        if (!tokens.length) return null;
        const v = evaluate(tokens, state);
        lastResult = v;
        state.ans = v;
        justEvaluated = true;
        return v;
    }
    function memAdd(sign) {
        try {
            const v = currentValue();
            if (v === null) return;
            state.memory = snap(state.memory + sign * v);
            persist();
            render();
        } catch (e) { showError(e instanceof CalcError ? e.kind : 'Math ERROR'); }
    }

    function toggleSD() {
        if (lastResult === null || errorShown) return;
        if (!toFraction(lastResult)) { showFraction = false; render(); return; }
        showFraction = !showFraction;
        render();
    }

    function cycleAngle() {
        state.angle = state.angle === 'DEG' ? 'RAD' : state.angle === 'RAD' ? 'GRAD' : 'DEG';
        persist();
        render();
        updateAngleKey();
    }

    // ── Keypad definition ────────────────────────────────────
    // Each key: label, primary action, optional shift label/action, css class.
    const trig = (name) => () => {
        const base = name + (hyp ? 'h' : '');
        insert(base + (shift ? '⁻¹(' : '('));
    };
    const K = (label, act, extra = {}) => Object.assign({ label, act }, extra);
    const ins = t => () => insert(t);

    const KEYS = [
        // control row
        K('SHIFT', () => { shift = !shift; render(); return 'keep'; }, { cls: 'k-shift', aria: 'Shift' }),
        K('HYP', () => { hyp = !hyp; render(); return 'keep-shift'; }, { cls: 'k-ctl', aria: 'Hyperbolic' }),
        K('DEG', cycleAngle, { cls: 'k-ctl', id: 'calcAngleKey', aria: 'Angle mode' }),
        K('S⇔D', toggleSD, { cls: 'k-ctl', aria: 'Toggle fraction or decimal' }),
        K('DEL', del, { cls: 'k-del', aria: 'Delete' }),
        K('AC', allClear, { cls: 'k-ac', aria: 'All clear' }),
        // scientific rows
        K('x⁻¹', ins('⁻¹'), { sLabel: 'x!', sAct: ins('!') }),
        K('nCr', ins('C'), { sLabel: 'nPr', sAct: ins('P') }),
        K('√', ins('√('), { sLabel: '³√', sAct: ins('³√(') }),
        K('x²', ins('²'), { sLabel: 'x³', sAct: ins('³') }),
        K('xʸ', ins('^'), { sLabel: 'ʸ√x', sAct: ins('ˣ√') }),
        K('log', ins('log('), { sLabel: '10ˣ', sAct: ins('10^(') }),
        K('ln', ins('ln('), { sLabel: 'eˣ', sAct: ins('e^(') }),
        K('sin', trig('sin'), { sLabel: 'sin⁻¹', sAct: trig('sin'), hypKey: true }),
        K('cos', trig('cos'), { sLabel: 'cos⁻¹', sAct: trig('cos'), hypKey: true }),
        K('tan', trig('tan'), { sLabel: 'tan⁻¹', sAct: trig('tan'), hypKey: true }),
        K('(', ins('(')),
        K(')', ins(')')),
        K('(−)', ins('−'), { aria: 'Negative' }),
        K('%', ins('%')),
        K('Abs', ins('Abs(')),
        K('π', ins('π'), { sLabel: 'e', sAct: ins('e') }),
        K('EXP', ins('E'), { aria: 'Times ten to the power' }),
        K('Ans', ins('Ans')),
        K('MC', () => { state.memory = 0; persist(); render(); }, { cls: 'k-mem' }),
        K('MR', ins('M'), { cls: 'k-mem', aria: 'Memory recall' }),
        K('M+', () => memAdd(1), { cls: 'k-mem' }),
        K('M−', () => memAdd(-1), { cls: 'k-mem' }),
        K('x!', ins('!')),
        K('1/x', ins('⁻¹')),
    ];
    const NUM_KEYS = [
        K('7', ins('7')), K('8', ins('8')), K('9', ins('9')), K('÷', ins('÷'), { cls: 'k-op' }),
        K('4', ins('4')), K('5', ins('5')), K('6', ins('6')), K('×', ins('×'), { cls: 'k-op' }),
        K('1', ins('1')), K('2', ins('2')), K('3', ins('3')), K('−', ins('−'), { cls: 'k-op' }),
        K('0', ins('0')), K('.', ins('.')), K('=', equals, { cls: 'k-eq' }), K('+', ins('+'), { cls: 'k-op' }),
    ];

    function runKey(k) {
        const useShift = shift && k.sAct;
        const res = (useShift ? k.sAct : k.act)();
        if (res === 'keep') return;
        if (res !== 'keep-shift') {
            // SHIFT and HYP are one-shot modifiers, like the real calculator.
            shift = false;
            if (k.hypKey) hyp = false;
        }
        render();
    }

    function buildKeypad() {
        const host = $('calcKeys');
        const sci = document.createElement('div');
        sci.className = 'sci-grid';
        const num = document.createElement('div');
        num.className = 'sci-num';
        const make = (k, parent) => {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'sci-key ' + (k.cls || (parent === num ? 'k-num' : 'k-fn'));
            if (k.id) b.id = k.id;
            if (k.hypKey) b.dataset.hyp = '1';
            b.setAttribute('aria-label', k.aria || k.label);
            if (k.sLabel) {
                const s = document.createElement('span');
                s.className = 'k-shift-label';
                s.textContent = k.sLabel;
                b.appendChild(s);
            }
            const m = document.createElement('span');
            m.className = 'k-main';
            m.textContent = k.label;
            b.appendChild(m);
            b.addEventListener('click', () => runKey(k));
            parent.appendChild(b);
        };
        KEYS.forEach(k => make(k, sci));
        NUM_KEYS.forEach(k => make(k, num));
        host.appendChild(sci);
        host.appendChild(num);
        updateAngleKey();
    }
    function updateAngleKey() {
        const b = $('calcAngleKey');
        if (b) b.querySelector('.k-main').textContent = state.angle;
    }

    function renderHistory() {
        const list = $('calcHistory');
        list.textContent = '';
        if (!state.history.length) {
            const li = document.createElement('li');
            li.className = 'sci-history-empty';
            li.textContent = 'No calculations yet';
            list.appendChild(li);
            return;
        }
        state.history.forEach(h => {
            const li = document.createElement('li');
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'sci-history-item';
            b.title = 'Reuse this expression';
            const e = document.createElement('span');
            e.className = 'h-expr';
            e.textContent = h.tokens.join('');
            const r = document.createElement('span');
            r.className = 'h-res';
            r.textContent = '= ' + formatNumber(h.result);
            b.append(e, r);
            b.addEventListener('click', () => {
                tokens = h.tokens.slice();
                justEvaluated = false; lastResult = null; errorShown = false;
                render();
            });
            li.appendChild(b);
            list.appendChild(li);
        });
    }

    // ── Keyboard ─────────────────────────────────────────────
    const KEYMAP = {
        '+': '+', '-': '−', '*': '×', '/': '÷', '^': '^', '(': '(', ')': ')',
        '!': '!', '%': '%', '.': '.', ',': '.',
        p: 'π', e: 'e', a: 'Ans', m: 'M', x: 'E', C: 'C', P: 'P',
        s: 'sin(', c: 'cos(', t: 'tan(', S: 'sin⁻¹(', T: 'tan⁻¹(', O: 'cos⁻¹(',
        l: 'log(', n: 'ln(', r: '√(', R: '³√(', q: '²', i: '⁻¹', b: 'Abs('
    };
    document.addEventListener('keydown', e => {
        if (typeof currentTool !== 'undefined' && currentTool !== 'calc') return;
        const active = document.activeElement;
        if (active && active.matches('input, textarea, select, [contenteditable="true"]')) return;
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        const k = e.key;
        // Let a focused button handle its own Enter/Space activation (avoids double input).
        if ((k === 'Enter' || k === ' ') && active && active.tagName === 'BUTTON') return;
        let handled = true;
        if (/^[0-9]$/.test(k)) insert(k);
        else if (k === 'Enter' || k === '=') equals();
        else if (k === 'Backspace') del();
        else if (k === 'Escape' || k === 'Delete') allClear();
        else if (k === 'd' || k === 'D') cycleAngle();
        else if (k === 'f' || k === 'F') toggleSD();
        else if (k === 'h' || k === 'H') { hyp = !hyp; render(); }
        else if (KEYMAP[k]) {
            let t = KEYMAP[k];
            if (hyp && /^(sin|cos|tan)/.test(t)) { t = t.replace(/^(sin|cos|tan)/, '$1h'); hyp = false; }
            insert(t);
        }
        else handled = false;
        if (handled) e.preventDefault();
    });

    // ── Public API (used by the AC button in the panel header) ──
    window.calcClear = allClear;
    window.calcClearHistory = () => { state.history = []; persist(); renderHistory(); };
    window.FlowCalc = {
        press: label => { const k = [...KEYS, ...NUM_KEYS].find(x => x.label === label); if (k) runKey(k); },
        type: list => list.forEach(insert),
        equals, allClear,
        get display() { return resultEl.textContent; },
        get expression() { return exprEl.textContent; },
        state
    };

    buildKeypad();
    renderHistory();
    render();
})();
