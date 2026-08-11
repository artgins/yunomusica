/***********************************************************************
 *          c_musica.js
 *
 *      C_MUSICA — the app's root service (the yuno's default service).
 *      It hosts the declarative shell and owns everything that lives
 *      OUTSIDE the routed views:
 *
 *        - the layout frame: a flex column with the shell on top and a
 *          mini-player docked below it;
 *        - the mini-player itself, which is the transport you keep while
 *          you are away from the deck. On the deck route it hides: the
 *          deck already has full-size controls, and two sets of transport
 *          buttons on one screen is the kind of clutter this redesign was
 *          meant to remove;
 *        - the light/dark theme and the language;
 *        - the welcome / help / credits dialog, shown once and then only
 *          on request;
 *        - loading what was remembered — the authorised sources and the
 *          saved lists — before anything else paints.
 *
 *          Copyright (c) 2026, ArtGins.
 *          All Rights Reserved.
 ***********************************************************************/
import {
    SDATA, SDATA_END, data_type_t,
    gclass_create, log_error,
    gobj_read_attr, gobj_write_attr,
    gobj_create_pure_child,
    gobj_subscribe_event,
    gobj_stop_children,
    gobj_start_tree,
    createElement2, refresh_language,
} from "@yuneta/gobj-js";

import {
    yui_shell_set_translator,
    yui_shell_language_changed,
    yui_shell_navigate,
} from "@yuneta/gobj-ui/src/c_yui_shell.js";

import {
    subscribe, store_state,
    current_track, is_playing, toggle, step, prev,
    seek_fraction, progress, cover_url, setup_media_session,
    cancel_ingest, fmt_time,
    queue_snapshot, restore_queue,
    previewing, stop_preview, queue_add,
    preview_progress, seek_preview_fraction,
} from "./music_store.js";

import {
    load_sources,
    subscribe_sources, scanning_source, is_preparing,
    stop_scan, is_stopping,
} from "./sources_store.js";
import {load_playlists} from "./playlists_store.js";
import {load_stats} from "./stats_store.js";
import {create_visualizer} from "./visualizer.js";
import {pref_get, pref_set} from "./idb.js";

import {switch_locale, current_locale} from "./locales/locales.js";
import {open_about, welcome_dismissed, about_bind_shell} from "./about_dialog.js";
import {start_update_watch} from "./update_check.js";
import {start_install_watch} from "./install_prompt.js";
import {offer_install_when_due} from "./install_dialog.js";

import {t} from "i18next";


/***************************************************************
 *              Constants
 ***************************************************************/
const GCLASS_NAME = "C_MUSICA";

const DECK_ROUTE = "/player";

const svg = (path, size) =>
    `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="currentColor" aria-hidden="true"><path d="${path}"/></svg>`;

const P = {
    prev:  "M6 6h2v12H6zm12 0v12l-9-6z",
    next:  "M16 6h2v12h-2zM6 6l9 6-9 6z",
    play:  "M8 5v14l11-7z",
    pause: "M6 5h4v14H6zm8 0h4v14h-4z",
};


/***************************************************************
 *              Attrs
 ***************************************************************/
const attrs_table = [
SDATA(data_type_t.DTP_JSON,     "config",    0,  null,  "Shell config (app_config.json)"),
SDATA(data_type_t.DTP_BOOLEAN,  "use_hash",  0,  true,  "Pass-through to C_YUI_SHELL"),
SDATA_END()
];

let PRIVATE_DATA = {
    shell:    null,
    $root:    null,     // flex column: shell + player
    $player:  null,
    $scan:    null,     // the "reading your music" bar
    scan_timer: 0,      // ticks the elapsed clock on that bar
    scan_t0:  0,        // when the wait started, from the user's side
    save_timer: 0,      // coalesces storing the deck
    strips:   null,     // ResizeObserver keeping the bottom strips honest
    unsub:    null,
    unsub_src: null,
    tint_key: null,     // last cover a tint was computed from
    on_deck:  true,     // the deck route is showing
    viz:      null,     // the picture behind the mini-player's strip
};

