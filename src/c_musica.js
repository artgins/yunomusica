/***********************************************************************
 *          c_musica.js
 *
 *      C_MUSICA — the app's root service (the yuno's default service).
 *      It hosts the declarative shell and owns everything that lives
 *      OUTSIDE the routed views:
 *
 *        - the layout frame: a flex column with the shell on top and a
 *          mini-player docked below it, so on mobile the player sits
 *          above the bottom nav with no fixed-position guesswork;
 *        - the mini-player and the full-screen "now playing" sheet, both
 *          driven by the shared music_store;
 *        - the light/dark theme (the toolbar's EV_TOGGLE_THEME);
 *        - the two "load music" toolbar events (EV_PICK_DIR / EV_PICK_FILES);
 *        - tinting the accent from the current cover.
 *
 *      The player markup and the cover-tint are ported from the reference
 *      musica.html; here they are built with createElement2 and fed by the
 *      store's "playing"/"time" channels instead of inline globals.
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
    createElement2,
} from "@yuneta/gobj-js";

import {
    yui_shell_set_translator,
} from "@yuneta/gobj-ui/src/c_yui_shell.js";

import {
    subscribe,
    current_track, is_playing, queue_position,
    toggle, step, prev, seek_fraction,
    set_shuffle, set_repeat, progress, fmt_time,
    cover_url, store_state, setup_media_session,
} from "./music_store.js";

import {pick_files, pick_dir} from "./picker.js";

import {t} from "i18next";


/***************************************************************
 *              Constants
 ***************************************************************/
const GCLASS_NAME = "C_MUSICA";

const svg = (path, size) =>
    `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="currentColor"><path d="${path}"/></svg>`;

const P = {
    prev:    "M6 6h2v12H6zm12 0v12l-9-6z",
    next:    "M16 6h2v12h-2zM6 6l9 6-9 6z",
    play:    "M8 5v14l11-7z",
    pause:   "M6 5h4v14H6zm8 0h4v14h-4z",
    shuffle: "M17 3v3h-2.2l-2.4 3.2 1.3 1.7L16 8h1v3l4-4-4-4zM3 6h4.4l1.9 2.5 1.3-1.7L8.4 4H3v2zm14 9h-1l-2.6-3.4-1.3 1.7 2.4 3.2H17v3l4-4-4-4v3.5zM3 18h5.4l7-9.3-1.3-1.7L7.4 16H3v2z",
    repeat:  "M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z",
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
    $now:     null,
    unsub:    null,
    tint_key: null,     // last cover a tint was computed from
    touch_y:  null,     // "now" sheet swipe-down start
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
    gobj_subscribe_event(shell, "EV_PICK_DIR",     {}, gobj);
    gobj_subscribe_event(shell, "EV_PICK_FILES",   {}, gobj);

    yui_shell_set_translator(shell, t);
}

/***************************************************************
 *          Framework Method: Start
 ***************************************************************/
