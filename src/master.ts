import { NS, ProcessInfo } from '@ns'
import { name as purchasedServerName } from './purchaseServer'
interface ServerInfo {
  scanned?: boolean
  parent: string
  children: string[]
  home: boolean
  purchased: boolean
  hackLvl: number
  minSecurityLvl: number
  maxMoney: number
  root: boolean
  ram: {
    max: number
    used: number
  }
  ports: number
  ready: boolean
  scripts: ProcessInfo[]
  files: string[]
}
export let servers: Record<string, ServerInfo> = {}
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
let runUpdateTask = true
let useSharesOnly = false

async function refreshVariables (ns: NS): Promise<void> {
  return await new Promise((resolve, reject) => {
    ns.print('Refreshing servers!')
    if (refreshServers) {
      servers = {}
      moneyServers = []
      refreshServers = false
    }
    constants.hasSSH = ns.fileExists('brutessh.exe', 'home')
    constants.hasFTP = ns.fileExists('ftpcrack.exe', 'home')
    constants.hasSMTP = ns.fileExists('relaysmtp.exe', 'home')
    constants.hasHTTP = ns.fileExists('httpworm.exe', 'home')
    constants.hasSQL = ns.fileExists('sqlinject.exe', 'home')
    constants.lvl = ns.getHackingLevel()
    refreshHosts(ns)
    refreshHostVariables(ns)
    sortServersByMoney(ns)
    ns.print('Done refreshing servers!')
    resolve()
  })
}

export function numPorts (): number {
  let ports = 0
  if (constants.hasSQL) ports++
  if (constants.hasHTTP) ports++
  if (constants.hasSMTP) ports++
  if (constants.hasFTP) ports++
  if (constants.hasSSH) ports++
  return ports
}

function sortServersByMoney (ns: NS): void {
  const newMoneyServers = []
  for (const s of Object.entries(servers)) {
    const host = s[0]
    const server = s[1]

    if (server.purchased) continue

    if (server.hackLvl <= constants.lvl && server.root && server.ports <= numPorts()) {
      newMoneyServers.push({ host, money: server.maxMoney })
    }
  }
  newMoneyServers.sort((a, b) => b.money - a.money)
  moneyServers = newMoneyServers
}

function refreshHostVariables (ns: NS): void {
  for (const host of Object.keys(servers)) {
    servers[host].root = ns.hasRootAccess(host)
    servers[host].ram.used = ns.getServerUsedRam(host)
    servers[host].ready = ns.getServerUsedRam(host) === 0
    servers[host].scripts = ns.ps(host)
    servers[host].files = ns.ls(host)
  }
}

export function refreshHosts (ns: NS, hostname = 'home'): void {
  const hosts = ns.scan(hostname)
  if (servers[hostname] == null && hostname === 'home') {
    servers.home = {
      parent: ':3',
      children: hosts,
      home: true,
      purchased: true,
      hackLvl: ns.getServerRequiredHackingLevel(hostname),
      maxMoney: ns.getServerMaxMoney(hostname),
      root: ns.hasRootAccess(hostname),
      ram: {
        max: ns.getServerMaxRam(hostname),
        used: ns.getServerUsedRam(hostname)
      },
      ports: ns.getServerNumPortsRequired(hostname),
      minSecurityLvl: ns.getServerMinSecurityLevel(hostname),
      ready: ns.getServerUsedRam(hostname) === 0,
      scripts: ns.ps(hostname),
      files: ns.ls(hostname)
    }
  }
  for (const host of hosts) {
    if (servers[host] == null) {
      servers[host] = {
        parent: hostname,
        children: hosts,
        home: false,
        purchased: host.startsWith(purchasedServerName),
        hackLvl: ns.getServerRequiredHackingLevel(host),
        maxMoney: ns.getServerMaxMoney(host),
        root: ns.hasRootAccess(host),
        ram: {
          max: ns.getServerMaxRam(host),
          used: ns.getServerUsedRam(host)
        },
        ports: ns.getServerNumPortsRequired(host),
        minSecurityLvl: ns.getServerMinSecurityLevel(host),
        ready: ns.getServerUsedRam(host) === 0,
        scripts: ns.ps(host),
        files: ns.ls(host)
      }
    }
    if (hostname !== 'home' && host === hosts[0]) continue
    refreshHosts(ns, host)
  }
}

