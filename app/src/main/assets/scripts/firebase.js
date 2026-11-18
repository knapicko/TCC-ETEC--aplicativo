// Firebase Functions - Versão corrigida
// Agora vazio - funções movidas para firebase-init.js

// ===== SERVIÇOS =====

// Salvar serviços no Firebase
window.salvarServicos = async (servicos) => {
  try {
    const docRef = await window.db.collection("servicos").add({
      ...servicos,
      dataCriacao: new Date(),
      ativo: true
    });
    console.log("Serviços salvos com ID: ", docRef.id);
    return docRef.id;
  } catch (e) {
    console.error("Erro ao salvar serviços: ", e);
    throw e;
  }
};

// Salvar solicitação de serviço no Firebase e distribuir para paneleiros próximos
window.salvarSolicitacaoServico = async (solicitacao) => {
  try {
    // Obter dados do usuário logado
    const userDataRaw = localStorage.getItem("user");
    if (!userDataRaw) {
      throw new Error("Usuário não está logado");
    }

    const userData = JSON.parse(userDataRaw);

    // Preparar dados da solicitação
    const dadosSolicitacao = {
      ...solicitacao,
      clienteId: userData.id || userData.uid,
      clienteNome: userData.nome,
      clienteEmail: userData.email,
      clienteTipo: userData.tipoUsuario || userData.tipo,
      clienteFoto: userData.fotoUrl || './imgs/perfil.png', // BUSCAR FOTO DO USUÁRIO ATUAL
      clienteIsFoodService: userData.isFoodService === true || userData.isFoodService === 'true', // Adicionar campo isFoodService
      quantidadePanelas: solicitacao.quantidadePanelas || 1, // Adicionar campo quantidadePanelas
      status: 'pendente', // Status inicial
      dataCriacao: new Date(),
      dataAtualizacao: new Date(),
      ativo: true
    };

    console.log("📝 [SALVAR-SOLICITACAO] Dados da solicitação:", dadosSolicitacao);

    // Salvar solicitação principal
    const docRef = await window.db.collection("solicitacoes_servico").add(dadosSolicitacao);
    const solicitacaoId = docRef.id;
    console.log("✅ [SALVAR-SOLICITACAO] Solicitação salva com ID:", solicitacaoId);

    // Buscar paneleiros próximos e criar notificações
    console.log("🏭 [SALVAR-SOLICITACAO] Iniciando distribuição para paneleiros...");
    await distribuirSolicitacaoParaPaneleiros(solicitacaoId, dadosSolicitacao, userData);

    return solicitacaoId;
  } catch (e) {
    console.error("❌ [SALVAR-SOLICITACAO] Erro ao salvar solicitação:", e);
    throw e;
  }
};

