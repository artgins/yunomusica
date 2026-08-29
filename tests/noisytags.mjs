/***********************************************************************
 *          noisytags.mjs
 *
 *      A TAG THAT SAYS NOTHING, and what the file is called.
 *
 *      A tag is a CLAIM about the file, and some taggers claim nothing:
 *      they write boilerplate into the field and move on. The app
 *      believed all of it, so one folder came out as eleven rows of
 *      which two read "AlbumWrap Album" — twice, identically — by an
 *      artist called "AlbumWrap - King Crimson", which is the name of a
 *      program and not of a band. The files, meanwhile, were called
 *      "King Crimson - Live at the Jazz Cafe (Albumwrap).mp3" and
 *      "King Crimson - Red.mp3", which say the whole thing.
 *
 *      Every pattern under test was counted in a real 8,176-file
 *      library, and that is the only reason any of them is here. So is
 *      the other half of the rule: "06.mp3" is no better than the
 *      "Track 06" it would replace, and "Various Artists" is a real
 *      answer about a real compilation. Neither moves.
 *
 *          Copyright (c) 2026, ArtGins.
 *          All Rights Reserved.
 ***********************************************************************/
import {OUT, launch, new_page, boot, route, add_source, report} from "./lib.mjs";
import {ensure_fixtures} from "./fixtures.mjs";

const FIX = ensure_fixtures();

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
await add_source(page, [FIX.noisy], 1, 3500);

await route(page, "#/library", 900);
await page.locator('.MUS_CHIP:has-text("Todas")').click();
await page.waitForTimeout(700);

/*  Every row of the flat list: what it says, and what it says
    underneath. */
const rows = () => page.evaluate(() => {
    const txt = (e) => (e ? e.textContent.trim() : "");
    return [...document.querySelectorAll(".MUS_ROW")].map((r) => ({
        title: txt(r.querySelector(".MUS_T1")),
        sub:   txt(r.querySelector(".MUS_T2")).replace(/\s+/g, " "),
    }));
});

const list = await rows();
console.log("   " + list.map((r) => `${r.title} [${r.sub}]`).join("\n   "));
const titles = list.map((r) => r.title);
const subs = list.map((r) => r.sub).join(" | ");


/*  =================================================================
 *  1. El nombre del programa no es el nombre de nadie
 *  ================================================================= */
console.log("1. AlbumWrap no es un disco ni un grupo");

check(!titles.includes("AlbumWrap Album"),
      `ninguna fila se llama ya "AlbumWrap Album"`);
check(!/AlbumWrap/i.test(subs),
      `y AlbumWrap no aparece como artista: ${subs.includes("AlbumWrap")}`);
check(titles.includes("Live at the Jazz Cafe"),
      `el fichero da el nombre: "Live at the Jazz Cafe"`);
check(titles.includes("Red"),
      `y las dos dejan de llamarse igual: "Red"`);
check(/King Crimson/.test(subs), `el grupo es King Crimson`);


/*  =================================================================
 *  2. Un número no es un nombre
 *  ================================================================= */
console.log("2. un número no es un nombre");

check(titles.includes("Close your eyes"),
      `"Track 02" cede ante el fichero: "Close your eyes"`);
check(titles.includes("Peter and the Wolf"),
      `"Track 09" también`);
check(!titles.some((t) => /^Track \d+$/.test(t) && t !== "Track 06"),
      `y no queda ningún "Track NN" que el disco pudiera nombrar`);


/*  =================================================================
 *  3. Ni el nombre del propio campo
 *  ================================================================= */
console.log("3. ni la etiqueta del campo puesta como valor");

check(/bowie/i.test(subs),
      `artista "artist" se sustituye por lo que dice el fichero: bowie`);

await route(page, "#/library", 600);
await page.locator('.MUS_CHIP:has-text("Álbumes")').click();
await page.waitForTimeout(700);
const albums = await page.evaluate(() =>
    [...document.querySelectorAll(".MUS_CARD .MUS_T1")]
        .map((e) => e.textContent.trim()));