export async function main (ns: NS): Promise<void> {
  ns.disableLog('ALL')
  ns.tail()
  // read stuff on main thread
  runUpdateTask = true
  refreshServers = true
  useSharesOnly = ns.args[0] as boolean ?? false
  void readData(ns)
  while (true) {
    await refreshVariables(ns)
    await ns.asleep(1000)
  }
}

async function readData (ns: NS): Promise<void> {
  await ns.asleep(1000)
  const port = ns.getPortHandle(1)
  while (true) {
    await ns.asleep(1)
    if (port.empty()) {
      if (runUpdateTask) {
        await refreshVariables(ns)
        await updateServerTasks(ns)
        runUpdateTask = false
      }
      continue
    }
    const data = port.read() as string
    if (!data.startsWith('$')) return
    if (scriptDone.test(data)) {
      const a = data.match(scriptDone)
      if (a == null) return
      const hostname = a[1]
      runUpdateTask = true
      if (servers[hostname] == null) return
      servers[hostname].ready = true
    }
  }
}

export function forceUpdateTask (): void {
  runUpdateTask = true
}

async function updateServerTasks (ns: NS): Promise<void> {
  ns.print('Updating server tasks...')
  for (const s of Object.entries(servers)) {
    const host = s[0]
    const server = s[1]
    // skip servers like our home server
    if (!server.root) {
      if (server.ports <= numPorts()) nukeServer(ns, host)
      continue
    }
    if (/* !server.ready || */ (server.ram.max - server.ram.used) < 2.25) continue
    // server.ready = false
    ns.scp(['_grow.js', '_hack.js', '_weaken.js', '_share.js'], host, 'home') // update the files
    if (useSharesOnly || (server.purchased && server.ram.max >= 256)) {
      runScript(ns, host, '_share.js', [host])
      continue
    }
    const target = getBestServer()
    if (ns.getServerBaseSecurityLevel(host) > servers[target].minSecurityLvl + 10) {
      runScript(ns, host, '_weaken.js', [host, target])
    } else if (ns.getServerMoneyAvailable(host) < servers[target].maxMoney * 0.75) {
      runScript(ns, host, '_grow.js', [host, target])
    } else {
      runScript(ns, host, '_hack.js', [host, target])
    }
  }
}

const scriptDone = /\$(?<host>.+):done/

function getBestServer (): string {
  const ran = Math.floor(Math.random() * Math.min(5, moneyServers.length))
  return moneyServers[ran]?.host ?? 'home'
}

function nukeServer (ns: NS, hostname: string): boolean {
  ns.print('WARN Attempting to nuke: ' + hostname)
  let ports = 0
  const totalPorts = servers[hostname].ports
  if (constants.hasSQL) {
    ns.sqlinject(hostname)
    ports++
  }
  if (constants.hasHTTP) {
    ns.httpworm(hostname)
    ports++
  }
  if (constants.hasSMTP) {
    ns.relaysmtp(hostname)
    ports++
  }
  if (constants.hasFTP) {
    ns.ftpcrack(hostname)
    ports++
  }
  if (constants.hasSSH) {
    ns.brutessh(hostname)
    ports++
  }
  if (ports >= totalPorts) {
    ns.nuke(hostname)
    ns.print('SUCCESS Nuked: ' + hostname)
    return true
  }
  return false
}

function runScript (ns: NS, hostname: string, file: string, args: any[]): number {
  const threads = Math.floor((servers[hostname].ram.max - servers[hostname].ram.used) / ns.getScriptRam(file))
  if (threads === 0 || threads == null) {
    return 0
  }
  if (args.length > 0) {
    return ns.exec(file, hostname, threads, ...args)
  } else {
    return ns.exec(file, hostname, threads)
  }
}