// Função para distribuir solicitação para paneleiros próximos
async function distribuirSolicitacaoParaPaneleiros(solicitacaoId, dadosSolicitacao, userData) {
  try {
    console.log("🏭 [DISTRIBUICAO] Início - Solicitação ID:", solicitacaoId);

    // Buscar paneleiros próximos (usando a mesma lógica do mapa)
    let paneleirosProximos = [];

    // Tentar buscar via interface Android primeiro
    if (window.Android && window.Android.getPaneleiros) {
      try {
        console.log("🤖 [DISTRIBUICAO] Buscando paneleiros via Android API...");
        const paneleirosData = await window.Android.getPaneleiros();
        const paneleirosRaw = JSON.parse(paneleirosData || '[]');
        console.log("🤖 [DISTRIBUICAO] Paneleiros retornados do Android:", paneleirosRaw.length);

        // Para cada paneleiro, verificar se está próximo baseado no CEP
        for (const paneleiro of paneleirosRaw) {
          if (paneleiro.ceps || paneleiro.cep) {
            const cep = (paneleiro.ceps || paneleiro.cep).replace(/\D/g, '');
            if (cep.length === 8) {
              // Verificar se o CEP do paneleiro está próximo ao do cliente
              // Por enquanto, consideramos todos os paneleiros como próximos para demonstração
              paneleirosProximos.push({
                id: paneleiro.id,
                nome: paneleiro.nome,
                email: paneleiro.email,
                fotoUrl: paneleiro.fotoUrl,
                avaliacao: paneleiro.avaliacao || "4.5"
              });
            }
          }
        }
        console.log("🤖 [DISTRIBUICAO] Paneleiros próximos via Android:", paneleirosProximos.length);
      } catch (error) {
        console.error("🤖 [DISTRIBUICAO] Erro ao buscar paneleiros via Android:", error);
      }
    }

    // Fallback: buscar paneleiros do Firestore
    if (paneleirosProximos.length === 0) {
      try {
        console.log("🔥 [DISTRIBUICAO] Buscando paneleiros no Firestore coleção 'usuarios'...");

        // Buscar tanto "Paneleiro" quanto "paneleiro" para compatibilidade
        const q1 = window.db.collection("usuarios").where("tipoUsuario", "==", "Paneleiro").limit(10);
        const q2 = window.db.collection("usuarios").where("tipoUsuario", "==", "paneleiro").limit(10);

        const [snapshot1, snapshot2] = await Promise.all([q1.get(), q2.get()]);
        console.log("🔥 [DISTRIBUICAO] Query 'Paneleiro' encontrou:", snapshot1.size);
        console.log("🔥 [DISTRIBUICAO] Query 'paneleiro' encontrou:", snapshot2.size);

        const querySnapshot = { ...snapshot1, docs: [...snapshot1.docs, ...snapshot2.docs] };

        console.log("🔥 [DISTRIBUICAO] Total paneleiros encontrados:", querySnapshot.docs.length);

        querySnapshot.docs.forEach((doc) => {
          const paneleiroData = doc.data();
          console.log("🔥 [DISTRIBUICAO] Paneleiro válido:", doc.id, paneleiroData.nome, paneleiroData.tipoUsuario, paneleiroData.email);
          paneleirosProximos.push({
            id: doc.id,
            nome: paneleiroData.nome,
            email: paneleiroData.email,
            fotoUrl: paneleiroData.fotoUrl,
            avaliacao: paneleiroData.avaliacao || "4.5"
          });
        });
        console.log("🔥 [DISTRIBUICAO] Paneleiros próximos via Firestore:", paneleirosProximos.length);
      } catch (error) {
        console.error("🔥 [DISTRIBUICAO] Erro ao buscar paneleiros do Firestore:", error);
      }
    }

    // Se não encontrou paneleiros reais, não criar notificações
    if (paneleirosProximos.length === 0) {
      console.log("🚨 [DISTRIBUICAO] Nenhum paneleiro encontrado - notificações não serão criadas");
      return [];
    }

    console.log(`🎯 [DISTRIBUICAO] Total paneleiros para notificar: ${paneleirosProximos.length}`, paneleirosProximos);

    // Criar notificações para cada paneleiro
    console.log("📝 [DISTRIBUICAO] Iniciando criação de notificações...");
    const notificacoesPromises = paneleirosProximos.map(async (paneleiro, index) => {
      try {
        console.log(`📝 [DISTRIBUICAO] Criando notificação ${index + 1} para ${paneleiro.nome} (ID: ${paneleiro.id})`);

        const notificacaoData = {
          solicitacaoId: solicitacaoId,
          paneleiroId: paneleiro.id,
          paneleiroNome: paneleiro.nome,
          paneleiroEmail: paneleiro.email,
          clienteId: userData.id || userData.uid,
          clienteNome: userData.nome,
          clienteEmail: userData.email,
          clienteTipo: userData.tipoUsuario || 'Cliente',
          clienteIsFoodService: userData.isFoodService === true || userData.isFoodService === 'true', // Adicionar campo isFoodService
          titulo: "Nova solicitação de serviço",
          mensagem: `${userData.nome} solicitou serviços de panela de pressão`,
          servicos: dadosSolicitacao.servicos,
          dataMaximaEntrega: dadosSolicitacao.dataMaximaEntrega,
          tipoEntrega: dadosSolicitacao.tipoEntrega,
          prioridade: dadosSolicitacao.prioridade,
          descricao: dadosSolicitacao.descricao,
          valorEstimado: dadosSolicitacao.valorEstimado,
          quantidadePanelas: dadosSolicitacao.quantidadePanelas || 1, // Adicionar campo quantidadePanelas
          status: 'pendente', // Status da notificação
          lida: false,
          dataCriacao: new Date(),
          dataAtualizacao: new Date(),
          clienteFoto: userData.fotoUrl || './imgs/perfil.png' // USAR FOTO DO CLIENTE DA STRIPE
        };

        console.log(`📝 [DISTRIBUICAO] Dados da notificação para ${paneleiro.nome}:`, notificacaoData);

        // Salvar notificação no Firestore
        const notificacaoRef = await window.db.collection("notificacao_servicos").add(notificacaoData);
        console.log(`✅ [DISTRIBUICAO] Notificação CRIADA com sucesso para ${paneleiro.nome}: ${notificacaoRef.id}`);

        return notificacaoRef.id;
      } catch (error) {
        console.error(`❌ [DISTRIBUICAO] Erro ao criar notificação para ${paneleiro.nome}:`, error);
        return null;
      }
    });

    // Aguardar todas as notificações sejam criadas
    console.log("⏳ [DISTRIBUICAO] Aguardando criação de todas as notificações...");
    const notificacoesIds = await Promise.all(notificacoesPromises);
    const notificacoesCriadas = notificacoesIds.filter(id => id !== null);

    console.log(`🎉 [DISTRIBUICAO] Distribuição concluída: ${notificacoesCriadas.length}/${paneleirosProximos.length} notificações criadas`);
    console.log("📋 [DISTRIBUICAO] IDs das notificações criadas:", notificacoesCriadas);

    return notificacoesCriadas;

  } catch (error) {
    console.error("💥 [DISTRIBUICAO] Erro geral na distribuição:", error);
    throw error;
  }
}

