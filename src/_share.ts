import { NS } from '@ns'

export async function main (ns: NS): Promise<void> {
  const currentHost = ns.args[0] as string
  await ns.share()
  while (!ns.tryWritePort(1, '$' + currentHost + ':done')) { await ns.sleep(5) }
}
