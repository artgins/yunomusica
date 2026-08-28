/***********************************************************************
 *          addsrc.mjs
 *
 *      Adding a source: it must never add anything twice, and it must
 *      never read two folders at once.
 *
 *      This is the easiest mistake in the app to make and the worst one
 *      to notice. The picker reopens on the folder you used last, that
 *      folder is under the cursor, and nothing on the screen says it is
 *      already in. What came of a second press was every track twice —
 *      twice in the library, twice in its album, twice in the folder
 *      tree, and twice in any list saved from them, with nothing left
 *      to tell the copies apart.
 *
 *      The two kinds of source can prove different things about
 *      themselves, so both are tested here and they are not the same
 *      test:
 *
 *        - a FILE SNAPSHOT (Firefox, and the loose-files picker
 *          everywhere) has no path above the folder that was chosen, so
 *          the files are compared one by one. What is genuinely new is
 *          still added: refusing the whole pick would make the parent
 *          of an album already in impossible to add.
 *
 *        - a FOLDER HANDLE (Chromium) knows whether it is the same
 *          entry as another and whether it lies inside it. Driven here
 *          over the ORIGIN PRIVATE FILE SYSTEM: those are real
 *          FileSystemDirectoryHandles with the real isSameEntry and
 *          resolve, which is the whole of what is under test. A
 *          hand-written stub would only prove the stub agrees with
 *          itself. Chrome will not let Playwright drive the native
 *          directory picker, so the picker — and only the picker — is
 *          replaced.
 *
 *          Copyright (c) 2026, ArtGins.
 *          All Rights Reserved.
 ***********************************************************************/
import {readdirSync, statSync} from "fs";
import {join} from "path";
import {OUT, launch, new_page, boot, route, add_source, report} from "./lib.mjs";
import {ensure_fixtures} from "./fixtures.mjs";

const FIX = ensure_fixtures();

function walk(dir, out = [])
{
    for(const n of readdirSync(dir)) {
        const p = join(dir, n);
        if(statSync(p).isDirectory()) { walk(p, out); } else { out.push(p); }
    }
    return out;
}

let bad = false;

function check(ok, what)
{
    console.log(`   ${ok ? "ok " : ">>>"} ${what}`);
    if(!ok) {
        bad = true;
    }
}


/*  The state that matters, read off the screen the user is looking at. */
async function sources(page)
{
    await route(page, "#/sources", 700);
    return page.evaluate(() =>
        [...document.querySelectorAll(".MUS_SRCROW")].map((r) => ({
            name:  r.querySelector(".MUS_T1").textContent.trim(),
            count: Number((r.querySelector(".MUS_T2").textContent.match(/\d+/) || [0])[0]),
        })));
}

async function notice(page)
{
    return page.evaluate(() => {
        const n = document.querySelector(".MUS_SRCNOTE_TEXT");
        return n ? n.textContent.trim() : "";
    });
}

/*  Every track in the library, by title, however it is grouped. */
async function titles(page)
{
    await route(page, "#/library", 700);
    await page.click('.MUS_CHIP >> nth=-1');        // "all"
    await page.waitForTimeout(600);
    return page.evaluate(() =>
        [...document.querySelectorAll(".MUS_ROW .MUS_T1")].map((e) => e.textContent.trim()));
}

function repeats(list)
{
    return list.filter((x, i) => list.indexOf(x) !== i);
}


/*  =================================================================
 *  1. File snapshots — the picker every engine has
 *  ================================================================= */
const browser = await launch();
let page = await new_page(browser);
await boot(page);

console.log("1. instantáneas de ficheros");

await add_source(page, [FIX.music], 1, 3000);
let src = await sources(page);
const first = src.length === 1 ? src[0].count : 0;
check(src.length === 1 && first > 0, `la carpeta entra: ${src.length} fuente, ${first} pistas`);

await add_source(page, [FIX.music], 1, 3000);
src = await sources(page);
check(src.length === 1 && src[0].count === first,
      `la misma carpeta otra vez no añade nada: ${src.length} fuente, ${src[0].count} pistas`);
check((await notice(page)).length > 0, `y lo dice: “${(await notice(page)).slice(0, 60)}…”`);

await add_source(page, [join(FIX.music, "Bach")], 1, 3000);
src = await sources(page);
check(src.length === 1, `una subcarpeta de la que ya está tampoco: ${src.length} fuente`);

