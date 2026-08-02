/***********************************************************************
 *          picker.js
 *
 *      Choosing music from the device, and handing it to the store.
 *
 *      Two entry points, both reachable from the toolbar and from the
 *      empty-state buttons a view draws when the library is still empty:
 *        - pick_dir()   — a whole folder (File System Access API where it
 *                         exists, a webkitdirectory <input> otherwise).
 *        - pick_files() — loose files.
 *
 *      The hidden <input>s are created once, lazily, and reused. The
 *      folder walk and the reason for reading here — nothing leaves the
 *      device — are ported from the reference musica.html.
 *
 *          Copyright (c) 2026, ArtGins.
 *          All Rights Reserved.
 ***********************************************************************/
import {ingest} from "./music_store.js";

let $file_input = null;
let $dir_input = null;

function ensure_inputs()
{
    if(!$file_input) {
        $file_input = document.createElement("input");
        $file_input.type = "file";
        $file_input.accept = "audio/*,.mp3,.m4a,.flac,.ogg,.opus,.wav";
        $file_input.multiple = true;
        $file_input.hidden = true;
        $file_input.addEventListener("change", (e) => {
            if(e.target.files && e.target.files.length) {
                ingest(e.target.files);
            }
            /*  Reset so picking the same set again still fires change. */
            e.target.value = "";
        });
        document.body.appendChild($file_input);
    }
    if(!$dir_input) {
        $dir_input = document.createElement("input");
        $dir_input.type = "file";
        $dir_input.multiple = true;
        $dir_input.hidden = true;
        /*  webkitdirectory is not a standard reflected property. */
        $dir_input.setAttribute("webkitdirectory", "");
        $dir_input.setAttribute("directory", "");
        $dir_input.addEventListener("change", (e) => {
            if(e.target.files && e.target.files.length) {
                ingest(e.target.files);
            }
            e.target.value = "";
        });
        document.body.appendChild($dir_input);
    }
}

function pick_files()
{
    ensure_inputs();
    $file_input.click();
}

async function pick_dir()
{
    ensure_inputs();

    /*  The File System Access API gives a real folder picker where it
     *  exists (Chromium); elsewhere fall back to the webkitdirectory
     *  <input>. Reading is local either way. */
    if(window.showDirectoryPicker) {
        try {
            const dir = await window.showDirectoryPicker({id:"musica", startIn:"music"});
            const files = [];
            const walk = async (h, path) => {
                for await (const entry of h.values()) {
                    if(entry.kind === "file") {
                        const f = await entry.getFile();
                        try {
                            Object.defineProperty(f, "webkitRelativePath", {value: path + f.name});
                        } catch(e) {
                            /*  Some engines freeze File; the path guess still
                                falls back to the name. */
                        }
                        files.push(f);
                    } else {
                        await walk(entry, path + entry.name + "/");
                    }
                }
            };
            await walk(dir, dir.name + "/");
            return ingest(files);
        } catch(e) {
            if(e && e.name === "AbortError") {
                return;                 // the user closed the picker
            }
            /*  Any other failure: fall through to the <input>. */
        }
    }
    $dir_input.click();
}

export {pick_files, pick_dir};
