/***********************************************************************
 *          track_card.js
 *
 *      How a track presents itself outside a row: the two counts that
 *      sit beside its name, and the card that opens when the name is
 *      tapped.
 *
 *      Both live here because they are two halves of one gesture — the
 *      counts are what the card is FOR, and the heart is given from the
 *      row and taken back from the card. Splitting them would put the
 *      same i18n keys and the same heart glyph in two files.
 *
 *      The card is everything known about one track, and the two
 *      numbers the app keeps for it.
 *
 *      IT EXISTS BECAUSE OF THE TITLE. A row has one line for a name,
 *      and on a phone that line is about twenty characters wide before
 *      the ellipsis takes over. "Karn Evil 9: 1st Impression, Part 2"
 *      becomes "Karn Evil 9: 1st…" on every screen it appears on, and
 *      there was nowhere in the app to read the rest of it. Here the
 *      title is the heading, it wraps, and it is the one string on
 *      screen with no ellipsis anywhere near it.
 *
 *      It replaced the fold-out the library used to open under a
 *      selected row. That fold-out could show the album and the path,
 *      but never the thing that was actually cut off — the title above
 *      it stayed exactly as truncated as before. And it existed on one
 *      of the two screens that list tracks, so the same tap did
 *      different things depending on where you were.
 *
 *      The counts are erasable FROM HERE, which is the whole of their
 *      privacy story: a number you can read is a number you can clear,
 *      in the same place, without going looking for a setting.
 *
 *          Copyright (c) 2026, ArtGins.
 *          All Rights Reserved.
 ***********************************************************************/
import {createElement2, refresh_language} from "@yuneta/gobj-js";

import {
    yui_shell_register_overlay,
    yui_shell_overlay_dismissed,
} from "@yuneta/gobj-ui/src/c_yui_shell.js";

import {source_name} from "./sources_store.js";
import {stats_of, heart, heart_reset, stats_reset} from "./stats_store.js";

import {t} from "i18next";


/*  A tag the file did not carry is stored as its English key, so it can
    be translated at paint time. */
const UNKNOWN_KEYS = {
    "unknown artist": true,
    "unknown album":  true,
    "unknown genre":  true
};

const HEART = "M12 21s-7.5-4.7-9.8-9A5.6 5.6 0 0 1 12 6a5.6 5.6 0 0 1 9.8 6c-2.3 4.3-9.8 9-9.8 9z";

let $open = null;       // the card, while it is up


function tr(value)
{
    return UNKNOWN_KEYS[value] ? t(value) : value;
}

