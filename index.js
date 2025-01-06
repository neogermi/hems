
const Promise = require('bluebird');
const jsonDiff = require('json-diff');

const loadProfile = require('./utils/lastprofil');
const prices = require('./utils/prices');
const { actions, applySolution, doStep } = require('./utils/actions');
const pvForecast = require('./utils/pvForecast');

const DynamicProgramming = require('./algorithms/dp');
const DepthFirstSearch = require('./algorithms/dfs');

class HEMS {

  #memoData = new Map();

  constructor(battery, usage, pricePerHour, productionForecastPerHour, priceProduction) {
    this.minCapacity = (battery?.min ?? 0.05) * ((battery?.capacity ?? 5.1) * 1000);
    this.maxCapacity = (battery?.max ?? 1) * ((battery?.capacity ?? 5.1) * 1000);

    this.usagePerHour = Array.isArray(usage) ? usage : loadProfile(usage?.consumption, usage?.mapping);
    this.pricePerHour = pricePerHour ?? prices;
    this.productionForecastPerHour = productionForecastPerHour ?? pvForecast;
    this.priceProduction = priceProduction ?? 0.082;
  }

  /**
   *
   * @param {int} hour - A number that represents the index of the hour in the upcoming time.
   * @returns
   */
  #getData (hour) {
    if (this.#memoData.has(hour)) {
      return this.#memoData.get(hour);
    }

    const data = {
      priceProduction: this.priceProduction,
      priceUsage: this.pricePerHour.find(({ hour: h }) => hour === h)?.price ?? 0.3,
      producedPower: this.productionForecastPerHour.find(({ hour: h }) => hour === h)?.wattHours ?? 0,
      usagePower: this.usagePerHour[hour % this.usagePerHour.length] ?? loadProfile(undefined, undefined, hour),
    };

    this.#memoData.set(hour, data);
    return data;
  }

  run(currentCapacity) {
    const evalFn = applySolution(currentCapacity, this.#getData.bind(this), { minCapacity: this.minCapacity, maxCapacity: this.maxCapacity });
    const doStepFn = (capacity, action, hour) => doStep(capacity, action, { minCapacity: this.minCapacity, maxCapacity: this.maxCapacity }, this.#getData.call(this, hour));
    const compareFn = (currentSolution, currentFitness, bestSolution, bestFitness) => {
      return (
        (currentFitness > bestFitness
        || (
          currentFitness === bestFitness
          && bestSolution.filter(a => a.type === 'do_nothing').length < currentSolution.filter(a => a.type === 'do_nothing').length
        )) && currentSolution.at(-1).type !== 'discharge_min'
      );
    };
    const config = {
      hours: 24, // TODO: calculate
      dp: {
        popSize: 2_000,
        numGenerations: 2_000,
        mutationRate: 0.08, // should be rather small
        tournamentSize: 800,
      },
      dfs: {
        pruningFn: path => {
          if (
            path.length > 1 &&
            path.at(-1).type === 'charge_min' &&
            path.at(-1).power === 4200 &&
            path.at(-2).type === 'charge_min' &&
            path.at(-2).power === 4200
          ) {
            return true;
          }

          // only 6 actions per day max
          if (path.filter(a => a.type !== 'do_nothing').length > 5) {
            return true;
          }

          // this is only ok to happen once per day
          if (path.filter(a => a.type === 'discharge_min').length > 1) {
            return true;
          }

          return false;
        },
      },
      currentCapacity,
      compareFn,
    };

    const dpAlgo = new DynamicProgramming(actions, evalFn, config);
    const dfsAlgo = new DepthFirstSearch(actions, doStepFn, config);

    const runIt = (algo, name) => {
      console.time(name);
      const result = algo.run();
      console.timeEnd(name);
      return result;
    };

    const resultDP = runIt(dpAlgo, 'DP');
    console.log(resultDP);
    const resultDFS = runIt(dfsAlgo, 'DFS');
    console.log(resultDFS);

    // console.log(jsonDiff.diffString(resultDP, resultDFS));
  }
}

module.exports = HEMS;

new HEMS({ min: 0.07, max: 1, capacity: 5.1 }, { consumption: 10 }, prices, pvForecast).run(342);