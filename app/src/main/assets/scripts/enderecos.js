// Endereços JavaScript - Sistema Completo de Endereços

// Variáveis globais
let currentUser = null;
let enderecos = [];
let enderecoAtivo = null;
let editingIndex = -1;
let currentFirebaseUser = null; // Usuário do Firebase (para RTDB)
let enderecoPrincipalOriginal = null; // Dados originais do endereço principal

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

// Função para carregar endereços
async function loadEnderecos() {
  try {
    console.log('🔍 [ENDERECOS] Iniciando carregamento de endereços...');
    console.log('🔍 [ENDERECOS] Firebase disponível:', typeof firebase !== 'undefined');
    console.log('🔍 [ENDERECOS] Firestore disponível:', typeof window.db !== 'undefined');

    let user = null; // Declarar user no escopo da função

    // Primeiro tentar carregar do REALTIME DATABASE (onde os dados são salvos)
    if (typeof firebase !== 'undefined') {
      user = firebase.auth().currentUser;
      console.log('🔍 [ENDERECOS] Usuário autenticado no Firebase:', !!user);

      // Fallback para localStorage se Firebase Auth falhar
      if (!user) {
        try {
          const userDataRaw = localStorage.getItem('user');
          console.log('🔍 [ENDERECOS] Dados do localStorage:', userDataRaw ? 'encontrados' : 'não encontrados');

          if (userDataRaw) {
            const userData = JSON.parse(userDataRaw);
            if (userData && userData.id) {
              user = { uid: userData.id };
              console.log('✅ [ENDERECOS] Usando dados do localStorage - UID:', user.uid);
            } else {
              console.log('❌ [ENDERECOS] Dados do localStorage inválidos:', userData);
            }
          }
        } catch (localStorageError) {
          console.error('❌ [ENDERECOS] Erro ao ler localStorage:', localStorageError);
        }
      }

      if (user && user.uid) {
        // DEFINIR USUÁRIO GLOBAL PARA USO EM OUTRAS FUNÇÕES
        currentFirebaseUser = user;
        console.log('👤 [ENDERECOS] Usuário global definido:', currentFirebaseUser.uid);

        try {
          console.log('🔍 [ENDERECOS] Carregando dados do Realtime Database para usuário:', user.uid);

          // Buscar dados do usuário no Realtime Database
          const userRef = firebase.database().ref('users/' + user.uid);
          console.log('🔍 [ENDERECOS] Referência do RTDB:', 'users/' + user.uid);

          const snapshot = await userRef.once('value');
          console.log('🔍 [ENDERECOS] Snapshot existe:', snapshot.exists());

          if (snapshot.exists()) {
            const userData = snapshot.val();
            console.log('✅ [ENDERECOS] Dados do usuário no RTDB:', userData);
            console.log('✅ [ENDERECOS] CEP encontrado:', userData.ceps);
            console.log('✅ [ENDERECOS] Endereço completo:', userData.enderecoCompleto);

            // Verificar se há dados de endereço salvos
            if (userData.ceps && userData.enderecoCompleto) {
              console.log('🎯 [ENDERECOS] Endereço encontrado no RTDB - convertendo...');

              // Converter dados do RTDB para formato de endereço
              const enderecoConvertido = converterDadosRTDBParaEndereco(userData, user.uid);
              console.log('✅ [ENDERECOS] Endereço convertido:', enderecoConvertido);

              // SALVAR DADOS ORIGINAIS DO ENDEREÇO PRINCIPAL (para reativação futura)
              enderecoPrincipalOriginal = {
                cep: userData.ceps,
                enderecoCompleto: userData.enderecoCompleto,
                enderecoSalvo: userData.enderecoSalvo || new Date().toISOString()
              };
              localStorage.setItem('enderecoPrincipalOriginal', JSON.stringify(enderecoPrincipalOriginal));
              console.log('💾 [ENDERECOS] Dados originais do endereço principal salvos');

              enderecos = [enderecoConvertido];
              enderecoAtivo = enderecoConvertido;

              // Salvar no localStorage para cache
              localStorage.setItem('userEnderecos', JSON.stringify(enderecos));
              localStorage.setItem('enderecoAtivo', JSON.stringify(enderecoAtivo));

              console.log('✅ [ENDERECOS] Endereço principal carregado do RTDB:', enderecos.length);
              // NÃO FAZER RETURN - continuar para carregar endereços adicionais do Firestore
            } else {
              console.log('⚠️ [ENDERECOS] Dados de endereço não encontrados no RTDB');
              console.log('   - ceps:', userData.ceps);
              console.log('   - enderecoCompleto:', userData.enderecoCompleto);
            }
          } else {
            console.log('⚠️ [ENDERECOS] Nenhum dado encontrado no RTDB para o usuário');
          }
        } catch (rtError) {
          console.error('❌ [ENDERECOS] Erro ao carregar do Realtime Database:', rtError);
        }
      } else {
        console.log('❌ [ENDERECOS] Nenhum usuário disponível (Firebase Auth ou localStorage)');
      }
    } else {
      console.log('❌ [ENDERECOS] Firebase não disponível');
    }

    // Tentar carregar do Firestore (para endereços adicionais)
    // Usar o mesmo user que conseguimos acima (seja do Firebase Auth ou localStorage)
    console.log('🔥 [FIRESTORE] Verificando condições para carregar endereços adicionais...');
    console.log('🔥 [FIRESTORE] Firebase definido:', typeof firebase !== 'undefined');
    console.log('🔥 [FIRESTORE] window.db definido:', typeof window.db !== 'undefined');
    console.log('🔥 [FIRESTORE] user existe:', !!user);
    console.log('🔥 [FIRESTORE] user.uid existe:', !!(user && user.uid));
    console.log('🔥 [FIRESTORE] user.uid valor:', user ? user.uid : 'N/A');

    // CONDIÇÃO MAIS PERMISSIVA - tentar carregar mesmo se algumas condições falharem
    const podeCarregarFirestore = (typeof firebase !== 'undefined') && user && user.uid;
    console.log('🔥 [FIRESTORE] Pode carregar do Firestore:', podeCarregarFirestore);

    if (podeCarregarFirestore) {
      try {
        console.log('🔥 [FIRESTORE] Carregando endereços adicionais do Firestore para usuário:', user.uid);

        const enderecosRef = window.db.collection('enderecos').where('userId', '==', user.uid);
        console.log('🔥 [FIRESTORE] Query criada:', 'enderecos.where(userId ==', user.uid + ')');

        const snapshot = await enderecosRef.get();
        console.log('🔥 [FIRESTORE] Snapshot obtido, vazio:', snapshot.empty);

        if (!snapshot.empty) {
          const enderecosFirestore = [];
          snapshot.forEach(doc => {
            console.log('🔥 [FIRESTORE] Documento encontrado:', doc.id, doc.data());
            const enderecoData = doc.data();

            // VERIFICAR SE É DUPLICATA DO ENDEREÇO PRINCIPAL
            const isDuplicataPrincipal = enderecos.some(end =>
              end.id.startsWith('endereco-principal-') &&
              end.cep === enderecoData.cep &&
              end.enderecoCompleto === enderecoData.enderecoCompleto
            );

            if (isDuplicataPrincipal) {
              console.log('🚨 [FIRESTORE] Duplicata do endereço principal encontrada, removendo:', doc.id);
              // Remover duplicata do Firestore
              window.db.collection('enderecos').doc(doc.id).delete().catch(err =>
                console.error('Erro ao remover duplicata:', err)
              );
            } else {
              enderecosFirestore.push({
                id: doc.id,
                ...enderecoData
              });
            }
          });

          // Combinar com endereços já carregados
          enderecos = [...enderecos, ...enderecosFirestore];

          console.log('✅ [FIRESTORE] Endereços do Firestore adicionados:', enderecosFirestore.length, 'endereços');
          console.log('📋 [FIRESTORE] Total de endereços carregados:', enderecos.length);
        } else {
          console.log('ℹ️ [FIRESTORE] Nenhum endereço adicional encontrado no Firestore');
        }
      } catch (firestoreError) {
        console.error('❌ [FIRESTORE] Erro ao carregar do Firestore:', firestoreError);
        console.error('❌ [FIRESTORE] Detalhes do erro:', firestoreError.message);
        console.error('❌ [FIRESTORE] Stack:', firestoreError.stack);
      }
    } else {
      console.log('⚠️ [FIRESTORE] Firestore não disponível ou usuário não identificado para carregar endereços adicionais');
      console.log('   - Firebase disponível:', typeof firebase !== 'undefined');
      console.log('   - Firestore (window.db):', typeof window.db);
      console.log('   - User:', !!user);
      console.log('   - User UID:', user ? user.uid : 'N/A');
    }

    // Fallback: carregar do localStorage
    if (enderecos.length === 0) {
      const savedEnderecos = localStorage.getItem('userEnderecos');
      if (savedEnderecos) {
        enderecos = JSON.parse(savedEnderecos);
        console.log('Endereços carregados do localStorage:', enderecos);
      }
    }

    // Carregar dados originais do endereço principal
    const savedOriginal = localStorage.getItem('enderecoPrincipalOriginal');
    if (savedOriginal) {
      enderecoPrincipalOriginal = JSON.parse(savedOriginal);
      console.log('📚 [ENDERECOS] Dados originais do endereço principal carregados:', enderecoPrincipalOriginal);
    }

    // Carregar endereço ativo
    if (!enderecoAtivo) {
      const savedAtivo = localStorage.getItem('enderecoAtivo');
      if (savedAtivo) {
        enderecoAtivo = JSON.parse(savedAtivo);
      } else if (enderecos.length > 0) {
        enderecoAtivo = enderecos[0];
      }
    }

    renderEnderecos();
  } catch (error) {
    console.error('Erro ao carregar endereços:', error);
    enderecos = [];
    renderEnderecos();
  }
}

