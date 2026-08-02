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
        "language":             "语言",
        "help":                 "帮助与致谢",

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
        "tracks":               "首",
        "n albums":             "张专辑",
        "albums":               "专辑",
        "entries":              "条",
        "missing":              "缺失",
        "reading tags":         "正在读取标签…",

        "nothing cued":         "未载入曲目",
        "load something to start":
            "添加一个文件夹或几首曲目，它们会出现在这里的播放台上。",
        "queue":                "队列",
        "the queue is empty":   "队列是空的。",
        "clear queue":          "清空队列",
        "save as list":         "保存为列表",
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
        "diagnostics":         "诊断信息",
        "copy":                "复制",

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
        "about tagline":        "基于 Yuneta 构建 —— 一个面向分布式系统的事件驱动框架。",
    },
};

export {zh};
