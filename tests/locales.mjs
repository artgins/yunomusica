/***********************************************************************
 *          locales.mjs
 *
 *      Ten languages, all bundled, and nothing to fetch them from — so
 *      a gap in one of them is not a slow load, it is English text on a
 *      Russian screen, for good.
 *
 *      Three things are checked, and none of them needs anyone to read
 *      the languages:
 *
 *      1. COVERAGE. `fallbackLng: "en"` is a safety net, not a plan: a
 *         key nobody translated renders in English and never changes.
 *         That is exactly how the whole covers section — the switch, the
 *         buttons and the paragraph explaining what leaves the device —
 *         sat in English in seven of the ten languages without anything
 *         ever going red.
 *
 *      2. PLACEHOLDERS. A translation that loses `{{other}}` still
 *         renders, and still reads like a sentence, and has silently
 *         dropped the name of the folder it is talking about. One had.
 *
 *         `{{count}}` is the exception, and deliberately: a plural form
 *         may name its own number instead of printing it — Arabic says
 *         "one was found", not "1 one was found". Every OTHER
 *         placeholder is information the sentence cannot do without.
 *
 *      3. NO STRAY KEYS. A key in one catalogue and not in English is
 *         either a typo or something the code stopped asking for; both
 *         are dead weight in a bundle that ships all ten.
 *
 *          Copyright (c) 2026, ArtGins.
 *          All Rights Reserved.
 ***********************************************************************/
const CODES = ["en", "es", "zh", "ar", "ru", "hi", "pt", "fr", "de", "ja"];
const SUFFIXES = ["zero", "one", "two", "few", "many", "other"];

let bad = false;

function check(ok, what)
{
    console.log(`   ${ok ? "ok " : ">>>"} ${what}`);
    if(!ok) {
        bad = true;
    }
}

/*  "n tracks_one" and "n tracks" are the same key wearing a plural
    suffix. Coverage is about the key, not about the form. */
function base(key)
{
    for(const s of SUFFIXES) {
        if(key.endsWith("_" + s)) {
            return key.slice(0, -(s.length + 1));
        }
    }
    return key;
}

function placeholders(value)
{
    return [...String(value).matchAll(/\{\{(\w+)\}\}/g)]
        .map((m) => m[1])
        .filter((n) => n !== "count")           // see the header
        .sort()
        .join(",");
}

const tr = {};
for(const c of CODES) {
    const m = await import(`../src/locales/${c}.js`);
    tr[c] = m[c].translation;
}

const en_keys = [...new Set(Object.keys(tr.en).map(base))];
console.log(`1. cobertura (${en_keys.length} claves en inglés)`);

for(const c of CODES) {
    const have = new Set(Object.keys(tr[c]).map(base));
    const missing = en_keys.filter((k) => !have.has(k));
    const extra = [...have].filter((k) => !en_keys.includes(k));
    check(!missing.length && !extra.length,
          `${c}: ${Object.keys(tr[c]).length} entradas` +
          (missing.length ? ` | SIN TRADUCIR: ${missing.join(", ")}` : "") +
          (extra.length ? ` | sobran: ${extra.join(", ")}` : ""));
}

console.log("2. marcadores");
const want = new Map();
for(const [k, v] of Object.entries(tr.en)) {
    want.set(base(k), placeholders(v));
}
for(const c of CODES) {
    const lost = [];
    for(const [k, v] of Object.entries(tr[c])) {
        const expected = want.get(base(k));
        if(expected === undefined) {
            continue;
        }
        if(placeholders(v) !== expected) {
            lost.push(`${k} [${expected}] -> [${placeholders(v)}]`);
        }
    }
    check(!lost.length, `${c}: ${lost.length ? lost.join("; ") : "intactos"}`);
}

/*  Nothing empty, and nothing that is still the key. i18next answers an
    unknown key with the key itself, so a value that IS its key looks on
    screen exactly like a translation nobody wrote.

    English is exempt from the second half and only from that: the keys
    ARE lower-case English, so "edited" being the word "edited" is the
    catalogue working, not a gap. */
console.log("3. nada vacío ni sin traducir del todo");
for(const c of CODES) {
    const wrong = Object.entries(tr[c])
        .filter(([k, v]) => !String(v).trim() ||
                            (c !== "en" && String(v) === base(k)))
        .map(([k]) => k);
    check(!wrong.length, `${c}: ${wrong.length ? wrong.join(", ") : "todo con texto"}`);
}

console.log(bad
    ? ">>> los catálogos no están completos"
    : "los diez catálogos: completos, con sus marcadores y sin huecos");
process.exit(bad ? 1 : 0);