let __gclass__ = null;




                    /******************************
                     *      Framework Methods
                     ******************************/




/***************************************************************
 *          Framework Method: Create
 ***************************************************************/
function mt_create(gobj)
{
    let priv = gobj.priv;

    /*  The frame the shell mounts into (mount_element), so we can dock a
        player below it in the same flex column. */
    let $root = createElement2(["div", {class: "MUS_ROOT"}, []]);
    document.body.appendChild($root);
    priv.$root = $root;

    let shell = gobj_create_pure_child(
        "shell",
        "C_YUI_SHELL",
        {
            config:        gobj_read_attr(gobj, "config"),
            use_hash:      gobj_read_attr(gobj, "use_hash"),
            mount_element: $root
        },
        gobj
    );
    priv.shell = shell;

    /*  Toolbar-published events we act on. */
    gobj_subscribe_event(shell, "EV_TOGGLE_THEME", {}, gobj);
    gobj_subscribe_event(shell, "EV_SET_PALETTE",  {}, gobj);
    gobj_subscribe_event(shell, "EV_SET_LOCALE",   {}, gobj);
    gobj_subscribe_event(shell, "EV_OPEN_ABOUT",   {}, gobj);
    gobj_subscribe_event(shell, "EV_ROUTE_CHANGED",{}, gobj);

    yui_shell_set_translator(shell, t);
    about_bind_shell(shell);
}

/***************************************************************
 *          Framework Method: Start
 ***************************************************************/
function mt_start(gobj)
{
    let priv = gobj.priv;

    apply_theme(current_theme());
    apply_palette(current_palette());
    gobj_start_tree(priv.shell);

    /*  The shell and the nav emit their labels as i18n KEYS and are only
        translated by a refresh pass. At start up nobody has run one yet,
        so the toolbar and the nav would sit there reading "player",
        "library"… — indistinguishable from missing keys. */
    yui_shell_language_changed(priv.shell);

    /*  Build the player AFTER the shell mounted its $container into
        $root, so the player docks below it. */
    build_player(gobj);
    setup_media_session();

    priv.unsub = subscribe(function(channel) {
        if(channel === "playing" || channel === "queue") {
            paint_player(gobj);
        } else if(channel === "time") {
            paint_time(gobj);
        } else if(channel === "loading") {
            paint_scan(gobj);
        } else if(channel === "preview") {
            paint_player(gobj);
        }
        if(channel === "queue" || channel === "playing") {
            save_queue_soon(gobj);
        }
    });
    /*  A scan starts before the first file is read (walking a big tree
        takes a while on its own), so the bar has to follow the SOURCE
        state, not only the read counter. */
    priv.unsub_src = subscribe_sources(() => paint_scan(gobj));

    paint_player(gobj);
    paint_scan(gobj);

    boot(gobj);
}

/***************************************************************
 *          Framework Method: Stop
 ***************************************************************/
function mt_stop(gobj)
{
    let priv = gobj.priv;
    if(priv.unsub) {
        priv.unsub();
        priv.unsub = null;
    }
    if(priv.unsub_src) {
        priv.unsub_src();
        priv.unsub_src = null;
    }
    if(priv.scan_timer) {
        clearInterval(priv.scan_timer);
        priv.scan_timer = 0;
    }
    if(priv.strips) {
        priv.strips.disconnect();
        priv.strips = null;
    }
    gobj_stop_children(gobj);
}

/***************************************************************
 *          Framework Method: Destroy
 ***************************************************************/
function mt_destroy(gobj)
{
    let priv = gobj.priv;
    if(priv.$root && priv.$root.parentNode) {
        priv.$root.parentNode.removeChild(priv.$root);
    }
    priv.$root = null;
}




                    /***************************
                     *      Boot
                     ***************************/




