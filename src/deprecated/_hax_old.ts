import { NS } from '@ns'

export async function main (ns: NS): Promise<void> {
  const host = ns.args[0] as string ?? ns.getHostname()
  const minSecurityLevel = ns.args[1] as number
  const maxServerMoney = ns.args[2] as number
  while (true) {
    if (ns.getServerBaseSecurityLevel(host) > minSecurityLevel) {
      await ns.weaken(host)
    } else if (ns.getServerMoneyAvailable(host) < maxServerMoney) {
      await ns.grow(host)
    } else {
      await ns.hack(host)
    }
  }
}