// Buscar notificações do paneleiro
window.buscarNotificacoesPaneleiro = async (paneleiroId) => {
  try {
    const q = window.db.collection("notificacao_servicos").where("paneleiroId", "==", paneleiroId).orderBy("dataCriacao", "desc");
    const querySnapshot = await q.get();
    const notificacoes = [];
    querySnapshot.forEach((doc) => {
      notificacoes.push({ id: doc.id, ...doc.data() });
    });
    return notificacoes;
  } catch (e) {
    console.error('Erro ao buscar notificações do paneleiro:', e);
    return [];
  }
};

// Buscar solicitações do cliente
window.buscarSolicitacoesCliente = async (clienteId) => {
  try {
    const q = window.db.collection("solicitacoes_servico").where("clienteId", "==", clienteId).orderBy("dataCriacao", "desc");
    const querySnapshot = await q.get();
    const solicitacoes = [];
    querySnapshot.forEach((doc) => {
      solicitacoes.push({ id: doc.id, ...doc.data() });
    });
    return solicitacoes;
  } catch (e) {
    console.error('Erro ao buscar solicitações do cliente:', e);
    return [];
  }
};

// Buscar solicitações do paneleiro (todas as solicitações onde ele está envolvido)
window.buscarSolicitacoesPaneleiro = async (paneleiroId) => {
  try {
    console.log('🔍 [buscarSolicitacoesPaneleiro] Buscando solicitações para paneleiro:', paneleiroId);
    // Removido orderBy para evitar erro de índice - ordenação será feita em JavaScript
    const q = window.db.collection("solicitacoes_servico").where("paneleiroId", "==", paneleiroId);
    const querySnapshot = await q.get();
    console.log('📄 [buscarSolicitacoesPaneleiro] Query executada, documentos encontrados:', querySnapshot.size);

    const solicitacoes = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      console.log('📋 [buscarSolicitacoesPaneleiro] Solicitação encontrada:', doc.id, 'Status:', data.status);
      solicitacoes.push({ id: doc.id, ...data });
    });

    // Ordenar por dataCriacao em JavaScript (mais recente primeiro)
    solicitacoes.sort((a, b) => {
      const dataA = new Date(a.dataCriacao || 0);
      const dataB = new Date(b.dataCriacao || 0);
      return dataB - dataA; // Ordem decrescente (mais recente primeiro)
    });

    console.log('✅ [buscarSolicitacoesPaneleiro] Retornando', solicitacoes.length, 'solicitações ordenadas');
    return solicitacoes;
  } catch (e) {
    console.error('❌ [buscarSolicitacoesPaneleiro] Erro ao buscar solicitações do paneleiro:', e);
    return [];
  }
};

// Verificar se a função foi definida corretamente
console.log('🔧 [FIREBASE.JS] Função buscarSolicitacoesPaneleiro definida:', typeof window.buscarSolicitacoesPaneleiro);

// Teste imediato da função
if (typeof window.buscarSolicitacoesPaneleiro === 'function') {
  console.log('✅ [FIREBASE.JS] Função buscarSolicitacoesPaneleiro está funcionando');
} else {
  console.error('❌ [FIREBASE.JS] Função buscarSolicitacoesPaneleiro NÃO está definida');
}