/***************************************************************
 *  Bring back what was remembered, then decide whether the
 *  welcome dialog is due. Both are async and neither blocks the
 *  first paint: the views repaint on the store channels as the
 *  sources come in.
 ***************************************************************/
async function boot(gobj)
{
    let priv = gobj.priv;

    start_update_watch();
    start_install_watch();

    await load_playlists();
    await load_stats();
    await load_sources();

    /*  The deck as it was left: which list, which track, how far in. */
    let snap = await pref_get("queue", null);
    if(snap) {
        restore_queue(snap);
    }

    /*  The welcome first, the install question after it — never both at
        once, and never the install question in front of an app the user
        has not seen yet. */
    let dismissed = await welcome_dismissed();
    if(!dismissed) {
        open_about(priv.shell, true, () => offer_install_when_due(priv.shell));
    } else {
        offer_install_when_due(priv.shell);
    }
}




/***************************************************************
 *  Store the deck, coalesced. Playback emits on every play and
 *  pause, and the position matters too, so this is written on a
 *  timer rather than on every event — and once more on the way
 *  out, which is the moment that actually has to be right.
 ***************************************************************/
function save_queue_soon(gobj)
{
    let priv = gobj.priv;
    if(priv.save_timer) {
        return;
    }
    priv.save_timer = setTimeout(function() {
        priv.save_timer = 0;
        pref_set("queue", queue_snapshot());
    }, 1500);
}


                    /***************************
                     *      Theme
                     ***************************/




const PALETTES = {auto: 1, gold: 1, ice: 1, rose: 1, leaf: 1};

/*  "auto" means the accent follows the cover art, which is what the app
    did before there were palettes — so it stays the default. */
function current_palette()
{
    let p = "";
    try {
        p = localStorage.getItem("yunomusica:palette") || "";
    } catch(e) {
        p = "";
    }
    return PALETTES[p] ? p : "auto";
}

function apply_palette(name)
{
    let v = PALETTES[name] ? name : "auto";
    document.documentElement.setAttribute("data-palette", v);
    try {
        localStorage.setItem("yunomusica:palette", v);
    } catch(e) {
        /*  Private mode: the choice still holds for this page load. */
    }
    /*  A fixed palette is a CSS variable; the inline one the tint may
        have written would win over it, so clear it. */
    if(v !== "auto") {
        document.documentElement.style.removeProperty("--mus-accent");
        document.documentElement.style.removeProperty("--mus-accent-soft");
    }
    return v;
}

function current_theme()
{
    return document.documentElement.getAttribute("data-theme") === "dark"
        ? "dark" : "light";
}

function apply_theme(theme)
{
    let v = (theme === "dark") ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", v);
    try {
        localStorage.setItem("myst:theme", v);
    } catch(e) {
        /*  Private mode: the theme still applies for this page load. */
    }
    return v;
}




                    /***************************
                     *      The mini-player
                     ***************************/




