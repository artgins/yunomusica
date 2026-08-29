/***********************************************************************
 *          tree.mjs
 *
 *      The library as it is ON THE DISK, and the way into it from a
 *      source.
 *
 *      "Carpetas" grouped on the whole path, which produced a flat list
 *      of every LEAF directory in the library — and a leaf directory is
 *      nearly always an album, so it was the Albums view again with
 *      worse names. What it never showed was the SHAPE: what holds
 *      what, the one thing the file system knows and the tags do not.
 *
 *      Underneath it sat a quieter bug. `fromPath` popped the parent
 *      segment off the array it then rebuilt the path from, so the
 *      stored folder of a file in `messy/Jethro Tull/Aqualung` came out
 *      as `messy/Aqualung` — a directory nobody has. Nothing showed it
 *      until something tried to walk with it, so the tree is built from
 *      the track's PATH instead: the path is what the file is fetched
 *      by, and cannot be wrong without the track being unplayable.
 *
 *      And this is where Fuentes sends you. That screen could remove a
 *      folder, re-read it and queue it, and could not show what was in
 *      it — the one question anybody actually has about a source.
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

const browser = await launch();
const page = await new_page(browser, {viewport: {width: 412, height: 915}, mobile: true});

await boot(page);
/*  The FOLDER picker, not the loose-files one: a snapshot of loose
    files has no directories to walk, which is its own case below. */
await add_source(page, [FIX.messy], 1, 3500);

/*  What the tree screen is showing: where we are, the folders under it,
    and the tracks that live in it rather than in one of them. */
const here = () => page.evaluate(() => {
    const txt = (e) => (e ? e.textContent.trim() : "");
    return {
        title: txt(document.querySelector(".MUS_TREEHEAD .MUS_DTITLE")),
        meta:  txt(document.querySelector(".MUS_TREEHEAD .MUS_DMETA")).replace(/\s+/g, " "),
        crumbs: [...document.querySelectorAll(".MUS_CRUMB")].map((c) => c.textContent.trim()),
        dirs: [...document.querySelectorAll(".MUS_DIRROW")].map((r) => ({
            name: txt(r.querySelector(".MUS_T1")),
            sub:  txt(r.querySelector(".MUS_T2")).replace(/\s+/g, " "),
        })),
        tracks: [...document.querySelectorAll(".MUS_ROW:not(.MUS_DIRROW) .MUS_T1")]
            .map((e) => e.textContent.trim()),
    };
});

const into = async (name) => {
    await page.locator(`.MUS_DIRROW:has-text("${name}")`).first()
        .locator(".MUS_ROWMAIN").click();
    await page.waitForTimeout(700);
};


/*  =================================================================
 *  1. Fuentes opens the source
 *  ================================================================= */
console.log("1. desde Fuentes se entra en la fuente");

await route(page, "#/sources", 900);
const has_button = await page.locator('.MUS_SRCROW .MUS_QBTN:has-text("Ver dentro")').count();
check(has_button === 1, `la fila de la fuente ofrece ver dentro`);
await page.screenshot({path: `${OUT}/tree-sources.png`, fullPage: true});

await page.locator('.MUS_SRCROW .MUS_QBTN:has-text("Ver dentro")').first().click();
await page.waitForTimeout(1200);

let n = await here();
check(/Carpetas/.test(await page.locator(".MUS_CHIP.is-on").textContent() || ""),
      `y lleva a Carpetas`);
check(n.title === "messy", `abierta por su raíz: “${n.title}”`);


/*  =================================================================
 *  2. Y enseña la forma que hay en el disco
 *  ================================================================= */
console.log("2. y enseña el árbol de verdad");

console.log("   " + n.dirs.map((d) => `${d.name} (${d.sub})`).join(" · "));
check(n.dirs.length === 3,
      `bajo la raíz hay tres carpetas, no los álbumes del fondo: ${n.dirs.length}`);
check(n.dirs.map((d) => d.name).join(",") === "Camel,camel,Jethro Tull",
      `y son las que están en el disco: ${n.dirs.map((d) => d.name).join(", ")}`);
