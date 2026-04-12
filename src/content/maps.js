export const SHOWDOWN_MAPS = [
  {
    id: 'ember-grove',
    theme: 'solar-showdown',
    weather: 'clear',
    size: { centerX: 600, centerY: 400, radius: 550 },
    spawnPoints: [
      { x: 600, y: 94 },
      { x: 780, y: 150 },
      { x: 920, y: 290 },
      { x: 952, y: 506 },
      { x: 795, y: 660 },
      { x: 600, y: 714 },
      { x: 405, y: 660 },
      { x: 248, y: 506 },
      { x: 280, y: 290 },
      { x: 420, y: 150 }
    ],
    bushes: [
      { x: 420, y: 230 }, { x: 480, y: 235 }, { x: 770, y: 228 }, { x: 830, y: 236 },
      { x: 355, y: 420 }, { x: 420, y: 470 }, { x: 780, y: 430 }, { x: 840, y: 478 },
      { x: 510, y: 620 }, { x: 595, y: 650 }, { x: 685, y: 618 }, { x: 600, y: 260 }
    ],
    walls: [],
    crates: [
      { x: 520, y: 195 }, { x: 680, y: 195 }, { x: 400, y: 340 }, { x: 800, y: 340 },
      { x: 360, y: 555 }, { x: 840, y: 555 }, { x: 520, y: 575 }, { x: 680, y: 575 },
      { x: 600, y: 360 }, { x: 600, y: 500 }
    ],
    hazards: {
      lava: [{ x: 600, y: 318 }, { x: 600, y: 560 }],
      barrels: [{ x: 470, y: 388 }, { x: 730, y: 388 }, { x: 470, y: 505 }, { x: 730, y: 505 }],
      bouncers: [{ x: 310, y: 390 }, { x: 890, y: 390 }]
    },
    decor: {
      puddles: [{ x: 290, y: 590 }, { x: 910, y: 225 }],
      flowers: [{ x: 550, y: 144 }, { x: 650, y: 144 }, { x: 462, y: 635 }, { x: 738, y: 635 }]
    }
  }
];

export function getDefaultMap() {
  return SHOWDOWN_MAPS[0];
}