function build_player(gobj)
{
    let priv = gobj.priv;

    let $player = createElement2(
        ["div", {class: "MUS_PLAYER"}, [
            ["div", {class: "MUS_SEEK"}, [["i", {class: "MUS_SEEK_FILL"}]],
                {click: (ev) => seek_at(ev, ev.currentTarget)}],
            ["div", {class: "MUS_PBAR"}, [
                ["button", {
                        class: "MUS_PART",
                        type: "button",
                        "aria-label": t("player"),
                        "data-i18n-aria-label": "player"
                    }, "♪",
                    {click: () => go_to_deck(gobj)}],
                ["button", {
                        class: "MUS_PMETA",
                        type: "button",
                        "aria-label": t("player"),
                        "data-i18n-aria-label": "player"
                    }, [
                    ["span", {class: "MUS_PTITLE"}, "—"],
                    ["span", {class: "MUS_PARTIST"}, ""]
                ], {click: () => go_to_deck(gobj)}],
                ["div", {class: "MUS_PCTL"}, [
                    ["button", {class: "MUS_PPREV", type: "button",
                                "aria-label": t("previous"),
                                "data-i18n-aria-label": "previous"},
                        svg(P.prev, 20), {click: () => prev()}],
                    ["button", {class: "MUS_PPLAY is-primary", type: "button",
                                "aria-label": t("play"),
                                "data-i18n-aria-label": "play"},
                        svg(P.play, 19), {click: () => toggle()}],
                    ["button", {class: "MUS_PNEXT", type: "button",
                                "aria-label": t("next"),
                                "data-i18n-aria-label": "next"},
                        svg(P.next, 20), {click: () => step(1)}]
                ]]
            ]]
        ]]
    );
    /*  The same picture as the deck's, behind the whole strip.
     *
     *  Behind it rather than beside it because there is nowhere to put
     *  a box: the strip is 68 pixels tall and on a phone its width is
     *  already spoken for by the cover, the name and three buttons. A
     *  layer costs none of that, works at any width, and keeps the one
     *  thing the strip is for — the tap that takes you to the deck.
     *
     *  It goes in FIRST, so everything built above sits over it, and
     *  outside .MUS_PBAR, which paint_preview rebuilds. */
    priv.viz = create_visualizer({tap: false, cls: "MUS_VIZ_MINI"});
    $player.insertBefore(priv.viz.$el, $player.firstChild);

    priv.$player = $player;
    priv.$root.appendChild($player);

    /*  Reading a big folder takes real time. It used to say so in one
        small grey line, on the Sources screen only — so anyone who
        started a scan and walked to another screen was left with no
        sign that anything was happening at all. This bar is docked
        above the player and shows on EVERY screen while a scan runs. */
    let $scan = createElement2(
        ["div", {class: "MUS_SCANBAR", role: "status", "aria-live": "polite"}, [
            ["div", {class: "MUS_SCAN_BODY"}, [
                ["div", {class: "MUS_SCAN_LINE"}, [
                    ["span", {class: "MUS_SPINNER", "aria-hidden": "true"}],
                    ["span", {class: "MUS_SCAN_LABEL", i18n: "reading tags"},
                        t("reading tags")],
                    ["span", {class: "MUS_SCAN_WHAT"}, ""],
                    ["span", {class: "MUS_SCAN_CLOCK"}, "0:00"],
                    ["span", {class: "MUS_SCAN_COUNT"}, ""],
                    /*  A read the user cannot end is a trap. Stopping
                        keeps whatever was read; it does not undo it. */
                    ["button", {
                            class: "MUS_SCAN_STOP",
                            type: "button",
                            i18n: "stop",
                            "aria-label": t("stop"),
                            "data-i18n-aria-label": "stop"
                        }, t("stop"), {click: () => stop_scan()}]
                ]],
                ["div", {class: "MUS_BAR"}, [["i", {class: "MUS_BAR_FILL"}]]],
                ["div", {class: "MUS_SCAN_FILE"}, ""]
            ]]
        ]]
    );
    priv.$scan = $scan;
    priv.$root.appendChild($scan);

    /*  MEASURE the bottom strips instead of hard-coding how tall they
        are. The shell gives up exactly this much room, so a guess that
        is too small clips the strip — which is what happened to the
        "this can take a while" line, and once before to the player,
        which ate 5px of the bottom nav. The height also depends on the
        language: the same sentence wraps to two lines in German and one
        in Chinese. */
    if(typeof ResizeObserver !== "undefined") {
        priv.strips = new ResizeObserver(function() {
            priv.$root.style.setProperty("--mus-player-h",
                priv.$player.offsetHeight + "px");
            priv.$root.style.setProperty("--mus-scan-h",
                $scan.offsetHeight + "px");
        });
        priv.strips.observe($scan);
        priv.strips.observe(priv.$player);
    }

    /*  The position moves without any event worth storing on, and the
        tab can go away at any moment. */
    window.addEventListener("pagehide", function() {
        pref_set("queue", queue_snapshot());
    });
    document.addEventListener("visibilitychange", function() {
        if(document.visibilityState === "hidden") {
            pref_set("queue", queue_snapshot());
        }
    });

    /*  Keyboard transport, ignored while typing. */
    document.addEventListener("keydown", (e) => {
        let tag = e.target && e.target.tagName;
        if(tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
            return;
        }
        if(e.code === "Space") { e.preventDefault(); toggle(); }
        else if(e.code === "ArrowRight") { step(1); }
        else if(e.code === "ArrowLeft") { prev(); }
    });
}

