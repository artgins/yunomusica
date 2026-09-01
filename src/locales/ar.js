/***********************************************************************
 *          ar.js
 *
 *          Arabic translations. See en.js for the conventions and for the
 *          canonical key set.
 *
 *          `dir: "rtl"` is what flips the whole interface: locales.js
 *          writes it onto <html dir>, and the CSS uses logical properties
 *          so the layout follows without a mirrored stylesheet.
 *
 *          Copyright (c) 2026, ArtGins.
 *          All Rights Reserved.
 ***********************************************************************/
const ar = {
    name: "العربية",
    dir: "rtl",

    translation: {
        "player":               "مشغّل الموسيقى",
        "library":              "المكتبة",
        "sources":              "المصادر",
        "lists":                "القوائم",
        "add folder":           "إضافة مجلد",
        "add files":            "إضافة ملفات",
        "theme":                "سمة فاتحة / داكنة",
        "colours":              "اللون",
        "palette auto":         "حسب الغلاف",
        "palette gold":         "ذهبي",
        "palette ice":          "جليدي",
        "palette rose":         "وردي",
        "palette leaf":         "أخضر",
        "language":             "اللغة",
        "help":                 "المساعدة وحقوق العمل",
        "more":                 "المزيد",
        "developer":            "المطوّر",
        "site map":             "خريطة الموقع",

        "play":                 "تشغيل",
        "pause":                "إيقاف مؤقت",
        "previous":             "السابق",
        "next":                 "التالي",
        "shuffle":              "عشوائي",
        "repeat":               "تكرار",
        "back":                 "رجوع",
        "close":                "إغلاق",
        "cancel":               "إلغاء",
        "save":                 "حفظ",
        "delete":               "حذف",
        "remove":               "إزالة",
        "add to queue":         "إضافة إلى القائمة",
        /*  ---- counts ---- */
        "n tracks_zero": "مقطوعات",
        "n tracks_one": "مقطوعة",
        "n tracks_two": "مقطوعتان",
        "n tracks_few": "مقطوعات",
        "n tracks_many": "مقطوعة",
        "n tracks_other": "مقطوعة",
        "n albums_zero": "ألبومات",
        "n albums_one": "ألبوم",
        "n albums_two": "ألبومان",
        "n albums_few": "ألبومات",
        "n albums_many": "ألبومًا",
        "n albums_other": "ألبوم",
        "n entries_zero": "مُدخلات",
        "n entries_one": "مُدخل",
        "n entries_two": "مُدخلان",
        "n entries_few": "مُدخلات",
        "n entries_many": "مُدخلًا",
        "n entries_other": "مُدخل",
        "n missing_zero": "مفقودة",
        "n missing_one": "مفقودة",
        "n missing_two": "مفقودتان",
        "n missing_few": "مفقودة",
        "n missing_many": "مفقودة",
        "n missing_other": "مفقودة",
        "n folders inside_zero": "مجلدات بالداخل",
        "n folders inside_one": "مجلد بالداخل",
        "n folders inside_two": "مجلدان بالداخل",
        "n folders inside_few": "مجلدات بالداخل",
        "n folders inside_many": "مجلدًا بالداخل",
        "n folders inside_other": "مجلد بالداخل",
        "albums":               "ألبومات",
        "reading tags":         "جارٍ قراءة الوسوم…",

        "nothing cued":         "لا شيء محمَّل",
        "load something to start":
            "أضف مجلدًا أو بعض المقطوعات، وستظهر هنا على المنصة.",
        "queue":                "قائمة التشغيل",
        "empty the queue?":     "هل تريد إفراغ القائمة؟",
        "maximise the queue":   "عرض القائمة كاملة",
        "show the player":      "عرض المشغل",
        "the queue is empty":   "قائمة التشغيل فارغة.",
        "clear queue":          "إفراغ القائمة",
        "follow playing":       "تتبّع ما يُشغَّل",
        "save as list":         "حفظ كقائمة",
        "already saved":        "محفوظة بالفعل، ولم تتغيّر",
        "move up":              "تحريك لأعلى",
        "move down":            "تحريك لأسفل",
        "remove from queue":    "إخراج من القائمة",
        "name for this list":   "اسم هذه القائمة",

        "artists":              "الفنانون",
        "genres":               "الأنواع",
        "folders":              "المجلدات",
        "all":                  "الكل",
        "search placeholder":   "ابحث عن عنوان أو فنان أو ألبوم…",
        "search":               "بحث",
        "nothing here":         "لا شيء هنا.",
        "unknown artist":       "فنان غير معروف",
        "unknown album":        "ألبوم غير معروف",
        "unknown genre":        "نوع غير معروف",
        "play all":             "تشغيل الكل",
        "replace the queue":
            "هل تستبدل ما على المنصة؟",
        "replace warning":
            "تشغيل هذا يتخلّص من قائمتك الحالية ويبدأ من أول ما اخترته.",
        "replace and play":
            "استبدال وتشغيل",
        "on the deck":
            "على المنصة بالفعل",
        "preview":              "استماع",
        "previewing":           "جارٍ الاستماع",
        "temporary list":      "قائمة مؤقتة",
        "back to the deck":    "العودة إلى القائمة",
        "to the deck":        "إلى القائمة",
        "look inside":       "انظر بالداخل",
        "already on the deck": "في القائمة بالفعل",
        "temporary queue":      "قائمة أُعدّت يدويًا",
        "playing list":         "قائمة",
        "edited":               "معدَّلة",
        "add music in sources": "أضف موسيقى من المصادر",
        "play this":            "تشغيل هذه",
        "album":                  "الألبوم",
        "genre":                "النوع",
        "year":                 "السنة",
        "track number":         "المقطوعة",
        "path":                 "الملف",
        "source":               "المصدر",

        /* ---- الرسم ---- */
        "viz flight":           "طيران",
        "viz notes":            "النغمات",
        "viz spectrum":         "الطيف",
        "viz wave":             "الموجة",
        "viz chroma":           "الكروما",
        "viz off":              "متوقف",

        "loved":                "المفضّلة",
        "most played":          "الأكثر استماعًا",
        "clear the counts":     "تصفير الأعداد",
        "yes, clear them":      "نعم، صفّرها",
        "hearts are not touched": "لن تُمسّ القلوب",
        "no hearts yet":        "لا توجد قلوب بعد.",
        "how to give a heart":  "انقر القلب بجانب الاسم لتمنحه واحدًا، وانقر مرة أخرى لتمنحه آخر.",
        "nothing played yet":   "لم تستمع إلى شيء بعد.",
        "how playing counts":   "تُحتسب المقطوعة بعد أن تكون قد سُمعت فعلًا لبعض الوقت، أما تخطّيها فلا يُحتسب.",
        "artist":               "الفنان",
        "times played":         "مرات الاستماع",
        "played through":       "كاملة",
        "hearts":               "القلوب",
        "give a heart":         "امنح قلبًا",
        "take one back":        "استرجع واحدًا",
        "reset hearts":         "تصفير القلوب",
        "forget these counts":  "انسَ هذه الأعداد",

        "no cover for this":    "هذا الألبوم بلا غلاف",
        "covers offer detail":
            "يمكنني البحث عنه على الإنترنت: يخرج اسم الفنان واسم الألبوم فقط، لا شيء غير ذلك.",
        "look for it":          "ابحث عنه",
        "retry the ones that failed": "أعد المحاولة لما لم يُعثر عليه",
        "cover not found":      "لم يُعثر على غلاف",
        "cover retry detail":
            "ربما كانت الخدمة متوقفة. يمكنك المحاولة مرة أخرى.",
        "try again":            "حاول مرة أخرى",
        "look for covers online": "ابحث عن الأغلفة على الإنترنت",
        "covers online explained":
            "عند تشغيله، حين يبدأ ألبوم لا غلاف له داخل الملف، يخرج اسم فنانه واسم الألبوم كنص فقط — لا شيء غير ذلك: لا ملفات ولا قوائم ولا معرّفات. لا يُسأل إلا عمّا تستمع إليه الآن، ولا تُرسل مكتبتك كاملة أبدًا، وما يعود يُحفظ هنا: لن يُسأل عن ذلك الألبوم مرة أخرى. أطفئه فلا يخرج من هذا التطبيق أي شيء على الإطلاق.",
        "covers online working": "جارٍ البحث عن غلاف «{{asking}}»…",
        "covers found_zero":    "لم يُعثر على شيء.",
        "covers found_one":     "عُثر على واحدة.",
        "covers found_two":     "عُثر على اثنتين.",
        "covers found_few":     "عُثر على {{count}}.",
        "covers found_many":    "عُثر على {{count}}.",
        "covers found_other":   "عُثر على {{count}}.",
        "covers missed_zero":
            "{{count}} بلا نتيجة (لن يُسأل عنها لمدة شهر).",
        "covers missed_one":    "واحدة بلا نتيجة (لن يُسأل عنها لمدة شهر).",
        "covers missed_two":    "اثنتان بلا نتيجة (لن يُسأل عنهما لمدة شهر).",
        "covers missed_few":    "{{count}} بلا نتيجة (لن يُسأل عنها لمدة شهر).",
        "covers missed_many":   "{{count}} بلا نتيجة (لن يُسأل عنها لمدة شهر).",
        "covers missed_other":  "{{count}} بلا نتيجة (لن يُسأل عنها لمدة شهر).",
        "authorised sources":   "المجلدات المصرَّح بها",
        "add a folder":         "إضافة مجلد",
        "add loose files":      "إضافة ملفات مفردة",
        "folders are recursive":
            "يُؤخذ المجلد كاملًا: هو وكل المجلدات التي تحته.",
        "nothing is copied":
            "لا يُنسخ شيء ولا يُرفع شيء. يُحفَظ فقط مرجع إلى ما هو موجود أصلًا على قرصك.",
        "allow on every visit":
            "يُحفظ المجلد، لكن الإذن عليه بيد المتصفح. يطلبه Chrome على أندرويد من جديد عند كل تشغيل، ولا يوجد إعداد في هذا التطبيق يغيّر ذلك — لذا فالتصريح نقرة واحدة في شاشة المشغّل التي تصل إليها عند الفتح. وإذا عرض متصفحك «السماح في كل زيارة»، فاختياره يوقف السؤال.",
        "folders need authorising":
            "مجلدات بانتظار التصريح",
        "sources persist":
            "يتذكر هذا المتصفح مجلداتك بين الجلسات. بعد إعادة التحميل تكفي نقرة واحدة لإعادة التصريح.",
        "storage may be cleared":
            "لم يمنح متصفحك تخزينًا دائمًا، لذا قد يتخلّص من مجلداتك عندما يحتاج مساحة — أو إذا كان مضبوطًا على مسح بيانات المواقع عند الخروج. إذا كانت مجلداتك تختفي، فهذا هو السبب.",
        "could not be saved":
            "تعذّر حفظ مجلداتك: هذا المتصفح لا يسمح للتطبيق بتخزين أي شيء. ستُفقد عند إغلاقه.",
        "another tab is holding it":
            "علامة تبويب أخرى من هذا التطبيق مفتوحة بإصدار أقدم وتحتجز قاعدة البيانات. أغلقها وأعد تحميل هذه الصفحة.",
        "sources do not persist":
            "لا يستطيع هذا المتصفح حفظ إذن الوصول إلى مجلد، لذا تُحفَظ الملفات التي تختارها كقائمة ثابتة. لن تظهر المقطوعات التي تضيفها إلى المجلد لاحقًا.",
        "upload warning explained":
            "سيسألك المتصفح إن كنت تريد «رفع» المجلد. هذه صياغته العامة لتسليم الملفات إلى الصفحة: لا يُرسل شيء إلى أي مكان، ولا يوجد خادم يُرسل إليه.",
        "snapshot warning":
            "إنها لقطة ثابتة: لن تظهر الملفات التي تضيفها لاحقًا إلى هذا المجلد. أضف المجلد من جديد لتحديثه.",
        "authorise":            "تصريح",
        "rescan":               "إعادة الفحص",
        "no sources yet":       "لا توجد مصادر بعد.",
        "reading":              "جارٍ القراءة…",
        "waiting its turn":   "في انتظار المجلد الذي قبله",
        "preparing folder":
            "جارٍ تحضير المجلد…",
        "this can take a while":
            "قد يستغرق هذا بعض الوقت: المتصفح يسلّم الملفات، ومجلد الموسيقى الكبير يحتاج وقتًا. لا يُرسل شيء إلى أي مكان.",
        "stop":                 "إيقاف",
        "stopping":                 "جارٍ الإيقاف…",
        "stopped":              "تم الإيقاف قبل إنهاء المجلد",
        "waiting for permission": "في انتظار الإذن",
        "permission denied":    "تم رفض الإذن",
        "no audio here":        "لا توجد ملفات صوتية هناك.",
        "that file could not be read":
            "تعذّرت قراءة هذا الملف. ربما نُقل أو حُذف.",
        "could not be read":    "تعذّرت القراءة",
        "folder":               "مجلد",
        "files":                "ملفات",
        "remove this source":   "إزالة هذا المصدر",
        "remove this source?":  "هل تريد إزالة هذا المصدر؟",

        /*  ---- اختيار كان سيُكرِّر شيئًا ---- */
        "folder already added":
            "«{{name}}» موجود في القائمة بالفعل. لم يُضَف شيء مرتين. لقراءة ملفات أُضيفت إليه بعد ذلك، استعمل إعادة القراءة في صفّه.",
        "folder inside another":
            "«{{name}}» داخل «{{other}}» الموجود بالفعل — والمجلد يُؤخذ كاملًا، فمقاطعه في مكتبتك من قبل.",
        "files already added":
            "هذه الملفات موجودة بالفعل، في: {{other}}. لم يُضَف شيء مرتين.",
        "some were already in_zero":
            "{{count}} منها كانت موجودة بالفعل، في: {{other}}. تُركت تلك، وأُضيف الباقي.",
        "some were already in_one":
            "واحد منها كان موجودًا بالفعل، في: {{other}}. تُرك ذاك، وأُضيف الباقي.",
        "some were already in_two":
            "اثنان منها كانا موجودين بالفعل، في: {{other}}. تُركا، وأُضيف الباقي.",
        "some were already in_few":
            "{{count}} منها كانت موجودة بالفعل، في: {{other}}. تُركت تلك، وأُضيف الباقي.",
        "some were already in_many":
            "{{count}} منها كانت موجودة بالفعل، في: {{other}}. تُركت تلك، وأُضيف الباقي.",
        "some were already in_other":
            "{{count}} منها كانت موجودة بالفعل، في: {{other}}. تُركت تلك، وأُضيف الباقي.",
        "folder contains others":
            "داخل «{{name}}» موجود بالفعل: {{other}}. لأخذ المجلد كاملًا دون أن تظهر تلك المقاطع مرتين، لا بد من إزالته أولًا — ومعه عدّاد الاستماع والقلوب.",
        "remove it and add this":
            "أزِله وأضِف هذا",
        "understood":           "فهمت",
        "diagnostics":         "تشخيص",
        "copy":                "نسخ",
        "new version":         "تتوفر نسخة جديدة",
        "reload":             "إعادة التحميل",

        /* ---- installing ---- */
        "install this app":     "تثبيت التطبيق",
        "install why":
            "بعد التثبيت يفتح yunomúsica مثل أي تطبيق آخر على جهازك — والأهم أن المتصفح يستطيع حينها الاحتفاظ بالإذن على مجلدات الموسيقى بدل أن يسأل من جديد في كل تشغيل.",
        "install so folders stay": "لكي تبقى مجلداتك مأذونة",
        "install":             "تثبيت",
        "not now":             "ليس الآن",

        "saved lists":          "القوائم المحفوظة",
        "no saved lists yet":   "لا توجد قوائم محفوظة بعد.",
        "how to save a list":   "جهّز قائمة تشغيل في المشغّل ثم احفظها باسم.",
        "delete this list":     "هل تريد حذف هذه القائمة؟",

        "your music your way":  "موسيقاك، كما تحب أن تراها.",
        "about lead":
            "يقرأ Yunomúsica الموسيقى الموجودة على جهازك ويرتّبها حسب الفنان والألبوم والنوع والمجلد. يعمل بالكامل داخل المتصفح: بلا حساب، وبلا رفع، وبلا تتبّع.",
        "how it works":         "كيف يعمل",
        "help pick":
            "صرّح بمجلد من قسم المصادر. يُقرأ كاملًا مع مجلداته الفرعية، وتعطي وسوم ID3 لكل ملف الفنان والألبوم والنوع.",
        "help queue":
            "المشغّل هو المنصة: القائمة هي ما حمّلته، بالترتيب الذي تريده. أضف وأعد الترتيب وأخرج المقطوعات أثناء التشغيل.",
        "help lists":
            "احفظ قائمة باسم وستعود إليك في المرة القادمة — كمراجع إلى ملفاتك، لا كنسخ منها.",
        "help privacy":
            "ملفاتك لا تغادر الجهاز. لا يوجد خادم تُرسل إليه.",
        "do not show this again": "لا تعرض هذا مرة أخرى",
        "made by artgins":      "من صنع ArtGins",
        "made with yuneta":     "مصنوع باستخدام Yuneta",
        "about tagline":        "إطار عمل مدفوع بالأحداث للأنظمة الموزَّعة.",

        /* ---- the menu, and the developer sheet behind it ---- */
        "source code":          "الشيفرة المصدرية",
        "session log":          "سجل الجلسة",
        "traces":               "التتبّع",
        "refresh":              "تحديث",
        "loading":              "جارٍ التحميل…",
        "clear log":            "مسح السجل",
        "copied":               "تم النسخ",
        "log empty":
            "لا يوجد شيء مسجَّل بعد. يكتب السجل نفسه أثناء عمل التطبيق.",
        "no unexpected stop":   "لم يُسجَّل أي توقف غير متوقع.",
        "last unexpected stop": "توقف التطبيق ثم بدأ من جديد",
        "browser discarded the app": "تخلّص المتصفح من التطبيق ليوفّر الذاكرة.",
        "stopped while playing": "توقف أثناء تشغيل:",
        "silent for":           "صامت لمدة:",
        "memory in use":        "الذاكرة المستخدمة:",
        "restarts today":       "مرات إعادة التشغيل خلال ٢٤ ساعة:",
        "unexpected stops today":
            "مرات التوقف غير المتوقع خلال ٢٤ ساعة:",

        /* ---- the site map draws itself with gobj-ui's OWN keys — untranslated, they show as the key ---- */
        "site map hint":
            "كل موضع يمكن للتطبيق الوصول إليه هو رابط. المس واحدًا للانتقال.",
        "print":                "طباعة",
        "filter":               "تصفية…",
        "matches":              "نتائج مطابقة",
        "show references":      "إظهار المراجع",
        "shown above":          "معروض في الأعلى",
        "you are here":         "أنت هنا",
    },
};

export {ar};
