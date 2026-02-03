export class Character {
    name;
    health;
    mana;
    items;
    equipedWeapon;
    
    constructor(name, health, mana) {
        this.name = name;
        this.health = health;
        this.mana = mana;
        this.items = [];
        this.equipedWeapon = null;
    }

    aquireItem(item) {
        this.items.push(item);
    }

    equipWeapon(weapon) {
        this.equipedWeapon = weapon;
    }
    
    printCharacter() {
        console.log(`Name: ${this.name}`);
        console.log(`Health: ${this.health}`);
        console.log(`Mana: ${this.mana}`);

        if (this.equipedWeapon) {
        console.log(`Equipped Item: ${this.equipedWeapon}`);
        }

        if (this.items.length > 0) {
        console.log("Items:");
        for (const item of this.items) {
            console.log(`- ${item}`);
        }
        }
    }
}
