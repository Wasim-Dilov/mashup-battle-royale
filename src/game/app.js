import { HEROES, drawSprite, renderPreview } from '../content/heroes.js';
import { SHOWDOWN_THEME, applyTheme } from '../content/theme.js';
import { ASSET_MANIFEST } from '../content/assets.js';
import { getDefaultMap } from '../content/maps.js';
import { createSoundManager } from './audio/SoundManager.js';
import { InputController } from './input/InputController.js';
import {
  createArenaTerrainSeeds,
  drawArenaBackdrop,
  drawStormRing,
  drawAimGuide,
  shouldShowMinimap
} from './render/showdownArena.js';

// ========== ON-SCREEN ERROR HANDLER (mobile debug) ==========
(function(){
  function showErr(msg) {
    try {
      let box = document.getElementById('err-box');
      if (!box) {
        box = document.createElement('div');
        box.id = 'err-box';
        box.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#900;color:#fff;font:12px monospace;padding:8px;z-index:9999;max-height:40vh;overflow:auto;white-space:pre-wrap;border-bottom:2px solid #fff;';
        box.onclick = function(){ box.style.display = 'none'; };
        document.body && document.body.appendChild(box);
      }
      box.textContent += msg + '\n\n';
      box.style.display = 'block';
    } catch (error) {}
  }
  window.addEventListener('error', event => {
    showErr('ERROR: ' + (event.message || '?') + '\nAt: ' + (event.filename || '?') + ':' + (event.lineno || '?') + ':' + (event.colno || '?') + (event.error && event.error.stack ? '\n' + event.error.stack : ''));
  });
  window.addEventListener('unhandledrejection', event => {
    showErr('PROMISE REJECT: ' + (event.reason && (event.reason.stack || event.reason.message) || event.reason));
  });
})();

applyTheme(SHOWDOWN_THEME);

const soundManager = createSoundManager();
const assetManifest = ASSET_MANIFEST;
const currentMap = getDefaultMap();
const UI_FONT = SHOWDOWN_THEME.textStyles.uiFont;
const TITLE_FONT = SHOWDOWN_THEME.textStyles.titleFont;

// ========== MOBILE DETECTION (must be before resizeCanvas) ==========
const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
let touchJoystick = { active: false, startX: 0, startY: 0, dx: 0, dy: 0, id: null };
let touchButtons = { attack: false, super: false, shield: false, dash: false };
let inputController = null;

function setTouchButtonState(btn, label, state) {
  if (!btn) return;
  btn.textContent = label;
  btn.classList.remove('ready', 'charging', 'spent');
  if (state) btn.classList.add(state);
}

function updateTouchButtonsUI() {
  if (!isMobile) return;
  const attackBtn = document.getElementById('btn-attack');
  const superBtn = document.getElementById('btn-super');
  const shieldBtn = document.getElementById('btn-shield');
  const dashBtn = document.getElementById('btn-dash');
  const player = fighters[playerIndex];

  if (!player || !player.alive || (!gameRunning && !countdownActive && !dropPhase)) {
    setTouchButtonState(attackBtn, 'ATK', null);
    setTouchButtonState(superBtn, 'SUP', null);
    setTouchButtonState(shieldBtn, 'SHD', null);
    setTouchButtonState(dashBtn, 'DSH', null);
    return;
  }

  setTouchButtonState(
    attackBtn,
    touchButtons.attack ? 'AIM' : (player.attackCooldown <= 0 ? 'ATK' : '...'),
    touchButtons.attack ? 'ready' : (player.attackCooldown <= 0 ? 'ready' : 'charging')
  );

  setTouchButtonState(
    superBtn,
    touchButtons.super ? 'AIM' : (player.superCharge >= player.superMax ? 'SUP' : `${Math.round(player.superCharge)}%`),
    touchButtons.super ? 'ready' : (player.superCharge >= player.superMax ? 'ready' : 'charging')
  );

  let shieldLabel = 'SHD';
  let shieldState = 'ready';
  if (player.shieldActive) {
    shieldLabel = 'ON';
  } else if (player.shieldUses <= 0) {
    shieldLabel = '0';
    shieldState = 'spent';
  } else if (player.shieldCooldown > 0) {
    shieldLabel = `${(player.shieldCooldown / 60).toFixed(1)}`;
    shieldState = 'charging';
  }
  setTouchButtonState(shieldBtn, shieldLabel, shieldState);

  setTouchButtonState(
    dashBtn,
    player.dashCooldown <= 0 && player.dashTimer <= 0 ? 'DSH' : `${Math.max(0.1, player.dashCooldown / 60).toFixed(1)}`,
    player.dashCooldown <= 0 && player.dashTimer <= 0 ? 'ready' : 'charging'
  );
}

// ========== GAME STATE ==========
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
inputController = new InputController({
  canvas,
  isMobile,
  onInteract: () => initSound()
});
inputController.attach();
touchJoystick = inputController.touchJoystick;
touchButtons = inputController.touchButtons;
window.__mashupTheme = SHOWDOWN_THEME;
window.__mashupAssets = assetManifest;
// Responsive canvas scaling
function resizeCanvas() {
  const w = window.innerWidth || document.documentElement.clientWidth;
  const h = window.innerHeight || document.documentElement.clientHeight;
  // Canvas internal resolution is ALWAYS 1200x800 — keeps all HUD/camera math consistent
  canvas.width = 1200;
  canvas.height = 800;

  if (isMobile) {
    // Mobile: letterbox canvas to fit screen while PRESERVING 3:2 aspect ratio
    const gameAspect = 1200 / 800; // 1.5
    const screenAspect = w / h;
    let cw, ch;
    if (screenAspect > gameAspect) {
      // Screen is wider than game — fit by height, pillarbox sides
      ch = h;
      cw = h * gameAspect;
    } else {
      // Screen is taller than game — fit by width, letterbox top/bottom
      cw = w;
      ch = w / gameAspect;
    }
    canvas.style.position = 'fixed';
    canvas.style.left = Math.round((w - cw) / 2) + 'px';
    canvas.style.top = Math.round((h - ch) / 2) + 'px';
    canvas.style.width = cw + 'px';
    canvas.style.height = ch + 'px';
    canvas.style.margin = '0';
  } else {
    // Desktop: let flexbox center it, preserve aspect ratio
    canvas.style.position = '';
    canvas.style.left = '';
    canvas.style.top = '';
    canvas.style.maxWidth = '100vw';
    canvas.style.maxHeight = '100vh';
    canvas.style.width = '';
    canvas.style.height = '';
  }
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

let gameRunning=false, spectating=false, playerDeathPlace=0, fighters=[], projectiles=[], particles=[], damageNumbers=[];
let countdownTimer=0, countdownActive=false;
let selectedHero=-1, playerIndex=0, shrinkTimer=0;
let arenaRadius=currentMap.size.radius, arenaCenterX=currentMap.size.centerX, arenaCenterY=currentMap.size.centerY;
let frameCount=0, killfeed=[], shakeX=0, shakeY=0;
let trees=[], crates=[], powerups=[];
let matchStartTime=0, matchEndTime=0, matchTimerRunning=false;
let confetti=[], confettiActive=false;
let leaderboard=[];
// ========== ROUNDS SYSTEM ==========
let currentRound = 1;
let seriesScore = { player: 0, ai: 0 };
let roundMode = false; // true during best of 3, false during normal match
let roundEndScreen = false;

let difficulty='medium';
// ========== XP AND LEVELLING SYSTEM ==========
let playerXP = 0;
let playerLevel = 1;
const XP_THRESHOLDS = [0, 200, 500, 1000, 2000, 4000, 8000, 16000, 32000, 64000];

function getLevelFromXP(xp) {
  for (let i = XP_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= XP_THRESHOLDS[i]) return i + 1;
  }
  return 1;
}

function getXPForNextLevel(currentLevel) {
  if (currentLevel >= XP_THRESHOLDS.length) return XP_THRESHOLDS[XP_THRESHOLDS.length - 1] * 2;
  return XP_THRESHOLDS[currentLevel];
}
 // easy, medium, hard
let slowMoTimer=0, slowMoRate=1; // for super attack slow-mo
let killStreakCount=0, killStreakTimer=0, killStreakText='', killStreakFlash=0;
let matchStats={kills:0,damageDone:0,damageTaken:0,cratesSmashed:0,powerupsCollected:0,shieldsUsed:0,supersUsed:0,dashesUsed:0,xpEarned:0};
// ========== DEATH REPLAY SYSTEM ==========
let lastDeathInfo = {
  killer: null,
  victim: null,
  timestamp: 0,
  freezeTimer: 0,
  replayTimer: 0,
  killedX: 0,
  killedY: 0
};


// ========== WEATHER SYSTEM ==========
let currentWeather = null;
let weatherParticles = [];

class Weather {
  constructor(type) {
    this.type = type;
    this.particles = [];
    this.init();
  }
  
  init() {
    this.particles = [];
    const count = {
      'rain': 200,
      'snow': 150,
      'fog': 100,
      'sandstorm': 180
    }[this.type] || 0;
    
    for (let i = 0; i < count; i++) {
      if (this.type === 'rain') {
        this.particles.push({
          x: Math.random() * 1200,
          y: Math.random() * 800,
          vx: -2,
          vy: 5 + Math.random() * 3,
          life: 300
        });
      } else if (this.type === 'snow') {
        this.particles.push({
          x: Math.random() * 1200,
          y: Math.random() * 800,
          vx: Math.sin(Math.random() * Math.PI * 2) * 0.5,
          vy: 1 + Math.random() * 1.5,
          size: 2 + Math.random() * 3,
          life: 300
        });
      } else if (this.type === 'fog') {
        this.particles.push({
          x: Math.random() * 1200,
          y: Math.random() * 800,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.2,
          size: 40 + Math.random() * 100,
          life: 300
        });
      } else if (this.type === 'sandstorm') {
        this.particles.push({
          x: Math.random() * 1200,
          y: Math.random() * 800,
          vx: 3 + Math.random() * 2,
          vy: (Math.random() - 0.5) * 2,
          size: 8 + Math.random() * 6,
          life: 300
        });
      }
    }
  }
  
  update() {
    for (let p of this.particles) {
      p.x += p.vx;
      p.y += p.vy;
      
      if (p.x < -50) p.x = 1250;
      if (p.x > 1250) p.x = -50;
      if (p.y > 850) p.y = -50;
      if (p.y < -50) p.y = 850;
    }
  }
  
  draw() {
    if (this.type === 'rain') {
      ctx.strokeStyle = 'rgba(100, 150, 255, 0.6)';
      ctx.lineWidth = 2;
      for (let p of this.particles) {
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - 2, p.y + 8);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(100, 150, 255, 0.05)';
      ctx.fillRect(0, 0, 1200, 800);
    } else if (this.type === 'snow') {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      for (let p of this.particles) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = 'rgba(200, 220, 255, 0.08)';
      ctx.fillRect(0, 0, 1200, 800);
    } else if (this.type === 'fog') {
      ctx.fillStyle = 'rgba(200, 200, 200, 0.1)';
      for (let p of this.particles) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (this.type === 'sandstorm') {
      ctx.fillStyle = 'rgba(200, 150, 80, 0.6)';
      for (let p of this.particles) {
        ctx.fillRect(p.x, p.y, p.size, p.size);
      }
      ctx.fillStyle = 'rgba(220, 180, 120, 0.08)';
      ctx.fillRect(0, 0, 1200, 800);
    }
  }
}

function spawnWeather() {
  if (currentMap.weather === 'clear' || !currentMap.weather) {
    currentWeather = null;
    return;
  }
  if (['rain', 'snow', 'fog', 'sandstorm'].includes(currentMap.weather)) {
    currentWeather = new Weather(currentMap.weather);
    return;
  }
  const rand = Math.random();
  if (rand < 0.40) {
    currentWeather = null;
  } else if (rand < 0.60) {
    currentWeather = new Weather('rain');
  } else if (rand < 0.75) {
    currentWeather = new Weather('snow');
  } else if (rand < 0.90) {
    currentWeather = new Weather('fog');
  } else {
    currentWeather = new Weather('sandstorm');
  }
}

let ambientParticles=[];
// ========== CAMERA SYSTEM ==========
let cameraZoom = isMobile ? 0.8 : 1;
let cameraTargetZoom = isMobile ? 0.8 : 1;
let cameraX = 600;
let cameraY = 400;


// ========== TREES & CRATES & POWERUPS ==========
class Tree {
  constructor(x,y) {
    this.x=x;this.y=y;
    this.radius=22; // collision radius
    this.trunkW=10;this.trunkH=14;
    this.canopyR=20+Math.random()*8;
    this.shade=Math.random()*0.15; // slight color variation
    // Enhanced randomization for uniqueness
    this.trunkStyle=Math.floor(Math.random()*3); // 0=smooth, 1=knotty, 2=gnarled
    this.leafDensity=0.6+Math.random()*0.4; // 0.6-1.0
    this.barkVariation=Math.random()*0.2; // color variation per tree
    this.mossChance=Math.random(); // determines if moss appears
    this.vineAmount=Math.random(); // vine/moss coverage
    this.leafColors=[
      {dark:`rgb(${20+this.shade*60},${70+this.shade*40},${15+this.shade*30})`,
       med:`rgb(${35+this.shade*70},${110+this.shade*45},${25+this.shade*35})`,
       bright:`rgb(${50+this.shade*80},${140+this.shade*50},${30+this.shade*40})`}
    ];
  }
  draw() {
    const baseX=this.x;
    const baseY=this.y+4;
    const sway=Math.sin(frameCount*0.04+this.x*0.015)*1.4;
    const r=this.canopyR+2;
    const puffs=[
      {x:-10,y:-7,size:r*0.88},
      {x:10,y:-10,size:r*0.82},
      {x:-2,y:-16,size:r*0.95},
      {x:-15,y:5,size:r*0.72},
      {x:16,y:4,size:r*0.7}
    ];

    ctx.fillStyle='rgba(0,0,0,0.22)';
    ctx.beginPath();
    ctx.ellipse(baseX,baseY+16,r*1.35,11,0,0,Math.PI*2);
    ctx.fill();

    puffs.forEach(p=>{
      ctx.fillStyle='#195d2f';
      ctx.beginPath();
      ctx.arc(baseX+p.x,baseY+p.y,p.size,0,Math.PI*2);
      ctx.fill();
    });

    puffs.forEach(p=>{
      ctx.fillStyle='#2e9c47';
      ctx.beginPath();
      ctx.arc(baseX+p.x*0.92+sway*0.2,baseY+p.y-2,p.size*0.78,0,Math.PI*2);
      ctx.fill();
    });

    puffs.slice(0,3).forEach(p=>{
      ctx.fillStyle='#8bff6e';
      ctx.beginPath();
      ctx.arc(baseX+p.x*0.75+sway*0.35,baseY+p.y-6,p.size*0.42,0,Math.PI*2);
      ctx.fill();
    });

    ctx.fillStyle='rgba(255,255,255,0.18)';
    for(let i=0;i<6;i++){
      const angle=(Math.PI*2/6)*i+this.x*0.1;
      const px=baseX+Math.cos(angle)*(r*0.45);
      const py=baseY-9+Math.sin(angle)*(r*0.32);
      ctx.fillRect(px-1.5,py-1.5,3,3);
    }

    ctx.fillStyle='rgba(10,40,18,0.26)';
    ctx.beginPath();
    ctx.arc(baseX,baseY-4,r*0.78,0,Math.PI*2);
    ctx.fill();
  }
}

class Crate {
  constructor(x,y) {
    this.x=x;this.y=y;
    this.hp=75;this.maxHp=75;
    this.radius=16;
    this.alive=true;
    this.hitFlash=0;
    this.size=28; // pixel size
  }
  takeDamage(dmg,attacker) {
    this.hp-=dmg;this.hitFlash=6;
    if(dmg>=3)damageNumbers.push({x:this.x+(Math.random()-0.5)*16,y:this.y-20,text:Math.round(dmg).toString(),life:30,color:'#ffaa44'});
    if(this.hp>0) soundManager.playSound('attackHit', attacker&&attacker.isPlayer?0.5:0.18);
    if(this.hp<=0){
      this.alive=false;
      soundManager.playSound('crateSmash', attacker&&attacker.isPlayer?0.95:0.42);
      if(attacker&&attacker.isPlayer)matchStats.cratesSmashed++;
      // Break particles (wood splinters)
      for(let i=0;i<15;i++){
        particles.push({x:this.x,y:this.y,vx:(Math.random()-0.5)*5,vy:(Math.random()-0.5)*5-2,life:25+Math.random()*20,color:Math.random()>0.5?'#8B6914':'#6b4226',size:3+Math.random()*3});
      }
      // Spawn power-up
      powerups.push(new PowerUp(this.x,this.y));
    }
  }
  draw() {
    if(!this.alive)return;
    if (this.dropPhase) {
      this.dropCounter++;
      if (this.dropCounter > 30) {
        this.dropPhase = false;
      }
      return; // Don't update during drop
    }
    
    const s=this.size,hx=this.x-s/2,hy=this.y-s/2;
    // Hit flash
    if(this.hitFlash>0&&this.hitFlash%2===0)ctx.globalAlpha=0.6;

    // Soft oval shadow underneath
    ctx.fillStyle='rgba(0,0,0,0.25)';
    ctx.beginPath();ctx.ellipse(this.x,this.y+s/2+3,s/2+4,5,0,0,Math.PI*2);ctx.fill();

    const topOffset=4;
    ctx.fillStyle='#2a144d';
    ctx.fillRect(hx,hy,s,s);
    ctx.fillStyle='#824bff';
    ctx.fillRect(hx+3,hy+3,s-6,s-6);
    ctx.fillStyle='#c6a2ff';
    ctx.fillRect(hx+5,hy+5,s-10,6);
    ctx.fillStyle='#5726b9';
    ctx.fillRect(hx+5,hy+14,s-10,s-19);

    ctx.fillStyle='#4a2291';
    ctx.beginPath();
    ctx.moveTo(hx,hy);
    ctx.lineTo(hx+topOffset,hy-topOffset);
    ctx.lineTo(hx+s+topOffset,hy-topOffset);
    ctx.lineTo(hx+s,hy);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle='#220d3c';
    ctx.beginPath();
    ctx.moveTo(hx+s,hy);
    ctx.lineTo(hx+s+topOffset,hy-topOffset);
    ctx.lineTo(hx+s+topOffset,hy+s-topOffset);
    ctx.lineTo(hx+s,hy+s);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle='#170626';
    ctx.lineWidth=2;
    ctx.strokeRect(hx,hy,s,s);

    ctx.fillStyle='#8cff69';
    ctx.beginPath();
    ctx.moveTo(this.x,hy+8);
    ctx.lineTo(this.x+6,hy+14);
    ctx.lineTo(this.x+2,hy+14);
    ctx.lineTo(this.x+6,hy+22);
    ctx.lineTo(this.x-5,hy+15);
    ctx.lineTo(this.x-1,hy+15);
    ctx.lineTo(this.x-5,hy+8);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle='rgba(255,255,255,0.4)';
    ctx.fillRect(hx+6,hy+6,6,2);
    ctx.fillRect(hx+6,hy+10,2,2);

    // Damage cracks when HP below 50%
    if(this.hp<this.maxHp*0.5){
      ctx.strokeStyle='#2a1a00';
      ctx.lineWidth=2;
      const crackedAmount=1-(this.hp/this.maxHp);
      if(crackedAmount>0.1){
        ctx.beginPath();ctx.moveTo(hx+5,hy+10);ctx.lineTo(hx+12,hy+18);ctx.stroke();
      }
      if(crackedAmount>0.3){
        ctx.beginPath();ctx.moveTo(hx+15,hy+5);ctx.lineTo(hx+18,hy+20);ctx.stroke();
      }
      if(crackedAmount>0.5){
        ctx.beginPath();ctx.moveTo(hx+24,hy+8);ctx.lineTo(hx+20,hy+22);ctx.stroke();
      }
    }

    ctx.globalAlpha=1;
    // End stealth alpha

    // HP bar
    const barW=s,barH=4,barX=hx,barY=hy-8;
    ctx.fillStyle='#333';ctx.fillRect(barX,barY,barW,barH);
    ctx.fillStyle='#ffaa44';ctx.fillRect(barX,barY,barW*(this.hp/this.maxHp),barH);
    ctx.strokeStyle='#000';ctx.lineWidth=1;ctx.strokeRect(barX,barY,barW,barH);
  }
}

// ========== ARENA HAZARDS ==========
let hazards = [];

class LavaPool {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 40;
    this.bubblePhase = Math.random() * Math.PI * 2;
    this.bubbles = [];
    for (let i = 0; i < 6; i++) {
      this.bubbles.push({
        x: (Math.random() - 0.5) * this.radius,
        y: (Math.random() - 0.5) * this.radius,
        size: 4 + Math.random() * 3,
        life: 10 + Math.random() * 20
      });
    }
  }
  
