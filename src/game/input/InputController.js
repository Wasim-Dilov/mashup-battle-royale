export class InputController {
  constructor({ canvas, isMobile, onInteract }) {
    this.canvas = canvas;
    this.isMobile = isMobile;
    this.onInteract = onInteract || (() => {});
    this.actions = {
      moveVector: { x: 0, y: 0 },
      attackAim: { x: 0, y: 0, active: false },
      superAim: { x: 0, y: 0, active: false },
      attackPressed: false,
      superPressed: false,
      shieldPressed: false,
      dashPressed: false
    };
    this.touchJoystick = { active: false, startX: 0, startY: 0, dx: 0, dy: 0, id: null };
    this.touchButtons = { attack: false, super: false, shield: false, dash: false };
    this.pointerAim = { x: 0, y: 0, active: false };
  }

  attach() {
    this.attachPointerAim();
    if (!this.isMobile) return;
    this.attachMoveStick();
    this.attachAimButton('btn-attack', 'attack');
    this.attachAimButton('btn-super', 'super');
    this.attachTapButton('btn-shield', 'shield');
    this.attachTapButton('btn-dash', 'dash');
    this.canvas.addEventListener('touchstart', event => event.preventDefault(), { passive: false });
    this.canvas.addEventListener('touchmove', event => event.preventDefault(), { passive: false });
  }

  attachPointerAim() {
    this.canvas.addEventListener('mousemove', event => {
      const rect = this.canvas.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = event.clientX - cx;
      const dy = event.clientY - cy;
      const len = Math.hypot(dx, dy) || 1;
      this.pointerAim = { x: dx / len, y: dy / len, active: len > 24 };
      if (!this.isMobile) {
        this.actions.attackAim = { ...this.pointerAim };
      }
    });
    this.canvas.addEventListener('mousedown', event => {
      this.onInteract();
      if (event.button === 2) {
        this.actions.superPressed = true;
      } else if (event.button === 0) {
        this.actions.attackPressed = true;
      }
    });
    this.canvas.addEventListener('contextmenu', event => event.preventDefault());
  }

  attachMoveStick() {
    const zone = document.getElementById('joystick-zone');
    const base = document.getElementById('joystick-base');
    const thumb = document.getElementById('joystick-thumb');
    if (!zone || !base || !thumb) return;

    zone.addEventListener('touchstart', event => {
      event.preventDefault();
      this.onInteract();
      const touch = event.changedTouches[0];
      const rect = base.getBoundingClientRect();
      this.touchJoystick.active = true;
      this.touchJoystick.startX = rect.left + rect.width / 2;
      this.touchJoystick.startY = rect.top + rect.height / 2;
      this.touchJoystick.id = touch.identifier;
    }, { passive: false });

    zone.addEventListener('touchmove', event => {
      event.preventDefault();
      for (const touch of event.changedTouches) {
        if (touch.identifier !== this.touchJoystick.id) continue;
        let dx = touch.clientX - this.touchJoystick.startX;
        let dy = touch.clientY - this.touchJoystick.startY;
        const distance = Math.hypot(dx, dy);
        const maxRadius = 45;
        if (distance > maxRadius) {
          dx = (dx / distance) * maxRadius;
          dy = (dy / distance) * maxRadius;
        }
        this.touchJoystick.dx = dx / maxRadius;
        this.touchJoystick.dy = dy / maxRadius;
        this.actions.moveVector = { x: this.touchJoystick.dx, y: this.touchJoystick.dy };
        thumb.style.left = `${45 + dx}px`;
        thumb.style.top = `${45 + dy}px`;
      }
    }, { passive: false });

    const resetJoystick = event => {
      for (const touch of event.changedTouches) {
        if (touch.identifier !== this.touchJoystick.id) continue;
        this.touchJoystick.active = false;
        this.touchJoystick.dx = 0;
        this.touchJoystick.dy = 0;
        this.touchJoystick.id = null;
        this.actions.moveVector = { x: 0, y: 0 };
        thumb.style.left = '45px';
        thumb.style.top = '45px';
      }
    };
    zone.addEventListener('touchend', resetJoystick, { passive: false });
    zone.addEventListener('touchcancel', resetJoystick, { passive: false });
  }

  attachTapButton(id, key) {
    const button = document.getElementById(id);
    if (!button) return;
    const actionName = `${key}Pressed`;
    button.addEventListener('touchstart', event => {
      event.preventDefault();
      this.onInteract();
      this.touchButtons[key] = true;
      this.actions[actionName] = true;
      button.classList.add('pressed');
    }, { passive: false });
    const clear = event => {
      event.preventDefault();
      this.touchButtons[key] = false;
      button.classList.remove('pressed');
    };
    button.addEventListener('touchend', clear, { passive: false });
    button.addEventListener('touchcancel', clear, { passive: false });
  }

  attachAimButton(id, kind) {
    const button = document.getElementById(id);
    if (!button) return;
    const aimKey = kind === 'super' ? 'superAim' : 'attackAim';
    const pressKey = kind === 'super' ? 'superPressed' : 'attackPressed';
    const legacyKey = kind === 'super' ? 'super' : 'attack';
    const session = { id: null, centerX: 0, centerY: 0 };

    const updateAim = (touch, threshold = 0) => {
      let dx = touch.clientX - session.centerX;
      let dy = touch.clientY - session.centerY;
      const distance = Math.hypot(dx, dy);
      if (distance <= threshold) {
        this.actions[aimKey] = { x: 0, y: 0, active: false };
        return;
      }
      const normalized = distance || 1;
      this.actions[aimKey] = { x: dx / normalized, y: dy / normalized, active: true };
    };

    button.addEventListener('touchstart', event => {
      event.preventDefault();
      this.onInteract();
      const touch = event.changedTouches[0];
      const rect = button.getBoundingClientRect();
      session.id = touch.identifier;
      session.centerX = rect.left + rect.width / 2;
      session.centerY = rect.top + rect.height / 2;
      this.touchButtons[legacyKey] = true;
      button.classList.add('pressed');
      updateAim(touch, 0);
    }, { passive: false });

    button.addEventListener('touchmove', event => {
      event.preventDefault();
      for (const touch of event.changedTouches) {
        if (touch.identifier !== session.id) continue;
        updateAim(touch, 4);
      }
    }, { passive: false });

    const release = event => {
      event.preventDefault();
      for (const touch of event.changedTouches) {
        if (touch.identifier !== session.id) continue;
        updateAim(touch, 8);
        this.actions[pressKey] = true;
        this.touchButtons[legacyKey] = false;
        button.classList.remove('pressed');
        session.id = null;
      }
    };

    button.addEventListener('touchend', release, { passive: false });
    button.addEventListener('touchcancel', release, { passive: false });
  }

  consumeAction(name) {
    const current = this.actions[name];
    this.actions[name] = false;
    return current;
  }

  getAimVector(kind = 'attack') {
    const action = kind === 'super' ? this.actions.superAim : this.actions.attackAim;
    if (action.active) return action;
    return this.pointerAim.active ? this.pointerAim : null;
  }

  endFrame() {
    this.actions.attackPressed = false;
    this.actions.superPressed = false;
    this.actions.shieldPressed = false;
    this.actions.dashPressed = false;
    if (this.isMobile && !this.touchButtons.attack) {
      this.actions.attackAim = { x: 0, y: 0, active: false };
    }
    if (this.isMobile && !this.touchButtons.super) {
      this.actions.superAim = { x: 0, y: 0, active: false };
    }
  }
}
