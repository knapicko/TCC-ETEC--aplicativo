// Configurações JavaScript

// Função para voltar à página anterior
function goBack() {
  window.history.back();
}

// Funções para abrir cada seção de configurações
function openBasicDataSettings() {
  // Navegar para a página de dados básicos
  console.log('Abrindo configurações de dados básicos...');
  window.location.href = 'dados_basicos.html';
}

function openSecuritySettings() {
  // Navegar para a página de segurança
  console.log('Abrindo configurações de segurança...');
  window.location.href = 'seguranca.html';
}

function openAddressSettings() {
  // Navegar para a página de endereços
  console.log('Abrindo configurações de endereços...');
  window.location.href = 'enderecos.html';
}

function openAccessibilitySettings() {
  // Navegar para a página de acessibilidade
  console.log('Abrindo configurações de acessibilidade...');
  window.location.href = 'acessibilidade.html';
}

function openSupportSettings() {
  // Implementar navegação para suporte e FAQ
  console.log('Abrindo suporte e FAQ...');
  alert('Funcionalidade de suporte e FAQ será implementada em breve!');
}

function openTermsSettings() {
  // Navegar para a página de termos de uso
  console.log('Abrindo termos de uso...');
  window.location.href = 'termos.html';
}

function openPrivacySettings() {
  // Navegar para a página de política de privacidade
  console.log('Abrindo política de privacidade...');
  window.location.href = 'politica.html';
}

// Função para inicializar a página
document.addEventListener('DOMContentLoaded', function() {
  console.log('Página de configurações carregada com sucesso!');

  // Adicionar event listeners para os botões de navegação
  setupNavigation();
});

// Configurar navegação inferior
function setupNavigation() {
  const btnPedidos = document.getElementById('btnPedidos');
  const btnHome = document.getElementById('btnHome');
  const btnMensagens = document.getElementById('btnMensagens');

  if (btnPedidos) {
    btnPedidos.addEventListener('click', function() {
      window.location.href = 'servicos.html';
    });
  }

  if (btnHome) {
    btnHome.addEventListener('click', function() {
      window.location.href = 'home.html';
    });
  }

  if (btnMensagens) {
    btnMensagens.addEventListener('click', function() {
      window.location.href = 'mensagens.html';
    });
  }
}