// Função auxiliar para converter dados do RTDB para formato de endereço
function converterDadosRTDBParaEndereco(userData, userId) {
  // Tentar extrair componentes do endereço completo
  const enderecoCompleto = userData.enderecoCompleto || '';

  // Exemplo: "Rua das Flores, 123, Apto 45 - Centro, São Paulo/SP, CEP: 01234-567"
  const partes = enderecoCompleto.split(' - ');

  let enderecoParte = partes[0] || '';
  let localParte = partes[1] || '';

  // Separar rua e número
  const enderecoMatch = enderecoParte.match(/^(.+?),\s*(\d+)(?:,\s*(.+))?$/);
  let logradouro = '';
  let numero = '';
  let complemento = '';

  if (enderecoMatch) {
    logradouro = enderecoMatch[1].trim();
    numero = enderecoMatch[2].trim();
    complemento = enderecoMatch[3] ? enderecoMatch[3].trim() : '';
  }

  // Separar bairro, cidade/estado
  const localMatch = localParte.match(/^(.+?),\s*(.+?)\/(.+?),\s*CEP:\s*(.+)$/);
  let bairro = '';
  let cidade = '';
  let estado = '';
  let cep = userData.ceps || '';

  if (localMatch) {
    bairro = localMatch[1].trim();
    cidade = localMatch[2].trim();
    estado = localMatch[3].trim();
    cep = localMatch[4].trim() || cep;
  }

  return {
    id: 'endereco-principal-' + userId,
    logradouro: logradouro,
    numero: numero,
    complemento: complemento,
    bairro: bairro,
    cep: cep,
    cidade: cidade,
    estado: estado,
    enderecoCompleto: enderecoCompleto,
    latitude: userData.latitude || null,
    longitude: userData.longitude || null,
    ativo: true,
    userId: userId,
    timestamp: userData.enderecoSalvo || new Date().toISOString()
  };
}