function svg(path, size)
{
    return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="currentColor" aria-hidden="true"><path d="${path}"/></svg>`;
}


/***************************************************************
 *  Open the card for one track.
 *
 *  `shell_gobj` is what registers the overlay, so the phone's
 *  back button closes the card instead of leaving the app —
 *  the same contract every other dialog here uses.
 ***************************************************************/
function open_track(shell_gobj, track)
{
    if(!track || $open) {
        return;                             // one at a time
    }
    let overlay = null;

    const done = function(from_history) {
        if(!$open) {
            return;
        }
        if($open.parentNode) {
            $open.parentNode.removeChild($open);
        }
        $open = null;
        if(overlay && !from_history) {
            yui_shell_overlay_dismissed(shell_gobj, overlay);
        }
    };

    /*  The numbers live in their own node so that tapping a heart
        repaints four spans rather than the whole card — a card that
        rebuilds under the finger loses the button that was pressed. */
    const $counts = createElement2(["div", {class: "MUS_TCARD_COUNTS"}]);

    const repaint = function() {
        const s = stats_of(track);
        clear($counts);
        $counts.appendChild(createElement2(
            ["div", {class: "MUS_TCARD_COUNT"}, [
                ["span", {class: "MUS_TCARD_CK", i18n: "times played"},
                    t("times played")],
                ["span", {class: "MUS_TCARD_CV"}, String(s.plays)],
                /*  The breakdown, and only when there is one to give:
                    "0 played through" under a zero count is noise. */
                s.full
                    ? ["span", {class: "MUS_TCARD_CSUB"}, [
                        ["span", {class: "MUS_TCARD_CSUBN"}, String(s.full)],
                        ["span", {i18n: "played through"}, t("played through")]
                      ]]
                    : ["span", {}]
            ]]));
        $counts.appendChild(createElement2(
            ["div", {class: "MUS_TCARD_COUNT"}, [
                ["span", {class: "MUS_TCARD_CK", i18n: "hearts"}, t("hearts")],
                ["span", {class: "MUS_TCARD_CV is-heart"}, [
                    ["span", {class: "MUS_ICO"}, svg(HEART, 16)],
                    ["span", {}, String(s.hearts)]
                ]],
                ["span", {class: "MUS_TCARD_HBTNS"}, [
                    btn("MUS_TCARD_HADD", "give a heart", "＋", () => {
                        heart(track, 1);
                        repaint();
                    }, true),
                    btn("MUS_TCARD_HSUB", "take one back", "－", () => {
                        heart(track, -1);
                        repaint();
                    }, s.hearts > 0),
                    btn("MUS_TCARD_HZERO", "reset hearts", "0", () => {
                        heart_reset(track);
                        repaint();
                    }, s.hearts > 0)
                ]]
            ]]));
        /*  Forgetting the counts is offered only when there is
            something to forget. */
        $counts.appendChild(createElement2(
            (s.plays || s.full || s.hearts)
                ? ["button", {
                        class: "MUS_TCARD_FORGET", type: "button",
                        i18n: "forget these counts"
                    }, t("forget these counts"), {click: () => {
                        stats_reset(track);
                        repaint();
                    }}]
                : ["span", {}]));
        refresh_language($counts, t);
    };

    const facts = [
        ["artist", tr(track.artist)],
        ["album", tr(track.album)],
        ["genre", tr(track.genre)],
        ["year", track.year ? String(track.year) : ""],
        ["track number", track.track ? String(track.track) : ""],
        ["source", source_name(track.source_id)],
        ["path", track.path]
    ].filter((f) => f[1]);

    let $card = createElement2(
        ["div", {class: "MUS_TCARD", role: "dialog", "aria-modal": "true"}, [
            ["div", {class: "MUS_TCARD_HEAD"}, [
                /*  The reason this dialog exists: the whole title, over
                    as many lines as it takes. */
                ["h2", {class: "MUS_TCARD_TITLE"}, track.title],
                ["button", {
                        class: "MUS_TCARD_CLOSE", type: "button",
                        "aria-label": t("close"), "data-i18n-aria-label": "close"
                    }, "✕", {click: () => done()}]
            ]],
            ["dl", {class: "MUS_TCARD_FACTS"},
                facts.map(([key, value]) => [
                    "div", {class: "MUS_TCARD_FACT"}, [
                        ["dt", {i18n: key}, t(key)],
                        ["dd", {}, value]
                    ]
                ])],
            $counts
        ]]);

    let $backdrop = createElement2(
        ["div", {class: "MUS_ABOUT_BACKDROP MUS_TCARD_BACKDROP"}, [$card], {
            click: (ev) => {
                if(ev.target === ev.currentTarget) {
                    done();
                }
            }
        }]);

    repaint();
    document.body.appendChild($backdrop);
    $open = $backdrop;

    overlay = yui_shell_register_overlay(shell_gobj, () => done(true));
    refresh_language($backdrop, t);

    let $close = $backdrop.querySelector(".MUS_TCARD_CLOSE");
    if($close) {
        $close.focus();
    }
}

function btn(cls, key, glyph, on_click, enabled)
{
    let attrs = {
        class: "MUS_TCARD_HBTN " + cls,
        type: "button",
        "aria-label": t(key),
        "data-i18n-aria-label": key,
        title: t(key),
        "data-i18n-title": key
    };
    if(!enabled) {
        attrs.disabled = "disabled";
    }
    return ["button", attrs, glyph, {click: on_click}];
}

function clear($node)
{
    while($node.firstChild) {
        $node.removeChild($node.firstChild);
    }
}




                    /***************************
                     *      The chips
                     ***************************/




/***************************************************************
 *  What sits beside the name on a row, on both screens that
 *  list tracks.
 *
 *  The heart is a BUTTON: giving one is the commonest thing
 *  anybody will do with any of this, and making them open a
 *  card to do it would be a gesture too many. Taking one back
 *  is not on the row, because a row is a place fingers land by
 *  accident — that one is in the card, next to the number it
 *  changes.
 *
 *  The play count is not a button. It is a fact, and there is
 *  nothing to do to it from here.
 *
 *  Returned as createElement2 SPECS, not nodes: both callers
 *  build their rows as one nested literal and neither of them
 *  wants a document fragment in the middle of it.
 ***************************************************************/
function track_counts(track)
{
    const s = stats_of(track);

    /*  Both chips are ALWAYS built, and a zero count is an empty
        number rather than an absent chip. That is what lets
        refresh_counts() below change a count without replacing a node —
        and replacing the node is exactly what must not happen, because
        the node in question is the button the finger is still on. */
    return ["span", {class: "MUS_CNTS"}, [
        ["span", {
                class: "MUS_CNT MUS_CNT_PLAYS" + (s.plays ? " is-on" : ""),
                title: t("times played"), "data-i18n-title": "times played"
            }, [
            ["span", {class: "MUS_ICO"}, svg("M8 5v14l11-7z", 11)],
            ["span", {class: "MUS_CNT_N"}, s.plays ? String(s.plays) : ""]
        ]],
        ["button", {
                class: "MUS_CNT MUS_CNT_HEART" + (s.hearts ? " is-on" : ""),
                type: "button",
                "aria-label": t("give a heart"), "data-i18n-aria-label": "give a heart",
                title: t("give a heart"), "data-i18n-title": "give a heart"
            }, [
            ["span", {class: "MUS_ICO"}, svg(HEART, 12)],
            ["span", {class: "MUS_CNT_N"}, s.hearts ? String(s.hearts) : ""]
        ], {click: (ev) => {
            /*  The row underneath opens the card. That is not what a
                tap on the heart meant. */
            ev.stopPropagation();
            heart(track, 1);
        }}]
    ]];
}

/*  The counts changed. Only the two numbers move — no node is thrown
    away, so the heart keeps the focus it was just given from the
    keyboard and a queue being dragged is not rebuilt underneath. */
function refresh_counts($chips, track)
{
    if(!$chips) {
        return;
    }
    const s = stats_of(track);
    const set = function(sel, n) {
        const $c = $chips.querySelector(sel);
        if($c) {
            $c.classList.toggle("is-on", n > 0);
            $c.querySelector(".MUS_CNT_N").textContent = n ? String(n) : "";
        }
    };
    set(".MUS_CNT_PLAYS", s.plays);
    set(".MUS_CNT_HEART", s.hearts);
}


export {open_track, track_counts, refresh_counts};
