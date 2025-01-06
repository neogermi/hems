const actions = [
  {
    type: 'do_nothing',
  },
  {
    type: 'charge_min',
    device: 'battery',
    power: 4200,
  },
  {
    type: 'charge_min',
    device: 'battery',
    power: 2100,
  },
  {
    type: 'charge_min',
    device: 'battery',
    power: 1000,
  },
  {
    type: 'charge_min',
    device: 'battery',
    power: 500,
  },
  {
    type: 'discharge_max',
    device: 'battery',
    power: 0,
  },
  {
    type: 'discharge_max',
    device: 'battery',
    power: 100,
  },
  // when activated, will reduce lifetime of your battery
  // {
  //   type: 'discharge_min',
  //   device: 'battery',
  //   power: 1000,
  // },
  // {
  //   type: 'discharge_min',
  //   device: 'battery',
  //   power: 2100,
  // },
  // {
  //   type: 'discharge_min',
  //   device: 'battery',
  //   power: 4200,
  // },
];

function doStep(capacity, action, context, data) {
  const { minCapacity, maxCapacity } = context;
  const { priceUsage, priceProduction, producedPower, usagePower } = data;

  let maxDischargeBattery = Infinity;
  let minDischargeBattery = 0;
  let gridToBattery = 0;

  // eslint-disable-next-line default-case
  switch(action.type) {
    case 'discharge_max': {
      maxDischargeBattery = action.power;
      break;
    }
    case 'charge_min': {
      gridToBattery = action.power;
      break;
    }
    case 'discharge_min': {
      minDischargeBattery = action.power;
      break;
    }
  };

  // Calculate net power: production minus usage
  let netPower = producedPower - usagePower;

  let excessCapacity = 0; // how much would we put into the grid
  let lackCapacity = 0; // how much would take from the grid
  let gridBatteryPower = 0; // how much would we load the battery from the grid
  let batteryGridPower = 0; // how much do we discharge battery into the grid

  if (netPower > 0) { // excess power
    // unload battery into grid
    if (minDischargeBattery > 0) {
      batteryGridPower = Math.min(minDischargeBattery, capacity);
      capacity -= batteryGridPower;
      excessCapacity = netPower;
    } else if (capacity < maxCapacity) {
      // charge the battery with power from PV
      excessCapacity = Math.min(netPower, maxCapacity - capacity);
      capacity += excessCapacity;

      // if battery still not full, load battery from grid
      if (capacity < maxCapacity && gridToBattery > 0) {
        gridBatteryPower = Math.min(gridToBattery, maxCapacity - capacity);
        capacity += gridBatteryPower;
      }
    } else {
      // pure overflow
      excessCapacity = netPower;
    }
  } else { // deficit power
    netPower *= -1; // netPower is negative
    const dischargeAmount = Math.min(maxDischargeBattery, netPower);
    minDischargeBattery = Math.max(0, minDischargeBattery - dischargeAmount);
    if (capacity > minCapacity) {
      // discharge the battery
      if (capacity - dischargeAmount < minCapacity) {
        // we would draw too much
        lackCapacity = minCapacity - (capacity - dischargeAmount);
        capacity = minCapacity;
      } else {
        capacity -= dischargeAmount;
      }
    } else {
      // power we need to draw from grid
      lackCapacity = dischargeAmount;
    }
    lackCapacity += netPower - dischargeAmount;

    // load battery from grid
    if (capacity < maxCapacity && gridToBattery > 0) {
      gridBatteryPower = Math.min(gridToBattery, maxCapacity - capacity);
      capacity += gridBatteryPower;
    }

    // unload battery into grid
    if (minDischargeBattery > 0) {
      batteryGridPower = Math.min(minDischargeBattery, capacity);
      capacity -= batteryGridPower;
    }
  }

  const earnings = ((excessCapacity + batteryGridPower) / 1000) * priceProduction;
  const costs = ((lackCapacity + gridBatteryPower) / 1000) * priceUsage;

  return {
    capacity,
    profit: earnings - costs,
  };
}

function applySolution(currentCapacity, getData, context) {
  return function applySolutionIntern(solution) {
    let totalProfit = 0;
    let cap = currentCapacity;

    // this is only ok to happen once per day
    if (solution.filter(a => a.type === 'discharge_min').length > 1) {
      return -Infinity;
    }

    for (let hour = 0; hour < solution.length; hour++) {
      const { capacity, profit } = doStep(cap, solution[hour], context, getData(hour));
      totalProfit += profit;
      cap = capacity;
    }

    return totalProfit;
  };
}

module.exports = { actions, doStep, applySolution };