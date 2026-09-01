/***********************************************************************
 *          devmenu.mjs
 *
 *      The toolbar's "more" menu, and the three doors behind it.
 *
 *      What is checked, and why each one is worth a test:
 *
 *        1. The menu offers exactly developer, site map, help — in that
 *           order. A dropdown whose items come from app_config.json is
 *           one typo away from a menu that opens and offers nothing.
 *
 *        2. "Help and credits" links to the source. The dialog says MIT,
 *           and a licence with no address is a claim nobody can act on.
 *
 *        3. "Site map" draws the real navigation surface — it has to
 *           name the four destinations, or it is a map of nothing.
 *
 *        4. "Developer" shows a session log that has ALREADY recorded
 *           this launch. That is the whole point of the black box: it
 *           writes itself, before anyone opens it, so the app stopping
 *           on its own can still be read afterwards.
 *
 *        5. And the log survives a reload with the boot counted twice,
 *           which is the shape of the bug it was built for: on a phone
 *           the app is restarted by the browser and comes back asking
 *           for the folders again, and until now nothing was left
 *           behind to say that it had happened.
 *
 *          Copyright (c) 2026, ArtGins.
 *          All Rights Reserved.
 ***********************************************************************/
import {launch, new_page, boot, route, report, OUT} from "./lib.mjs";
import {join} from "path";

const browser = await launch();
/*  English, so the labels under test are the canonical keys. */
const page = await new_page(browser, {locale: "en-GB"});
await boot(page);

let bad = [];

async function open_menu()
{
    await page.click('[data-toolbar-item-id="more"]');
    await page.waitForTimeout(350);
}

async function shot(name)
{
    await page.screenshot({path: join(OUT, name + ".png")});
}


/*  1. the menu itself */
await open_menu();
const items = await page.locator(".yui-toolbar-dropdown-panel .yui-toolbar-dropdown-label")
    .allTextContents();
console.log("menu:", items.join(" | "));
if(items.join("|") !== "Developer|Site map|Help and credits") {
    bad.push("the menu does not offer developer, site map and help, in that order");
}
await shot("devmenu-menu");


/*  2. help and credits, with somewhere to get the code */
await page.click('.yui-toolbar-dropdown-panel >> text=Help and credits');
await page.waitForTimeout(500);
const src_href = await page.locator(".MUS_ABOUT_SOURCE").getAttribute("href").catch(() => null);
console.log("source link:", src_href);
if(!src_href || !/github\.com\/.+\/yunomusica/.test(src_href)) {
    bad.push("the about dialog has no link to the source code");
}
await shot("devmenu-about");
await page.click(".MUS_ABOUT_CLOSE");
await page.waitForTimeout(300);


/*  3. the site map names the app's destinations */
await open_menu();
await page.click('.yui-toolbar-dropdown-panel >> text=Site map');
await page.waitForTimeout(700);
const map_text = await page.locator(".ROUTEMAP_SHEET, .ROUTEMAP_WINDOW").first()
    .textContent().catch(() => "");
console.log("site map length:", map_text.length);
for(const dest of ["Player", "Lists", "Library", "Sources"]) {
    if(map_text.indexOf(dest) < 0) {
        bad.push("the site map does not name " + dest);
    }
}
await shot("devmenu-sitemap");
await page.keyboard.press("Escape");
await page.waitForTimeout(400);


/*  4. the developer sheet, and a log that wrote itself */
await open_menu();
await page.click('.yui-toolbar-dropdown-panel >> text=Developer');
await page.waitForTimeout(600);

const log = await page.locator(".MUS_DEV_LOG").textContent();
console.log("log lines:", log.split("\n").length);
console.log("log head:", log.split("\n")[0]);
if(log.indexOf("boot") < 0) {
    bad.push("the session log did not record this launch");
}
/*  The sources line is what ties a restart to the folder prompt the
    user actually sees. It must be there even with no folders yet. */
if(log.indexOf("sources") < 0) {
    bad.push("the session log does not record the state of the sources");
}
const verdict = await page.locator(".MUS_DEV_VERDICT").textContent();
console.log("verdict:", verdict.replace(/\s+/g, " ").trim().slice(0, 120));
if(!verdict.trim()) {
    bad.push("the developer sheet reads the log but says nothing about it");
}
await shot("devmenu-log");

