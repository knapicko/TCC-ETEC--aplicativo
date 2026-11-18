

// Variáveis globais
let currentUser = null;

// Função para voltar à página anterior
function goBack() {
  window.history.back();
}

// Função para carregar dados do usuário
function loadUserData() {
  try {
    const userData = localStorage.getItem('user');
    if (userData) {
      currentUser = JSON.parse(userData);

      // Preencher nome
      const userNameElement = document.getElementById('userName');
      if (userNameElement && currentUser.nome) {
        userNameElement.textContent = currentUser.nome;
      }

      // Botão nome
      const editNameBtn = document.getElementById('editNameBtn');
      if (editNameBtn) {
        editNameBtn.textContent = (currentUser.nome && currentUser.nome.trim() !== '') ? 'Editar' : 'Preencher';
      }

      // Preencher foto de perfil
      const profilePhotoElement = document.getElementById('profilePhoto');
      if (profilePhotoElement && currentUser.fotoUrl && currentUser.fotoUrl !== '') {
        profilePhotoElement.src = currentUser.fotoUrl;
      }

      // Data de nascimento
      const userBirthDateElement = document.getElementById('userBirthDate');
      if (userBirthDateElement) {
        const birthDate = currentUser.dataNascimento;
        if (birthDate && birthDate !== '' && birthDate !== 'null') {
          if (birthDate.includes('-')) {
            userBirthDateElement.textContent = formatDate(birthDate);
          } else {
            userBirthDateElement.textContent = birthDate;
          }
        } else {
          userBirthDateElement.textContent = 'Não informado';
        }
      }

      // Botão data nascimento
      const editBirthDateBtn = document.getElementById('editBirthDateBtn');
      if (editBirthDateBtn) {
        editBirthDateBtn.textContent = (currentUser.dataNascimento && currentUser.dataNascimento.trim() !== '' && currentUser.dataNascimento !== 'null') ? 'Editar' : 'Preencher';
      }

      // CPF/CNPJ
      const userCpfCnpjElement = document.getElementById('userCpfCnpj');
      if (userCpfCnpjElement) {
        userCpfCnpjElement.textContent = formatCpfCnpjDisplay(currentUser.cpfCnpj) || 'Não informado';
      }

      // Botão cpf
      const editCpfCnpjBtn = document.getElementById('editCpfCnpjBtn');
      if (editCpfCnpjBtn) {
        editCpfCnpjBtn.textContent = (currentUser.cpfCnpj && currentUser.cpfCnpj.trim() !== '') ? 'Editar' : 'Preencher';
      }

      // Tipo de usuário
      const userTypeElement = document.getElementById('userType');
      if (userTypeElement) {
        userTypeElement.textContent = currentUser.tipoUsuario || 'Não informado';
      }

      // Mostrar/esconder seção Food Service apenas para clientes
      const foodServiceSection = document.getElementById('foodServiceSection');
      if (foodServiceSection) {
        if (currentUser.tipoUsuario === 'Cliente') {
          foodServiceSection.style.display = 'block';

          // Preencher checkbox Food Service
          const foodServiceCheckbox = document.getElementById('foodServiceCheckbox');
          const foodServiceStatus = document.getElementById('foodServiceStatus');
          if (foodServiceCheckbox && foodServiceStatus) {
            const isFoodService = currentUser.isFoodService === true || currentUser.isFoodService === 'true';
            foodServiceCheckbox.checked = isFoodService;
            foodServiceStatus.textContent = isFoodService ? 'Sim' : 'Não';
          }
        } else {
          foodServiceSection.style.display = 'none';
        }
      }

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

// Função para editar campo
function editField(field) {
  const fieldContainer = document.querySelector(`#${field}Edit`);
  if (fieldContainer) {
    fieldContainer.style.display = 'flex';

    // Preencher valor atual
    const input = document.getElementById(`${field}Input`);
    if (input) {
      switch(field) {
        case 'name':
          input.value = currentUser.nome || '';
          break;
        case 'birthDate':
          input.value = currentUser.dataNascimento || '';
          break;
        case 'cpfCnpj':
          input.value = formatCpfCnpjDisplay(currentUser.cpfCnpj) || '';
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
    case 'name':
      currentUser.nome = value;
      document.getElementById('userName').textContent = value;
      document.getElementById('editNameBtn').textContent = 'Editar';
      if (window.Android) window.Android.updateUserField("nome", value);
      break;
    case 'birthDate':
      currentUser.dataNascimento = value;
      document.getElementById('userBirthDate').textContent = formatDate(value);
      document.getElementById('editBirthDateBtn').textContent = 'Editar';
      if (window.Android) window.Android.updateUserField("dataNascimento", value);
      break;
    case 'cpfCnpj':
      const cleaned = cleanCpfCnpj(value);
      if (cleaned.length !== 11 && cleaned.length !== 14) {
        alert('CPF deve ter 11 dígitos ou CNPJ 14 dígitos.');
        return;
      }

      // Validar CPF/CNPJ
      if (!validarCpfCnpj(cleaned)) {
        alert('CPF/CNPJ inválido.');
        return;
      }

      // Se for CPF, tentar extrair data de nascimento automaticamente (opcional)
      if (cleaned.length === 11) {
        // Removida validação rigorosa - CPFs brasileiros não precisam necessariamente
        // ter os primeiros dígitos correspondendo à data de nascimento

        // Se não tem data de nascimento, tentar extrair do CPF (opcional)
        if (!currentUser.dataNascimento || currentUser.dataNascimento.trim() === '' || currentUser.dataNascimento === 'null') {
          const extractedDate = extractBirthDateFromCpf(cleaned);
          if (extractedDate) {
            currentUser.dataNascimento = extractedDate;
            document.getElementById('userBirthDate').textContent = formatDate(extractedDate);
            document.getElementById('editBirthDateBtn').textContent = 'Editar';
            if (window.Android) window.Android.updateUserField("dataNascimento", extractedDate);
            showSuccess('Data de nascimento preenchida automaticamente baseada no CPF!');
          }
        }
      }

      currentUser.cpfCnpj = cleaned;
      document.getElementById('userCpfCnpj').textContent = formatCpfCnpjDisplay(cleaned);
      document.getElementById('editCpfCnpjBtn').textContent = 'Editar';
      if (window.Android) window.Android.updateUserField("cpfCnpj", cleaned);
      break;
  }

  localStorage.setItem('user', JSON.stringify(currentUser));
  cancelEdit(field);
  showSuccess('Campo atualizado com sucesso!');
}

// Função para editar foto de perfil
function editProfilePhoto() {
  console.log('Editando foto de perfil...');
  console.log('window.Android disponível:', !!window.Android);
  console.log('window.Android.selectProfileImage disponível:', !!(window.Android && window.Android.selectProfileImage));

  // Verifica se a interface Android está disponível
  if (window.Android && window.Android.selectProfileImage) {
    // Mostra opções para câmera ou galeria
    showImageSourceDialog();
  } else {
    alert('Funcionalidade não disponível neste dispositivo. window.Android: ' + !!window.Android);
  }
}

// Função para mostrar diálogo de seleção de fonte da imagem
function showImageSourceDialog() {
  // Remove modal existente se houver
  const existingModal = document.getElementById('imageSourceModal');
  if (existingModal) {
    existingModal.remove();
  }

  // Cria modal para escolher fonte da imagem
  const modal = document.createElement("div");
  modal.id = 'imageSourceModal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0,0,0,0.7);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 99999;
    box-sizing: border-box;
  `;

  const modalContent = document.createElement("div");
  modalContent.style.cssText = `
    background: white;
    padding: 25px;
    border-radius: 20px;
    width: 90%;
    max-width: 350px;
    text-align: center;
    font-family: 'Poppins', sans-serif;
    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    box-sizing: border-box;
    margin: 20px;
  `;

  modalContent.innerHTML = `
    <h3 style="margin: 0 0 20px 0; color: #0191CE; font-size: 20px; font-weight: 600;">Escolher Foto</h3>
    <div style="display: flex; gap: 10px; width: 100%; flex-direction: column;">
      <button id="btnCamera" style="
        flex: 1;
        background: #0191CE;
        color: white;
        border: none;
        padding: 14px;
        border-radius: 12px;
        font-size: 16px;
        cursor: pointer;
        font-family: 'Poppins', sans-serif;
        font-weight: 500;
        transition: background 0.2s;
        margin-bottom: 10px;
      ">📷 Tirar Foto</button>
      <button id="btnGallery" style="
        flex: 1;
        background: #28a745;
        color: white;
        border: none;
        padding: 14px;
        border-radius: 12px;
        font-size: 16px;
        cursor: pointer;
        font-family: 'Poppins', sans-serif;
        font-weight: 500;
        transition: background 0.2s;
        margin-bottom: 10px;
      ">🖼️ Escolher da Galeria</button>
      <button id="btnCancelImage" style="
        flex: 1;
        background: #6c757d;
        color: white;
        border: none;
        padding: 14px;
        border-radius: 12px;
        font-size: 16px;
        cursor: pointer;
        font-family: 'Poppins', sans-serif;
        font-weight: 500;
        transition: background 0.2s;
      ">Cancelar</button>
    </div>
  `;

  modal.appendChild(modalContent);
  document.body.appendChild(modal);

  // Event listeners do modal
  const btnCamera = document.getElementById("btnCamera");
  const btnGallery = document.getElementById("btnGallery");
  const btnCancel = document.getElementById("btnCancelImage");

  // Hover effects
  btnCamera.addEventListener("mouseenter", () => {
    btnCamera.style.background = "#0178a3";
  });
  btnCamera.addEventListener("mouseleave", () => {
    btnCamera.style.background = "#0191CE";
  });

  btnGallery.addEventListener("mouseenter", () => {
    btnGallery.style.background = "#218838";
  });
  btnGallery.addEventListener("mouseleave", () => {
    btnGallery.style.background = "#28a745";
  });

  btnCancel.addEventListener("mouseenter", () => {
    btnCancel.style.background = "#5a6268";
  });
  btnCancel.addEventListener("mouseleave", () => {
    btnCancel.style.background = "#6c757d";
  });

  btnCamera.addEventListener("click", () => {
    modal.remove();
    if (window.Android && window.Android.selectProfileImage) {
      window.Android.selectProfileImage("camera");
    }
  });

  btnGallery.addEventListener("click", () => {
    modal.remove();
    if (window.Android && window.Android.selectProfileImage) {
      window.Android.selectProfileImage("gallery");
    }
  });

  btnCancel.addEventListener("click", () => {
    modal.remove();
  });

  // Fechar modal clicando fora
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
}

// Callback chamado pelo Android quando a imagem é selecionada e enviada
function onProfileImageSelected(imageData) {
  console.log('Imagem de perfil selecionada:', imageData ? 'dados recebidos' : 'sem dados');

  if (imageData && imageData.url) {
    // Atualiza a foto no DOM
    const profilePhotoElement = document.getElementById('profilePhoto');
    if (profilePhotoElement) {
      profilePhotoElement.src = imageData.url;
    }

    // Atualiza o objeto currentUser
    if (currentUser) {
      currentUser.fotoUrl = imageData.url;
      localStorage.setItem('user', JSON.stringify(currentUser));
    }

    showSuccess('Foto de perfil atualizada com sucesso!');
  } else {
    showAlert('Erro ao processar a imagem selecionada.');
  }
}

// Callback chamado pelo Android em caso de erro no upload
function onProfileImageError(errorMessage) {
  console.error('Erro no upload da foto:', errorMessage);
  showAlert('Erro ao atualizar foto: ' + errorMessage);
}

function formatDate(dateString) {
  if (!dateString) return 'Não informado';

  // Para evitar problemas de fuso horário, vamos parsear a data manualmente
  // Assumindo que a string está no formato YYYY-MM-DD
  if (dateString.includes('-')) {
    const parts = dateString.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1; // JavaScript usa 0-based para meses
      const day = parseInt(parts[2]);

      // Criar data no fuso horário local para evitar conversões UTC
      const date = new Date(year, month, day);
      return date.toLocaleDateString('pt-BR');
    }
  }

  // Fallback para o método anterior se não for formato esperado
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR');
}

function formatCpfCnpj(input) {
  let value = input.value.replace(/\D/g, ''); // Remove non-digits
  if (value.length <= 11) {
    // CPF
    value = value.replace(/(\d{3})(\d)/, '$1.$2');
    value = value.replace(/(\d{3})(\d)/, '$1.$2');
    value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  } else {
    // CNPJ
    value = value.replace(/^(\d{2})(\d)/, '$1.$2');
    value = value.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
    value = value.replace(/\.(\d{3})(\d)/, '.$1/$2');
    value = value.replace(/(\d{4})(\d)/, '$1-$2');
  }
  input.value = value;
}

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

function formatCpfCnpjDisplay(value) {
  if (!value) return '';
  let cleaned = value.replace(/\D/g, '');
  if (cleaned.length === 11) {
    // CPF
    return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  } else if (cleaned.length === 14) {
    // CNPJ
    return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
  return value;
}

function cleanCpfCnpj(value) {
  return value.replace(/\D/g, '');
}

// Função para validar CPF
function validarCpf(cpf) {
  cpf = cpf.replace(/\D/g, '');

  if (cpf.length !== 11) return false;

  // Elimina CPFs inválidos conhecidos
  if (/^(\d)\1+$/.test(cpf)) return false;

  // Validação do primeiro dígito verificador
  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += parseInt(cpf.charAt(i)) * (10 - i);
  }
  let resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf.charAt(9))) return false;

  // Validação do segundo dígito verificador
  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += parseInt(cpf.charAt(i)) * (11 - i);
  }
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf.charAt(10))) return false;

  return true;
}

// Função para validar CNPJ
function validarCnpj(cnpj) {
  cnpj = cnpj.replace(/\D/g, '');

  if (cnpj.length !== 14) return false;

  // Elimina CNPJs inválidos conhecidos
  if (/^(\d)\1+$/.test(cnpj)) return false;

  // Validação do primeiro dígito verificador
  let tamanho = cnpj.length - 2;
  let numeros = cnpj.substring(0, tamanho);
  let digitos = cnpj.substring(tamanho);
  let soma = 0;
  let pos = tamanho - 7;

  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
    if (pos < 2) pos = 9;
  }

  let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (resultado !== parseInt(digitos.charAt(0))) return false;

  // Validação do segundo dígito verificador
  tamanho = tamanho + 1;
  numeros = cnpj.substring(0, tamanho);
  soma = 0;
  pos = tamanho - 7;

  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
    if (pos < 2) pos = 9;
  }

  resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (resultado !== parseInt(digitos.charAt(1))) return false;

  return true;
}

// Função para validar CPF ou CNPJ
function validarCpfCnpj(value) {
  const cleaned = cleanCpfCnpj(value);

  if (cleaned.length === 11) {
    return validarCpf(cleaned);
  } else if (cleaned.length === 14) {
    return validarCnpj(cleaned);
  }

  return false;
}

// Função para verificar se CPF corresponde à data de nascimento
function cpfMatchesBirthDate(cpf, birthDate) {
  if (!cpf || !birthDate) return true; // Se não tem data, permite

  // Remove caracteres não numéricos do CPF
  cpf = cpf.replace(/\D/g, '');

  if (cpf.length !== 11) return false;

  // Formatar data de nascimento para DDMMAA
  let dateStr = '';
  if (birthDate.includes('-')) {
    // Formato YYYY-MM-DD
    const parts = birthDate.split('-');
    if (parts.length === 3) {
      dateStr = parts[2] + parts[1] + parts[0].substring(2); // DDMMAA
    }
  } else if (birthDate.includes('/')) {
    // Formato DD/MM/YYYY
    const parts = birthDate.split('/');
    if (parts.length === 3) {
      dateStr = parts[0] + parts[1] + parts[2].substring(2); // DDMMAA
    }
  }

  if (dateStr.length !== 6) return true; // Se não conseguiu formatar, permite

  // Verificar se os primeiros 6 dígitos do CPF correspondem à data
  const cpfDatePart = cpf.substring(0, 6);

  return cpfDatePart === dateStr;
}

// Função para extrair data de nascimento do CPF
function extractBirthDateFromCpf(cpf) {
  if (!cpf || cpf.length !== 11) return null;

  // Os primeiros 6 dígitos do CPF representam DDMMAA
  const datePart = cpf.substring(0, 6);

  // Extrair dia, mês e ano
  const day = parseInt(datePart.substring(0, 2));
  const month = parseInt(datePart.substring(2, 4)) - 1; // JavaScript usa 0-11 para meses
  const year = 2000 + parseInt(datePart.substring(4, 6)); // Assume século 21

  // Validar se é uma data válida
  const date = new Date(year, month, day);
  if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) {
    return null; // Data inválida
  }

  // Verificar se não é uma data futura (muito jovem)
  const today = new Date();
  const age = today.getFullYear() - year - (today.getMonth() < month || (today.getMonth() === month && today.getDate() < day) ? 1 : 0);

  if (age < 0 || age > 120) {
    return null; // Idade inválida
  }

  // Retornar no formato YYYY-MM-DD
  return date.toISOString().split('T')[0];
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
  console.log('Página de dados básicos carregada com sucesso!');
  loadUserData();

  // Adicionar event listeners para os botões de navegação
  setupNavigation();
});

// Função para alternar Food Service
function toggleFoodService(isChecked) {
  console.log('toggleFoodService chamado com isChecked:', isChecked);

  // Se está marcando como SIM, verificar se tem CPF/CNPJ
  if (isChecked) {
    const hasCpfCnpj = currentUser.cpfCnpj && currentUser.cpfCnpj.trim() !== '';
    console.log('Verificando CPF/CNPJ - tem CPF/CNPJ:', hasCpfCnpj, 'valor:', currentUser.cpfCnpj);

    if (!hasCpfCnpj) {
      // Desmarcar o checkbox
      const checkbox = document.getElementById('foodServiceCheckbox');
      if (checkbox) checkbox.checked = false;

      // Mostrar pop-up para inserir CPF/CNPJ
      showCpfCnpjPopup();
      return;
    }
  }

  // Atualizar o status
  currentUser.isFoodService = isChecked;
  console.log('Valor isFoodService definido para:', isChecked, 'no objeto currentUser');

  // Atualizar display
  const foodServiceStatus = document.getElementById('foodServiceStatus');
  if (foodServiceStatus) {
    foodServiceStatus.textContent = isChecked ? 'Sim' : 'Não';
  }

  // Salvar no localStorage
  localStorage.setItem('user', JSON.stringify(currentUser));
  console.log('Salvo no localStorage. Verificando se foi salvo corretamente...');
  const savedUser = localStorage.getItem('user');
  if (savedUser) {
    const parsed = JSON.parse(savedUser);
    console.log('Valor salvo no localStorage - isFoodService:', parsed.isFoodService);
  }

  // Salvar no Firebase via Android
  if (window.Android && window.Android.updateUserField) {
    console.log('Enviando para Firebase - isFoodService:', isChecked.toString());
    window.Android.updateUserField("isFoodService", isChecked.toString());
  } else {
    console.log('Interface Android não disponível para salvar no Firebase');
  }

  showSuccess('Status Food Service atualizado com sucesso!');
}

// Função para mostrar pop-up de CPF/CNPJ
function showCpfCnpjPopup() {
  // Remove modal existente se houver
  const existingModal = document.getElementById('cpfCnpjModal');
  if (existingModal) {
    existingModal.remove();
  }

  // Cria modal para inserir CPF/CNPJ
  const modal = document.createElement("div");
  modal.id = 'cpfCnpjModal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0,0,0,0.7);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 99999;
    box-sizing: border-box;
  `;

  const modalContent = document.createElement("div");
  modalContent.style.cssText = `
    background: white;
    padding: 25px;
    border-radius: 20px;
    width: 90%;
    max-width: 400px;
    text-align: center;
    font-family: 'Poppins', sans-serif;
    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    box-sizing: border-box;
    margin: 20px;
  `;

  modalContent.innerHTML = `
    <h3 style="margin: 0 0 20px 0; color: #1a73e8; font-size: 18px; font-weight: 600;">CPF/CNPJ Necessário</h3>
    <p style="margin: 0 0 20px 0; color: #666; font-size: 14px; line-height: 1.4;">
      Para se cadastrar como Food Service, é necessário informar seu CPF ou CNPJ.
    </p>
    <input type="text" id="cpfCnpjPopupInput" placeholder="Digite seu CPF ou CNPJ" maxlength="18" style="
      width: 100%;
      padding: 12px;
      border: 2px solid #ddd;
      border-radius: 8px;
      font-size: 16px;
      margin-bottom: 20px;
      box-sizing: border-box;
      font-family: 'Poppins', sans-serif;
    ">
    <div style="display: flex; gap: 10px; width: 100%; flex-direction: column;">
      <button id="btnSaveCpfCnpj" style="
        flex: 1;
        background: #1a73e8;
        color: white;
        border: none;
        padding: 14px;
        border-radius: 12px;
        font-size: 16px;
        cursor: pointer;
        font-family: 'Poppins', sans-serif;
        font-weight: 500;
        transition: background 0.2s;
        margin-bottom: 10px;
      ">Salvar</button>
      <button id="btnCancelCpfCnpj" style="
        flex: 1;
        background: #6c757d;
        color: white;
        border: none;
        padding: 14px;
        border-radius: 12px;
        font-size: 16px;
        cursor: pointer;
        font-family: 'Poppins', sans-serif;
        font-weight: 500;
        transition: background 0.2s;
      ">Cancelar</button>
    </div>
  `;

  modal.appendChild(modalContent);
  document.body.appendChild(modal);

  // Adicionar máscara ao input
  const input = document.getElementById('cpfCnpjPopupInput');
  input.addEventListener('input', function() {
    formatCpfCnpj(this);
  });

  // Event listeners
  const btnSave = document.getElementById("btnSaveCpfCnpj");
  const btnCancel = document.getElementById("btnCancelCpfCnpj");

  btnSave.addEventListener("click", () => {
    const value = input.value.trim();
    if (value === '') {
      alert('Por favor, preencha o CPF/CNPJ.');
      return;
    }

    const cleaned = cleanCpfCnpj(value);
    if (cleaned.length !== 11 && cleaned.length !== 14) {
      alert('CPF deve ter 11 dígitos ou CNPJ 14 dígitos.');
      return;
    }

    if (!validarCpfCnpj(cleaned)) {
      alert('CPF/CNPJ inválido.');
      return;
    }

    // Salvar CPF/CNPJ
    currentUser.cpfCnpj = cleaned;
    document.getElementById('userCpfCnpj').textContent = formatCpfCnpjDisplay(cleaned);
    document.getElementById('editCpfCnpjBtn').textContent = 'Editar';
    localStorage.setItem('user', JSON.stringify(currentUser));
    if (window.Android) window.Android.updateUserField("cpfCnpj", cleaned);

    // Agora marcar como Food Service
    currentUser.isFoodService = true;
    const checkbox = document.getElementById('foodServiceCheckbox');
    const status = document.getElementById('foodServiceStatus');
    if (checkbox) checkbox.checked = true;
    if (status) status.textContent = 'Sim';

    localStorage.setItem('user', JSON.stringify(currentUser));
    if (window.Android) window.Android.updateUserField("isFoodService", "true");

    modal.remove();
    showSuccess('CPF/CNPJ salvo e Food Service ativado com sucesso!');
  });

  btnCancel.addEventListener("click", () => {
    modal.remove();
  });

  // Fechar modal clicando fora
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
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