// Atualizar status da solicitação
window.atualizarStatusSolicitacao = async (solicitacaoId, novoStatus, dadosAdicionais = {}) => {
  try {
    const solicitacaoRef = window.db.collection("solicitacoes_servico").doc(solicitacaoId);
    await solicitacaoRef.update({
      status: novoStatus,
      dataAtualizacao: new Date(),
      ...dadosAdicionais
    });
    console.log("Status da solicitação atualizado");
  } catch (e) {
    console.error("Erro ao atualizar status da solicitação: ", e);
    throw e;
  }
};

// Buscar serviços por cliente
window.buscarServicosPorCliente = async (clienteId) => {
  try {
    const q = window.db.collection("servicos").where("clienteId", "==", clienteId).orderBy("dataCriacao", "desc");
    const querySnapshot = await q.get();
    const servicos = [];
    querySnapshot.forEach((doc) => {
      servicos.push({ id: doc.id, ...doc.data() });
    });
    return servicos;
  } catch (e) {
    console.error("Erro ao buscar serviços: ", e);
    throw e;
  }
};

// ===== USUÁRIOS =====

// Salvar usuário
window.salvarUsuario = async (userData) => {
  try {
    const docRef = await window.db.collection("usuarios").add({
      ...userData,
      dataCriacao: new Date(),
      dataCriacaoTimestamp: Date.now(), // Timestamp numérico para consultas
      ativo: true
    });
    console.log("Usuário salvo com ID: ", docRef.id);
    return docRef.id;
  } catch (e) {
    console.error("Erro ao salvar usuário: ", e);
    throw e;
  }
};

// Buscar usuário por email
window.buscarUsuarioPorEmail = async (email) => {
  try {
    const q = window.db.collection("usuarios").where("email", "==", email);
    const querySnapshot = await q.get();
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return { id: doc.id, ...doc.data() };
    }
    return null;
  } catch (e) {
    console.error("Erro ao buscar usuário: ", e);
    throw e;
  }
};



// Buscar solicitações pendentes para paneleiros (via notificações)
window.buscarSolicitacoesPendentes = async () => {
  try {
    // Obter dados do usuário logado
    const userDataRaw = localStorage.getItem("user");
    if (!userDataRaw) {
      console.error('❌ Nenhum usuário logado encontrado no localStorage');
      throw new Error("Usuário não está logado");
    }

    const userData = JSON.parse(userDataRaw);
    console.log('👤 UserData carregado:', userData);

    if (!userData.id) {
      console.error('❌ Usuário não tem ID definido:', userData);
      return [];
    }

    console.log('🔍 Buscando notificações pendentes para paneleiro:', userData.id, 'Tipo:', userData.tipoUsuario);

    // Buscar sem orderBy para não precisar do índice composto
    const q = window.db.collection("notificacao_servicos")
      .where("paneleiroId", "==", userData.id);

    const querySnapshot = await q.get();
    console.log(`📄 Notificações encontradas (todas): ${querySnapshot.size}`);

    const solicitacoes = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      console.log('📋 Notificação:', doc.id, 'Status:', data.status, 'Data:', data.dataCriacao);
      if (data.status === 'pendente') {
        solicitacoes.push({ id: doc.id, ...data });
      }
    });

    console.log(`✅ Filtradas ${solicitacoes.length} solicitações pendentes`);
    return solicitacoes;
  } catch (e) {
    console.error('❌ Erro ao buscar solicitações pendentes:', e);
    return [];
  }
};

