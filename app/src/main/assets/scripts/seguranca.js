// Segurança JavaScript
console.log('🚀 [INIT] Script seguranca.js carregado');

// Variáveis globais
let currentUser = null;

// Função para voltar à página anterior
function goBack() {
  window.history.back();
}

// Função para verificar se o usuário fez login com Google
function isGoogleLogin() {
  console.log('🔍 [GOOGLE-CHECK] Verificando se usuário fez login com Google...');

  if (!currentUser) {
    console.log('❌ [GOOGLE-CHECK] currentUser é null/undefined');
    return false;
  }

  console.log('🔍 [GOOGLE-CHECK] Propriedades do usuário:', {
    id: currentUser.id,
    email: currentUser.email,
    senha: currentUser.senha,
    provider: currentUser.provider,
    providerId: currentUser.providerId,
    fotoUrl: currentUser.fotoUrl,
    nome: currentUser.nome
  });

  // LÓGICA SIMPLIFICADA: Se não há senha armazenada, é usuário do Google
  // Usuários normais sempre têm senha, usuários do Google não têm senha local
  const hasPassword = currentUser.senha && currentUser.senha.trim() !== '';

  if (!hasPassword) {
    console.log('✅ [GOOGLE-CHECK] Login do Google detectado: usuário sem senha armazenada');
    return true;
  }

  console.log('❌ [GOOGLE-CHECK] Login normal detectado (usuário tem senha)');
  return false;
}

// Função para carregar dados do usuário
function loadUserData() {
  try {
    const userData = localStorage.getItem('user');
    console.log('🔍 [LOAD-USER] Dados brutos do localStorage:', userData);

    if (userData) {
      currentUser = JSON.parse(userData);
      console.log('🔍 [LOAD-USER] currentUser após parse:', currentUser);

      const googleLogin = isGoogleLogin();
      console.log('🔍 [LOAD-USER] Resultado da detecção Google:', googleLogin);

      // Preencher email
      const userEmailElement = document.getElementById('userEmail');
      if (userEmailElement) {
        userEmailElement.textContent = currentUser.email || 'Não informado';
      }

      // Botão email - ocultar se fez login com Google
      const editEmailBtn = document.getElementById('editEmailBtn');

      if (googleLogin) {
        // Esconder botão de editar email e mostrar aviso
        if (editEmailBtn) editEmailBtn.style.display = 'none';
        if (userEmailElement) {
          userEmailElement.textContent = (currentUser.email || 'Não informado') + ' (Google)';
        }
        console.log('Botão de editar email ocultado para usuário do Google');
      } else {
        // Mostrar botão normalmente
        if (editEmailBtn) {
          editEmailBtn.style.display = 'inline-block';
          editEmailBtn.textContent = (currentUser.email && currentUser.email.trim() !== '') ? 'Editar' : 'Preencher';
        }
      }

      // Preencher telefone
      const userPhoneElement = document.getElementById('userPhone');
      if (userPhoneElement) {
        const telefone = currentUser.telefone || 'Não informado';
        console.log('Telefone carregado:', telefone);
        console.log('Tipo do telefone:', typeof telefone);
        console.log('Comprimento do telefone:', telefone.length);
        console.log('currentUser.telefone:', currentUser.telefone);
        console.log('currentUser.email:', currentUser.email);

        // Se o telefone for apenas "+55", mostrar como não informado
        if (telefone === '+55' || telefone.trim() === '+55') {
          userPhoneElement.textContent = 'Não informado';
          console.log('Setando userPhone para "Não informado"');
        } else {
          userPhoneElement.textContent = telefone;
          console.log('Setando userPhone para:', telefone);
        }

        console.log('userPhoneElement.textContent após setar:', userPhoneElement.textContent);
      }

      // Botão telefone
      const editPhoneBtn = document.getElementById('editPhoneBtn');
      if (editPhoneBtn) {
        editPhoneBtn.textContent = (currentUser.telefone && currentUser.telefone.trim() !== '') ? 'Editar' : 'Preencher';
      }

      // Aplicar mudanças visuais imediatamente
      console.log('🔄 [UI-UPDATE] Aplicando mudanças visuais imediatamente...');

      // Encontrar os itens pelos labels para maior precisão
      const infoItems = document.querySelectorAll('.info-item');
      let emailItem, phoneItem, passwordItem;

      infoItems.forEach(item => {
        const label = item.querySelector('label');
        if (label) {
          if (label.textContent.includes('Email')) {
            emailItem = item;
          } else if (label.textContent.includes('Telefone')) {
            phoneItem = item;
          } else if (label.textContent.includes('Senha')) {
            passwordItem = item;
          }
        }
      });

      console.log('🔍 [UI-UPDATE] Itens encontrados:', {
        emailItem: emailItem,
        phoneItem: phoneItem,
        passwordItem: passwordItem,
        googleLogin: googleLogin
      });

      if (googleLogin) {
        // Para usuários do Google: mostrar telefone, ocultar senha
        if (phoneItem) {
          phoneItem.style.display = 'block';
          phoneItem.style.visibility = 'visible';
          phoneItem.style.opacity = '1';
          phoneItem.style.height = 'auto';
          phoneItem.classList.remove('hidden-for-google');

          const phoneLabel = phoneItem.querySelector('label');
          if (phoneLabel) {
            phoneLabel.textContent = 'Telefone:';
            phoneLabel.style.color = '#1a73e8';
            phoneLabel.style.fontWeight = '600';
            console.log('✅ Campo de telefone destacado e visível para usuário do Google');
          }
        }

        if (passwordItem) {
          passwordItem.style.display = 'none';
          passwordItem.style.visibility = 'hidden';
          passwordItem.style.opacity = '0';
          passwordItem.style.height = '0';
          passwordItem.style.overflow = 'hidden';
          passwordItem.classList.add('hidden-for-google');
          console.log('✅ Campo de senha ocultado para usuário do Google');
        }
      } else {
        // Para usuários normais: mostrar ambos
        if (phoneItem) {
          phoneItem.style.display = 'block';
          phoneItem.style.visibility = 'visible';
          phoneItem.style.opacity = '1';
          phoneItem.style.height = 'auto';
          phoneItem.classList.remove('hidden-for-google');

          const phoneLabel = phoneItem.querySelector('label');
          if (phoneLabel) {
            phoneLabel.textContent = 'Telefone:';
            phoneLabel.style.color = '';
            phoneLabel.style.fontWeight = '';
            console.log('✅ Campo de telefone normal para usuário regular');
          }
        }

        if (passwordItem) {
          passwordItem.style.display = 'block';
          passwordItem.style.visibility = 'visible';
          passwordItem.style.opacity = '1';
          passwordItem.style.height = 'auto';
          passwordItem.classList.remove('hidden-for-google');
          console.log('✅ Campo de senha visível para usuário normal');
        }
      }

      console.log('🔄 [UI-UPDATE] Mudanças visuais aplicadas');

      console.log('Dados do usuário carregados:', currentUser);
    } else {
      console.log('Nenhum dado de usuário encontrado no localStorage');
      window.location.href = "index.html";
    }
  } catch (error) {
    console.error('Erro ao carregar dados do usuário:', error);
    window.location.href = "index.html";
  }
}