// Função para renderizar endereços
function renderEnderecos() {
  const enderecosList = document.getElementById('enderecosList');
  if (!enderecosList) return;

  console.log('🎨 [RENDER] Renderizando endereços:', enderecos.length);
  console.log('🎨 [RENDER] Endereço ativo:', enderecoAtivo ? enderecoAtivo.id : 'Nenhum');

  enderecos.forEach((end, index) => {
    console.log(`🎨 [RENDER] Endereço ${index}:`, end.id, end.logradouro, end.numero, 'Ativo:', end.ativo);
  });

  if (enderecos.length === 0) {
    enderecosList.innerHTML = '<p class="no-addresses">Nenhum endereço cadastrado</p>';
    return;
  }

  enderecosList.innerHTML = enderecos.map((endereco, index) => {
    const isAtivo = enderecoAtivo && enderecoAtivo.id === endereco.id;
    const podeAtivar = enderecoAtivo && enderecoAtivo.id !== endereco.id;

    console.log(`🎨 [RENDER] Endereço ${index} - ID: ${endereco.id}, Ativo: ${isAtivo}, Pode ativar: ${podeAtivar}`);

    return `
      <div class="endereco-item ${isAtivo ? 'active' : ''}">
        <div class="endereco-content">
          <div class="endereco-header">
            <h4>${endereco.logradouro}, ${endereco.numero}</h4>
            ${isAtivo ? '<span class="active-badge">ATIVO</span>' : ''}
          </div>
          <div class="endereco-details">
            ${endereco.complemento ? `<p>Complemento: ${endereco.complemento}</p>` : ''}
            <p>${endereco.bairro}, ${endereco.cidade}/${endereco.estado}</p>
            <p>CEP: ${endereco.cep}</p>
          </div>
        </div>
        <div class="endereco-actions">
          ${podeAtivar ? `<button onclick="ativarEndereco('${endereco.id}')" class="btn-activate">Ativar</button>` : ''}
          <button onclick="editarEndereco(${index})" class="btn-edit">Editar</button>
          <button onclick="excluirEndereco(${index})" class="delete-btn">Excluir</button>
        </div>
      </div>
    `;
  }).join('');
}

