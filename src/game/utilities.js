export function rollDice(sides = 10) {
  return Math.floor(Math.random() * sides) + 1;
}

export function d10() {
  return rollDice(10);
}

export function d100() {
  return rollDice(100);
}
