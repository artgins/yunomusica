/***********************************************************************
 *          a11y.js
 *
 *      A control's name, the way the yuneta rule wants it: a title AND
 *      an aria-label, both translated, both carrying their key so a
 *      change of language reaches them.
 *
 *      And for the controls repeated on every row — "Play", "Give a
 *      heart", "Move up" — the name of the row too: "Play Aqualung".
 *      A list of three hundred buttons all called "Play" is a list
 *      nobody using a reader can tell apart. The control is labelled by
 *      itself and by the node holding the row's text (aria-labelledby),
 *      the way gobj-ui names a control with its badge: nothing is
 *      composed in javascript, so a change of language keeps it right.
 *
 *          Copyright (c) 2026, ArtGins.
 *          All Rights Reserved.
 ***********************************************************************/
import {t} from "i18next";


/*  An id for a node a control is named by. Unique in the page: the same
    track can be on two screens at once, both kept alive. */
let id_seq = 0;

function new_id()
{
    return "mus-n" + (++id_seq);
}

/*  The four attributes of a control's name. */
function named(key)
{
    return {
        title: t(key),
        "data-i18n-title": key,
        "aria-label": t(key),
        "data-i18n-aria-label": key,
    };
}

/*  Named by what it does AND by what it does it to (`text_id`). */
function named_for(key, text_id)
{
    const id = new_id();
    return {...named(key), id: id, "aria-labelledby": id + " " + text_id};
}


export {new_id, named, named_for};
