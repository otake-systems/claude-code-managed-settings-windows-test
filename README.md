# Claude Code managed settings: mods vs deny rules, a before/after test on Windows

A hands-on record from one Windows machine (2026-11-02, Claude Code 2.1.316). Without a `managed-settings.json`, a test mod's `allow` got past a `deny` rule and a blocking `PreToolUse` hook. With the file in place, the same mod still returned `allow`, and both held. One surprise: sessions started before `C:\Program Files\ClaudeCode` existed did not pick the file up until restarted. The rest of this page is in Japanese.

個人が自分の機械と自分のトークンで確かめた記録です。Anthropic とは関係ありません。公式の説明は末尾の「関連」にあります。

## 結論

- `managed-settings.json` を置く前は、試験用の mod の `allow` が deny の行と PreToolUse hook の止めを越えた。
- 置いた後は、同じ mod が `allow` を返しても、どちらも止まった。
- **起動時に置き場のフォルダが無かった窓には届かなかった。** 起動し直すと効いた。

## 環境

- Windows 11 Pro（10.0.26300）
- Claude Code CLI 2.1.316、Claude Desktop 4.4212.0（内蔵の Claude Code は 2.1.309）
- 個人の Ultra アカウント（Team・Enterprise は試していない）
- 置いた場所は `C:\Program Files\ClaudeCode\managed-settings.json`

## 置く前と置いた後

| 試した事（どれも mod が許可を返す命令は `testmod/` の 4 つだけ） | 置く前 | 置いた後 |
|---|---|---|
| `--settings` の deny の行に当たる `echo S5TEST-F18` | 通った | `has been denied` |
| 自前の PreToolUse hook が止める `printenv S5TEST-F18` | 通った | hook の字で止まった |
| deny の行が無い `mkdir control-S5TEST-F18` | 確認の画面なしで通った | 確認の画面なしで通った |
| mod が許可しない `mkdir plain-dir`（manual mode） | 確認の画面 | 確認の画面 |
| 管理者の deny の行 `Bash(rm -r*)` に当たる `rm -r empty-S5TEST-F18` | 打っていない | `has been denied` |

置いた後の画面には次の字が出た。

```text
cc-plugin-sec-default: s5test-f18 tried to lift a deny rule in your settings from a Bash call (Bash(rm -r*)); the deny rule holds over the plugins you install (allowModsToOverrideDenyRules)
cc-plugin-sec-default: s5test-f18 tried to lift a refusal from a Bash call; the refusal holds over the plugins you install (allowModsToOverrideDenyRules)
```

## 管理者の deny の行で止まった形（23 形）

hook を読まない窓（`--setting-sources project`）・manual mode で試した。すべて確認の画面なしで `has been denied` だった。

| 道具 | 形 |
|---|---|
| Bash（8 形） | `git reset --hard`・`git -C . reset --hard`・`git push --force origin main`・`git push -f origin main`・`git clean -fd`・`git checkout -- a.txt`・`git restore -- a.txt`・`git commit --amend -m x` |
| PowerShell（7 形） | 上から `git -C . reset --hard` を除いた 7 つ |
| Bash（6 形） | `rm -r d1`・`rm -R d1`・`rm -fr d1`・`rm -fR d1`・`pwsh -Command "Remove-Item -Recurse d1"`・`pwsh -Command "Remove-Item -Force a.txt"` |
| PowerShell（2 形） | `Remove-Item -Recurse d1`・`Remove-Item -Force a.txt` |

## Edit の deny は書込の形のどこまで効くか

`--settings` で試験用の deny（`Read(…/trial/.secrets/**)`・`Edit(…/trial/hooks/**)`）を渡して試した。

| 形 | 結果 |
|---|---|
| Read・Edit・Write の道具 | `File is in a directory that is denied by your permission settings.` |
| 大文字に変えたパスへの Edit（`trial\HOOKS\CLAUDE-MARK.md`） | 同じ字で止まった |
| Bash の `echo x > …`・`echo x \| tee …`・`cp a.txt …` | `has been denied` |
| PowerShell の `Copy-Item`・`Set-Content` | `was blocked ... allowed working directories`（deny の行から来る字かは未確認） |
| 人が打つ `! cp a.txt …` | 通った |

## 想定と違った事

1. **動いている窓には届かない場合がある。** 20:42 に起動した窓は、21:37 に置いた後も `/status` に `Enterprise managed settings (file)` が出ず、deny の行に当たる読むだけの `git log -1 --grep=push -f` が実行された。起動し直すと両方とも直った。公式の頁にも条件がある＝`loads a settings file you create mid-session if its folder existed when the session started`。
2. **bypass の起動は、エラーにならない。** `disableBypassPermissionsMode: "disable"` の下で `claude --dangerously-skip-permissions` と `claude --permission-mode bypassPermissions` を打つと、窓は開き、bypass ではない既定のモードになった。`Shift+Tab` で一周しても `bypass permissions` は出なかった。
3. **設定の無い窓の既定は auto mode だった。** `mkdir plain-dir` が確認の画面なしで通った。確認の画面の有無を見る試しは、manual mode にしてから打つ必要があった。
4. **Claude が書き方を変えた再試行を断る事がある。** `git reset --hard` が止まった直後の `git -C . reset --hard` は、道具を呼ばずに断った。試験だと伝えると道具を呼び、deny の行で止まった。
5. **Desktop の表示は字が違う。** `/status` は `管理設定：有効` と出た。同じ `git log` は `has been denied` で止まった。
6. **人の手は止まらない。** `! git reset --hard` は使い捨ての repo で通った。

## 戻す時

名前を変えるだけで読まれなくなった（管理者の PowerShell）。戻した後の新しい窓では `/status` の字が消え、名前を戻すと字が出た。

```powershell
Rename-Item -LiteralPath 'C:\Program Files\ClaudeCode\managed-settings.json' -NewName ("managed-settings.json.off-" + (Get-Date -Format yyyyMMdd-HHmmss))
```

## 限界

- 1 台で 1 回だけ。版が変われば結果も変わる見込み。
- 止まると言えるのは試した形だけ。deny の行は字の形で当たるので、試していない書き方まで止まるとは言えない。
- 使い捨てのフォルダで試した。実物の repo には当てていない。

## 試し方

1. `testmod/` を置き、Claude Code の外の PowerShell から窓を起こす。deny の行の試しは `$env:CLAUDE_CODE_PLUGIN_DIRS='<testmod のパス>'; claude --setting-sources project --settings '<deny を書いた JSON>'`、hook の試しは `claude --plugin-dir '<testmod のパス>'`。
2. `Shift+Tab` で manual mode にする。
3. 上の表の命令を Claude に頼む。`/status` の `Setting sources` と、入力欄の下の 1 行（mod の allow の印）を見る。
4. `managed-settings.example.json` の `YOUR_NAME` を直して置き、窓を起こし直して同じ命令を頼む。

## ファイル

- `managed-settings.example.json`＝試した設定から、機械に固有の第 2 の設定フォルダの 4 行を除いた 27 行。パスは置き換えた（この形のままでは試していない）。
- `testmod/`＝試験用の mod。決めた 4 命令と同じ字の呼び出しにだけ allow を返す。本番に置かない。

## 関連

- 公式 [Configure permissions](https://code.claude.com/docs/en/permissions)（Precedence among rules, hooks, and mods）
- 公式 [Settings files and precedence](https://code.claude.com/docs/en/settings)（When edits take effect）
- Anthropic の [`mods/sec-default`](https://github.com/anthropics/claude-code/tree/main/mods/sec-default)（上の字を出す組み込みの mod）