function go_to_deck(gobj)
{
    let priv = gobj.priv;
    if(priv.shell) {
        yui_shell_navigate(priv.shell, DECK_ROUTE);
    }
}

function seek_at(ev, node)
{
    let r = node.getBoundingClientRect();
    let x = (ev.touches ? ev.touches[0].clientX : ev.clientX) - r.left;
    let f = getComputedStyle(node).direction === "rtl"
        ? 1 - (x / r.width)
        : (x / r.width);
    f = r.width ? f : 0;
    /*  Seek what is sounding. During a preview that is the preview, not
        the queue track paused behind it. */
    if(previewing()) {
        seek_preview_fraction(f);
    } else {
        seek_fraction(f);
    }
}


function paint_player(gobj)
{
    let priv = gobj.priv;
    /*  EV_ROUTE_CHANGED lands during gobj_start_tree, which is BEFORE
        build_player: the first route is resolved while the shell is
        still starting. Nothing to paint yet. */
    if(!priv.$player) {
        return;
    }
    /*  A preview takes over this strip. It is a different thing from the
        queue — it changed nothing and committed to nothing — so it says
        so, and offers the one decision worth offering: keep it or drop
        it. It shows on every route, including the deck, because it is
        the only sign that the sound you hear is not the queue. */
    let prev_track = previewing();
    if(prev_track) {
        paint_preview(gobj, prev_track);
        run_viz(gobj, true);
        return;
    }
    priv.$player.classList.remove("is-preview");

    let track = current_track();

    /*  Show the strip only when there is something to play AND we are
        not already looking at the deck. */
    let show = !!track && !priv.on_deck;
    priv.$root.classList.toggle("has-player", show);
    priv.$player.classList.toggle("is-on", show);
    run_viz(gobj, show);

    if(!track) {
        priv.tint_key = null;
        clear_accent();
        return;
    }

    let url = cover_url(track.key);
    set_text(priv.$player, ".MUS_PTITLE", track.title);
    set_text(priv.$player, ".MUS_PARTIST", track.artist);
    paint_art(priv.$player.querySelector(".MUS_PART"), url);

    /*  Coming back from a preview: the controls were replaced, so put
        the transport back before painting it. */
    if(!priv.$player.querySelector(".MUS_PPLAY")) {
        rebuild_transport(gobj);
    }

    let playing = is_playing();
    let $play = priv.$player.querySelector(".MUS_PPLAY");
    if($play) {
        $play.innerHTML = svg(playing ? P.pause : P.play, 19);
        $play.setAttribute("aria-label", t(playing ? "pause" : "play"));
        $play.setAttribute("data-i18n-aria-label", playing ? "pause" : "play");
    }

    tint_from(gobj, track.key, url);
    paint_time(gobj);
}

/***************************************************************
 *  The scan bar. Shown while a source is being read, from
 *  whichever screen the user happens to be on.
 ***************************************************************/
