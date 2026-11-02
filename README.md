# Claude Code managed settings: mods vs deny rules, a before/after test on Windows

An unofficial, hands-on record from one Windows machine, run by one person at their own token cost. Not affiliated with Anthropic. Official documentation is linked under [See also](#see-also).

## Summary

- Without a `managed-settings.json`, a test mod's `allow` got past a `deny` rule and a blocking `PreToolUse` hook.
- With the file in place, the same mod still returned `allow`, and both the rule and the hook held.
- **Sessions started before the settings folder existed did not pick the file up.** They did after a restart.

## Environment

- Windows 11 Pro (10.0.26300)
- Claude Code CLI 2.1.316, Claude Desktop 4.4212.0 (bundled Claude Code 2.1.309)
- An individual Ultra account (Team and Enterprise were not tested)
- File location: `C:\Program Files\ClaudeCode\managed-settings.json`
- Test date: 2026-11-02

## Before and after

The mod returns `allow` only for the 4 commands in `testmod/`.

| Test | Before | After |
|---|---|---|
| `echo S5TEST-F18`, matched by a `deny` rule passed with `--settings` | Ran | `has been denied` |
| `printenv S5TEST-F18`, blocked by the tester's own `PreToolUse` hook | Ran | Blocked with the hook's message |
| `mkdir control-S5TEST-F18`, no `deny` rule matches | Ran with no prompt | Ran with no prompt |
| `mkdir plain-dir`, the mod does not allow it (manual mode) | Prompted | Prompted |
| `rm -r empty-S5TEST-F18`, matched by the managed rule `Bash(rm -r*)` | Not run | `has been denied` |

After the file was in place, these messages appeared:

```text
cc-plugin-sec-default: s5test-f18 tried to lift a deny rule in your settings from a Bash call (Bash(rm -r*)); the deny rule holds over the plugins you install (allowModsToOverrideDenyRules)
cc-plugin-sec-default: s5test-f18 tried to lift a refusal from a Bash call; the refusal holds over the plugins you install (allowModsToOverrideDenyRules)
```

## Commands stopped by the managed deny rules (23 forms)

Tested in a session that loads no hooks (`--setting-sources project`), in manual mode. All 23 returned `has been denied` with no prompt.

| Tool | Commands |
|---|---|
| Bash (8) | `git reset --hard`, `git -C . reset --hard`, `git push --force origin main`, `git push -f origin main`, `git clean -fd`, `git checkout -- a.txt`, `git restore -- a.txt`, `git commit --amend -m x` |
| PowerShell (7) | The same list without `git -C . reset --hard` |
| Bash (6) | `rm -r d1`, `rm -R d1`, `rm -fr d1`, `rm -fR d1`, `pwsh -Command "Remove-Item -Recurse d1"`, `pwsh -Command "Remove-Item -Force a.txt"` |
| PowerShell (2) | `Remove-Item -Recurse d1`, `Remove-Item -Force a.txt` |

## How far an Edit deny rule reaches

Tested with trial rules passed through `--settings`: `Read(…/trial/.secrets/**)` and `Edit(…/trial/hooks/**)`.

| Form | Result |
|---|---|
| The Read, Edit and Write tools | `File is in a directory that is denied by your permission settings.` |
| Edit on an upper-case path (`trial\HOOKS\CLAUDE-MARK.md`) | Same message |
| Bash `echo x > …`, `echo x \| tee …`, `cp a.txt …` | `has been denied` |
| PowerShell `Copy-Item`, `Set-Content` | `was blocked ... allowed working directories` (whether the deny rule caused this was not confirmed) |
| `! cp a.txt …` typed by the person | Ran |

## What did not go as expected

1. **A running session may not receive the file.** A session started at 20:42 was still unaffected after the file was placed at 21:37: `/status` did not list `Enterprise managed settings (file)`, and a read-only `git log -1 --grep=push -f` that matches a deny rule ran. Both changed after a restart. The official page states the condition: `loads a settings file you create mid-session if its folder existed when the session started`.
2. **Starting in bypass mode does not raise an error.** Under `disableBypassPermissionsMode: "disable"`, both `claude --dangerously-skip-permissions` and `claude --permission-mode bypassPermissions` opened a session in the default mode instead of bypass. Cycling with `Shift+Tab` never showed `bypass permissions`.
3. **The default mode in a session with no settings was auto mode.** `mkdir plain-dir` ran with no prompt. Tests that look for a prompt need manual mode first.
4. **Claude may refuse to retry in another form.** Right after `git reset --hard` was denied, Claude declined to call the tool for `git -C . reset --hard`. Once told this was a test, it made the call, and the deny rule stopped it.
5. **The Desktop app words it differently.** Its `/status` card shows `管理設定：有効` in the Japanese UI ("Managed settings: enabled"). The same `git log` returned `has been denied` there.
6. **The person's own commands are not stopped.** `! git reset --hard` ran in a disposable repository.

## Rolling back

Renaming the file was enough (in an administrator PowerShell). New sessions then stopped listing it in `/status`, and it was listed again after the name was restored.

```powershell
Rename-Item -LiteralPath 'C:\Program Files\ClaudeCode\managed-settings.json' -NewName ("managed-settings.json.off-" + (Get-Date -Format yyyyMMdd-HHmmss))
```

## Limits

- One machine, one run. Results may change with other versions.
- Only the forms listed here were tested. Deny rules match on the shape of the text, so other spellings may not be stopped.
- Everything ran in disposable folders, never against a real repository.
- Not tested: whether a rollback reaches a session that started while the folder existed.

## How to reproduce

1. Put `testmod/` somewhere and start sessions from a PowerShell outside Claude Code. For the deny rule test: `$env:CLAUDE_CODE_PLUGIN_DIRS='<path to testmod>'; claude --setting-sources project --settings '<JSON with a deny rule>'`. For the hook test: `claude --plugin-dir '<path to testmod>'`.
2. Switch to manual mode with `Shift+Tab`.
3. Ask Claude to run the commands above. Check `Setting sources` in `/status`, and the line under the input box (the mod's `allow` marker).
4. Replace `YOUR_NAME` in `managed-settings.example.json`, place it, start new sessions, and ask for the same commands.

## Files

- `managed-settings.example.json`: the tested settings minus 4 lines specific to this machine, leaving 27 rules, with paths replaced. This exact form was not tested.
- `testmod/`: the test mod. It returns `allow` only for calls that exactly match its 4 commands. Do not install it for real use. Its status messages were translated into English for publication; its logic is unchanged.

## See also

- [Configure permissions](https://code.claude.com/docs/en/permissions) (Precedence among rules, hooks, and mods)
- [Settings files and precedence](https://code.claude.com/docs/en/settings) (When edits take effect)
- Anthropic's [`mods/sec-default`](https://github.com/anthropics/claude-code/tree/main/mods/sec-default), the built-in mod that prints the messages above
