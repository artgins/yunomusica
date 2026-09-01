/***********************************************************************
 *          zh.js
 *
 *          Simplified Chinese translations. See en.js for the conventions
 *          and for the canonical key set.
 *
 *          Copyright (c) 2026, ArtGins.
 *          All Rights Reserved.
 ***********************************************************************/
const zh = {
    name: "中文",
    dir: "ltr",

    translation: {
        "player":               "播放器",
        "library":              "音乐库",
        "sources":              "来源",
        "lists":                "列表",
        "add folder":           "添加文件夹",
        "add files":            "添加文件",
        "theme":                "浅色 / 深色主题",
        "colours":              "颜色",
        "palette auto":         "跟随封面",
        "palette gold":         "金色",
        "palette ice":          "冰蓝",
        "palette rose":         "玫瑰",
        "palette leaf":         "叶绿",
        "language":             "语言",
        "help":                 "帮助与致谢",
        "more":                 "更多",
        "developer":            "开发者",
        "site map":             "站点地图",

        "play":                 "播放",
        "pause":                "暂停",
        "previous":             "上一首",
        "next":                 "下一首",
        "shuffle":              "随机播放",
        "repeat":               "循环播放",
        "back":                 "返回",
        "close":                "关闭",
        "cancel":               "取消",
        "save":                 "保存",
        "delete":               "删除",
        "remove":               "移除",
        "add to queue":         "加入队列",
        /*  ---- counts ---- */
        "n tracks_other": "首",
        "n albums_other": "张专辑",
        "n entries_other": "条",
        "n missing_other": "缺失",
        "n folders inside_other": "个子文件夹",
        "albums":               "专辑",
        "reading tags":         "正在读取标签…",

        "nothing cued":         "未载入曲目",
        "load something to start":
            "添加一个文件夹或几首曲目，它们会出现在这里的播放台上。",
        "queue":                "队列",
        "empty the queue?":     "清空队列？",
        "maximise the queue":   "查看整个队列",
        "show the player":      "显示播放器",
        "the queue is empty":   "队列是空的。",
        "clear queue":          "清空队列",
        "follow playing":       "跟随正在播放",
        "save as list":         "保存为列表",
        "already saved":        "已保存，且未修改",
        "move up":              "上移",
        "move down":            "下移",
        "remove from queue":    "移出队列",
        "name for this list":   "列表名称",

        "artists":              "艺人",
        "genres":               "流派",
        "folders":              "文件夹",
        "all":                  "全部",
        "search placeholder":   "搜索标题、艺人、专辑…",
        "search":               "搜索",
        "nothing here":         "这里什么都没有。",
        "unknown artist":       "未知艺人",
        "unknown album":        "未知专辑",
        "unknown genre":        "未知流派",
        "play all":             "全部播放",
        "replace the queue":
            "要替换播放台上的内容吗？",
        "replace warning":
            "播放这个会丢弃你现在的队列，并从所选内容的开头开始。",
        "replace and play":
            "替换并播放",
        "on the deck":
            "已在播放台上",
        "preview":              "试听",
        "previewing":           "试听中",
        "temporary list":      "临时列表",
        "back to the deck":    "回到队列",
        "to the deck":        "加入队列",
        "look inside":       "查看内容",
        "already on the deck": "已在队列中",
        "temporary queue":      "手动编排的队列",
        "playing list":         "列表",
        "edited":               "已修改",
        "add music in sources": "在「来源」中添加音乐",
        "play this":            "播放这首",
        "album":                  "专辑",
        "genre":                "流派",
        "year":                 "年份",
        "track number":         "音轨",
        "path":                 "文件",
        "source":               "来源",

        /* ---- 可视化 ---- */
        "viz flight":           "飞行",
        "viz notes":            "音符",
        "viz spectrum":         "频谱",
        "viz wave":             "波形",
        "viz chroma":           "音级",
        "viz off":              "关闭",

        "loved":                "喜欢的",
        "most played":          "最常播放",
        "clear the counts":     "计数清零",
        "yes, clear them":      "是，全部清零",
        "hearts are not touched": "不会动喜欢",
        "no hearts yet":        "还没有任何喜欢。",
        "how to give a heart":  "点名称旁边的心形即可添加，再点一次再加一个。",
        "nothing played yet":   "还没有播放过任何内容。",
        "how playing counts":   "一首曲子真正播放一段时间后才计数，跳过不算。",
        "artist":               "艺术家",
        "times played":         "播放次数",
        "played through":       "次完整播放",
        "hearts":               "喜欢",
        "give a heart":         "点一个喜欢",
        "take one back":        "收回一个",
        "reset hearts":         "清零喜欢",
        "forget these counts":  "忘记这些计数",

        "no cover for this":    "这张唱片没有封面",
        "covers offer detail":  "我可以上网找找：只发送艺人和专辑名，别的都不发。",
        "look for it":          "去找",
        "retry the ones that failed": "重试没找到的",
        "cover not found":      "没有找到封面",
        "cover retry detail":   "可能是当时服务不可用。可以再试一次。",
        "try again":            "再试一次",
        "look for covers online": "在网上查找封面",
        "covers online explained":
            "打开后，播放文件内没有封面的唱片时，只会把它的艺人和专辑名作为文本发出去——别的都不发：没有文件，没有列表，没有标识符。只会问你正在听的这一张，绝不会问你的整个音乐库；拿回来的结果保存在本机，同一张唱片不会再问第二次。关掉它，这个应用就绝对不会向外发送任何东西。",
        "covers online working": "正在查找“{{asking}}”的封面…",
        "covers found_other":   "找到 {{count}} 张。",
        "covers missed_other":  "{{count}} 张没有结果（一个月内不再询问）。",
        "authorised sources":   "已授权的文件夹",
        "add a folder":         "添加一个文件夹",
        "add loose files":      "添加单独的文件",
        "folders are recursive":
            "文件夹会被整个读取：该文件夹以及它下面的所有子文件夹。",
        "nothing is copied":
            "不复制任何内容，也不上传任何内容。只保存一个指向你磁盘上现有文件的引用。",
        "allow on every visit":
            "文件夹会被记住，但它的访问权限由浏览器掌管。Android 版 Chrome 每次启动都会重新询问，本应用的任何设置都无法改变这一点——因此授权只需在打开时看到的播放器页面上点一下。如果你的浏览器提供“每次访问都允许”，选择它之后就不会再询问。",
        "folders need authorising":
            "等待授权的文件夹",
        "sources persist":
            "此浏览器会在多次会话之间记住你的文件夹。重新加载后只需点击一次即可重新授权。",
        "storage may be cleared":
            "浏览器尚未授予持久存储权限，因此在需要空间时可能会丢弃你的文件夹——或者在设置为退出时清除站点数据的情况下。如果文件夹总是消失，原因就在这里。",
        "could not be saved":
            "无法保存你的文件夹：此浏览器不允许本应用存储任何内容。关闭后它们将丢失。",
        "another tab is holding it":
            "本应用的另一个标签页正在运行旧版本并占用着数据库。请关闭它并重新加载本页。",
        "sources do not persist":
            "此浏览器无法保存文件夹权限，因此你选择的文件会被记为一份固定清单。之后添加到该文件夹的曲目不会出现。",
        "upload warning explained":
            "浏览器会询问是否“上传”该文件夹。那只是它对“将文件交给页面”的统称：不会向任何地方发送任何内容，也没有可以发送的服务器。",
        "snapshot warning":
            "这是一份快照：之后添加到此文件夹的文件不会出现。重新添加即可刷新。",
        "authorise":            "授权",
        "rescan":               "重新扫描",
        "no sources yet":       "还没有来源。",
        "reading":              "正在读取…",
        "waiting its turn":   "等待前一个文件夹读完",
        "preparing folder":
            "正在准备文件夹…",
        "this can take a while":
            "这可能需要一些时间：浏览器正在交付文件，音乐文件夹很大时会比较慢。不会向任何地方发送任何内容。",
        "stop":                 "停止",
        "stopping":                 "正在停止…",
        "stopped":              "在读完该文件夹之前已停止",
        "waiting for permission": "等待授权",
        "permission denied":    "权限被拒绝",
        "no audio here":        "那里没有音频文件。",
        "that file could not be read":
            "无法读取该文件。它可能已被移动或删除。",
        "could not be read":    "无法读取",
        "folder":               "文件夹",
        "files":                "文件",
        "remove this source":   "移除此来源",
        "remove this source?":  "移除此来源？",

        /*  ---- 会造成重复的一次选择 ---- */
        "folder already added":
            "“{{name}}”已经在列表中，没有重复添加。要读取之后新增的文件，请用该行的“重新扫描”。",
        "folder inside another":
            "“{{name}}”在已经加入的“{{other}}”里面 —— 文件夹是整个读取的，所以它的曲目已经在你的资料库中。",
        "files already added":
            "这些文件已经在了，属于：{{other}}。没有重复添加。",
        "some were already in_other":
            "其中 {{count}} 个已经在了，属于：{{other}}。这些被略过，其余的已添加。",
        "folder contains others":
            "“{{name}}”里面已经加入过：{{other}}。要整个加入而不让那些曲目出现两次，必须先移除它们 —— 它们的播放次数和收藏也会一起消失。",
        "remove it and add this":
            "移除它并添加这个",
        "understood":           "知道了",
        "diagnostics":         "诊断信息",
        "copy":                "复制",
        "new version":         "有新版本可用",
        "reload":             "重新加载",

        /* ---- installing ---- */
        "install this app":     "安装此应用",
        "install why":
            "安装后，yunomúsica 会像设备上的其他应用一样打开；更重要的是，浏览器可以保留对音乐文件夹的授权，而不必每次启动都重新询问。",
        "install so folders stay": "这样文件夹的授权才会保留",
        "install":             "安装",
        "not now":             "以后再说",

        "saved lists":          "已保存的列表",
        "no saved lists yet":   "还没有保存的列表。",
        "how to save a list":   "在播放器里编好队列，然后取名保存。",
        "delete this list":     "删除这个列表？",

        "your music your way":  "你的音乐，按你想要的方式呈现。",
        "about lead":
            "Yunomúsica 读取你设备上已有的音乐，并按艺人、专辑、流派和文件夹整理。它完全在浏览器中运行：无需账号，不上传，不追踪。",
        "how it works":         "工作方式",
        "help pick":
            "在「来源」中授权一个文件夹。它会被整个读取，包含子文件夹，每个文件的 ID3 标签提供艺人、专辑和流派。",
        "help queue":
            "播放器就是播放台：队列就是你载入的内容，顺序由你决定。播放时也可以添加、重排和移除曲目。",
        "help lists":
            "给队列取个名字保存，下次就能找回来 —— 保存的是指向你文件的引用，绝不是副本。",
        "help privacy":
            "你的文件不会离开设备。没有服务器可以接收它们。",
        "do not show this again": "不再显示",
        "made by artgins":      "由 ArtGins 制作",
        "made with yuneta":     "使用 Yuneta 构建",
        "about tagline":        "一个面向分布式系统的事件驱动框架。",

        /* ---- the menu, and the developer sheet behind it ---- */
        "source code":          "源代码",
        "session log":          "会话日志",
        "traces":               "跟踪",
        "refresh":              "刷新",
        "loading":              "加载中…",
        "clear log":            "清空日志",
        "copied":               "已复制",
        "log empty":            "目前还没有任何记录。应用运行时日志会自动写入。",
        "no unexpected stop":   "没有记录到意外停止。",
        "last unexpected stop": "应用曾停止并重新启动",
        "browser discarded the app": "浏览器为腾出内存丢弃了本应用。",
        "stopped while playing": "停止时正在播放：",
        "silent for":           "静默时长：",
        "memory in use":        "已用内存：",
        "restarts today":       "过去 24 小时内的重启次数：",
        "unexpected stops today":
            "过去 24 小时内的意外停止次数：",

        /* ---- the site map draws itself with gobj-ui's OWN keys — untranslated, they show as the key ---- */
        "site map hint":        "应用能到达的每个位置都是一个网址。点按即可前往。",
        "print":                "打印",
        "filter":               "筛选…",
        "matches":              "个匹配",
        "show references":      "显示引用",
        "shown above":          "上面已列出",
        "you are here":         "你在这里",
    },
};

export {zh};
