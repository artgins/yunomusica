/***********************************************************************
 *          fixtures.mjs
 *
 *      Builds the three MP3 trees the suite plays against.
 *
 *      They are GENERATED, not committed. 300-odd binaries in a repo age
 *      badly and say nothing a reader can check; a generator says what
 *      the tests actually need — how many artists, how long a track, an
 *      album with a cover and an album without — and that is the part
 *      worth keeping under review.
 *
 *      Silence comes from ffmpeg (two calls, one per duration); the ID3
 *      tags are written here by hand. Fitting, given that reading them
 *      by hand is what the app under test does, and it means a tag the
 *      parser must cope with can be forged here in one line.
 *
 *          Copyright (c) 2026, ArtGins.
 *          All Rights Reserved.
 ***********************************************************************/
import {execFileSync} from "child_process";
import {mkdirSync, writeFileSync, readFileSync, existsSync, rmSync} from "fs";
import {dirname, join} from "path";
import {fileURLToPath} from "url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "fixtures");
const TMP  = join(ROOT, ".tmp");


/***************************************************************
 *  ID3v2.3, built by hand.
 *
 *  Note the two different size encodings, which is the classic
 *  way to get this wrong: the TAG header size is synchsafe (7
 *  bits per byte), each FRAME size is a plain big-endian uint32.
 ***************************************************************/
function text_frame(id, value)
{
    let body = Buffer.concat([
        Buffer.from([0x00]),                    // ISO-8859-1
        Buffer.from(value, "latin1"),
        Buffer.from([0x00])
    ]);
    let head = Buffer.alloc(10);
    head.write(id, 0, "latin1");
    head.writeUInt32BE(body.length, 4);
    return Buffer.concat([head, body]);
}

function picture_frame(png)
{
    let body = Buffer.concat([
        Buffer.from([0x00]),                    // ISO-8859-1
        Buffer.from("image/png", "latin1"), Buffer.from([0x00]),
        Buffer.from([0x03]),                    // front cover
        Buffer.from([0x00]),                    // empty description
        png
    ]);
    let head = Buffer.alloc(10);
    head.write("APIC", 0, "latin1");
    head.writeUInt32BE(body.length, 4);
    return Buffer.concat([head, body]);
}

function synchsafe(n)
{
    return Buffer.from([(n >> 21) & 0x7f, (n >> 14) & 0x7f, (n >> 7) & 0x7f, n & 0x7f]);
}

function id3v2(tags, png)
{
    let frames = [
        text_frame("TIT2", tags.title),
        text_frame("TPE1", tags.artist),
        text_frame("TALB", tags.album),
        text_frame("TCON", tags.genre || "prog")
    ];
    /*  `track: null` writes NO number, which is the case a title like
        "Track 02" has to cover: the position is in the title precisely
        because the tagger put it nowhere else. */
    if(tags.track !== null) {
        frames.push(text_frame("TRCK", String(tags.track || 1)));
    }
    if(tags.year) {
        frames.push(text_frame("TYER", String(tags.year)));
    }
    if(png) {
        frames.push(picture_frame(png));
    }

    let body = Buffer.concat(frames);
    return Buffer.concat([
        Buffer.from("ID3", "latin1"),
        Buffer.from([0x03, 0x00, 0x00]),
        synchsafe(body.length),
        body
    ]);
}


/***************************************************************
 *  Silence, once per duration, reused for every track of that
 *  length. Tagging is a buffer concat, so 300 files cost 300
 *  writes rather than 300 ffmpeg processes.
 ***************************************************************/
function silence(seconds)
{
    let path = join(TMP, `silence-${seconds}s.mp3`);
    if(!existsSync(path)) {
        execFileSync("ffmpeg", ["-v", "quiet", "-y",
            "-f", "lavfi", "-i", "anullsrc=r=44100:cl=mono",
            "-t", String(seconds), "-b:a", "96k",
            "-write_xing", "0", "-id3v2_version", "0",
            path]);
    }
    return readFileSync(path);
}

/***************************************************************
 *  A tone, which is the one fixture that is NOT silence.
 *
 *  Everything else here is silence because nothing else cares
 *  what the audio contains — a clock advances the same over a
 *  quiet file. The visualizer does care: it draws the sound,
 *  and over silence its correct output is an empty canvas,
 *  which is also its output when it is broken.
 *
 *  A sine at a known frequency makes the difference testable.
 *  A4 is 440 Hz and lands on one semitone, so "the tallest bar
 *  is the twenty-second" is a statement about the whole chain:
 *  the tap, the FFT, the fold onto semitones and the drawing.
 ***************************************************************/