check(/9/.test(n.meta), `contando lo que cuelga de ella: ${n.meta}`);
check(!n.tracks.length, `y ninguna pista suelta en la raíz`);
await page.screenshot({path: `${OUT}/tree-root.png`, fullPage: true});

await into("Jethro Tull");
n = await here();
console.log("   " + n.dirs.map((d) => d.name).join(" · "));
check(n.title === "Jethro Tull", `un nivel más: “${n.title}”`);
check(n.dirs.length === 4,
      `con sus cuatro carpetas, incluidas las tres que las etiquetas fundían: ${n.dirs.length}`);

await into("Aqualung");
n = await here();
check(n.title === "Aqualung" && !n.dirs.length && n.tracks.length === 2,
      `y al fondo están las pistas: “${n.title}”, ${n.tracks.length}`);
console.log("   " + n.tracks.join(" · "));
await page.screenshot({path: `${OUT}/tree-leaf.png`, fullPage: true});


/*  =================================================================
 *  3. Y se puede volver, a cualquier altura
 *  ================================================================= */
console.log("3. y se sube por donde se quiera");

check(n.crumbs.join(" / ") === "Fuentes / messy / Jethro Tull",
      `el rastro dice el camino entero: ${n.crumbs.join(" / ")}`);

await page.locator('.MUS_CRUMB:has-text("messy")').click();
await page.waitForTimeout(700);
n = await here();
check(n.title === "messy",
      `y saltar a la raíz es un toque, no tres: “${n.title}”`);

await page.locator(".MUS_CRUMB").first().click();
await page.waitForTimeout(700);
const roots = await page.locator(".MUS_DIRROW").count();
check(roots === 1, `y por encima de todo están las fuentes: ${roots}`);


/*  =================================================================
 *  4. Unos ficheros sueltos no tienen árbol, y no se lo inventa
 *  ================================================================= */
console.log("4. y a unos sueltos no les inventa carpetas");

await add_source(page, walk(join(FIX.music, "Bach")), 2, 2500);
await route(page, "#/library", 800);
await page.locator('.MUS_CHIP:has-text("Carpetas")').click();
await page.waitForTimeout(700);
check((await page.locator(".MUS_DIRROW").count()) === 2, `ahora hay dos fuentes`);

await page.locator(".MUS_DIRROW").nth(1).locator(".MUS_ROWMAIN").click();
await page.waitForTimeout(800);
n = await here();
check(!n.dirs.length && n.tracks.length === 2,
      `los sueltos salen en la raíz de su fuente, sin carpeta inventada: ` +
      `${n.dirs.length} carpetas, ${n.tracks.length} pistas`);

/*  =================================================================
 *  5. Y la segunda vez enseña la segunda fuente
 *  ================================================================= */
console.log("5. y ver dentro obedece a la fuente en la que se pulsa");

/*  La biblioteca se construye una vez y a partir de ahí sólo se
    esconde y se enseña, así que el segundo "ver dentro" no arrancaba
    nada: la pantalla se quedaba en la carpeta del primero. Desde el
    móvil era lo único que se veía — una fuente, para siempre. */
await add_source(page, [FIX.mimusica], 1, 3500);

await route(page, "#/sources", 900);
await page.locator('.MUS_SRCROW:has-text("mimusica") .MUS_QBTN:has-text("Ver dentro")')
    .first().click();
await page.waitForTimeout(1200);
n = await here();
check(n.title === "mimusica",
      `la segunda fuente se abre por su raíz: “${n.title}”`);

await route(page, "#/sources", 900);
await page.locator('.MUS_SRCROW:has-text("messy") .MUS_QBTN:has-text("Ver dentro")')
    .first().click();
await page.waitForTimeout(1200);
n = await here();
check(n.title === "messy",
      `y volver a la primera vuelve a la primera: “${n.title}”`);

/*  Y llegar por el menú no mueve nada: la pantalla se queda donde se
    dejó, que es lo que el atajo NO debe romper. */
await into("Jethro Tull");
await route(page, "#/player", 700);
await route(page, "#/library", 900);
n = await here();
check(n.title === "Jethro Tull",
      `entrar por el menú deja la pantalla donde estaba: “${n.title}”`);


if(report(page)) {
    bad = true;
}
await browser.close();
process.exit(bad ? 1 : 0);
