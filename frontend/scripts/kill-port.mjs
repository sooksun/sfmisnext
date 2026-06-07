#!/usr/bin/env node
// Kill any process LISTENING on the given TCP port(s) before the dev server starts.
// Cross-platform (Windows / macOS / Linux), no external dependencies.
// Usage: node scripts/kill-port.mjs 3001 [3002 ...]
import { execSync } from 'node:child_process'

const ports = process.argv.slice(2).map((p) => p.trim()).filter(Boolean)
if (ports.length === 0) {
  console.error('kill-port: no port specified')
  process.exit(0)
}

const isWin = process.platform === 'win32'

/** Return unique PIDs that are LISTENING on `port` (both IPv4 and IPv6). */
function pidsOnPort(port) {
  try {
    if (isWin) {
      // Plain `netstat -ano` (no `-p tcp`, which would drop IPv6 — Next.js binds to ::).
      // Columns: Proto  Local-Address  Foreign-Address  State  PID
      const out = execSync('netstat -ano', { encoding: 'utf8', windowsHide: true })
      const pids = new Set()
      for (const line of out.split(/\r?\n/)) {
        if (!/LISTENING/i.test(line)) continue
        const cols = line.trim().split(/\s+/)
        const local = cols[1] || '' // local address, e.g. 0.0.0.0:3001 or [::]:3001
        if (local.endsWith(`:${port}`)) {
          const pid = cols[cols.length - 1]
          if (/^\d+$/.test(pid) && pid !== '0') pids.add(pid)
        }
      }
      return [...pids]
    }
    // Unix: -t = PID only, -s tcp:LISTEN = listening sockets only
    const out = execSync(`lsof -t -i tcp:${port} -s tcp:LISTEN`, { encoding: 'utf8' })
    return [...new Set(out.split(/\s+/).filter(Boolean))]
  } catch {
    // Tool exits non-zero when nothing matches — nothing to kill.
    return []
  }
}

function kill(pid) {
  try {
    if (isWin) execSync(`taskkill /PID ${pid} /T /F`, { stdio: 'ignore', windowsHide: true })
    else execSync(`kill -9 ${pid}`, { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

let killed = 0
for (const port of ports) {
  for (const pid of pidsOnPort(port)) {
    if (kill(pid)) {
      killed++
      console.log(`kill-port: freed port ${port} (PID ${pid})`)
    }
  }
}
if (killed === 0) console.log(`kill-port: port ${ports.join(', ')} already free`)
// Never block the dev server from starting, even if a kill failed.
process.exit(0)
