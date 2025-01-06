const PER_HOUR = [
  0.018,
  0.015,
  0.024,
  0.01,
  0.01,
  0.02,
  0.033,
  0.044,
  0.046,
  0.034,
  0.039,
  0.039,
  0.044,
  0.046,
  0.05,
  0.055,
  0.06,
  0.069,
  0.07,
  0.07,
  0.069,
  0.067,
  0.049,
  0.019,
];

/**
 * Returns either a full-day per-hour array or a single usage for one hour.
 * @param {*} dailyConsumption in kWh
 * @param {*} hour the specific hour you want to get the usage for.
 * @returns Array of wattHours in Wh
 */
function map(dailyConsumption = 10, mapping = PER_HOUR, hour = undefined) {
  if (typeof hour === 'number') {
    return mapping[hour % mapping.length] * dailyConsumption * 1000;
  }

  return mapping.map((k, i) => map(dailyConsumption, mapping, i));
}

module.exports = map;