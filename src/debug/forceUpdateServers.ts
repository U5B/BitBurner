import { NS } from '@ns'
import { forceUpdateTask } from "/master" // eslint-disable-line

export async function main (ns: NS): Promise<void> {
  forceUpdateTask()
}