function mt_start(gobj)
{
    let priv = gobj.priv;

    apply_theme(current_theme());
    gobj_start_tree(priv.shell);

    /*  Build the player + sheet AFTER the shell mounted its $container
        into $root, so the player docks below it. */
    build_player(gobj);
    setup_media_session();

    priv.unsub = subscribe(function(channel) {
        if(channel === "playing") {
            paint_player(gobj);
        } else if(channel === "time") {
            paint_time(gobj);
        }
    });
    paint_player(gobj);
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
                     *      Theme
                     ***************************/




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
                     *      Player + now sheet
                     ***************************/




/***************************************************************
 *  Build the mini-player (docked below the shell) and the full
 *  "now playing" sheet (a fixed overlay). Both start hidden.
 ***************************************************************/
function build_player(gobj)
{
    let priv = gobj.priv;

    /*  --- mini-player --- */
    let $player = createElement2(
        ["div", {class: "MUS_PLAYER"}, [
            ["div", {class: "MUS_SEEK"}, [["i", {class: "MUS_SEEK_FILL"}]],
                {click: (ev) => seek_at(ev, ev.currentTarget)}],
            ["div", {class: "MUS_PBAR"}, [
                ["div", {class: "MUS_PART"}, "♪",
                    {click: () => open_now(gobj)}],
                ["div", {class: "MUS_PMETA"}, [
                    ["div", {class: "MUS_PTITLE"}, "—"],
                    ["div", {class: "MUS_PARTIST"}, ""]
                ], {click: () => open_now(gobj)}],
                ["div", {class: "MUS_PCTL"}, [
                    ["button", {class: "MUS_PPREV", type: "button", "aria-label": "Anterior"},
                        svg(P.prev, 20), {click: () => prev()}],
                    ["button", {class: "MUS_PPLAY is-primary", type: "button", "aria-label": "Reproducir"},
                        svg(P.play, 19), {click: () => toggle()}],
                    ["button", {class: "MUS_PNEXT", type: "button", "aria-label": "Siguiente"},
                        svg(P.next, 20), {click: () => step(1)}]
                ]]
            ]]
        ]]
    );
    priv.$player = $player;
    priv.$root.appendChild($player);

    /*  --- now playing sheet --- */
    let $now = createElement2(
        ["div", {class: "MUS_NOW"}, [
            ["div", {class: "MUS_GRAB"}],
            ["div", {class: "MUS_NOWART"}, "♪"],
            ["h3", {class: "MUS_NOWTITLE"}, "—"],
            ["p", {class: "MUS_NOWARTIST"}, ""],
            ["div", {class: "MUS_NOWSEEK"}, [["i", {class: "MUS_NOWSEEK_FILL"}]],
                {click: (ev) => seek_at(ev, ev.currentTarget)}],
            ["div", {class: "MUS_TIMES"}, [
                ["span", {class: "MUS_TCUR"}, "0:00"],
                ["span", {class: "MUS_TTOT"}, "0:00"]
            ]],
            ["div", {class: "MUS_NCTL"}, [
                ["button", {class: "MUS_SHUFFLE MUS_TOG", type: "button", "aria-label": "Aleatorio"},
                    svg(P.shuffle, 19), {click: (ev) => toggle_shuffle(ev)}],
                ["button", {class: "MUS_NPREV", type: "button", "aria-label": "Anterior"},
                    svg(P.prev, 26), {click: () => prev()}],
                ["button", {class: "MUS_NPLAY is-primary", type: "button", "aria-label": "Reproducir"},
                    svg(P.play, 28), {click: () => toggle()}],
                ["button", {class: "MUS_NNEXT", type: "button", "aria-label": "Siguiente"},
                    svg(P.next, 26), {click: () => step(1)}],
                ["button", {class: "MUS_REPEAT MUS_TOG", type: "button", "aria-label": "Repetir"},
                    svg(P.repeat, 19), {click: (ev) => toggle_repeat(ev)}]
            ]],
            ["div", {class: "MUS_NFOOT"}, [
                ["span", {class: "MUS_QPOS"}, ""],
                ["button", {class: "MUS_CLOSENOW button is-ghost", type: "button"}, "Cerrar",
                    {click: () => close_now(gobj)}]
            ]]
        ]]
    );
    priv.$now = $now;
    document.body.appendChild($now);

    /*  Swipe the sheet down to close (touch), like the reference. */
    $now.addEventListener("touchstart", (e) => { priv.touch_y = e.touches[0].clientY; }, {passive:true});
    $now.addEventListener("touchend", (e) => {
        if(priv.touch_y !== null && e.changedTouches[0].clientY - priv.touch_y > 90) {
            close_now(gobj);
        }
        priv.touch_y = null;
    }, {passive:true});

    /*  Keyboard transport (ignored while typing in an input). */
    document.addEventListener("keydown", (e) => {
        if(e.target && e.target.tagName === "INPUT") {
            return;
        }
        if(e.code === "Space") { e.preventDefault(); toggle(); }
        else if(e.code === "ArrowRight") { step(1); }
        else if(e.code === "ArrowLeft") { prev(); }
    });
}

function open_now(gobj)
{
    if(current_track()) {
        gobj.priv.$now.classList.add("is-open");
    }
}

function close_now(gobj)
{
    gobj.priv.$now.classList.remove("is-open");
}

function toggle_shuffle(ev)
{
    let on = !ev.currentTarget.classList.contains("is-on");
    ev.currentTarget.classList.toggle("is-on", on);
    set_shuffle(on);
}

function toggle_repeat(ev)
{
    let on = !ev.currentTarget.classList.contains("is-on");
    ev.currentTarget.classList.toggle("is-on", on);
    set_repeat(on);
}

function seek_at(ev, node)
{
    let r = node.getBoundingClientRect();
    let x = (ev.touches ? ev.touches[0].clientX : ev.clientX) - r.left;
    seek_fraction(r.width ? (x / r.width) : 0);
}


/***************************************************************
 *  Paint the track-dependent parts of the player + sheet.
 ***************************************************************/
function paint_player(gobj)
{
    let priv = gobj.priv;
    let track = current_track();

    /*  Show the chrome only once there is something to play. The root
        class both reveals the player and hands it the shell's bottom
        strip (see musica.css). */
    let has = !!track;
    priv.$root.classList.toggle("has-player", has);
    priv.$player.classList.toggle("is-on", has);
    if(!has) {
        close_now(gobj);
        return;
    }

    let url = cover_url(track.key);

    set_text(priv.$player, ".MUS_PTITLE", track.title);
    set_text(priv.$player, ".MUS_PARTIST", track.artist);
    set_text(priv.$now, ".MUS_NOWTITLE", track.title);
    set_text(priv.$now, ".MUS_NOWARTIST", track.artist + " · " + track.album);

    let qp = queue_position();
    set_text(priv.$now, ".MUS_QPOS", (qp.index + 1) + " / " + qp.length);

    paint_art(priv.$player.querySelector(".MUS_PART"), url);
    paint_art(priv.$now.querySelector(".MUS_NOWART"), url);

    /*  Play / pause glyph across both surfaces. */
    let playing = is_playing();
    priv.$player.querySelector(".MUS_PPLAY").innerHTML = svg(playing ? P.pause : P.play, 19);
    priv.$now.querySelector(".MUS_NPLAY").innerHTML = svg(playing ? P.pause : P.play, 28);

    tint_from(gobj, track.key, url);
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


/***************************************************************
 *  Paint the position-dependent parts (cheap; fires on timeupdate).
 ***************************************************************/
function paint_time(gobj)
{
    let priv = gobj.priv;
    let p = progress();
    let pct = (p.fraction * 100) + "%";

    let f1 = priv.$player.querySelector(".MUS_SEEK_FILL");
    let f2 = priv.$now.querySelector(".MUS_NOWSEEK_FILL");
    if(f1) { f1.style.width = pct; }
    if(f2) { f2.style.width = pct; }

    set_text(priv.$now, ".MUS_TCUR", fmt_time(p.current));
    set_text(priv.$now, ".MUS_TTOT", fmt_time(p.duration));
}

function set_text($root, sel, text)
{
    let $n = $root.querySelector(sel);
    if($n) {
        $n.textContent = text;
    }
}


/***************************************************************
 *  Accent tint from the dominant colour of the cover (ported from
 *  musica.html). Sets --mus-accent / --mus-accent-soft on <html>;
 *  the player, the rows and the primary buttons read them.
 ***************************************************************/
function tint_from(gobj, key, url)
{
    let priv = gobj.priv;
    if(priv.tint_key === key) {
        return;                 // same album: nothing to recompute
    }
    priv.tint_key = key;

    if(!url) {
        set_accent("#C9A227");
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
            set_accent("#C9A227");
        }
    };
    img.onerror = function() { set_accent("#C9A227"); };
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
    document.documentElement.style.setProperty("--mus-accent", c);
    let soft = c.startsWith("rgb")
        ? c.replace("rgb(","rgba(").replace(")",",.16)")
        : "rgba(201,162,39,.16)";
    document.documentElement.style.setProperty("--mus-accent-soft", soft);
}




                    /***************************
                     *      Actions
                     ***************************/




function ac_toggle_theme(gobj, event, kw, src)
{
    apply_theme(current_theme() === "dark" ? "light" : "dark");
    return 0;
}

function ac_pick_dir(gobj, event, kw, src)
{
    pick_dir();
    return 0;
}

function ac_pick_files(gobj, event, kw, src)
{
    pick_files();
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
            ["EV_TOGGLE_THEME", ac_toggle_theme, null],
            ["EV_PICK_DIR",     ac_pick_dir,     null],
            ["EV_PICK_FILES",   ac_pick_files,   null]
        ]]
    ];

    const event_types = [
        ["EV_TOGGLE_THEME", 0],
        ["EV_PICK_DIR",     0],
        ["EV_PICK_FILES",   0]
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
