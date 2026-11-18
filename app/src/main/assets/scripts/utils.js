// Utilitários globais para o aplicativo

// Função para incluir HTML (similar ao w3-include-html)
function includeHTML() {
  const elements = document.querySelectorAll('[w3-include-html]');
  elements.forEach(element => {
    const file = element.getAttribute('w3-include-html');
    if (file) {
      fetch(file)
        .then(response => response.text())
        .then(data => {
          element.innerHTML = data;
          element.removeAttribute('w3-include-html');
          // Re-executar para includes aninhados
          includeHTML();
        })
        .catch(error => {
          console.error('Erro ao incluir HTML:', file, error);
          element.innerHTML = 'Erro ao carregar conteúdo';
        });
    }
  });
}

// Inicializar includes quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', function() {
  includeHTML();
});

// Função global para verificar se um elemento existe
window.elementExists = function(selector) {
  return document.querySelector(selector) !== null;
};

// Função global para esperar um elemento aparecer no DOM
window.waitForElement = function(selector, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const element = document.querySelector(selector);
    if (element) {
      resolve(element);
      return;
    }

    const observer = new MutationObserver(() => {
      const element = document.querySelector(selector);
      if (element) {
        observer.disconnect();
        resolve(element);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Elemento ${selector} não encontrado dentro de ${timeout}ms`));
    }, timeout);
  });
};

// Função para formatar datas
window.formatDate = function(date, options = {}) {
  const defaultOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    ...options
  };
  return new Date(date).toLocaleDateString('pt-BR', defaultOptions);
};

// Função para formatar moeda
window.formatCurrency = function(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

// Função para truncar texto
window.truncateText = function(text, maxLength = 100) {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

// Função para copiar texto para clipboard
window.copyToClipboard = async function(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Erro ao copiar para clipboard:', error);
    return false;
  }
};

// Função para mostrar toast/snackbar
window.showToast = function(message, duration = 3000, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: ${type === 'error' ? '#dc3545' : type === 'success' ? '#28a745' : '#1a73e8'};
    color: white;
    padding: 12px 24px;
    border-radius: 8px;
    font-family: 'Poppins', sans-serif;
    font-size: 14px;
    z-index: 10000;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    animation: slideUpToast 0.3s ease-out;
  `;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'slideDownToast 0.3s ease-in';
    setTimeout(() => {
      document.body.removeChild(toast);
    }, 300);
  }, duration);
};

// Animações para toast
const toastStyles = document.createElement('style');
toastStyles.textContent = `
  @keyframes slideUpToast {
    from { transform: translateX(-50%) translateY(100px); opacity: 0; }
    to { transform: translateX(-50%) translateY(0); opacity: 1; }
  }
  @keyframes slideDownToast {
    from { transform: translateX(-50%) translateY(0); opacity: 1; }
    to { transform: translateX(-50%) translateY(100px); opacity: 0; }
  }
`;
document.head.appendChild(toastStyles);

// Função para detectar se está rodando no WebView
window.isWebView = function() {
  const userAgent = navigator.userAgent || navigator.vendor || window.opera;
  return /android/i.test(userAgent) && /wv/i.test(userAgent);
};

// Função para detectar se está no Android
window.isAndroid = function() {
  return /android/i.test(navigator.userAgent);
};

// Função para detectar se está no iOS
window.isIOS = function() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
};

console.log('♿ [UTILS] Utilitários globais carregados');