/*  The gain is not decoration. lavfi's `sine` comes out at about
    -18 dBFS, which is a real signal and a quiet one: the first version
    of this fixture drew an envelope a seventh of the height of the bar
    and the test called the app broken. Real music arrives mastered
    close to full scale, so the fixture is brought there — +15 dB lands
    at roughly -3.5 dBFS.

    The gain is in the CACHED FILE NAME on purpose. Change the recipe
    and leave the name alone, and every machine that already ran the
    suite goes on testing against the old file for ever. */
const TONE_GAIN_DB = 15;

function tone(hz, seconds)
{
    let path = join(TMP, `tone-${hz}-${seconds}s-${TONE_GAIN_DB}db.mp3`);
    if(!existsSync(path)) {
        execFileSync("ffmpeg", ["-v", "quiet", "-y",
            "-f", "lavfi", "-i", `sine=frequency=${hz}:sample_rate=44100`,
            "-t", String(seconds),
            "-af", `volume=${TONE_GAIN_DB}dB`,
            "-b:a", "128k",
            "-write_xing", "0", "-id3v2_version", "0",
            path]);
    }
    return readFileSync(path);
}

/*  A cover with almost no colour in it.
 *
 *  The accent is taken from the cover, and the visualizer draws in the
 *  accent. A record like this one produces a near-white accent, which
 *  on a near-white card is a picture that is drawn perfectly and seen
 *  by nobody — the exact failure this fixture exists to catch. */
function pale_png()
{
    let path = join(TMP, "cover-pale.png");
    if(!existsSync(path)) {
        execFileSync("ffmpeg", ["-v", "quiet", "-y",
            "-f", "lavfi", "-i", "color=c=0xEDE7E0:s=96x96",
            "-frames:v", "1", path]);
    }
    return readFileSync(path);
}

function cover_png()
{
    let path = join(TMP, "cover.png");
    if(!existsSync(path)) {
        execFileSync("ffmpeg", ["-v", "quiet", "-y",
            "-f", "lavfi", "-i", "color=c=0x8A6A10:s=96x96",
            "-frames:v", "1", path]);
    }
    return readFileSync(path);
}

function write_track(path, audio, tags, png)
{
    mkdirSync(dirname(path), {recursive: true});
    writeFileSync(path, Buffer.concat([id3v2(tags, png), audio]));
}


/***************************************************************
 *  The three trees, and what each one is FOR — which is the
 *  reason they are three and not one.
 ***************************************************************/

/*  `music`: small and hand-named. Two artists, two albums, real-looking
    titles, one album with a cover and one without, so the grouping views
    and the "no cover" placeholder are both exercised. This is the tree
    e2e feeds through the loose-files picker. */
function build_music()
{
    const audio = silence(5);
    const png = cover_png();
    const albums = [
        {artist: "Ramones", album: "Rocket to Russia", genre: "punk", year: 1977, cover: png,
         tracks: ["Cretin Hop", "Rockaway Beach"]},
        {artist: "Bach", album: "Cello Suites", genre: "classical", year: 1720, cover: null,
         tracks: ["Prelude", "Allemande"]}
    ];
    for(const a of albums) {
        a.tracks.forEach((title, i) => {
            let n = String(i + 1).padStart(2, "0");
            write_track(join(ROOT, "music", a.artist, a.album, `${n} - ${title}.mp3`),
                audio, {title, artist: a.artist, album: a.album, genre: a.genre,
                        year: a.year, track: i + 1}, a.cover);
        });
    }
}

/*  `longtracks`: six tracks of 25 seconds in ONE album. The length is
    the point — the tests that press play read the clock to prove the
    audio advances, and that needs a track that does not end first. */
function build_longtracks()
{
    const audio = silence(25);
    const png = cover_png();
    for(let i = 1; i <= 6; i++) {
        let n = String(i).padStart(2, "0");
        write_track(join(ROOT, "longtracks", "Brain Salad Surgery", `${n}.mp3`),
            audio, {title: `track ${i}`, artist: "emerson, lake and palmer",
                    album: "Brain Salad Surgery", genre: "prog", year: 1973, track: i}, png);
    }
}

