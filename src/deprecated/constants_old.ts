import { NS } from '@ns'
import { name as purchasedServerName } from '../purchaseServer'

export let servers: Record<string, { parent: string, home: boolean, purchased: boolean, hackLvl: number, minSecurityLvl: number, maxMoney: number, root: boolean, ram: number, ports: number, ready: boolean }> = {}
export const constants = {
  hasSSH: false,
  hasFTP: false,
  hasSMTP: false,
  hasHTTP: false,
  hasSQL: false,
  lvl: 0
}
export let moneyServers: Array<{ host: string, money: number }> = []
let refreshServers = true

export async function main (ns: NS): Promise<void> {
  ns.disableLog('ALL')
  ns.tail()
  while (true) {
    refreshVariables(ns)
    await ns.asleep(500)
  }
}

export function refreshVariables (ns: NS): void {
  if (refreshServers) {
    servers = {}
    servers.home = {
      parent: '',
      home: true,
      purchased: true,
      hackLvl: -1,
      maxMoney: -1,
      ram: -1,
      root: true,
      ports: -1,
      minSecurityLvl: -1,
      ready: false
    }
    refreshServers = false
  }
  refreshTargets(ns)
  sortServersByMoney()
  constants.hasSSH = ns.fileExists('brutessh.exe', 'home')
  constants.hasFTP = ns.fileExists('ftpcrack.exe', 'home')
  constants.hasSMTP = ns.fileExists('relaysmtp.exe', 'home')
  constants.hasHTTP = ns.fileExists('httpworm.exe', 'home')
  constants.hasSQL = ns.fileExists('sqlinject.exe', 'home')
  constants.lvl = ns.getHackingLevel()
}

export function numPorts (): number {
  let ports = 0
  if (constants.hasSQL) {
    ports++
  }
  if (constants.hasHTTP) {
    ports++
  }
  if (constants.hasSMTP) {
    ports++
  }
  if (constants.hasFTP) {
    ports++
  }
  if (constants.hasSSH) {
    ports++
  }
  return ports
}

function sortServersByMoney (): void {
  const newMoneyServers = []
  for (const s of Object.entries(servers)) {
    const host = s[0]
    const server = s[1]

    if (server.home || server.purchased) continue

    if (server.hackLvl <= constants.lvl && server.root && server.ports <= numPorts()) {
      newMoneyServers.push({ host, money: server.maxMoney })
    }
  }
  newMoneyServers.sort((a, b) => b.money - a.money)
  moneyServers = newMoneyServers
}

export function refreshTargets (ns: NS, hostname = 'home', parent = 'home'): void {
  const hosts = ns.scan(hostname)
  for (const host of hosts) {
    if (servers[host] == null) {
      servers[host] = {
        parent,
        home: false,
        purchased: false,
        hackLvl: ns.getServerRequiredHackingLevel(host),
        maxMoney: ns.getServerMaxMoney(host),
        root: ns.hasRootAccess(host),
        ram: ns.getServerMaxRam(host),
        ports: ns.getServerNumPortsRequired(host),
        minSecurityLvl: ns.getServerMinSecurityLevel(host),
        ready: ns.getServerUsedRam(host) === 0
      }
      if (host.startsWith(purchasedServerName)) {
        servers[host].purchased = true
        continue
      }
      refreshTargets(ns, host, host)
    } else {
      servers[host].hackLvl = ns.getServerRequiredHackingLevel(host)
      servers[host].maxMoney = ns.getServerMaxMoney(host)
      servers[host].root = ns.hasRootAccess(host)
      servers[host].ram = ns.getServerMaxRam(host)
      servers[host].ports = ns.getServerNumPortsRequired(host)
      servers[host].minSecurityLvl = ns.getServerMinSecurityLevel(host)
      servers[host].ready = ns.getServerUsedRam(host) === 0
    }
  }
}
