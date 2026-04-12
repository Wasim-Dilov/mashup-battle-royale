// ========== ENHANCED 8-BIT SPRITE SYSTEM ==========
// 16 wide x 20 tall pixel sprites with richer detail
// Legend per hero palette: 0=transparent, 1-9,a-f = colors
export const SW = 16, SH = 20;

export const SPRITE_DATA = {
  blazeKnight: {
    idle: [
      "0000ffff0f000000",
      "000fffff0ff00000",
      "000f88f88f0f0000",
      "00f8f11111f8f000",
      "00f8122221f8f000",
      "0000f2221f000000",
      "000001221f000000",
      "00003333d3000000",
      "0003d33333300000",
      "003333333333d000",
      "00333d33d3330000",
      "003333333d330000",
      "0000333333000000",
      "0000044440000000",
      "0000444444000000",
      "0000044440000000",
      "0000055550000000",
      "0000550055000000",
      "0005500005500000",
      "0005500005500000"
    ],
    walk: [
      "0000ffff0f000000",
      "000fffff0ff00000",
      "000f88f88f0f0000",
      "00f8f11111f8f000",
      "00f8122221f8f000",
      "0000f2221f000000",
      "000001221f000000",
      "00003333d3000000",
      "0003d33333300000",
      "003333333333d000",
      "00333d33d3330000",
      "003333333d330000",
      "0000333333000000",
      "0000044440000000",
      "0000444444000000",
      "0000044440000000",
      "0000550005500000",
      "0005500000055000",
      "0055000000005500",
      "0000000000000000"
    ],
    palette: { '1':'#ffccaa','2':'#ee9977','3':'#cc2200','4':'#ff6b35','5':'#884422','8':'#ffffff','9':'#ff4400','a':'#ffaa00','b':'#ff6600','d':'#ff4400','f':'#ff8800'}
  },
  frostbyte: {
    idle: [
      "0000022220000000",
      "0000222222000000",
      "0002288822200000",
      "0002281182200000",
      "0022222222220000",
      "0022211112200000",
      "0002211112000000",
      "0000111111000000",
      "0001116611100000",
      "0011111111110000",
      "0111166611110000",
      "0011111111100000",
      "0001111111000000",
      "0000111110000000",
      "0000011111000000",
      "0000111110000000",
      "0000055550000000",
      "0000550055000000",
      "0005500005500000",
      "0005500005500000"
    ],
    walk: [
      "0000022220000000",
      "0000222222000000",
      "0002288822200000",
      "0002281182200000",
      "0022222222220000",
      "0022211112200000",
      "0002211112000000",
      "0000111111000000",
      "0001116611100000",
      "0011111111110000",
      "0111166611110000",
      "0011111111100000",
      "0001111111000000",
      "0000111110000000",
      "0000055000550000",
      "0000550000055000",
      "0005500000005500",
      "0055000000000000",
      "0000000000000000",
      "0000000000000000"
    ],
    palette: { '1':'#0077aa','2':'#00bbee','3':'#005588','4':'#003366','5':'#004466','6':'#00ffff','8':'#ffffff','9':'#88eeff'}
  },
  zapWizard: {
    idle: [
      "0000077700000000",
      "0000077770000000",
      "0000077777000000",
      "0000077ff7000d9f",
      "0000f7ff7f00d9ff",
      "000ffff9ff00d99f",
      "000f9c9c9f0000df",
      "0000ffffffff0000",
      "0000f9f9f900000d",
      "0000ffffdf000d9d",
      "000ffffdfff0d99f",
      "000ffffdfff0d99f",
      "000ffffdfff00d0f",
      "00000f9f00f000d0",
      "00000ffffffff000",
      "00000f9f00f000d0",
      "0000055550000000",
      "0000550055000000",
      "0000550005500000",
      "0005500005500000"
    ],
    walk: [
      "0000077700000000",
      "0000077770000000",
      "0000077777000000",
      "0000077ff7000d9f",
      "0000f7ff7f00d9ff",
      "000ffff9ff00d99f",
      "000f9c9c9f0000df",
      "0000ffffffff0000",
      "0000f9f9f900000d",
      "0000ffffdf000d9d",
      "000ffffdfff0d99f",
      "000ffffdfff0d99f",
      "000ffffdfff00d0f",
      "00000f9f00f000d0",
      "00000ffffffff000",
      "00000f9f00f000d0",
      "0000550005500d00",
      "0005500000055d90",
      "0055000000005d0d",
      "0000000000000d0d"
    ],
    palette: { '1':'#440088','2':'#6b2dc4','3':'#9953ff','4':'#cc88ff','5':'#330055','6':'#ffdd00','7':'#ffee00','8':'#ffffff','9':'#ffaa00','a':'#ff9900','c':'#aa4400','d':'#8844ff','f':'#ffcc00'}
  },
  shadowNinja: {
    idle: [
      "0000cccc00000000",
      "00cccccccc000000",
      "00cc3333cc000000",
      "00c33ee33c000000",
      "0cc3ee3ee3cc0000",
      "0c3eeee3e3c00000",
      "0c1eeee1e1c0dddd",
      "0c11111111c0d00d",
      "0c1aaa1aaa1cdddd",
      "0cc1aa1aa1c0dddd",
      "00c1aa1aa1c00000",
      "00c11aa11c000000",
      "00c1aaa1c0000000",
      "000c1a1c000000dd",
      "000cc1cc00000d0d",
      "00000000000ddddd",
      "0000550005500000",
      "0005500000055000",
      "0055000000005500",
      "0000000000000000"
    ],
    walk: [
      "0000cccc00000000",
      "00cccccccc000000",
      "00cc3333cc000000",
      "00c33ee33c000000",
      "0cc3ee3ee3cc0000",
      "0c3eeee3e3c00000",
      "0c1eeee1e1c0dddd",
      "0c11111111c0d00d",
      "0c1aaa1aaa1cdddd",
      "0cc1aa1aa1c0dddd",
      "00c1aa1aa1c00000",
      "00c11aa11c000000",
      "00c1aaa1c0000000",
      "000c1a1c000000dd",
      "000cc1cc00000d0d",
      "00000000000ddddd",
      "0000550055000000",
      "0005500000055000",
      "0055000000005500",
      "0000000000000000"
    ],
    palette: { '1':'#330055','2':'#551166','3':'#991122','4':'#cc1144','5':'#220033','6':'#550044','7':'#771155','8':'#ffffff','9':'#ee4455','a':'#ff0000','c':'#441155','d':'#550055','e':'#aa3366'}
  },
  captainCosmos: {
    idle: [
      "0000ffff8f000000",
      "0000ffff8f000000",
      "00ff8f8f8f0f0000",
      "00f81e1f8f00aaaa",
      "00f81e1f8f00aaaa",
      "0ff82f2f8ff0aa00",
      "0f8122221f80aaaa",
      "0f8122221f80aaaa",
      "0ff8222ff800aaaa",
      "0f8222222f0aaaa0",
      "0f8a22a22f0aa00a",
      "0ff8a2a2f00aaaa0",
      "00f8aaaf00aa00aa",
      "00f8aaa8f00aaaa0",
      "000f8a8f00aaaaaa",
      "000f8a8f00aa00aa",
      "0000550005500aa0",
      "0005500000055a00",
      "0055000000005a00",
      "0000000000000a00"
    ],
    walk: [
      "0000ffff8f000000",
      "0000ffff8f000000",
      "00ff8f8f8f0f0000",
      "00f81e1f8f00aaaa",
      "00f81e1f8f00aaaa",
      "0ff82f2f8ff0aa00",
      "0f8122221f80aaaa",
      "0f8122221f80aaaa",
      "0ff8222ff800aaaa",
      "0f8222222f0aaaa0",
      "0f8a22a22f0aa00a",
      "0ff8a2a2f00aaaa0",
      "00f8aaaf00aa00aa",
      "00f8aaa8f00aaaa0",
      "000f8a8f00aaaaaa",
      "000f8a8f00aa00aa",
      "0000550055005a00",
      "0005500000055a0a",
      "0055000000005aa0",
      "0000000000000a00"
    ],
    palette: { '1':'#ffccaa','2':'#ffaa88','3':'#ff9966','4':'#ffaa00','5':'#884422','6':'#ff66cc','7':'#ff88dd','8':'#ffffff','9':'#ffdd00','a':'#ff33cc','b':'#ff55dd','c':'#ffaa00','e':'#ff99cc','f':'#ffddee'}
  },
  rexTitan: {
    idle: [
      "000cc0cc00000000",
      "00c3cc3c00000000",
      "00c1cc1cc0000000",
      "0cc2ee2cc0000000",
      "0cccccccc0000000",
      "00cwwwwc00000000",
      "0003333000000000",
      "00033330000000t0",
      "0033b33300000tt0",
      "033333333000tt00",
      "03333333300tt000",
      "0333a33a30tt0000",
      "033333333t000000",
      "0033333300000000",
      "0003333000000000",
      "0003003000000000",
      "0003003000000000",
      "0005005000000000",
      "0055005500000000",
      "0055005500000000"
    ],
    walk: [
      "000cc0cc00000000",
      "00c3cc3c00000000",
      "00c1cc1cc0000000",
      "0cc2ee2cc0000000",
      "0cccccccc0000000",
      "00cwwwwc00000000",
      "0003333000000000",
      "00033330000000t0",
      "0033b33300000tt0",
      "033333333000tt00",
      "03333333300tt000",
      "0333a33a30tt0000",
      "033333333t000000",
      "0033333300000000",
      "0003333000000000",
      "0003000300000000",
      "0030000030000000",
      "0050000050000000",
      "0550000005500000",
      "0000000000000000"
    ],
    palette: { '1':'#ffffff','2':'#ee4444','3':'#33aa33','4':'#228822','5':'#554422','a':'#55dd55','b':'#ffdd00','c':'#88ff44','e':'#ffccaa','t':'#33aa33','w':'#eeeeee'}
  },
  banitsa: {
    idle: [
      "0000000000000000",
      "0000044440000000",
      "0004433334400000",
      "0043222223340000",
      "0432211122340000",
      "0432112211240000",
      "4322111112230000",
      "4321166112230000",
      "4321166112230000",
      "4322111112340000",
      "0432211122340000",
      "0043222233440000",
      "0004433344400000",
      "0000044440000000",
      "0000000000000000",
      "0000055550000000",
      "0000550055000000",
      "0005500005500000",
      "0005500005500000",
      "0000000000000000"
    ],
    walk: [
      "0000000000000000",
      "0000044440000000",
      "0004433334400000",
      "0043222223340000",
      "0432211122340000",
      "0432112211240000",
      "4322111112230000",
      "4321166112230000",
      "4321166112230000",
      "4322111112340000",
      "0432211122340000",
      "0043222233440000",
      "0004433344400000",
      "0000044440000000",
      "0000000000000000",
      "0000055050000000",
      "0000500005000000",
      "0005000000500000",
      "0050000000000000",
      "0000000000000000"
    ],
    palette: { '1':'#e8c35a','2':'#d4a43a','3':'#c08a28','4':'#a06818','5':'#7a5522','6':'#f5e6b8','a':'#f0d060','b':'#fff8dc','c':'#b87820','e':'#ffe4b5','w':'#fffacd'}
  },
  lebronJames: {
    idle: [
      "0000011100000000",
      "0000111110000000",
      "0000111110000000",
      "0000e88e0e000000",
      "000e8118e0000000",
      "000e8888e0000000",
      "0000eeee00000000",
      "000p555p00000000",
      "000p555p00000000",
      "00pp5g5pp0000000",
      "00p55555p0000000",
      "00pp555pp000b000",
      "000p555p0000b000",
      "0000ppp0000b0000",
      "0000444000b00000",
      "0000444000000000",
      "0000400400000000",
      "0004400044000000",
      "00w4400044w00000",
      "00ww0000ww000000"
    ],
    walk: [
      "0000011100000000",
      "0000111110000000",
      "0000111110000000",
      "0000e88e0e000000",
      "000e8118e0000000",
      "000e8888e0000000",
      "0000eeee00000000",
      "000p555p00000000",
      "000p555p00000000",
      "00pp5g5pp0000000",
      "00p55555p0b00000",
      "00pp555ppb000000",
      "000p555p00000000",
      "0000ppp000000000",
      "0000444000000000",
      "0000400400000000",
      "0004000004000000",
      "00w0000000w00000",
      "0ww0000000ww0000",
      "0000000000000000"
    ],
    palette: { '1':'#ffffff','2':'#cccccc','3':'#333333','4':'#8b5e3c','5':'#552583','6':'#fdb927','8':'#8b5e3c','b':'#ff6600','e':'#6b3a1f','g':'#fdb927','p':'#552583','t':'#552583','w':'#ffffff'}
  }
};

