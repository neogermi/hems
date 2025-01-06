const { shuffle, randInt } = require('../utils/misc');

class DynamicProgramming {
  constructor(actions, evaluate, config) {
    this.HOURS = config?.hours || 24;
    this.POP_SIZE = config?.dp?.popSize || 500;
    this.NUM_GENERATIONS = config?.dp?.numGenerations || 2000;
    this.MUTATION_RATE = config?.dp?.mutationRate || 0.05;
    this.TOURNAMENT_SIZE = config?.dp?.tournamentSize || 50;

    this.actions = actions;
    this.evaluate = evaluate;
    this.isBetterThan = config?.compareFn;
  }

  // Tournament selection
  #tournamentSelection(fitnesses) {
    let bestIdx = null;
    let bestFit = -Infinity;
    const shuffled = shuffle(fitnesses);

    for (let i = 0; i < Math.min(this.TOURNAMENT_SIZE, fitnesses.length); i++) {
      if (shuffled[i].fitness > bestFit) {
        bestFit = shuffled[i].fitness;
        bestIdx = i;
      }
    }

    return shuffled[bestIdx].solution;
  }

  // Single-point crossover
  #crossover(parent1, parent2) {
    const point = randInt(this.HOURS);
    const child1 = parent1.slice(0, point).concat(parent2.slice(point));
    const child2 = parent2.slice(0, point).concat(parent1.slice(point));
    return [child1, child2];
  }

  // Mutation: random action replacement
  #mutate(solution) {
    for (let i = 0; i < solution.length; i++) {
      if (Math.random() < this.MUTATION_RATE) {
        solution[i] = this.actions[randInt(this.actions.length)];
      }
    }
  }

  // Generate a random solution (chromosome)
  #randomSolution() {
    const solution = [];
    for (let t = 0; t < this.HOURS; t++) {
      solution.push(this.actions[randInt(this.actions.length)]);
    }
    return solution;
  }

  #noOpSolution() {
    const solution = [];
    for (let t = 0; t < this.HOURS; t++) {
      solution.push(this.actions.find(({ type }) => type === 'do_nothing'));
    }
    return [solution, this.evaluate(solution)];
  }

  run() {
    // Initialize population
    let population = [];

    const [noOp, noOpFitness] = this.#noOpSolution();
    population.push(noOp);

    for (let i = 0; i < this.POP_SIZE - 1; i++) {
      population.push(this.#randomSolution());
    }

    let bestSolution = noOp;
    let bestFitness = noOpFitness;
    let bestFitnessBefore = noOpFitness;
    let bestFitnessSinceGens = 0;

    for (let gen = 0; gen < this.NUM_GENERATIONS && bestFitnessSinceGens < (this.NUM_GENERATIONS * 0.2); gen++) {
      // Evaluate fitness
      const fitnesses = population.map(solution => ({
        solution,
        fitness: this.evaluate(solution),
      })).filter(({ fitness }) => fitness !== -Infinity);

      // Track best
      for (let i = 0; i < Math.min(fitnesses.length, this.POP_SIZE); i++) {
        if (this.isBetterThan(fitnesses[i].solution, fitnesses[i].fitness, bestSolution, bestFitness)) {
          bestFitness = fitnesses[i].fitness;
          bestSolution = fitnesses[i].solution.slice();
          bestFitnessSinceGens = 0;
        }
      }

      if (gen % 100 === 0) {
        console.log(`Generation ${gen}: Best fitness so far: ${bestFitness}`);
      }

      if (bestFitness === bestFitnessBefore) {
        bestFitnessSinceGens++;
      }
      bestFitnessBefore = bestFitness;

      // Selection & reproduction
      const newPop = [];
      while (newPop.length < this.POP_SIZE) {
        const p1 = this.#tournamentSelection(fitnesses);
        const p2 = this.#tournamentSelection(fitnesses);

        const [c1, c2] = this.#crossover(p1, p2);
        this.#mutate(c1);
        this.#mutate(c2);
        newPop.push(c1, c2);
      }

      population = newPop.slice(0, this.POP_SIZE);
    }

    return { bestSolution, bestFitness };
  }

}


module.exports = DynamicProgramming;