// Função para adicionar novo endereço
function addNewEndereco() {
  console.log('🆕 [ENDERECOS] Função addNewEndereco chamada');

  editingIndex = -1;
  document.getElementById('enderecoModalTitle').textContent = 'Adicionar Endereço';
  document.getElementById('enderecoForm').reset();

  // Configurar formatação do CEP
  const cepInput = document.getElementById('cep');
  if (cepInput) {
    cepInput.addEventListener('input', function(e) {
      formatarCepInput(e.target);
    });
    console.log('✅ [ENDERECOS] Event listener do CEP configurado');
  } else {
    console.log('❌ [ENDERECOS] Input CEP não encontrado');
  }

  const modal = document.getElementById('enderecoModal');
  if (modal) {
    modal.style.display = 'block';
    console.log('✅ [ENDERECOS] Modal aberto');
  } else {
    console.log('❌ [ENDERECOS] Modal não encontrado');
  }
}

// Função para editar endereço
function editarEndereco(index) {
  const endereco = enderecos[index];
  editingIndex = index;

  document.getElementById('enderecoModalTitle').textContent = 'Editar Endereço';

  // Preencher formulário
  document.getElementById('logradouro').value = endereco.logradouro || '';
  document.getElementById('numero').value = endereco.numero || '';
  document.getElementById('complemento').value = endereco.complemento || '';
  document.getElementById('bairro').value = endereco.bairro || '';
  document.getElementById('cep').value = endereco.cep || '';
  document.getElementById('cidade').value = endereco.cidade || '';
  document.getElementById('estado').value = endereco.estado || '';

  // Configurar formatação do CEP
  const cepInput = document.getElementById('cep');
  if (cepInput) {
    cepInput.addEventListener('input', function(e) {
      formatarCepInput(e.target);
    });
  }

  document.getElementById('enderecoModal').style.display = 'block';
}

// Função para fechar modal
function closeEnderecoModal() {
  document.getElementById('enderecoModal').style.display = 'none';
  editingIndex = -1;
}