// Aceitar solicitação pendente (quando aceita por um paneleiro)
window.aceitarSolicitacaoServico = async (pedidoId) => {
  try {
    // Primeiro obter dados do usuário
    const userDataRaw = localStorage.getItem("user");
    if (!userDataRaw) {
      throw new Error("Usuário não está logado");
    }

    const userData = JSON.parse(userDataRaw);

    // O pedidoId pode ser o ID da notificação ou o ID da solicitação
    // Primeiro, tentar buscar como notificação para obter o solicitacaoId correto
    let solicitacaoId = pedidoId;

    try {
      const notificacaoDoc = await window.db.collection("notificacao_servicos").doc(pedidoId).get();
      if (notificacaoDoc.exists) {
        const notificacaoData = notificacaoDoc.data();
        solicitacaoId = notificacaoData.solicitacaoId || pedidoId;
        console.log(`📋 [ACEITAR] PedidoId ${pedidoId} é uma notificação, solicitacaoId real: ${solicitacaoId}`);
      } else {
        console.log(`📋 [ACEITAR] PedidoId ${pedidoId} não é uma notificação, assumindo que é solicitacaoId`);
      }
    } catch (error) {
      console.log(`📋 [ACEITAR] Erro ao verificar se é notificação, assumindo que ${pedidoId} é solicitacaoId:`, error.message);
    }

    // Atualizar a solicitação principal para aguardando_pagamento
    await window.atualizarStatusSolicitacao(solicitacaoId, 'aguardando_pagamento', {
      paneleiroId: userData.id,
      paneleiroNome: userData.nome || 'Paneleiro',
      paneleiroFoto: userData.fotoUrl || userData.photoURL || userData.foto || './imgs/perfil.png',
      dataAceite: new Date()
    });

    // Buscar todas as notificações desta solicitação
    const notificacoesQuery = window.db.collection("notificacao_servicos")
      .where("solicitacaoId", "==", solicitacaoId);
    const notificacoesSnapshot = await notificacoesQuery.get();

    console.log(`📋 [ACEITAR] Encontradas ${notificacoesSnapshot.size} notificações para solicitação ${solicitacaoId}`);

    // Processar cada notificação - deletar todas, pois a solicitação foi aceita
    const deletePromises = notificacoesSnapshot.docs.map(async (doc) => {
      const notificacaoData = doc.data();

      if (notificacaoData.paneleiroId === userData.id) {
        // Esta é a notificação do paneleiro que aceitou - deletar também
        console.log(`🗑️ [ACEITAR] Removendo notificação do paneleiro que aceitou: ${doc.id}`);
        return doc.ref.delete();
      } else {
        // Esta é uma notificação de outro paneleiro - deletar
        console.log(`🗑️ [ACEITAR] Removendo notificação de outro paneleiro: ${doc.id}`);
        return doc.ref.delete();
      }
    });

    await Promise.all(deletePromises);

    console.log(`🎉 [ACEITAR] Solicitação ${solicitacaoId} aceita com sucesso pelo paneleiro ${userData.id}`);
  } catch (e) {
    console.error('❌ [ACEITAR] Erro ao aceitar solicitação de serviço:', e);
    throw e;
  }
};

// Deletar solicitação pendente (quando aceita por um paneleiro) - LEGACY, manter para compatibilidade
window.deletarSolicitacaoServico = async (solicitacaoId) => {
  try {
    console.warn('⚠️ [LEGACY] deletarSolicitacaoServico chamada - redirecionando para aceitarSolicitacaoServico');
    await window.aceitarSolicitacaoServico(solicitacaoId);
  } catch (e) {
    console.error('Erro ao deletar solicitação de serviço:', e);
    throw e;
  }
};

// ===== AUTENTICAÇÃO =====

// Login
window.loginUsuario = async (email, password) => {
  try {
    const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
    return userCredential.user;
  } catch (e) {
    console.error("Erro no login: ", e);
    throw e;
  }
};

// Cadastro
window.cadastrarUsuario = async (email, password) => {
  try {
    const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
    return userCredential.user;
  } catch (e) {
    console.error("Erro no cadastro: ", e);
    throw e;
  }
};

// Logout
window.logoutUsuario = async () => {
  try {
    await firebase.auth().signOut();
    console.log("Usuário deslogado");
  } catch (e) {
    console.error("Erro no logout: ", e);
    throw e;
  }
};

// Listener de estado de autenticação
window.onAuthStateChange = (callback) => {
  return firebase.auth().onAuthStateChanged(callback);
};

// ===== CONSTANTES =====

// Lista de serviços disponíveis
window.SERVICOS_DISPONIVEIS = [
  'Troca de borracha de panela de pressão',
  'Troca de pino e válvulas de segurança',
  'Troca de trava/pino de trava',
  'Troca de parafusos e rebites',
  'Troca de cabo / alça / pegador',
  'Troca do anel interno',
  'Troca do peso (regulador de pressão)',
  'Troca da tampa',
  'Troca da borboleta / rosca',
  'Reajuste e nivelamento da tampa (assentar tampa)',
  'Regulagem de pressão da panela',
  'Revisão geral da panela de pressão',
  'Desamassar panelas',
  'Recuperar fundo solto / solado da panela',
  'Restauração de panelas antigas',
  'Polimento e limpeza profissional',
  'Remoção de ferrugem (inox)',
  'Ajuste de rosca',
  'Rebitagem'
];

