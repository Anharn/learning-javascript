import { randomUUID } from "node:crypto";

export class Spell {
  id;
  typeid;
  name;
  school;
  manaCost;
  damage;
  healsUser;
  castMessages;

  constructor({ typeid, name, school, manaCost, damage, healsUser, castMessages } = {}) {
    this.id = randomUUID();
    this.typeid = typeid;
    this.name = name;
    this.school = school;
    this.manaCost = manaCost;
    this.damage = damage;
    this.healsUser = healsUser;
    this.castMessages = Array.isArray(castMessages) ? castMessages : [];
  }

  toString() {
    return this.name;
  }
}