/*  `mimusica`: 25 artists x 12 tracks. Bulk, and the only tree big
    enough to make the mobile-width and confirm-dialog tests meaningful:
    a long folder list is exactly what used to run off the side of a
    phone. */
function build_mimusica()
{
    const audio = silence(1);
    const names = [
        "emerson, lake and palmer", "king crimson", "yes", "genesis", "camel",
        "gentle giant", "van der graaf generator", "jethro tull", "caravan", "soft machine",
        "magma", "gong", "hatfield and the north", "national health", "henry cow",
        "pfm", "banco del mutuo soccorso", "area", "le orme", "goblin",
        "harmonium", "maneige", "et cetera", "pollen", "sloche"
    ];
    names.forEach((artist, a) => {
        let dir = join(ROOT, "mimusica", `${String(a + 1).padStart(4, "0")} - ${artist}`);
        for(let i = 1; i <= 12; i++) {
            write_track(join(dir, `${String(i).padStart(2, "0")} - track ${i}.mp3`),
                audio, {title: `track ${i}`, artist, album: `album ${a + 1}`,
                        genre: "prog", year: 1970 + (a % 10), track: i}, null);
        }
    });
}


/*  `tones`: two 25-second sine waves at pitches with names. The only
    tree in here that makes a noise, and the only one the visualizer
    test can say anything about — see tone() above. 25 seconds for the
    same reason `longtracks` is 25: the test has to have time to look. */
function build_tones()
{
    /*  The album carries the colourless cover ON PURPOSE — see
        pale_png(). Covers are held per album, so both tones get it, and
        that means every assertion in the `viz` test runs against the
        worst accent the app can produce rather than against a
        convenient one. */
    const pale = pale_png();
    const notes = [
        {title: "A4 440", hz: 440,    track: 1},
        {title: "C5 523", hz: 523.25, track: 2}
    ];
    notes.forEach(function(n) {
        write_track(join(ROOT, "tones", "Test Tones", `0${n.track} - ${n.title}.mp3`),
            tone(n.hz, 25),
            {title: n.title, artist: "sine", album: "Test Tones",
             genre: "test", year: 2026, track: n.track}, pale);
    });
}


/*  `messy`: one library, tagged the way real ones are tagged.
 *
 *  Nothing here is invented for the sake of a test. Every one of these
 *  is a shape that a folder full of music actually has:
 *
 *    - the SAME album spelled three ways — "Aqualung", "aqualung" and
 *      "Aqualung " with a trailing space. Grouped on the raw string
 *      they were three albums with, to the eye, one name, sitting next
 *      to each other because the sort put them there.
 *    - two DIFFERENT albums with the same title, "Greatest Hits", by two
 *      artists. Grouped on the title they collapsed into one album by
 *      nobody in particular.
 *    - an artist spelled two ways, "Camel" and "camel".
 *    - a genre spelled two ways, "Prog" and "prog".
 *
 *  Five real albums by four real artists. Anything that reports more is
 *  reporting the tags, not the music. */
function build_messy()
{
    const audio = silence(1);
    const sets = [
        {dir: "Jethro Tull/Aqualung",      artist: "Jethro Tull", album: "Aqualung",
         genre: "Prog", titles: ["Aqualung", "Cross-Eyed Mary"]},
        {dir: "Jethro Tull/aqualung ripped", artist: "Jethro Tull", album: "aqualung",
         genre: "prog", titles: ["Mother Goose"]},
        {dir: "Jethro Tull/Aqualung extra", artist: "Jethro Tull", album: "Aqualung ",
         genre: "Prog", titles: ["Locomotive Breath"]},
        {dir: "Jethro Tull/Best of",       artist: "Jethro Tull", album: "Greatest Hits",
         genre: "prog", titles: ["Living in the Past"]},
        {dir: "Camel/Best of",             artist: "Camel",       album: "Greatest Hits",
         genre: "prog", titles: ["Lady Fantasy"]},
        {dir: "Camel/Moonmadness",         artist: "Camel",       album: "Moonmadness",
         genre: "Prog", titles: ["Song Within a Song", "Air Born"]},
        {dir: "camel/Mirage",              artist: "camel",       album: "Mirage",
         genre: "prog", titles: ["Lady Fantasy (live)"]}
    ];
    sets.forEach(function(g) {
        g.titles.forEach(function(title, i) {
            let n = String(i + 1).padStart(2, "0");
            write_track(join(ROOT, "messy", g.dir, `${n} - ${title}.mp3`),
                audio, {title, artist: g.artist, album: g.album,
                        genre: g.genre, year: 1971, track: i + 1}, null);
        });
    });
}


