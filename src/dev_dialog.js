/***********************************************************************
 *          dev_dialog.js
 *
 *      The Developer sheet: two panes behind one door.
 *
 *      "Session log" is the black box (diag.js) read back — the boots,
 *      the freezes, the heap curve, and the one sentence that matters:
 *      did the last run end, or was it ended? It is first because it is
 *      the pane that answers a question nobody can answer while it is
 *      happening: the app stopping by itself in the middle of a drive.
 *
 *      "Traces" is the framework's own developer panel from gobj-ui —
 *      automata, creation, start/stop, subscriptions, inter-event
 *      traffic. It is loaded on demand, not at boot: it is a large piece
 *      of code that nobody needs until they open this, and this app is
 *      one that has to start on a phone with no network. The trace
 *      SWITCHES, though, are remembered in localStorage and re-applied
 *      on every launch (see main.js) — otherwise a restart would be the
 *      one event that turns the tracing off, which is precisely the
 *      event we are trying to watch.
 *
 *          Copyright (c) 2026, ArtGins.
 *          All Rights Reserved.
 ***********************************************************************/
import {
    createElement2, refresh_language, log_error, log_warning,
    gobj_command, gobj_yuno, gobj_get_gclass_trace_level2,
} from "@yuneta/gobj-js";

import {yui_shell_show_modal} from "@yuneta/gobj-ui/src/shell_modals.js";

import {
    diag_journal, diag_line, diag_time, diag_duration, diag_report, diag_clear,
    diag_last_death, diag_death_count, diag_boot_count,
} from "./diag.js";

import {t} from "i18next";


/*  A control's four name attributes: title and aria-label, translated,
    with their keys. */
function named(key)
{
    return {
        title: t(key), "data-i18n-title": key,
        "aria-label": t(key), "data-i18n-aria-label": key,
    };
}

/*  The app's trace levels: [level of C_MUSICA, label key, title key]
    (see trace.js). gobj-ui's panel has chips for the framework's levels
    and none for an app's. */
const APP_TRACES = [
    ["stores",      "the stores",        "trace the stores"],
    ["stores-time", "the stores' clock", "trace the stores' clock"],
];
export const APP_TRACE_I18N_KEYS = [
    "the stores", "trace the stores", "the stores' clock", "trace the stores' clock",
];
const APP_GCLASS = "C_MUSICA";

/*  Set through the yuno's own command, as gobj-ui's chips do: the yuno
    keeps the levels across launches. */
function toggle_app_trace(level, $row)
{
    let on = gobj_get_gclass_trace_level2(APP_GCLASS).includes(level);
    let r = gobj_command(gobj_yuno(), "set-gclass-trace",
        {gclass_name: APP_GCLASS, level: level, set: on ? 0 : 1}, gobj_yuno());
    if(!r || r.result < 0) {
        log_error(`dev_dialog: set-gclass-trace ${level}: ${r ? r.comment : "no answer"}`);
    }
    paint_app_traces($row);
}

function paint_app_traces($row)
{
    let levels = gobj_get_gclass_trace_level2(APP_GCLASS);
    for(const $b of $row.querySelectorAll(".MUS_DEV_CHIP")) {
        let on = levels.includes($b.getAttribute("data-level"));
        $b.classList.toggle("is-on", on);
        $b.setAttribute("aria-pressed", on ? "true" : "false");
    }
}

/*  The open sheet, so a second tap on the menu closes it instead of
    stacking a second one. */
let $sheet = null;
/*  What the traces panel wants doing when the sheet goes away (it turns
    the inter-event tap back off). */
let dispose_traces = null;


/***************************************************************
 *          Open / close
 ***************************************************************/