console.log("   álbumes: " + albums.join(" · "));
check(!albums.includes("title") && !albums.includes("Unknown"),
      `ni "title" ni "Unknown" son álbumes: ${albums.join(", ")}`);
await page.screenshot({path: `${OUT}/noisy-albums.png`, fullPage: true});


/*  =================================================================
 *  4. Y lo que sí dice algo se queda como está
 *  ================================================================= */
console.log("4. y lo que dice algo no se toca");

check(titles.includes("Track 06"),
      `"06.mp3" no mejora a "Track 06", así que se queda`);
check(/Various Artists/.test(subs),
      `y "Various Artists" es una respuesta, no un hueco`);
check(titles.includes("across the universe"),
      `un título bueno con un álbum malo conserva el título`);

/*  =================================================================
 *  5. Y una biblioteca YA leída se corrige sin volver a leerla
 *  ================================================================= */
console.log("5. y lo ya leído se corrige al arrancar, sin releer nada");

/*  Arrancar no lee ficheros: restaura los metadatos guardados. Una
    biblioteca leída por una versión anterior tiene el ruido METIDO en
    la base de datos, así que el arreglo no la alcanzaría — y pedir un
    rescan de ocho mil ficheros por un nombre no es un arreglo. Aquí se
    escribe a mano lo que aquella versión habría guardado y se recarga:
    el filtro es función pura de los metadatos y de la RUTA, y la ruta
    está guardada, así que puede correr también a la salida. */
const wrote = await page.evaluate(() => new Promise((resolve, reject) => {
    const req = indexedDB.open("yunomusica");
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
        const db = req.result;
        const ro = db.transaction("source_tags", "readonly").objectStore("source_tags");
        const all = ro.getAll();
        all.onsuccess = () => {
            const row = all.result[0];
            if(!row) { resolve("no row"); return; }
            /*  Exactamente lo que la versión anterior guardaba. */
            for(const pair of row.tags) {
                const path = pair[0], meta = pair[1];
                if(/Jazz Cafe/.test(path)) {
                    meta.title = "AlbumWrap Album";
                    meta.artist = "AlbumWrap - King Crimson";
                    meta.albumArtist = "AlbumWrap - King Crimson";
                    meta.album = "AlbumWrap - Live at the Jazz Cafe";
                    meta.key = "albumwrap - king crimson|albumwrap - live at the jazz cafe";
                } else if(/Close your eyes/.test(path)) {
                    meta.title = "Track 02";
                    meta.track = 0;
                }
            }
            const rw = db.transaction("source_tags", "readwrite").objectStore("source_tags");
            const put = rw.put(row);
            put.onsuccess = () => resolve("ok");
            put.onerror = () => reject(put.error);
        };
        all.onerror = () => reject(all.error);
    };
}));
check(wrote === "ok", `se guarda el ruido de la versión anterior: ${wrote}`);

await boot(page);
await route(page, "#/library", 1200);
await page.locator('.MUS_CHIP:has-text("Todas")').click();
await page.waitForTimeout(800);
const after = await rows();
console.log("   " + after.map((r) => `${r.title} [${r.sub}]`).join("\n   "));
const at = after.map((r) => r.title);
const asub = after.map((r) => r.sub).join(" | ");

check(!at.includes("AlbumWrap Album") && at.includes("Live at the Jazz Cafe"),
      `al arrancar se corrige lo guardado, sin releer el disco`);
check(!/AlbumWrap/i.test(asub), `y el artista también`);
check(at.includes("Close your eyes"), `y "Track 02" otra vez`);
await page.screenshot({path: `${OUT}/noisy-restored.png`, fullPage: true});

if(report(page)) {
    bad = true;
}
await browser.close();
process.exit(bad ? 1 : 0);
