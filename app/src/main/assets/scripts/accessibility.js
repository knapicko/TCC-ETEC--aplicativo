// Sistema de Acessibilidade Global
// Aplicável a todas as páginas do WebView

console.log('♿ [ACCESSIBILITY] Sistema de acessibilidade inicializado');

// Configurações de acessibilidade
let accessibilitySettings = {
  daltonismFilter: 'none', // 'none', 'protanopia', 'deuteranopia', 'tritanopia'
  fontWeight: 'normal' // 'normal', 'bold'
};

// Carregar configurações salvas
function loadAccessibilitySettings() {
  try {
    const saved = localStorage.getItem('accessibilitySettings');
    if (saved) {
      accessibilitySettings = { ...accessibilitySettings, ...JSON.parse(saved) };
      console.log('♿ [ACCESSIBILITY] Configurações carregadas:', accessibilitySettings);
    }
  } catch (error) {
    console.error('♿ [ACCESSIBILITY] Erro ao carregar configurações:', error);
  }
}

// Salvar configurações
function saveAccessibilitySettings() {
  try {
    localStorage.setItem('accessibilitySettings', JSON.stringify(accessibilitySettings));
    console.log('♿ [ACCESSIBILITY] Configurações salvas:', accessibilitySettings);
  } catch (error) {
    console.error('♿ [ACCESSIBILITY] Erro ao salvar configurações:', error);
  }
}

// Aplicar configurações de acessibilidade
function applyAccessibilitySettings() {
  console.log('♿ [ACCESSIBILITY] Aplicando configurações...');

  // Aplicar filtro de daltonismo
  document.documentElement.className = document.documentElement.className.replace(/daltonism-\w+/g, '');
  if (accessibilitySettings.daltonismFilter !== 'none') {
    document.documentElement.classList.add(`daltonism-${accessibilitySettings.daltonismFilter}`);
  }

  // Aplicar peso da fonte
  if (accessibilitySettings.fontWeight === 'bold') {
    document.documentElement.classList.add('font-bold-mode');
  } else {
    document.documentElement.classList.remove('font-bold-mode');
  }

  console.log('♿ [ACCESSIBILITY] Configurações aplicadas');
}



// Inicializar acessibilidade quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', function() {
  console.log('♿ [ACCESSIBILITY] DOM pronto, inicializando...');
  loadAccessibilitySettings();
  applyAccessibilitySettings();
});

// Função global para outras páginas acessarem as configurações
window.AccessibilitySettings = {
  getSettings: () => accessibilitySettings,
  setFontWeight: (weight) => {
    accessibilitySettings.fontWeight = weight;
    applyAccessibilitySettings();
    saveAccessibilitySettings();
  },
  setDaltonismFilter: (filter) => {
    accessibilitySettings.daltonismFilter = filter;
    applyAccessibilitySettings();
    saveAccessibilitySettings();
  },
  reset: () => {
    accessibilitySettings = {
      daltonismFilter: 'none',
      fontWeight: 'normal'
    };
    applyAccessibilitySettings();
    saveAccessibilitySettings();
  }
};
