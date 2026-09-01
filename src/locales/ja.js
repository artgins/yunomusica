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
        "colours":              "色",
        "palette auto":         "ジャケットに合わせる",
        "palette gold":         "ゴールド",
        "palette ice":          "アイス",
        "palette rose":         "ローズ",
        "palette leaf":         "リーフ",
        "language":             "言語",
        "help":                 "ヘルプとクレジット",
        "more":                 "その他",
        "developer":            "開発者",
        "site map":             "サイトマップ",

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
        /*  ---- counts ---- */
        "n tracks_other": "曲",
        "n albums_other": "アルバム",
        "n entries_other": "項目",
        "n missing_other": "見つかりません",
        "n folders inside_other": "個のフォルダー",
        "albums":               "アルバム",
        "reading tags":         "タグを読み込み中…",

        "nothing cued":         "何も読み込まれていません",
        "load something to start":
            "フォルダーか数曲を追加すると、ここのデッキに並びます。",
        "queue":                "キュー",
        "empty the queue?":     "キューを空にしますか？",
        "maximise the queue":   "キュー全体を見る",
        "show the player":      "プレーヤーを表示",
        "the queue is empty":   "キューは空です。",
        "clear queue":          "キューを空にする",
        "follow playing":       "再生中の曲を追う",
        "save as list":         "リストとして保存",
        "already saved":        "保存済みで、変更もありません",
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
        "replace the queue":
            "デッキの内容を置き換えますか？",
        "replace warning":
            "これを再生すると今のキューは破棄され、選んだものの先頭から始まります。",
        "replace and play":
            "置き換えて再生",
        "on the deck":
            "すでにデッキにあります",
        "preview":              "試聴",
        "previewing":           "試聴中",
        "temporary list":      "一時リスト",
        "back to the deck":    "キューに戻る",
        "to the deck":        "キューへ",
        "look inside":       "中を見る",
        "already on the deck": "すでにキューにあり",
        "temporary queue":      "手作業で組んだキュー",
        "playing list":         "リスト",
        "edited":               "変更あり",
        "add music in sources": "「ソース」で音楽を追加",
        "play this":            "これを再生",
        "album":                  "アルバム",
        "genre":                "ジャンル",
        "year":                 "年",
        "track number":         "トラック",
        "path":                 "ファイル",
        "source":               "ソース",

        /* ---- ビジュアライザー ---- */
        "viz flight":           "フライト",
        "viz notes":            "音符",
        "viz spectrum":         "スペクトル",
        "viz wave":             "波形",
        "viz chroma":           "クロマ",
        "viz off":              "オフ",

        "loved":                "お気に入り",
        "most played":          "再生が多い順",
        "clear the counts":     "再生回数をゼロに",
        "yes, clear them":      "はい、ゼロにします",
        "hearts are not touched": "ハートはそのままです",
        "no hearts yet":        "まだハートがありません。",
        "how to give a heart":  "名前の横のハートを押すと付きます。もう一度押すともう一つ。",
        "nothing played yet":   "まだ何も再生していません。",
        "how playing counts":   "曲は実際にしばらく鳴ってから数えられます。飛ばした曲は数えません。",
        "artist":               "アーティスト",
        "times played":         "再生回数",
        "played through":       "回は最後まで",
        "hearts":               "ハート",
        "give a heart":         "ハートをあげる",
        "take one back":        "ひとつ戻す",
        "reset hearts":         "ハートをゼロに",
        "forget these counts":  "この記録を忘れる",

        "no cover for this":    "このアルバムにはジャケットがありません",
        "covers offer detail":
            "インターネットで探せます。出ていくのはアーティスト名とアルバム名だけで、ほかには何もありません。",
        "look for it":          "探す",
        "retry the ones that failed": "見つからなかったものをもう一度",
        "cover not found":      "ジャケットが見つかりません",
        "cover retry detail":   "サービスが止まっていたのかもしれません。もう一度試せます。",
        "try again":            "もう一度試す",
        "look for covers online": "ジャケットをインターネットで探す",
        "covers online explained":
            "オンにすると、ファイルの中にジャケットがないアルバムが鳴りはじめたとき、そのアーティスト名とアルバム名だけがテキストとして出ていきます。ほかには何も——ファイルも、リストも、識別子も出ていきません。たずねるのは今聴いている 1 枚だけで、ライブラリ全体をたずねることはありません。返ってきたものはここに保存され、そのアルバムを二度とたずねることはありません。オフにすれば、このアプリから外に出るものは何ひとつありません。",
        "covers online working": "「{{asking}}」のジャケットを探しています…",
        "covers found_other":   "{{count}} 枚見つかりました。",
        "covers missed_other":  "{{count}} 枚は見つかりませんでした（1 か月は再度たずねません）。",
        "authorised sources":   "許可したフォルダー",
        "add a folder":         "フォルダーを追加",
        "add loose files":      "単体のファイルを追加",
        "folders are recursive":
            "フォルダーは丸ごと読み込みます。そのフォルダーと、その下のすべてのフォルダーです。",
        "nothing is copied":
            "何もコピーせず、何もアップロードしません。保存されるのは、すでにディスク上にあるものへの参照だけです。",
        "allow on every visit":
            "フォルダーは記憶されますが、その許可はブラウザーが管理します。Android の Chrome は起動のたびに再び尋ね、このアプリのどの設定でも変えられません。ですから許可は、開いたときに表示されるプレーヤー画面での 1 タップです。ブラウザーが「毎回許可する」を提示するなら、それを選べば以後は尋ねられません。",
        "folders need authorising":
            "許可待ちのフォルダー",
        "sources persist":
            "このブラウザーはセッションをまたいでフォルダーを覚えています。再読み込み後はクリック一つで再び許可できます。",
        "storage may be cleared":
            "ブラウザーが永続ストレージを許可していないため、空き容量が必要なとき——あるいは終了時にサイトデータを消す設定のとき——フォルダーが破棄されることがあります。フォルダーが消え続けるのはこのためです。",
        "could not be saved":
            "フォルダーを保存できませんでした。このブラウザーはアプリの保存を許可していません。閉じると失われます。",
        "another tab is holding it":
            "このアプリの別のタブが古いバージョンで開いていて、データベースを保持しています。そのタブを閉じてこのページを再読み込みしてください。",
        "sources do not persist":
            "このブラウザーはフォルダーの許可を保存できないため、選んだファイルは固定の一覧として記憶されます。あとからフォルダーに追加した曲は現れません。",
        "upload warning explained":
            "ブラウザーがフォルダーを「アップロード」するか尋ねてきます。これは「ファイルをページに渡す」ことを指す一般的な言い回しです。どこにも送信されず、送る先のサーバーもありません。",
        "snapshot warning":
            "これはスナップショットです。あとからこのフォルダーに追加したファイルは現れません。更新するにはもう一度追加してください。",
        "authorise":            "許可する",
        "rescan":               "読み直す",
        "no sources yet":       "ソースはまだありません。",
        "reading":              "読み込み中…",
        "waiting its turn":   "前のフォルダーの読み込み待ち",
        "preparing folder":
            "フォルダーを準備しています…",
        "this can take a while":
            "しばらくかかることがあります。ブラウザーがファイルを引き渡しているところで、音楽フォルダーが大きいと時間がかかります。どこにも送信されません。",
        "stop":                 "停止",
        "stopping":                 "停止しています…",
        "stopped":              "フォルダーを読み終える前に停止しました",
        "waiting for permission": "許可を待っています",
        "permission denied":    "許可されませんでした",
        "no audio here":        "そこに音声ファイルはありません。",
        "that file could not be read":
            "そのファイルを読めませんでした。移動または削除された可能性があります。",
        "could not be read":    "読み込めませんでした",
        "folder":               "フォルダー",
        "files":                "ファイル",
        "remove this source":   "このソースを取り除く",
        "remove this source?":  "このソースを取り除きますか？",

        /*  ---- 何かを二重にしていたはずの選択 ---- */
        "folder already added":
            "「{{name}}」はすでに一覧にあります。二重には追加していません。その後で入れたファイルを読むには、その行の「読み直す」を押してください。",
        "folder inside another":
            "「{{name}}」はすでに入っている「{{other}}」の中にあります。フォルダーは丸ごと読むので、その曲はもうライブラリにあります。",
        "files already added":
            "それらのファイルはすでにあります。ここにあります：{{other}}。二重には追加していません。",
        "some were already in_other":
            "そのうち {{count}} 個はすでにここにありました：{{other}}。それらは外し、残りを追加しました。",
        "folder contains others":
            "「{{name}}」の中に、すでに追加済みのものがあります：{{other}}。フォルダー全体を取り込んでもその曲が二重にならないようにするには、先にそれを外すしかなく、再生回数とお気に入りもいっしょに消えます。",
        "remove it and add this":
            "それを外してこれを追加",
        "understood":           "わかりました",
        "diagnostics":         "診断情報",
        "copy":                "コピー",
        "new version":         "新しいバージョンがあります",
        "reload":             "再読み込み",

        /* ---- installing ---- */
        "install this app":     "アプリをインストール",
        "install why":
            "インストールすると yunomúsica は端末の他のアプリと同じように開きます。さらに大事なのは、ブラウザが音楽フォルダーの許可を保持できるようになり、起動のたびに聞き直さなくなることです。",
        "install so folders stay": "フォルダーの許可を保つために",
        "install":             "インストール",
        "not now":             "今はしない",

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
        "made with yuneta":     "Yuneta で構築",
        "about tagline":        "分散システムのためのイベント駆動フレームワーク。",

        /* ---- the menu, and the developer sheet behind it ---- */
        "source code":          "ソースコード",
        "session log":          "セッションログ",
        "traces":               "トレース",
        "refresh":              "更新",
        "loading":              "読み込み中…",
        "clear log":            "ログを消去",
        "copied":               "コピーしました",
        "log empty":            "まだ記録はありません。アプリの動作中にログは自動で書かれます。",
        "no unexpected stop":   "予期しない停止は記録されていません。",
        "last unexpected stop": "アプリが停止して再起動しました",
        "browser discarded the app": "ブラウザがメモリ確保のためアプリを破棄しました。",
        "stopped while playing": "停止したときに再生していた曲:",
        "silent for":           "無音だった時間:",
        "memory in use":        "使用中のメモリ:",
        "restarts today":       "過去 24 時間の再起動回数:",
        "unexpected stops today":
            "過去 24 時間の予期しない停止回数:",

        /* ---- the site map draws itself with gobj-ui's OWN keys — untranslated, they show as the key ---- */
        "site map hint":        "アプリが行けるすべての場所は URL です。タップすると移動します。",
        "print":                "印刷",
        "filter":               "絞り込み…",
        "matches":              "件一致",
        "show references":      "参照を表示",
        "shown above":          "上に表示済み",
        "you are here":         "現在地",
    },
};

export {ja};
