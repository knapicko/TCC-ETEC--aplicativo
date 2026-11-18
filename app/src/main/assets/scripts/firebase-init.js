// Inicialização do Firebase compatível com WebView
// Firebase v9 - Inicialização direta
(function() {
  console.log("🚀 [FIREBASE-INIT] Inicializando Firebase...");

  // Configuração do Firebase carregada do arquivo local ignorado pelo Git
  const firebaseConfig = window.firebaseConfig;
  if (!firebaseConfig || !firebaseConfig.apiKey || !firebaseConfig.projectId) {
    console.error('Firebase local config missing. See README.md.');
    return;
  }

  // Inicializar Firebase
  try {
    const app = firebase.initializeApp(firebaseConfig);
    console.log("✅ Firebase inicializado com sucesso");

    // Inicializar serviços
    window.db = firebase.firestore();
    window.rtdb = firebase.database();
    window.firestoreCollection = firebase.firestore;

    console.log("✅ Serviços Firebase inicializados");
  } catch (error) {
    console.error("❌ Erro ao inicializar Firebase:", error);
    return; // Não continuar se Firebase falhar
  }

  // Definir funções após Firebase estar pronto
  try {
    console.log("Firebase v9 detectado - definindo funções globais");

    // Definir funções Firebase globalmente
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
        console.log("🔍 [SALVAR-SOLICITACAO] Usuário logado:", userData);

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

    // Função privada para distribuir solicitação para paneleiros próximos
    async function distribuirSolicitacaoParaPaneleiros(solicitacaoId, dadosSolicitacao, userData) {
      try {
        console.log("🏭 [DISTRIBUICAO] Início - Solicitação ID:", solicitacaoId);

        // Buscar paneleiros próximos (usando Realtime Database)
        let paneleirosProximos = [];

        // Buscar paneleiros do Realtime Database
        if (paneleirosProximos.length === 0) {
          try {
            console.log("🔥 [DISTRIBUICAO] Buscando paneleiros no Realtime Database...");

            // Buscar todos os usuários do Realtime Database
            const usuariosRef = window.rtdb.ref('usuarios');
            const snapshot = await usuariosRef.once('value');

            if (snapshot.exists()) {
              const usuarios = snapshot.val();
              console.log("🔥 [DISTRIBUICAO] Dados brutos do RTDB:", usuarios);

              const totalUsuarios = Object.keys(usuarios).length;
              console.log("🔥 [DISTRIBUICAO] Total de usuários no RTDB:", totalUsuarios);

              Object.entries(usuarios).forEach(([userId, userData]) => {
                console.log("🔥 [DISTRIBUICAO] Usuário encontrado:", userId, userData.nome, userData.tipoUsuario, userData.email);

                // Verificar se é paneleiro (aceitar tanto "Paneleiro" quanto "paneleiro")
                if (userData.tipoUsuario === "Paneleiro" || userData.tipoUsuario === "paneleiro") {
                  console.log("🔥 [DISTRIBUICAO] Paneleiro encontrado:", userId, userData.nome, userData.tipoUsuario);
                  paneleirosProximos.push({
                    id: userId,
                    nome: userData.nome,
                    email: userData.email,
                    fotoUrl: userData.fotoUrl,
                    avaliacao: userData.avaliacao || "4.5"
                  });
                }
              });

              console.log("🔥 [DISTRIBUICAO] Paneleiros encontrados no RTDB:", paneleirosProximos.length);
            } else {
              console.log("🔥 [DISTRIBUICAO] Nenhum usuário encontrado no RTDB");
            }
          } catch (error) {
            console.error("🔥 [DISTRIBUICAO] Erro ao buscar paneleiros do RTDB:", error);
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
              clienteId: userData.id || userData.uid,
              clienteNome: userData.nome,
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
        console.error('Erro ao buscar notificações:', e);
        return [];
      }
    };

    // Buscar solicitações pendentes (para paneleiros)
    window.buscarSolicitacoesPendentes = async () => {
      try {
        console.log('🔍 [BUSCAR-PENDENTES] Buscando solicitações pendentes...');

        // Buscar do Firestore
        const q = window.db.collection("solicitacoes_servico").where("status", "==", "pendente");
        const querySnapshot = await q.get();

        const solicitacoes = [];
        querySnapshot.forEach((doc) => {
          solicitacoes.push({ id: doc.id, ...doc.data() });
        });

        console.log(`✅ [BUSCAR-PENDENTES] Encontradas ${solicitacoes.length} solicitações pendentes`);
        return solicitacoes;
      } catch (e) {
        console.error('❌ [BUSCAR-PENDENTES] Erro ao buscar solicitações pendentes:', e);
        return [];
      }
    };

    // Buscar solicitações do cliente
    window.buscarSolicitacoesCliente = async (clienteId) => {
      console.log('🔬 DEBUG TOTAL FIRESTORE PARA:', clienteId);

      try {
        // PRIMEIRO: Verificar se Firebase está conectado
        console.log('🔗 Firebase conectado?', !!window.db);
        console.log('🔗 Firebase Firestore disponível?', typeof window.firebase !== 'undefined' && window.firebase.firestore);

        // SEGUNDO: Listar TODAS as coleções disponíveis
        console.log('📚 Buscando lista de coleções disponíveis...');

        let colectionsList = [];
        try {
          const collections = await window.db.listCollections();
          console.log('📚 Collections encontradas:', collections.length);

          collections.forEach(col => {
            colectionsList.push(col.id);
            console.log('   📂 Coleção:', col.id);
          });
        } catch (listError) {
          console.log('⚠️ Não conseguiu listar coleções (pode ser normal):', listError.message);
          console.log('📚 Tentativa manual de coleções conhecidas...');
          colectionsList = ['solicitacoes_servico', 'solicitacoes', 'servicos', 'pedidos'];
        }

        // TERCEIRO: Tentar acessar cada coleção e listar TODOS os documentos
        const allData = {};

        for (const collectionId of colectionsList) {
          try {
            console.log(`\n🎯 EXAMINANDO COLEÇÃO: ${collectionId}`);
            const collectionRef = window.db.collection(collectionId);
            const snapshot = await collectionRef.get();

            console.log(`   📊 ${collectionId}: ${snapshot.size} documentos encontrados`);

            if (snapshot.size > 0) {
              let docCounter = 0;
              const docsInCollection = [];

              snapshot.forEach((doc) => {
                docCounter++;
                const docData = doc.data();

                console.log(`   🎯 DOC ${docCounter}: ID="${doc.id}"`);
                console.log(`      Dados:`, JSON.stringify(docData, null, 2));

                docsInCollection.push({
                  id: doc.id,
                  ...docData
                });

                // Verificar se este documento é do nosso cliente
                if (docData.clienteId === clienteId) {
                  console.log(`      ✅ PERTENCE AO CLIENTE! 🎯`);
                } else {
                  console.log(`      ❌ Não é do cliente (clienteId: ${docData.clienteId})`);
                }
              });

              allData[collectionId] = docsInCollection;
              console.log(`   ✅ Coleção ${collectionId} examinada com sucesso!`);
            } else {
              console.log(`   ℹ️ Coleção ${collectionId} está vazia`);
            }

          } catch (collectionError) {
            console.log(`   ❌ ERRO na coleção ${collectionId}:`, collectionError.message);
          }
        }

        // QUARTO: Fazer busca específica na coleção que provavelmente tem os dados
        console.log('\n🎯 FAZENDO BUSCA ESPECÍFICA...');

        let finalResult = [];

        // Priorizar solicitacoes_servico
        if (allData['solicitacoes_servico'] && allData['solicitacoes_servico'].length > 0) {
          console.log('📂 Usando solicitacoes_servico (prioridade)');
          const solicitacoes = allData['solicitacoes_servico'];

          finalResult = solicitacoes.filter(doc => doc.clienteId === clienteId);
          console.log(`🎯 Filtro cliente aplicado. Resultado: ${finalResult.length} documentos`);
        } else {
          // Tentar outras coleções
          console.log('🔄 solicitacoes_servico vazia ou inexistente. Tentando outras coleções...');

          for (const [collectionName, docs] of Object.entries(allData)) {
            if (docs && docs.length > 0) {
              console.log(`🔍 Verificando coleção: ${collectionName}`);
              const filtered = docs.filter(doc => doc.clienteId === clienteId);

              if (filtered.length > 0) {
                console.log(`   ✅ Encontrou ${filtered.length} documentos em ${collectionName}!`);
                finalResult = filtered;
                break;
              }
            }
          }
        }

        console.log('\n🏆 RESULTADO FINAL:');
        console.log(`   Cliente procurado: ${clienteId}`);
        console.log(`   Documentos encontrados: ${finalResult.length}`);
        console.log(`   Dados:`, finalResult);

        return finalResult;

      } catch (fatalError) {
        console.error('💥 ERRO TOTAL DO FIRESTORE:', fatalError);
        console.error('Tipo:', fatalError.constructor.name);
        console.error('Mensagem:', fatalError.message);
        console.error('Stack:', fatalError.stack);

        return [];
      }
    };

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
        console.error("Erro ao atualizar status:", e);
        throw e;
      }
    };

    // ===== CONVERSAS/MENSAGENS =====

    // Criar conversa entre cliente e paneleiro
    window.criarConversaPedido = async (pedido, motivo = 'negociacao') => {
      try {
        console.log('💬 [CRIAR-CONVERSA] Iniciando criação de conversa para pedido:', pedido.id);

        // Obter dados do usuário logado
        const userDataRaw = localStorage.getItem("user");
        if (!userDataRaw) {
          throw new Error("Usuário não está logado");
        }

        const userData = JSON.parse(userDataRaw);
        console.log('👤 Usuário logado:', userData);

        // Verificar se já existe uma conversa para este pedido
        const conversaExistente = await buscarConversaPorPedido(pedido.id);
        if (conversaExistente) {
          console.log('💬 [CRIAR-CONVERSA] Conversa já existe:', conversaExistente.id);
          return conversaExistente.id;
        }

        // Determinar se o usuário logado é cliente ou paneleiro
        const isCliente = userData.id === pedido.clienteId;
        const isPaneleiro = userData.id === pedido.paneleiroId;

        if (!isCliente && !isPaneleiro) {
          throw new Error("Usuário logado não é participante deste pedido");
        }

        // Criar nova conversa
        const conversaData = {
          pedidoId: pedido.id,
          clienteId: pedido.clienteId,
          clienteNome: pedido.cliente ? pedido.cliente.nome || 'Cliente' : 'Cliente',
          clienteFoto: pedido.cliente ? pedido.cliente.avatar || './imgs/perfil.png' : './imgs/perfil.png',
          paneleiroId: pedido.paneleiroId,
          paneleiroNome: pedido.paneleiroNome || 'Paneleiro',
          paneleiroFoto: pedido.paneleiroFoto || './imgs/perfil.png',
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

        // NÃO criar mensagem inicial automática - deixar conversa vazia

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

    // ===== DATA DE CRIAÇÃO DA CONTA =====

    // Salvar data de criação da conta no Realtime Database
    window.salvarDataCriacaoUsuario = async (userId, dataCriacao = null) => {
      try {
        console.log('💾 [DATA-CRIACAO] Salvando data de criação para usuário:', userId);

        const dataParaSalvar = dataCriacao || {
          dataCriacao: new Date().toISOString(),
          timestamp: Date.now(),
          dataFormatada: new Date().toLocaleString('pt-BR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          })
        };

        // Salvar no Realtime Database usando window.rtdb
        await window.rtdb.ref(`usuarios/${userId}/conta`).set(dataParaSalvar);

        console.log('✅ [DATA-CRIACAO] Data de criação salva com sucesso:', dataParaSalvar);
        return dataParaSalvar;

      } catch (error) {
        console.error('❌ [DATA-CRIACAO] Erro ao salvar data de criação:', error);
        return null;
      }
    };

    // Buscar data de criação da conta do usuário no Realtime Database
    window.buscarDataCriacaoUsuario = async (userId) => {
      try {
        console.log('🔍 [DATA-CRIACAO] Buscando data de criação para usuário:', userId);

        const snapshot = await window.rtdb.ref(`usuarios/${userId}/conta`).once('value');

        if (!snapshot.exists()) {
          console.warn('⚠️ [DATA-CRIACAO] Dados da conta não encontrados para usuário:', userId);
          return null;
        }

        const contaData = snapshot.val();
        const dataCriacao = contaData.dataCriacao || contaData.timestamp;

        if (!dataCriacao) {
          console.warn('⚠️ [DATA-CRIACAO] Campo dataCriacao não encontrado para usuário:', userId);
          return null;
        }

        // Formatar data de criação
        let dataFormatada;
        let timestamp;

        if (typeof dataCriacao === 'number') {
          // É um timestamp numérico
          timestamp = dataCriacao;
          dataFormatada = new Date(timestamp).toLocaleString('pt-BR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          });
        } else if (typeof dataCriacao === 'string') {
          // É uma string de data
          const dateObj = new Date(dataCriacao);
          dataFormatada = dateObj.toLocaleString('pt-BR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          });
          timestamp = dateObj.getTime();
        } else {
          console.warn('⚠️ [DATA-CRIACAO] Formato de data não reconhecido:', dataCriacao);
          return null;
        }

        const resultado = {
          dataCriacao: dataFormatada,
          timestamp: timestamp,
          dataISO: new Date(timestamp).toISOString(),
          diasDesdeCriacao: Math.floor((Date.now() - timestamp) / (1000 * 60 * 60 * 24)),
          ...contaData // Incluir outros dados da conta se existirem
        };

        console.log('✅ [DATA-CRIACAO] Data de criação encontrada:', resultado);
        return resultado;

      } catch (error) {
        console.error('❌ [DATA-CRIACAO] Erro ao buscar data de criação:', error);
        return null;
      }
    };

    // Buscar data de criação da conta do usuário logado
    window.buscarDataCriacaoUsuarioLogado = async () => {
      try {
        const userDataRaw = localStorage.getItem("user");
        if (!userDataRaw) {
          throw new Error("Usuário não está logado");
        }

        const userData = JSON.parse(userDataRaw);
        if (!userData.id) {
          throw new Error("ID do usuário não encontrado");
        }

        return await window.buscarDataCriacaoUsuario(userData.id);

      } catch (error) {
        console.error('❌ [DATA-CRIACAO] Erro ao buscar data de criação do usuário logado:', error);
        return null;
      }
    };

    // ===== CONSTANTS =====

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

    console.log("Funções Firebase definidas globalmente, incluindo data de criação");

  } catch (error) {
    console.error("Erro ao inicializar Firebase:", error);
  }
})();