await add_source(page, walk(join(FIX.music, "Bach")), 2, 3000);
src = await sources(page);
check(src.length === 1, `ni esos mismos ficheros sueltos: ${src.length} fuente`);

let list = await titles(page);
check(list.length === first && !repeats(list).length,
      `la biblioteca no repite: ${list.length} pistas, ${repeats(list).length} repetidas`);

/*  Y lo que SÍ es nuevo sigue entrando, aunque venga mezclado con lo
    que ya estaba: la carpeta de arriba de un álbum ya añadido no puede
    quedar bloqueada. */
await add_source(page, [FIX.tones], 1, 3000);
src = await sources(page);
check(src.length === 2 && src[1].count > 0,
      `una carpeta nueva sí entra: ${src.length} fuentes`);

await page.screenshot({path: `${OUT}/addsrc-snapshots.png`, fullPage: true});
await page.context().close();

/*  Y al rev\u00e9s, que es el orden natural de quien prueba primero un
    \u00e1lbum: los sueltos antes y la carpeta que los contiene despu\u00e9s. Lo
    que ya estaba se cae, lo dem\u00e1s entra, y ninguna pista sale dos
    veces. */
page = await new_page(browser);
await boot(page);
await add_source(page, walk(join(FIX.music, "Bach")), 2, 3000);
src = await sources(page);
const loose = src.length === 1 ? src[0].count : 0;
check(src.length === 1 && loose === 2, `unos sueltos entran: ${loose} pistas`);

await add_source(page, [FIX.music], 1, 3000);
src = await sources(page);
list = await titles(page);
check(src.length === 2 && !repeats(list).length,
      `y la carpeta que los contiene no los repite: ` +
      `${src.map((x) => x.name + " " + x.count).join(", ")} \u2192 ` +
      `${list.length} pistas, ${repeats(list).length} repetidas`);
check((await notice(page)).includes("2"),
      `y dice cu\u00e1ntos dej\u00f3 fuera: \u201c${(await notice(page)).slice(0, 60)}\u2026\u201d`);
await page.context().close();


/*  =================================================================
 *  2. Folder handles — Chromium, over the origin private file system
 *  ================================================================= */
console.log("2. carpetas de verdad (File System Access)");

/*  root/todo/{music/{Bach,Ramones}, otra}
    Built inside the page, in the private file system, so the handles
    the picker hands back are the browser's own. */
const build_tree = async () => {
    const root = await navigator.storage.getDirectory();
    /*  A clean slate: the private file system outlives a reload. */
    for await (const name of root.keys()) {
        await root.removeEntry(name, {recursive: true});
    }
    const put = async (dir, name, bytes) => {
        const fh = await dir.getFileHandle(name, {create: true});
        const w = await fh.createWritable();
        await w.write(new Uint8Array(bytes));
        await w.close();
    };
    const todo   = await root.getDirectoryHandle("todo", {create: true});
    const music  = await todo.getDirectoryHandle("music", {create: true});
    const bach   = await music.getDirectoryHandle("Bach", {create: true});
    const ramone = await music.getDirectoryHandle("Ramones", {create: true});
    const otra   = await todo.getDirectoryHandle("otra", {create: true});
    await put(bach,   "01 - Prelude.mp3",     new Array(600).fill(1));
    await put(bach,   "02 - Allemande.mp3",   new Array(620).fill(2));
    await put(ramone, "01 - Cretin Hop.mp3",  new Array(640).fill(3));
    await put(ramone, "02 - Rockaway Beach.mp3", new Array(660).fill(4));
    await put(otra,   "01 - Sola.mp3",        new Array(680).fill(5));
};

/*  The picker, and nothing else, is replaced. It hands back whatever
    `window.__pick` names — or, when a queue has been left in
    `window.__picks`, the next one off it. The queue is what lets two
    folders be chosen in a single turn without the two calls racing for
    the same variable. */
const stub_picker = () => {
    window.showDirectoryPicker = async function() {
        const want = (window.__picks && window.__picks.length)
            ? window.__picks.shift()
            : window.__pick;
        let dir = await navigator.storage.getDirectory();
        for(const seg of String(want || "").split("/").filter(Boolean)) {
            dir = await dir.getDirectoryHandle(seg);
        }
        return dir;
    };
};

page = await new_page(browser, {no_fsa: false, init: stub_picker});
await boot(page);
await page.evaluate(build_tree);

