import { NS } from '@ns'

const servers: Record<string, { parent: string, skip: boolean, contract: boolean }> = {}
function scanTarget (ns: NS, hostname: string, parent: string): void {
  const hosts = ns.scan(hostname)
  for (const host of hosts) {
    if (servers[host] == null) {
      servers[host] = {
        skip: false,
        parent,
        contract: false
      }
      if (ns.ls(host, '.cct').length > 0) {
        servers[host].contract = true
      }
      scanTarget(ns, host, parent + ' ' + host)
    }
  }
}

export async function main (ns: NS): Promise<void> {
  ns.tail()
  servers.home = {
    skip: true,
    parent: '',
    contract: false
  }
  scanTarget(ns, 'home', 'home')
  for (const s of Object.entries(servers)) {
    const hostname = s[0]
    const node = s[1]
    if (!node.contract) {
      continue
    }
    ns.print(hostname + ': ' + node.parent)
  }
}