  update() {
    this.bubblePhase += 0.08;
    for (let b of this.bubbles) {
      b.life--;
      if (b.life <= 0) {
        b.x = (Math.random() - 0.5) * this.radius;
        b.y = (Math.random() - 0.5) * this.radius;
        b.size = 4 + Math.random() * 3;
        b.life = 10 + Math.random() * 20;
      }
    }
  }
  
  draw() {
    const pulse = Math.sin(this.bubblePhase) * 0.12 + 0.88;
    const outerGlow = ctx.createRadialGradient(this.x, this.y, this.radius * 0.2, this.x, this.y, this.radius + 20);
    outerGlow.addColorStop(0, 'rgba(255,214,84,0.12)');
    outerGlow.addColorStop(0.65, 'rgba(255,112,54,0.18)');
    outerGlow.addColorStop(1, 'rgba(94,34,18,0)');
    ctx.fillStyle = outerGlow;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius + 18, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#5a1f12';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius + 4, 0, Math.PI * 2);
    ctx.fill();

    const innerGlow = ctx.createRadialGradient(this.x - 8, this.y - 10, 2, this.x, this.y, this.radius);
    innerGlow.addColorStop(0, '#ffe15a');
    innerGlow.addColorStop(0.3, '#ff9d3f');
    innerGlow.addColorStop(0.7, '#d94a1c');
    innerGlow.addColorStop(1, '#802515');
    ctx.fillStyle = innerGlow;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * pulse, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255,236,144,0.28)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius - 6, 0, Math.PI * 2);
    ctx.stroke();

    for (let b of this.bubbles) {
      const alpha = Math.sin(this.bubblePhase + b.life * 0.2) * 0.5 + 0.5;
      ctx.fillStyle = `rgba(255, 236, 140, ${alpha * 0.68})`;
      ctx.beginPath();
      ctx.arc(this.x + b.x, this.y + b.y, b.size, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = `rgba(255,255,255,${alpha * 0.22})`;
      ctx.beginPath();
      ctx.arc(this.x + b.x - 1, this.y + b.y - 1, Math.max(1, b.size * 0.35), 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

class ExplodingBarrel {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 14;
    this.hp = 1; // One hit to explode
    this.alive = true;
  }
  
  takeDamage(dmg) {
    if (this.hp > 0) {
      this.hp--;
      this.explode();
    }
  }
  
  explode() {
    this.alive = false;
    soundManager.playSound('death', 0.4);
    
    // Large explosion
    for (let i = 0; i < 30; i++) {
      const angle = (Math.PI * 2 / 30) * i;
      const speed = 2 + Math.random() * 3;
      particles.push({
        x: this.x,
        y: this.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 30 + Math.random() * 20,
        color: Math.random() > 0.5 ? '#ff4444' : '#ffaa44',
        size: 4 + Math.random() * 4
      });
    }
    
    // Damage nearby fighters
    for (let f of fighters) {
      if (!f.alive) continue;
      const d = dist({x: this.x, y: this.y}, f);
      if (d < 80) {
        const angle = Math.atan2(f.y - this.y, f.x - this.x);
        f.takeDamage(60, null);
        f.knockbackX = Math.cos(angle) * 3;
        f.knockbackY = Math.sin(angle) * 3;
      }
    }
    
    // Shake
    shakeX += (Math.random() - 0.5) * 6;
    shakeY += (Math.random() - 0.5) * 6;
  }
  
  draw() {
    if (!this.alive) return;

    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath();
    ctx.ellipse(this.x, this.y + 16, 17, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#5d0b0f';
    ctx.beginPath();
    ctx.roundRect(this.x - 13, this.y - 16, 26, 30, 6);
    ctx.fill();

    const bodyGrad = ctx.createLinearGradient(this.x - 12, this.y - 14, this.x + 12, this.y + 14);
    bodyGrad.addColorStop(0, '#ff6b61');
    bodyGrad.addColorStop(0.55, '#d22d2d');
    bodyGrad.addColorStop(1, '#7f1118');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.roundRect(this.x - 11, this.y - 14, 22, 28, 5);
    ctx.fill();

    ctx.fillStyle = '#ffd847';
    ctx.fillRect(this.x - 10, this.y - 5, 20, 4);
    ctx.fillRect(this.x - 10, this.y + 5, 20, 4);

    ctx.strokeStyle = 'rgba(73,0,0,0.75)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(this.x - 11, this.y - 14, 22, 28, 5);
    ctx.stroke();

    ctx.fillStyle = '#2a0909';
    ctx.beginPath();
    ctx.arc(this.x, this.y - 1, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffeb87';
    ctx.beginPath();
    ctx.arc(this.x - 2, this.y - 2, 1.7, 0, Math.PI * 2);
    ctx.arc(this.x + 2, this.y - 2, 1.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(this.x - 1.6, this.y + 1, 3.2, 2.2);
  }
}

class BouncerPad {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 35;
    this.glowPhase = 0;
    this.cooldown = 0;
    this.lastBouncedFighters = new Set();
  }
  
  update() {
    this.glowPhase += 0.08;
    if (this.cooldown > 0) this.cooldown--;
  }
  
  checkCollision(fighter) {
    if (this.cooldown > 0) return;
    const d = dist({x: this.x, y: this.y}, fighter);
    if (d < this.radius) {
      if (!this.lastBouncedFighters.has(fighter)) {
        this.lastBouncedFighters.add(fighter);
        const angle = Math.random() * Math.PI * 2;
        const speed = 8;
        fighter.knockbackX = Math.cos(angle) * speed;
        fighter.knockbackY = Math.sin(angle) * speed;
        this.cooldown = 180; // 3 second cooldown
        soundManager.playSound('dash', 0.5);
        
        // Bounce particles
        for (let i = 0; i < 20; i++) {
          const a = (Math.PI * 2 / 20) * i;
          particles.push({
            x: this.x,
            y: this.y,
            vx: Math.cos(a) * 2,
            vy: Math.sin(a) * 2,
            life: 20,
            color: '#00ff88',
            size: 2 + Math.random() * 2
          });
        }
      }
    }
  }
  
  draw() {
    const ready = this.cooldown <= 0;
    const glowSize = this.radius + Math.sin(this.glowPhase) * 3;
    ctx.fillStyle = ready
      ? `rgba(57, 255, 194, ${(Math.sin(this.glowPhase) * 0.24 + 0.34)})`
      : 'rgba(90,110,128,0.18)';
    ctx.beginPath();
    ctx.arc(this.x, this.y, glowSize + 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#173846';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius + 2, 0, Math.PI * 2);
    ctx.fill();

    const padGrad = ctx.createRadialGradient(this.x - 8, this.y - 10, 4, this.x, this.y, this.radius);
    padGrad.addColorStop(0, ready ? '#7effda' : '#6d7c86');
    padGrad.addColorStop(0.4, ready ? '#15e5a4' : '#49545e');
    padGrad.addColorStop(1, ready ? '#0a8f75' : '#2d3439');
    ctx.fillStyle = padGrad;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = ready ? 'rgba(180,255,235,0.8)' : 'rgba(122,144,160,0.45)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius - 6, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.beginPath();
    ctx.moveTo(this.x, this.y - 12);
    ctx.lineTo(this.x + 14, this.y);
    ctx.lineTo(this.x, this.y + 12);
    ctx.lineTo(this.x - 14, this.y);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = ready ? '#ebfff9' : '#c4d2d8';
    ctx.beginPath();
    ctx.moveTo(this.x - 2, this.y - 8);
    ctx.lineTo(this.x + 8, this.y);
    ctx.lineTo(this.x - 2, this.y + 8);
    ctx.closePath();
    ctx.fill();
  }
}

function spawnHazards() {
  hazards = [];

  currentMap.hazards.lava.forEach(({ x, y }) => hazards.push(new LavaPool(x, y)));
  currentMap.hazards.barrels.forEach(({ x, y }) => hazards.push(new ExplodingBarrel(x, y)));
  currentMap.hazards.bouncers.forEach(({ x, y }) => hazards.push(new BouncerPad(x, y)));
}


class PowerUp {
  constructor(x,y) {
    this.x=x;this.y=y;
    this.radius=10;
    this.alive=true;
    this.age=0;
    // 5 types: health, attack, speed, doubleDmg, shieldRecharge
    const r=Math.random();
    if(r<0.3)this.type='health';
    else if(r<0.55)this.type='attack';
    else if(r<0.75)this.type='speed';
    else if(r<0.9)this.type='doubleDmg';
    else this.type='shieldRecharge';
    // Sparkle particles for visual detail
    this.sparkles=[
      {angle:0,dist:12},
      {angle:Math.PI*0.66,dist:14},
      {angle:Math.PI*1.33,dist:13}
    ];
  }
  getColor(){
    const c={health:'#44ff44',attack:'#ff4444',speed:'#44ddff',doubleDmg:'#ff44ff',shieldRecharge:'#00ffff'};
    return c[this.type]||'#fff';
  }
  getDarkColor(){
    const c={health:'#22aa22',attack:'#aa2222',speed:'#2288aa',doubleDmg:'#aa22aa',shieldRecharge:'#008888'};
    return c[this.type]||'#888';
  }
  update() {
    this.age++;
    if(this.age>900)this.alive=false;
    for(const f of fighters){
      if(!f.alive)continue;
      if(dist(this,f)<this.radius+f.radius){
        this.alive=false;
        if(f.isPlayer)matchStats.powerupsCollected++;
        soundManager.playSound('powerup', f.isPlayer?0.9:0.45);
        const col=this.getColor();
        if(this.type==='health'){
          f.hp=Math.min(f.maxHp,f.hp+80);
          damageNumbers.push({x:f.x,y:f.y-30,text:'+80 HP',life:50,color:col});
        } else if(this.type==='attack'){
          f.attack+=4;
          damageNumbers.push({x:f.x,y:f.y-30,text:'+4 ATK',life:50,color:col});
        } else if(this.type==='speed'){
          f.speedBuff=1.8;f.speedBuffTimer=480; // 8 seconds
          damageNumbers.push({x:f.x,y:f.y-30,text:'⚡ SPEED!',life:50,color:col});
        } else if(this.type==='doubleDmg'){
          f.doubleDmg=true;f.doubleDmgTimer=600; // 10 seconds
          damageNumbers.push({x:f.x,y:f.y-30,text:'💥 2x DMG!',life:50,color:col});
        } else if(this.type==='shieldRecharge'){
          f.shieldUses=Math.min(2,f.shieldUses+1);
          damageNumbers.push({x:f.x,y:f.y-30,text:'🛡️ +SHIELD',life:50,color:col});
        }
        for(let i=0;i<10;i++)particles.push({x:f.x,y:f.y,vx:(Math.random()-0.5)*3,vy:-1-Math.random()*2,life:20,color:col,size:2+Math.random()*2});
        break;
      }
    }
  }
  draw() {
    if(!this.alive)return;
    const bob=Math.sin(this.age*0.08)*3;
    const dy=this.y+bob;
    const col=this.getColor(),col2=this.getDarkColor();

    // Pulsing glow aura ring
    const glowPulse=0.3+Math.sin(this.age*0.12)*0.15;
    ctx.strokeStyle=col.replace(')',`,${glowPulse})`).replace('rgb','rgba');
    ctx.lineWidth=2;
    ctx.beginPath();ctx.arc(this.x,dy,16,0,Math.PI*2);ctx.stroke();

    // Stronger base glow
    const glow=0.15+Math.sin(this.age*0.1)*0.08;
    ctx.fillStyle=col.replace(')',`,${glow})`).replace('rgb','rgba');
    ctx.beginPath();ctx.arc(this.x,dy,14,0,Math.PI*2);ctx.fill();

    // 3D cube - front face (bright)
    ctx.fillStyle=col;
    ctx.fillRect(this.x-8,dy-8,16,16);

    // 3D cube - top face (lighter shade, offset up-right)
    const topShade=col.replace(/[\d.]+\)$/,()=>{
      let parts=col.match(/[\d.]+/g);
      if(!parts||parts.length<3)return col;
      const r=Math.min(255,parseInt(parts[0])*1.3),g=Math.min(255,parseInt(parts[1])*1.3),b=Math.min(255,parseInt(parts[2])*1.3);
      return `${r},${g},${b})`;
    });
    ctx.fillStyle=topShade;
    ctx.beginPath();
    ctx.moveTo(this.x-8,this.y-4);
    ctx.lineTo(this.x-4,this.y-8);
    ctx.lineTo(this.x+4,this.y-8);
    ctx.lineTo(this.x+8,this.y-4);
    ctx.closePath();
    ctx.fill();

    // 3D cube - right side face (darker shade)
    ctx.fillStyle=col2;
    ctx.beginPath();
    ctx.moveTo(this.x+8,dy-8);
    ctx.lineTo(this.x+4,this.y-8);
    ctx.lineTo(this.x+4,this.y+8);
    ctx.lineTo(this.x+8,dy+8);
    ctx.closePath();
    ctx.fill();

    // Detailed pixel-art icons - much more distinct
    ctx.fillStyle='#fff';
    if(this.type==='health'){
      // Bold red cross
      ctx.fillStyle='#ff2222';
      ctx.fillRect(this.x-1,dy-5,2,10);ctx.fillRect(this.x-5,dy-1,10,2);
      // Outline
      ctx.strokeStyle='#ffaaaa';ctx.lineWidth=1;
      ctx.strokeRect(this.x-1,dy-5,2,10);ctx.strokeRect(this.x-5,dy-1,10,2);
    } else if(this.type==='attack'){
      // Red sword pointing up
      ctx.fillStyle='#ff3333';
      ctx.beginPath();
      ctx.moveTo(this.x,dy-6);
      ctx.lineTo(this.x+3,dy+2);
      ctx.lineTo(this.x+1,dy+2);
      ctx.lineTo(this.x+1,dy+5);
      ctx.lineTo(this.x-1,dy+5);
      ctx.lineTo(this.x-1,dy+2);
      ctx.lineTo(this.x-3,dy+2);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle='#ffaaaa';
      ctx.lineWidth=1;
      ctx.stroke();
    } else if(this.type==='speed'){
      // Yellow lightning bolt
      ctx.fillStyle='#ffff00';
      ctx.beginPath();
      ctx.moveTo(this.x,dy-6);
      ctx.lineTo(this.x+2,dy-2);
      ctx.lineTo(this.x+1,dy-2);
      ctx.lineTo(this.x+3,dy+3);
      ctx.lineTo(this.x-1,dy+2);
      ctx.lineTo(this.x,dy);
      ctx.lineTo(this.x-2,dy);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle='#ffff88';
      ctx.lineWidth=1;
      ctx.stroke();
    } else if(this.type==='doubleDmg'){
      // x2 in bold with glow
      ctx.fillStyle='#ff44ff';
      ctx.font='bold 14px Arial';
      ctx.textAlign='center';
      ctx.textBaseline='middle';
      ctx.fillText('x2',this.x,dy);
      ctx.strokeStyle='#ff99ff';
      ctx.lineWidth=1;
      ctx.strokeText('x2',this.x,dy);
      ctx.textAlign='left';
      ctx.textBaseline='top';
    } else if(this.type==='shieldRecharge'){
      // Cyan shield outline shape
      ctx.fillStyle='#00ffff';
      ctx.beginPath();
      ctx.moveTo(this.x,dy-5);
      ctx.lineTo(this.x+5,dy-2);
      ctx.lineTo(this.x+4,dy+4);
      ctx.lineTo(this.x,dy+6);
      ctx.lineTo(this.x-4,dy+4);
      ctx.lineTo(this.x-5,dy-2);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle='#44ffff';
      ctx.lineWidth=1;
      ctx.stroke();
    }

    // Orbiting sparkle particles (2-3 small white dots)
    for(let i=0;i<this.sparkles.length;i++){
      const s=this.sparkles[i];
      const sparkleAngle=s.angle+this.age*0.04;
      const sx=this.x+Math.cos(sparkleAngle)*s.dist;
      const sy=dy+Math.sin(sparkleAngle)*s.dist;
      const sparkleAlpha=0.5+Math.sin(this.age*0.15+i)*0.5;
      ctx.fillStyle=`rgba(255,255,255,${sparkleAlpha})`;
      ctx.beginPath();ctx.arc(sx,sy,1.5,0,Math.PI*2);ctx.fill();
    }
  }
}

function spawnTrees() {
  trees=[];
  currentMap.bushes.forEach(({ x, y }) => trees.push(new Tree(x, y)));
}

function spawnCrates() {
  crates=[];
  currentMap.crates.forEach(({ x, y }) => crates.push(new Crate(x, y)));
}

// ========== CHARACTER SELECT ==========
const heroGrid = document.getElementById('hero-grid');
try {
HEROES.forEach((hero,i) => {
  const card = document.createElement('div');
  card.className = 'hero-card';
  card.style.setProperty('--hero-accent', hero.hudAccent || hero.color);
  card.onclick = () => selectHero(i);
  const sc = {HP:'#44cc44',ATK:'#ff4444',DEF:'#ffaa00',SPD:'#00d4ff',RNG:'#ff88ff'};
  const stats = [
    {l:'HP',v:hero.hp,m:850},{l:'ATK',v:hero.attack,m:28},
    {l:'DEF',v:hero.defense,m:18},{l:'SPD',v:hero.speed,m:4.5},
    {l:'RNG',v:hero.range,m:300}
  ];
  const rc = hero.rangeType==='ranged'?'#44aaff':'#ff8844';
  const rl = hero.rangeType==='ranged'?'RANGED':'MELEE';
  card.innerHTML = `
    <div class="preview" id="prev-${i}"></div>
    <div class="hero-role">${hero.role}</div>
    <div class="name">${hero.name}</div>
    <div class="type">${hero.type}</div>
    <div class="range-type" style="--range-accent:${rc};">${rl}</div>
    ${isMobile ? '' : `<div class="desc">${hero.desc}</div>`}
    ${isMobile ? '' : `<div class="stats">${stats.map(s=>`<div class="stat-bar"><span class="label">${s.l}</span><div class="bar"><div class="fill" style="width:${(s.v/s.m)*100}%;background:${sc[s.l]}"></div></div></div>`).join('')}</div>`}
    ${isMobile ? '' : `<div class="hero-loadout">Super: ${hero.superName} · Gear: ${hero.accessory}</div>`}`;
  heroGrid.appendChild(card);
  const prevScale = isMobile ? 2 : 3;
  document.getElementById(`prev-${i}`).appendChild(renderPreview(hero.sprite, prevScale));
});
setupTouchControls();
// Debug: show card count
console.log('Hero cards created: ' + heroGrid.children.length);
} catch(e) { document.getElementById('char-select').innerHTML='<h1 style="color:red">ERROR: '+e.message+'<br>Stack: '+e.stack+'</h1>'; console.error(e); }
function selectHero(i) {
  selectedHero=i;
  document.querySelectorAll('.hero-card').forEach((c,j)=>c.classList.toggle('selected',j===i));
  const btn = document.getElementById('start-btn');
  btn.disabled = false;
  btn.removeAttribute('disabled');
  // Pre-init audio on hero select (user gesture)
  initSound();
  soundManager.playSound('uiConfirm', 0.8);
}
function randomHero() {
  const i = Math.floor(Math.random() * HEROES.length);
  selectHero(i);
  const btn = document.getElementById('random-btn');
  btn.textContent = '🎲 ' + HEROES[i].name.toUpperCase() + '!';
  btn.style.background = 'linear-gradient(135deg,#e94560,#ff6b35)';
  btn.style.color = '#fff';
  setTimeout(() => { btn.textContent = '🎲 RANDOM HERO'; btn.style.background = 'linear-gradient(135deg,#0ff,#0088aa)'; btn.style.color = '#000'; }, 1500);
}

// ========== DIFFICULTY ==========
function setDifficulty(d){
  difficulty=d;
  document.querySelectorAll('.diff-btn').forEach(b=>{b.style.boxShadow='none';b.classList.remove('selected-diff');});
  const btn=document.getElementById('diff-'+d);
  if(btn){btn.style.boxShadow=`0 0 10px ${d==='easy'?'rgba(68,255,68,0.6)':d==='hard'?'rgba(233,69,96,0.6)':'rgba(255,170,0,0.6)'}`;btn.classList.add('selected-diff');}
  soundManager.playSound('uiConfirm', 0.55);
}
function getDiffSettings(){
  if(difficulty==='easy')return{aimWobble:0.7,hesitation:0.35,cooldownMult:1.5,thinkTime:90,aggressChance:0.35,shieldReact:0.004,superChance:0.08};
  if(difficulty==='hard')return{aimWobble:0.15,hesitation:0.75,cooldownMult:0.7,thinkTime:30,aggressChance:0.75,shieldReact:0.025,superChance:0.35};
  return{aimWobble:0.4,hesitation:0.6,cooldownMult:1,thinkTime:60,aggressChance:0.55,shieldReact:0.008,superChance:0.15}; // medium
}

// ========== INPUT ==========
const keys={};
window.addEventListener('keydown',e=>{keys[e.key.toLowerCase()]=true; if([' ','n','v','shift','arrowup','arrowdown','arrowleft','arrowright'].includes(e.key.toLowerCase()))e.preventDefault();});
window.addEventListener('keyup',e=>{keys[e.key.toLowerCase()]=false;});

// ========== MOBILE TOUCH CONTROLS ==========
function setupTouchControls() {
  if (!isMobile || !inputController) return;
  const controls = document.getElementById('touch-controls');
  if (controls) {
    controls.dataset.mode = 'dual-stick';
  }
}


// ========== PROJECTILE ==========
class Projectile {
  constructor(owner,x,y,angle,speed,damage,color,range,isSuper) {
    this.owner=owner;this.x=x;this.y=y;
    this.vx=Math.cos(angle)*speed;this.vy=Math.sin(angle)*speed;
    this.damage=damage;this.color=color;
    this.startX=x;this.startY=y;this.maxRange=range;
    this.alive=true;this.radius=isSuper?7:4;this.isSuper=isSuper;
    this.trail=[];this.age=0;
  }
  update() {
    this.age++;
    this.trail.push({x:this.x,y:this.y});
    if(this.trail.length>18)this.trail.shift();
    this.x+=this.vx;this.y+=this.vy;
    if(Math.sqrt((this.x-this.startX)**2+(this.y-this.startY)**2)>this.maxRange){this.alive=false;return;}
    for(const f of fighters){
      if(f===this.owner||!f.alive)continue;
      if(dist(this,f)<this.radius+f.radius){
        if(f.shieldActive){
          // Shield blocks damage!
          this.alive=false;
          soundManager.playSound('blocked', this.owner.isPlayer?0.8:0.3);
          for(let i=0;i<8;i++) particles.push({x:this.x,y:this.y,vx:(Math.random()-0.5)*5,vy:(Math.random()-0.5)*5,life:15,color:'#00ffff',size:3});
          damageNumbers.push({x:f.x,y:f.y-30,text:'BLOCKED!',life:35,color:'#00ffff'});
          return;
        }
        const dmg=Math.max(3,this.damage-f.defense*0.3);
        soundManager.playSound('rangedHit', this.owner.isPlayer?0.8:0.32);
        f.takeDamage(dmg,this.owner);
        const ang=Math.atan2(f.y-this.y,f.x-this.x);
        f.knockbackX+=Math.cos(ang)*(this.isSuper?8:4);
        f.knockbackY+=Math.sin(ang)*(this.isSuper?8:4);
        this.alive=false;
        for(let i=0;i<8;i++) particles.push({x:this.x,y:this.y,vx:(Math.random()-0.5)*4,vy:(Math.random()-0.5)*4,life:15,color:this.color,size:2+Math.random()*2});
        return;
      }
    }
    // Hit trees (projectiles blocked)
    for(const t of trees){
      if(dist(this,t)<this.radius+t.radius){
        this.alive=false;
        for(let i=0;i<4;i++)particles.push({x:this.x,y:this.y,vx:(Math.random()-0.5)*3,vy:(Math.random()-0.5)*3,life:10,color:'#2d7a1e',size:2+Math.random()*2});
        return;
      }
    }
    // Hit crates (damage them)
    for(const c of crates){
      if(!c.alive)continue;
      if(dist(this,c)<this.radius+c.radius){
        c.takeDamage(this.damage,this.owner);
        this.alive=false;
        for(let i=0;i<4;i++)particles.push({x:this.x,y:this.y,vx:(Math.random()-0.5)*3,vy:(Math.random()-0.5)*3,life:10,color:'#8B6914',size:2});
        return;
      }
    }
  }
  draw() {
    // Trail with smooth gradient fade
    for(let i=0;i<this.trail.length;i++){
      const t=this.trail[i];
      const trailAlpha=Math.pow(i/this.trail.length,0.6)*0.5;
      ctx.globalAlpha=trailAlpha;
      ctx.fillStyle=this.color;
      const s=this.isSuper?5:3;
      const trailWidth=s+(1-(i/this.trail.length))*1.8;
      ctx.beginPath();
      ctx.arc(t.x,t.y,trailWidth,0,Math.PI*2);
      ctx.fill();
    }
    ctx.globalAlpha=1;
    const s=this.radius;
    ctx.fillStyle=this.color;
    ctx.beginPath();ctx.arc(this.x,this.y,s,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='rgba(255,255,255,0.5)';
    ctx.beginPath();ctx.arc(this.x-1,this.y-1,Math.max(1,s*0.45),0,Math.PI*2);ctx.fill();
  }
}

// ========== FIGHTER ==========
class Fighter {
  constructor(heroDef,x,y,isPlayer) {
    this.hero=heroDef;this.x=x;this.y=y;this.isPlayer=isPlayer;
    this.hp=heroDef.hp;this.maxHp=heroDef.hp;
    this.speed=heroDef.speed;this.attack=heroDef.attack;
    this.defense=heroDef.defense;this.range=heroDef.range;
    this.alive=true;this.radius=16;this.angle=0;this.facingLeft=false;
    this.attackCooldown=0;this.superCharge=0;this.superMax=100;
    this.stormSfxCooldown=0;
    this.hitFlash=0;this.knockbackX=0;this.knockbackY=0;
    this.aiTarget=null;this.aiState='wander';this.aiTimer=0;
    this.aiPersonality = 'Survivor'; // Will be randomized on creation
    
    this.wanderAngle=Math.random()*Math.PI*2;
    // AI personalities
    if (!isPlayer) {
      const personalities = ['Aggro', 'Camper', 'Crate Hunter', 'Assassin', 'Survivor'];
      const weights = [0.30, 0.20, 0.15, 0.15, 0.20];
      const rand = Math.random();
      let cumulative = 0;
      for (let i = 0; i < weights.length; i++) {
        cumulative += weights[i];
        if (rand < cumulative) {
          this.aiPersonality = personalities[i];
          break;
        }
      }
    }
    
    this.animFrame=0;this.animTimer=0;this.moving=false;this.attackAnim=0;
    // Shield
    this.shieldActive=false;this.shieldTimer=0;this.shieldUses=2;
    this.shieldCooldown=0; // prevent instant re-use
    // AI shield
    this.aiShieldThreshold=0.3+Math.random()*0.2; // trigger shield when HP drops below this %
    // Passive heal - heals when not in combat for 3 seconds
    this.combatTimer=0; // counts up when not fighting, resets on attack/damage
    this.healPulseTimer=0; // visual pulse
    // Dash
    this.dashCooldown=0;this.dashTimer=0;this.dashDX=0;this.dashDY=0;
    this.dashMaxCooldown=210; // 3.5 seconds
    // Speed buff
    this.speedBuff=0;this.speedBuffTimer=0;
    // Double damage buff
    this.doubleDmg=false;this.doubleDmgTimer=0;
    this.stunTimer=0;
    this.dropPhase=true;this.dropCounter=0;
    // Passives
    this.fireTrailTimer = 0; // Blaze Knight fire trail
    this.slowTimer = 0; this.slowAmount = 0; // Frostbyte slow
    this.chainLightningCounter = 0; // Zap Wizard
    this.stealthTimer = 0; this.isStealthing = false; // Shadow Ninja
    this.stompTimer = 0; // Rex Titan
    this.stunTimer = 0; // For Rex Titan stun
    this.bushRevealTimer = 0;
  }

  update() {
    if(!this.alive)return;
    const prevSuperCharge=this.superCharge;
    this.superCharge=Math.min(this.superMax,this.superCharge+0.07);
    if(this.isPlayer&&prevSuperCharge<this.superMax&&this.superCharge>=this.superMax){
      soundManager.playSound('superReady', 0.9);
    }
    if(this.attackCooldown>0)this.attackCooldown--;
    if(this.hitFlash>0)this.hitFlash--;
    if(this.attackAnim>0)this.attackAnim--;
    if(this.shieldCooldown>0)this.shieldCooldown--;
    if(this.dashCooldown>0)this.dashCooldown--;
    if(this.stormSfxCooldown>0)this.stormSfxCooldown--;
    if(this.bushRevealTimer>0)this.bushRevealTimer--;
    // Buff timers
    if(this.speedBuffTimer>0){this.speedBuffTimer--;if(this.speedBuffTimer<=0)this.speedBuff=0;}
    if(this.doubleDmgTimer>0){this.doubleDmgTimer--;if(this.doubleDmgTimer<=0)this.doubleDmg=false;}
    // Dash movement
    if(this.dashTimer>0){
      this.dashTimer--;
      this.x+=this.dashDX*10;this.y+=this.dashDY*10;
      // Dash trail particles
      if(this.dashTimer%2===0)particles.push({x:this.x+(Math.random()-0.5)*10,y:this.y+(Math.random()-0.5)*10,vx:(Math.random()-0.5)*1,vy:(Math.random()-0.5)*1,life:12,color:'#ffffff',size:2+Math.random()*2});
    }
    this.x+=this.knockbackX;this.y+=this.knockbackY;
    this.knockbackX*=0.8;this.knockbackY*=0.8;

        // PASSIVE ABILITIES
    // Blaze Knight - Fire Trail
    if (this.hero.passive === "Fire Trail" && this.moving) {
      this.fireTrailTimer++;
      if (this.fireTrailTimer >= 3) {
        particles.push({
          x: this.x + (Math.random() - 0.5) * 10,
          y: this.y + (Math.random() - 0.5) * 10,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          life: 90,
          color: '#ff4444',
          size: 3 + Math.random() * 2,
          passive: 'fireTrail'
        });
        this.fireTrailTimer = 0;
      }
    } else {
      this.fireTrailTimer = 0;
    }
    
    // Frostbyte - Slow on Hit (already applied in takeDamage)
    if (this.slowTimer > 0) {
      this.slowTimer--;
    }
    
    // Zap Wizard - Chain Lightning (implemented in attack)
    
    // Shadow Ninja - Stealth Attack
    if (this.hero.passive === "Stealth Attack") {
      if (this.attackCooldown > 0 && this.attackCooldown <= 1) {
        this.isStealthing = false; // Just attacked, break stealth
      }
      if (this.attackCooldown > 80 && !this.moving) {
        this.stealthTimer++;
      } else {
        this.stealthTimer = 0;
        this.isStealthing = false;
      }
      if (this.stealthTimer >= 90) {
        this.isStealthing = true;
      }
    }
    
    // Captain Cosmos - Gravity Well (implemented in separate loop)
    
    // Rex Titan - Stomp Shockwave
    if (this.hero.passive === "Stomp Shockwave" && this.moving) {
      this.stompTimer++;
      if (this.stompTimer >= 60) {
        // Create shockwave
        for (let f of fighters) {
          if (f === this || !f.alive) continue;
          const d = dist(this, f);
          if (d < 90) {
            f.stunTimer = 10;
            // Stun effect
          }
        }
        // Shockwave particles
        for (let i = 0; i < 12; i++) {
          const angle = (Math.PI * 2 / 12) * i;
          particles.push({
            x: this.x,
            y: this.y,
            vx: Math.cos(angle) * 2,
            vy: Math.sin(angle) * 2,
            life: 15,
            color: '#44ff44',
            size: 3
          });
        }
        this.stompTimer = 0;
      }
    }

// Passive healing - when not near enemies and not being hit for 3s
    // Check if any enemy is close
    let nearEnemy=false;
    for(const f of fighters){
      if(f===this||!f.alive)continue;
      if(dist(this,f)<150){nearEnemy=true;break;}
    }
    if(nearEnemy||this.hitFlash>0){
      this.combatTimer=0; // reset - you're in danger
    } else {
      this.combatTimer++;
    }
    if(this.combatTimer>180&&this.hp<this.maxHp){ // 180 frames = 3 seconds safe
      this.hp=Math.min(this.maxHp,this.hp+0.4); // gentle heal
      this.healPulseTimer++;
      if(this.healPulseTimer%15===0){
        // Green healing sparkles float up
        for(let i=0;i<3;i++){
          particles.push({x:this.x+(Math.random()-0.5)*24,y:this.y+(Math.random()-0.5)*20,vx:(Math.random()-0.5)*0.8,vy:-1.2-Math.random()*1.5,life:22+Math.random()*10,color:'#44ff44',size:2+Math.random()*2});
        }
      }
    } else {
      this.healPulseTimer=0;
    }

    // Shield timer
    if(this.shieldActive){
      this.shieldTimer--;
      if(this.shieldTimer<=0) this.shieldActive=false;
    }

        // Stun status - can't move if stunned
    if (this.stunTimer > 0) {
      this.stunTimer--;
    }
    
    let dx=0,dy=0;
    if(this.isPlayer){
      const moveVector=inputController?inputController.actions.moveVector:{x:0,y:0};
      const attackAim=inputController?inputController.getAimVector('attack'):null;
      const superAim=inputController?inputController.getAimVector('super'):null;
      const attackPressed=!!(keys[' ']||(inputController&&inputController.consumeAction('attackPressed')));
      const superPressed=!!(keys['n']||(inputController&&inputController.consumeAction('superPressed')));
      const shieldPressed=!!(keys['v']||(inputController&&inputController.consumeAction('shieldPressed')));
      const dashPressed=!!(keys['shift']||(inputController&&inputController.consumeAction('dashPressed')));
      // Keyboard input
      if(keys['w']||keys['arrowup'])dy=-1;
      if(keys['s']||keys['arrowdown'])dy=1;
      if(keys['a']||keys['arrowleft'])dx=-1;
      if(keys['d']||keys['arrowright'])dx=1;
      // Touch joystick input (overrides if active)
      if(Math.abs(moveVector.x)>0.15 || Math.abs(moveVector.y)>0.15){
        dx=moveVector.x;dy=moveVector.y;
      }
      if(attackAim&&attackAim.active){
        this.angle=Math.atan2(attackAim.y,attackAim.x);
        if(attackAim.x<0)this.facingLeft=true;else if(attackAim.x>0)this.facingLeft=false;
      } else if(dx||dy){
        const l=Math.sqrt(dx*dx+dy*dy);dx/=l;dy/=l;this.angle=Math.atan2(dy,dx);if(dx<0)this.facingLeft=true;else if(dx>0)this.facingLeft=false;
      }
      // Don't move if stunned
      this.moving = this.stunTimer <= 0 && !!(dx||dy);
      if(attackPressed&&this.attackCooldown<=0){
        if(attackAim&&attackAim.active)this.angle=Math.atan2(attackAim.y,attackAim.x);
        this.doAttack(false);
      }
      if(superPressed&&this.superCharge>=this.superMax){
        const aim=superAim&&superAim.active?superAim:attackAim;
        if(aim&&aim.active)this.angle=Math.atan2(aim.y,aim.x);
        this.doAttack(true);
      }
      if(shieldPressed&&!this.shieldActive&&this.shieldUses>0&&this.shieldCooldown<=0)this.activateShield();
      if(dashPressed&&this.dashCooldown<=0&&this.dashTimer<=0&&(dx||dy)){this.startDash(dx,dy);if(this.isPlayer)matchStats.dashesUsed++;}
    } else {
      this.updateAI();
      const spd=this.aiState==='flee'?1:(this.aiState==='chase'?1:0.5);
      dx=Math.cos(this.angle)*spd;dy=Math.sin(this.angle)*spd;
      this.moving=true;
      if(dx<0)this.facingLeft=true;else if(dx>0)this.facingLeft=false;
    }
    const effectiveSpeed=(this.speed+this.speedBuff)*(1-Math.max(0,this.slowAmount||0));
    this.x+=dx*effectiveSpeed;this.y+=dy*effectiveSpeed;

    // Animation
    if(this.moving){this.animTimer++;if(this.animTimer>8){this.animTimer=0;this.animFrame=1-this.animFrame;}}
    else this.animFrame=0;

    // Arena boundary
    const dfc=Math.sqrt((this.x-arenaCenterX)**2+(this.y-arenaCenterY)**2);
    if(dfc>arenaRadius-28){
      const ang=Math.atan2(this.y-arenaCenterY,this.x-arenaCenterX);
      this.x=arenaCenterX+Math.cos(ang)*(arenaRadius-29);
      this.y=arenaCenterY+Math.sin(ang)*(arenaRadius-29);
      if(dfc>arenaRadius-12){
        this.takeDamage(0.3,null);
        if(this.isPlayer&&this.stormSfxCooldown<=0){
          soundManager.playSound('stormDamage', 0.65);
          this.stormSfxCooldown=18;
        }
      }
    }
    // Push away from other fighters
    fighters.forEach(f=>{
      if(f===this||!f.alive)return;
      const d=dist(this,f);
      if(d<this.radius*2+4){const ang=Math.atan2(this.y-f.y,this.x-f.x);this.x+=Math.cos(ang)*2;this.y+=Math.sin(ang)*2;}
    });
    // Collide with trees (can't walk through, but can hide behind)
    trees.forEach(t=>{
      const d=dist(this,t);
      if(d<this.radius+t.radius-4){
        const ang=Math.atan2(this.y-t.y,this.x-t.x);
        this.x=t.x+Math.cos(ang)*(this.radius+t.radius-3);
        this.y=t.y+Math.sin(ang)*(this.radius+t.radius-3);
      }
    });
    // Collide with crates
    crates.forEach(c=>{
      if(!c.alive)return;
      const d=dist(this,c);
      if(d<this.radius+c.radius){
        const ang=Math.atan2(this.y-c.y,this.x-c.x);
        this.x=c.x+Math.cos(ang)*(this.radius+c.radius+1);
        this.y=c.y+Math.sin(ang)*(this.radius+c.radius+1);
      }
    });
  }

  activateShield() {
    this.shieldActive=true;
    this.shieldTimer=300; // 5 seconds at 60fps
    this.shieldUses--;
    this.shieldCooldown=60; // 1 second before can use again
    this.bushRevealTimer=60;
    if(this.isPlayer)matchStats.shieldsUsed++;
    soundManager.playSound('shield', this.isPlayer?0.95:0.45);
    // Shield activation particles
    for(let i=0;i<12;i++){
      const a=(Math.PI*2/12)*i;
      particles.push({x:this.x+Math.cos(a)*24,y:this.y+Math.sin(a)*24,vx:Math.cos(a)*1.5,vy:Math.sin(a)*1.5,life:20,color:'#00ffff',size:3});
    }
  }

  startDash(dx,dy) {
    this.dashTimer=6; // 6 frames of dash
    this.dashCooldown=this.dashMaxCooldown;
    this.dashDX=dx;this.dashDY=dy;
    this.bushRevealTimer=45;
    soundManager.playSound('dash', this.isPlayer?0.85:0.35);
    // Burst particles at start
    for(let i=0;i<8;i++){
      particles.push({x:this.x,y:this.y,vx:-dx*2+(Math.random()-0.5)*3,vy:-dy*2+(Math.random()-0.5)*3,life:15,color:'#aaeeff',size:3+Math.random()*2});
    }
  }

  updateAI() {
    const ds=getDiffSettings();
    this.aiTimer--;
    const visibleEnemy = f => !(f===this||!f.alive||!canObserverSeeFighter(this,f));

    // AI shield: use when taking damage and HP low
    if(!this.shieldActive&&this.shieldUses>0&&this.shieldCooldown<=0&&this.hp<this.maxHp*this.aiShieldThreshold){
      if(Math.random()<ds.shieldReact) this.activateShield();
    }
    // AI dash (sometimes in hard mode)
    if(difficulty==='hard'&&this.dashCooldown<=0&&this.dashTimer<=0&&Math.random()<0.003){
      const ddx=Math.cos(this.angle),ddy=Math.sin(this.angle);
      this.startDash(ddx,ddy);
    }

    if(this.aiTimer<=0){
      // Personality-based thinkTime adjustment
      let thinkTimeBase=ds.thinkTime;
      if(this.aiPersonality==='Aggro'){
        thinkTimeBase*=0.5; // 50% faster decision-making
      } else if(this.aiPersonality==='Camper'){
        thinkTimeBase*=1.3; // 30% slower (more hesitant)
      }

      this.aiTimer=thinkTimeBase+Math.random()*thinkTimeBase*0.5;

      // Personality-specific targeting logic
      let nearest=null,nearDist=Infinity;

      if(this.aiPersonality==='Crate Hunter'){
        // Prioritize crates if any exist
        if(crates.length>0){
          let nearestCrate=null,nearestCrateDist=Infinity;
          crates.forEach(c=>{const d=dist(this,c);if(d<nearestCrateDist){nearestCrateDist=d;nearestCrate=c;}});
          if(nearestCrate){
            // Move toward crate, not toward enemies
            nearest=nearestCrate;
            nearDist=nearestCrateDist;
          }
        }
        // If no crates, fall through to find enemies
        if(!nearest){
          fighters.forEach(f=>{if(!visibleEnemy(f))return;const d=dist(this,f);if(d<nearDist){nearDist=d;nearest=f;}});
        }
      } else if(this.aiPersonality==='Assassin'){
        // Target the enemy with lowest HP
        fighters.forEach(f=>{
          if(!visibleEnemy(f))return;
          const d=dist(this,f);
          if(nearest===null||(f.hp<nearest.hp)){
            nearest=f;nearDist=d;
          }
        });
      } else if(this.aiPersonality==='Survivor'){
        // If many fighters alive, move away; if few alive, target
        const aliveCount=fighters.filter(f=>f.alive).length;
        if(aliveCount>3){
          // Move away from nearest enemy
          let farthest=null,farthestDist=0;
          fighters.forEach(f=>{if(!visibleEnemy(f))return;const d=dist(this,f);if(d>farthestDist){farthestDist=d;farthest=f;}});
          nearest=farthest;nearDist=farthestDist;
          this.aiState='flee'; // Force flee
        } else {
          // Few fighters left, act normal
          fighters.forEach(f=>{if(!visibleEnemy(f))return;const d=dist(this,f);if(d<nearDist){nearDist=d;nearest=f;}});
        }
      } else {
        // Default: find nearest enemy (Aggro, Camper, normal)
        fighters.forEach(f=>{if(!visibleEnemy(f))return;const d=dist(this,f);if(d<nearDist){nearDist=d;nearest=f;}});
      }

      this.aiTarget=nearest;

      // Determine state based on personality
      if(this.hp<this.maxHp*0.15){
        this.aiState='flee';
      } else if(this.aiPersonality==='Aggro'){
        // Aggro: always chase if target exists
        if(nearest)this.aiState='chase';
        else this.aiState='wander';
      } else if(this.aiPersonality==='Camper'){
        // Camper: move toward edge, low aggression
        this.aiState='wander'; // Will check edge logic below
      } else if(this.aiPersonality==='Crate Hunter'){
        // If target is a crate, chase it
        if(nearest&&nearest instanceof Crate)this.aiState='chase';
        else if(nearest&&nearDist<this.range*1.0&&Math.random()<ds.aggressChance)this.aiState='chase';
        else this.aiState='wander';
      } else if(this.aiPersonality==='Assassin'){
        // Assassin: be aggressive toward low-HP targets
        if(nearest&&nearDist<this.range*1.5&&Math.random()<ds.aggressChance*1.2)this.aiState='chase';
        else this.aiState='wander';
      } else if(this.aiPersonality==='Survivor'){
        // Already handled above
        if(this.aiState!=='flee'&&nearest&&nearDist<this.range*1.0&&Math.random()<ds.aggressChance)this.aiState='chase';
        else if(this.aiState!=='flee')this.aiState='wander';
      } else {
        // Default state logic
        if(nearest&&nearDist<this.range*1.0&&Math.random()<ds.aggressChance)this.aiState='chase';
        else this.aiState='wander';
      }
    }

    // State-specific behavior with personality modifiers
    if(this.aiState==='chase'&&this.aiTarget&&this.aiTarget.alive){
      const d=dist(this,this.aiTarget);
      const aimError=(Math.random()-0.5)*ds.aimWobble;

      this.angle=Math.atan2(this.aiTarget.y-this.y,this.aiTarget.x-this.x)+aimError;

      if(this.hero.rangeType==='ranged'&&d<this.range*0.35){
        this.angle=Math.atan2(this.y-this.aiTarget.y,this.x-this.aiTarget.x);
      }

      // Range check based on personality
      let attackRange=this.range*0.85;
      let hesitation=ds.hesitation;
      if(this.aiPersonality==='Aggro'){
        attackRange=this.range*1.0; // Attack at full range
        hesitation=ds.hesitation*2; // More likely to attack (inverse logic: lower hesitation = more attacks)
      } else if(this.aiPersonality==='Camper'){
        attackRange=this.range*0.6; // Only attack when very close
        hesitation=ds.hesitation*0.5; // Less likely to attack
      } else if(this.aiPersonality==='Crate Hunter'){
        if(this.aiTarget instanceof Crate){
          attackRange=this.range; // Attack crates normally
        } else {
          attackRange=this.range*0.4; // Only self-defense
        }
      } else if(this.aiPersonality==='Assassin'){
        attackRange=this.range*0.9;
        hesitation=ds.hesitation*1.5; // More likely to attack
        // Assassin: first attack deals 20% bonus (mark with flag)
        if(!this.assassinFirstAttack){
          this.assassinFirstAttack=true;
        }
        // Try to approach from behind (opposite side of enemy facing)
        const behindAngle=this.aiTarget.facingLeft?0:Math.PI;
        this.angle=behindAngle+aimError;
      } else if(this.aiPersonality==='Survivor'){
        attackRange=this.range*0.85;
        hesitation=ds.hesitation;
      }

      if(d<attackRange&&this.attackCooldown<=0&&Math.random()<hesitation){
        this.angle=Math.atan2(this.aiTarget.y-this.y,this.aiTarget.x-this.x)+aimError*0.5;
        if(this.superCharge>=this.superMax&&Math.random()<ds.superChance)this.doAttack(true);
        else this.doAttack(false);
      }

      // Personality: Dash usage
      if(this.aiPersonality==='Aggro'&&this.dashCooldown<=0&&this.dashTimer<=0&&d>this.range*0.5&&Math.random()<0.008){
        // Aggro uses dash to close distance
        const ddx=Math.cos(this.angle),ddy=Math.sin(this.angle);
        this.startDash(ddx,ddy);
      }
    } else if(this.aiState==='flee'&&this.aiTarget){
      this.angle=Math.atan2(this.y-this.aiTarget.y,this.x-this.aiTarget.x);
    } else {
      // Wander state with personality modifiers
      this.wanderAngle+=(Math.random()-0.5)*1.2;this.angle=this.wanderAngle;
      const toC=Math.atan2(arenaCenterY-this.y,arenaCenterX-this.x);

      if(this.aiPersonality==='Camper'){
        // Move toward edges, away from center
        this.angle=toC+Math.PI+(Math.random()-0.5)*0.8; // Opposite direction, away from center
      } else if(dist(this,{x:arenaCenterX,y:arenaCenterY})>arenaRadius*0.55){
        this.angle=toC+(Math.random()-0.5)*0.5;
      }
    }
  }

  doAttack(isSuper) {
    this.attackAnim=isSuper?20:12;
    this.bushRevealTimer=isSuper?120:90;
    const dmgMult=this.doubleDmg?2:1;
    if(isSuper){
      soundManager.playSound('superFire', this.isPlayer?1:0.45);
    } else if(this.hero.rangeType==='ranged'){
      soundManager.playSound('rangedShot', this.isPlayer?0.8:0.32);
    } else {
      soundManager.playSound('attackSwing', this.isPlayer?0.85:0.34);
    }
    // Assassin first attack bonus
    const assassinBonus=(this.aiPersonality==='Assassin'&&this.assassinFirstAttack)?1.2:1;
    if(this.aiPersonality==='Assassin'&&this.assassinFirstAttack){
      this.assassinFirstAttack=false;
    }
    if(isSuper){
      this.superCharge=0;
      if(this.isPlayer)matchStats.supersUsed++;
      // Super activation: screen flash + slow-mo
      slowMoTimer=20;slowMoRate=0.4;
      shakeX=(Math.random()-0.5)*12;shakeY=(Math.random()-0.5)*12;
      if(this.hero.rangeType==='ranged'){
        for(let i=-3;i<=3;i++){
          const a=this.angle+i*0.18;
          projectiles.push(new Projectile(this,this.x,this.y,a,this.hero.projectileSpeed*1.2,(this.hero.superDamage/3)*dmgMult,this.hero.color,this.hero.superRange,true));
        }
      } else {
        for(let i=0;i<30;i++){const a=(Math.PI*2/30)*i;particles.push({x:this.x,y:this.y,vx:Math.cos(a)*(3+Math.random()*4),vy:Math.sin(a)*(3+Math.random()*4),life:30+Math.random()*20,color:this.hero.color,size:4+Math.random()*4});}
        fighters.forEach(f=>{
          if(f===this||!f.alive)return;
          if(dist(this,f)<this.hero.superRange){
            if(f.shieldActive){damageNumbers.push({x:f.x,y:f.y-30,text:'BLOCKED!',life:35,color:'#00ffff'});return;}
            const dmg=Math.max(3,(this.hero.superDamage*dmgMult*assassinBonus)-f.defense*0.5);
            f.takeDamage(dmg,this);
            const a=Math.atan2(f.y-this.y,f.x-this.x);f.knockbackX=Math.cos(a)*8;f.knockbackY=Math.sin(a)*8;
          }
        });
        crates.forEach(c=>{if(!c.alive)return;if(dist(this,c)<this.hero.superRange)c.takeDamage(this.hero.superDamage*dmgMult,this);});
      }
      // Hero-specific super burst particles
      const heroColors={blazeKnight:['#ff4400','#ffaa00','#ff6600'],frostbyte:['#00ccff','#aaeeff','#0066ff'],zapWizard:['#9900ff','#cc66ff','#ff00ff'],shadowNinja:['#333','#666','#999'],captainCosmos:['#ff0066','#ff6699','#ffaacc'],rexTitan:['#44ff44','#88ff88','#00cc00'],banitsa:['#e8c35a','#d4a43a','#f5e6b8'],lebronJames:['#fdb927','#552583','#ffffff']};
      const sc=heroColors[this.hero.sprite]||[this.hero.color,'#fff','#aaa'];
      for(let i=0;i<24;i++){const a=(Math.PI*2/24)*i;const spd=4+Math.random()*5;particles.push({x:this.x+Math.cos(a)*22,y:this.y+Math.sin(a)*22,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,life:25+Math.random()*15,color:sc[i%sc.length],size:3+Math.random()*4});}
      for(let i=0;i<16;i++){const a=(Math.PI*2/16)*i;particles.push({x:this.x+Math.cos(a)*22,y:this.y+Math.sin(a)*22,vx:Math.cos(a)*2,vy:Math.sin(a)*2,life:20,color:this.hero.color,size:3});}
    } else {
      const cdMult=this.isPlayer?1:getDiffSettings().cooldownMult;
      this.attackCooldown=this.isPlayer?(this.hero.rangeType==='ranged'?20:14):Math.round((this.hero.rangeType==='ranged'?38:28)*cdMult);
      if(this.hero.rangeType==='ranged'){
        projectiles.push(new Projectile(this,this.x,this.y,this.angle,this.hero.projectileSpeed,this.attack*dmgMult*assassinBonus,this.hero.projectileColor,this.range,false));
        for(let i=0;i<3;i++)particles.push({x:this.x+Math.cos(this.angle)*16,y:this.y+Math.sin(this.angle)*16,vx:Math.cos(this.angle)*2+(Math.random()-0.5)*2,vy:Math.sin(this.angle)*2+(Math.random()-0.5)*2,life:8,color:this.hero.projectileColor,size:2});
      } else {
        let landedHit=false;
        for(let i=0;i<6;i++)particles.push({x:this.x+Math.cos(this.angle)*22,y:this.y+Math.sin(this.angle)*22,vx:Math.cos(this.angle)*(2+Math.random()*3)+(Math.random()-0.5)*2,vy:Math.sin(this.angle)*(2+Math.random()*3)+(Math.random()-0.5)*2,life:12+Math.random()*10,color:this.hero.color,size:2+Math.random()*3});
        fighters.forEach(f=>{
          if(f===this||!f.alive)return;
          const d=dist(this,f);
          if(d<this.range){
            const aT=Math.atan2(f.y-this.y,f.x-this.x);
            if(Math.abs(normalizeAngle(aT-this.angle))<Math.PI*0.6){
              if(f.shieldActive){soundManager.playSound('blocked', this.isPlayer?0.75:0.32);damageNumbers.push({x:f.x,y:f.y-30,text:'BLOCKED!',life:35,color:'#00ffff'});for(let i=0;i<5;i++)particles.push({x:f.x+(Math.random()-0.5)*20,y:f.y+(Math.random()-0.5)*20,vx:(Math.random()-0.5)*3,vy:(Math.random()-0.5)*3,life:12,color:'#00ffff',size:2});return;}
              const dmg=Math.max(2,(this.attack*dmgMult*assassinBonus)-f.defense*0.3);
              landedHit=true;
              f.takeDamage(dmg,this);
              const a=Math.atan2(f.y-this.y,f.x-this.x);f.knockbackX+=Math.cos(a)*4;f.knockbackY+=Math.sin(a)*4;
            }
          }
        });
        if(landedHit) soundManager.playSound('attackHit', this.isPlayer?0.8:0.34);
        // Melee hits crates too
        crates.forEach(c=>{
          if(!c.alive)return;
          const d=dist(this,c);
          if(d<this.range+10){
            const aT=Math.atan2(c.y-this.y,c.x-this.x);
            if(Math.abs(normalizeAngle(aT-this.angle))<Math.PI*0.6){
              c.takeDamage(this.attack,this);
            }
          }
        });
      }
    }
  }

  takeDamage(dmg,attacker) {
    if(this.shieldActive&&dmg>1){
      // Shield blocks the hit
      soundManager.playSound('blocked', this.isPlayer?0.75:0.3);
      damageNumbers.push({x:this.x+(Math.random()-0.5)*20,y:this.y-30,text:'BLOCKED!',life:35,color:'#00ffff'});
      for(let i=0;i<4;i++)particles.push({x:this.x+(Math.random()-0.5)*20,y:this.y+(Math.random()-0.5)*20,vx:(Math.random()-0.5)*3,vy:(Math.random()-0.5)*3,life:10,color:'#00ffff',size:2});
      return;
    }
    this.hp-=dmg;this.hitFlash=8;this.combatTimer=0;this.bushRevealTimer=90;
    if(this.isPlayer)matchStats.damageTaken+=dmg;
    if(attacker&&attacker.isPlayer)matchStats.damageDone+=dmg;
    this.superCharge=Math.min(this.superMax,this.superCharge+dmg*0.35);
    if(dmg>=5)damageNumbers.push({x:this.x+(Math.random()-0.5)*20,y:this.y-28,text:Math.round(dmg).toString(),life:40,color:'#ff4444'});
    if(this.hp<=0){
      this.hp=0;this.alive=false;
      soundManager.playSound('death', attacker&&attacker.isPlayer?0.95:0.42);
      for(let i=0;i<25;i++)particles.push({x:this.x,y:this.y,vx:(Math.random()-0.5)*7,vy:(Math.random()-0.5)*7,life:35+Math.random()*30,color:this.hero.color,size:3+Math.random()*5});
      for(let i=0;i<8;i++)particles.push({x:this.x,y:this.y,vx:(Math.random()-0.5)*4,vy:-2-Math.random()*3,life:40,color:'#fff',size:2});
      const kn=attacker?attacker.hero.name:"The Storm";
      killfeed.unshift({killer:kn,victim:this.hero.name,time:200});
      if(killfeed.length>5)killfeed.pop();
      // Kill streak tracking for player
      if(attacker&&attacker.isPlayer){
        matchStats.kills++;
        killStreakCount++;killStreakTimer=180; // 3 seconds to chain
        if(killStreakCount===2){killStreakText='💥 DOUBLE KILL!';killStreakFlash=120;}
        else if(killStreakCount===3){killStreakText='🔥 TRIPLE KILL!';killStreakFlash=150;}
        else if(killStreakCount===4){killStreakText='⚡ MEGA KILL!';killStreakFlash=180;}
        else if(killStreakCount>=5){killStreakText='☠️ UNSTOPPABLE!';killStreakFlash=200;}
        if(killStreakCount>=2) soundManager.playSound('killStreak', 0.9);
      }
    }
  }

  draw() {
    if(!this.alive)return;
    const scale=3,sprW=SW*scale,sprH=SH*scale;

    // Shadow
    ctx.fillStyle='rgba(0,0,0,0.3)';
    ctx.beginPath();ctx.ellipse(this.x,this.y+sprH/2-6,14,5,0,0,Math.PI*2);ctx.fill();

    // Colored aura beneath fighter
    ctx.fillStyle=this.hero.color+'15';
    ctx.beginPath();ctx.arc(this.x,this.y+5,20,0,Math.PI*2);ctx.fill();

    // Shield bubble - BIG and obvious
    if(this.shieldActive){
      const pulse=1+Math.sin(frameCount*0.2)*0.1;
      const shieldR=34*pulse;
      const remaining=this.shieldTimer/300;

      // Outer glow ring (thick, bright)
      ctx.strokeStyle=`rgba(0,255,255,${0.6+Math.sin(frameCount*0.12)*0.2})`;
      ctx.lineWidth=5;
      ctx.beginPath();ctx.arc(this.x,this.y,shieldR,0,Math.PI*2);ctx.stroke();

      // Second ring slightly larger
      ctx.strokeStyle=`rgba(0,200,255,${0.25+Math.sin(frameCount*0.15)*0.1})`;
      ctx.lineWidth=2;
      ctx.beginPath();ctx.arc(this.x,this.y,shieldR+5,0,Math.PI*2);ctx.stroke();

      // Inner fill - translucent blue dome
      ctx.fillStyle=`rgba(0,255,255,${0.12+Math.sin(frameCount*0.1)*0.05})`;
      ctx.beginPath();ctx.arc(this.x,this.y,shieldR-2,0,Math.PI*2);ctx.fill();

      // Rotating hex pattern inside shield
      for(let i=0;i<6;i++){
        const a=(Math.PI*2/6)*i+frameCount*0.03;
        const hx=this.x+Math.cos(a)*(shieldR*0.6);
        const hy=this.y+Math.sin(a)*(shieldR*0.6);
        ctx.fillStyle=`rgba(0,255,255,${0.15+Math.sin(frameCount*0.2+i)*0.1})`;
        ctx.fillRect(hx-2,hy-2,4,4);
      }

      // "SHIELD" text above
      ctx.fillStyle='#00ffff';ctx.font='bold 10px Arial';ctx.textAlign='center';
      ctx.fillText('🛡️ SHIELD',this.x,this.y-shieldR-6);

      // Timer bar under shield (chunky and visible)
      const barW=34,barX=this.x-barW/2,barY=this.y+sprH/2;
      ctx.fillStyle='rgba(0,0,0,0.6)';ctx.fillRect(barX,barY,barW,5);
      // Color shifts from cyan to yellow to red as it depletes
      const timerCol=remaining>0.5?'#00ffff':(remaining>0.25?'#ffee00':'#ff4444');
      ctx.fillStyle=timerCol;ctx.fillRect(barX,barY,barW*remaining,5);
      ctx.strokeStyle='#00aaaa';ctx.lineWidth=1;ctx.strokeRect(barX,barY,barW,5);
      ctx.textAlign='left';
    }

    // Hero glow outline - colored aura behind sprite
    const glowAlpha=this.isPlayer?0.35:0.25;
    ctx.globalAlpha=glowAlpha;
    ctx.fillStyle=this.hero.color;
    ctx.beginPath();ctx.arc(this.x,this.y,sprW/2+8,0,Math.PI*2);ctx.fill();
    // Slightly dimmer glow layer
    ctx.globalAlpha=glowAlpha*0.4;
    ctx.fillStyle=this.hero.color;
    ctx.beginPath();ctx.arc(this.x,this.y,sprW/2+14,0,Math.PI*2);ctx.fill();
    ctx.globalAlpha=1;

    // Hit flash
    if(this.hitFlash>0&&this.hitFlash%2===0)ctx.globalAlpha=0.5;
    const frame=this.moving&&this.animFrame===1?'walk':'idle';
    drawSprite(ctx,this.hero.sprite,frame,this.x-sprW/2,this.y-sprH/2,scale,this.facingLeft);
    ctx.globalAlpha=1;

    // Melee slash effect during attack animation
    if(this.attackAnim>0&&this.hero.rangeType==='melee'){
      const slashAlpha=(this.attackAnim/20)*0.6;
      ctx.globalAlpha=slashAlpha;
      ctx.strokeStyle=this.hero.color;
      ctx.lineWidth=4;
      const arcRadius=this.range*0.9;
      const slashAngle=this.angle+Math.sin((20-this.attackAnim)*0.15)*1.2;
      ctx.beginPath();
      ctx.arc(this.x,this.y,arcRadius,slashAngle-0.6,slashAngle+0.6);
      ctx.stroke();
      ctx.globalAlpha=1;
    }

    // Attack cooldown ring - subtle circular progress indicator
    if(this.isPlayer&&this.attackCooldown>0){
      const cooldownMax=this.hero.rangeType==='ranged'?20:14;
      const cooldownPct=Math.max(0,this.attackCooldown/cooldownMax);
      const ringRadius=28;
      ctx.globalAlpha=0.6;
      ctx.strokeStyle=`rgba(255,100,100,0.8)`;
      ctx.lineWidth=2;
      ctx.beginPath();
      ctx.arc(this.x,this.y,ringRadius,Math.PI*1.5,Math.PI*1.5+Math.PI*2*cooldownPct);
      ctx.stroke();
      ctx.globalAlpha=1;
    } else if(this.isPlayer&&this.attackCooldown<=0){
      // Ready to attack - bright ring
      const ringRadius=28;
      ctx.globalAlpha=0.7;
      ctx.strokeStyle='#00ff00';
      ctx.lineWidth=2;
      ctx.beginPath();
      ctx.arc(this.x,this.y,ringRadius,0,Math.PI*2);
      ctx.stroke();
      ctx.globalAlpha=1;
    }

    // Buff visual effects
    if(this.doubleDmg){
      // Pulsing red/purple glow ring around fighter
      const pulse=Math.sin(frameCount*0.15)*0.3+0.6;
      ctx.strokeStyle=`rgba(255,100,200,${pulse})`;
      ctx.lineWidth=3;
      ctx.beginPath();ctx.arc(this.x,this.y,35+Math.sin(frameCount*0.08)*3,0,Math.PI*2);ctx.stroke();
    }
    if(this.speedBuffTimer>0){
      // Dash lines trailing behind
      const dashCount=4;
      for(let i=0;i<dashCount;i++){
        const offset=i*4;
        const trailAlpha=1-(i/dashCount);
        ctx.globalAlpha=trailAlpha*0.6;
        ctx.strokeStyle='#ffff00';
        ctx.lineWidth=2;
        ctx.beginPath();
        ctx.moveTo(this.x-Math.cos(this.angle)*(10+offset),this.y-Math.sin(this.angle)*(10+offset));
        ctx.lineTo(this.x-Math.cos(this.angle)*(18+offset),this.y-Math.sin(this.angle)*(18+offset));
        ctx.stroke();
      }
      ctx.globalAlpha=1;
    }

    // Player indicator
    if(this.isPlayer){
      ctx.strokeStyle='#0ff';ctx.lineWidth=2;
      ctx.setLineDash([4,4]);ctx.lineDashOffset=-frameCount*0.3;
      ctx.beginPath();ctx.arc(this.x,this.y,26,0,Math.PI*2);ctx.stroke();
      ctx.setLineDash([]);
      // Direction arrow
      ctx.fillStyle='#0ff';
      const ax=this.x+Math.cos(this.angle)*30,ay=this.y+Math.sin(this.angle)*30;
      ctx.beginPath();
      ctx.moveTo(ax,ay);
      ctx.lineTo(ax-Math.cos(this.angle-0.4)*8,ay-Math.sin(this.angle-0.4)*8);
      ctx.lineTo(ax-Math.cos(this.angle+0.4)*8,ay-Math.sin(this.angle+0.4)*8);
      ctx.closePath();ctx.fill();
    }

    // Melee attack arc
    if(this.attackAnim>0&&this.hero.rangeType==='melee'){
      ctx.strokeStyle=this.hero.color;ctx.lineWidth=3;
      ctx.globalAlpha=this.attackAnim/20;
      const sw=this.angle+Math.sin(this.attackAnim*0.5)*1.5;
      ctx.beginPath();ctx.arc(this.x,this.y,this.range*0.8,sw-0.8,sw+0.8);ctx.stroke();
      ctx.globalAlpha=1;
    }

    // HP bar
    const barW=40,barH=6;
    const barX=this.x-barW/2,barY=this.y-sprH/2-12;
    ctx.fillStyle='rgba(20,24,18,0.9)';
    ctx.beginPath();ctx.roundRect(barX,barY,barW,barH,3);ctx.fill();
    const hp=this.hp/this.maxHp;
    const hpWidth=Math.max(0,barW*hp);
    ctx.fillStyle=hp>0.5?'#44ff44':hp>0.25?'#ffaa00':'#ff3333';
    if(hpWidth>0){ctx.beginPath();ctx.roundRect(barX,barY,hpWidth,barH,Math.min(3,hpWidth/2));ctx.fill();}
    // HP segments (every 100hp)
    ctx.fillStyle='rgba(0,0,0,0.3)';
    const segSize = 100 / this.maxHp * barW;
    for(let s=segSize;s<barW;s+=segSize){ctx.fillRect(barX+s,barY,1,barH);}
    ctx.strokeStyle='rgba(255,255,255,0.28)';ctx.lineWidth=1;
    ctx.beginPath();ctx.roundRect(barX,barY,barW,barH,3);ctx.stroke();

    // Healing indicator
    if(this.combatTimer>180&&this.hp<this.maxHp){
      // Pulsing green glow around HP bar
      const glow=Math.sin(frameCount*0.2)*0.3+0.5;
      ctx.strokeStyle=`rgba(68,255,68,${glow})`;ctx.lineWidth=2;
      ctx.strokeRect(barX-1,barY-1,barW+2,barH+2);
      // Green + symbol
      ctx.fillStyle=`rgba(68,255,68,${glow+0.3})`;ctx.font='bold 11px Arial';ctx.textAlign='right';
      ctx.fillText('+',barX-3,barY+5);
      ctx.textAlign='left';
    }

    // Name
    ctx.fillStyle=this.isPlayer?'#9ff6ff':'#fff4bf';ctx.font='900 10px Trebuchet MS';ctx.textAlign='center';
    ctx.fillText(this.hero.name,this.x,barY-3);

    // Shield charges (dots under name for player)
    if(this.isPlayer){
      const sY=barY+barH+2;
      const superWidth=Math.max(0,barW*(this.superCharge/this.superMax));
      ctx.fillStyle='rgba(20,24,18,0.9)';ctx.beginPath();ctx.roundRect(barX,sY,barW,4,2);ctx.fill();
      ctx.fillStyle=this.superCharge>=this.superMax?'#ffee00':'#ff8800';
      if(superWidth>0){ctx.beginPath();ctx.roundRect(barX,sY,superWidth,4,Math.min(2,superWidth/2));ctx.fill();}
    }
  }
}

// ========== UTILITIES ==========
function dist(a,b){return Math.sqrt((a.x-b.x)**2+(a.y-b.y)**2);}
function normalizeAngle(a){while(a>Math.PI)a-=Math.PI*2;while(a<-Math.PI)a+=Math.PI*2;return a;}

function getBushForEntity(entity) {
  for (const tree of trees) {
    if (dist(entity, tree) < tree.radius + 10) return tree;
  }
  return null;
}

function canObserverSeeFighter(observer, fighter) {
  if (!fighter || !fighter.alive) return false;
  if (spectating || !observer || !observer.alive || observer === fighter) return true;
  if (fighter.bushRevealTimer > 0) return true;
  const bush = getBushForEntity(fighter);
  if (!bush) return true;
  const observerBush = getBushForEntity(observer);
  if (observerBush === bush) return true;
  return dist(observer, bush) < bush.radius + 72;
}

function drawBushRustle(fighter) {
  const sway = Math.sin(frameCount * 0.16 + fighter.x * 0.05) * 4;
  ctx.globalAlpha = 0.8;
  ctx.fillStyle = 'rgba(188,255,116,0.85)';
  for (let i = 0; i < 3; i++) {
    const angle = frameCount * 0.08 + i * (Math.PI * 0.66);
    const px = fighter.x + Math.cos(angle) * 9 + sway * 0.4;
    const py = fighter.y - 10 + Math.sin(angle) * 5;
    ctx.beginPath();
    ctx.ellipse(px, py, 4, 7, angle, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// ========== START GAME ==========
function startNextRound() {
  // Reset arena for next round while preserving round state
  initSound();
  soundManager.setMusicMode('countdown');
  dropPhase=true;
  dropTimer=60;
  dropDelay=0;
  spectating=false;
  fighters=[];projectiles=[];particles=[];damageNumbers=[];killfeed=[];powerups=[];ambientParticles=[];
  arenaRadius=currentMap.size.radius;arenaCenterX=currentMap.size.centerX;arenaCenterY=currentMap.size.centerY;frameCount=0;shrinkTimer=0;
  terrainSeeds=null;
  confetti=[];confettiActive=false;
  matchStartTime=Date.now();matchEndTime=0;matchTimerRunning=true;
  killStreakCount=0;killStreakTimer=0;killStreakFlash=0;slowMoTimer=0;slowMoRate=1;
  matchStats={kills:0,damageDone:0,damageTaken:0,cratesSmashed:0,powerupsCollected:0,shieldsUsed:0,supersUsed:0,dashesUsed:0,xpEarned:0};

  spawnTrees();spawnCrates();spawnHazards();spawnWeather();
  const used=[selectedHero];
  while(used.length<10)used.push(Math.floor(Math.random()*HEROES.length));
  for(let i=0;i<10;i++){
    const spawn=currentMap.spawnPoints[i % currentMap.spawnPoints.length];
    fighters.push(new Fighter(HEROES[used[i]],spawn.x,spawn.y,i===0));
  }
  playerIndex=0;
  countdownTimer=180;
  countdownActive=true;
  requestAnimationFrame(gameLoop);
}

function startGame() {
  if(selectedHero<0)return;
  // Init sound on any device (must happen on user gesture)
  initSound();
  soundManager.playSound('uiConfirm', 0.85);
  soundManager.setMusicMode('countdown');
  if(isMobile) { tryFullscreen(); }
  document.getElementById('char-select').style.display='none';
  if(isMobile) document.getElementById('touch-controls').classList.add('active');
  document.getElementById('spectator-bar').style.display='none';
  gameRunning=true;spectating=false;
  gameRunning=false;
  dropPhase=true;
  dropTimer=60;
  dropDelay=0;spectating=false;playerDeathPlace=0;
  fighters=[];projectiles=[];particles=[];damageNumbers=[];killfeed=[];powerups=[];ambientParticles=[];
  arenaRadius=currentMap.size.radius;arenaCenterX=currentMap.size.centerX;arenaCenterY=currentMap.size.centerY;frameCount=0;shrinkTimer=0;
  terrainSeeds=null;
  confetti=[];confettiActive=false;
  matchStartTime=Date.now();matchEndTime=0;matchTimerRunning=true;
  killStreakCount=0;killStreakTimer=0;killStreakFlash=0;slowMoTimer=0;slowMoRate=1;
  matchStats={kills:0,damageDone:0,damageTaken:0,cratesSmashed:0,powerupsCollected:0,shieldsUsed:0,supersUsed:0,dashesUsed:0,xpEarned:0};

  // Initialize round system
  roundMode=true;
  currentRound=1;
  seriesScore={player:0,ai:0};
  roundEndScreen=false;

  spawnTrees();spawnCrates();spawnHazards();spawnWeather();
  const used=[selectedHero];
  while(used.length<10)used.push(Math.floor(Math.random()*HEROES.length));
  for(let i=0;i<10;i++){
    const spawn=currentMap.spawnPoints[i % currentMap.spawnPoints.length];
    fighters.push(new Fighter(HEROES[used[i]],spawn.x,spawn.y,i===0));
  }
  playerIndex=0;
  // Start countdown before game begins
  countdownTimer = 180; // 3 seconds at 60fps
  countdownActive = true;
  requestAnimationFrame(gameLoop);
}

// ========== AMBIENT PARTICLES SYSTEM ==========
function updateAmbientParticles(){
  // Maintain ~30 floating ambient particles
  while(ambientParticles.length<30){
    const angle=Math.random()*Math.PI*2;
    const distance=Math.random()*arenaRadius*0.8;
    const x=arenaCenterX+Math.cos(angle)*distance;
    const y=arenaCenterY+Math.sin(angle)*distance;
    const isFirefly=Math.random()>0.4;
    const colors=['#88ff88','#ffee88','#aaffaa'];
    ambientParticles.push({
      x:x,y:y,
      vx:(Math.random()-0.5)*0.6,vy:(Math.random()-0.5)*0.6,
      life:600+Math.random()*300,maxLife:600+Math.random()*300,
      size:1+Math.random()*2,
      color:colors[Math.floor(Math.random()*colors.length)],
      type:isFirefly?'firefly':'dust'
    });
  }
  // Update ambient particles
  ambientParticles.forEach(ap=>{
    if(ap.type==='firefly'){
      // Fireflies move slowly in random patterns
      ap.vx+=(Math.random()-0.5)*0.15;
      ap.vy+=(Math.random()-0.5)*0.15;
      ap.vx=Math.max(-0.8,Math.min(0.8,ap.vx));
      ap.vy=Math.max(-0.8,Math.min(0.8,ap.vy));
    } else {
      // Dust motes drift upward
      ap.vy=-0.3;
      ap.vx+=(Math.random()-0.5)*0.1;
    }
    ap.x+=ap.vx;
    ap.y+=ap.vy;
    ap.life--;
    // Gentle bounce at arena edges
    const dist=Math.sqrt((ap.x-arenaCenterX)**2+(ap.y-arenaCenterY)**2);
    if(dist>arenaRadius*0.95){
      const ang=Math.atan2(ap.y-arenaCenterY,ap.x-arenaCenterX);
      ap.x=arenaCenterX+Math.cos(ang)*(arenaRadius*0.93);
      ap.y=arenaCenterY+Math.sin(ang)*(arenaRadius*0.93);
      ap.vx*=-0.5;ap.vy*=-0.5;
    }
  });
  ambientParticles=ambientParticles.filter(ap=>ap.life>0);
}

// ========== CONFETTI SYSTEM ==========
function spawnConfetti() {
  confetti=[];confettiActive=true;
  const colors=['#ffd700','#e94560','#0ff','#44ff44','#ff6600','#ff44ff','#4488ff','#ffee00'];
  for(let i=0;i<200;i++){
    confetti.push({
      x:Math.random()*canvas.width,
      y:-Math.random()*400-20,
      w:4+Math.random()*6,
      h:6+Math.random()*10,
      color:colors[Math.floor(Math.random()*colors.length)],
      vx:(Math.random()-0.5)*2,
      vy:1.5+Math.random()*3,
      rot:Math.random()*Math.PI*2,
      rotSpeed:(Math.random()-0.5)*0.15,
      wobble:Math.random()*Math.PI*2,
      wobbleSpeed:0.02+Math.random()*0.04,
      life:300+Math.random()*200
    });
  }
}
function updateConfetti(){
  if(!confettiActive)return;
  confetti.forEach(c=>{
    c.x+=c.vx+Math.sin(c.wobble)*0.8;
    c.y+=c.vy;
    c.rot+=c.rotSpeed;
    c.wobble+=c.wobbleSpeed;
    c.life--;
  });
  confetti=confetti.filter(c=>c.life>0&&c.y<canvas.height+50);
  if(confetti.length===0)confettiActive=false;
}
function drawConfetti(){
  if(!confettiActive)return;
  confetti.forEach(c=>{
    ctx.save();
    ctx.globalAlpha=Math.min(1,c.life/60);
    ctx.translate(c.x,c.y);
    ctx.rotate(c.rot);
    ctx.fillStyle=c.color;
    ctx.fillRect(-c.w/2,-c.h/2,c.w,c.h);
    ctx.restore();
  });
  ctx.globalAlpha=1;
}

// ========== MATCH TIMER ==========
function getMatchTime(){
  const end=matchTimerRunning?Date.now():matchEndTime;
  const elapsed=Math.floor((end-matchStartTime)/1000);
  const mins=Math.floor(elapsed/60);
  const secs=elapsed%60;
  return `${mins}:${secs<10?'0':''}${secs}`;
}

// ========== GAME LOOP ==========
function gameLoop() {
  // Handle drop phase
  if (dropPhase) {
    dropTimer--;
    if (dropTimer <= 0) {
      dropDelay++;
      if (dropDelay <= fighters.length) {
        const f = fighters[dropDelay - 1];
        if (f) {
          f.dropPhase = false;
        }
      }
      if (dropDelay > fighters.length + 30) {
        dropPhase = false;
        if (countdownActive) {
          // Don't start game yet — countdown will handle it
        } else {
          gameRunning = true;
        }
      }
    }
  }

    // Countdown between drop phase and gameplay
    if (countdownActive && !dropPhase) {
      if (countdownTimer > 0 && countdownTimer % 60 === 0) {
        soundManager.playSound('countdownTick', 0.9);
      }
      countdownTimer--;
      if (countdownTimer <= 0) {
        countdownActive = false;
        gameRunning = true;
        soundManager.playSound('countdownGo', 1);
        soundManager.setMusicMode('battle');
      }
    }
    if(!gameRunning){updateConfetti();draw();requestAnimationFrame(gameLoop);return;}
  // Slow-mo effect
  if(slowMoTimer>0){slowMoTimer--;if(slowMoTimer<=0)slowMoRate=1;}
  // Kill streak timer
  if(killStreakTimer>0){killStreakTimer--;if(killStreakTimer<=0)killStreakCount=0;}
  if(killStreakFlash>0)killStreakFlash--;
  frameCount++;shrinkTimer++;
  if(shrinkTimer>900&&arenaRadius>150)arenaRadius-=0.025;
  fighters.forEach(f=>f.update());
  projectiles.forEach(p=>p.update());
  projectiles=projectiles.filter(p=>p.alive);
  powerups.forEach(p=>p.update());
  powerups=powerups.filter(p=>p.alive);
  crates=crates.filter(c=>c.alive);
  particles=particles.filter(p=>{p.x+=p.vx;p.y+=p.vy;p.vx*=0.95;p.vy*=0.95;p.life--;return p.life>0;});
  damageNumbers=damageNumbers.filter(d=>{d.y-=0.8;d.life--;return d.life>0;});
  killfeed.forEach(k=>k.time--);killfeed=killfeed.filter(k=>k.time>0);
    // Captain Cosmos gravity well effect
  fighters.forEach(f => {
    if (!f.alive || f.hero.passive !== "Gravity Well") return;
    fighters.forEach(f2 => {
      if (f2 === f || !f2.alive) return;
      const d = dist(f, f2);
      if (d < 100) {
        const angle = Math.atan2(f.y - f2.y, f.x - f2.x);
        f2.knockbackX += Math.cos(angle) * 1;
        f2.knockbackY += Math.sin(angle) * 1;
      }
    });
  });
  
  updateAmbientParticles();
  hazards.forEach(h => {
    if (h.update) h.update();
  });
  if (currentWeather && currentWeather.update) {
    currentWeather.update();
  }
  hazards = hazards.filter(h => h.alive !== false);
  shakeX*=0.85;shakeY*=0.85;

  const alive=fighters.filter(f=>f.alive).length;
    // Update camera zoom (mobile starts wider to show full arena)
    const mobileScale = isMobile ? 0.8 : 1.0;
    if (alive <= 3 && alive > 0) {
      if (alive === 3) cameraTargetZoom = 1.3 * mobileScale;
      else if (alive === 2) cameraTargetZoom = 1.5 * mobileScale;
      else cameraTargetZoom = 1.8 * mobileScale;
    } else {
      cameraTargetZoom = 1.0 * mobileScale;
    }
    cameraZoom += (cameraTargetZoom - cameraZoom) * 0.05;
    
    // Pan camera to center on remaining fighters
    if (alive > 0) {
      let cx = 0, cy = 0, count = 0;
      for (let f of fighters) {
        if (f.alive) {
          cx += f.x;
          cy += f.y;
          count++;
        }
      }
      if (count > 0) {
        cameraX += (cx / count - cameraX) * 0.08;
        cameraY += (cy / count - cameraY) * 0.08;
      }
    }
    
  const pAlive=fighters[playerIndex].alive;

  // Player just died - enter spectator mode
  if(!pAlive&&!spectating){
    spectating=true;
    playerDeathPlace=alive+1; // they died when 'alive' others remain
    document.getElementById('spectator-bar').style.display='block';
    document.getElementById('spec-place').textContent=`#${playerDeathPlace} of 10`;
  }

  // Match truly over (1 or 0 fighters left)
  if(alive<=1){
    calculateXPReward();

    gameRunning=false;
    matchTimerRunning=false;matchEndTime=Date.now();
    const finalTime=getMatchTime();
    document.getElementById('spectator-bar').style.display='none';
    const playerWon=pAlive&&alive===1;

    // ROUNDS SYSTEM: Check if we're in round mode
    if(roundMode&&!roundEndScreen){
      if(playerWon){
        seriesScore.player++;
      } else {
        seriesScore.ai++;
      }

      // Check if series is over (someone has 2 wins)
      if(seriesScore.player>=2||seriesScore.ai>=2){
        roundEndScreen=true;
        soundManager.playSound(seriesScore.player>=2?'victory':'defeat', 1);
        soundManager.setMusicMode(seriesScore.player>=2?'victory':'defeat');
        // Series is over, show final game-over screen
        const gd=document.getElementById('game-over'),gt=document.getElementById('go-title'),gx=document.getElementById('go-text');
        if(seriesScore.player>=2){
          gt.textContent='🏆 SERIES WON! 🏆';gt.style.color='#ffd700';
          gx.innerHTML=`You won the best-of-3 series!<br><span class="result-highlight">Final Score: ${seriesScore.player} - ${seriesScore.ai}</span><br><span class="result-subtle">Match Time: ${finalTime}</span>`;
          spawnConfetti();
          document.getElementById('lb-entry').style.display='block';
          document.getElementById('lb-name').value='';
          document.getElementById('lb-name').focus();
        } else {
          gt.textContent='💀 SERIES LOST 💀';gt.style.color='#e94560';
          gx.innerHTML=`AI won the best-of-3 series!<br><span class="result-highlight">Final Score: ${seriesScore.player} - ${seriesScore.ai}</span><br><span class="result-subtle">Total Time: ${finalTime}</span>`;
          document.getElementById('lb-entry').style.display='none';
        }
        showMatchStats();
        const el=document.getElementById('match-stats');
        const xpHtml=`<div class="xp-summary">
          <strong>Level ${getLevelFromXP(playerXP+matchStats.xpEarned)} · +${matchStats.xpEarned} XP</strong>
          <span>Total XP: ${playerXP+matchStats.xpEarned} / ${getXPForNextLevel(getLevelFromXP(playerXP+matchStats.xpEarned)+1)}</span>
        </div>`;
        el.innerHTML+=xpHtml;
        showLeaderboard();
        if(isMobile) document.getElementById('touch-controls').classList.remove('active');
        gd.style.display='block';
      } else {
        // Series not over, show round-end overlay and auto-start next round
        const winner=playerWon?fighters[playerIndex].hero.name:'AI';
        const roundOverlay=document.createElement('div');
        roundOverlay.id='round-end-overlay';
        roundOverlay.className='round-end-overlay';
        roundOverlay.innerHTML=`
          <div class="round-end-title">ROUND ${currentRound} COMPLETE</div>
          <div class="round-end-winner">${winner} Wins!</div>
          <div class="round-end-score">
            <div class="round-end-score-label">Series Score</div>
            <div class="round-end-score-value">${seriesScore.player} - ${seriesScore.ai}</div>
          </div>
          <div class="round-end-hint">Next round starting in 3 seconds...</div>
        `;
        document.body.appendChild(roundOverlay);
        setTimeout(()=>{
          roundOverlay.remove();
          currentRound++;
          startNextRound();
        },3000);
      }
    } else {
      // Not in round mode, show normal game-over screen
      const gd=document.getElementById('game-over'),gt=document.getElementById('go-title'),gx=document.getElementById('go-text');
      soundManager.playSound(playerWon?'victory':'defeat', 1);
      soundManager.setMusicMode(playerWon?'victory':'defeat');
      if(playerWon){
        gt.textContent='🏆 VICTORY! 🏆';gt.style.color='#ffd700';
        gx.innerHTML=`${fighters[playerIndex].hero.name} is the champion!<br><span class="result-highlight">Time: ${finalTime}</span>`;
        spawnConfetti();
        // Show leaderboard name entry
        document.getElementById('lb-entry').style.display='block';
        document.getElementById('lb-name').value='';
        document.getElementById('lb-name').focus();
      } else {
        const w=fighters.find(f=>f.alive);
        if(spectating){
          gt.textContent='🏁 MATCH OVER';gt.style.color='#ffaa00';
          gx.innerHTML=w?`You placed #${playerDeathPlace}. ${w.hero.name} won!<br><span class="result-subtle">Match Time: ${finalTime}</span>`:'Battle over!';
        } else {
          gt.textContent='💀 DEFEATED 💀';gt.style.color='#e94560';
          gx.innerHTML=`Battle over!<br><span class="result-subtle">Match Time: ${finalTime}</span>`;
        }
        document.getElementById('lb-entry').style.display='none';
      }
      showMatchStats();
      // Show XP earned
      const el = document.getElementById('match-stats');
      const xpHtml = `<div class="xp-summary">
        <strong>Level ${getLevelFromXP(playerXP + matchStats.xpEarned)} · +${matchStats.xpEarned} XP</strong>
        <span>Total XP: ${playerXP + matchStats.xpEarned} / ${getXPForNextLevel(getLevelFromXP(playerXP + matchStats.xpEarned) + 1)}</span>
      </div>`;
      el.innerHTML += xpHtml;

      showLeaderboard();
      if(isMobile) document.getElementById('touch-controls').classList.remove('active');
      gd.style.display='block';
    }
  }
  draw();
  if(inputController) inputController.endFrame();
  requestAnimationFrame(gameLoop);
}

// ========== TERRAIN SEED DATA (generated once) ==========
let terrainSeeds=null;
function generateTerrainSeeds(){
  if(terrainSeeds)return;
  terrainSeeds=createArenaTerrainSeeds({
    map: currentMap,
    arenaCenterX,
    arenaCenterY,
    arenaRadius
  });
}

// ========== DRAW ==========
function draw() {
  updateTouchButtonsUI();
  // Clear full canvas before camera transform
  ctx.fillStyle=SHOWDOWN_THEME.cssVariables['--bg-bottom'];ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.save();
  // Camera transform: translate to screen center, scale, then move world so camera target is at center
  const halfW = canvas.width / 2, halfH = canvas.height / 2;
  ctx.translate(halfW, halfH);
  ctx.scale(cameraZoom, cameraZoom);
  ctx.translate(-cameraX + shakeX/cameraZoom, -cameraY + shakeY/cameraZoom);

  generateTerrainSeeds();
  drawArenaBackdrop({
    ctx,
    arenaCenterX,
    arenaCenterY,
    arenaRadius,
    terrainSeeds,
    frameCount,
    theme: SHOWDOWN_THEME
  });

  // Ambient particles (fireflies, dust)
  ambientParticles.forEach(ap=>{
    const alpha = ap.type==='firefly' ? (Math.sin(frameCount*0.1+ap.x)*0.3+0.5)*(ap.life/ap.maxLife) : ap.life/ap.maxLife*0.5;
    ctx.globalAlpha=alpha;
    if(ap.type==='firefly'){
      // Glow
      ctx.fillStyle=ap.color;
      ctx.beginPath();ctx.arc(ap.x,ap.y,ap.size*3,0,Math.PI*2);ctx.fill();
    }
    ctx.fillStyle=ap.color;
    ctx.fillRect(Math.round(ap.x)-ap.size/2,Math.round(ap.y)-ap.size/2,ap.size,ap.size);
  });
  ctx.globalAlpha=1;

  drawStormRing({ ctx, arenaCenterX, arenaCenterY, arenaRadius, frameCount, theme: SHOWDOWN_THEME });

  // Particles
  particles.forEach(p=>{
    ctx.globalAlpha=Math.min(1,p.life/30);
    ctx.fillStyle=p.color;
    const s=Math.max(1,p.size*(p.life/40));
    ctx.fillRect(Math.round(p.x)-s/2,Math.round(p.y)-s/2,s,s);
  });
  ctx.globalAlpha=1;

  // Projectiles
  projectiles.forEach(p=>p.draw());

  const player=fighters[playerIndex];
  if(player&&player.alive&&inputController){
    const attackAimActive = inputController.actions.attackAim.active || (!isMobile && inputController.pointerAim.active);
    const superAimActive = inputController.actions.superAim.active;
    if(attackAimActive){
      drawAimGuide({
        ctx,
        fighter: player,
        aim: inputController.getAimVector('attack'),
        frameCount,
        theme: SHOWDOWN_THEME,
        kind: 'attack'
      });
    }
    if(superAimActive){
      drawAimGuide({
        ctx,
        fighter: player,
        aim: inputController.actions.superAim,
        frameCount,
        theme: SHOWDOWN_THEME,
        kind: 'super'
      });
    }
  }

  // Draw all game objects sorted by Y for depth
  const drawables=[];
  const viewer=fighters[playerIndex];
  fighters.forEach(f=>{
    if(!f.alive)return;
    if(canObserverSeeFighter(viewer,f)) drawables.push({y:f.y,draw:()=>f.draw()});
    else if(f.moving) drawables.push({y:f.y,draw:()=>drawBushRustle(f)});
  });
  trees.forEach(t=>drawables.push({y:t.y+10,draw:()=>t.draw()}));
  crates.forEach(c=>{if(c.alive)drawables.push({y:c.y,draw:()=>c.draw()});});
  powerups.forEach(p=>{if(p.alive)drawables.push({y:p.y,draw:()=>p.draw()});});
  hazards.forEach(h=>{if(h.alive!==false)drawables.push({y:h.y||0,draw:()=>h.draw()});});
  drawables.sort((a,b)=>a.y-b.y).forEach(d=>d.draw());

  // Damage numbers
  damageNumbers.forEach(d=>{
    ctx.globalAlpha=d.life/40;ctx.fillStyle=d.color;
    ctx.font=d.text==='BLOCKED!'?`800 12px ${UI_FONT}`:`900 15px ${TITLE_FONT}`;
    ctx.textAlign='center';ctx.fillText(d.text,d.x,d.y);
  });
  ctx.globalAlpha=1;

  // END WORLD DRAWING — restore camera transform, everything below is SCREEN SPACE
  ctx.restore();

  // === HUD (screen space — coordinates are screen pixels) ===
  const alive=fighters.filter(f=>f.alive).length;
  const hudPanel=SHOWDOWN_THEME.palette.hud.panel;
  const hudText=SHOWDOWN_THEME.palette.hud.text;
  const hudMuted=SHOWDOWN_THEME.palette.hud.muted;
  const hudGold=SHOWDOWN_THEME.palette.hud.gold;

  // Top bar - alive count
  const topBarW=168,topBarH=34,topBarX=canvas.width/2-topBarW/2,topBarY=8;
  ctx.fillStyle=hudPanel;
  ctx.beginPath();ctx.roundRect(topBarX,topBarY,topBarW,topBarH,6);ctx.fill();
  ctx.strokeStyle='rgba(255,255,255,0.18)';ctx.lineWidth=1.5;
  ctx.beginPath();ctx.roundRect(topBarX,topBarY,topBarW,topBarH,6);ctx.stroke();
  ctx.fillStyle=hudText;ctx.font=`900 14px ${TITLE_FONT}`;ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText(`${alive} / 10 Alive`,canvas.width/2,topBarY+topBarH/2);
  ctx.textBaseline='alphabetic';

  // Player HUD (TOP RIGHT)
  const p=fighters[playerIndex];
  if(p){
    const hw=246,hh=154,hx=canvas.width-hw-14,hy=14;
    const accentColor=p.hero.color;

    ctx.fillStyle=hudPanel;
    ctx.beginPath();ctx.roundRect(hx,hy,hw,hh,10);ctx.fill();

    const grad=ctx.createLinearGradient(hx,hy,hx,hy+hh);
    grad.addColorStop(0,'rgba(255,255,255,0.08)');
    grad.addColorStop(1,'rgba(0,0,0,0.14)');
    ctx.fillStyle=grad;
    ctx.beginPath();ctx.roundRect(hx,hy,hw,hh,10);ctx.fill();

    ctx.fillStyle=accentColor;
    ctx.fillRect(hx,hy,5,hh);

    ctx.strokeStyle=accentColor+'66';ctx.lineWidth=1.5;
    ctx.beginPath();ctx.roundRect(hx,hy,hw,hh,10);ctx.stroke();

    const bx=hx+14,bw=hw-28;
    let cy=hy+16;

    ctx.fillStyle=accentColor;ctx.font=`900 13px ${TITLE_FONT}`;ctx.textAlign='left';
    ctx.fillText(p.hero.name,bx,cy);
    const rt=p.hero.rangeType==='ranged'?'RANGED':'MELEE';
    ctx.fillStyle=hudMuted;ctx.font=`700 8px ${UI_FONT}`;ctx.textAlign='right';
    ctx.fillText(rt,bx+bw,cy-1);
    ctx.textAlign='left';
    cy+=22;

    ctx.fillStyle=hudMuted;
    ctx.font=`700 8px ${UI_FONT}`;
    ctx.fillText(`ROLE · ${p.hero.role.toUpperCase()}`,bx,cy-4);

    const hpBarH=18;
    ctx.fillStyle='rgba(0,0,0,0.6)';
    ctx.beginPath();ctx.roundRect(bx,cy,bw,hpBarH,3);ctx.fill();
    const hpp=Math.max(0,p.hp/p.maxHp);
    const hpColor=hpp>0.5?'#44ff44':hpp>0.25?'#ffaa00':'#ff3333';
    ctx.fillStyle=hpColor;
    ctx.beginPath();ctx.roundRect(bx,cy,bw*hpp,hpBarH,3);ctx.fill();
    ctx.fillStyle=hudText;ctx.font=`800 9px ${UI_FONT}`;ctx.textBaseline='middle';
    ctx.fillText(`${Math.round(p.hp)}/${p.maxHp}`,bx+6,cy+hpBarH/2);
    ctx.textBaseline='alphabetic';
    cy+=hpBarH+12;

    ctx.fillStyle=hudMuted;
    ctx.font=`700 8px ${UI_FONT}`;
    ctx.fillText('SUPER',bx,cy-4);
    const sbh=13;
    const superReady=p.superCharge>=p.superMax;
    if(superReady){
      const flash=Math.sin(frameCount*0.12)*0.4+0.6;
      ctx.shadowColor=`rgba(255,238,0,${flash*0.5})`;
      ctx.shadowBlur=8;
      ctx.fillStyle=SHOWDOWN_THEME.palette.effects.super;
      ctx.beginPath();ctx.roundRect(bx,cy,bw,sbh,2);ctx.fill();
      ctx.shadowColor='transparent';
      ctx.fillStyle='#141414';ctx.font=`900 9px ${UI_FONT}`;ctx.textBaseline='middle';
      ctx.fillText('SUPER READY',bx+6,cy+sbh/2);
    } else {
      ctx.fillStyle='rgba(0,0,0,0.6)';
      ctx.beginPath();ctx.roundRect(bx,cy,bw,sbh,2);ctx.fill();
      ctx.fillStyle='#ff9f36';
      ctx.beginPath();ctx.roundRect(bx,cy,bw*(p.superCharge/p.superMax),sbh,2);ctx.fill();
      ctx.fillStyle=hudText;ctx.font=`800 8px ${UI_FONT}`;ctx.textBaseline='middle';
      ctx.fillText(`${Math.round(p.superCharge)}%`,bx+6,cy+sbh/2);
    }
    ctx.textBaseline='alphabetic';
    cy+=sbh+12;

    ctx.fillStyle=hudMuted;ctx.font=`700 8px ${UI_FONT}`;
    ctx.fillText('UTILITY',bx,cy+8);
    for(let i=0;i<2;i++){
      const sx=bx+60+i*14;
      if(i<p.shieldUses){
        ctx.fillStyle=p.shieldActive?'#00ffff':'#0088ff';
        ctx.beginPath();ctx.arc(sx,cy+4,4,0,Math.PI*2);ctx.fill();
      } else {
        ctx.fillStyle='#333';
        ctx.beginPath();ctx.arc(sx,cy+4,4,0,Math.PI*2);ctx.fill();
      }
    }

    ctx.fillStyle=hudMuted;ctx.font=`700 8px ${UI_FONT}`;ctx.textAlign='right';
    ctx.fillText('DASH',bx+bw,cy+8);
    const dashPct=p.dashCooldown>0?1-(p.dashCooldown/p.dashMaxCooldown):1;
    ctx.fillStyle=dashPct>=1?'#aaeeff':'#334455';
    ctx.beginPath();ctx.arc(bx+bw-8,cy+4,4,0,Math.PI*2);ctx.fill();
    ctx.textAlign='left';
    cy+=20;

    if(p.speedBuffTimer>0||p.doubleDmgTimer>0){
      ctx.fillStyle='rgba(255,215,94,0.14)';
      ctx.beginPath();ctx.roundRect(bx,cy,bw,14,2);ctx.fill();
      let buffText='';
      if(p.speedBuffTimer>0)buffText+='SPEED '+Math.ceil(p.speedBuffTimer/60)+'s';
      if(p.doubleDmgTimer>0){
        if(buffText)buffText+=' | ';
        buffText+='2x DMG '+Math.ceil(p.doubleDmgTimer/60)+'s';
      }
      ctx.fillStyle=hudGold;ctx.font=`800 8px ${UI_FONT}`;
      ctx.fillText(buffText,bx+4,cy+11);
    }
  }

  // Storm damage vignette (red edges when near storm)
  if(!spectating){
    const pf=fighters[playerIndex];
    if(pf&&pf.alive){
      const dfc=Math.sqrt((pf.x-arenaCenterX)**2+(pf.y-arenaCenterY)**2);
      const stormDist=arenaRadius-dfc;
      if(stormDist<80){
        const intensity=Math.max(0,1-stormDist/80)*0.5;
        // Red vignette gradient from edges
        const vg=ctx.createRadialGradient(canvas.width/2,canvas.height/2,canvas.width*0.3,canvas.width/2,canvas.height/2,canvas.width*0.6);
        vg.addColorStop(0,'rgba(200,0,0,0)');
        vg.addColorStop(1,`rgba(200,0,0,${intensity})`);
        ctx.fillStyle=vg;ctx.fillRect(0,0,canvas.width,canvas.height);
        // Warning text
        if(stormDist<50){
          const flash=Math.sin(frameCount*0.2)*0.3+0.7;
          ctx.globalAlpha=flash;
          ctx.fillStyle='#ff5d5a';ctx.font=`900 22px ${TITLE_FONT}`;ctx.textAlign='center';
          ctx.fillText('GET TO THE ZONE!',canvas.width/2,canvas.height/2+60);
          ctx.textAlign='left';ctx.globalAlpha=1;
        }
      }
    }
  }

  // Kill streak announcement
  if(killStreakFlash>0){
    const scale=1+Math.sin(killStreakFlash*0.15)*0.15;
    const alpha=Math.min(1,killStreakFlash/30);
    ctx.save();
    ctx.globalAlpha=alpha;
    ctx.font=`900 ${Math.round(36*scale)}px ${TITLE_FONT}`;
    ctx.textAlign='center';
    // Shadow
    ctx.fillStyle='rgba(0,0,0,0.7)';
    ctx.fillText(killStreakText,canvas.width/2+2,canvas.height*0.3+2);
    // Main text (gold gradient effect)
    ctx.fillStyle=killStreakCount>=5?'#ff0000':killStreakCount>=4?'#ff4400':killStreakCount>=3?'#ff8800':'#ffd700';
    ctx.fillText(killStreakText,canvas.width/2,canvas.height*0.3);
    ctx.restore();
    ctx.textAlign='left';
  }

  // Super activation flash
  if(slowMoTimer>0){
    const flashAlpha=Math.min(0.3,slowMoTimer/20*0.3);
    ctx.fillStyle=`rgba(255,255,255,${flashAlpha})`;
    ctx.fillRect(0,0,canvas.width,canvas.height);
  }

  // Killfeed
  killfeed.forEach((k,i)=>{
    ctx.globalAlpha=Math.min(1,k.time/30);
    ctx.fillStyle='rgba(8,15,38,0.72)';
    ctx.beginPath();ctx.roundRect(canvas.width-276,46+i*26,262,22,5);ctx.fill();
    ctx.strokeStyle='rgba(255,255,255,0.1)';ctx.lineWidth=1;
    ctx.beginPath();ctx.roundRect(canvas.width-276,46+i*26,262,22,5);ctx.stroke();
    ctx.fillStyle='#ff8d8a';ctx.font=`800 11px ${UI_FONT}`;ctx.textAlign='right';
    ctx.fillText(`${k.killer} KO ${k.victim}`,canvas.width-24,61+i*26);
  });
  ctx.globalAlpha=1;ctx.textAlign='left';

  if(shouldShowMinimap({ isMobile })){
    const mm=92,mmX=canvas.width-mm-14,mmY=canvas.height-mm-14;
    ctx.fillStyle='rgba(8,15,38,0.74)';
    ctx.beginPath();ctx.roundRect(mmX,mmY,mm,mm,10);ctx.fill();
    ctx.strokeStyle='rgba(255,255,255,0.1)';ctx.lineWidth=1.2;
    ctx.beginPath();ctx.roundRect(mmX,mmY,mm,mm,10);ctx.stroke();
    ctx.strokeStyle='rgba(233,69,96,0.4)';ctx.lineWidth=1;
    ctx.beginPath();ctx.arc(mmX+mm*(arenaCenterX/canvas.width),mmY+mm*(arenaCenterY/canvas.height),mm*(arenaRadius/canvas.width),0,Math.PI*2);ctx.stroke();
    fighters.forEach(f=>{
      if(!f.alive)return;
      const mx=mmX+(f.x/canvas.width)*mm,my=mmY+(f.y/canvas.height)*mm;
      ctx.fillStyle=f.isPlayer?'#4fe6ff':f.hero.color;
      const s=f.isPlayer?5:3;
      ctx.beginPath();ctx.arc(mx,my,s,0,Math.PI*2);ctx.fill();
      if(f.shieldActive){
        ctx.strokeStyle='#00ffff';ctx.lineWidth=1;
        ctx.beginPath();ctx.arc(mx,my,5.5,0,Math.PI*2);ctx.stroke();
      }
    });
  }

  // SPECTATOR MODE grey overlay
  if(spectating){
    // Semi-transparent dark desaturated overlay
    ctx.fillStyle='rgba(0,0,20,0.35)';
    ctx.fillRect(0,0,canvas.width,canvas.height);

    // "SPECTATING" text with remaining count
    const aliveNow=fighters.filter(f=>f.alive).length;
    ctx.fillStyle='rgba(8,15,38,0.78)';
    ctx.beginPath();ctx.roundRect(canvas.width/2-132,canvas.height/2-58,264,46,10);ctx.fill();
    ctx.strokeStyle='rgba(255,255,255,0.16)';ctx.lineWidth=1.5;
    ctx.beginPath();ctx.roundRect(canvas.width/2-132,canvas.height/2-58,264,46,10);ctx.stroke();
    ctx.fillStyle='#ff7388';ctx.font=`900 18px ${TITLE_FONT}`;ctx.textAlign='center';
    ctx.fillText(`SPECTATING · ${aliveNow} LEFT`,canvas.width/2,canvas.height/2-29);
    ctx.textAlign='left';
  }

  // Match timer on HUD (below alive count)
  if(matchTimerRunning||matchEndTime>0){
    const timeStr=getMatchTime();
    const timerW=108,timerH=22,timerX=canvas.width/2-timerW/2,timerY=topBarY+topBarH+5;
    ctx.fillStyle=hudPanel;
    ctx.beginPath();ctx.roundRect(timerX,timerY,timerW,timerH,4);ctx.fill();
    ctx.strokeStyle='rgba(79,230,255,0.45)';ctx.lineWidth=1;
    ctx.beginPath();ctx.roundRect(timerX,timerY,timerW,timerH,4);ctx.stroke();
    ctx.fillStyle='#4fe6ff';ctx.font=`800 11px ${UI_FONT}`;ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText(timeStr,canvas.width/2,timerY+timerH/2);
    ctx.textBaseline='alphabetic';ctx.textAlign='left';
  }

  // Round and series score display (when in round mode)
  if(roundMode&&gameRunning){
    const roundW=134,roundH=54,roundX=12,roundY=12;
    ctx.fillStyle=hudPanel;
    ctx.beginPath();ctx.roundRect(roundX,roundY,roundW,roundH,4);ctx.fill();
    ctx.strokeStyle='rgba(255,215,94,0.5)';ctx.lineWidth=2;
    ctx.beginPath();ctx.roundRect(roundX,roundY,roundW,roundH,4);ctx.stroke();
    ctx.fillStyle=hudGold;ctx.font=`800 10px ${UI_FONT}`;ctx.textAlign='left';
    ctx.fillText(`Round ${currentRound}/3`,roundX+8,roundY+16);
    ctx.fillStyle='#4fe6ff';ctx.font=`900 13px ${TITLE_FONT}`;
    ctx.fillText(`${seriesScore.player}-${seriesScore.ai}`,roundX+8,roundY+35);
    ctx.textAlign='left';
  }

  // Confetti on top of everything
  drawConfetti();

  // Countdown overlay (3, 2, 1, GO!)
  if (countdownActive && !dropPhase) {
    const sec = Math.ceil(countdownTimer / 60);
    const progress = (countdownTimer % 60) / 60; // 1→0 within each second
    const text = sec > 0 ? String(sec) : 'GO!';
    const scale = 1 + progress * 0.5; // pulse from big to normal
    const alpha = sec > 0 ? 0.9 : Math.max(0, countdownTimer / 60 + 1);

    ctx.save();
    ctx.globalAlpha = alpha;
    // Dark overlay
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // Countdown number
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(scale, scale);
    ctx.font = `900 120px ${TITLE_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillText(text, 3, 3);
    // Glow
    ctx.shadowColor = sec > 0 ? '#e94560' : '#0ff';
    ctx.shadowBlur = 30;
    ctx.fillStyle = sec > 0 ? '#e94560' : '#0ff';
    ctx.fillText(text, 0, 0);
    ctx.shadowBlur = 0;
    ctx.restore();
  }
}

// ========== 8-BIT PIXEL FONT ==========
const PIXEL_FONT = {
  'O':['01110','10001','10001','10001','10001','01110'],
  'G':['01110','10001','10000','10011','10001','01110'],
  'N':['10001','11001','10101','10101','10011','10001'],
  'Y':['10001','01010','00100','00100','00100','00100'],
  'A':['01110','10001','10001','11111','10001','10001'],
  'V':['10001','10001','10001','01010','01010','00100'],
};

function draw8BitText(ctx, text, x, y, pixSize, color) {
  ctx.fillStyle = color;
  let cx = x;
  for (let i = 0; i < text.length; i++) {
    const ch = PIXEL_FONT[text[i]];
    if (!ch) { cx += pixSize * 3; continue; }
    for (let r = 0; r < ch.length; r++) {
      for (let c = 0; c < ch[r].length; c++) {
        if (ch[r][c] === '1') {
          ctx.fillRect(cx + c * pixSize, y + r * pixSize, pixSize, pixSize);
        }
      }
    }
    cx += (ch[0].length + 1) * pixSize;
  }
  return cx - x; // return total width
}

function get8BitTextWidth(text, pixSize) {
  let w = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = PIXEL_FONT[text[i]];
    if (!ch) { w += pixSize * 3; continue; }
    w += (ch[0].length + 1) * pixSize;
  }
  return w;
}

// ========== ROTATING BANNER ==========
function drawBanner() {
  const text = 'OGNYAN';
  const pixSize = 5;
  const textW = get8BitTextWidth(text, pixSize);
  const bannerY = canvas.height - 20;

  ctx.save();
  ctx.translate(canvas.width / 2, bannerY);

  // Gentle rotation
  const rot = Math.sin(frameCount * 0.015) * 0.08;
  ctx.rotate(rot);

  // Pulsing scale
  const scale = 1 + Math.sin(frameCount * 0.03) * 0.05;
  ctx.scale(scale, scale);

  // Pink pulsing color
  const brightness = 60 + Math.sin(frameCount * 0.04) * 15;
  const color = `hsl(330, 100%, ${brightness}%)`;

  // Shadow
  draw8BitText(ctx, text, -textW/2 + 2, -15 + 2, pixSize, 'rgba(0,0,0,0.4)');
  // Main text
  draw8BitText(ctx, text, -textW/2, -15, pixSize, color);

  ctx.restore();
}

// ========== MATCH XP CALCULATION ==========
function calculateXPReward() {
  let xp = 50; // Base XP for playing
  const s = matchStats;
  xp += s.kills * 30; // Kill XP
  xp += Math.floor(s.damageDone / 10); // Damage XP
  xp += s.cratesSmashed * 5; // Crate XP
  
  // Win bonus
  const playerWon = fighters[playerIndex].alive && fighters.filter(f => f.alive).length === 1;
  if (playerWon) {
    xp += 100;
  }
  
  matchStats.xpEarned = xp;
  return xp;
}


// ========== MATCH STATS ==========
function showMatchStats(){
  const el=document.getElementById('match-stats');
  const s=matchStats;
  el.innerHTML=`<div class="results-card">
    <div class="results-title">Match Stats</div>
    <table class="results-table">
      <tr><td class="label">Kills</td><td class="value-hot">${s.kills}</td><td class="label">Damage Done</td><td class="value-hot">${Math.round(s.damageDone)}</td></tr>
      <tr><td class="label">Damage Taken</td><td class="value-gold">${Math.round(s.damageTaken)}</td><td class="label">Crates Smashed</td><td class="value-gold">${s.cratesSmashed}</td></tr>
      <tr><td class="label">Power-Ups</td><td class="value-heal">${s.powerupsCollected}</td><td class="label">Supers Used</td><td class="value-gold">${s.supersUsed}</td></tr>
      <tr><td class="label">Shields Used</td><td class="value-cyan">${s.shieldsUsed}</td><td class="label">Dashes Used</td><td class="value-cyan">${s.dashesUsed}</td></tr>
    </table>
  </div>`;
}

// ========== LEADERBOARD ==========
function saveToLeaderboard(){
  const nameInput=document.getElementById('lb-name');
  const name=nameInput.value.trim()||'Anonymous';
  const hero=fighters[playerIndex].hero.name;
  const time=getMatchTime();
  const date=new Date().toLocaleDateString();
  leaderboard.push({name,hero,time,date});
  leaderboard.sort((a,b)=>{
    const [am,as]=a.time.split(':').map(Number);
    const [bm,bs]=b.time.split(':').map(Number);
    return (am*60+as)-(bm*60+bs);
  });
  if(leaderboard.length>10)leaderboard=leaderboard.slice(0,10);
  document.getElementById('lb-entry').style.display='none';
  showLeaderboard();
}
function showLeaderboard(){
  const el=document.getElementById('lb-display');
  if(leaderboard.length===0){el.innerHTML='';return;}
  let html='<div class="results-card"><div class="results-title">Leaderboard</div>';
  html+='<table class="leaderboard-table">';
  html+='<tr><th>#</th><th>Name</th><th>Hero</th><th>Time</th><th>Date</th></tr>';
  leaderboard.forEach((e,i)=>{
    const medal=i===0?'🥇':i===1?'🥈':i===2?'🥉':`${i+1}`;
    html+=`<tr><td>${medal}</td><td class="leaderboard-name">${e.name}</td><td class="leaderboard-hero">${e.hero}</td><td class="leaderboard-time">${e.time}</td><td class="leaderboard-date">${e.date}</td></tr>`;
  });
  html+='</table></div>';
  el.innerHTML=html;
}

// ========== FULLSCREEN ==========
function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(e => {});
    document.getElementById('fullscreen-btn').textContent = '⛶ EXIT FULLSCREEN';
  } else {
    document.exitFullscreen();
    document.getElementById('fullscreen-btn').textContent = '⛶ FULLSCREEN';
  }
}
document.addEventListener('fullscreenchange', () => {
  const btn = document.getElementById('fullscreen-btn');
  btn.textContent = document.fullscreenElement ? '⛶ EXIT FULLSCREEN' : '⛶ FULLSCREEN';
});

// ========== QUICK REPLAY ==========
function quickReplay() {
  initSound();
  soundManager.playSound('uiConfirm', 0.85);
  soundManager.setMusicMode('countdown');
  document.getElementById('game-over').style.display = 'none';
  document.getElementById('spectator-bar').style.display = 'none';
  if(isMobile) document.getElementById('touch-controls').classList.add('active');
  // Restart with same hero
  gameRunning = true; spectating = false; playerDeathPlace = 0;
  fighters = []; projectiles = []; particles = []; damageNumbers = []; killfeed = []; powerups = []; ambientParticles=[];
  arenaRadius = currentMap.size.radius; arenaCenterX = currentMap.size.centerX; arenaCenterY = currentMap.size.centerY; frameCount = 0; shrinkTimer = 0;
  terrainSeeds = null;
  confetti=[]; confettiActive=false;
  matchStartTime=Date.now(); matchEndTime=0; matchTimerRunning=true;
  killStreakCount=0;killStreakTimer=0;killStreakFlash=0;slowMoTimer=0;slowMoRate=1;
  matchStats={kills:0,damageDone:0,damageTaken:0,cratesSmashed:0,powerupsCollected:0,shieldsUsed:0,supersUsed:0,dashesUsed:0,xpEarned:0};
  spawnTrees(); spawnCrates(); spawnHazards(); spawnWeather();
  const used = [selectedHero];
  while (used.length < 10) used.push(Math.floor(Math.random() * HEROES.length));
  for (let i = 0; i < 10; i++) {
    const spawn = currentMap.spawnPoints[i % currentMap.spawnPoints.length];
    fighters.push(new Fighter(HEROES[used[i]], spawn.x, spawn.y, i === 0));
  }
  playerIndex = 0;
  gameRunning = false;
  dropPhase = true;
  dropTimer = 60;
  dropDelay = 0;
  countdownTimer = 180;
  countdownActive = true;
  requestAnimationFrame(gameLoop);
}


// ========== SOUND CONTROL ==========
function toggleMute() {
  const btn = document.getElementById('mute-btn');
  const wasMuted = soundManager.toggleMute();
  btn.textContent = isMobile ? (wasMuted ? '🔇' : '🔊') : (wasMuted ? '🔇 SOUND OFF' : '🔊 SOUND ON');
  btn.classList.toggle('muted', wasMuted);
  localStorage.setItem('gameMuted', wasMuted);
}

function initSound() {
  soundManager.initAudio();
  soundManager.setMusicMode((gameRunning||countdownActive)?(countdownActive?'countdown':'battle'):'menu');
  const muted = localStorage.getItem('gameMuted') === 'true';
  const btn = document.getElementById('mute-btn');
  soundManager.muted = muted;
  btn.textContent = isMobile ? (muted ? '🔇' : '🔊') : (muted ? '🔇 SOUND OFF' : '🔊 SOUND ON');
  btn.classList.toggle('muted', muted);
  if (soundManager.masterGain && soundManager.audioContext) {
    const now = soundManager.audioContext.currentTime;
    soundManager.masterGain.gain.cancelScheduledValues(now);
    soundManager.masterGain.gain.setTargetAtTime(muted ? 0 : soundManager.masterLevel, now, 0.02);
  }
}

// Auto-fullscreen on mobile when game starts
function tryFullscreen() {
  if (!isMobile) return;
  const el = document.documentElement;
  if (el.requestFullscreen) el.requestFullscreen().catch(()=>{});
  else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
  // Try to lock to landscape
  if (screen.orientation && screen.orientation.lock) {
    screen.orientation.lock('landscape').catch(()=>{});
  }
}

// Show landscape prompt when game is running in portrait on mobile
function checkOrientation() {
  if (!isMobile) return;
  const prompt = document.getElementById('landscape-prompt');
  const isPortrait = window.innerHeight > window.innerWidth;
  if (isPortrait && gameRunning) {
    prompt.style.display = 'flex';
  } else {
    prompt.style.display = 'none';
  }
  resizeCanvas();
}
window.addEventListener('orientationchange', () => setTimeout(checkOrientation, 100));
window.addEventListener('resize', checkOrientation);

// Initialize sound on first interaction
document.addEventListener('click', () => { initSound(); }, { once: true });
document.addEventListener('keydown', () => { initSound(); }, { once: true });
document.addEventListener('touchstart', () => { initSound(); }, { once: true });
// Mobile: keep trying to unlock audio on every touch (iOS sometimes needs multiple gestures)
document.addEventListener('touchstart', () => {
  if (soundManager.audioContext && soundManager.audioContext.state === 'suspended') {
    soundManager.audioContext.resume().catch(()=>{});
  }
}, { passive: true });

// On mobile, hide mute button text to save space, also hide fullscreen
if (isMobile) {
  document.getElementById('mute-btn').textContent = '🔊';
  document.getElementById('mute-btn').style.padding = '6px 10px';
}

window.randomHero = randomHero;
window.setDifficulty = setDifficulty;
window.startGame = startGame;
window.saveToLeaderboard = saveToLeaderboard;
window.toggleFullscreen = toggleFullscreen;
window.quickReplay = quickReplay;
window.toggleMute = toggleMute;

// Init
ctx.fillStyle='#11244d';ctx.fillRect(0,0,canvas.width,canvas.height);
