export function rollDice(times = 1, sides = 10) {
  let total = 0;
  for (let i = 0; i < times; i++) {
    total += Math.floor(Math.random() * sides) + 1;
  }
  return total;
}

export const d10 = (times = 1) => rollDice(times, 10);
export const d100 = (times = 1) => rollDice(times, 100);
