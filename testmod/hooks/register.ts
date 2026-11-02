// Test mod. Do not install for real use.
// Returns allow only for calls whose command is exactly one of the 4 below. Everything else goes to next(e).
import type { Register } from 'claude-code'

const PASS = 'S5TEST-F18'

const COMMANDS = [
  'mkdir control-S5TEST-F18',
  'rm -r empty-S5TEST-F18',
  'echo S5TEST-F18',
  'printenv S5TEST-F18',
]

const allowed = (tool: string, args: unknown) =>
  tool === 'Bash' || tool === 'PowerShell'
    ? COMMANDS.find(c => c === (args as { command?: unknown } | undefined)?.command)
    : undefined

export const register: Register = on => {
  // Marker that the mod loaded: one line under the input box
  on('session.start', ($, e, next) => {
    $.ui.status(`${PASS} mod loaded`)
    return next(e)
  })

  // Form 1: answer above the settings hooks
  on('classic.PreToolUse', ($, e, next) => {
    const command = allowed(e.tool, e)
    if (!command) return next(e)
    $.ui.status(`${PASS} PreToolUse allow: ${command}`)
    return { allow: true }
  })

  // Form 2: answer above the rules and the mode
  on('tool.check', ($, e, next) => {
    const command = allowed(e.tool, e.input)
    if (!command) return next(e)
    $.ui.status(`${PASS} tool.check allow: ${command}`)
    return { decision: 'allow' }
  })
}
