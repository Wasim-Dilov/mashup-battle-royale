export const ASSET_MANIFEST = {
  fighters: {
    blazeKnight: { type: 'inline-sprite', spriteSheetKey: 'blazeKnight', portraitKey: 'blazeKnight' },
    frostbyte: { type: 'inline-sprite', spriteSheetKey: 'frostbyte', portraitKey: 'frostbyte' },
    zapWizard: { type: 'inline-sprite', spriteSheetKey: 'zapWizard', portraitKey: 'zapWizard' },
    shadowNinja: { type: 'inline-sprite', spriteSheetKey: 'shadowNinja', portraitKey: 'shadowNinja' },
    captainCosmos: { type: 'inline-sprite', spriteSheetKey: 'captainCosmos', portraitKey: 'captainCosmos' },
    rexTitan: { type: 'inline-sprite', spriteSheetKey: 'rexTitan', portraitKey: 'rexTitan' },
    banitsa: { type: 'inline-sprite', spriteSheetKey: 'banitsa', portraitKey: 'banitsa' },
    lebronJames: { type: 'inline-sprite', spriteSheetKey: 'lebronJames', portraitKey: 'lebronJames' }
  },
  ui: {
    logo: { type: 'text-lockup', placeholder: true },
    portraitFrames: { type: 'procedural-frame', placeholder: true },
    controlButtons: { type: 'procedural-ui', placeholder: true }
  },
  terrain: {
    ground: { type: 'procedural-terrain', placeholder: true },
    bushes: { type: 'procedural-prop', placeholder: true },
    crates: { type: 'procedural-prop', placeholder: true },
    hazards: { type: 'procedural-prop', placeholder: true }
  },
  fx: {
    attackSlash: { type: 'procedural-fx', placeholder: true },
    superBurst: { type: 'procedural-fx', placeholder: true },
    rustle: { type: 'procedural-fx', placeholder: true }
  },
  audio: {
    menuLoop: { type: 'synth-loop', placeholder: true },
    battleLoop: { type: 'synth-loop', placeholder: true },
    victorySting: { type: 'synth-sting', placeholder: true },
    defeatSting: { type: 'synth-sting', placeholder: true }
  }
};