// Função para alterar senha
function changePassword() {
  // Impedir alteração de senha para usuários do Google
  if (isGoogleLogin()) {
    alert('Usuários que fazem login com o Google não precisam alterar a senha através deste aplicativo. A senha é gerenciada pelo Google.');
    return;
  }

  document.getElementById('passwordModal').style.display = 'block';
}

// Função para fechar modal de senha
function closePasswordModal() {
  document.getElementById('passwordModal').style.display = 'none';
  // Limpar campos
  document.getElementById('currentPassword').value = '';
  document.getElementById('newPassword').value = '';
  document.getElementById('confirmPassword').value = '';
}

// Função para editar campo
function editField(field) {
  // Impedir edição de email para usuários do Google
  if (field === 'email' && isGoogleLogin()) {
    alert('Usuários que fazem login com o Google não podem alterar o email através deste aplicativo.');
    return;
  }

  const fieldContainer = document.querySelector(`#${field}Edit`);
  if (fieldContainer) {
    fieldContainer.style.display = 'flex';

    // Preencher valor atual
    const input = document.getElementById(`${field}Input`);
    if (input) {
      switch(field) {
        case 'email':
          input.value = currentUser.email || '';
          break;
        case 'phone':
          input.value = currentUser.telefone || '';
          // Adicionar máscara ao campo de telefone
          if (input) {
            input.addEventListener('input', function() {
              formatPhone(this);
            });
          }
          break;
      }
    }
  }
}

// Função para cancelar edição
function cancelEdit(field) {
  const fieldContainer = document.querySelector(`#${field}Edit`);
  if (fieldContainer) {
    fieldContainer.style.display = 'none';
  }
}