// Função para ativar endereço
async function ativarEndereco(enderecoId) {
  try {
    console.log('🎯 [ATIVAR] Iniciando ativação do endereço:', enderecoId);

    // Desativar endereço anterior
    if (enderecoAtivo) {
      console.log('🔄 [ATIVAR] Desativando endereço anterior:', enderecoAtivo.id);
      enderecoAtivo.ativo = false;

      // Atualizar no Firebase se for endereço adicional (não principal)
      if (!enderecoAtivo.id.startsWith('endereco-principal-')) {
        try {
          await updateEnderecoFirebase(enderecoAtivo);
          console.log('✅ [ATIVAR] Endereço anterior desativado no Firebase');
        } catch (firebaseError) {
          console.error('⚠️ [ATIVAR] Erro ao desativar endereço anterior no Firebase:', firebaseError);
          // Continua mesmo com erro, pois é mais importante ativar o novo
        }
      } else {
        console.log('ℹ️ [ATIVAR] Endereço principal mantido ativo (não atualizado no Firebase)');
      }
    }

    // Ativar novo endereço
    const novoAtivo = enderecos.find(end => end.id === enderecoId);
    console.log('🔍 [ATIVAR] Novo endereço encontrado:', !!novoAtivo);

    if (novoAtivo) {
      console.log('🎯 [ATIVAR] Ativando novo endereço:', novoAtivo.id);
      novoAtivo.ativo = true;
      enderecoAtivo = novoAtivo;

      // Atualizar no Firebase se for endereço adicional
      if (!novoAtivo.id.startsWith('endereco-principal-')) {
        try {
          // Atualizar no Firestore
          await updateEnderecoFirebase(novoAtivo);
          console.log('✅ [ATIVAR] Novo endereço ativado no Firestore');

          // IMPORTANTE: Também atualizar no RTDB para que o Java leia o endereço ativo correto
          console.log('🔄 [ATIVAR] Atualizando RTDB com novo endereço ativo...');
          console.log('🔄 [ATIVAR] Usando usuário global:', currentFirebaseUser ? currentFirebaseUser.uid : 'N/A');
          await firebase.database().ref('users/' + currentFirebaseUser.uid).update({
            ceps: novoAtivo.cep,
            enderecoCompleto: novoAtivo.enderecoCompleto,
            enderecoSalvo: new Date().toISOString()
          });
          console.log('✅ [ATIVAR] RTDB atualizado com novo endereço ativo');

        } catch (firebaseError) {
          console.error('⚠️ [ATIVAR] Erro ao ativar novo endereço no Firebase:', firebaseError);
          // Continua mesmo com erro, pois pelo menos o localStorage será atualizado
        }
      } else {
        console.log('ℹ️ [ATIVAR] Endereço principal ativado - restaurando dados originais no RTDB');

        // Quando ativar o endereço principal, restaurar os dados originais no RTDB
        if (enderecoPrincipalOriginal && currentFirebaseUser) {
          try {
            console.log('🔄 [ATIVAR] Restaurando dados originais do endereço principal no RTDB...');
            await firebase.database().ref('users/' + currentFirebaseUser.uid).update({
              ceps: enderecoPrincipalOriginal.cep,
              enderecoCompleto: enderecoPrincipalOriginal.enderecoCompleto,
              enderecoSalvo: enderecoPrincipalOriginal.enderecoSalvo
            });
            console.log('✅ [ATIVAR] Dados originais do endereço principal restaurados no RTDB');
          } catch (rtError) {
            console.error('⚠️ [ATIVAR] Erro ao restaurar dados originais no RTDB:', rtError);
            // Continua mesmo com erro
          }
        } else {
          console.log('⚠️ [ATIVAR] Dados originais não disponíveis para restaurar');
        }
      }

      // Salvar no localStorage (sempre, independente do Firebase)
      localStorage.setItem('enderecoAtivo', JSON.stringify(enderecoAtivo));
      localStorage.setItem('userEnderecos', JSON.stringify(enderecos));
      console.log('💾 [ATIVAR] Dados salvos no localStorage');

      renderEnderecos();
      showSuccess('Endereço ativado para entregas!');
      console.log('🎉 [ATIVAR] Ativação concluída com sucesso');
    } else {
      console.log('❌ [ATIVAR] Endereço não encontrado na lista');
      showSuccess('Endereço não encontrado', 'error');
    }
  } catch (error) {
    console.error('❌ [ATIVAR] Erro ao ativar endereço:', error);
    console.error('❌ [ATIVAR] Detalhes do erro:', error.message);
    console.error('❌ [ATIVAR] Stack:', error.stack);
    showSuccess('Erro ao ativar endereço', 'error');
  }
}

