export const SHOWDOWN_THEME = {
  id: 'solar-showdown',
  cssVariables: {
    '--bg-top': '#2b4e9f',
    '--bg-bottom': '#091021',
    '--panel-bg': 'rgba(16, 27, 63, 0.95)',
    '--panel-stroke': 'rgba(255, 255, 255, 0.14)',
    '--accent-hot': '#ffbe34',
    '--accent-red': '#ff5d5a',
    '--accent-cyan': '#4de3ff',
    '--accent-green': '#8cff69',
    '--shadow-deep': 'rgba(0, 0, 0, 0.45)',
    '--ground-core': '#8fde57',
    '--ground-mid': '#59b333',
    '--ground-edge': '#25561c',
    '--storm-core': '#a35dff',
    '--storm-glow': '#d890ff',
    '--hud-bg': 'rgba(8, 15, 38, 0.9)',
    '--hud-text': '#f8fbff',
    '--hud-muted': '#93a1c6',
    '--title-font': "'Arial Black', 'Trebuchet MS', 'Verdana', sans-serif",
    '--ui-font': "'Trebuchet MS', 'Verdana', sans-serif"
  },
  palette: {
    terrain: {
      groundCore: '#8fde57',
      groundMid: '#59b333',
      groundEdge: '#25561c',
      path: '#e3c15d',
      bushDark: '#1d6b2b',
      bushMid: '#34a23f',
      bushBright: '#a0ff6d'
    },
    hud: {
      panel: 'rgba(8, 15, 38, 0.9)',
      text: '#f8fbff',
      muted: '#93a1c6',
      gold: '#ffd75e'
    },
    effects: {
      hot: '#ff8f2f',
      heal: '#7dff7b',
      shield: '#53e7ff',
      super: '#ffe866'
    }
  },
  textStyles: {
    titleFont: "'Arial Black', 'Trebuchet MS', 'Verdana', sans-serif",
    uiFont: "'Trebuchet MS', 'Verdana', sans-serif"
  }
};

export function applyTheme(theme = SHOWDOWN_THEME) {
  const root = document.documentElement;
  Object.entries(theme.cssVariables).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
  document.body.dataset.theme = theme.id;
}