function paint_scan(gobj)
{
    let priv = gobj.priv;
    if(!priv.$scan) {
        return;
    }
    let src = scanning_source();
    let preparing = is_preparing();
    let on = preparing || !!src || store_state.loading;

    priv.$root.classList.toggle("is-scanning", on);
    priv.$scan.classList.toggle("is-on", on);
    priv.$scan.classList.toggle("is-preparing", preparing);

    /*  The clock has to tick on its own. Repaints are driven by files
        being read, so a slow file — or a folder still being handed over,
        which reads nothing at all — would freeze the one number that
        tells the user the app is still alive.

        And it is started HERE, when the bar appears, not when the tag
        reading starts: the user is waiting from the moment the folder is
        picked, through the browser handing it over and the tree being
        walked. Timing only the last phase left it sitting at 0:00 for
        the whole of the first one. */
    if(on && !priv.scan_timer) {
        priv.scan_t0 = Date.now();
        priv.scan_timer = setInterval(() => paint_scan_clock(gobj), 500);
    } else if(!on && priv.scan_timer) {
        clearInterval(priv.scan_timer);
        priv.scan_timer = 0;
        priv.scan_t0 = 0;
    }
    if(!on) {
        return;
    }
    paint_scan_clock(gobj);

    /*  Two phases, and they fail differently, so they say different
        things: the browser handing the folder over (opaque, no numbers,
        nothing to stop), then our own read (counted, stoppable). */
    let label_key = preparing ? "preparing folder" : "reading tags";
    let $label = priv.$scan.querySelector(".MUS_SCAN_LABEL");
    if($label) {
        $label.textContent = t(label_key);
        $label.setAttribute("data-i18n", label_key);
    }

    set_text(priv.$scan, ".MUS_SCAN_WHAT", (!preparing && src) ? src.name : "");

    /*  The loop can only break between files, so acknowledge the press
        at once instead of leaving the button looking untouched. */
    let stopping = is_stopping();
    let $stop = priv.$scan.querySelector(".MUS_SCAN_STOP");
    if($stop) {
        let key = stopping ? "stopping" : "stop";
        $stop.textContent = t(key);
        $stop.setAttribute("data-i18n", key);
        $stop.setAttribute("data-i18n-aria-label", key);
        $stop.setAttribute("aria-label", t(key));
        $stop.disabled = stopping;
    }

    let total = preparing ? 0 : (store_state.total || 0);
    let done = store_state.loaded || 0;
    set_text(priv.$scan, ".MUS_SCAN_COUNT", total ? `${done} / ${total}` : "");

    let $fill = priv.$scan.querySelector(".MUS_BAR_FILL");
    if($fill) {
        /*  No total yet: the folder is still being handed over, or the
            tree is still being walked. Sweep rather than claim 0%. */
        $fill.style.width = total ? ((done / total) * 100) + "%" : "";
        $fill.classList.toggle("is-indeterminate", !total);
    }

    /*  While there are no numbers to show, warn that the wait is normal
        and can be long — that gap is where the app looked hung. */
    priv.$scan.classList.toggle("is-waiting", !total);
    let $sub = priv.$scan.querySelector(".MUS_SCAN_FILE");
    if($sub) {
        if(total) {
            $sub.textContent = store_state.load_name || "";
            $sub.removeAttribute("data-i18n");
        } else {
            $sub.textContent = t("this can take a while");
            $sub.setAttribute("data-i18n", "this can take a while");
        }
    }
}

function paint_scan_clock(gobj)
{
    let priv = gobj.priv;
    if(!priv.$scan || !priv.scan_t0) {
        return;
    }
    set_text(priv.$scan, ".MUS_SCAN_CLOCK",
        fmt_time((Date.now() - priv.scan_t0) / 1000));
}

/***************************************************************
 *  The strip in preview mode: what is being auditioned, and the
 *  two things you can do about it.
 ***************************************************************/
/*  The strip's layer runs only when the strip is up AND something is
    sounding. Off-screen it is an animation frame a second spent on a
    canvas nobody can see, which on a phone is a battery bill. */
function run_viz(gobj, visible)
{
    let priv = gobj.priv;
    if(!priv.viz) {
        return;
    }
    if(visible && (is_playing() || previewing())) {
        priv.viz.start();
    } else {
        priv.viz.stop();
    }
}