// Função para excluir endereço
async function excluirEndereco(index) {
  const endereco = enderecos[index];

  if (enderecos.length <= 1) {
    alert('Você não pode excluir seu único endereço. Adicione outro endereço antes de excluir este.');
    return;
  }

  if (confirm(`Tem certeza que deseja excluir o endereço "${endereco.logradouro}, ${endereco.numero}"?`)) {
    try {
      // Se for o endereço ativo, ativar outro
      if (enderecoAtivo && enderecoAtivo.id === endereco.id) {
        enderecoAtivo = enderecos.find((end, i) => i !== index) || null;
        if (enderecoAtivo) {
          enderecoAtivo.ativo = true;
          await updateEnderecoFirebase(enderecoAtivo);
        }
      }

      // Remover do Firebase
      if (endereco.id) {
        await window.db.collection('enderecos').doc(endereco.id).delete();
      }

      // Remover da lista
      enderecos.splice(index, 1);

      // Salvar no localStorage
      localStorage.setItem('userEnderecos', JSON.stringify(enderecos));
      if (enderecoAtivo) {
        localStorage.setItem('enderecoAtivo', JSON.stringify(enderecoAtivo));
      } else {
        localStorage.removeItem('enderecoAtivo');
      }

      renderEnderecos();
      showSuccess('Endereço excluído com sucesso!');
    } catch (error) {
      console.error('Erro ao excluir endereço:', error);
      showSuccess('Erro ao excluir endereço', 'error');
    }
  }
}