// Função para salvar campo
function saveField(field) {
  const input = document.getElementById(`${field}Input`);
  if (!input) return;

  const value = input.value.trim();
  if (value === '') {
    alert('Por favor, preencha o campo.');
    return;
  }

  switch(field) {
    case 'email':
      currentUser.email = value;
      document.getElementById('userEmail').textContent = value;
      document.getElementById('editEmailBtn').textContent = 'Editar';
      if (window.Android) window.Android.updateUserField("email", value);
      break;
    case 'phone':
      // Validação: telefone deve ter pelo menos 11 dígitos
      const phoneDigits = value.replace(/\D/g, ''); // Remove caracteres não numéricos
      if (phoneDigits.length < 11) {
        alert('O telefone deve ter pelo menos 11 dígitos.');
        return;
      }

      // Formatar telefone para o padrão internacional como na criação de conta
      const formattedPhone = "+55" + phoneDigits;

      currentUser.telefone = formattedPhone;
      document.getElementById('userPhone').textContent = value; // Manter máscara na exibição
      document.getElementById('editPhoneBtn').textContent = 'Editar';
      if (window.Android) window.Android.updateUserField("telefone", formattedPhone);
      break;
  }

  localStorage.setItem('user', JSON.stringify(currentUser));
  cancelEdit(field);
  showSuccess('Campo atualizado com sucesso!');
}

