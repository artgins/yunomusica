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
        "tracks":               "مقطوعات",
        "n albums":             "ألبومات",
        "albums":               "ألبومات",
        "entries":              "مُدخلات",
        "missing":              "مفقودة",
        "reading tags":         "جارٍ قراءة الوسوم…",

        "nothing cued":         "لا شيء محمَّل",
        "load something to start":
            "أضف مجلدًا أو بعض المقطوعات، وستظهر هنا على المنصة.",
        "queue":                "قائمة التشغيل",
        "the queue is empty":   "قائمة التشغيل فارغة.",
        "clear queue":          "إفراغ القائمة",
        "follow playing":       "تتبّع ما يُشغَّل",
        "save as list":         "حفظ كقائمة",
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
        "viz notes":            "النغمات",
        "viz spectrum":         "الطيف",
        "viz wave":             "الموجة",
        "viz chroma":           "الكروما",
        "viz off":              "متوقف",
        "artist":               "الفنان",
        "times played":         "مرات الاستماع",
        "played through":       "كاملة",
        "hearts":               "القلوب",
        "give a heart":         "امنح قلبًا",
        "take one back":        "استرجع واحدًا",
        "reset hearts":         "تصفير القلوب",
        "forget these counts":  "انسَ هذه الأعداد",

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
    },
};

export {ar};
