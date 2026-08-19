/***********************************************************************
 *          run.mjs
 *
 *      Runs the suite against the built bundle and prints one line per
 *      test.
 *
 *      Against `dist/`, not the dev server, on purpose: half of what is
 *      under test here is what the build produces — the version stamp,
 *      the manifest, the bundled locales.
 *
 *      Serial, not parallel. Each test drives a real Chrome through
 *      real timeouts, and the failures that matter in this app are
 *      timing-shaped; five browsers competing for the same cores turn a
 *      regression into a flake.
 *
 *      Usage:
 *          npm test                # everything
 *          npm test -- select      # just the ones whose name matches
 *
 *          Copyright (c) 2026, ArtGins.
 *          All Rights Reserved.
 ***********************************************************************/
import {spawn, execFileSync} from "child_process";
import {existsSync} from "fs";
import {dirname, join} from "path";
import {fileURLToPath} from "url";
import {createConnection} from "net";

import {ensure_fixtures} from "./fixtures.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const PROJECT = join(HERE, "..");
const PORT = Number(new URL(process.env.YUNOMUSICA_URL || "http://localhost:4321/").port || 80);

/*  Order matters only in that the cheap ones go first: a broken build
    should not cost three minutes to discover. */
const TESTS = [
    {name: "fallback",  what: "idioma de entrada y dirección"},
    {name: "navink",    what: "tinta del nav y de los botones primarios"},
    {name: "minink",    what: "tinta del botón del mini-reproductor"},
    {name: "select",    what: "navegar no cambia lo que suena"},
    {name: "confirm",   what: "aviso antes de sustituir la cola"},
    {name: "install",   what: "la app pregunta ella misma si instalarse"},
    {name: "offline",   what: "sin red arranca y sigue tocando lo del dispositivo"},
    {name: "covers",    what: "las car\u00e1tulas de internet: apagadas por defecto y solo para lo que falta"},
    {name: "storage",   what: "otra pestaña no deja sin almacenamiento"},
    {name: "firefox",   what: "Firefox lee la música sin contestar al permiso"},
    {name: "fitmobile", what: "nada se sale del ancho del móvil"},
    {name: "preview",   what: "la tira de escucha se lee y su reloj avanza"},
    {name: "resume",    what: "al volver, la canción trae su duración y suena"},
    {name: "follow",    what: "el banner no scrollea y la cola sigue a la música"},
    {name: "viz",       what: "el banner dibuja la nota que suena, y sigue sonando"},
    {name: "counts",    what: "escuchas y corazones: se cuentan, se ordenan en Listas y aguantan una recarga"},
    {name: "e2e",       what: "recorrido completo + recarga"}
];


function port_open(port)
{
    return new Promise((resolve) => {
        /*  "localhost", not 127.0.0.1: vite preview binds ::1 only, so
            probing IPv4 reports the port free and we then fail to bind
            it ourselves. */
        const s = createConnection({host: "localhost", port});
        s.on("connect", () => { s.destroy(); resolve(true); });
        s.on("error", () => resolve(false));
        setTimeout(() => { s.destroy(); resolve(false); }, 1500);
    });
}

async function wait_for_port(port, ms)
{
    const until = Date.now() + ms;
    while(Date.now() < until) {
        if(await port_open(port)) {
            return true;
        }
        await new Promise((r) => setTimeout(r, 250));
    }
    return false;
}

function run(file)
{
    return new Promise((resolve) => {
        const p = spawn(process.execPath, [join(HERE, file)], {cwd: PROJECT});
        let out = "";
        p.stdout.on("data", (d) => { out += d; });
        p.stderr.on("data", (d) => { out += d; });
        p.on("close", (code) => resolve({code, out}));
    });
}


/*  ---- build, fixtures, server ---------------------------------- */

if(!existsSync(join(PROJECT, "dist", "index.html"))) {
    console.log("no hay dist/: construyendo…");
    execFileSync("npm", ["run", "build"], {cwd: PROJECT, stdio: "inherit"});
}

const fix = ensure_fixtures();
if(fix.built.length) {
    console.log(`fixtures generadas: ${fix.built.join(", ")}`);
}

let server = null;
if(!(await port_open(PORT))) {
    console.log(`levantando vite preview en :${PORT}…`);
    server = spawn("npx", ["vite", "preview", "--port", String(PORT)],
        {cwd: PROJECT, stdio: "ignore", detached: true});
    if(!(await wait_for_port(PORT, 20000))) {
        console.error(`>>> no arrancó el servidor en :${PORT}`);
        process.exit(2);
    }
} else {
    console.log(`usando el servidor que ya escucha en :${PORT}`);
}


/*  ---- run ------------------------------------------------------ */

const only = process.argv.slice(2).filter((a) => !a.startsWith("-"));
const chosen = only.length ? TESTS.filter((t) => only.some((o) => t.name.includes(o))) : TESTS;

const results = [];
for(const t of chosen) {
    process.stdout.write(`  ${t.name.padEnd(10)} ${t.what.padEnd(40)} `);
    const started = process.hrtime.bigint();
    const r = await run(`${t.name}.mjs`);
    const secs = Number(process.hrtime.bigint() - started) / 1e9;
    const errs = (r.out.match(/=== ERRORS \((\d+)\)/) || [])[1];
    results.push({...t, ...r, secs, errs});
    console.log(`${r.code === 0 ? "ok " : ">>>"} ${secs.toFixed(0)}s` +
                (errs && errs !== "0" ? `  (${errs} errores de consola)` : ""));
}

if(server) {
    try { process.kill(-server.pid); } catch(e) { /* already gone */ }
}

const failed = results.filter((r) => r.code !== 0);
if(failed.length) {
    for(const f of failed) {
        console.log(`\n########## ${f.name} ##########\n${f.out}`);
    }
}
console.log(failed.length
    ? `\n>>> ${failed.length} de ${results.length} fallan: ${failed.map((f) => f.name).join(", ")}`
    : `\n${results.length} de ${results.length} pasan`);

process.exit(failed.length ? 1 : 0);