// Função para salvar endereço (MESMA LÓGICA DO confirma_local.js)
async function salvarEndereco(event) {
  event.preventDefault();

  console.log("🏠 Salvando endereço...");

  // Verificar se Firebase está carregado
  if (typeof firebase === 'undefined') {
    console.log("❌ Firebase não carregado");
    showSuccess("Erro: Firebase não carregado. Recarregue a página.", 'error');
    return;
  }

  try {
    // Coletar dados do formulário de endereço
    const enderecoData = {
      logradouro: document.getElementById('logradouro').value.trim(),
      numero: document.getElementById('numero').value.trim(),
      complemento: document.getElementById('complemento').value.trim(),
      bairro: document.getElementById('bairro').value.trim(),
      cep: document.getElementById('cep').value.trim(),
      cidade: document.getElementById('cidade').value.trim(),
      estado: document.getElementById('estado').value,
      enderecoCompleto: '',
      timestamp: new Date().toISOString(),
      ativo: true
    };

    console.log(" Dados coletados do formulário:", enderecoData);

    // Validar campos obrigatórios
    if (!enderecoData.logradouro || !enderecoData.numero || !enderecoData.bairro || !enderecoData.cep || !enderecoData.cidade || !enderecoData.estado) {
      console.log("❌ Campos obrigatórios faltando");
      showSuccess("Preencha todos os campos obrigatórios!", 'error');
      return;
    }

    // Validar CEP
    const cepNumericoEndereco = enderecoData.cep.replace(/\D/g, '');
    if (cepNumericoEndereco.length !== 8) {
      console.log("❌ CEP inválido:", cepNumericoEndereco);
      showSuccess("Digite um CEP válido!", 'error');
      return;
    }

    // Criar endereço completo
    enderecoData.enderecoCompleto = `${enderecoData.logradouro}, ${enderecoData.numero}`;
    if (enderecoData.complemento) {
      enderecoData.enderecoCompleto += `, ${enderecoData.complemento}`;
    }
    enderecoData.enderecoCompleto += ` - ${enderecoData.bairro}, ${enderecoData.cidade}/${enderecoData.estado}, CEP: ${enderecoData.cep}`;

    console.log("📍 Dados do endereço completo:", enderecoData);

    // Salvar no REALTIME DATABASE (onde o Java lê)
    if (typeof firebase !== 'undefined') {
      // Aguardar autenticação se necessário
      let user = firebase.auth().currentUser;

      // Se não há usuário logado, tentar aguardar um pouco
      if (!user) {
        console.log("⚠️ Usuário não logado imediatamente, aguardando autenticação...");
        await new Promise(resolve => {
          const unsubscribe = firebase.auth().onAuthStateChanged(authUser => {
            if (authUser) {
              user = authUser;
              console.log("✅ Usuário autenticado:", user.uid);
            }
            unsubscribe(); // Remove listener
            resolve();
          });

          // Timeout de 3 segundos
          setTimeout(() => {
            unsubscribe();
            resolve();
          }, 3000);
        });
      }

      // FALLBACK: Se ainda não há usuário autenticado, tentar usar dados do localStorage
      if (!user || !user.uid) {
        console.log("⚠️ Firebase Auth falhou, tentando usar dados do localStorage...");

        try {
          const userDataRaw = localStorage.getItem('user');
          if (userDataRaw) {
            const userData = JSON.parse(userDataRaw);
            if (userData && userData.id) {
              console.log("✅ Usando dados do localStorage:", userData.id);

              // Simular usuário para salvar dados
              user = { uid: userData.id };
            }
          }
        } catch (localStorageError) {
          console.error("❌ Erro ao ler localStorage:", localStorageError);
        }
      }

      if (user && user.uid) {
        console.log("🔥 Salvando endereço no Realtime Database para usuário:", user.uid);

        // Verificar se é edição ou novo endereço
        if (editingIndex >= 0) {
          // EDITANDO ENDEREÇO EXISTENTE
          console.log("📝 Editando endereço existente no índice:", editingIndex);

          const enderecoExistente = enderecos[editingIndex];

          // Verificar se é o endereço principal (do RTDB) ou adicional (do Firestore)
          if (enderecoExistente.id && enderecoExistente.id.startsWith('endereco-principal-')) {
            // EDITANDO ENDEREÇO PRINCIPAL - salvar no RTDB
            console.log("🔥 Editando endereço principal no RTDB");

            try {
              await firebase.database().ref('users/' + user.uid).update({
                ceps: enderecoData.cep,
                enderecoCompleto: enderecoData.enderecoCompleto,
                enderecoSalvo: new Date().toISOString()
              });

              // Atualizar lista local
              Object.assign(enderecoExistente, enderecoData);
              localStorage.setItem('userEnderecos', JSON.stringify(enderecos));

              console.log("✅ Endereço principal editado com sucesso");
            } catch (rtError) {
              console.error("❌ Erro ao editar endereço principal:", rtError);
              showSuccess("Erro ao editar endereço.", 'error');
              return;
            }
          } else {
            // EDITANDO ENDEREÇO ADICIONAL - salvar no Firestore
            console.log("🔥 Editando endereço adicional no Firestore");

            try {
              await window.db.collection('enderecos').doc(enderecoExistente.id).update(enderecoData);

              // Atualizar lista local
              Object.assign(enderecoExistente, enderecoData);
              localStorage.setItem('userEnderecos', JSON.stringify(enderecos));

              console.log("✅ Endereço adicional editado com sucesso");
            } catch (firestoreError) {
              console.error("❌ Erro ao editar endereço adicional:", firestoreError);
              showSuccess("Erro ao editar endereço.", 'error');
              return;
            }
          }
        } else {
          // NOVO ENDEREÇO - sempre salvar no Firestore para não sobrescrever o principal
          console.log("➕ Adicionando novo endereço no Firestore");

          try {
            // Salvar no Firestore como endereço adicional
            const docRef = await window.db.collection('enderecos').add({
              ...enderecoData,
              userId: user.uid,
              tipo: 'adicional',
              ativo: false // Novos endereços não são ativos por padrão
            });

            enderecoData.id = docRef.id;
            console.log("✅ Novo endereço salvo no Firestore:", docRef.id);

            // Adicionar à lista local
            enderecos.push(enderecoData);

          } catch (firestoreError) {
            console.error("❌ Erro ao salvar novo endereço:", firestoreError);
            showSuccess("Erro ao salvar endereço.", 'error');
            return;
          }
        }
      } else {
        console.log("🚫 Nenhum método de autenticação funcionou - redirecionando para login");
        showSuccess("Sessão expirada. Faça login novamente.", 'error');

        // Redirecionar para tela de login após 2 segundos
        setTimeout(() => {
          window.location.href = 'index.html';
        }, 2000);

        return;
      }
    } else {
      console.log("⚠️ Firebase não disponível");
      showSuccess("Erro: Firebase não carregado.", 'error');
      return;
    }

    // Salvar no localStorage como backup
    localStorage.setItem('userEnderecos', JSON.stringify(enderecos));
    console.log("💾 Endereço salvo no localStorage");

    // Fechar modal
    closeEnderecoModal();

    showSuccess(editingIndex >= 0 ? 'Endereço atualizado!' : 'Endereço adicionado!');

    // Resetar índice de edição
    editingIndex = -1;

  } catch (error) {
    console.error("❌ Erro ao salvar endereço:", error);
    showSuccess("Erro ao salvar endereço. Tente novamente.", 'error');
  }
}