/*  `noisy`: tags that carry BOILERPLATE where a name should be.
 *
 *  Every row here was copied from a real 8,176-file library, counts
 *  and spellings included — the app believed all of it, so a folder
 *  came out as two rows both reading "AlbumWrap Album" by an artist
 *  called "AlbumWrap - King Crimson". The file names, meanwhile, say
 *  the whole thing.
 *
 *  The last two rows are the ones that must NOT move: a file called
 *  "06.mp3" is no more informative than the "Track 06" it would
 *  replace, and "Various Artists" is a real answer about a real
 *  compilation, not a missing one. */
function build_noisy()
{
    const audio = silence(1);
    const files = [
        /*  AlbumWrap: one title for every file it ever wrote, and its
            own name glued to the front of the artist and the album. */
        ["Junk/King Crimson - Live at the Jazz Cafe (Albumwrap).mp3",
         {title: "AlbumWrap Album", artist: "AlbumWrap - King Crimson",
          album: "AlbumWrap - Live at the Jazz Cafe", track: null}],
        ["Junk/King Crimson - Red.mp3",
         {title: "AlbumWrap Album", artist: "AlbumWrap - King Crimson",
          album: "AlbumWrap - Red", track: null}],
        /*  A number where a name goes, and no track frame at all — so
            the number in the title is the only one there is. */
        ["Junk/mr. mister - Close your eyes.mp3",
         {title: "Track 02", artist: "mr mister", album: "pull", track: null}],
        /*  A tagger that wrote each FIELD'S OWN NAME into the field. */
        ["Junk/bowie - Peter and the Wolf.mp3",
         {title: "Track 09", artist: "artist", album: "title", track: null}],
        ["Junk/suede - across the universe.mp3",
         {title: "across the universe", artist: "suede", album: "Unknown",
          track: null}],
        /*  Leave alone: the file says less than the tag does. */
        ["Junk/06.mp3",
         {title: "Track 06", artist: "Iceberg", album: "Tartessos", track: null}],
        /*  Leave alone: a compilation really is by various artists. */
        ["Junk/Various - Compilation Song.mp3",
         {title: "Compilation Song", artist: "Various Artists",
          album: "Las mejores baladas", track: 3}]
    ];
    for(const [rel, tags] of files) {
        write_track(join(ROOT, "noisy", rel), audio, tags, null);
    }
}


/***************************************************************
 *  Cheap when they already exist, so every test can just call
 *  it. `force` rebuilds from scratch.
 ***************************************************************/
function ensure_fixtures(force)
{
    if(force) {
        rmSync(ROOT, {recursive: true, force: true});
    }
    mkdirSync(TMP, {recursive: true});

    let built = [];
    if(!existsSync(join(ROOT, "music")))      { build_music();      built.push("music"); }
    if(!existsSync(join(ROOT, "longtracks"))) { build_longtracks(); built.push("longtracks"); }
    if(!existsSync(join(ROOT, "mimusica")))   { build_mimusica();   built.push("mimusica"); }
    if(!existsSync(join(ROOT, "tones")))      { build_tones();      built.push("tones"); }
    if(!existsSync(join(ROOT, "messy")))      { build_messy();      built.push("messy"); }
    if(!existsSync(join(ROOT, "noisy")))      { build_noisy();      built.push("noisy"); }

    return {
        root:       ROOT,
        music:      join(ROOT, "music"),
        longtracks: join(ROOT, "longtracks"),
        mimusica:   join(ROOT, "mimusica"),
        tones:      join(ROOT, "tones"),
        messy:      join(ROOT, "messy"),
        noisy:      join(ROOT, "noisy"),
        built:      built
    };
}


/*  `node tests/fixtures.mjs [--force]` */
if(process.argv[1] && process.argv[1].endsWith("fixtures.mjs")) {
    let r = ensure_fixtures(process.argv.includes("--force"));
    console.log(r.built.length ? `built: ${r.built.join(", ")}` : "already there");
    console.log(r.root);
}


export {ensure_fixtures};
