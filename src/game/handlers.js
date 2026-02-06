import { Action, d10, MessageBus } from "./index.js";
import enemyTemplates from "../data/enemies.json" with { type: "json" };
import itemTemplates from "../data/items.json" with { type: "json" };

export const context = {
  map: null,
  player: null,
  activatedEnemies: [],
  messages: null,
  takeEnemyTurns: false,
};

export function enemyActivation() {
  const room = context.map.getCurrentRoom();
  context.takeEnemyTurns = false;
  if (!room.enemies.length) return;

  for (const enemy of room.enemies) {
    if (enemy.isDead()) continue;

    const alreadyActive = context.activatedEnemies.some(
      (actor) => actor.enemy.id === enemy.id,
    );

    if (!alreadyActive) {
      context.activatedEnemies.push({ enemy, room });
    }
  }
}

export function enemyLoop() {
  const currentRoom = context.map.getCurrentRoom();

  if (!context.takeEnemyTurns) return;
  context.activatedEnemies = context.activatedEnemies.filter(
    (actor) => !actor.enemy.isDead(),
  );

  for (const actor of context.activatedEnemies) {
    if (actor.room.id !== currentRoom.id) {
      context.map.moveEnemies(actor.room, currentRoom);
      actor.room = currentRoom;
      continue;
    }

    Action.attack(actor.enemy, context.player);
  }
}

export function handleAttack(args) {
  const room = context.map.getCurrentRoom();
  const enemyName = args.join(" ").trim().toLowerCase();

  const enemy = enemyName
    ? room.enemies.find(
        (e) => !e.isDead() && e.name.toLowerCase() === enemyName,
      )
    : [...room.enemies].reverse().find((e) => !e.isDead());

  if (!enemy) {
    MessageBus.addMessages(`No "${enemyName || "enemy"}" here.`);
  } else {
    Action.attack(context.player, enemy);
    context.takeEnemyTurns = true;
  }
  return true;
}

export function handleCast(args) {
  const spellName = (args[0] ?? "").trim().toLowerCase();
  if (!spellName) {
    MessageBus.addMessages("Usage: cast <spell> [target]");
    return true;
  }

  const spell = context.player.spells?.find(
    (s) => s.name.toLowerCase() === spellName,
  );

  if (!spell) {
    MessageBus.addMessages(`You do not know "${spellName}".`);
    return true;
  }

  const room = context.map.getCurrentRoom();
  const targetName = args.slice(1).join(" ").trim().toLowerCase();

  const target = targetName
    ? room.enemies.find(
        (e) => !e.isDead() && e.name.toLowerCase() === targetName,
      )
    : room.enemies.find((e) => !e.isDead());

  if (!target) {
    MessageBus.addMessages(
      targetName ? `No "${targetName}" here.` : "No valid target.",
    );
    return true;
  }

  Action.cast(spell, context.player, target);
  context.takeEnemyTurns = true;
  return true;
}

export function handleTake(args) {
  const itemName = args.join(" ").trim();
  if (!itemName) {
    MessageBus.addMessages("Usage: take <item name>");
    return true;
  }

  const room = context.map.getCurrentRoom();
  context.player.take(room, itemName);

  const deadEnemy = room.enemies.find((e) => e.isDead() && e.items?.length);
  if (deadEnemy) {
    context.player.take(deadEnemy, itemName);
  }
  context.takeEnemyTurns = true;
  return true;
}

export function handleSearch(args) {
  const room = context.map.getCurrentRoom();
  const enemyName = args.join(" ").trim().toLowerCase();

  const enemy = enemyName
    ? room.enemies.find((e) => e.isDead() && e.name.toLowerCase() === enemyName)
    : room.enemies.find((e) => e.isDead());

  if (!enemy) {
    MessageBus.addMessages(
      enemyName ? `No "${enemyName}" here.` : "Nothing to search.",
    );
  } else {
    const items = enemy.search()?.items ?? [];
    for (const item of items) {
      context.player.acquireItem(item);
    }
    context.activatedEnemies = context.activatedEnemies.filter(
      (a) => a.enemy.id !== enemy.id,
    );
  }
  context.takeEnemyTurns = true;
  return true;
}

export function handleMove(direction) {
  const fromRoom = context.map.getCurrentRoom();
  const moved = context.map.move(direction);

  if (!moved) {
    MessageBus.addMessages("You cannot go that way.");
  } else {
    const toRoom = context.map.getCurrentRoom();
    context.map.moveEnemies(fromRoom, toRoom);
    context.map.look();
  }
  context.takeEnemyTurns = true;
  return true;
}

export function handleRest() {
  const encounterChance = d10();
  if (encounterChance <= 2) {
    MessageBus.addMessages("While resting, you are ambushed by an enemy!");
    const room = context.map.getCurrentRoom();
    const enemy = context.map.createEnemy(
      enemyTemplates.slice(0, 10),
      itemTemplates,
    );
    room.addEnemy(enemy);
    context.activatedEnemies.push({ enemy, room });
    context.takeEnemyTurns = true;
    return true;
  }
  context.player.applyManaGain(1);
  context.player.applyHeal(3);
  MessageBus.addMessages(
    "You take a moment to rest and recover +3 HP and +1 MP.",
  );
  context.takeEnemyTurns = true;
  return true;
}

export function handleDrop(args) {
    const itemName = args.join(" ").trim();
    if (!itemName) {
      MessageBus.addMessages("Usage: drop <item name>");
      return true;
    }

    const item = context.player.dropItem(itemName);
    if (item) {
      const room = context.map.getCurrentRoom();
      room.addItem(item);
    }
    context.takeEnemyTurns = true;
    return true;
}

export function handleRename(args) {
    const newName = args.join(" ").trim();
    if (!newName) {
      MessageBus.addMessages("Usage: rename <new name>");
      return true;
    }

    context.player.name = newName;
    MessageBus.addMessages(`You are now known as ${newName}.`);
    context.takeEnemyTurns = true;
    return true;
}
