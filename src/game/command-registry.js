import promptSync from "prompt-sync";

export class CommandRegistry {
  commands;
  enemyLoop;
  context;

  constructor(context) {
    this.commands = new Map();
    this.context = context;
  }

  register(name, handler, aliases = []) {
    const key = name.toLowerCase();
    this.commands.set(key, { name: key, handler });

    for (const alias of aliases) {
      this.commands.set(alias.toLowerCase(), { name: key, handler });
    }

    return this;
  }

  setEnemyLoop(enemyLoop) {
    this.enemyLoop = enemyLoop;
  }

  start({ map, player }) {
    const prompt = promptSync({ sigint: true });

    const parseInput = (raw) => {
      const trimmed = raw.trim();
      if (!trimmed) return null;

      const parts = trimmed.split(/\s+/);
      const command = parts[0].toLowerCase();
      const args = parts.slice(1);

      return { command, args, raw: trimmed };
    };

    while (!this.context.quitRequested) {
      const raw = prompt("> ");
      const parsed = parseInput(raw);
      if (!parsed) continue;

      if (parsed.command === "quit" || parsed.command === "exit") break;

      const entry = this.commands.get(parsed.command);
      if (!entry) {
        console.log("Unknown command. Type 'help'.");
        continue;
      }
      const thisRoom = map.currentRoom;
      if (thisRoom.enemies.length) {
        thisRoom.enemies.array.forEach(enemy => {
            this.context.activatedEnemies.push({ enemy, room: thisRoom });
        });
      }
      entry.handler(this.context, parsed.args, parsed.raw);
      this.enemyLoop(this.context);
    }
  }
}