export function drawSprite(ctx, key, frame, x, y, scale, flipX) {
  const data = SPRITE_DATA[key];
  if (!data) return;
  const rows = frame === 'walk' ? data.walk : data.idle;
  const pal = data.palette;
  ctx.save();
  if (flipX) { ctx.translate(x + SW*scale, y); ctx.scale(-1,1); x=0;y=0; }
  for (let r=0;r<rows.length;r++) {
    for (let c=0;c<rows[r].length;c++) {
      const ch = rows[r][c];
      if (ch==='0') continue;
      ctx.fillStyle = pal[ch] || '#ff00ff';
      ctx.fillRect((flipX?0:x)+c*scale, (flipX?0:y)+r*scale, scale, scale);
    }
  }
  ctx.restore();
}

export function renderPreview(key, s) {
  const c=document.createElement('canvas');
  c.width=SW*s; c.height=SH*s;
  c.style.imageRendering='pixelated';
  drawSprite(c.getContext('2d'), key, 'idle', 0, 0, s, false);
  return c;
}

// ========== HERO DEFINITIONS ==========
const BASE_HEROES = [
  {
    name:"Blaze Knight", type:"Fire Samurai", sprite:"blazeKnight",
    desc:"Charges in with a flaming katana. Devastating melee combos!",
    color:"#ff6b35", color2:"#ff2e2e",
    hp:550, speed:3.5, attack:24, defense:9,
    range:60, rangeType:"melee",
    passive:"Fire Trail",
    attackName:"Flame Slash", superName:"Inferno Storm",
    superDamage:55, superRange:140,
    projectileColor:null, projectileSpeed:0,
    accessory:"Flame Crown"
  },
  {
    name:"Frostbyte", type:"Ice Robot", sprite:"frostbyte",
    desc:"Fires freezing ice bolts from a distance. Tanky and steady.",
    color:"#00d4ff", color2:"#0088cc",
    hp:680, speed:2.5, attack:13, defense:15,
    range:240, rangeType:"ranged",
    passive:"Slow on Hit",
    attackName:"Ice Bolt", superName:"Blizzard Core",
    superDamage:42, superRange:200,
    projectileColor:"#88eeff", projectileSpeed:7,
    accessory:"Frost Shield"
  },
  {
    name:"Zap Wizard", type:"Thunder Mage", sprite:"zapWizard",
    desc:"Casts lightning from afar. Longest range but fragile!",
    color:"#ffee00", color2:"#aa8800",
    hp:460, speed:3.0, attack:17, defense:5,
    range:300, rangeType:"ranged",
    passive:"Chain Lightning",
    attackName:"Lightning Bolt", superName:"Thunder God",
    superDamage:60, superRange:220,
    projectileColor:"#ffff44", projectileSpeed:9,
    accessory:"Magic Hat"
  },
  {
    name:"Shadow Ninja", type:"Stealth Assassin", sprite:"shadowNinja",
    desc:"Throws shurikens at mid-range. Fastest hero, glass cannon!",
    color:"#8833aa", color2:"#440066",
    hp:400, speed:4.5, attack:15, defense:4,
    range:180, rangeType:"ranged",
    passive:"Stealth Attack",
    attackName:"Shuriken", superName:"Death Blossom",
    superDamage:38, superRange:160,
    projectileColor:"#cc66ff", projectileSpeed:8,
    accessory:"Shadow Cloak"
  },
  {
    name:"Captain Cosmos", type:"Space Superhero", sprite:"captainCosmos",
    desc:"Balanced hero with powerful cosmic punches and a star cape.",
    color:"#ff44aa", color2:"#aa2277",
    hp:620, speed:3.2, attack:22, defense:12,
    range:65, rangeType:"melee",
    passive:"Gravity Well",
    attackName:"Cosmic Punch", superName:"Supernova Blast",
    superDamage:58, superRange:170,
    projectileColor:null, projectileSpeed:0,
    accessory:"Star Cape"
  },
  {
    name:"Rex Titan", type:"Dino Warrior", sprite:"rexTitan",
    desc:"Armored dinosaur. Slowest but tankiest with brutal melee!",
    color:"#44cc44", color2:"#228822",
    hp:850, speed:2.0, attack:28, defense:18,
    range:60, rangeType:"melee",
    passive:"Stomp Shockwave",
    attackName:"Tail Smash", superName:"Meteor Stomp",
    superDamage:70, superRange:150,
    projectileColor:null, projectileSpeed:0,
    accessory:"Dino Helmet"
  },
  {
    name:"Banitsa", type:"Bulgarian Pastry", sprite:"banitsa",
    desc:"A legendary spiral pastry from Bulgaria! Rolls into enemies and sizzles with cheesy power!",
    color:"#e8c35a", color2:"#d4a43a",
    hp:650, speed:3.0, attack:20, defense:14,
    range:70, rangeType:"melee",
    passive:"Cheese Shield",
    attackName:"Pastry Roll", superName:"Golden Spiral",
    superDamage:60, superRange:160,
    projectileColor:null, projectileSpeed:0,
    accessory:"Filo Crown"
  },
  {
    name:"LeBron", type:"Basketball Legend", sprite:"lebronJames",
    desc:"The King himself! Dunks on enemies and shoots long-range three-pointers!",
    color:"#552583", color2:"#fdb927",
    hp:600, speed:4.0, attack:22, defense:10,
    range:250, rangeType:"ranged",
    passive:"Clutch Gene",
    attackName:"3-Pointer", superName:"Ultimate Dunk",
    superDamage:65, superRange:130,
    projectileColor:"#ff6600", projectileSpeed:9,
    accessory:"Gold Crown"
  }
];