// Valores base dos serviços (preços ajustados para média)
window.VALORES_SERVICOS = {
  'Troca de borracha de panela de pressão': 35.00,
  'Troca de pino e válvulas de segurança': 45.00,
  'Troca de trava/pino de trava': 30.00,
  'Troca de parafusos e rebites': 25.00,
  'Troca de cabo / alça / pegador': 28.00,
  'Troca do anel interno': 32.00,
  'Troca do peso (regulador de pressão)': 38.00,
  'Troca da tampa': 55.00,
  'Troca da borboleta / rosca': 40.00,
  'Reajuste e nivelamento da tampa (assentar tampa)': 50.00,
  'Regulagem de pressão da panela': 35.00,
  'Revisão geral da panela de pressão': 70.00,
  'Desamassar panelas': 60.00,
  'Recuperar fundo solto / solado da panela': 65.00,
  'Restauração de panelas antigas': 90.00,
  'Polimento e limpeza profissional': 45.00,
  'Remoção de ferrugem (inox)': 55.00,
  'Ajuste de rosca': 30.00,
  'Rebitagem': 35.00
};

// Status possíveis dos serviços
window.STATUS_SERVICOS = {
  PENDENTE: 'pendente',
  ACEITO: 'aceito',
  AGENDADO: 'agendado',
  CONCLUIDO: 'concluido',
  CANCELADO: 'cancelado'
};

// ===== CONVERSAS/MENSAGENS =====

// Criar conversa entre cliente e paneleiro
window.criarConversaPedido = async (pedido, motivo = 'negociacao') => {
  try {
    console.log('💬 [CRIAR-CONVERSA] Iniciando criação de conversa para pedido:', pedido.id);

    // Obter dados do usuário logado (paneleiro)
    const userDataRaw = localStorage.getItem("user");
    if (!userDataRaw) {
      throw new Error("Usuário não está logado");
    }

    const paneleiroData = JSON.parse(userDataRaw);
    console.log('👷 Paneleiro logado:', paneleiroData);

    // Verificar se já existe uma conversa para este pedido
    const conversaExistente = await buscarConversaPorPedido(pedido.id);
    if (conversaExistente) {
      console.log('💬 [CRIAR-CONVERSA] Conversa já existe:', conversaExistente.id);
      return conversaExistente.id;
    }

    // Criar nova conversa
    const conversaData = {
      pedidoId: pedido.id,
      clienteId: pedido.clienteId,
      clienteNome: pedido.cliente.nome || 'Cliente',
      clienteFoto: pedido.cliente.avatar || './imgs/perfil.png',
      paneleiroId: paneleiroData.id,
      paneleiroNome: paneleiroData.nome || 'Paneleiro',
      paneleiroFoto: paneleiroData.fotoUrl || './imgs/perfil.png',
      servicos: pedido.servicos || [],
      status: 'ativa',
      motivo: motivo, // 'negociacao', 'aceite', etc.
      ultimaMensagem: '',
      ultimaMensagemData: new Date(),
      dataCriacao: new Date(),
      dataAtualizacao: new Date()
    };

    console.log('💬 [CRIAR-CONVERSA] Dados da conversa:', conversaData);

    // Salvar conversa no Firestore
    const conversaRef = await window.db.collection("conversas").add(conversaData);
    const conversaId = conversaRef.id;

    console.log('✅ [CRIAR-CONVERSA] Conversa criada com sucesso:', conversaId);

    // Não enviar mensagem inicial automática - deixar usuários iniciarem a conversa

    return conversaId;

  } catch (error) {
    console.error('❌ [CRIAR-CONVERSA] Erro ao criar conversa:', error);
    throw error;
  }
};

// Buscar conversa por ID do pedido
async function buscarConversaPorPedido(pedidoId) {
  try {
    const q = window.db.collection("conversas").where("pedidoId", "==", pedidoId);
    const querySnapshot = await q.get();

    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return { id: doc.id, ...doc.data() };
    }
    return null;
  } catch (error) {
    console.error('Erro ao buscar conversa por pedido:', error);
    return null;
  }
}