function paint_preview(gobj, track)
{
    let priv = gobj.priv;

    priv.$root.classList.add("has-player");
    priv.$player.classList.add("is-on", "is-preview");

    set_text(priv.$player, ".MUS_PTITLE", track.title);
    set_text(priv.$player, ".MUS_PARTIST", t("previewing") + " · " + track.artist);
    paint_art(priv.$player.querySelector(".MUS_PART"), cover_url(track.key));

    let $ctl = priv.$player.querySelector(".MUS_PCTL");
    if(!$ctl) {
        return;
    }
    $ctl.innerHTML = "";
    $ctl.appendChild(createElement2(
        ["button", {class: "MUS_QBTN button is-primary", type: "button",
                    i18n: "add to queue"},
            t("add to queue"), {click: () => {
                queue_add([track], "append");
                stop_preview();
            }}]));
    $ctl.appendChild(createElement2(
        ["button", {class: "MUS_QBTN button is-ghost", type: "button",
                    i18n: "stop"},
            t("stop"), {click: () => stop_preview()}]));
    refresh_language(priv.$player, t);
    paint_time(gobj);
}

function paint_art($node, url)
{
    if(!$node) {
        return;
    }
    $node.innerHTML = "";
    if(url) {
        let img = document.createElement("img");
        img.src = url;
        img.alt = "";
        $node.appendChild(img);
        $node.classList.add("has-art");
    } else {
        $node.textContent = "♪";
        $node.classList.remove("has-art");
    }
}

function rebuild_transport(gobj)
{
    let priv = gobj.priv;
    let $ctl = priv.$player.querySelector(".MUS_PCTL");
    if(!$ctl) {
        return;
    }
    $ctl.innerHTML = "";
    const btn = (cls, path, key, on_click) => createElement2(
        ["button", {class: cls, type: "button",
                    "aria-label": t(key), "data-i18n-aria-label": key},
            svg(path, 20), {click: on_click}]);
    $ctl.appendChild(btn("MUS_PPREV", P.prev, "previous", () => prev()));
    $ctl.appendChild(btn("MUS_PPLAY is-primary", P.play, "play", () => toggle()));
    $ctl.appendChild(btn("MUS_PNEXT", P.next, "next", () => step(1)));
}

function paint_time(gobj)
{
    let priv = gobj.priv;
    if(!priv.$player) {
        return;
    }
    let $fill = priv.$player.querySelector(".MUS_SEEK_FILL");
    if($fill) {
        let p = previewing() ? preview_progress() : progress();
        $fill.style.width = (p.fraction * 100) + "%";
    }
}

function set_text($root, sel, text)
{
    let $n = $root.querySelector(sel);
    if($n) {
        $n.textContent = text;
    }
}


/***************************************************************
 *  Accent tint from the dominant colour of the cover.
 *  Sets --mus-accent / --mus-accent-soft on <html>; the player,
 *  the rows and the primary buttons read them.
 ***************************************************************/
function tint_from(gobj, key, url)
{
    let priv = gobj.priv;
    /*  A chosen palette is a choice; the cover does not get to overrule
        it. Only "from the cover" lets the artwork drive the accent. */
    if(current_palette() !== "auto") {
        return;
    }
    if(priv.tint_key === key) {
        return;                 // same album: nothing to recompute
    }
    priv.tint_key = key;

    if(!url) {
        clear_accent();
        return;
    }
    let img = new Image();
    img.onload = function() {
        try {
            let cv = document.createElement("canvas");
            cv.width = cv.height = 12;
            let ctx = cv.getContext("2d", {willReadFrequently:true});
            ctx.drawImage(img, 0, 0, 12, 12);
            let d = ctx.getImageData(0,0,12,12).data;
            let best = null, bestScore = -1;
            for(let i = 0; i < d.length; i += 4) {
                let r = d[i], g = d[i+1], b = d[i+2];
                let mx = Math.max(r,g,b), mn = Math.min(r,g,b);
                let sat = mx === 0 ? 0 : (mx - mn) / mx;
                let lum = (mx + mn) / 510;
                let score = sat * (1 - Math.abs(lum - 0.55));
                if(score > bestScore) { bestScore = score; best = [r,g,b]; }
            }
            if(best) {
                set_accent(lift(best));
            }
        } catch(e) {
            clear_accent();
        }
    };
    img.onerror = function() { clear_accent(); };
    img.src = url;
}

