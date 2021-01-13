/**
 * normalize value between min and max (eventually round it)
 * @param value
 * @param min
 * @param max
 * @param round
 */
module.exports = (value, min, max, round = false) => {
  if (round) {
    value = Math.round(value);
  }

  if (value < min) {
    return min;
  } else if (value > max) {
    return max;
  }
  return value;
};