// Buscar conversas do usuário logado
window.buscarConversasUsuario = async () => {
  try {
    const userDataRaw = localStorage.getItem("user");
    if (!userDataRaw) {
      throw new Error("Usuário não está logado");
    }

    const userData = JSON.parse(userDataRaw);
    const userId = userData.id;

    console.log('💬 [BUSCAR-CONVERSAS] Buscando conversas para usuário:', userId, 'Tipo:', userData.tipoUsuario);

    // Buscar conversas onde o usuário é cliente OU paneleiro
    const conversasCliente = window.db.collection("conversas").where("clienteId", "==", userId);
    const conversasPaneleiro = window.db.collection("conversas").where("paneleiroId", "==", userId);

    const [clienteSnapshot, paneleiroSnapshot] = await Promise.all([
      conversasCliente.get(),
      conversasPaneleiro.get()
    ]);

    const conversas = [];

    // Processar conversas onde usuário é cliente
    clienteSnapshot.forEach(doc => {
      conversas.push({
        id: doc.id,
        ...doc.data(),
        tipoUsuario: 'cliente' // Indica que o usuário atual é o cliente nesta conversa
      });
    });

    // Processar conversas onde usuário é paneleiro
    paneleiroSnapshot.forEach(doc => {
      conversas.push({
        id: doc.id,
        ...doc.data(),
        tipoUsuario: 'paneleiro' // Indica que o usuário atual é o paneleiro nesta conversa
      });
    });

    console.log('💬 [BUSCAR-CONVERSAS] Conversas encontradas:', conversas.length);

    // Ordenar por última mensagem (mais recente primeiro)
    conversas.sort((a, b) => {
      const dataA = a.ultimaMensagemData ? new Date(a.ultimaMensagemData.seconds * 1000) : new Date(0);
      const dataB = b.ultimaMensagemData ? new Date(b.ultimaMensagemData.seconds * 1000) : new Date(0);
      return dataB - dataA;
    });

    return conversas;

  } catch (error) {
    console.error('❌ [BUSCAR-CONVERSAS] Erro ao buscar conversas:', error);
    return [];
  }
};

// Buscar mensagens de uma conversa
window.buscarMensagensConversa = async (conversaId) => {
  try {
    const q = window.db.collection("conversas").doc(conversaId).collection("mensagens")
      .orderBy("dataEnvio", "asc");

    const querySnapshot = await q.get();
    const mensagens = [];

    querySnapshot.forEach(doc => {
      mensagens.push({
        id: doc.id,
        ...doc.data()
      });
    });

    return mensagens;

  } catch (error) {
    console.error('Erro ao buscar mensagens da conversa:', error);
    return [];
  }
};

// Enviar mensagem para uma conversa
window.enviarMensagem = async (conversaId, mensagemTexto) => {
  try {
    const userDataRaw = localStorage.getItem("user");
    if (!userDataRaw) {
      throw new Error("Usuário não está logado");
    }

    const userData = JSON.parse(userDataRaw);

    // Buscar dados da conversa para obter IDs dos participantes
    const conversaDoc = await window.db.collection("conversas").doc(conversaId).get();
    if (!conversaDoc.exists) {
      throw new Error("Conversa não encontrada");
    }

    const conversaData = conversaDoc.data();

    // Criar mensagem
    const mensagemData = {
      texto: mensagemTexto,
      remetenteId: userData.id,
      remetenteNome: userData.nome,
      dataEnvio: new Date(),
      lida: false
    };

    // Salvar mensagem na subcoleção
    const mensagemRef = await window.db.collection("conversas").doc(conversaId)
      .collection("mensagens").add(mensagemData);

    // Atualizar última mensagem da conversa
    await window.db.collection("conversas").doc(conversaId).update({
      ultimaMensagem: mensagemTexto,
      ultimaMensagemData: new Date(),
      dataAtualizacao: new Date()
    });

    console.log('✅ Mensagem enviada:', mensagemRef.id);
    return mensagemRef.id;

  } catch (error) {
    console.error('Erro ao enviar mensagem:', error);
    throw error;
  }
};

// Função auxiliar para enviar mensagem (usada internamente)
async function enviarMensagem(conversaId, remetenteId, mensagemTexto) {
  try {
    // Buscar dados do remetente
    const userDataRaw = localStorage.getItem("user");
    const userData = userDataRaw ? JSON.parse(userDataRaw) : {};

    // Criar mensagem
    const mensagemData = {
      texto: mensagemTexto,
      remetenteId: remetenteId,
      remetenteNome: userData.nome || 'Usuário',
      dataEnvio: new Date(),
      lida: false
    };

    // Salvar mensagem na subcoleção
    const mensagemRef = await window.db.collection("conversas").doc(conversaId)
      .collection("mensagens").add(mensagemData);

    // Atualizar última mensagem da conversa
    await window.db.collection("conversas").doc(conversaId).update({
      ultimaMensagem: mensagemTexto,
      ultimaMensagemData: new Date(),
      dataAtualizacao: new Date()
    });

    return mensagemRef.id;

  } catch (error) {
    console.error('Erro ao enviar mensagem interna:', error);
    throw error;
  }
};