// Função para mostrar sucesso
function showSuccess(message) {
  const notification = document.createElement('div');
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: #28a745;
    color: white;
    padding: 10px 20px;
    border-radius: 8px;
    z-index: 3000;
    font-size: 14px;
    font-family: 'Poppins', sans-serif;
  `;
  document.body.appendChild(notification);

  setTimeout(() => {
    document.body.removeChild(notification);
  }, 3000);
}

// Função para inicializar a página
document.addEventListener('DOMContentLoaded', function() {
  console.log('Página de segurança carregada com sucesso!');
  loadUserData();

  // Configurar formulário de alteração de senha
  const passwordForm = document.getElementById('passwordForm');
  if (passwordForm) {
    passwordForm.addEventListener('submit', function(e) {
      e.preventDefault();

      const currentPassword = document.getElementById('currentPassword').value;
      const newPassword = document.getElementById('newPassword').value;
      const confirmPassword = document.getElementById('confirmPassword').value;

      // Validações
      if (!currentPassword) {
        alert('Por favor, digite sua senha atual.');
        return;
      }

      if (!newPassword) {
        alert('Por favor, digite sua nova senha.');
        return;
      }

      if (newPassword.length < 8) {
        alert('A nova senha deve ter pelo menos 8 caracteres.');
        return;
      }

      if (newPassword !== confirmPassword) {
        alert('A confirmação da nova senha não coincide.');
        return;
      }

      // Verificar se a senha atual está correta (simplificado)
      // Em um app real, isso seria verificado no backend
      if (currentPassword === currentUser.senha || !currentUser.senha) {
        // Atualizar senha
        currentUser.senha = newPassword;
        localStorage.setItem('user', JSON.stringify(currentUser));

        // Chamar interface Android se disponível
        if (window.Android && window.Android.updateUserField) {
          window.Android.updateUserField('senha', newPassword);
        }

        closePasswordModal();
        showSuccess('Senha alterada com sucesso!');
      } else {
        alert('Senha atual incorreta.');
      }
    });
  }

  // Adicionar event listeners para os botões de navegação
  setupNavigation();
});

// Função para formatar telefone
function formatPhone(input) {
  let value = input.value.replace(/\D/g, ''); // Remove non-digits

  // Limita a 11 dígitos (DDD + 9 dígitos)
  if (value.length > 11) {
    value = value.substring(0, 11);
  }

  // Aplica máscara: (11) 99999-9999
  if (value.length <= 11) {
    if (value.length <= 2) {
      value = value.replace(/(\d{0,2})/, '($1');
    } else if (value.length <= 6) {
      value = value.replace(/(\d{2})(\d{0,4})/, '($1) $2');
    } else if (value.length <= 10) {
      value = value.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
    } else {
      value = value.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
    }
  }

  input.value = value;
}

// Mostrar modal de exclusão de conta
function showDeleteModal() {
  document.getElementById('deleteModal').style.display = 'block';
}

// Fechar modal de exclusão de conta
function closeDeleteModal() {
  document.getElementById('deleteModal').style.display = 'none';
  // Limpar campo de confirmação
  document.getElementById('deleteConfirmation').value = '';
}

// Lidar com exclusão de conta
async function handleDeleteAccount() {
  const confirmationText = document.getElementById('deleteConfirmation').value.trim();

  if (!confirmationText) {
    alert('Por favor, digite "EXCLUIR" para confirmar a exclusão.');
    return;
  }

  if (confirmationText !== 'EXCLUIR') {
    alert('Você deve digitar exatamente "EXCLUIR" para confirmar a exclusão da conta.');
    return;
  }

  // Confirmar uma última vez
  if (!confirm('Tem certeza de que deseja excluir sua conta? Esta ação é irreversível e todos os seus dados serão perdidos.')) {
    return;
  }

  try {
    console.log('🗑️ [DELETE-ACCOUNT] Iniciando processo de exclusão de conta...');

    // Verificar se é usuário do Google
    if (isGoogleLogin()) {
      alert('Usuários que fazem login com o Google devem excluir a conta diretamente no Google. Entre em contato com o suporte se precisar de ajuda.');
      closeDeleteModal();
      return;
    }

    // Para usuários normais, excluir diretamente (sem reautenticação por senha)
    const user = firebase.auth().currentUser;
    if (!user) {
      throw new Error('Usuário não autenticado');
    }

    // Excluir dados do usuário do Firestore e Realtime Database
    console.log('🗑️ [DELETE-ACCOUNT] Removendo dados do usuário...');
    await cleanupUserData(currentUser.id);

    // Excluir conta do Firebase Auth
    console.log('🗑️ [DELETE-ACCOUNT] Excluindo conta do Firebase Auth...');
    await user.delete();
    console.log('✅ [DELETE-ACCOUNT] Conta excluída com sucesso');

    // Limpar dados locais
    localStorage.removeItem('user');
    localStorage.clear();

    // Fechar modal
    closeDeleteModal();

    // Mostrar mensagem de sucesso e redirecionar
    alert('Sua conta foi excluída com sucesso.');
    window.location.href = 'index.html';

  } catch (error) {
    console.error('❌ [DELETE-ACCOUNT] Erro ao excluir conta:', error);

    let errorMessage = 'Erro ao excluir conta. ';
    if (error.code === 'auth/requires-recent-login') {
      errorMessage += 'Por segurança, faça login novamente antes de excluir a conta.';
    } else if (error.code === 'auth/user-not-found') {
      errorMessage += 'Usuário não encontrado.';
    } else {
      errorMessage += 'Tente novamente mais tarde.';
    }

    alert(errorMessage);
  }
}

// Função auxiliar para limpar dados do usuário
async function cleanupUserData(userId) {
  try {
    console.log('🧹 [CLEANUP] Iniciando limpeza de dados para usuário:', userId);

    // Remover dados do Firestore (coleção usuarios)
    try {
      const userDocRef = window.db.collection('usuarios').doc(userId);
      await userDocRef.delete();
      console.log('✅ [CLEANUP] Dados do Firestore removidos');
    } catch (error) {
      console.warn('⚠️ [CLEANUP] Erro ao remover dados do Firestore:', error.message);
    }

    // Remover dados do Realtime Database
    try {
      await window.rtdb.ref(`usuarios/${userId}`).remove();
      console.log('✅ [CLEANUP] Dados do Realtime Database removidos');
    } catch (error) {
      console.warn('⚠️ [CLEANUP] Erro ao remover dados do Realtime Database:', error.message);
    }

    // Remover solicitações do usuário (opcional - pode ser mantido para histórico)
    // Esta parte é comentada pois pode ser útil manter histórico para auditoria
    /*
    try {
      const solicitacoesQuery = window.db.collection('solicitacoes_servico').where('clienteId', '==', userId);
      const solicitacoesSnapshot = await solicitacoesQuery.get();

      const deletePromises = solicitacoesSnapshot.docs.map(doc => doc.ref.delete());
      await Promise.all(deletePromises);
      console.log('✅ [CLEANUP] Solicitações do usuário removidas');
    } catch (error) {
      console.warn('⚠️ [CLEANUP] Erro ao remover solicitações:', error.message);
    }
    */

    console.log('✅ [CLEANUP] Limpeza de dados concluída');

  } catch (error) {
    console.error('❌ [CLEANUP] Erro geral na limpeza de dados:', error);
    // Não lançar erro para não interromper o processo de exclusão
  }
}

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
