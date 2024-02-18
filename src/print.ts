import { NS } from '@ns'
import { servers } from './master'

export async function main (ns: NS): Promise<void> {
  ns.tprint(Object.keys(servers))
  const server = await ns.prompt('Server for info?', { type: 'select', choices: Object.keys(servers) }) as string
  ns.tprint(`Info about: ${server}: `, servers[server])
}
