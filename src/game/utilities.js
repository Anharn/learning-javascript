export function rollDice(times = 1, sides = 10) {
  return Math.floor(Math.random() * sides) + 1;
}

export function d10(times = 1) {
  return rollDice(1, 10);
}

export function d100(times = 1) {
  return rollDice(1, 100);
}