function lift([r,g,b])
{
    let mx = Math.max(r,g,b) || 1;
    let k = 235 / mx;
    let f = (v) => Math.round(Math.min(235, 60 + (v * k) * 0.78));
    return "rgb(" + f(r) + "," + f(g) + "," + f(b) + ")";
}

function set_accent(c)
{
    /*  Only the accent: --mus-accent-soft is derived from it in CSS, so
        there is one thing to set and no way for the two to disagree. */
    document.documentElement.style.setProperty("--mus-accent", c);
}

/*  Back to whatever the stylesheet says for the current palette. */
function clear_accent()
{
    document.documentElement.style.removeProperty("--mus-accent");
    document.documentElement.style.removeProperty("--mus-accent-soft");
}




                    /***************************
                     *      Actions
                     ***************************/




function ac_toggle_theme(gobj, event, kw, src)
{
    apply_theme(current_theme() === "dark" ? "light" : "dark");
    return 0;
}

/*  The language menu items carry their code in the action kw. */
function ac_set_palette(gobj, event, kw, src)
{
    apply_palette((kw && kw.palette) || "auto");
    /*  Leaving "from the cover" means the tint has to stop overriding
        the choice; entering it means the current cover should take
        over again straight away. */
    gobj.priv.tint_key = null;
    paint_player(gobj);
    return 0;
}

function ac_set_locale(gobj, event, kw, src)
{
    let code = (kw && kw.locale) || "";
    if(!code || code === current_locale()) {
        return 0;
    }
    switch_locale(code);

    /*  The shell re-translates every node that carries its key and then
        publishes EV_LANGUAGE_CHANGED, which the views listen to so they
        can rebuild what they composed with t(). */
    yui_shell_language_changed(gobj.priv.shell);
    refresh_language(gobj.priv.$player, t);
    return 0;
}

function ac_open_about(gobj, event, kw, src)
{
    open_about(gobj.priv.shell, false);
    return 0;
}

function ac_route_changed(gobj, event, kw, src)
{
    let route = (kw && (kw.base || kw.route)) || "";
    gobj.priv.on_deck = (route === DECK_ROUTE);
    paint_player(gobj);
    return 0;
}




/***************************************************************
 *              FSM
 ***************************************************************/
const gmt = {
    mt_create:  mt_create,
    mt_start:   mt_start,
    mt_stop:    mt_stop,
    mt_destroy: mt_destroy
};

function create_gclass(gclass_name)
{
    if(__gclass__) {
        log_error(`GClass ALREADY created: ${gclass_name}`);
        return -1;
    }

    const states = [
        ["ST_IDLE", [
            ["EV_TOGGLE_THEME",  ac_toggle_theme,  null],
            ["EV_SET_PALETTE",   ac_set_palette,   null],
            ["EV_SET_LOCALE",    ac_set_locale,    null],
            ["EV_OPEN_ABOUT",    ac_open_about,    null],
            ["EV_ROUTE_CHANGED", ac_route_changed, null]
        ]]
    ];

    const event_types = [
        ["EV_TOGGLE_THEME",  0],
        ["EV_SET_PALETTE",   0],
        ["EV_SET_LOCALE",    0],
        ["EV_OPEN_ABOUT",    0],
        ["EV_ROUTE_CHANGED", 0]
    ];

    __gclass__ = gclass_create(
        gclass_name,
        event_types,
        states,
        gmt,
        0,
        attrs_table,
        PRIVATE_DATA,
        0,
        0,
        0,
        0
    );
    if(!__gclass__) {
        return -1;
    }
    return 0;
}

function register_c_musica()
{
    return create_gclass(GCLASS_NAME);
}

export {register_c_musica};
