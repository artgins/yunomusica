/***********************************************************************
 *          ja.js
 *
 *          Japanese translations. See en.js for the conventions and for
 *          the canonical key set.
 *
 *          Copyright (c) 2026, ArtGins.
 *          All Rights Reserved.
 ***********************************************************************/
const ja = {
    name: "日本語",
    dir: "ltr",

    translation: {
        "player":               "プレーヤー",
        "library":              "ライブラリ",
        "sources":              "ソース",
        "lists":                "リスト",
        "add folder":           "フォルダーを追加",
        "add files":            "ファイルを追加",
        "theme":                "ライト / ダークテーマ",
        "language":             "言語",
        "help":                 "ヘルプとクレジット",

        "play":                 "再生",
        "pause":                "一時停止",
        "previous":             "前へ",
        "next":                 "次へ",
        "shuffle":              "シャッフル",
        "repeat":               "リピート",
        "back":                 "戻る",
        "close":                "閉じる",
        "cancel":               "キャンセル",
        "save":                 "保存",
        "delete":               "削除",
        "remove":               "取り除く",
        "add to queue":         "キューに追加",
        "tracks":               "曲",
        "n albums":             "アルバム",
        "albums":               "アルバム",
        "entries":              "項目",
        "missing":              "見つかりません",
        "reading tags":         "タグを読み込み中…",

        "nothing cued":         "何も読み込まれていません",
        "load something to start":
            "フォルダーか数曲を追加すると、ここのデッキに並びます。",
        "queue":                "キュー",
        "the queue is empty":   "キューは空です。",
        "clear queue":          "キューを空にする",
        "save as list":         "リストとして保存",
        "move up":              "上へ",
        "move down":            "下へ",
        "remove from queue":    "キューから外す",
        "name for this list":   "このリストの名前",

        "artists":              "アーティスト",
        "genres":               "ジャンル",
        "folders":              "フォルダー",
        "all":                  "すべて",
        "search placeholder":   "タイトル・アーティスト・アルバムを検索…",
        "search":               "検索",
        "nothing here":         "ここには何もありません。",
        "unknown artist":       "不明なアーティスト",
        "unknown album":        "不明なアルバム",
        "unknown genre":        "不明なジャンル",
        "play all":             "すべて再生",

        "authorised sources":   "許可したフォルダー",
        "add a folder":         "フォルダーを追加",
        "add loose files":      "単体のファイルを追加",
        "folders are recursive":
            "フォルダーは丸ごと読み込みます。そのフォルダーと、その下のすべてのフォルダーです。",
        "nothing is copied":
            "何もコピーせず、何もアップロードしません。保存されるのは、すでにディスク上にあるものへの参照だけです。",
        "sources persist":
            "このブラウザーはセッションをまたいでフォルダーを覚えています。再読み込み後はクリック一つで再び許可できます。",
        "sources do not persist":
            "このブラウザーはフォルダーの許可を保存できないため、選んだファイルは固定の一覧として記憶されます。あとからフォルダーに追加した曲は現れません。",
        "snapshot warning":
            "これはスナップショットです。あとからこのフォルダーに追加したファイルは現れません。更新するにはもう一度追加してください。",
        "authorise":            "許可する",
        "rescan":               "読み直す",
        "no sources yet":       "ソースはまだありません。",
        "reading":              "読み込み中…",
        "waiting for permission": "許可を待っています",
        "permission denied":    "許可されませんでした",
        "no audio here":        "そこに音声ファイルはありません。",
        "that file could not be read":
            "そのファイルを読めませんでした。移動または削除された可能性があります。",
        "could not be read":    "読み込めませんでした",
        "folder":               "フォルダー",
        "files":                "ファイル",
        "remove this source":   "このソースを取り除く",

        "saved lists":          "保存したリスト",
        "no saved lists yet":   "保存したリストはまだありません。",
        "how to save a list":   "プレーヤーでキューを組み立て、名前を付けて保存します。",
        "delete this list":     "このリストを削除しますか？",

        "your music your way":  "あなたの音楽を、見たいかたちで。",
        "about lead":
            "Yunomúsica は端末にすでにある音楽を読み取り、アーティスト・アルバム・ジャンル・フォルダーごとに整理します。すべてブラウザー内で動作し、アカウントもアップロードも追跡もありません。",
        "how it works":         "仕組み",
        "help pick":
            "「ソース」でフォルダーを許可します。サブフォルダーを含めて丸ごと読み込み、各ファイルの ID3 タグからアーティスト・アルバム・ジャンルを取得します。",
        "help queue":
            "プレーヤーがデッキです。キューは読み込んだ曲を好きな順に並べたもの。再生中でも追加・並べ替え・取り外しができます。",
        "help lists":
            "キューに名前を付けて保存すれば次回も使えます。保存されるのはファイルへの参照であり、コピーではありません。",
        "help privacy":
            "ファイルが端末から出ることはありません。送る先のサーバーが存在しないからです。",
        "do not show this again": "今後表示しない",
        "made by artgins":      "ArtGins 制作",
        "about tagline":        "Yuneta 上に構築 — 分散システムのためのイベント駆動フレームワーク。",
    },
};

export {ja};