async function pick(page, path, settle = 3000)
{
    await route(page, "#/sources", 600);
    await page.evaluate((p) => { window.__pick = p; }, path);
    await page.click(".MUS_SECHEAD .MUS_QBTN:nth-child(1)");
    await page.waitForTimeout(settle);
}

await pick(page, "todo/music");
src = await sources(page);
const four = src.length === 1 ? src[0].count : 0;
check(src.length === 1 && four === 4, `la carpeta entra: ${src.length} fuente, ${four} pistas`);

await pick(page, "todo/music");
src = await sources(page);
check(src.length === 1 && src[0].count === four,
      `la misma carpeta otra vez no añade nada: ${src.length} fuente, ${src[0].count} pistas`);
check((await notice(page)).length > 0, `y lo dice: “${(await notice(page)).slice(0, 60)}…”`);

await pick(page, "todo/music/Bach");
src = await sources(page);
check(src.length === 1, `una subcarpeta de la que ya está tampoco: ${src.length} fuente`);
check((await notice(page)).length > 0, `y también lo dice`);

await pick(page, "todo/otra");
src = await sources(page);
check(src.length === 2, `una carpeta de al lado sí entra: ${src.length} fuentes`);

list = await titles(page);
check(list.length === 5 && !repeats(list).length,
      `la biblioteca no repite: ${list.length} pistas, ${repeats(list).length} repetidas`);

/*  La carpeta de ARRIBA es otra cosa: quererla es legítimo, y sólo se
    puede coger a costa de las que ya están dentro — que se llevan sus
    escuchas. Eso se pregunta, no se decide. */
await pick(page, "todo");
src = await sources(page);
check(src.length === 2, `la carpeta de arriba no se cuela sola: ${src.length} fuentes`);
const asked = await notice(page);
check(asked.length > 0, `pregunta: “${asked.slice(0, 70)}…”`);
const buttons = await page.evaluate(() =>
    [...document.querySelectorAll(".MUS_SRCNOTE_ACTIONS button")].map((b) => b.textContent.trim()));
check(buttons.length === 2, `y ofrece las dos salidas: ${buttons.join(" / ")}`);
await page.screenshot({path: `${OUT}/addsrc-asks.png`, fullPage: true});

/*  Cancelar no toca nada. */
await page.click(".MUS_SRCNOTE_ACTIONS button >> nth=1");
await page.waitForTimeout(600);
src = await sources(page);
check(src.length === 2 && !(await notice(page)), `cancelar la deja como estaba: ${src.length} fuentes`);

/*  Y aceptar deja UNA fuente con todo dentro, sin repetir nada. */
await pick(page, "todo");
await page.click(".MUS_SRCNOTE_ACTIONS button >> nth=0");
await page.waitForTimeout(4000);
src = await sources(page);
check(src.length === 1 && src[0].name === "todo" && src[0].count === 5,
      `aceptar sustituye: ${src.map((s) => s.name + " " + s.count).join(", ")}`);

list = await titles(page);
check(list.length === 5 && !repeats(list).length,
      `y la biblioteca sigue sin repetir: ${list.length} pistas, ${repeats(list).length} repetidas`);

await page.screenshot({path: `${OUT}/addsrc-handles.png`, fullPage: true});
await page.context().close();


/*  =================================================================
 *  3. One read at a time
 *
 *  The pickers stay live while a folder is being read — queueing a
 *  second one is a reasonable thing to do. What cannot be shared is the
 *  reading: there is ONE progress counter, one clock and one Stop, and
 *  two reads fighting over them made the counter jump backwards and
 *  reach the end while the other folder was still half way through. A
 *  bar that fills up and stays up is how a working app gets read as a
 *  stuck one.
 *  ================================================================= */
console.log("3. una lectura cada vez");

const build_two = async () => {
    const root = await navigator.storage.getDirectory();
    for await (const name of root.keys()) {
        await root.removeEntry(name, {recursive: true});
    }
    for(const name of ["A", "B"]) {
        const d = await root.getDirectoryHandle(name, {create: true});
        for(let i = 0; i < 300; i++) {
            const fh = await d.getFileHandle(`${name}-${String(i).padStart(3, "0")}.mp3`,
                                             {create: true});
            const w = await fh.createWritable();
            await w.write(new Uint8Array(new Array(4000).fill(i % 251)));
            await w.close();
        }
    }
};

