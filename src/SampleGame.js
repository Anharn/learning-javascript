import { GameMap, Character, CommandRegistry, Messages } from "./game/index.js";

const gameMap = new GameMap();
const player = new Character("Hero", 30, 10, { typeid: "player" });
player.equipWeapon({ typeid: "weapon-dagger-rusty", name: "Rusty Dagger", type: "Weapon", damage: 2, resilience: 10 });
player.addSpell({ typeid: "spell-fireball", name: "Fireball", damage: 8, manaCost: 4, school: "Fire", castMessages: ["{user} hurls a blazing fireball!"] });

const context = {
  map: gameMap,
  player,
  quitRequested: false,
  quit: () => { context.quitRequested = true; },
  activatedEnemies: [],
  messages: new Messages(),
};

const registry = new CommandRegistry(context);

function printHelp() {
  return ["Commands:",
    "  look",
    "  go <direction>   (north, south, east, west, up, down)",
    "  directions",
    "  me",
    "  attack [enemy]",
    "  cast <spell> [enemy]",
    "  take <item>",
    "  equip <item>",
    "  consume <item>",
    "  search [enemy]",
    "  help",
    "  quit"];
}

function enemyActivation() {
  const room = context.map.getCurrentRoom();
  if (!room.enemies.length) return;

  for (const enemy of room.enemies) {
    if (enemy.dead) continue;

    const alreadyActive = context.activatedEnemies.some(
      actor => actor.enemy.id === enemy.id
    );

    if (!alreadyActive) {
      context.activatedEnemies.push({ enemy, room });
    }
  }
}

function enemyLoop() {
  const currentRoom = context.map.getCurrentRoom();
  const messages = [];

  context.activatedEnemies = context.activatedEnemies.filter(
    actor => !actor.enemy.dead
  );

  for (const actor of context.activatedEnemies) {
    if (actor.room.id !== currentRoom.id) {
      context.map.moveEnemies(actor.room, currentRoom, messages);
      actor.room = currentRoom;
      continue;
    }

    context.player.attacked(actor.enemy, messages);
  }

  context.messages.addMessages(...messages);
  context.messages.printMessagesAndClear();
}

function handleAttack(args) {
  const room = context.map.getCurrentRoom();
  const messages = [];

  const enemyName = args.join(" ").trim().toLowerCase();
  const enemy = enemyName
    ? room.enemies.find(e => !e.dead && e.name.toLowerCase() === enemyName)
    : [...room.enemies].reverse().find(e => !e.dead);

  if (!enemy) {
    messages.push(`No "${enemyName || "enemy"}" here.`);
  } else {
    enemy.attacked(context.player, messages);

    if (enemy.isDead()) {
      enemy.dead = true;
      messages.push(`You have defeated the ${enemy.name}!`);
    }
  }

  context.messages.addMessages(...messages);
  context.messages.printMessagesAndClear();
  return true;
}

function handleCast(args) {
  const messages = [];

  const spellName = (args[0] ?? "").trim().toLowerCase();
  if (!spellName) {
    messages.push("Usage: cast <spell> [target]");
    context.messages.addMessages(...messages);
    return true;
  }

  const spell = context.player.spells?.find(
    candidate => (candidate?.name ?? "").trim().toLowerCase() === spellName
  ) ?? null;

  if (!spell) {
    messages.push(`You do not know "${spellName}".`);
    context.messages.addMessages(...messages);
    return true;
  }

  const room = context.map.getCurrentRoom();
  const targetName = args.slice(1).join(" ").trim().toLowerCase();

  let target = null;

  if (targetName) {
    target =
      room.enemies.find(
        enemy => !enemy.dead && (enemy.name ?? "").toLowerCase() === targetName
      ) ?? null;
  } else {
    target = room.enemies.find(enemy => !enemy.dead) ?? null;
  }

  if (!target) {
    messages.push(targetName ? `No "${targetName}" here.` : "No valid target.");
    context.messages.addMessages(...messages);
    return true;
  }

  target.affectedBySpell(spell, context.player, messages);

  context.messages.addMessages(...messages);
  return true;
}

function handleTake(args) {
  const itemName = args.join(" ").trim();
  const messages = [];

  if (!itemName) {
    messages.push("Usage: take <item name>");
  } else {
    const room = context.map.getCurrentRoom();
    context.player.take(room, itemName, messages);

    const deadEnemy = room.enemies.find(e => e.dead && e.items?.length);
    if (deadEnemy) {
      context.player.take(deadEnemy, itemName, messages);
    }
  }

  context.messages.addMessages(...messages);
  context.messages.printMessagesAndClear();
  return true;
}

