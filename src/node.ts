import { NS, NodeStats } from '@ns'

export async function main (ns: NS): Promise<void> {
  ns.tail()
  const nodes: Array<[number, string]> = []
  while (true) {
    await ns.asleep(50)
    const hacknet = ns.hacknet
    for (let i = 0; i < hacknet.numNodes(); i++) {
      nodes[i] = [0, 'help']
      const node = hacknet.getNodeStats(i)
      const baseRate = calcRateBase(node)
      const lvlEff = (calcRateLevel(node) - baseRate) / hacknet.getLevelUpgradeCost(i)
      const ramEff = (calcRateRam(node) - baseRate) / hacknet.getRamUpgradeCost(i)
      const coreEff = (calcRateCores(node) - baseRate) / hacknet.getCoreUpgradeCost(i)
      if (lvlEff > ramEff && lvlEff > coreEff) {
        nodes[i] = [lvlEff, 'lvl']
      } else if (ramEff > lvlEff && ramEff > coreEff) {
        nodes[i] = [ramEff, 'ram']
      } else {
        nodes[i] = [coreEff, 'cores']
      }
    }
    const maxEff = []
    for (let j = 0; j < nodes.length; j++) {
      maxEff[j] = nodes[j][0]
    }
    const index = maxEff.indexOf(Math.max(...maxEff))
    const money = ns.getServerMoneyAvailable('home')
    if (index !== -1) {
      const upgrade = nodes[index][1]
      switch (upgrade) {
        case 'lvl': {
          if (money / 2 >= hacknet.getLevelUpgradeCost(index)) hacknet.upgradeLevel(index)
          break
        }
        case 'ram': {
          if (money / 2 >= hacknet.getRamUpgradeCost(index)) hacknet.upgradeRam(index)
          break
        }
        case 'cores': {
          if (money / 2 >= hacknet.getCoreUpgradeCost(index)) hacknet.upgradeCore(index)
          break
        }
      }
    }
    let sumMoney = 0
    for (let k = 0; k < hacknet.numNodes(); k++) {
      sumMoney += hacknet.getNodeStats(k).production
    }
    const purchaseCost = hacknet.getPurchaseNodeCost()
    if (purchaseCost <= money && (sumMoney * 1800) >= purchaseCost && hacknet.numNodes() > 0 && hacknet.numNodes() < hacknet.maxNumNodes()) {
      hacknet.purchaseNode()
    }
  }
}

function calcRateBase (nodeStats: NodeStats): number {
  return 1.2094 * nodeStats.level * (1 + 0.2 * nodeStats.cores) * (Math.exp(nodeStats.ram * 0.034375))
}
// upgrade level by 1
function calcRateLevel (nodeStats: NodeStats): number {
  return 1.2094 * Math.min((nodeStats.level + 1), 200) * (1 + 0.2 * nodeStats.cores) * (Math.exp(nodeStats.ram * 0.034375))
}
// upgrade ram by 1
function calcRateRam (nodeStats: NodeStats): number {
  return 1.2094 * nodeStats.level * (1 + 0.2 * nodeStats.cores) * (Math.exp(Math.min((nodeStats.ram * 2), 64) * 0.034375))
}
// upgrade cores by 1
function calcRateCores (nodeStats: NodeStats): number {
  return 1.2094 * nodeStats.level * (1 + 0.2 * Math.min((nodeStats.cores + 1), 16)) * (Math.exp(nodeStats.ram * 0.034375))
}