page = await new_page(browser, {no_fsa: false, init: stub_picker});
await boot(page);
await page.evaluate(build_two);
await route(page, "#/sources", 600);

/*  Se graba DENTRO de la página, no muestreando desde fuera.
 *
 *  Lo que hay que pillar son estados de paso — la de al lado esperando
 *  turno, el contador un instante después de cambiar de carpeta — y un
 *  muestreo desde el test se los salta o no, según lo cargada que esté
 *  la máquina. Eso hacía que el test fallara unas veces sí y otras no,
 *  que es la peor manera de no probar nada. */
await page.evaluate(() => {
    window.__rec = [];
    window.__last = "";
    window.__rec_timer = setInterval(() => {
        const txt = (sel) => {
            const e = document.querySelector(sel);
            return e ? e.textContent.trim() : "";
        };
        const snap = {
            what: txt(".MUS_SCAN_WHAT"),
            n: Number((txt(".MUS_SCAN_COUNT").match(/^(\d+)/) || [0, -1])[1]),
            rows: [...document.querySelectorAll(".MUS_SRCROW")].map((r) => ({
                name: (r.querySelector(".MUS_T1") || {}).textContent || "",
                state: ((r.querySelector(".MUS_SRCSTATE") || {}).textContent || "").trim(),
            })),
        };
        const key = JSON.stringify(snap);
        if(key !== window.__last) {
            window.__last = key;
            window.__rec.push(snap);
        }
    }, 30);
});

/*  Las dos elecciones en el MISMO turno: as\u00ed las dos entran en la cola
    antes de que ninguna lectura pueda acabar, y el solape est\u00e1
    garantizado en vez de depender de lo r\u00e1pido que vaya el disco. */
await page.evaluate(() => {
    window.__picks = ["A", "B"];
    const b = document.querySelector(".MUS_SECHEAD .MUS_QBTN:nth-child(1)");
    b.click();
    b.click();
});

await page.waitForTimeout(20000);
const rec = await page.evaluate(() => {
    clearInterval(window.__rec_timer);
    return window.__rec;
});

/*  1. Nunca dos leyendo a la vez, y la que espera lo dice. */
const both_reading = rec.filter(
    (s) => s.rows.filter((r) => /Leyendo/i.test(r.state)).length > 1);
check(both_reading.length === 0, `nunca se leen dos a la vez`);

const waited = rec.filter((s) =>
    s.rows.some((r) => /Leyendo/i.test(r.state)) &&
    s.rows.some((r) => /esper/i.test(r.state)));
check(waited.length > 0,
      `mientras una se lee, la otra dice que espera (${waited.length} instantes)`);

/*  2. El contador no retrocede dentro de una misma carpeta. La barra
       dice tambi\u00e9n CU\u00c1L est\u00e1 leyendo, y ese nombre es lo que separa
       las dos lecturas: empezar de cero al cambiar de carpeta es lo
       correcto; retroceder sin cambiar de carpeta es el fallo. */
const bar = rec.filter((s) => s.what && s.n >= 0);
const drops = [];
for(let i = 1; i < bar.length; i++) {
    if(bar[i].what === bar[i - 1].what && bar[i].n < bar[i - 1].n) {
        drops.push(`${bar[i].what} ${bar[i - 1].n}\u2192${bar[i].n}`);
    }
}
const which = [...new Set(bar.map((s) => s.what))];
check(which.length === 2, `la barra pasa por las dos carpetas: ${which.join(", ")}`);
check(drops.length === 0, `y su contador no salta atr\u00e1s: ${drops.join(", ") || "ninguno"}`);

/*  3. Y ninguna hereda los n\u00fameros de la anterior: la primera cifra
       que la barra ense\u00f1a de una carpeta es del principio de ESA
       carpeta, no el 300/300 con que acab\u00f3 la de antes. */
const first_of = {};
for(const s of bar) {
    if(!(s.what in first_of)) {
        first_of[s.what] = s.n;
    }
}
check(Object.values(first_of).every((n) => n < 50),
      `cada carpeta empieza a contar por el principio: ` +
      Object.entries(first_of).map(([k, v]) => k + " " + v).join(", "));

src = await sources(page);
check(src.length === 2 && src.every((x) => x.count === 300),
      `las dos carpetas acaban enteras: ${src.map((x) => x.name + " " + x.count).join(", ")}`);

if(report(page)) {
    bad = true;
}
await browser.close();
process.exit(bad ? 1 : 0);
