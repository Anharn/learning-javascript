import { GameMap } from "./game/map.js";
import { Character } from "./game/character.js";
import { CommandRegistry } from "./game/command-registry.js";

const gameMap = new GameMap();
const player = new Character("Hero", 30, 10, { id: "player" });

const context = {
  map: gameMap,
  player,
  quitRequested: false,
  quit: () => { context.quitRequested = true; },
  activatedEnemies: [],
};

const registry = new CommandRegistry(context);

function printHelp() {
  console.log("Commands:");
  console.log("  look");
  console.log("  go <direction>   (north, south, east, west, up, down)");
  console.log("  directions");
  console.log("  me");
  console.log("  help");
  console.log("  quit");
}

function printDirections() {
  context.map.printCurrentDirections();
}

function handleGo(args) {
  const direction = (args[0] ?? "").toLowerCase();
  if (!direction) {
    console.log("Usage: go <direction>");
    return;
  }

  const moved = context.map.move(direction);
  if (!moved) {
    console.log("You cannot go that way.");
    return;
  }

  context.map.look();
}

function handleMove(direction) {
  const moved = context.map.move(direction);
  if (!moved) {
    console.log("You cannot go that way.");
    return;
  }
  context.map.look();
}

function enemyActivation(context) {
  const room = context.map.currentRoom;
  if (!room.enemies.length) return;

  for (const enemy of room.enemies) {
    const alreadyActive = context.activatedEnemies.some(actor => actor.enemy.id === enemy.id);
    if (!alreadyActive) {
      context.activatedEnemies.push({ enemy, room });
    }
  }
}

function enemyLoop(context) {
  const currentRoom = context.map.getCurrentRoom();
  const enemiesToMove = [];
  context.activatedEnemies.forEach(({ enemy, room }) => {
    if (room.id !== currentRoom.id) {
      context.map.moveEnemies(room, currentRoom);
      enemiesToMove.push(enemy.name);
    }
  });
  enemiesToMove.length && 
    console.log(`The enemie(s) have followed you. ${enemiesToMove.join(', ')} enters the room.`);
}

registry
  .addPreCommandHook(() => enemyActivation(context))
  .addPostCommandHook(() => enemyLoop(context))
  .register("help", () => printHelp())
  .register("quit", () => context.quit(), ["exit"])
  .register("look", () => context.map.look(), ["l"])
  .register("directions", () => printDirections(), ["dir", "exits"])
  .register("me", () => player.printCharacter(), ["character"])
  .register("go", (_, args) => handleGo(args))
  .register("north", () => handleMove("north"), ["n"])
  .register("south", () => handleMove("south"), ["s"])
  .register("east", () => handleMove("east"), ["e"])
  .register("west", () => handleMove("west"), ["w"])
  .register("up", () => handleMove("up"))
  .register("down", () => handleMove("down"));

console.log("Text Adventure");
printHelp();
console.log("");
context.map.look();

registry.start(context);

console.log("Goodbye.");
