class DepthFirstSearch {
  constructor(actions, evaluateStep, config) {
    this.HOURS = config?.hours;
    this.CURRENT_CAPACITY = config?.currentCapacity;

    this.actions = actions;
    this.shouldPrune = config?.dfs?.pruningFn;
    this.evaluateStep = evaluateStep;
    this.isBetterThan = config?.compareFn;
  }

  #doNothingSolution() {
    const solution = [];
    for (let t = 0; t < this.HOURS; t++) {
      solution.push(this.actions.find(({ type }) => type === 'do_nothing'));
    }
    return solution;
  }


  run() {
    let bestSolution = null;
    let bestFitness = -Infinity;

    function dfsHelper(currentCapacity, depth = 0, path = [], totalProfit = 0) {
      if (depth === this.HOURS) {
        if (this.isBetterThan(path, totalProfit, bestSolution, bestFitness)) {
          bestFitness = totalProfit;
          bestSolution = path;
        }
        return;
      }

      for (let index = 0; index < this.actions.length; index++) {
        const a = this.actions[index];

        const newPath = [...path, a];
        // check for unnecessary paths and penalize them
        if (this.shouldPrune(newPath)) {
          // eslint-disable-next-line no-continue
          continue;
        }

        const { capacity, profit } = this.evaluateStep(currentCapacity, a, depth);
        dfsHelper.call(this, capacity, depth + 1, newPath, totalProfit + profit);
      }
    }

    dfsHelper.call(this, this.CURRENT_CAPACITY);

    return { bestSolution, bestFitness };
  }
}

module.exports = DepthFirstSearch;