const ROLE_BY_HERO = {
  'Blaze Knight': 'assassin',
  Frostbyte: 'controller',
  'Zap Wizard': 'artillery',
  'Shadow Ninja': 'assassin',
  'Captain Cosmos': 'bruiser',
  'Rex Titan': 'tank',
  Banitsa: 'bruiser',
  LeBron: 'marksman'
};

export const HEROES = BASE_HEROES.map((hero, index) => ({
  ...hero,
  id: hero.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
  role: ROLE_BY_HERO[hero.name] || (hero.rangeType === 'ranged' ? 'sharpshooter' : 'fighter'),
  stats: {
    hp: hero.hp,
    speed: hero.speed,
    attack: hero.attack,
    defense: hero.defense,
    range: hero.range
  },
  weapon: {
    name: hero.attackName,
    rangeType: hero.rangeType,
    projectileColor: hero.projectileColor,
    projectileSpeed: hero.projectileSpeed
  },
  super: {
    name: hero.superName,
    damage: hero.superDamage,
    range: hero.superRange
  },
  visualId: hero.sprite,
  portraitKey: hero.sprite,
  spriteSheetKey: hero.sprite,
  fxKeys: [hero.sprite, hero.passive.toLowerCase().replace(/[^a-z0-9]+/g, '-')],
  voiceKeys: [],
  hudAccent: hero.color,
  rarityStyle: index < 4 ? 'headline' : 'classic'
}));
