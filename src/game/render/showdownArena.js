const TAU = Math.PI * 2;

function alphaColor(hex, alpha) {
  if (!hex || typeof hex !== 'string' || !hex.startsWith('#')) {
    return `rgba(255,255,255,${alpha})`;
  }
  const normalized = hex.length === 4
    ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
    : hex;
  const value = normalized.slice(1);
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function mixPoint(a, b, t, offset = 0) {
  const midX = a.x + (b.x - a.x) * t;
  const midY = a.y + (b.y - a.y) * t;
  const ang = Math.atan2(b.y - a.y, b.x - a.x) + Math.PI / 2;
  return {
    x: midX + Math.cos(ang) * offset,
    y: midY + Math.sin(ang) * offset
  };
}

export function createArenaTerrainSeeds({ map, arenaCenterX, arenaCenterY, arenaRadius }) {
  const center = { x: arenaCenterX, y: arenaCenterY };
  const patches = [];
  const flowers = [...(map.decor?.flowers || [])];
  const puddles = [...(map.decor?.puddles || [])].map(entry => ({
    ...entry,
    rx: entry.rx || 20,
    ry: entry.ry || 11
  }));
  const rocks = [];
  const tallGrass = [];
  const mushrooms = [];
  const pathDots = [];
  const spotlights = [];

  map.spawnPoints.forEach((spawn, index) => {
    const bend = mixPoint(spawn, center, 0.5, index % 2 === 0 ? 18 : -18);
    for (let step = 0; step <= 6; step++) {
      const t = step / 6;
      const first = mixPoint(spawn, bend, t);
      const second = mixPoint(bend, center, t);
      pathDots.push({
        x: first.x,
        y: first.y,
        rx: 18 - step * 1.4,
        ry: 9 - step * 0.6,
        angle: Math.atan2(bend.y - spawn.y, bend.x - spawn.x)
      });
      pathDots.push({
        x: second.x,
        y: second.y,
        rx: 16 - step * 1.1,
        ry: 8 - step * 0.55,
        angle: Math.atan2(center.y - bend.y, center.x - bend.x)
      });
    }
    spotlights.push({
      x: mixPoint(spawn, center, 0.28).x,
      y: mixPoint(spawn, center, 0.28).y,
      radius: 55 + (index % 3) * 12
    });
  });

  map.bushes.forEach((bush, index) => {
    patches.push({
      x: bush.x - 34 + (index % 3) * 2,
      y: bush.y - 22 - (index % 2) * 3,
      w: 70,
      h: 42,
      alpha: 0.18 + (index % 4) * 0.03
    });
    tallGrass.push({
      x: bush.x - 12,
      y: bush.y + 6,
      blades: 5 + (index % 3),
      h: 10 + (index % 2) * 2
    });
    tallGrass.push({
      x: bush.x + 10,
      y: bush.y + 8,
      blades: 4 + (index % 2),
      h: 9 + (index % 4)
    });
  });

  map.crates.forEach((crate, index) => {
    patches.push({
      x: crate.x - 22,
      y: crate.y - 16,
      w: 44,
      h: 32,
      alpha: 0.12
    });
    rocks.push({
      x: crate.x - 18 + (index % 2) * 22,
      y: crate.y + 18,
      w: 6,
      h: 4,
      shade: 0.38 + (index % 3) * 0.08
    });
  });

  (map.hazards?.lava || []).forEach((hazard, index) => {
    flowers.push({
      x: hazard.x - 40,
      y: hazard.y - 28,
      color: index % 2 === 0 ? '#ffdb7a' : '#ff9f4b',
      size: 2.4,
      petalCount: 5
    });
    flowers.push({
      x: hazard.x + 42,
      y: hazard.y + 26,
      color: '#ffe8a0',
      size: 2.1,
      petalCount: 4
    });
  });

  for (let i = 0; i < 16; i++) {
    const angle = (TAU / 16) * i;
    const distance = arenaRadius * (0.22 + (i % 4) * 0.12);
    mushrooms.push({
      x: arenaCenterX + Math.cos(angle) * distance,
      y: arenaCenterY + Math.sin(angle) * distance,
      color: i % 2 === 0 ? '#ffd25d' : '#ff8f58',
      size: 2 + (i % 3) * 0.4
    });
  }

  for (let i = 0; i < 28; i++) {
    const angle = (TAU / 28) * i + 0.17;
    const distance = arenaRadius * (0.18 + (i % 7) * 0.09);
    rocks.push({
      x: arenaCenterX + Math.cos(angle) * distance,
      y: arenaCenterY + Math.sin(angle) * distance,
      w: 3 + (i % 3),
      h: 2 + (i % 2),
      shade: 0.24 + (i % 5) * 0.08
    });
  }

  return { patches, flowers, rocks, puddles, tallGrass, mushrooms, pathDots, spotlights };
}

export function drawArenaBackdrop({
  ctx,
  arenaCenterX,
  arenaCenterY,
  arenaRadius,
  terrainSeeds,
  frameCount,
  theme
}) {
  const terrain = theme.palette.terrain;
  const outerGrad = ctx.createRadialGradient(
    arenaCenterX,
    arenaCenterY,
    arenaRadius - 10,
    arenaCenterX,
    arenaCenterY,
    arenaRadius + 180
  );
  outerGrad.addColorStop(0, alphaColor(theme.palette.effects.super, 0.08));
  outerGrad.addColorStop(0.4, alphaColor(theme.palette.hud.panel, 0.55));
  outerGrad.addColorStop(1, '#090d18');
  ctx.fillStyle = outerGrad;
  ctx.fillRect(arenaCenterX - 1500, arenaCenterY - 1100, 3000, 2200);

  const groundGrad = ctx.createRadialGradient(
    arenaCenterX,
    arenaCenterY - 24,
    10,
    arenaCenterX,
    arenaCenterY,
    arenaRadius
  );
  groundGrad.addColorStop(0, '#b7f46c');
  groundGrad.addColorStop(0.23, terrain.groundCore);
  groundGrad.addColorStop(0.62, terrain.groundMid);
  groundGrad.addColorStop(1, terrain.groundEdge);
  ctx.fillStyle = groundGrad;
  ctx.beginPath();
  ctx.arc(arenaCenterX, arenaCenterY, arenaRadius, 0, TAU);
  ctx.fill();

  terrainSeeds.spotlights.forEach(spot => {
    const glow = ctx.createRadialGradient(spot.x, spot.y, 0, spot.x, spot.y, spot.radius);
    glow.addColorStop(0, alphaColor('#f7ffb6', 0.13));
    glow.addColorStop(1, alphaColor('#f7ffb6', 0));
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(spot.x, spot.y, spot.radius, 0, TAU);
    ctx.fill();
  });

  ctx.save();
  ctx.beginPath();
  ctx.arc(arenaCenterX, arenaCenterY, arenaRadius - 2, 0, TAU);
  ctx.clip();

  terrainSeeds.pathDots.forEach(dot => {
    ctx.fillStyle = alphaColor(terrain.path, 0.18);
    ctx.beginPath();
    ctx.ellipse(dot.x, dot.y, dot.rx, dot.ry, dot.angle, 0, TAU);
    ctx.fill();

    ctx.fillStyle = alphaColor('#fff0b1', 0.08);
    ctx.beginPath();
    ctx.ellipse(dot.x - 1, dot.y - 1, dot.rx * 0.55, dot.ry * 0.45, dot.angle, 0, TAU);
    ctx.fill();
  });

  terrainSeeds.patches.forEach(patch => {
    const patchGrad = ctx.createLinearGradient(patch.x, patch.y, patch.x, patch.y + patch.h);
    patchGrad.addColorStop(0, alphaColor('#d6ff83', patch.alpha * 0.6));
    patchGrad.addColorStop(1, alphaColor('#3e8a2a', patch.alpha));
    ctx.fillStyle = patchGrad;
    ctx.beginPath();
    ctx.roundRect(patch.x, patch.y, patch.w, patch.h, 12);
    ctx.fill();
  });

  terrainSeeds.puddles.forEach(puddle => {
    const pg = ctx.createRadialGradient(puddle.x - 6, puddle.y - 4, 0, puddle.x, puddle.y, puddle.rx);
    pg.addColorStop(0, 'rgba(139, 245, 255, 0.24)');
    pg.addColorStop(0.55, 'rgba(59, 150, 208, 0.18)');
    pg.addColorStop(1, 'rgba(13, 52, 92, 0.05)');
    ctx.fillStyle = pg;
    ctx.beginPath();
    ctx.ellipse(puddle.x, puddle.y, puddle.rx, puddle.ry, 0, 0, TAU);
    ctx.fill();

    ctx.fillStyle = alphaColor('#ffffff', Math.sin(frameCount * 0.05 + puddle.x * 0.03) * 0.04 + 0.08);
    ctx.beginPath();
    ctx.ellipse(puddle.x - puddle.rx * 0.2, puddle.y - puddle.ry * 0.2, puddle.rx * 0.35, puddle.ry * 0.25, 0, 0, TAU);
    ctx.fill();
  });

  terrainSeeds.rocks.forEach(rock => {
    ctx.fillStyle = `rgba(${74 + rock.shade * 60},${91 + rock.shade * 50},${55 + rock.shade * 24},0.5)`;
    ctx.beginPath();
    ctx.roundRect(rock.x, rock.y, rock.w, rock.h, 2);
    ctx.fill();
    ctx.fillStyle = `rgba(${184 + rock.shade * 30},${192 + rock.shade * 20},${145 + rock.shade * 18},0.15)`;
    ctx.fillRect(rock.x, rock.y, rock.w * 0.55, Math.max(1, rock.h * 0.5));
  });

  terrainSeeds.tallGrass.forEach(grass => {
    const sway = Math.sin(frameCount * 0.045 + grass.x * 0.06) * 1.8;
    for (let blade = 0; blade < grass.blades; blade++) {
      const bx = grass.x + blade * 3 - grass.blades * 1.45;
      const tipX = bx + sway + (blade - grass.blades / 2) * 1.4;
      ctx.strokeStyle = blade % 2 === 0 ? terrain.bushDark : terrain.bushMid;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(bx, grass.y);
      ctx.quadraticCurveTo(bx + sway * 0.5, grass.y - grass.h * 0.55, tipX, grass.y - grass.h);
      ctx.stroke();
    }
  });

  terrainSeeds.flowers.forEach(flower => {
    ctx.strokeStyle = alphaColor('#2c7f29', 0.75);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(flower.x, flower.y + 3);
    ctx.lineTo(flower.x, flower.y - 1);
    ctx.stroke();

    for (let petal = 0; petal < flower.petalCount; petal++) {
      const angle = (TAU / flower.petalCount) * petal + frameCount * 0.004;
      ctx.fillStyle = flower.color;
      ctx.fillRect(
        flower.x + Math.cos(angle) * flower.size - 0.8,
        flower.y - 1 + Math.sin(angle) * flower.size - 0.8,
        2,
        2
      );
    }
    ctx.fillStyle = '#fff0a4';
    ctx.fillRect(flower.x - 0.6, flower.y - 1.4, 1.4, 1.4);
  });

  terrainSeeds.mushrooms.forEach(mushroom => {
    ctx.fillStyle = '#e8d2a0';
    ctx.fillRect(mushroom.x - 1, mushroom.y, 2, 3);
    ctx.fillStyle = mushroom.color;
    ctx.beginPath();
    ctx.arc(mushroom.x, mushroom.y, mushroom.size + 1, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = alphaColor('#fff', 0.55);
    ctx.fillRect(mushroom.x - 0.8, mushroom.y - mushroom.size + 0.6, 1, 1);
  });

  ctx.restore();
}

export function drawStormRing({ ctx, arenaCenterX, arenaCenterY, arenaRadius, frameCount, theme }) {
  const stormCore = theme.cssVariables['--storm-core'] || '#a35dff';
  const stormGlow = theme.cssVariables['--storm-glow'] || '#d890ff';

  ctx.strokeStyle = alphaColor(stormGlow, 0.18);
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.arc(arenaCenterX, arenaCenterY, arenaRadius + 8, 0, TAU);
  ctx.stroke();

  ctx.strokeStyle = stormCore;
  ctx.lineWidth = 4;
  ctx.setLineDash([10, 8]);
  ctx.lineDashOffset = -frameCount * 0.5;
  ctx.beginPath();
  ctx.arc(arenaCenterX, arenaCenterY, arenaRadius, 0, TAU);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.strokeStyle = alphaColor(stormGlow, 0.28);
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(arenaCenterX, arenaCenterY, arenaRadius + 4, 0, TAU);
  ctx.stroke();

  for (let layer = 0; layer < 4; layer++) {
    const ringRadius = arenaRadius + 14 + layer * 17;
    const ringAlpha = 0.15 - layer * 0.025;
    ctx.fillStyle = alphaColor(layer % 2 === 0 ? stormCore : stormGlow, ringAlpha);
    ctx.beginPath();
    ctx.arc(arenaCenterX, arenaCenterY, ringRadius, 0, TAU);
    ctx.fill();
  }

  ctx.globalCompositeOperation = 'destination-out';
  ctx.fillStyle = 'rgba(0,0,0,1)';
  ctx.beginPath();
  ctx.arc(arenaCenterX, arenaCenterY, arenaRadius - 3, 0, TAU);
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
}

export function drawAimGuide({ ctx, fighter, aim, frameCount, theme, kind = 'attack' }) {
  if (!fighter || !fighter.alive || !aim || !aim.active) return;
  const guideLength = kind === 'super' ? fighter.range * 1.15 : fighter.range * 0.95;
  const endX = fighter.x + aim.x * guideLength;
  const endY = fighter.y + aim.y * guideLength;
  const tint = kind === 'super' ? theme.palette.effects.super : theme.palette.effects.shield;

  ctx.save();
  ctx.strokeStyle = alphaColor(tint, kind === 'super' ? 0.8 : 0.55);
  ctx.lineWidth = kind === 'super' ? 5 : 3;
  ctx.setLineDash(kind === 'super' ? [8, 7] : [10, 6]);
  ctx.lineDashOffset = -frameCount * (kind === 'super' ? 0.6 : 0.4);
  ctx.beginPath();
  ctx.moveTo(fighter.x, fighter.y);
  ctx.lineTo(endX, endY);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = alphaColor(tint, 0.15);
  ctx.beginPath();
  ctx.arc(endX, endY, kind === 'super' ? 16 : 11, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = alphaColor('#ffffff', 0.4);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(endX, endY, kind === 'super' ? 13 : 8, 0, TAU);
  ctx.stroke();
  ctx.restore();
}

export function shouldShowMinimap({ isMobile }) {
  return !isMobile;
}
