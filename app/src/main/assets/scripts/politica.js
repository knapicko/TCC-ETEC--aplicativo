// Política JavaScript

// Função para voltar à página anterior
function goBack() {
  window.history.back();
}

// Função para inicializar a página
document.addEventListener('DOMContentLoaded', function() {
  console.log('Página de política carregada com sucesso!');

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