// Função para atualizar endereço no Firebase
async function updateEnderecoFirebase(endereco) {
  console.log('🔄 [UPDATE_FIREBASE] Iniciando atualização no Firebase:', endereco.id);

  if (!endereco.id) {
    console.log('❌ [UPDATE_FIREBASE] Endereço sem ID, pulando atualização');
    return;
  }

  if (!endereco.id.startsWith('endereco-principal-')) {
    try {
      console.log('🔥 [UPDATE_FIREBASE] Atualizando documento no Firestore:', endereco.id);
      await window.db.collection('enderecos').doc(endereco.id).update(endereco);
      console.log('✅ [UPDATE_FIREBASE] Endereço atualizado com sucesso no Firestore');
    } catch (error) {
      console.error('❌ [UPDATE_FIREBASE] Erro ao atualizar no Firestore:', error);
      console.error('❌ [UPDATE_FIREBASE] Detalhes:', error.message);
      throw error; // Re-throw para que o chamador saiba que falhou
    }
  } else {
    console.log('ℹ️ [UPDATE_FIREBASE] Endereço principal não precisa ser atualizado no Firebase');
  }
}

// Função para formatar CEP no input (global para uso no HTML)
function formatarCepInput(input) {
  let value = input.value.replace(/\D/g, '');
  if (value.length <= 8) {
    if (value.length >= 6) {
      value = value.replace(/(\d{5})(\d{1,3})/, '$1-$2');
    }
    input.value = value;
  }
}

// Tornar função global
window.formatarCepInput = formatarCepInput;

// Função para mostrar notificações
function showSuccess(message, type = 'success') {
  const notification = document.createElement('div');
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: ${type === 'success' ? '#28a745' : '#dc3545'};
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
  console.log('🚀 [ENDERECOS] Página de endereços carregada com sucesso!');

  // Verificar se elementos existem
  const addBtn = document.querySelector('.add-btn');
  const enderecosList = document.getElementById('enderecosList');
  const enderecoModal = document.getElementById('enderecoModal');
  const enderecoForm = document.getElementById('enderecoForm');

  console.log('🔍 [ENDERECOS] Elementos encontrados:');
  console.log('   - Botão adicionar:', !!addBtn);
  console.log('   - Lista de endereços:', !!enderecosList);
  console.log('   - Modal:', !!enderecoModal);
  console.log('   - Formulário:', !!enderecoForm);

  loadUserData();
  loadEnderecos();

  if (enderecoForm) {
    enderecoForm.addEventListener('submit', salvarEndereco);
    console.log('✅ [ENDERECOS] Event listener do formulário configurado');
  } else {
    console.log('❌ [ENDERECOS] Formulário não encontrado');
  }

  // Adicionar event listeners para os botões de navegação
  setupNavigation();

  console.log('✅ [ENDERECOS] Inicialização completa');
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