/*  the traces pane is fetched on demand — it must arrive */
await page.click('.MUS_DEV_TAB[data-pane="traces"]');
await page.waitForTimeout(1200);
const traces = await page.locator(".MUS_DEV_TRACES .yui-dev-panel").count();
console.log("traces panel:", traces);
if(!traces) {
    bad.push("the traces pane never loaded the framework panel");
}
await shot("devmenu-traces");
await page.keyboard.press("Escape");
await page.waitForTimeout(400);


/*  5. it survives a reload, and counts the launch as a second one */
await page.reload({waitUntil: "networkidle"});
await page.waitForTimeout(1400);
await route(page, "#/player", 400);
await open_menu();
await page.click('.yui-toolbar-dropdown-panel >> text=Developer');
await page.waitForTimeout(600);

const after = await page.locator(".MUS_DEV_LOG").textContent();
const boots = (after.match(/ boot /g) || []).length;
console.log("boots recorded:", boots);
if(boots < 2) {
    bad.push("the log did not survive the reload: " + boots + " boot(s) recorded");
}
/*  A reload the user asked for is not a death: the gap between the last
    heartbeat and the new launch must be small, and that number is the
    whole basis for telling one apart from the other. */
const gap = (after.match(/gap_s=(\d+)/) || [])[1];
console.log("gap on a deliberate reload:", gap);
if(gap === undefined) {
    bad.push("the boot record does not say how long the app was gone");
} else if(Number(gap) > 60) {
    bad.push("a deliberate reload was recorded as a " + gap + "s absence");
}
await shot("devmenu-after-reload");

/*  And the reload must NOT be dressed up as a crash.
 *
 *  This is the failure the panel is one line of code away from at all
 *  times: every launch leaves a boot record with a gap in it, so a
 *  verdict that reads each one as an unexpected stop would cry wolf on
 *  every refresh — and the one real stop would then arrive looking
 *  exactly like the twenty false ones. A hidden tab's timers are
 *  throttled to about one a minute, too, so a short gap is not even
 *  evidence. */
const calm = (await page.locator(".MUS_DEV_VERDICT").innerText()).trim();
console.log("verdict after a deliberate reload:", calm.replace(/\n+/g, " | "));
if(calm.indexOf("No unexpected stop") < 0) {
    bad.push("a reload the user asked for was reported as an unexpected stop");
}

/*  6. the reading of a death.
 *
 *  Everything above exercises the happy path, where the verdict says
 *  "no unexpected stop" — which is the one sentence the sheet can print
 *  without any of the arithmetic being right. So the trip is staged:
 *  a heartbeat that says the music was playing twenty minutes ago, and
 *  a document Chrome marked as discarded. That is exactly the shape of
 *  the report this whole thing was built for, and the sheet has to read
 *  it back in the user's terms. */
await page.evaluate(() => {
    localStorage.setItem("yunomusica_diag_beat", JSON.stringify({
        t: Date.now() - 20 * 60 * 1000,
        playing: true,
        track: "Camel — Lady Fantasy",
        heap: 812,
        vis: "hidden"
    }));
});
/*  document.wasDiscarded is read-only and set by the browser; forged on
    the NEXT document so the discarded branch is exercised too. */
await page.addInitScript(() => {
    Object.defineProperty(document, "wasDiscarded", {value: true, configurable: true});
});
await page.reload({waitUntil: "networkidle"});
await page.waitForTimeout(1500);
await route(page, "#/player", 400);
await open_menu();
await page.click('.yui-toolbar-dropdown-panel >> text=Developer');
await page.waitForTimeout(600);

const death = (await page.locator(".MUS_DEV_VERDICT").innerText()).trim();
console.log("verdict on a staged death:", death.replace(/\n+/g, " | "));
const must = [
    ["stopped and started again", "it does not say the app was stopped"],
    ["threw the app away",        "it does not report the browser's own discard"],
    ["Lady Fantasy",              "it does not say what was playing"],
    ["20 min",                    "it does not say how long the music was off"],
    ["812 MB",                    "it does not carry the last memory figure"],
];
for(const [needle, complaint] of must) {
    if(death.indexOf(needle) < 0) {
        bad.push(complaint);
    }
}
await shot("devmenu-killed");

console.log(bad.length ? "FAIL" : "ok: menu, site map, source link, and a log that reads a death");
bad.forEach((b) => console.log("  >>> " + b));

const errs = report(page);
await browser.close();
process.exit((bad.length || errs) ? 1 : 0);