function open_developer(shell)
{
    if($sheet) {
        close_developer();
        return;
    }

    let $body = createElement2(["div", {class: "MUS_DEV"}, []]);

    let $log_pane = build_log_pane();
    let $apptraces = createElement2(
        ["div", {class: "MUS_DEV_APPTRACES"}, APP_TRACES.map(([level, key, title]) =>
            ["button", {class: "MUS_DEV_CHIP button is-small", type: "button",
                        "data-level": level, i18n: /* i18n: APP_TRACE_I18N_KEYS */ key,
                        ...named(title)},
                t(/* i18n: APP_TRACE_I18N_KEYS */ key),
                {click: () => toggle_app_trace(level, $apptraces)}])]);
    let $trace_panel = createElement2(
        ["div", {class: "MUS_DEV_TRACES_PANEL"}, [
            ["p", {class: "MUS_DEV_WAIT", i18n: "loading"}, t("loading")]
        ]]
    );
    let $trace_pane = createElement2(
        ["div", {class: "MUS_DEV_PANE MUS_DEV_TRACES", hidden: "hidden"}, [
            $apptraces, $trace_panel
        ]]
    );
    paint_app_traces($apptraces);

    let $tabs = createElement2(
        ["div", {class: "MUS_DEV_TABS", role: "tablist"}, [
            ["button", {class: "MUS_DEV_TAB is-on", type: "button",
                        "data-pane": "log", i18n: "session log", ...named("session log")},
                t("session log")],
            ["button", {class: "MUS_DEV_TAB", type: "button",
                        "data-pane": "traces", i18n: "traces", ...named("traces")},
                t("traces")]
        ]]
    );

    $body.appendChild($tabs);
    $body.appendChild($log_pane);
    $body.appendChild($trace_pane);

    let loaded_traces = false;

    $tabs.addEventListener("click", function(ev) {
        let $btn = ev.target.closest(".MUS_DEV_TAB");
        if(!$btn) {
            return;
        }
        let want = $btn.getAttribute("data-pane");
        for(const $b of $tabs.querySelectorAll(".MUS_DEV_TAB")) {
            $b.classList.toggle("is-on", $b === $btn);
        }
        $log_pane.hidden = (want !== "log");
        $trace_pane.hidden = (want !== "traces");
        if(want === "traces" && !loaded_traces) {
            loaded_traces = true;
            load_traces($trace_panel);
        }
    });

    let modal = yui_shell_show_modal(shell, $body, {
        dialog:        true,
        logical_class: "MUS_DEV_SHEET",
        title:         "developer",
        t:             t,
        on_close:      function() {
            $sheet = null;
            if(dispose_traces) {
                try {
                    dispose_traces();
                } catch(e) {
                    log_error(`dev_dialog: the traces panel failed to close: ${(e && e.stack) || e}`);
                }
                dispose_traces = null;
            }
        }
    });
    $sheet = modal;
    refresh_language($body, t);
}


function close_developer()
{
    if($sheet) {
        let m = $sheet;
        $sheet = null;
        m.close();
    }
}


/***************************************************************
 *  The framework panel, fetched only now. A failure here is not
 *  an app failure: the session log — the pane that matters for
 *  the bug this was built for — is already on screen.
 ***************************************************************/
function load_traces($pane)
{
    import("@yuneta/gobj-ui/src/yui_dev.js").then(function(mod) {
        let panel = mod.build_dev_panel();
        clear($pane);
        $pane.appendChild(panel.$el);
        dispose_traces = panel.dispose;
    }).catch(function(err) {
        log_warning(`dev_dialog: the traces panel did not load: ${(err && err.message) || err}`);
        clear($pane);
        $pane.appendChild(createElement2(
            ["p", {class: "MUS_DEV_WAIT"}, String((err && err.message) || err)]
        ));
    });
}


                    /***************************
                     *      The session log
                     ***************************/


function build_log_pane()
{
    let $pane = createElement2(["div", {class: "MUS_DEV_PANE"}, []]);

    let $verdict = createElement2(["div", {class: "MUS_DEV_VERDICT"}, []]);
    let $lines = createElement2(["pre", {class: "MUS_DEV_LOG"}, []]);

    let $bar = createElement2(
        ["div", {class: "MUS_DEV_BAR"}, [
            ["button", {class: "MUS_DEV_BTN MUS_DEV_COPY button is-small", type: "button",
                        i18n: "copy", ...named("copy")},
                t("copy"), {click: (ev) => copy_report(ev.currentTarget)}],
            ["button", {class: "MUS_DEV_BTN MUS_DEV_REFRESH button is-small", type: "button",
                        i18n: "refresh", ...named("refresh")},
                t("refresh"), {click: () => paint(true)}],
            ["button", {class: "MUS_DEV_BTN MUS_DEV_CLEAR button is-small", type: "button",
                        i18n: "clear log", ...named("clear log")},
                t("clear log"), {click: () => {
                    diag_clear();
                    paint(true);
                }}]
        ]]
    );

    $pane.appendChild($verdict);
    $pane.appendChild($bar);
    $pane.appendChild($lines);

    function paint(retranslate)
    {
        clear($verdict);
        for(const node of build_verdict()) {
            $verdict.appendChild(createElement2(node));
        }

        let journal = diag_journal();
        /*  Newest first: the reason anyone opens this is something that
            just happened, and scrolling to the bottom of four hours of
            heartbeats to find it is not reading, it is archaeology. */
        $lines.textContent = journal.length
            ? journal.slice().reverse().map(diag_line).join("\n")
            : "";
        if(!journal.length) {
            $lines.textContent = t("log empty");
        }
        if(retranslate) {
            refresh_language($verdict, t);
        }
    }

    paint(false);
    return $pane;
}