// Enviar mensagem de áudio (usando base64 no Firestore)
window.enviarMensagemAudio = async (conversaId, audioBlob) => {
  try {
    const userDataRaw = localStorage.getItem("user");
    if (!userDataRaw) {
      throw new Error("Usuário não está logado");
    }

    const userData = JSON.parse(userDataRaw);

    // Buscar dados da conversa para obter IDs dos participantes
    const conversaDoc = await window.db.collection("conversas").doc(conversaId).get();
    if (!conversaDoc.exists) {
      throw new Error("Conversa não encontrada");
    }

    const conversaData = conversaDoc.data();

    // Converter blob para base64
    console.log('📤 Convertendo áudio para base64...');
    const base64Audio = await blobToBase64(audioBlob);
    console.log('✅ Áudio convertido para base64, tamanho:', base64Audio.length, 'caracteres');

    // Criar mensagem com o áudio em base64
    const mensagemData = {
      texto: `🎵 Áudio (${(audioBlob.size / 1024).toFixed(1)} KB)`,
      audioBase64: base64Audio,
      audioMimeType: audioBlob.type || 'audio/webm',
      tipo: 'audio',
      remetenteId: userData.id,
      remetenteNome: userData.nome,
      dataEnvio: new Date(),
      lida: false
    };

    // Salvar mensagem na subcoleção
    const mensagemRef = await window.db.collection("conversas").doc(conversaId)
      .collection("mensagens").add(mensagemData);

    // Atualizar última mensagem da conversa
    await window.db.collection("conversas").doc(conversaId).update({
      ultimaMensagem: mensagemData.texto,
      ultimaMensagemData: new Date(),
      dataAtualizacao: new Date()
    });

    console.log('✅ Mensagem de áudio enviada:', mensagemRef.id);
    return mensagemRef.id;

  } catch (error) {
    console.error('Erro ao enviar mensagem de áudio:', error);
    throw error;
  }
};

// Enviar mensagem de imagem (usando base64 no Firestore)
window.enviarMensagemImagem = async (conversaId, base64Data, mimeType, fileName, caption = '') => {
  try {
    const userDataRaw = localStorage.getItem("user");
    if (!userDataRaw) {
      throw new Error("Usuário não está logado");
    }

    const userData = JSON.parse(userDataRaw);

    // Buscar dados da conversa para obter IDs dos participantes
    const conversaDoc = await window.db.collection("conversas").doc(conversaId).get();
    if (!conversaDoc.exists) {
      throw new Error("Conversa não encontrada");
    }

    const conversaData = conversaDoc.data();

    console.log('📤 Enviando imagem...', caption ? `com legenda: ${caption}` : 'sem legenda');

    // Criar mensagem com a imagem em base64
    const mensagemData = {
      texto: caption ? `📷 ${caption}` : `📷 Imagem enviada`,
      imagemBase64: base64Data,
      imagemMimeType: mimeType,
      nomeArquivo: fileName,
      legenda: caption,
      tipo: 'imagem',
      remetenteId: userData.id,
      remetenteNome: userData.nome,
      dataEnvio: new Date(),
      lida: false
    };

    // Salvar mensagem na subcoleção
    const mensagemRef = await window.db.collection("conversas").doc(conversaId)
      .collection("mensagens").add(mensagemData);

    // Atualizar última mensagem da conversa
    await window.db.collection("conversas").doc(conversaId).update({
      ultimaMensagem: mensagemData.texto,
      ultimaMensagemData: new Date(),
      dataAtualizacao: new Date()
    });

    console.log('✅ Mensagem de imagem enviada:', mensagemRef.id);
    return mensagemRef.id;

  } catch (error) {
    console.error('Erro ao enviar mensagem de imagem:', error);
    throw error;
  }
};

// Função auxiliar para converter blob para base64
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      // Remove o prefixo "data:audio/webm;base64," e retorna apenas o base64
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Tipos de usuário
window.TIPOS_USUARIO = {
  CLIENTE: 'Cliente',
  PANELEIRO: 'Paneleiro',
  FOOD_SERVICE: 'Food Service'
};
