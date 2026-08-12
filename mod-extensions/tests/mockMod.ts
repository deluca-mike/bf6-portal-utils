const mockDamageTypes = {
    Bullet: 'Bullet',
    Explosion: 'Explosion',
    Fire: 'Fire',
};

const mockDeathTypes = {
    Killed: 'Killed',
    Suicide: 'Suicide',
    Drowned: 'Drowned',
};

const mockGadgets = {
    Medkit: 'Medkit',
    RepairTool: 'RepairTool',
    AmmoBox: 'AmmoBox',
};

const mockWeapons = {
    M16: 'M16',
    AK47: 'AK47',
    SniperRifle: 'SniperRifle',
};

(globalThis as unknown as { mod: Record<string, unknown> }).mod = {
    PlayerDamageTypes: mockDamageTypes,
    PlayerDeathTypes: mockDeathTypes,
    Gadgets: mockGadgets,
    Weapons: mockWeapons,
    EventDamageTypeCompare: (eventDmg: unknown, playerDmg: unknown) => eventDmg === playerDmg,
    EventDeathTypeCompare: (eventDeath: unknown, playerDeath: unknown) => eventDeath === playerDeath,
    EventWeaponCompare: (weaponUnlock: unknown, item: unknown) => weaponUnlock === item,
};

export {};