/***************************************************************
 *  The sentence at the top. Everything below it is evidence;
 *  this is the reading of it.
 ***************************************************************/
function build_verdict()
{
    let out = [];
    /*  A DEATH, not merely a launch: diag.js does the telling apart, so
        a page anyone reloads twice a day is not accused of crashing. */
    let death = diag_last_death();
    let deaths = diag_death_count(24);
    let boots = diag_boot_count(24);

    if(!death) {
        out.push(["p", {class: "MUS_DEV_OK", i18n: "no unexpected stop"},
            t("no unexpected stop")]);
    } else {
        out.push(["p", {class: "MUS_DEV_BAD", i18n: "last unexpected stop"},
            t("last unexpected stop")]);
        out.push(["p", {class: "MUS_DEV_FACT"}, diag_time(death.t)]);

        if(death.discarded) {
            out.push(["p", {class: "MUS_DEV_FACT", i18n: "browser discarded the app"},
                t("browser discarded the app")]);
        }
        if(death.was_playing && death.was_track) {
            out.push(["p", {class: "MUS_DEV_FACT"}, [
                ["span", {i18n: "stopped while playing"}, t("stopped while playing")],
                ["span", {class: "MUS_DEV_VAL"}, death.was_track]
            ]]);
        }
        out.push(["p", {class: "MUS_DEV_FACT"}, [
            ["span", {i18n: "silent for"}, t("silent for")],
            ["span", {class: "MUS_DEV_VAL"}, diag_duration(death.gap_s)]
        ]]);
        if(death.was_heap !== null) {
            out.push(["p", {class: "MUS_DEV_FACT"}, [
                ["span", {i18n: "memory in use"}, t("memory in use")],
                ["span", {class: "MUS_DEV_VAL"}, [
                    ["span", {}, String(death.was_heap)],
                    " ",    // a real space: read, copied and heard as "812 MB"
                    ["span", {class: "MUS_UNIT", i18n: "unit mb"}, t("unit mb")]
                ]]
            ]]);
        }
    }

    /*  Two counts, because they answer two different questions. The
        user said "two or three times in four hours" — that is the
        SECOND number. The first is every launch, deliberate ones
        included, and it is the denominator that makes the second one
        mean something. */
    if(deaths) {
        out.push(["p", {class: "MUS_DEV_FACT"}, [
            ["span", {i18n: "unexpected stops today"}, t("unexpected stops today")],
            ["span", {class: "MUS_DEV_VAL"}, String(deaths)]
        ]]);
    }
    out.push(["p", {class: "MUS_DEV_FACT"}, [
        ["span", {i18n: "restarts today"}, t("restarts today")],
        ["span", {class: "MUS_DEV_VAL"}, String(boots)]
    ]]);

    return out;
}


/*  The clipboard, with the one fallback that still works on a phone
    with no permission for it: select the text and let the user copy it
    the way they copy anything else. */
function copy_report($btn)
{
    let text = diag_report();
    /*  Back to its own label, by its key: the text on the button may be
        "Copied" still, from a press a moment ago. */
    let done = function() {
        $btn.textContent = t("copied");
        setTimeout(function() {
            $btn.textContent = t($btn.getAttribute("data-i18n") || "copy");
        }, 1500);
    };
    let by_hand = function() {
        if(fallback(text)) {
            done();
        }
    };
    if(navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, function(e) {
            log_warning(`dev_dialog: the clipboard refused: ${(e && e.name) || e}`);
            by_hand();
        });
        return;
    }
    by_hand();
}

function fallback(text)
{
    let $ta = document.createElement("textarea");
    $ta.value = text;
    $ta.setAttribute("readonly", "readonly");
    $ta.style.position = "fixed";
    $ta.style.opacity = "0";
    document.body.appendChild($ta);
    $ta.select();
    let ok = false;
    try {
        ok = document.execCommand("copy");
    } catch(e) {
        ok = false;
    }
    document.body.removeChild($ta);
    if(!ok) {
        log_warning("dev_dialog: the report could not be copied");
    }
    return ok;
}


function clear($node)
{
    while($node.firstChild) {
        $node.removeChild($node.firstChild);
    }
}


export {open_developer, close_developer};