function handleEquip(args) {
  const itemName = args.join(" ").trim();
  const messages = [];

  if (!itemName) {
    messages.push("Usage: equip <item name>");
  } else {
    const item = context.player.items.find(
      i => i.name.toLowerCase() === itemName.toLowerCase()
    );

    context.player.equipItem(item, messages);
  }

  context.messages.addMessages(...messages);
  context.messages.printMessagesAndClear();
  return true;
}

function handleConsume(args) {
  const messages = [];
  context.player.consume(args.join(" "), messages);

  context.messages.addMessages(...messages);
  context.messages.printMessagesAndClear();
  return true;
}

function handleSearch(args) {
  const room = context.map.getCurrentRoom();
  const messages = [];

  const enemyName = args.join(" ").trim().toLowerCase();
  const enemy = enemyName
    ? room.enemies.find(e => e.dead && e.name.toLowerCase() === enemyName)
    : room.enemies.find(e => e.dead);

  if (!enemy) {
    messages.push(enemyName ? `No "${enemyName}" here.` : "Nothing to search.");
  } else {
    const result = enemy.search(messages);
    const items = result?.items ?? result ?? [];

    for (const item of items) {
      context.player.acquireItem(item, messages);
    }

    room.removeEnemy(enemy, messages);
    context.activatedEnemies = context.activatedEnemies.filter(
      a => a.enemy.id !== enemy.id
    );
  }

  context.messages.addMessages(...messages);
  context.messages.printMessagesAndClear();
  return true;
}

function handleGo(args) {
  const messages = [];
  const direction = (args[0] ?? "").toLowerCase();

  if (!direction) {
    messages.push("Usage: go <direction>");
  } else {
    const fromRoom = context.map.getCurrentRoom();
    const moved = context.map.move(direction);

    if (!moved) {
      messages.push("You cannot go that way.");
    } else {
      const toRoom = context.map.getCurrentRoom();
      context.map.moveEnemies(fromRoom, toRoom, messages);
      context.map.look(messages);
    }
  }

  context.messages.addMessages(...messages);
  context.messages.printMessagesAndClear();
  return true;
}

function handleMove(direction) {
  const messages = [];
  const fromRoom = context.map.getCurrentRoom();
  const moved = context.map.move(direction);

  if (!moved) {
    messages.push("You cannot go that way.");
  } else {
    const toRoom = context.map.getCurrentRoom();
    context.map.moveEnemies(fromRoom, toRoom, messages);
    context.map.look(messages);
  }

  context.messages.addMessages(...messages);
  context.messages.printMessagesAndClear();
  return true;
}

registry
  .addPreCommandHook(() => enemyActivation())
  .addPostCommandHook(() => enemyLoop())
  .register("help", () => { printHelp(); return true; })
  .register("quit", () => context.quit(), ["exit"])
  .register("look", () => {
    context.messages.addMessages(...context.map.look());
  }, ["l"])
  .register("attack", (_, args) => handleAttack(args), ["a", "hit", "strike"])
  .register("cast", (_, args) => handleCast(args), ["c"])
  .register("take", (_, args) => handleTake(args))
  .register("equip", (_, args) => handleEquip(args))
  .register("consume", (_, args) => handleConsume(args))
  .register("search", (_, args) => handleSearch(args))
  .register("directions", () => {
    const messages = [];
    context.map.printCurrentDirections(messages);
    context.messages.addMessages(...messages);
    context.messages.printMessagesAndClear();
    return true;
  }, ["dir", "exits"])
  .register("me", () => {
    const messages = [];
    context.player.printCharacter(messages);
    context.messages.addMessages(...messages);
    context.messages.printMessagesAndClear();
    return true;
  }, ["character"])
  .register("go", (_, args) => handleGo(args))
  .register("north", () => handleMove("north"), ["n"])
  .register("south", () => handleMove("south"), ["s"])
  .register("east", () => handleMove("east"), ["e"])
  .register("west", () => handleMove("west"), ["w"])
  .register("up", () => handleMove("up"))
  .register("down", () => handleMove("down"));

context.messages.addMessages("Text Adventure",
    ...printHelp(), "",
    ...context.map.look());
context.messages.printMessagesAndClear();

registry.start(context);

console.log("Goodbye.");
