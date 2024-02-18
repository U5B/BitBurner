import { NS } from '@ns'

const servers: Record<string, { parent: string, skip: boolean }> = {}
function scanTarget (ns: NS, hostname: string, parent: string): void {
  const hosts = ns.scan(hostname)
  for (const host of hosts) {
    if (servers[host] == null) {
      servers[host] = {
        skip: false,
        parent
      }
      scanTarget(ns, host, host)
      const files = ns.ls(host)
      if (files.length === 0) continue
      const a = files.filter(x => x.endsWith('.lit') || x.endsWith('.txt'))
      if (a.length === 0) continue
      ns.scp(a, 'home', host)
    }
  }
}

export async function main (ns: NS): Promise<void> {
  servers.home = {
    skip: true,
    parent: ''
  }
  scanTarget(ns, 'home', 'home')
}
