import { NS } from '@ns'
export const name: string = 'botnet-'

export async function main (ns: NS): Promise<void> {
  let purchasedServers = ns.getPurchasedServers()
  if (ns.getPurchasedServerCost(8) * 25 > ns.getServerMoneyAvailable('home')) {
    ns.alert('Not Enough Money!')
    return
  }
  // purchase servers
  if (purchasedServers.length < ns.getPurchasedServerLimit()) {
    for (let i = purchasedServers.length; i < ns.getPurchasedServerLimit(); i++) {
      ns.purchaseServer(`${name}${i}`, 8)
    }
  }
  let ram = 0
  try {
    ram = Math.floor(Number.parseInt(await ns.prompt('Ram for upgrading server?', { type: 'text' }) as string))
  } catch { }
  if (ram === 0) {
    return
  }
  purchasedServers = ns.getPurchasedServers()
  let cost = 0
  for (const server of purchasedServers) {
    cost += ns.getPurchasedServerUpgradeCost(server, ram)
  }
  if (ns.getServerMoneyAvailable('home') >= cost) {
    for (const server of purchasedServers) {
      ns.upgradePurchasedServer(server, ram)
    }
  } else {
    ns.alert('Not enough money to buy servers!')
  }
}
