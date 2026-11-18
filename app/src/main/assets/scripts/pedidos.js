// JavaScript principal para página de pedidos - Versão Simplificada

// ================= FUNÇÕES DE ALERTA PADRONIZADAS =================
function showAlert(msg) {
    const alerta = document.createElement("div");
    alerta.textContent = msg;
    Object.assign(alerta.style, {
        position: "fixed",
        top: "20px",
        left: "50%",
        transform: "translateX(-50%)",
        backgroundColor: "#ff4d4f",
        color: "white",
        padding: "15px 20px",
        borderRadius: "10px",
        boxShadow: "0 4px 10px rgba(0,0,0,0.2)",
        zIndex: 9999,
        fontFamily: "Poppins, sans-serif"
    });
    document.body.appendChild(alerta);
    setTimeout(() => alerta.remove(), 4000);
}

function showSuccessAlert(msg) {
    const alerta = document.createElement("div");
    alerta.textContent = msg;
    Object.assign(alerta.style, {
        position: "fixed",
        top: "20px",
        left: "50%",
        transform: "translateX(-50%)",
        backgroundColor: "#4CAF50",
        color: "white",
        padding: "15px 20px",
        borderRadius: "10px",
        boxShadow: "0 4px 10px rgba(0,0,0,0.2)",
        zIndex: 9999,
        fontFamily: "Poppins, sans-serif"
    });
    document.body.appendChild(alerta);
    setTimeout(() => alerta.remove(), 4000);
}

// Variáveis globais - inicializadas adequadamente
let pedidos = [];
let currentTab = 'recebidos';
let userType = 'Cliente';
let currentPedido = null;
let userData = null;
let firebaseEnabled = false;
let sincronizandoCloud = false;

// Valores dos serviços (para cálculo)
const VALORES_SERVICOS = {
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
    'Revisão geral da panela de pressão': 70.00
};

// Função para compactar nomes de serviços similares
function compactarServicos(servicos) {
    if (!Array.isArray(servicos) || servicos.length === 0) return [];

    // Mapeamento de compactação
    const mapeamentoCompacto = {
        'Troca de borracha de panela de pressão': 'Troca de borracha',
        'Troca de pino e válvulas de segurança': 'Troca de pino/válvulas',
        'Troca de trava/pino de trava': 'Troca de trava',
        'Troca de parafusos e rebites': 'Troca de parafusos/rebites',
        'Troca de cabo / alça / pegador': 'Troca de cabo/alça',
        'Troca do anel interno': 'Troca do anel',
        'Troca do peso (regulador de pressão)': 'Troca do peso',
        'Troca da tampa': 'Troca da tampa',
        'Troca da borboleta / rosca': 'Troca da borboleta/rosca',
        'Reajuste e nivelamento da tampa (assentar tampa)': 'Reajuste da tampa',
        'Regulagem de pressão da panela': 'Regulagem de pressão',
        'Revisão geral da panela de pressão': 'Revisão geral'
    };

    // Aplicar mapeamento
    return servicos.map(servico => {
        const compactado = mapeamentoCompacto[servico];
        return compactado || servico;
    });
}

// Inicializar página de forma robusta
function initializeServicosPage() {
    try {
        // Verificar Firebase de forma segura
        checkFirebaseIntegration();

        // Carregar dados do usuário com fallback
        loadDadosUsuario();

        // Configurar interface baseada no usuário
        loadUserType();

        // Configurar componentes com verificações
        setupTabs();
        setupModals();
        setupNavigation();
        setupSwipeGestures();

        // Carregar dados de forma assíncrona
        loadPedidos().then(() => {
            // Verificar se há um pedido específico para abrir (vindo das mensagens)
            verificarPedidoParaAbrir();
        }).catch(console.error);

    } catch (initError) {
        console.error('❌ Erro na inicialização:', initError);
        mostrarErroSistema('Erro ao inicializar a página. Funcionalidades básicas disponíveis.');
    }
}

// Verificar integração Firebase
function checkFirebaseIntegration() {
  try {
    const hasFirebase = typeof window.firebase !== 'undefined';
    const hasDb = typeof window.db !== 'undefined';
    const hasClienteFunc = typeof window.buscarSolicitacoesCliente === 'function';
    const hasPaneleiroFunc = typeof window.buscarNotificacoesPaneleiro === 'function';

    firebaseEnabled = hasFirebase && hasDb && hasClienteFunc && hasPaneleiroFunc;
  } catch (e) {
    firebaseEnabled = false;
    console.error('❌ Erro na verificação Firebase:', e);
  }
}

// Carregar dados do usuário de forma segura
function loadDadosUsuario() {
    try {
        if (typeof localStorage !== 'undefined' && localStorage) {
            const data = localStorage.getItem('user');
            if (data && typeof data === 'string') {
                const parsed = JSON.parse(data);
                if (parsed && typeof parsed === 'object') {
                    userData = parsed;
                    return;
                }
            }
        }
        console.warn('⚠️ localStorage indisponível ou usuário não encontrado');
        userData = {};
    } catch (e) {
        console.warn('❌ Erro ao acessar localStorage:', e.message);
        userData = {};
    }
}

// Configurar tipo de usuário e interface
function loadUserType() {
    try {
        if (userData && typeof userData === 'object') {
            userType = userData.tipoUsuario || userData.tipo || 'Cliente';
        } else {
            userType = 'Cliente';
        }

        console.log('👷 Tipo de usuário:', userType);

        // Configurar abas baseado no tipo de usuário
        const tabsPaneleiro = document.getElementById('tabsPaneleiro');
        const tabsCliente = document.getElementById('tabsCliente');

        if (userType === 'Paneleiro' || userType === 'paneleiro') {
            if (tabsPaneleiro) tabsPaneleiro.style.display = 'flex';
            if (tabsCliente) tabsCliente.style.display = 'none';
            currentTab = 'recebidos';
        } else {
            if (tabsCliente) tabsCliente.style.display = 'flex';
            if (tabsPaneleiro) tabsPaneleiro.style.display = 'none';
            currentTab = 'enviados';
        }

        updateActiveTab();

        // Criar botão "Solicitar Serviço" apenas para clientes
        if (userType === 'Cliente' || userType === 'cliente') {
            // Verificar se o botão já existe para evitar duplicatas
            const existingButton = document.querySelector('.request-service-fixed-btn');
            if (!existingButton) {
                const buttonWrapper = document.createElement('div');
                buttonWrapper.className = 'request-service-fixed-wrapper';
                buttonWrapper.innerHTML = `<button class="request-service-fixed-btn" onclick="abrirNovoPedidoModal()">Solicitar Serviço</button>`;
                document.body.appendChild(buttonWrapper);
            }
        }

    } catch (e) {
        console.warn('⚠️ Erro ao configurar tipo de usuário:', e);
        userType = 'Cliente';
        currentTab = 'enviados';
    }
}

// Carregar pedidos
async function loadPedidos() {
    try {
        const pedidosSalvos = localStorage.getItem('pedidos');
        pedidos = pedidosSalvos ? JSON.parse(pedidosSalvos) : [];

        if (firebaseEnabled) {
            try {
                await syncPedidosFirebase();
            } catch (error) {
                console.warn('Erro na sincronização Firebase:', error);
            }
        }

        renderPedidos();
    } catch (error) {
        console.error('Erro ao carregar pedidos:', error);
        pedidos = [];
        renderPedidos();
    }
}

// Sincronizar pedidos do Firebase
async function syncPedidosFirebase() {
    if (!userData || !userData.id) return false;

    try {
        let firebasePedidos = [];
        console.log('🔄 [SYNC] Iniciando sincronização para userType:', userType, 'userId:', userData.id);

        if (userType === 'Paneleiro' || userType === 'paneleiro') {
            console.log('👷 [SYNC] Usuário é paneleiro, buscando notificações pendentes e solicitações aceitas...');

            // 1. Buscar notificações pendentes (pedidos recebidos)
            if (typeof window.buscarSolicitacoesPendentes === 'function') {
                console.log('🔍 [SYNC] Buscando notificações pendentes...');
                const notificacoes = await window.buscarSolicitacoesPendentes();
                console.log('📋 [SYNC] Notificações pendentes encontradas:', notificacoes?.length || 0);
                if (notificacoes && Array.isArray(notificacoes)) {
                    const pedidosRecebidos = notificacoes.map(not => mapearNotificacaoParaPedido(not)).filter(p => p !== null);
                    firebasePedidos.push(...pedidosRecebidos);
                    console.log('✅ [SYNC] Pedidos recebidos mapeados:', pedidosRecebidos.length);
                }
            }

            // 2. Buscar solicitações aceitas pelo paneleiro (pedidos agendados)
            if (typeof window.buscarSolicitacoesPaneleiro === 'function') {
                console.log('🔍 [SYNC] Buscando solicitações aceitas pelo paneleiro...');
                const solicitacoesAceitas = await window.buscarSolicitacoesPaneleiro(userData.id);
                console.log('📋 [SYNC] Solicitações aceitas encontradas:', solicitacoesAceitas?.length || 0);
                if (solicitacoesAceitas && Array.isArray(solicitacoesAceitas)) {
                    // Filtrar apenas solicitações aceitas/agendadas/concluídas
                    const pedidosAgendados = solicitacoesAceitas
                        .filter(sol => ['aguardando_pagamento', 'agendado', 'aguardando_entrega', 'concluido'].includes(sol.status))
                        .map(sol => mapearSolicitacaoParaPedido(sol))
                        .filter(p => p !== null);
                    firebasePedidos.push(...pedidosAgendados);
                    console.log('✅ [SYNC] Pedidos agendados mapeados:', pedidosAgendados.length);
                }
            }

            console.log('📊 [SYNC] Total de pedidos do paneleiro:', firebasePedidos.length);
        } else {
            console.log('👤 [SYNC] Usuário é cliente, buscando solicitações...');
            // Para clientes, buscar suas solicitações
            if (typeof window.buscarSolicitacoesCliente === 'function') {
                const solicitacoes = await window.buscarSolicitacoesCliente(userData.id);
                console.log('📋 [SYNC] Solicitações encontradas para cliente:', solicitacoes?.length || 0);
                if (solicitacoes && Array.isArray(solicitacoes)) {
                    firebasePedidos = solicitacoes.map(sol => mapearSolicitacaoParaPedido(sol)).filter(p => p !== null);
                }
            }
        }

        // Sincronização bidirecional
        const firebasePedidosMap = new Map();
        firebasePedidos.forEach(firebasePedido => {
            if (firebasePedido && firebasePedido.id) {
                firebasePedidosMap.set(firebasePedido.id, firebasePedido);
            }
        });

        pedidos = pedidos.filter(localPedido => {
            if (!localPedido || !localPedido.id) return false;
            if (firebasePedidosMap.has(localPedido.id)) {
                const firebaseVersion = firebasePedidosMap.get(localPedido.id);
                Object.assign(localPedido, firebaseVersion);
                return true;
            }
            return false;
        });

        firebasePedidos.forEach(firebasePedido => {
            if (firebasePedido && firebasePedido.id) {
                const jaExisteLocal = pedidos.some(p => p && p.id === firebasePedido.id);
                if (!jaExisteLocal) {
                    pedidos.push(firebasePedido);
                }
            }
        });

        localStorage.setItem('pedidos', JSON.stringify(pedidos));
        return true;

    } catch (syncError) {
        console.error('Erro geral na sincronização:', syncError.message);
        return false;
    }
}

// Função auxiliar para mostrar erros
function mostrarErroSistema(mensagem) {
    console.error('💥 ERRO DO SISTEMA:', mensagem);
    try {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #dc3545;
            color: white;
            padding: 15px;
            border-radius: 8px;
            z-index: 10000;
            max-width: 300px;
        `;
        notification.innerHTML = `<strong>Erro:</strong><br>${mensagem}`;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 5000);
    } catch (e) {
        console.warn('⚠️ Não foi possível mostrar notificação visual');
    }
}

// Mapear solicitação para formato de pedido
function mapearSolicitacaoParaPedido(solicitacao) {
    if (!solicitacao || typeof solicitacao !== 'object') return null;

    const nomeCliente = solicitacao.clienteNome || 'Cliente';
    const avatar = './imgs/perfil.png';

    let dataCriacaoFormatada;
    try {
        if (solicitacao.dataCriacao) {
            if (solicitacao.dataCriacao.toDate) {
                dataCriacaoFormatada = solicitacao.dataCriacao.toDate().toISOString();
            } else if (typeof solicitacao.dataCriacao === 'string') {
                dataCriacaoFormatada = new Date(solicitacao.dataCriacao).toISOString();
            } else {
                dataCriacaoFormatada = new Date().toISOString();
            }
        } else {
            dataCriacaoFormatada = new Date().toISOString();
        }
    } catch (dateError) {
        dataCriacaoFormatada = new Date().toISOString();
    }

    let pedidoId = solicitacao.id;
    if (solicitacao.solicitacaoId && userType === 'Paneleiro') {
        pedidoId = solicitacao.solicitacaoId;
    }

    let descricao = solicitacao.descricao || solicitacao.mensagem || '';

    return {
        id: pedidoId || '',
        tipo: userType === 'Paneleiro' ? 'recebido' : 'enviado',
        status: solicitacao.status || 'pendente',
        cliente: {
            nome: nomeCliente,
            avatar: solicitacao.clienteFoto || avatar,
            tipo: solicitacao.clienteTipo || 'Cliente',
            isFoodService: !!solicitacao.clienteIsFoodService && solicitacao.clienteIsFoodService !== 'false' && solicitacao.clienteIsFoodService !== false // Adicionar campo isFoodService
        },
        clienteId: solicitacao.clienteId || '',
        paneleiroId: solicitacao.paneleiroId || '',
        paneleiroNome: solicitacao.paneleiroNome || '',
        paneleiroFoto: solicitacao.paneleiroFoto || '',
        servicos: Array.isArray(solicitacao.servicos) ? solicitacao.servicos : [],
        descricao: solicitacao.descricao || solicitacao.mensagem || '',
        endereco: solicitacao.endereco || '',
        tipoEntrega: solicitacao.tipoEntrega || 'buscar',
        prioridade: solicitacao.prioridade || 'Normal',
        valor: parseFloat(solicitacao.valor || solicitacao.valorEstimado || 0) || 0,
        quantidadePanelas: parseInt(solicitacao.quantidadePanelas) || 1, // Adicionar campo quantidadePanelas
        dataCriacao: dataCriacaoFormatada,
        dataMaximaEntrega: solicitacao.dataMaximaEntrega,
        metodoPagamento: solicitacao.metodoPagamento || null,
        // Campos de avaliação
        avaliacaoCliente: solicitacao.avaliacaoCliente ? parseInt(solicitacao.avaliacaoCliente) : null,
        comentarioAvaliacao: solicitacao.comentarioAvaliacao || null,
        dataAvaliacao: solicitacao.dataAvaliacao ? new Date(solicitacao.dataAvaliacao.seconds ? solicitacao.dataAvaliacao.seconds * 1000 : solicitacao.dataAvaliacao).toISOString() : null
    };
}

// Mapear notificação para formato de pedido (para paneleiros)
function mapearNotificacaoParaPedido(notificacao) {
    if (!notificacao || typeof notificacao !== 'object') return null;

    const nomeCliente = notificacao.clienteNome || 'Cliente';
    const avatar = './imgs/perfil.png';

    let dataCriacaoFormatada;
    try {
        if (notificacao.dataCriacao) {
            if (notificacao.dataCriacao.toDate) {
                dataCriacaoFormatada = notificacao.dataCriacao.toDate().toISOString();
            } else if (typeof notificacao.dataCriacao === 'string') {
                dataCriacaoFormatada = new Date(notificacao.dataCriacao).toISOString();
            } else {
                dataCriacaoFormatada = new Date().toISOString();
            }
        } else {
            dataCriacaoFormatada = new Date().toISOString();
        }
    } catch (dateError) {
        dataCriacaoFormatada = new Date().toISOString();
    }

    return {
        id: notificacao.solicitacaoId || notificacao.id || '',
        tipo: 'recebido', // Sempre 'recebido' para paneleiros
        status: notificacao.status || 'pendente',
        cliente: {
            nome: nomeCliente,
            avatar: notificacao.clienteFoto || avatar,
            tipo: notificacao.clienteTipo || 'Cliente',
            isFoodService: !!notificacao.clienteIsFoodService && notificacao.clienteIsFoodService !== 'false' && notificacao.clienteIsFoodService !== false
        },
        clienteId: notificacao.clienteId || '',
        paneleiroId: notificacao.paneleiroId || '',
        paneleiroNome: notificacao.paneleiroNome || '',
        paneleiroFoto: notificacao.paneleiroFoto || '',
        servicos: Array.isArray(notificacao.servicos) ? notificacao.servicos : [],
        descricao: notificacao.descricao || notificacao.mensagem || '',
        endereco: notificacao.endereco || '',
        tipoEntrega: notificacao.tipoEntrega || 'buscar',
        prioridade: notificacao.prioridade || 'Normal',
        valor: parseFloat(notificacao.valor || notificacao.valorEstimado || 0) || 0,
        quantidadePanelas: parseInt(notificacao.quantidadePanelas) || 1,
        dataCriacao: dataCriacaoFormatada,
        dataMaximaEntrega: notificacao.dataMaximaEntrega,
        // Campos específicos da notificação
        notificacaoId: notificacao.id,
        titulo: notificacao.titulo || '',
        lida: notificacao.lida || false,
        // Campos de avaliação
        avaliacaoCliente: notificacao.avaliacaoCliente ? parseInt(notificacao.avaliacaoCliente) : null,
        comentarioAvaliacao: notificacao.comentarioAvaliacao || null,
        dataAvaliacao: notificacao.dataAvaliacao ? new Date(notificacao.dataAvaliacao.seconds ? notificacao.dataAvaliacao.seconds * 1000 : notificacao.dataAvaliacao).toISOString() : null
    };
}

// Calcular contadores para todas as abas
function calcularContadoresAbas() {
    const contadores = {
        recebidos: 0,
        enviados: 0,
        agendados: 0,
        historico: 0
    };

    pedidos.forEach(pedido => {
        if (!pedido) return;

        // Contar pedidos recebidos (paneleiro) - apenas pedidos pendentes que não foram aceitos
        if (pedido.tipo === 'recebido' && pedido.status === 'pendente') {
            contadores.recebidos++;
        }

        // Contar pedidos enviados (cliente) - pedidos pendentes/aguardando_pagamento
        if (pedido.tipo === 'enviado' && !['concluido', 'cancelado'].includes(pedido.status)) {
            contadores.enviados++;
        }

        // Contar pedidos agendados
        if (pedido.status === 'agendado' || pedido.status === 'aguardando_pagamento' || pedido.status === 'aguardando_entrega') {
            contadores.agendados++;
        }

        // Contar pedidos históricos
        if (['concluido', 'cancelado', 'reembolsado'].includes(pedido.status)) {
            contadores.historico++;
        }
    });

    return contadores;
}

// Atualizar textos das abas com contadores
function atualizarContadoresAbas(contadores) {
    try {
        // Para paneleiros
        const recebidosBtn = document.querySelector('#tabsPaneleiro [data-tab="recebidos"]');
        const agendadosBtn = document.querySelector('#tabsPaneleiro [data-tab="agendados"]');
        const historicoBtn = document.querySelector('#tabsPaneleiro [data-tab="historico"]');

        if (recebidosBtn) {
            recebidosBtn.textContent = `Recebidos ${contadores.recebidos > 0 ? `(${contadores.recebidos})` : ''}`;
        }
        if (agendadosBtn) {
            agendadosBtn.textContent = `Agendados ${contadores.agendados > 0 ? `(${contadores.agendados})` : ''}`;
        }
        if (historicoBtn) {
            historicoBtn.textContent = `Histórico ${contadores.historico > 0 ? `(${contadores.historico})` : ''}`;
        }

        // Para clientes
        const enviadosBtn = document.querySelector('#tabsCliente [data-tab="enviados"]');
        const clienteHistoricoBtn = document.querySelector('#tabsCliente [data-tab="historico"]');

        if (enviadosBtn) {
            enviadosBtn.textContent = `Enviados ${contadores.enviados > 0 ? `(${contadores.enviados})` : ''}`;
        }
        if (clienteHistoricoBtn) {
            clienteHistoricoBtn.textContent = `Histórico ${contadores.historico > 0 ? `(${contadores.historico})` : ''}`;
        }

    } catch (error) {
        console.warn('⚠️ Erro ao atualizar contadores das abas:', error);
    }
}

// Renderizar pedidos
function renderPedidos() {
    try {
        const pedidosGrid = document.getElementById('pedidosGrid');
        const emptyState = document.getElementById('emptyState');

        if (!pedidosGrid || !emptyState) {
            console.warn('⚠️ Elementos da interface não encontrados');
            return;
        }

        // Calcular contadores para todas as abas
        const contadores = calcularContadoresAbas();

        // Atualizar textos das abas com contadores
        atualizarContadoresAbas(contadores);

        const filteredPedidos = pedidos.filter(pedido => {
            if (!pedido) return false;
            if (currentTab === 'recebidos') {
                return pedido.tipo === 'recebido' && pedido.status === 'pendente';
            }
            if (currentTab === 'enviados') {
                return pedido.tipo === 'enviado' && !['concluido', 'cancelado'].includes(pedido.status);
            }
            if (currentTab === 'agendados') {
                return pedido.status === 'agendado' || pedido.status === 'aguardando_pagamento' || pedido.status === 'aguardando_entrega';
            }
            if (currentTab === 'historico') {
                return ['concluido', 'cancelado', 'reembolsado'].includes(pedido.status);
            }
            return false;
        });

        if (filteredPedidos.length === 0) {
            pedidosGrid.innerHTML = '';
            emptyState.style.display = 'grid';
            const emptyTitle = emptyState.querySelector('.empty-state-title');
            const emptyMessage = emptyState.querySelector('.empty-state-message');
            if (emptyTitle) emptyTitle.textContent = 'Nenhum pedido encontrado';
            if (emptyMessage) emptyMessage.textContent = getEmptyStateMessage();
            return;
        }

        emptyState.style.display = 'none';

        if (currentTab === 'historico') {
            pedidosGrid.innerHTML = filteredPedidos.map(pedido => createPedidoHistoricoElement(pedido)).join('');
        } else {
            pedidosGrid.innerHTML = filteredPedidos.map(pedido => createPedidoElement(pedido)).join('');
        }

        setupPedidoItemEvents();
        manageRequestServiceButton();

    } catch (renderError) {
        console.error('❌ Erro ao renderizar pedidos:', renderError);
        mostrarErroSistema('Erro ao mostrar pedidos. Funcionalidade básica mantida.');
    }
}

// Criar elemento de pedido
function createPedidoElement(pedido) {
    if (!pedido) return '<div>Pedido inválido</div>';

    try {
        const pessoa = pedido.tipo === 'recebido' ? pedido.cliente : (pedido.paneleiro || {});
        const isPaneleiro = userType === 'Paneleiro';
        const isCliente = userType === 'Cliente' || userType === 'cliente';

        const servicosCompactados = compactarServicos(pedido.servicos || []);
        const servicosDisplay = Array.isArray(servicosCompactados) && servicosCompactados.length > 0 ?
            (servicosCompactados.length <= 2 ? servicosCompactados.join(', ') : `${servicosCompactados.slice(0, 2).join(', ')} +${servicosCompactados.length - 2} outros`) :
            'Serviços não informados';

        let avatarHtml = '';
        if (isPaneleiro && pedido.tipo === 'recebido') {
            // Paneleiro vendo pedido recebido: mostra foto do cliente
            avatarHtml = `<img src="${pessoa.avatar || './imgs/perfil.png'}" alt="${pessoa.nome || 'Cliente'}" class="pedido-avatar" onerror="this.src='./imgs/perfil.png'">`;
        } else if (isCliente && pedido.tipo === 'enviado' && pedido.paneleiroNome && (pedido.status === 'aguardando_pagamento' || pedido.status === 'agendado' || pedido.status === 'aguardando_entrega' || pedido.status === 'concluido')) {
            // Cliente vendo pedido enviado aceito: mostra foto do paneleiro
            avatarHtml = `<img src="${pedido.paneleiroFoto || './imgs/perfil.png'}" alt="${pedido.paneleiroNome || 'Paneleiro'}" class="pedido-avatar" onerror="this.src='./imgs/perfil.png'">`;
        }

        // Informações do paneleiro (mostrar apenas para clientes quando pedido foi aceito)
        let paneleiroInfoHtml = '';
        if (isCliente && pedido.paneleiroNome && (pedido.status === 'aguardando_pagamento' || pedido.status === 'agendado' || pedido.status === 'concluido')) {
            paneleiroInfoHtml = `
                <div class="pedido-paneleiro-info" style="display: flex; align-items: center; margin-top: 8px; padding: 8px; background: #f0f8ff; border-radius: 6px; border-left: 3px solid #1a73e8;">
                    <img src="${pedido.paneleiroFoto || './imgs/perfil.png'}" alt="${pedido.paneleiroNome}" style="width: 32px; height: 32px; border-radius: 50%; margin-right: 8px; border: 2px solid white; box-shadow: 0 1px 3px rgba(0,0,0,0.2);" onerror="this.src='./imgs/perfil.png'">
                    <div style="font-size: 0.875rem; color: #333;">
                        <div style="font-weight: 500;">${pedido.paneleiroNome}</div>
                        <div style="color: #666; font-size: 0.8rem;">Paneleiro responsável</div>
                    </div>
                </div>
            `;
        }

        let nomeDisplay = pessoa.nome || 'Pessoa';
        if (isCliente && (currentTab === 'enviados' || currentTab === 'historico')) {
            nomeDisplay = `Pedido #${pedido.id ? pedido.id.substring(0, 8) : 'N/A'}`;
        }

        let acoesHtml = '';

        // Botões para paneleiros
        if (isPaneleiro) {
            if (pedido.status === 'pendente') {
                acoesHtml = `
                    <div class="pedido-acoes">
                        <button class="btn-aceitar" onclick="event.stopPropagation(); aceitarPedidoRapido('${pedido.id}')">Aceitar</button>
                        <button class="btn-negociar" onclick="event.stopPropagation(); negociarPedidoRapido('${pedido.id}')">Mensagem</button>
                    </div>
                `;
            } else if (pedido.status === 'aguardando_pagamento') {
                acoesHtml = `
                    <div class="pedido-acoes">
                        <button class="btn-mensagem" onclick="event.stopPropagation(); abrirMensagemRapido('${pedido.id}')">Mensagem</button>
                    </div>
                `;
            } else if (pedido.status === 'agendado') {
                acoesHtml = `
                    <div class="pedido-acoes">
                        <button class="btn-concluido" onclick="event.stopPropagation(); concluirServicoRapido('${pedido.id}')">Concluído</button>
                        <button class="btn-mensagem" onclick="event.stopPropagation(); abrirMensagemRapido('${pedido.id}')">Mensagem</button>
                    </div>
                `;
            } else if (pedido.status === 'aguardando_entrega') {
                acoesHtml = `
                    <div class="pedido-acoes">
                        <button class="btn-mensagem" onclick="event.stopPropagation(); abrirMensagemRapido('${pedido.id}')">Mensagem</button>
                    </div>
                `;
            }
        }

        // Botões para clientes
        if (isCliente) {
            if (pedido.status === 'aguardando_pagamento') {
                acoesHtml = `
                    <div class="pedido-acoes">
                        <button class="btn-primary" onclick="event.stopPropagation(); efetuarPagamento('${pedido.id}')">Efetuar Pagamento</button>
                        <button class="btn-cancel" onclick="event.stopPropagation(); cancelarPedidoCliente('${pedido.id}')">Cancelar</button>
                    </div>
                `;
            } else if (pedido.status === 'aguardando_entrega') {
                acoesHtml = `
                    <div class="pedido-acoes">
                        <button class="btn-success" onclick="event.stopPropagation(); confirmarEntrega('${pedido.id}')">Confirmar Entrega</button>
                        <button class="btn-mensagem" onclick="event.stopPropagation(); abrirMensagemRapido('${pedido.id}')">Mensagem</button>
                    </div>
                `;
            } else if (pedido.status === 'pendente') {
                acoesHtml = `
                    <div class="pedido-acoes">
                        <button class="btn-cancel" onclick="event.stopPropagation(); cancelarPedidoCliente('${pedido.id}')">Cancelar Pedido</button>
                    </div>
                `;
            } else if (pedido.status === 'agendado' && pedido.paneleiroNome) {
                // Mostrar botão de mensagem para pedidos agendados que têm paneleiro
                acoesHtml = `
                    <div class="pedido-acoes">
                        <button class="btn-mensagem" onclick="event.stopPropagation(); abrirMensagemRapido('${pedido.id}')">Mensagem</button>
                    </div>
                `;
            }
        }

        // Ícone baseado no tipo do cliente (apenas para paneleiros)
        let clienteIconHtml = '';
        if (isPaneleiro && pedido.cliente && pedido.cliente.tipo) {
            const clienteTipo = pedido.cliente.tipo;
            if (clienteTipo === 'Cliente' || clienteTipo === 'cliente') {
                // Verificar se é Food Service
                const isFoodService = !!pedido.cliente.isFoodService && pedido.cliente.isFoodService !== 'false' && pedido.cliente.isFoodService !== false;
                console.log('Verificando ícone - cliente:', pedido.cliente.nome, 'isFoodService:', pedido.cliente.isFoodService, 'tipo:', typeof pedido.cliente.isFoodService, 'resultado:', isFoodService);
                if (isFoodService) {
                    clienteIconHtml = '<img src="./imgs/food.png" alt="Food Service" class="cliente-type-icon" style="position: absolute; top: 16px; right: 16px; width: 22px; height: 22px; border-radius: 50%; border: 2px solid white; box-shadow: 0 1px 3px rgba(0,0,0,0.2);">';
                } else {
                    clienteIconHtml = '<img src="./imgs/cliente.png" alt="Cliente" style="position: absolute; top: 16px; right: 16px; width: 22px; height: 22px; border-radius: 50%; border: 2px solid white; box-shadow: 0 1px 3px rgba(0,0,0,0.2);">';
                }
            }
        }

        return `
            <div class="pedido-item status-${pedido.status || 'pendente'}" data-pedido-id="${pedido.id || ''}" style="position: relative;">
                ${clienteIconHtml}
                <div class="pedido-header">
                    ${avatarHtml}
                    <div class="pedido-info">
                        <div class="pedido-nome">${nomeDisplay}</div>
                        <div class="pedido-servico">${servicosDisplay}</div>
                        <span class="pedido-status ${pedido.status || 'pendente'}">${getStatusText(pedido.status || 'pendente')}</span>
                    </div>
                </div>
                <div class="pedido-detalhes">${(pedido.descricao || 'Sem descrição').length > 50 ? (pedido.descricao || 'Sem descrição').substring(0, 50) + '...' : (pedido.descricao || 'Sem descrição')}</div>
                <div class="pedido-quantidade-panelas" style="font-size: 0.875rem; color: #666; margin-bottom: 0.25rem;">
                    <strong>Quantidade de panelas:</strong> ${pedido.quantidadePanelas || 1}
                </div>
                <div class="pedido-valor" style="color: #1a73e8; font-weight: bold;">Valor: R$ ${(pedido.valor || 0).toFixed(2)}</div>
                <div class="pedido-data">
                    ${pedido.dataAgendamento ? `Agendado: ${formatDateTime(pedido.dataAgendamento.split('T')[0])}` : `Criado ${formatRelativeTime(pedido.dataCriacao)}`}
                </div>
                ${paneleiroInfoHtml}
                ${acoesHtml}
            </div>
        `;
    } catch (e) {
        console.warn('⚠️ Erro ao criar elemento de pedido:', e);
        return '<div class="pedido-item erro">Erro ao carregar pedido</div>';
    }
}

// Criar elemento de pedido histórico
function createPedidoHistoricoElement(pedido) {
    if (!pedido) return '<div>Pedido inválido</div>';

    try {
        const pessoa = pedido.tipo === 'recebido' ? pedido.cliente : (pedido.paneleiro || {});
        const isCliente = userType === 'Cliente' || userType === 'cliente';

        const servicosCompactados = compactarServicos(pedido.servicos || []);
        const servicosDisplay = Array.isArray(servicosCompactados) && servicosCompactados.length > 0 ?
            (servicosCompactados.length <= 2 ? servicosCompactados.join(', ') : `${servicosCompactados.slice(0, 2).join(', ')} +${servicosCompactados.length - 2} outros`) :
            'Serviços não informados';

        let nomeDisplay = pessoa.nome || 'Pessoa';
        if (isCliente) {
            nomeDisplay = `Pedido #${pedido.id ? pedido.id.substring(0, 8) : 'N/A'}`;
        }

        return `
            <div class="pedido-item status-${pedido.status || 'pendente'}" data-pedido-id="${pedido.id || ''}">
                <div class="pedido-header">
                    <div class="pedido-info">
                        <div class="pedido-nome">${nomeDisplay}</div>
                        <div class="pedido-servico">${servicosDisplay}</div>
                        <span class="pedido-status ${pedido.status || 'pendente'}">${getStatusText(pedido.status || 'pendente')}</span>
                    </div>
                </div>
                <div class="pedido-detalhes">${pedido.descricao || 'Sem descrição'}</div>
                <div class="pedido-quantidade-panelas" style="font-size: 0.875rem; color: #666; margin-bottom: 0.25rem;">
                    <strong>Quantidade de panelas:</strong> ${pedido.quantidadePanelas || 1}
                </div>
                <div class="pedido-valor" style="color: #1a73e8; font-weight: bold;">Valor: R$ ${(pedido.valor || 0).toFixed(2)}</div>
                <div class="pedido-data">
                    ${pedido.dataAgendamento ? `Finalizado: ${formatDateTime(pedido.dataAgendamento.split('T')[0])}` : `Finalizado ${formatRelativeTime(pedido.dataCriacao)}`}
                </div>
            </div>
        `;
    } catch (e) {
        console.warn('⚠️ Erro ao criar elemento de histórico:', e);
        return '<div class="pedido-item erro">Erro ao carregar pedido histórico</div>';
    }
}

// Função para organizar serviços por panela
function organizarServicosPorPanela(pedido) {
    const quantidadePanelas = pedido.quantidadePanelas || 1;
    const servicos = pedido.servicos || [];
    const servicosPorPanela = pedido.servicosPorPanela;

    console.log('🔍 [DEBUG] organizarServicosPorPanela:', {
        quantidadePanelas,
        servicos,
        servicosPorPanela,
        temServicosPorPanela: !!(servicosPorPanela && Array.isArray(servicosPorPanela) && servicosPorPanela.length > 0)
    });

    // Se houver serviços organizados por panela, criar cards separados para cada panela
    if (servicosPorPanela && Array.isArray(servicosPorPanela) && servicosPorPanela.length > 0) {
        console.log('✅ [DEBUG] Usando servicosPorPanela para criar cards separados');

        const panelasHtml = servicosPorPanela.map((panela, index) => {
            const numeroPanela = index + 1;
            const servicosPanela = panela.servicos || [];

            console.log(`🔍 [DEBUG] Panela ${numeroPanela}:`, servicosPanela);

            const servicosHtml = servicosPanela.length > 0 ?
                servicosPanela.map(servico => `<li class="servico-item">${compactarServicos([servico])}</li>`).join('') :
                '<li class="servico-item">Nenhum serviço especificado</li>';

            return `
                <div class="panela-card">
                    <div class="panela-header">
                        <img src="./imgs/panela.png" alt="Panela ${numeroPanela}" class="panela-icon">
                        <div class="panela-info">
                            <h4>Panela ${numeroPanela}</h4>
                            <span class="servicos-count">${servicosPanela.length} serviço${servicosPanela.length !== 1 ? 's' : ''}</span>
                        </div>
                    </div>
                    <ul class="servicos-list">
                        ${servicosHtml}
                    </ul>
                </div>
            `;
        }).join('');

        console.log('✅ [DEBUG] HTML gerado para múltiplas panelas:', panelasHtml.substring(0, 200) + '...');
        return panelasHtml;
    }

    // Se não tiver servicosPorPanela mas tiver múltiplas panelas, distribuir serviços igualmente
    if (quantidadePanelas > 1 && servicos.length > 0) {
        console.log('🔄 [DEBUG] Distribuindo serviços entre múltiplas panelas');

        // Distribuir serviços igualmente entre as panelas
        const servicosPorPanelaDistribuidos = [];
        const servicosPorPanela = Math.ceil(servicos.length / quantidadePanelas);

        for (let i = 0; i < quantidadePanelas; i++) {
            const inicio = i * servicosPorPanela;
            const fim = Math.min(inicio + servicosPorPanela, servicos.length);
            const servicosPanela = servicos.slice(inicio, fim);

            servicosPorPanelaDistribuidos.push({
                panela: i + 1,
                servicos: servicosPanela
            });
        }

        const panelasHtml = servicosPorPanelaDistribuidos.map((panela) => {
            const numeroPanela = panela.panela;
            const servicosPanela = panela.servicos;

            const servicosHtml = servicosPanela.length > 0 ?
                servicosPanela.map(servico => `<li class="servico-item">${compactarServicos([servico])}</li>`).join('') :
                '<li class="servico-item">Nenhum serviço especificado</li>';

            return `
                <div class="panela-card">
                    <div class="panela-header">
                        <img src="./imgs/panela.png" alt="Panela ${numeroPanela}" class="panela-icon">
                        <div class="panela-info">
                            <h4>Panela ${numeroPanela}</h4>
                            <span class="servicos-count">${servicosPanela.length} serviço${servicosPanela.length !== 1 ? 's' : ''}</span>
                        </div>
                    </div>
                    <ul class="servicos-list">
                        ${servicosHtml}
                    </ul>
                </div>
            `;
        }).join('');

        console.log('✅ [DEBUG] HTML gerado distribuindo serviços:', panelasHtml.substring(0, 200) + '...');
        return panelasHtml;
    }

    // Caso contrário, mostrar um único card (comportamento antigo)
    console.log('⚠️ [DEBUG] Usando comportamento antigo - 1 panela ou sem serviços');

    const servicosHtml = servicos.length > 0 ?
        servicos.map(servico => `<li class="servico-item">${compactarServicos([servico])}</li>`).join('') :
        '<li class="servico-item">Nenhum serviço especificado</li>';

    return `
        <div class="panela-card">
            <div class="panela-header">
                <img src="./imgs/panela.png" alt="Panela" class="panela-icon">
                <div class="panela-info">
                    <h4>Serviços das Panelas</h4>
                    <span class="servicos-count">${servicos.length} serviço${servicos.length !== 1 ? 's' : ''} para ${quantidadePanelas} panela${quantidadePanelas !== 1 ? 's' : ''}</span>
                </div>
            </div>
            <ul class="servicos-list">
                ${servicosHtml}
            </ul>
        </div>
    `;
}

// Função para obter texto do status
function getStatusText(status) {
    const statusMap = {
        'pendente': 'Pendente',
        'aceito': 'Aceito',
        'em_negociacao': 'Em Negociação',
        'aguardando_pagamento': 'Aguardando Pagamento',
        'agendado': 'Agendado',
        'aguardando_entrega': 'Aguardando Entrega',
        'concluido': 'Concluído',
        'cancelado': 'Cancelado',
        'reembolsado': 'Reembolsado'
    };
    return statusMap[status] || status || 'Pendente';
}

// Função para obter mensagem de estado vazio
function getEmptyStateMessage() {
    if (currentTab === 'recebidos') {
        return userType === 'Paneleiro' ? 'Você ainda não recebeu nenhum pedido de serviço.' : 'Você ainda não enviou nenhum pedido.';
    }
    if (currentTab === 'enviados') {
        return 'Você ainda não enviou nenhum pedido de serviço.';
    }
    if (currentTab === 'agendados') {
        return 'Você não tem serviços agendados no momento.';
    }
    if (currentTab === 'historico') {
        return 'Você ainda não tem pedidos concluídos no histórico.';
    }
    return 'Nenhum pedido encontrado.';
}

// Configurar abas
function setupTabs() {
    try {
        const tabs = document.querySelectorAll('.tab-button');
        tabs.forEach(tab => {
            if (tab) {
                tab.addEventListener('click', () => {
                    tabs.forEach(t => t.classList.remove('active'));
                    tab.classList.add('active');
                    currentTab = tab.dataset.tab || currentTab;
                    manageRequestServiceButton();
                    renderPedidos();
                });
            }
        });
    } catch (e) {
        console.warn('⚠️ Erro ao configurar abas:', e);
    }
}

// Configurar eventos dos itens de pedido
function setupPedidoItemEvents() {
    try {
        const pedidoItems = document.querySelectorAll('.pedido-item');
        pedidoItems.forEach(item => {
            if (item) {
                item.addEventListener('click', () => {
                    const pedidoId = item.dataset.pedidoId;
                    if (pedidoId) {
                        openPedidoDetails(pedidoId);
                    }
                });
            }
        });
    } catch (e) {
        console.warn('⚠️ Erro ao configurar eventos dos itens:', e);
    }
}

// Configurar swipe
function setupSwipeGestures() {
    try {
        const swipeArea = document.body;
        let swipeStartX = 0;
        let swipeStartTime = 0;

        swipeArea.addEventListener('touchstart', (e) => {
            if (e.touches.length > 0) {
                swipeStartX = e.touches[0].clientX;
                swipeStartTime = Date.now();
            }
        }, { passive: false });

        swipeArea.addEventListener('touchend', (e) => {
            if (swipeStartX !== 0 && swipeStartTime !== 0) {
                const endX = e.changedTouches[0].clientX;
                const deltaX = swipeStartX - endX;
                const deltaTime = Date.now() - swipeStartTime;

                if (Math.abs(deltaX) > 50 && deltaTime < 500) {
                    if (deltaX > 0) {
                        nextTab();
                    } else {
                        previousTab();
                    }
                }
            }
            swipeStartX = 0;
            swipeStartTime = 0;
        }, { passive: false });

    } catch (e) {
        console.warn('⚠️ Erro ao configurar swipe:', e);
    }
}

// Funções de navegação por abas
function previousTab() {
    if (userType === 'Paneleiro' || userType === 'paneleiro') {
        if (currentTab === 'historico') {
            currentTab = 'agendados';
        } else if (currentTab === 'agendados') {
            currentTab = 'recebidos';
        }
    } else {
        if (currentTab === 'historico') {
            currentTab = 'enviados';
        }
    }
    updateActiveTab();
    renderPedidos();
}

function nextTab() {
    if (userType === 'Paneleiro' || userType === 'paneleiro') {
        if (currentTab === 'recebidos') {
            currentTab = 'agendados';
        } else if (currentTab === 'agendados') {
            currentTab = 'historico';
        }
    } else {
        if (currentTab === 'enviados') {
            currentTab = 'historico';
        }
    }
    updateActiveTab();
    renderPedidos();
}

// Atualizar aba ativa
function updateActiveTab() {
    try {
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.remove('active');
        });

        const paneleiroContainer = document.getElementById('tabsPaneleiro');
        const clienteContainer = document.getElementById('tabsCliente');

        if (userType === 'Paneleiro' || userType === 'paneleiro') {
            if (paneleiroContainer) paneleiroContainer.style.display = 'flex';
            if (clienteContainer) clienteContainer.style.display = 'none';
            const activeButton = paneleiroContainer?.querySelector(`[data-tab="${currentTab}"]`);
            if (activeButton) activeButton.classList.add('active');
        } else {
            if (clienteContainer) clienteContainer.style.display = 'flex';
            if (paneleiroContainer) paneleiroContainer.style.display = 'none';
            const activeButton = clienteContainer?.querySelector(`[data-tab="${currentTab}"]`);
            if (activeButton) activeButton.classList.add('active');
        }
    } catch (e) {
        console.warn('⚠️ Erro ao atualizar aba ativa:', e);
    }
}

// Configurar modais
function setupModals() {
    try {
        const pedidoModal = document.getElementById('pedidoModal');
        const modalClose = document.getElementById('modalClose');

        if (modalClose && pedidoModal) {
            modalClose.addEventListener('click', () => {
                if (pedidoModal.close) pedidoModal.close();
            });
        }

        const novoPedidoModal = document.getElementById('novoPedidoModal');
        const novoPedidoModalClose = document.getElementById('novoPedidoModalClose');
        const btnCancelarNovoPedido = document.getElementById('btnCancelarNovoPedido');

        if (novoPedidoModalClose && novoPedidoModal) {
            novoPedidoModalClose.addEventListener('click', () => {
                novoPedidoModal.style.display = 'none';
            });
        }

        if (btnCancelarNovoPedido && novoPedidoModal) {
            btnCancelarNovoPedido.addEventListener('click', () => {
                novoPedidoModal.style.display = 'none';
            });
        }

        const novoPedidoForm = document.getElementById('novoPedidoForm');
        if (novoPedidoForm) {
            novoPedidoForm.addEventListener('submit', (e) => {
                e.preventDefault();
                criarNovoPedido();
            });
        }

    } catch (e) {
        console.warn('⚠️ Erro ao configurar modais:', e);
    }
}

// Abrir detalhes do pedido
async function openPedidoDetails(pedidoId) {
    if (!pedidoId) return;

    const pedido = pedidos.find(p => p && p.id === pedidoId);
    if (!pedido) {
        console.warn('⚠️ Pedido não encontrado:', pedidoId);
        return;
    }

    currentPedido = pedido;

    const modal = document.getElementById('pedidoModal');
    const modalTitle = document.getElementById('modalTitle');
    const pedidoDetails = document.getElementById('pedidoDetails');
    const modalActions = document.getElementById('modalActions');

    try {
        if (modalTitle) modalTitle.textContent = `Serviço ${pedido.id || ''}`;

        const pessoa = pedido.tipo === 'recebido' ? pedido.cliente : (pedido.paneleiro || {});
        const isPaneleiro = userType === 'Paneleiro';
        const isCliente = userType === 'Cliente' || userType === 'cliente';

        // Obter avaliação atual do paneleiro se for cliente
        let avaliacaoPaneleiro = '4.8';
        if (isCliente && pedido.paneleiroId) {
            try {
                const dadosAvaliacao = await obterAvaliacaoPaneleiro(pedido.paneleiroId);
                if (dadosAvaliacao && dadosAvaliacao.media) {
                    avaliacaoPaneleiro = dadosAvaliacao.media.toFixed(1);
                }
            } catch (error) {
                console.warn('Erro ao obter avaliação do paneleiro:', error);
            }
        }

        // Atualizar dinamicamente a avaliação no modal após renderização
        setTimeout(() => {
            const avaliacaoElement = document.getElementById('avaliacao-paneleiro-modal');
            if (avaliacaoElement) {
                avaliacaoElement.textContent = `(${avaliacaoPaneleiro})`;
            }
        }, 100);

        if (pedidoDetails) {
            const dataSolicitacao = pedido.dataCriacao ? new Date(pedido.dataCriacao).toLocaleDateString('pt-BR') : 'Não informado';
            const dataConclusaoItem = (pedido.status === 'concluido' || pedido.status === 'cancelado' || pedido.status === 'reembolsado') && pedido.dataCriacao ?
                `<div class="detail-item"><span class="detail-label">Data de conclusão:</span><span class="detail-value">${new Date(pedido.dataCriacao).toLocaleDateString('pt-BR')}</span></div>` : '';

            // Mostrar ícone Food Service se for cliente e for Food Service
            const foodServiceIcon = (isPaneleiro && pessoa.isFoodService) ?
                '<div class="detail-item"><span class="detail-label">Tipo:</span><span class="detail-value"><img src="./imgs/food.png" alt="Food Service" style="width: 20px; height: 20px; vertical-align: middle; margin-right: 5px;">Food Service</span></div>' : '';

            // Para clientes, mostrar informações do paneleiro apenas quando o pedido foi aceito
            const paneleiroInfoSection = (isCliente && pedido.paneleiroNome && (pedido.status === 'aguardando_pagamento' || pedido.status === 'agendado' || pedido.status === 'aguardando_entrega' || pedido.status === 'concluido')) ? `
                <div class="info-card paneleiro-card" style="margin-top: 1rem;">
                    <div class="card-header">
                        <h3>Informações do Paneleiro</h3>
                    </div>
                    <div class="card-content">
                        <div class="paneleiro-info-content">
                            <div class="paneleiro-avatar">
                                <img src="${pedido.paneleiroFoto || './imgs/perfil.png'}" alt="${pedido.paneleiroNome || 'Paneleiro'}" style="width: 60px; height: 60px; border-radius: 50%; border: 2px solid #1a73e8; object-fit: cover;">
                            </div>
                            <div class="paneleiro-details">
                                <div class="paneleiro-nome" style="font-size: 1.1rem; font-weight: 600; color: #333; margin-bottom: 0.5rem;">
                                    ${pedido.paneleiroNome || 'Paneleiro responsável'}
                                </div>
                        <div class="paneleiro-avaliacao" style="display: flex; align-items: center; gap: 0.5rem;">
                                    <div class="estrelas" style="display: flex; gap: 2px;">
                                        ${gerarEstrelasVisuais(avaliacaoPaneleiro)}
                                    </div>
                                    <span style="font-size: 0.9rem; color: #666;" id="avaliacao-paneleiro-modal">(${avaliacaoPaneleiro})</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ` : '';

            // Para paneleiros, mostrar informações do cliente apenas quando o pedido foi aceito
            const clienteInfoSection = (isPaneleiro && pedido.cliente && pedido.cliente.nome && (pedido.status === 'aguardando_pagamento' || pedido.status === 'agendado' || pedido.status === 'aguardando_entrega' || pedido.status === 'concluido')) ? `
                <div class="info-card cliente-card" style="margin-top: 1rem;">
                    <div class="card-header">
                        <h3>Informações do Cliente</h3>
                    </div>
                    <div class="card-content">
                        <div class="cliente-info-content">
                            <div class="cliente-avatar">
                                <img src="${pedido.cliente.avatar || './imgs/perfil.png'}" alt="${pedido.cliente.nome || 'Cliente'}" style="width: 60px; height: 60px; border-radius: 50%; border: 2px solid #1a73e8; object-fit: cover;">
                            </div>
                            <div class="cliente-details">
                                <div class="cliente-nome" style="font-size: 1.1rem; font-weight: 600; color: #333; margin-bottom: 0.5rem;">
                                    ${pedido.cliente.nome || 'Cliente'}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ` : '';

            // Seção de endereço com cards (mostrar sempre que houver endereço)
            const enderecoSection = pedido.endereco ? `
                <div class="info-card endereco-card" style="margin-top: 1rem;">
                    <div class="card-header">
                        <h3>Endereço para o Serviço</h3>
                    </div>
                    <div class="card-content">
                        <div class="endereco-card-detalhes" style="
                            background: #f8f9fa;
                            border-radius: 8px;
                            padding: 1rem;
                            border-left: 4px solid #1a73e8;
                        ">
                            <div class="endereco-icon-detalhes" style="
                                display: inline-block;
                                margin-right: 0.5rem;
                                vertical-align: top;
                            ">
                                📍
                            </div>
                            <div class="endereco-info-detalhes" style="
                                display: inline-block;
                                vertical-align: top;
                                font-size: 0.9rem;
                                color: #333;
                                line-height: 1.4;
                            ">
                                ${pedido.endereco}
                            </div>
                        </div>
                    </div>
                </div>
            ` : '';

            // Criar estrutura reorganizada: Detalhes -> Panelas (juntadas em container)
            const servicosOrganizados = organizarServicosPorPanela(pedido);

            pedidoDetails.innerHTML = `
                <div class="pedido-details-cards">
                    ${clienteInfoSection}

                    ${paneleiroInfoSection}

        <div class="info-card details-card">
            <div class="card-header">
                <h3>Detalhes do Pedido</h3>
            </div>
            <div class="card-content details-content">
                <div class="info-row">
                    <span class="info-label">ID do Pedido:</span>
                    <span class="info-value">${pedido.id || 'Não informado'}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Dia da solicitação:</span>
                    <span class="info-value">${dataSolicitacao}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Descrição:</span>
                    <span class="info-value">${pedido.descricao || 'Sem descrição'}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Endereço:</span>
                    <span class="info-value">${pedido.endereco || 'Não informado'}</span>
                </div>
                ${pedido.dataMaximaEntrega ? `<div class="info-row"><span class="info-label">Data máxima de entrega:</span><span class="info-value">${formatDateTime(pedido.dataMaximaEntrega + 'T00:00:00')}</span></div>` : ''}
                <div class="info-row">
                    <span class="info-label">Método de pagamento:</span>
                    <span class="info-value">${pedido.metodoPagamento ? (pedido.metodoPagamento === 'pix' ? 'PIX' : pedido.metodoPagamento === 'cartao' ? 'Cartão de Crédito' : pedido.metodoPagamento === 'boleto' ? 'Boleto Bancário' : pedido.metodoPagamento) : 'Não informado'}</span>
                </div>
                ${dataConclusaoItem ? `<div class="info-row"><span class="info-label">Data de conclusão:</span><span class="info-value">${new Date(pedido.dataCriacao).toLocaleDateString('pt-BR')}</span></div>` : ''}
                <div class="info-row">
                    <span class="info-label">Valor estimado:</span>
                    <span class="info-value valor-destaque">R$ ${(pedido.valor || 0).toFixed(2)}</span>
                </div>
                ${pedido.comentarioAvaliacao ? `<div class="info-row"><span class="info-label">Comentário:</span><span class="info-value">${pedido.comentarioAvaliacao}</span></div>` : ''}
            </div>
        </div>

        ${pedido.status === 'concluido' && pedido.avaliacaoCliente ? `
        <div class="info-card details-card" style="margin-top: -0.5rem;">
            <div class="card-header">
                <h3>${isCliente ? 'Avaliação Enviada' : 'Avaliação Recebida'}</h3>
            </div>
            <div class="card-content">
                <div class="avaliacao-conteudo" style="text-align: center; padding: 1rem;">
                    <div class="avaliacao-estrelas" style="display: flex; align-items: center; justify-content: center; gap: 0.5rem; margin-bottom: 1rem;">
                        <div class="estrelas" style="display: flex; gap: 4px;">
                            ${Array.from({length: 5}, (_, i) => `<span style="color: ${i < pedido.avaliacaoCliente ? '#ffc107' : '#ddd'}; font-size: 2rem;">★</span>`).join('')}
                        </div>
                    </div>
                    ${pedido.comentarioAvaliacao ? `<div class="comentario-avaliacao" style="background: #f8f9fa; padding: 1rem; border-radius: 8px; margin-bottom: 1rem; text-align: left;"><strong>Comentário:</strong><br>${pedido.comentarioAvaliacao}</div>` : ''}
                    <div class="data-avaliacao" style="font-size: 0.9rem; color: #666;">
                        Avaliado em ${pedido.dataAvaliacao ? new Date(pedido.dataAvaliacao).toLocaleDateString('pt-BR') : 'data não disponível'}
                    </div>
                </div>
            </div>
        </div>
        ` : ''}
    </div>
            </div>
        </div>



                    <div class="panelas-container">
                        <div class="panelas-header">
                            <h3>Serviços das Panelas</h3>
                        </div>
                        <div class="panelas-content">
                            ${servicosOrganizados}
                        </div>
                    </div>
                </div>
            `;
        }

        if (modalActions) {
            modalActions.innerHTML = getModalActions(pedido);
        }

    if (modal && modal.showModal) {
        modal.classList.add('fullscreen-details');
        modal.showModal();
    }

    } catch (detailsError) {
        console.error('❌ Erro ao mostrar detalhes do pedido:', detailsError);
        showAlert('Erro ao abrir detalhes do pedido.');
    }
}

// Ações do modal
function getModalActions(pedido) {
    return '';
}

// Funções de ação
async function aceitarPedido() {
    if (!currentPedido) {
        alert('Nenhum pedido selecionado.');
        return;
    }

    try {
        if (firebaseEnabled && window.atualizarStatusSolicitacao) {
            await window.atualizarStatusSolicitacao(currentPedido.id, 'aguardando_pagamento');
            currentPedido.status = 'aguardando_pagamento';
            savePedidos();
        } else {
            currentPedido.status = 'aguardando_pagamento';
            savePedidos();
        }

        if (window.criarConversaPedido) {
            window.criarConversaPedido(currentPedido, 'aceito').catch(e => console.warn('Erro ao criar conversa:', e));
        }

        renderPedidos();
        fecharModal();
        alert('Pedido aceito com sucesso! Aguardando pagamento do cliente.');

    } catch (error) {
        console.error('Erro ao aceitar pedido:', error);
        currentPedido.status = 'aguardando_pagamento';
        savePedidos();
        renderPedidos();
        fecharModal();
        alert('Pedido aceito (fallback local usado).');
    }
}

async function cancelarPedido() {
    if (!currentPedido) {
        alert('Nenhum pedido selecionado.');
        return;
    }

    if (!confirm('Tem certeza que deseja CANCELAR este pedido? Esta ação não pode ser desfeita.')) {
        return;
    }

    try {
        if (firebaseEnabled && window.atualizarStatusSolicitacao) {
            await window.atualizarStatusSolicitacao(currentPedido.id, 'cancelado');
            currentPedido.status = 'cancelado';
        } else {
            currentPedido.status = 'cancelado';
        }

        savePedidos();
        await syncPedidosFirebase();
        renderPedidos();
        fecharModal();
        alert('Pedido CANCELADO com sucesso!');

    } catch (error) {
        console.error('Erro ao cancelar pedido:', error);
        if (currentPedido) {
            currentPedido.status = 'cancelado';
            savePedidos();
        }
        renderPedidos();
        fecharModal();
        alert('Pedido cancelado (fallback local usado).');
    }
}

async function rejeitarPedido() {
    if (!currentPedido) return;

    if (!confirm('Deseja rejeitar este pedido?')) return;

    try {
        if (firebaseEnabled && window.atualizarStatusSolicitacao) {
            await window.atualizarStatusSolicitacao(currentPedido.id, 'cancelado');
        }
        currentPedido.status = 'cancelado';
        savePedidos();
        renderPedidos();
        fecharModal();
        alert('Pedido rejeitado.');
    } catch (error) {
        console.error('Erro ao rejeitar pedido:', error);
        currentPedido.status = 'cancelado';
        savePedidos();
        renderPedidos();
        fecharModal();
        alert('Pedido rejeitado (fallback usado).');
    }
}

function fecharModal() {
    const modal = document.getElementById('pedidoModal');
    if (modal && modal.close) {
        modal.close();
    }
}

function ignorarPedido() {
    const modal = document.getElementById('pedidoModal');
    if (modal && modal.close) {
        modal.close();
    }
    alert('Pedido ignorado quando houver muitos pedidos.');
}

function savePedidos() {
    try {
        localStorage.setItem('pedidos', JSON.stringify(pedidos));
    } catch (e) {
        console.error('Erro ao salvar pedidos:', e);
    }
}



// Função para carregar endereços no modal de novo pedido
async function carregarEnderecosNoModal() {
    const enderecosSelecao = document.getElementById('enderecosSelecao');
    if (!enderecosSelecao) return;

    enderecosSelecao.innerHTML = '<div style="text-align: center; padding: 2rem; color: #666;">Carregando endereços...</div>';

    try {
        // Carregar dados do usuário
        let currentUserData = null;
        try {
            const userDataStr = localStorage.getItem('user');
            if (userDataStr) {
                currentUserData = JSON.parse(userDataStr);
            }
        } catch (e) {
            console.warn('Erro ao carregar dados do usuário:', e);
        }

        if (!currentUserData || !currentUserData.id) {
            console.warn('Usuário não encontrado ou sem ID');
            enderecosSelecao.innerHTML = `
                <div class="enderecos-empty">
                    <div class="enderecos-empty-icon">⚠️</div>
                    <h4>Usuário não identificado</h4>
                    <p>Faça login novamente para carregar seus endereços.</p>
                </div>
            `;
            return;
        }

        let enderecosUsuario = [];
        let enderecoAtivo = null;

        // Primeiro tentar carregar do REALTIME DATABASE (como no enderecos.js)
        if (typeof firebase !== 'undefined' && currentUserData.id) {
            try {
                const userRef = firebase.database().ref('users/' + currentUserData.id);
                const snapshot = await userRef.once('value');

                if (snapshot.exists()) {
                    const userDataRTDB = snapshot.val();
                    if (userDataRTDB.ceps && userDataRTDB.enderecoCompleto) {
                        // Converter dados do RTDB para formato de endereço
                        const enderecoConvertido = {
                            id: 'endereco-principal-' + currentUserData.id,
                            logradouro: '',
                            numero: '',
                            complemento: '',
                            bairro: '',
                            cep: userDataRTDB.ceps,
                            cidade: '',
                            estado: '',
                            enderecoCompleto: userDataRTDB.enderecoCompleto,
                            latitude: userDataRTDB.latitude || null,
                            longitude: userDataRTDB.longitude || null,
                            ativo: true,
                            userId: currentUserData.id,
                            timestamp: userDataRTDB.enderecoSalvo || new Date().toISOString()
                        };

                        // Extrair componentes do endereço completo
                        const enderecoCompleto = userDataRTDB.enderecoCompleto;
                        const partes = enderecoCompleto.split(' - ');

                        if (partes.length >= 2) {
                            const enderecoParte = partes[0];
                            const localParte = partes[1];

                            // Separar rua e número
                            const enderecoMatch = enderecoParte.match(/^(.+?),\s*(\d+)(?:,\s*(.+))?/);
                            if (enderecoMatch) {
                                enderecoConvertido.logradouro = enderecoMatch[1].trim();
                                enderecoConvertido.numero = enderecoMatch[2].trim();
                                enderecoConvertido.complemento = enderecoMatch[3] ? enderecoMatch[3].trim() : '';
                            }

                            // Separar bairro, cidade/estado
                            const localMatch = localParte.match(/^(.+?),\s*(.+?)\/(.+?),\s*CEP:\s*(.+)$/);
                            if (localMatch) {
                                enderecoConvertido.bairro = localMatch[1].trim();
                                enderecoConvertido.cidade = localMatch[2].trim();
                                enderecoConvertido.estado = localMatch[3].trim();
                                enderecoConvertido.cep = localMatch[4].trim();
                            }
                        }

                        enderecosUsuario.push(enderecoConvertido);
                        enderecoAtivo = enderecoConvertido;
                    }
                }
            } catch (rtError) {
                console.warn('Erro ao carregar do RTDB:', rtError);
            }
        }

        // Tentar carregar endereços adicionais do Firestore
        if (typeof firebase !== 'undefined' && window.db && currentUserData.id) {
            try {
                const enderecosRef = window.db.collection('enderecos').where('userId', '==', currentUserData.id);
                const snapshot = await enderecosRef.get();

                if (!snapshot.empty) {
                    snapshot.forEach(doc => {
                        const enderecoData = doc.data();
                        // Evitar duplicatas do endereço principal
                        const isDuplicata = enderecosUsuario.some(end =>
                            end.id.startsWith('endereco-principal-') &&
                            end.cep === enderecoData.cep &&
                            end.enderecoCompleto === enderecoData.enderecoCompleto
                        );

                        if (!isDuplicata) {
                            enderecosUsuario.push({
                                id: doc.id,
                                ...enderecoData
                            });
                        }
                    });
                }
            } catch (firestoreError) {
                console.warn('Erro ao carregar do Firestore:', firestoreError);
            }
        }

        // Fallback: carregar do localStorage
        if (enderecosUsuario.length === 0) {
            const enderecosSalvos = localStorage.getItem('userEnderecos');
            if (enderecosSalvos) {
                enderecosUsuario = JSON.parse(enderecosSalvos);
            }

            // Carregar endereço ativo
            const enderecoAtivoSalvo = localStorage.getItem('enderecoAtivo');
            if (enderecoAtivoSalvo) {
                enderecoAtivo = JSON.parse(enderecoAtivoSalvo);
            }
        }

        if (enderecosUsuario.length === 0) {
            // Se não há endereços salvos, mostrar mensagem para adicionar
            enderecosSelecao.innerHTML = `
                <div class="enderecos-empty">
                    <div class="enderecos-empty-icon">📍</div>
                    <h4>Nenhum endereço cadastrado</h4>
                    <p>Você precisa cadastrar pelo menos um endereço para solicitar serviços.</p>
                    <button class="btn-primary" onclick="window.location.href='enderecos.html'" style="margin-top: 1rem;">Cadastrar Endereço</button>
                </div>
            `;
            return;
        }

        // Criar cards de endereço
        const enderecosHtml = enderecosUsuario.map((endereco, index) => {
            const isAtivo = enderecoAtivo && enderecoAtivo.id === endereco.id;
            const enderecoCompleto = endereco.enderecoCompleto || `${endereco.logradouro}, ${endereco.numero}${endereco.complemento ? ', ' + endereco.complemento : ''} - ${endereco.bairro}, ${endereco.cidade}/${endereco.estado}`;

            return `
                <div class="endereco-card ${isAtivo ? 'selected' : ''}" onclick="selecionarEndereco('${endereco.id}', '${enderecoCompleto.replace(/'/g, "\\'")}')">
                    <div class="endereco-icon">
                        <img src="./imgs/mapaicon.png" alt="Localização">
                    </div>
                    <div class="endereco-info">
                        <div class="endereco-nome">${endereco.logradouro}, ${endereco.numero}</div>
                        <div class="endereco-detalhes">${endereco.bairro}, ${endereco.cidade}/${endereco.estado}</div>
                        ${endereco.cep ? `<div class="endereco-cep">CEP: ${endereco.cep}</div>` : ''}
                    </div>
                </div>
            `;
        }).join('');

        enderecosSelecao.innerHTML = enderecosHtml;

        // Selecionar endereço ativo por padrão
        if (enderecoAtivo) {
            const enderecoInput = document.getElementById('pedidoEndereco');
            if (enderecoInput) {
                const enderecoCompleto = enderecoAtivo.enderecoCompleto || `${enderecoAtivo.logradouro}, ${enderecoAtivo.numero}${enderecoAtivo.complemento ? ', ' + enderecoAtivo.complemento : ''} - ${enderecoAtivo.bairro}, ${enderecoAtivo.cidade}/${enderecoAtivo.estado}`;
                enderecoInput.value = enderecoCompleto;
            }
        }

    } catch (error) {
        console.error('Erro ao carregar endereços:', error);
        enderecosSelecao.innerHTML = `
            <div class="enderecos-empty">
                <h4>Erro ao carregar endereços</h4>
                <p>Tente recarregar a página ou cadastre um novo endereço.</p>
                <button class="btn-primary" onclick="window.location.href='enderecos.html'" style="margin-top: 1rem;">Cadastrar Endereço</button>
            </div>
        `;
    }
}

// Função para selecionar endereço
function selecionarEndereco(enderecoId, enderecoCompleto) {
    // Remover seleção anterior
    document.querySelectorAll('.endereco-card').forEach(card => {
        card.classList.remove('selected');
        const badge = card.querySelector('.endereco-badge');
        if (badge && !badge.textContent.includes('ATIVO')) {
            badge.remove();
        }
    });

    // Adicionar seleção ao card clicado
    const cardSelecionado = document.querySelector(`[onclick*="selecionarEndereco('${enderecoId}'"]`);
    if (cardSelecionado) {
        cardSelecionado.classList.add('selected');

        // Adicionar indicador visual se não tiver
        if (!cardSelecionado.querySelector('.endereco-badge')) {
            const badge = document.createElement('span');
            badge.className = 'endereco-badge';
            badge.textContent = '✓';
            cardSelecionado.appendChild(badge);
        }
    }

    // Atualizar campo hidden
    const enderecoInput = document.getElementById('pedidoEndereco');
    if (enderecoInput) {
        enderecoInput.value = enderecoCompleto;
    }
}

// Modal de novo pedido
window.abrirNovoPedidoModal = async function() {
    if (!firebaseEnabled) {
        alert('Sistema temporariamente indisponível. Tente novamente mais tarde.');
        return;
    }

    if (!userData || !userData.id) {
        alert('Você precisa estar logado para fazer pedidos.');
        return;
    }

    try {
        await carregarServicosNoModal();
        await carregarEnderecosNoModal();
        const modal = document.getElementById('novoPedidoModal');
        if (modal) {
            // Remover área de anexo
            const anexoField = document.querySelector('label[for="pedidoAnexo"]');
            if (anexoField) {
                const formField = anexoField.closest('.form-field');
                if (formField) {
                    formField.remove();
                }
            }

            modal.style.display = 'block';
            modal.style.zIndex = '9999';
            configurarDataMinima();
            configurarCalculoValor();

            // Inicializar seção de serviços por panela
            const quantidadePanelas = document.getElementById('quantidadePanelas');
            if (quantidadePanelas && parseInt(quantidadePanelas.value) > 1) {
                atualizarServicosPorPanela(parseInt(quantidadePanelas.value));
            }
        } else {
            alert('Erro ao abrir formulário. Elemento não encontrado.');
        }

    } catch (error) {
        console.error('Erro ao abrir modal:', error);
        alert('Erro ao abrir formulário. Tente novamente.');
    }
};

function configurarDataMinima() {
    const dataInput = document.getElementById('dataMaximaEntrega');
    if (!dataInput) return;

    try {
        const hoje = new Date();
        const amanha = new Date(hoje);
        amanha.setDate(hoje.getDate() + 1);

        const ano = amanha.getFullYear();
        const mes = String(amanha.getMonth() + 1).padStart(2, '0');
        const dia = String(amanha.getDate()).padStart(2, '0');

        const dataMinima = `${ano}-${mes}-${dia}`;

        dataInput.min = dataMinima;
        dataInput.setAttribute('min', dataMinima);

        const valorAtual = dataInput.value;
        if (valorAtual && new Date(valorAtual) < new Date(dataMinima)) {
            dataInput.value = '';
        }

    } catch (error) {
        console.error('Erro ao configurar data mínima:', error);
    }
}

async function carregarServicosNoModal() {
    const servicosCheckboxes = document.getElementById('servicosCheckboxes');
    if (!servicosCheckboxes) return;

    servicosCheckboxes.innerHTML = '<div>Carregando serviços...</div>';

    try {
        const servicos = window.SERVICOS_DISPONIVEIS || [
            'Troca de borracha de panela de pressão',
            'Troca de pino e válvulas de segurança',
            'Troca de trava/pino de trava'
        ];

        servicosCheckboxes.innerHTML = '';

        servicos.forEach((servico, index) => {
            const valor = VALORES_SERVICOS[servico] || 35.00;
            const checkboxItem = document.createElement('div');
            checkboxItem.className = 'servico-checkbox-item';

            checkboxItem.innerHTML = `
                <input type="checkbox" id="servico_${index}" value="${servico}" data-valor="${valor}">
                <label for="servico_${index}">${servico}</label>
                <span class="servico-valor">R$ ${valor.toFixed(2)}</span>
            `;

            servicosCheckboxes.appendChild(checkboxItem);
        });

    } catch (error) {
        console.error('Erro ao carregar serviços:', error);
        servicosCheckboxes.innerHTML = '<div>Erro ao carregar serviços</div>';
    }
}

function configurarCalculoValor() {
    const checkboxes = document.querySelectorAll('#servicosCheckboxes input[type="checkbox"]');
    const valorInput = document.getElementById('pedidoValorEstimado');
    const quantidadeInput = document.getElementById('quantidadePanelas');

    if (!valorInput) return;

    function calcularValorTotal() {
        const quantidadePanelas = parseInt(quantidadeInput?.value) || 1;

        if (quantidadePanelas === 1) {
            // Para uma panela, usar os checkboxes principais
            let totalServicos = 0;
            checkboxes.forEach(cb => {
                if (cb.checked) {
                    const valor = parseFloat(cb.dataset.valor) || 35.00;
                    totalServicos += valor;
                }
            });
            valorInput.value = totalServicos.toFixed(2);
        } else {
            // Para múltiplas panelas, calcular baseado nos serviços específicos por panela
            let valorTotal = 0;

            for (let i = 1; i <= quantidadePanelas; i++) {
                const panelaCheckboxes = document.querySelectorAll(`#servicos-panela-${i} input[type="checkbox"]:checked`);
                let valorPanela = 0;

                panelaCheckboxes.forEach(cb => {
                    const servico = cb.dataset.servico;
                    const valor = VALORES_SERVICOS[servico] || 35.00;
                    valorPanela += valor;
                });

                valorTotal += valorPanela;
            }

            valorInput.value = valorTotal.toFixed(2);
        }
    }

    // Adicionar event listeners para checkboxes principais
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', calcularValorTotal);
    });

    // Adicionar event listener para mudanças na quantidade
    if (quantidadeInput) {
        quantidadeInput.addEventListener('input', calcularValorTotal);
        quantidadeInput.addEventListener('change', calcularValorTotal);
    }

    // Calcular valor inicial
    calcularValorTotal();
}

async function criarNovoPedido() {
    if (!firebaseEnabled || !userData) {
        alert('Sistema indisponível ou você não está logado.');
        return;
    }

    try {
        console.log('🔄 Coletando dados do pedido...');
        const dados = await coletarDadosPedido();
        if (!dados) {
            console.log('❌ Dados do pedido não coletados');
            return;
        }

        console.log('📤 Enviando pedido para Firebase...', dados);
        const solicitacaoId = await window.salvarSolicitacaoServico(dados);
        console.log('📨 ID da solicitação recebida:', solicitacaoId);

        if (solicitacaoId && typeof solicitacaoId === 'string' && solicitacaoId.length > 0) {
            console.log('✅ Criando pedido local...');
            const pedidoCriado = mapearSolicitacaoParaPedido({
                id: solicitacaoId,
                ...dados,
                status: 'pendente',
                dataCriacao: new Date().toISOString()
            });

            if (pedidoCriado) {
                console.log('💾 Salvando pedido localmente...');
                pedidos.push(pedidoCriado);
                savePedidos();
                renderPedidos();

                console.log('🎉 Pedido criado com sucesso!');
                mostrarPopupSucesso();

                const modal = document.getElementById('novoPedidoModal');
                if (modal) {
                    modal.style.display = 'none';
                    const form = document.getElementById('novoPedidoForm');
                    if (form) form.reset();
                }
            } else {
                console.error('❌ Erro ao mapear pedido criado');
                alert('Erro ao processar pedido criado. Tente novamente.');
            }
        } else {
            console.warn('⚠️ Solicitação enviada mas sem ID válido:', solicitacaoId);
            alert('Pedido enviado, mas pode não aparecer imediatamente. Recarregue a página.');
        }

    } catch (error) {
        console.error('❌ Erro ao criar pedido:', error);
        alert('Erro ao enviar pedido. Verifique sua conexão e tente novamente.');
    }
}

async function coletarDadosPedido() {
    const endereco = document.getElementById('pedidoEndereco').value.trim();
    if (!endereco) {
        alert('Informe um endereço.');
        return null;
    }

    const prioridade = document.getElementById('prioridadePedido').value;
    const descricao = document.getElementById('pedidoDescricao').value.trim();
    const tipoEntrega = document.getElementById('tipoEntrega').value;
    const dataMaximaInput = document.getElementById('dataMaximaEntrega').value;
    const quantidadePanelas = parseInt(document.getElementById('quantidadePanelas').value) || 1;

    let dataMaximaEntrega = null;
    if (dataMaximaInput) {
        const dataEscolhida = new Date(dataMaximaInput + 'T00:00:00'); // Adicionar hora para evitar timezone issues
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        const diferencaEmDias = Math.floor((dataEscolhida - hoje) / (1000 * 60 * 60 * 24));

        if (diferencaEmDias < 1) {
            alert('A data máxima de entrega deve ser pelo menos 1 dia a partir de hoje.');
            return null;
        }

        // Salvar como string no formato YYYY-MM-DD sem conversão de timezone
        const ano = dataEscolhida.getFullYear();
        const mes = String(dataEscolhida.getMonth() + 1).padStart(2, '0');
        const dia = String(dataEscolhida.getDate()).padStart(2, '0');
        dataMaximaEntrega = `${ano}-${mes}-${dia}`;
    } else {
        alert('A data máxima de entrega é obrigatória.');
        return null;
    }

    let servicosSelecionados = [];
    let servicosPorPanela = [];
    let valorTotal = 0;

    if (quantidadePanelas === 1) {
        // Para uma panela, usar os checkboxes principais
        const checkboxes = document.querySelectorAll('#servicosCheckboxes input[type="checkbox"]:checked');
        checkboxes.forEach(checkbox => {
            servicosSelecionados.push(checkbox.value);
            valorTotal += VALORES_SERVICOS[checkbox.value] || 35.00;
        });

        if (servicosSelecionados.length === 0) {
            alert('Selecione ao menos um serviço.');
            return null;
        }
    } else {
        // Para múltiplas panelas, coletar serviços específicos por panela
        let temServicos = false;

        for (let i = 1; i <= quantidadePanelas; i++) {
            const panelaCheckboxes = document.querySelectorAll(`#servicos-panela-${i} input[type="checkbox"]:checked`);
            const servicosPanela = [];

            panelaCheckboxes.forEach(cb => {
                const servico = cb.dataset.servico;
                servicosPanela.push(servico);
                valorTotal += VALORES_SERVICOS[servico] || 35.00;
            });

            if (servicosPanela.length > 0) {
                temServicos = true;
                servicosPorPanela.push({
                    panela: i,
                    servicos: servicosPanela
                });
            } else {
                // Mesmo sem serviços, incluir a panela vazia
                servicosPorPanela.push({
                    panela: i,
                    servicos: []
                });
            }
        }

        if (!temServicos) {
            alert('Selecione ao menos um serviço para pelo menos uma panela.');
            return null;
        }

        // Para múltiplas panelas, criar lista simples de todos os serviços para compatibilidade
        servicosSelecionados = servicosPorPanela.flatMap(p => p.servicos);
    }

    return {
        servicos: servicosSelecionados,
        servicosPorPanela: quantidadePanelas > 1 ? servicosPorPanela : null,
        endereco: endereco,
        prioridade: prioridade,
        valorEstimado: valorTotal,
        clienteEmail: userData.email || '',
        clienteTipo: userData.tipoUsuario || 'Cliente',
        dataMaximaEntrega: dataMaximaEntrega,
        tipoEntrega: tipoEntrega,
        descricao: descricao || null,
        quantidadePanelas: quantidadePanelas
    };
}

// Configurar navegação
function setupNavigation() {
    const btnServicos = document.getElementById('btnServicos');
    if (btnServicos) {
        btnServicos.addEventListener('click', () => {
            window.location.href = "pedidos.html";
        });
    }
}

// Ações rápidas dos paneleiros
async function aceitarPedidoRapido(pedidoId) {
    const pedido = pedidos.find(p => p && p.id === pedidoId);
    if (!pedido) {
        alert('Pedido não encontrado.');
        return;
    }

    try {
        if (firebaseEnabled && window.aceitarSolicitacaoServico) {
            await window.aceitarSolicitacaoServico(pedidoId);
        }

        pedido.status = 'aguardando_pagamento';
        pedido.paneleiroId = userData.id;
        pedido.paneleiroNome = userData.nome || userData.displayName || userData.name || 'Paneleiro';
        pedido.paneleiroFoto = userData.fotoUrl || userData.photoURL || userData.foto || './imgs/perfil.png';

        savePedidos();

        if (window.criarConversaPedido) {
            window.criarConversaPedido(pedido, 'aceito').catch(e => console.warn('Erro ao criar conversa:', e));
        }

        renderPedidos();

        // Mudar para aba "agendados" se for paneleiro
        if (userType === 'Paneleiro' || userType === 'paneleiro') {
            currentTab = 'agendados';
            updateActiveTab();
            renderPedidos();
        }

        alert('Pedido aceito com sucesso! Aguardando pagamento do cliente.');

    } catch (error) {
        console.error('Erro ao aceitar pedido:', error);
        pedido.status = 'aguardando_pagamento';
        savePedidos();
        renderPedidos();
        alert('Pedido aceito (modificado localmente).');
    }
}

async function negociarPedidoRapido(pedidoId) {
    const pedido = pedidos.find(p => p && p.id === pedidoId);
    if (!pedido) {
        alert('Pedido não encontrado.');
        return;
    }

    try {
        // Verificar se a função existe
        if (typeof window.criarConversaPedido !== 'function') {
            alert('Sistema de mensagens temporariamente indisponível. Tente novamente mais tarde.');
            return;
        }

        const conversaId = await window.criarConversaPedido(pedido, 'negociacao');

        if (conversaId) {
            localStorage.setItem('conversaAberta', conversaId);
            // Pequeno delay para garantir que o localStorage seja salvo
            setTimeout(() => {
                window.location.href = 'mensagens.html';
            }, 100);
        } else {
            alert('Erro ao iniciar conversa. Tente novamente.');
        }

    } catch (error) {
        console.error('Erro ao criar conversa:', error);
        alert('Erro ao iniciar negociação. Verifique sua conexão e tente novamente.');
    }
}

// Funções utilitárias
function formatDate(dateString) {
    try {
        return new Intl.DateTimeFormat('pt-BR').format(new Date(dateString));
    } catch (e) {
        return 'Data inválida';
    }
}

function formatDateTime(dateString) {
    try {
        return new Intl.DateTimeFormat('pt-BR').format(new Date(dateString));
    } catch (e) {
        return 'Data inválida';
    }
}

function formatRelativeTime(dateString) {
    try {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;

        if (diffMs < 3 * 60 * 1000) return 'Agora';
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        if (diffMinutes < 60) return `${diffMinutes} min atrás`;
        const diffHours = Math.floor(diffMinutes / 60);
        if (diffHours < 24) {
            if (diffHours === 1) return 'há 1 hora';
            return `há ${diffHours} horas`;
        }

        const dataHoje = new Date(now);
        dataHoje.setHours(0, 0, 0, 0);
        const dataItem = new Date(date);
        dataItem.setHours(0, 0, 0, 0);

        if (dataHoje.getTime() === dataItem.getTime()) {
            return 'Hoje';
        } else if (dataHoje.getTime() - dataItem.getTime() === 24 * 60 * 60 * 1000) {
            return 'Ontem';
        } else {
            return formatDate(dateString);
        }
    } catch (e) {
        return 'Data inválida';
    }
}

// Gerenciar botão de solicitar serviço
function manageRequestServiceButton() {
    try {
        let button = document.querySelector('.request-service-fixed-btn');

        // Para clientes, sempre mostrar o botão (independente da aba)
        if (userType === 'Cliente' || userType === 'cliente') {
            // Se o botão não existe, criar
            if (!button) {
                const buttonWrapper = document.createElement('div');
                buttonWrapper.className = 'request-service-fixed-wrapper';
                buttonWrapper.innerHTML = `<button class="request-service-fixed-btn" onclick="abrirNovoPedidoModal()">Solicitar Serviço</button>`;
                document.body.appendChild(buttonWrapper);
                button = document.querySelector('.request-service-fixed-btn');
            }
            // Sempre mostrar para clientes
            if (button) {
                button.style.display = 'block';
            }
        } else {
            // Para paneleiros, só mostrar se necessário
            if (button) {
                if (currentTab === 'recebidos') {
                    button.style.display = 'block';
                } else {
                    button.style.display = 'none';
                }
            }
        }
    } catch (e) {
        console.warn('⚠️ Erro ao gerenciar botão:', e);
    }
}







// Função para configurar controle de quantidade
function setupQuantityControl() {
    const btnDiminuir = document.getElementById('btnDiminuirQuantidade');
    const btnAumentar = document.getElementById('btnAumentarQuantidade');
    const inputQuantidade = document.getElementById('quantidadePanelas');

    if (!btnDiminuir || !btnAumentar || !inputQuantidade) return;

    function updateButtons() {
        const quantidade = parseInt(inputQuantidade.value) || 1;
        const quantidadeAnterior = parseInt(inputQuantidade.dataset.anterior) || 1;

        btnDiminuir.disabled = quantidade <= 1;
        btnAumentar.disabled = quantidade >= 50;

        // Se mudou de 1 para múltiplas panelas, limpar checkboxes dos serviços necessários
        if (quantidadeAnterior === 1 && quantidade > 1) {
            const servicosNecessariosCheckboxes = document.querySelectorAll('#servicosCheckboxes input[type="checkbox"]');
            servicosNecessariosCheckboxes.forEach(cb => cb.checked = false);
            // Recalcular valor após limpar checkboxes
            setTimeout(() => {
                const valorInput = document.getElementById('pedidoValorEstimado');
                if (valorInput) valorInput.value = '0.00';
            }, 10);
        }

        // Se mudou de múltiplas para 1 panela, limpar checkboxes das panelas específicas
        if (quantidadeAnterior > 1 && quantidade === 1) {
            const panelaCheckboxes = document.querySelectorAll('#servicosPorPanela input[type="checkbox"]');
            panelaCheckboxes.forEach(cb => cb.checked = false);
            // Recalcular valor após limpar checkboxes
            setTimeout(() => {
                const valorInput = document.getElementById('pedidoValorEstimado');
                if (valorInput) valorInput.value = '0.00';
            }, 10);
        }

        // Atualizar valor anterior
        inputQuantidade.dataset.anterior = quantidade;

        // Mostrar/ocultar seção de serviços por panela
        const servicosPorPanelaContainer = document.getElementById('servicosPorPanelaContainer');
        if (servicosPorPanelaContainer) {
            if (quantidade > 1) {
                servicosPorPanelaContainer.style.display = 'block';
                atualizarServicosPorPanela(quantidade);
            } else {
                servicosPorPanelaContainer.style.display = 'none';
            }
        }

        // Mostrar/ocultar "Serviços Necessários"
        const servicosNecessariosField = document.querySelector('label[for="servicosSelecionados"]');
        if (servicosNecessariosField) {
            const parentField = servicosNecessariosField.closest('.form-field');
            if (parentField) {
                parentField.style.display = quantidade > 1 ? 'none' : 'block';
            }
        }
    }

    btnDiminuir.addEventListener('click', () => {
        const quantidade = parseInt(inputQuantidade.value) || 1;
        if (quantidade > 1) {
            inputQuantidade.value = quantidade - 1;
            updateButtons();
        }
    });

    btnAumentar.addEventListener('click', () => {
        const quantidade = parseInt(inputQuantidade.value) || 1;
        if (quantidade < 50) {
            inputQuantidade.value = quantidade + 1;
            updateButtons();
        }
    });

    inputQuantidade.addEventListener('input', () => {
        let quantidade = parseInt(inputQuantidade.value) || 1;
        if (quantidade < 1) quantidade = 1;
        if (quantidade > 50) quantidade = 50;
        inputQuantidade.value = quantidade;
        updateButtons();
    });

    inputQuantidade.addEventListener('blur', () => {
        let quantidade = parseInt(inputQuantidade.value) || 1;
        if (quantidade < 1) quantidade = 1;
        if (quantidade > 50) quantidade = 50;
        inputQuantidade.value = quantidade;
        updateButtons();
    });

    // Inicializar estado dos botões
    updateButtons();
}

// Função para atualizar a seção de serviços por panela
function atualizarServicosPorPanela(quantidadePanelas) {
    const servicosPorPanela = document.getElementById('servicosPorPanela');
    if (!servicosPorPanela) return;

    servicosPorPanela.innerHTML = '';

    const servicosDisponiveis = window.SERVICOS_DISPONIVEIS || [
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
        'Revisão geral da panela de pressão'
    ];

    for (let i = 1; i <= quantidadePanelas; i++) {
        const panelaDiv = document.createElement('div');
        panelaDiv.className = 'panela-servicos';
        panelaDiv.innerHTML = `
            <h4>Panela ${i}</h4>
            <div class="servicos-panela-checkboxes" id="servicos-panela-${i}">
                ${servicosDisponiveis.map((servico, index) => `
                    <div class="servico-checkbox-item">
                        <input type="checkbox" id="panela-${i}-servico-${index}" value="${servico}" data-panela="${i}" data-servico="${servico}">
                        <label for="panela-${i}-servico-${index}">${servico}</label>
                    </div>
                `).join('')}
            </div>
        `;
        servicosPorPanela.appendChild(panelaDiv);
    }

    // Adicionar event listeners para recalcular valor
    const checkboxes = servicosPorPanela.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            configurarCalculoValor();
        });
    });

    // Ocultar "Serviços Necessários" se tiver mais de 1 panela
    const servicosNecessariosField = document.querySelector('label[for="servicosSelecionados"]');
    if (servicosNecessariosField) {
        const parentField = servicosNecessariosField.closest('.form-field');
        if (parentField) {
            parentField.style.display = quantidadePanelas > 1 ? 'none' : 'block';
        }
    }
}

// Função para cancelar pedido do cliente (exclui o pedido)
async function cancelarPedidoCliente(pedidoId) {
    const pedidoIndex = pedidos.findIndex(p => p && p.id === pedidoId);
    if (pedidoIndex === -1) {
        alert('Pedido não encontrado.');
        return;
    }

    const pedido = pedidos[pedidoIndex];

    if (!confirm('Tem certeza que deseja CANCELAR este pedido? O pedido será EXCLUÍDO permanentemente.')) {
        return;
    }

    try {
        if (firebaseEnabled && window.atualizarStatusSolicitacao) {
            await window.atualizarStatusSolicitacao(pedidoId, 'cancelado');
        }

        // Remover notificações relacionadas ao pedido cancelado
        if (firebaseEnabled && window.db) {
            try {
                console.log('🗑️ [CANCELAR] Removendo notificações do pedido cancelado:', pedidoId);
                const notificacoesQuery = window.db.collection("notificacao_servicos")
                    .where("solicitacaoId", "==", pedidoId);

                const notificacoesSnapshot = await notificacoesQuery.get();
                console.log(`📋 [CANCELAR] Encontradas ${notificacoesSnapshot.size} notificações para remoção`);

                const deletePromises = notificacoesSnapshot.docs.map(async (doc) => {
                    console.log(`🗑️ [CANCELAR] Removendo notificação: ${doc.id}`);
                    return doc.ref.delete();
                });

                await Promise.all(deletePromises);
                console.log('✅ [CANCELAR] Todas as notificações foram removidas');

            } catch (notificacaoError) {
                console.warn('⚠️ [CANCELAR] Erro ao remover notificações, mas pedido foi cancelado:', notificacaoError);
            }
        }

        // Remover o pedido da lista local
        pedidos.splice(pedidoIndex, 1);
        savePedidos();
        await syncPedidosFirebase();
        renderPedidos();

        alert('Pedido CANCELADO e EXCLUÍDO com sucesso!');

    } catch (error) {
        console.error('Erro ao cancelar pedido:', error);
        // Mesmo em caso de erro, remover localmente
        pedidos.splice(pedidoIndex, 1);
        savePedidos();
        renderPedidos();
        alert('Pedido cancelado e excluído (fallback local usado).');
    }
}

// Função para efetuar pagamento - abre modal de seleção de forma de pagamento
async function efetuarPagamento(pedidoId) {
    const pedido = pedidos.find(p => p && p.id === pedidoId);
    if (!pedido) {
        alert('Pedido não encontrado.');
        return;
    }

    // Abrir modal de seleção de forma de pagamento
    abrirModalSelecaoPagamento(pedido);
}

// Função para abrir modal de seleção de forma de pagamento
function abrirModalSelecaoPagamento(pedido) {
    // Remover modal existente se houver
    const existingModal = document.getElementById('selecaoPagamentoModal');
    if (existingModal) {
        existingModal.remove();
    }

    const modal = document.createElement('dialog');
    modal.id = 'selecaoPagamentoModal';
    modal.className = 'modal selecao-pagamento-modal fullscreen';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2 class="modal-title">Escolher Forma de Pagamento</h2>
                <button class="modal-close" onclick="fecharModalSelecaoPagamento()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="pagamento-valor-resumo">
                    <div class="valor-total-grande">
                        <span class="moeda">R$</span>
                        <span class="valor">${pedido.valor.toFixed(2)}</span>
                    </div>
                    <p class="pedido-info">Pedido #${pedido.id ? pedido.id.substring(0, 8) : 'N/A'}</p>
                </div>

                <div class="formas-pagamento">
                    <h3>Como deseja pagar?</h3>

                    <div class="opcao-pagamento" onclick="selecionarFormaPagamento('pix', '${pedido.id}')">
                        <div class="pagamento-icon">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <rect x="2" y="2" width="20" height="20" rx="4" fill="#32BCAD"/>
                                <path d="M7 7h10v10H7V7z" fill="white"/>
                                <text x="12" y="16" text-anchor="middle" fill="#32BCAD" font-size="12" font-weight="bold">PIX</text>
                            </svg>
                        </div>
                        <div class="pagamento-info">
                            <h4>PIX</h4>
                            <p>Aprovação instantânea</p>
                        </div>
                        <div class="pagamento-check">
                            <div class="radio-button"></div>
                        </div>
                    </div>

                    <div class="opcao-pagamento active" onclick="selecionarFormaPagamento('cartao', '${pedido.id}')">
                        <div class="pagamento-icon">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <rect x="2" y="5" width="20" height="14" rx="3" fill="#1a73e8"/>
                                <rect x="4" y="9" width="16" height="2" fill="white"/>
                                <rect x="4" y="13" width="12" height="2" fill="white"/>
                            </svg>
                        </div>
                        <div class="pagamento-info">
                            <h4>Cartão de Crédito</h4>
                            <p>Até 12x sem juros</p>
                        </div>
                        <div class="pagamento-check">
                            <div class="radio-button active"></div>
                        </div>
                    </div>

                    <div class="opcao-pagamento" onclick="selecionarFormaPagamento('boleto', '${pedido.id}')">
                        <div class="pagamento-icon">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <rect x="2" y="3" width="20" height="18" rx="2" fill="#666"/>
                                <rect x="4" y="6" width="16" height="1" fill="white"/>
                                <rect x="4" y="9" width="12" height="1" fill="white"/>
                                <rect x="4" y="12" width="16" height="1" fill="white"/>
                                <rect x="4" y="15" width="10" height="1" fill="white"/>
                            </svg>
                        </div>
                        <div class="pagamento-info">
                            <h4>Boleto Bancário</h4>
                            <p>Vencimento em 3 dias</p>
                        </div>
                        <div class="pagamento-check">
                            <div class="radio-button"></div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn-secondary" onclick="fecharModalSelecaoPagamento()">Cancelar</button>
                <button class="btn-primary" id="btnContinuarPagamento" onclick="continuarPagamento('${pedido.id}')">Continuar</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Mostrar o modal
    if (modal.showModal) {
        modal.showModal();
    }

    // Definir forma de pagamento padrão (cartão)
    window.formaPagamentoSelecionada = 'cartao';
}

// Função para selecionar forma de pagamento
function selecionarFormaPagamento(forma, pedidoId) {
    // Remover classe active de todas as opções
    document.querySelectorAll('.opcao-pagamento').forEach(opcao => {
        opcao.classList.remove('active');
        opcao.querySelector('.radio-button').classList.remove('active');
    });

    // Adicionar classe active na opção selecionada
    event.currentTarget.classList.add('active');
    event.currentTarget.querySelector('.radio-button').classList.add('active');

    // Salvar forma selecionada
    window.formaPagamentoSelecionada = forma;
}

// Função para continuar com o pagamento
function continuarPagamento(pedidoId) {
    const pedido = pedidos.find(p => p && p.id === pedidoId);
    if (!pedido) {
        alert('Pedido não encontrado.');
        return;
    }

    // Fechar modal de seleção
    fecharModalSelecaoPagamento();

    // Abrir modal específico baseado na forma selecionada
    const forma = window.formaPagamentoSelecionada || 'cartao';

    if (forma === 'pix') {
        abrirModalPagamentoPix(pedido);
    } else if (forma === 'cartao') {
        abrirModalPagamento(pedido);
    } else if (forma === 'boleto') {
        abrirModalPagamentoBoleto(pedido);
    }
}

// Função para fechar modal de seleção de pagamento
function fecharModalSelecaoPagamento() {
    const modal = document.getElementById('selecaoPagamentoModal');
    if (modal && modal.close) {
        modal.close();
    }
}

// Função para abrir modal de pagamento PIX
function abrirModalPagamentoPix(pedido) {
    const modal = document.createElement('div');
    modal.id = 'pixModal';
    modal.className = 'modal-overlay fullscreen';
    modal.innerHTML = `
        <div class="modal-content fullscreen">
            <div class="modal-header">
                <h2 class="modal-title">Pagamento via PIX</h2>
                <button class="modal-close" onclick="fecharModalPix()">&times;</button>
            </div>
            <div class="modal-body scrollable">
                <div class="pagamento-resumo">
                    <div class="pagamento-header">
                        <h3>Resumo do Pedido</h3>
                        <div class="pedido-valor-total">
                            <span class="valor-label">Total a pagar:</span>
                            <span class="valor-total">R$ ${pedido.valor.toFixed(2)}</span>
                        </div>
                    </div>
                    <div class="pedido-info-pagamento">
                        <div class="info-row">
                            <span class="info-label">ID do Pedido:</span>
                            <span class="info-value">${pedido.id || 'Não informado'}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Serviços:</span>
                            <span class="info-value">${pedido.servicos.length} serviço${pedido.servicos.length !== 1 ? 's' : ''}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Quantidade de panelas:</span>
                            <span class="info-value">${pedido.quantidadePanelas || 1}</span>
                        </div>
                    </div>
                </div>

                <div class="pix-content">
                    <div class="pix-info">
                        <h3>Como pagar com PIX</h3>
                        <p>Escaneie o QR Code abaixo com o aplicativo do seu banco ou copie o código PIX para colar no app.</p>
                    </div>

                    <div class="pix-qr-container">
                        <div class="pix-qr-code">
                            <div class="qr-placeholder">
                                <svg width="120" height="120" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <rect x="2" y="2" width="20" height="20" rx="2" fill="#1a73e8"/>
                                    <rect x="4" y="4" width="16" height="16" rx="1" fill="white"/>
                                    <rect x="6" y="6" width="4" height="4" fill="#1a73e8"/>
                                    <rect x="14" y="6" width="4" height="4" fill="#1a73e8"/>
                                    <rect x="6" y="14" width="4" height="4" fill="#1a73e8"/>
                                    <rect x="14" y="14" width="4" height="4" fill="#1a73e8"/>
                                    <rect x="10" y="10" width="4" height="4" fill="#1a73e8"/>
                                </svg>
                            </div>
                            <p>QR Code PIX</p>
                        </div>
                    </div>

                    <div class="pix-codigo">
                        <label>Código PIX (copie e cole):</label>
                        <div class="codigo-container">
                            <input type="text" class="codigo-input" value="00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-42661417400052040000530398654041.005802BR5913FULANO DE TAL6008BRASILIA62070503***63041D76" readonly>
                            <button class="btn-copiar" onclick="copiarCodigoPix()">Copiar</button>
                        </div>
                    </div>

                    <div class="pix-instrucoes">
                        <h4>Instruções:</h4>
                        <ol>
                            <li>Abra o app do seu banco ou carteira digital</li>
                            <li>Escolha a opção PIX</li>
                            <li>Escaneie o QR Code ou cole o código</li>
                            <li>Confirme o pagamento</li>
                        </ol>
                        <p class="pix-aviso">O pagamento será confirmado automaticamente em até 30 segundos.</p>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn-secondary" onclick="fecharModalPix()">Voltar</button>
                <button class="btn-primary" onclick="simularPagamentoPix('${pedido.id}')">Verificar</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
}

// Função para abrir modal de pagamento Boleto
function abrirModalPagamentoBoleto(pedido) {
    const modal = document.createElement('div');
    modal.id = 'boletoModal';
    modal.className = 'modal-overlay fullscreen';
    modal.innerHTML = `
        <div class="modal-content fullscreen">
            <div class="modal-header">
                <h2 class="modal-title">Pagamento via Boleto</h2>
                <button class="modal-close" onclick="fecharModalBoleto()">&times;</button>
            </div>
            <div class="modal-body scrollable">
                <div class="pagamento-resumo">
                    <div class="pagamento-header">
                        <h3>Resumo do Pedido</h3>
                        <div class="pedido-valor-total">
                            <span class="valor-label">Total a pagar:</span>
                            <span class="valor-total">R$ ${pedido.valor.toFixed(2)}</span>
                        </div>
                    </div>
                    <div class="pedido-info-pagamento">
                        <div class="info-row">
                            <span class="info-label">ID do Pedido:</span>
                            <span class="info-value">${pedido.id || 'Não informado'}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Serviços:</span>
                            <span class="info-value">${pedido.servicos.length} serviço${pedido.servicos.length !== 1 ? 's' : ''}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Quantidade de panelas:</span>
                            <span class="info-value">${pedido.quantidadePanelas || 1}</span>
                        </div>
                    </div>
                </div>

                <div class="boleto-content">
                    <div class="boleto-info">
                        <h3>Boleto Bancário</h3>
                        <p>Imprima ou salve o boleto abaixo para pagamento. O vencimento é em 3 dias úteis.</p>
                    </div>

                    <div class="boleto-dados">
                        <div class="boleto-codigo">
                            <label>Linha Digitável:</label>
                            <div class="codigo-container">
                                <input type="text" class="codigo-input" value="23793.38128 60007.827136 95000.063305 9 917300000041.50" readonly>
                                <button class="btn-copiar" onclick="copiarCodigoBoleto()">Copiar</button>
                            </div>
                        </div>

                        <div class="boleto-detalhes">
                            <div class="info-row">
                                <span class="info-label">Beneficiário:</span>
                                <span class="info-value">ConsertaJá Serviços Ltda</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">CPF/CNPJ:</span>
                                <span class="info-value">12.345.678/0001-90</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">Vencimento:</span>
                                <span class="info-value">${new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR')}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">Valor:</span>
                                <span class="info-value">R$ ${pedido.valor.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    <div class="boleto-acoes">
                        <button class="btn-secondary" onclick="imprimirBoleto()">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6v-8z" stroke="currentColor" stroke-width="2"/>
                            </svg>
                            Imprimir Boleto
                        </button>
                        <button class="btn-secondary" onclick="baixarBoleto()">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" stroke="currentColor" stroke-width="2"/>
                            </svg>
                            Baixar PDF
                        </button>
                    </div>

                    <div class="boleto-instrucoes">
                        <h4>Instruções:</h4>
                        <ul>
                            <li>O boleto vence em 3 dias úteis</li>
                            <li>Pague em qualquer banco ou casa lotérica</li>
                            <li>A confirmação pode levar até 2 dias úteis</li>
                            <li>Após o pagamento, o pedido será agendado automaticamente</li>
                        </ul>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn-secondary" onclick="fecharModalBoleto()">Voltar</button>
                <button class="btn-primary" onclick="confirmarBoletoGerado('${pedido.id}')">Continuar</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
}

// Função para copiar código PIX
function copiarCodigoPix() {
    const codigoInput = document.querySelector('#pixModal .codigo-input');
    if (codigoInput) {
        codigoInput.select();
        document.execCommand('copy');
        showSuccessAlert('Código PIX copiado!');
    }
}

// Função para copiar código do boleto
function copiarCodigoBoleto() {
    const codigoInput = document.querySelector('#boletoModal .codigo-input');
    if (codigoInput) {
        codigoInput.select();
        document.execCommand('copy');
        showSuccessAlert('Código do boleto copiado!');
    }
}

// Função para simular pagamento PIX
async function simularPagamentoPix(pedidoId) {
    const pedido = pedidos.find(p => p && p.id === pedidoId);
    if (!pedido) {
        alert('Pedido não encontrado.');
        return;
    }

    // Desabilitar botão
    const btnVerificar = document.querySelector('#pixModal .btn-primary');
    if (btnVerificar) {
        btnVerificar.disabled = true;
        btnVerificar.textContent = 'Verificando...';
    }

    try {
        // Simular verificação
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Salvar método de pagamento
        pedido.metodoPagamento = 'pix';

        // Atualizar status para 'agendado' e salvar método de pagamento no Firebase
        if (firebaseEnabled && window.atualizarStatusSolicitacao) {
            await window.atualizarStatusSolicitacao(pedido.id, 'agendado', { metodoPagamento: 'pix' });
            pedido.status = 'agendado';
            savePedidos();
        } else {
            pedido.status = 'agendado';
            savePedidos();
        }

        // Fechar modal PIX
        fecharModalPix();

        // Mostrar sucesso
        mostrarPagamentoSucesso(pedido);

        // Atualizar lista
        renderPedidos();

    } catch (error) {
        console.error('Erro ao verificar PIX:', error);
        alert('Erro ao verificar pagamento. Tente novamente.');
        if (btnVerificar) {
            btnVerificar.disabled = false;
            btnVerificar.textContent = 'Já paguei - Verificar';
        }
    }
}

// Função para confirmar boleto gerado
async function confirmarBoletoGerado(pedidoId) {
    const pedido = pedidos.find(p => p && p.id === pedidoId);
    if (!pedido) {
        alert('Pedido não encontrado.');
        return;
    }

    // Salvar método de pagamento
    pedido.metodoPagamento = 'boleto';

    // Atualizar status para 'aguardando_pagamento' e salvar método de pagamento no Firebase
    if (firebaseEnabled && window.atualizarStatusSolicitacao) {
        await window.atualizarStatusSolicitacao(pedido.id, 'aguardando_pagamento', { metodoPagamento: 'boleto' });
        pedido.status = 'aguardando_pagamento';
        savePedidos();
    } else {
        pedido.status = 'aguardando_pagamento';
        savePedidos();
    }

    // Fechar modal boleto
    fecharModalBoleto();

    // Mostrar modal de confirmação
    const modal = document.createElement('div');
    modal.id = 'boletoConfirmacaoModal';
    modal.className = 'modal-overlay fullscreen';
    modal.innerHTML = `
        <div class="modal-content fullscreen">
            <div class="modal-body">
                <div class="boleto-confirmacao">
                    <div class="confirmacao-icon">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="12" cy="12" r="10" fill="#4CAF50"/>
                            <path d="M8 12l2 2 4-4" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </div>
                    <h3>Boleto Gerado!</h3>
                    <p>O boleto foi gerado com sucesso. Você pode imprimi-lo ou copiá-lo agora.</p>
                    <p class="boleto-aviso">Após o pagamento, o pedido será agendado automaticamente em até 2 dias úteis.</p>
                    <div class="pedido-info-sucesso">
                        <div class="info-row">
                            <span class="info-label">Pedido:</span>
                            <span class="info-value">#${pedido.id ? pedido.id.substring(0, 8) : 'N/A'}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Valor:</span>
                            <span class="info-value">R$ ${pedido.valor.toFixed(2)}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Vencimento:</span>
                            <span class="info-value">${new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR')}</span>
                        </div>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn-primary" onclick="fecharConfirmacaoBoleto()">Fechar</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
}

// Função para imprimir boleto
function imprimirBoleto() {
    window.print();
}

// Função para baixar boleto
function baixarBoleto() {
    alert('Funcionalidade de download será implementada em breve.');
}

// Função para fechar modal PIX
function fecharModalPix() {
    const modal = document.getElementById('pixModal');
    if (modal) {
        modal.remove();
    }
}

// Função para fechar modal Boleto
function fecharModalBoleto() {
    const modal = document.getElementById('boletoModal');
    if (modal) {
        modal.remove();
    }
}

// Função para fechar confirmação do boleto
function fecharConfirmacaoBoleto() {
    const modal = document.getElementById('boletoConfirmacaoModal');
    if (modal) {
        modal.remove();
    }
}

// Função para abrir modal de pagamento
function abrirModalPagamento(pedido) {
    const modal = document.createElement('div');
    modal.id = 'pagamentoModal';
    modal.className = 'modal-overlay fullscreen';
    modal.innerHTML = `
        <div class="modal-content fullscreen">
            <div class="modal-header">
                <h2 class="modal-title">Efetuar Pagamento</h2>
                <button class="modal-close" onclick="fecharModalPagamento()">&times;</button>
            </div>
            <div class="modal-body scrollable">
                <div class="pagamento-resumo">
                    <div class="pagamento-header">
                        <h3>Resumo do Pedido</h3>
                        <div class="pedido-valor-total">
                            <span class="valor-label">Total a pagar:</span>
                            <span class="valor-total">R$ ${pedido.valor.toFixed(2)}</span>
                        </div>
                    </div>
                    <div class="pedido-info-pagamento">
                        <div class="info-row">
                            <span class="info-label">ID do Pedido:</span>
                            <span class="info-value">${pedido.id || 'Não informado'}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Serviços:</span>
                            <span class="info-value">${pedido.servicos.length} serviço${pedido.servicos.length !== 1 ? 's' : ''}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Quantidade de panelas:</span>
                            <span class="info-value">${pedido.quantidadePanelas || 1}</span>
                        </div>
                    </div>
                </div>

                <form id="pagamentoForm" class="pagamento-form">
                    <div class="form-section">
                        <h4>Dados do Cartão</h4>
                        <div class="form-field">
                            <label class="form-label">Número do Cartão</label>
                            <input type="text" class="form-input" id="numeroCartao" placeholder="0000 0000 0000 0000" maxlength="19" required>
                        </div>
                        <div class="form-row">
                            <div class="form-field">
                                <label class="form-label">Validade</label>
                                <input type="text" class="form-input" id="validadeCartao" placeholder="MM/AA" maxlength="5" required>
                            </div>
                            <div class="form-field">
                                <label class="form-label">CVV</label>
                                <input type="text" class="form-input" id="cvvCartao" placeholder="000" maxlength="4" required>
                            </div>
                        </div>
                        <div class="form-field">
                            <label class="form-label">Nome no Cartão</label>
                            <input type="text" class="form-input" id="nomeCartao" placeholder="Nome como está no cartão" required>
                        </div>
                    </div>

                    <div class="form-section">
                        <h4>Dados Pessoais</h4>
                        <div class="form-field">
                            <label class="form-label">CPF</label>
                            <input type="text" class="form-input" id="cpfPagamento" placeholder="000.000.000-00" maxlength="14" required>
                        </div>
                        <div class="form-field">
                            <label class="form-label">Email</label>
                            <input type="email" class="form-input" id="emailPagamento" placeholder="seu@email.com" required>
                        </div>
                    </div>

                    <div class="pagamento-termos">
                        <label class="checkbox-label">
                            <input type="checkbox" id="aceitarTermos" required>
                            <span>Aceito os <a href="#" onclick="abrirTermos()">termos de serviço</a> e <a href="#" onclick="abrirPolitica()">política de privacidade</a></span>
                        </label>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button class="btn-secondary" onclick="fecharModalPagamento()">Cancelar</button>
                <button class="btn-primary" onclick="processarPagamento('${pedido.id}')">Pagar</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Configurar máscaras e validações
    configurarMascarasPagamento();

    // Focar no primeiro campo
    setTimeout(() => {
        const primeiroCampo = document.getElementById('numeroCartao');
        if (primeiroCampo) primeiroCampo.focus();
    }, 100);
}

// Função para configurar máscaras de pagamento
function configurarMascarasPagamento() {
    // Máscara para número do cartão
    const numeroCartao = document.getElementById('numeroCartao');
    if (numeroCartao) {
        numeroCartao.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            value = value.replace(/(\d{4})(?=\d)/g, '$1 ');
            e.target.value = value.trim();
        });
    }

    // Máscara para validade
    const validadeCartao = document.getElementById('validadeCartao');
    if (validadeCartao) {
        validadeCartao.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length >= 2) {
                value = value.substring(0, 2) + '/' + value.substring(2, 4);
            }
            e.target.value = value;
        });
    }

    // Máscara para CPF
    const cpfPagamento = document.getElementById('cpfPagamento');
    if (cpfPagamento) {
        cpfPagamento.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            value = value.replace(/(\d{3})(\d)/, '$1.$2');
            value = value.replace(/(\d{3})(\d)/, '$1.$2');
            value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
            e.target.value = value;
        });
    }
}

// Função para processar pagamento
async function processarPagamento(pedidoId) {
    const pedido = pedidos.find(p => p && p.id === pedidoId);
    if (!pedido) {
        alert('Pedido não encontrado.');
        return;
    }

    const form = document.getElementById('pagamentoForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    // Coletar dados do formulário
    const dadosPagamento = {
        numeroCartao: document.getElementById('numeroCartao').value.replace(/\s/g, ''),
        validade: document.getElementById('validadeCartao').value,
        cvv: document.getElementById('cvvCartao').value,
        nomeCartao: document.getElementById('nomeCartao').value,
        cpf: document.getElementById('cpfPagamento').value,
        email: document.getElementById('emailPagamento').value,
        aceitarTermos: document.getElementById('aceitarTermos').checked
    };

    // Validações básicas
    if (!dadosPagamento.aceitarTermos) {
        alert('Você deve aceitar os termos de serviço.');
        return;
    }

    if (dadosPagamento.numeroCartao.length < 13) {
        alert('Número do cartão inválido.');
        return;
    }

    if (!/^\d{2}\/\d{2}$/.test(dadosPagamento.validade)) {
        alert('Validade do cartão inválida.');
        return;
    }

    if (dadosPagamento.cvv.length < 3) {
        alert('CVV inválido.');
        return;
    }

    // Desabilitar botão durante processamento
    const btnPagar = document.querySelector('.modal-footer .btn-primary');
    if (btnPagar) {
        btnPagar.disabled = true;
        btnPagar.textContent = 'Processando...';
    }

    try {
        // Simular processamento de pagamento
        await mostrarProcessamentoPagamento();

        // Simular delay de processamento
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Salvar método de pagamento
        pedido.metodoPagamento = 'cartao';

        // Atualizar status para 'agendado' após pagamento
        if (firebaseEnabled && window.atualizarStatusSolicitacao) {
            await window.atualizarStatusSolicitacao(pedido.id, 'agendado');
            pedido.status = 'agendado';
            savePedidos();
        } else {
            pedido.status = 'agendado';
            savePedidos();
        }

        // Fechar modal de pagamento
        fecharModalPagamento();

        // Mostrar sucesso
        mostrarPagamentoSucesso(pedido);

        // Atualizar lista de pedidos
        renderPedidos();

    } catch (error) {
        console.error('Erro ao processar pagamento:', error);
        alert('Erro ao processar pagamento. Tente novamente.');
        if (btnPagar) {
            btnPagar.disabled = false;
            btnPagar.textContent = `Pagar R$ ${pedido.valor.toFixed(2)}`;
        }
    }
}

// Função para mostrar processamento do pagamento
async function mostrarProcessamentoPagamento() {
    const modalBody = document.querySelector('#pagamentoModal .modal-body');
    if (!modalBody) return;

    modalBody.innerHTML = `
        <div class="pagamento-processando">
            <div class="processando-icon">
                <div class="spinner"></div>
            </div>
            <h3>Processando Pagamento</h3>
            <p>Por favor, aguarde enquanto processamos seu pagamento...</p>
            <div class="processando-etapas">
                <div class="etapa active">Validando dados</div>
                <div class="etapa">Autorizando pagamento</div>
                <div class="etapa">Confirmando transação</div>
            </div>
        </div>
    `;

    // Animação das etapas
    const etapas = document.querySelectorAll('.processando-etapas .etapa');
    for (let i = 0; i < etapas.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 800));
        if (etapas[i]) etapas[i].classList.add('active');
    }
}

// Função para mostrar sucesso do pagamento
function mostrarPagamentoSucesso(pedido) {
    const modal = document.createElement('div');
    modal.id = 'pagamentoSucessoModal';
    modal.className = 'modal-overlay fullscreen';
    modal.innerHTML = `
        <div class="modal-content fullscreen sucesso-modal">
            <div class="modal-body">
                <div class="sucesso-content">
                    <div class="sucesso-icon">
                        <svg width="80" height="80" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="12" cy="12" r="10" fill="#4CAF50"/>
                            <path d="M8 12l2 2 4-4" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </div>
                    <h3>Pagamento Aprovado!</h3>
                    <p>Seu pagamento foi processado com sucesso.</p>
                    <div class="pedido-info-sucesso">
                        <div class="info-row">
                            <span class="info-label">Pedido:</span>
                            <span class="info-value">#${pedido.id ? pedido.id.substring(0, 8) : 'N/A'}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Valor:</span>
                            <span class="info-value">R$ ${pedido.valor.toFixed(2)}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Status:</span>
                            <span class="info-value status-agendado">Agendado</span>
                        </div>
                    </div>
                    <p class="sucesso-mensagem">O paneleiro entrará em contato em breve para agendar o serviço.</p>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn-primary" onclick="fecharPagamentoSucesso()">Fechar</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
}

// Função para fechar modal de pagamento
function fecharModalPagamento() {
    const modal = document.getElementById('pagamentoModal');
    if (modal) {
        modal.remove();
    }
}

// Função para fechar modal de sucesso do pagamento
function fecharPagamentoSucesso() {
    const modal = document.getElementById('pagamentoSucessoModal');
    if (modal) {
        modal.remove();
    }
}

// Funções para abrir termos e política
function abrirTermos() {
    window.open('termos.html', '_blank');
}

function abrirPolitica() {
    window.open('politica.html', '_blank');
}

// Função para atualizar contador de notificações
function atualizarContadorNotificacoes() {
    const badge = document.getElementById('notificationBadge');
    if (!badge) return;

    let contador = 0;

    // Para paneleiros: contar pedidos recebidos pendentes
    if (userType === 'Paneleiro' || userType === 'paneleiro') {
        contador = pedidos.filter(p => p && p.tipo === 'recebido' && p.status === 'pendente').length;
    } else {
        // Para clientes: não mostrar notificações por enquanto (implementar mensagens reais depois)
        contador = 0;
    }

    if (contador > 0) {
        badge.textContent = contador > 9 ? '9+' : contador.toString();
        badge.classList.remove('hidden');
    } else {
        badge.classList.add('hidden');
    }
}

// Função para voltar pedido para pendente (versão rápida para card)
async function voltarPedidoPendenteRapido(pedidoId) {
    const pedido = pedidos.find(p => p && p.id === pedidoId);
    if (!pedido) {
        alert('Pedido não encontrado.');
        return;
    }

    if (!confirm('Tem certeza que deseja voltar este pedido para PENDENTE? Outros paneleiros poderão vê-lo novamente.')) {
        return;
    }

    try {
        // Limpar completamente todas as informações do paneleiro
        delete pedido.paneleiroId;
        delete pedido.paneleiroNome;
        delete pedido.paneleiroFoto;
        delete pedido.paneleiroEmail;
        delete pedido.paneleiroTelefone;
        delete pedido.dataAceitacao;
        delete pedido.dataAgendamento;

        // Atualizar status para 'pendente' no Firebase com dados limpos
        if (firebaseEnabled && window.atualizarStatusSolicitacao) {
            await window.atualizarStatusSolicitacao(pedidoId, 'pendente');
            pedido.status = 'pendente';
        } else {
            pedido.status = 'pendente';
        }

        savePedidos();
        await syncPedidosFirebase();
        renderPedidos();

        // Notificar outros paneleiros sobre o pedido disponível
        if (firebaseEnabled) {
            try {
                // Tentar notificar via Firebase se disponível
                if (window.notificarPaneleirosPedidoDisponivel) {
                    await window.notificarPaneleirosPedidoDisponivel(pedidoId);
                    console.log('✅ Notificação enviada para outros paneleiros');
                } else {
                    console.log('⚠️ Função de notificação não disponível, mas pedido foi limpo');
                }
            } catch (notifyError) {
                console.warn('⚠️ Não foi possível enviar notificação:', notifyError);
            }
        }

        alert('Pedido voltou para PENDENTE com sucesso! Outros paneleiros foram notificados.');

    } catch (error) {
        console.error('Erro ao voltar pedido para pendente:', error);
        if (pedido) {
            pedido.status = 'pendente';
            // Limpar dados mesmo em caso de erro
            delete pedido.paneleiroId;
            delete pedido.paneleiroNome;
            delete pedido.paneleiroFoto;
            delete pedido.paneleiroEmail;
            delete pedido.paneleiroTelefone;
            delete pedido.dataAceitacao;
            delete pedido.dataAgendamento;
            savePedidos();
        }
        renderPedidos();
        alert('Pedido voltou para pendente (fallback local usado).');
    }
}

// Função para voltar pedido para pendente
async function voltarPedidoPendente() {
    if (!currentPedido) {
        alert('Nenhum pedido selecionado.');
        return;
    }

    if (!confirm('Tem certeza que deseja voltar este pedido para PENDENTE? Outros paneleiros poderão vê-lo novamente.')) {
        return;
    }

    try {
        // Limpar completamente todas as informações do paneleiro
        delete currentPedido.paneleiroId;
        delete currentPedido.paneleiroNome;
        delete currentPedido.paneleiroFoto;
        delete currentPedido.paneleiroEmail;
        delete currentPedido.paneleiroTelefone;
        delete currentPedido.dataAceitacao;
        delete currentPedido.dataAgendamento;

        // Atualizar status para 'pendente' no Firebase com dados limpos
        if (firebaseEnabled && window.atualizarStatusSolicitacao) {
            await window.atualizarStatusSolicitacao(currentPedido.id, 'pendente');
            currentPedido.status = 'pendente';
        } else {
            currentPedido.status = 'pendente';
        }

        savePedidos();
        await syncPedidosFirebase();
        renderPedidos();
        fecharModal();

        // Notificar outros paneleiros sobre o pedido disponível
        if (firebaseEnabled) {
            try {
                // Tentar notificar via Firebase se disponível
                if (window.notificarPaneleirosPedidoDisponivel) {
                    await window.notificarPaneleirosPedidoDisponivel(currentPedido.id);
                    console.log('✅ Notificação enviada para outros paneleiros');
                } else {
                    console.log('⚠️ Função de notificação não disponível, mas pedido foi limpo');
                }
            } catch (notifyError) {
                console.warn('⚠️ Não foi possível enviar notificação:', notifyError);
            }
        }

        alert('Pedido voltou para PENDENTE com sucesso! Outros paneleiros foram notificados.');

    } catch (error) {
        console.error('Erro ao voltar pedido para pendente:', error);
        if (currentPedido) {
            currentPedido.status = 'pendente';
            // Limpar dados mesmo em caso de erro
            delete currentPedido.paneleiroId;
            delete currentPedido.paneleiroNome;
            delete currentPedido.paneleiroFoto;
            delete currentPedido.paneleiroEmail;
            delete currentPedido.paneleiroTelefone;
            delete currentPedido.dataAceitacao;
            delete currentPedido.dataAgendamento;
            savePedidos();
        }
        renderPedidos();
        fecharModal();
        alert('Pedido voltou para pendente (fallback local usado).');
    }
}

// Função para mostrar popup de sucesso animado
function mostrarPopupSucesso() {
    // Criar o overlay escuro
    const overlay = document.createElement('div');
    overlay.id = 'successPopupOverlay';
    overlay.style.cssText = `
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        background: rgba(0, 0, 0, 0.5) !important;
        z-index: 2147483647 !important;
        opacity: 0;
        transition: opacity 0.3s ease;
    `;

    // Criar o popup
    const popup = document.createElement('div');
    popup.id = 'successPopup';
    popup.style.cssText = `
        position: fixed !important;
        top: 50% !important;
        left: 50% !important;
        transform: translate(-50%, -50%) scale(0.8) !important;
        background: white !important;
        border-radius: 16px !important;
        padding: 32px !important;
        text-align: center !important;
        box-shadow: 0 8px 32px rgba(0,0,0,0.3) !important;
        z-index: 2147483647 !important;
        opacity: 0;
        transition: all 0.3s ease;
        font-family: 'Poppins', sans-serif !important;
        max-width: 300px !important;
        width: 90% !important;
        position: relative !important;
    `;

    popup.innerHTML = `
        <button onclick="fecharPopupSucesso()" style="
            position: absolute;
            top: 10px;
            right: 10px;
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: #666;
            width: 30px;
            height: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            transition: background 0.2s;
        " onmouseover="this.style.background='#f0f0f0'" onmouseout="this.style.background='none'">×</button>
        <div style="margin-bottom: 16px;">
            <img src="./imgs/panela1.png" alt="Panela" style="width: 140px; height: 140px; border-radius: 50%; border: 4px solid #4CAF50; padding: 8px; background: #f8f9fa;">
        </div>
        <div style="color: #4CAF50; font-size: 18px; font-weight: 600; margin-bottom: 8px;">
            Solicitação Enviada!
        </div>
        <div style="color: #666; font-size: 14px;">
            Seu pedido foi enviado com sucesso aos paneleiros próximos.
        </div>
    `;

    // Garantir que o popup apareça acima de tudo
    // Remover qualquer popup existente primeiro
    const existingOverlay = document.getElementById('successPopupOverlay');
    const existingPopup = document.getElementById('successPopup');
    if (existingOverlay) existingOverlay.remove();
    if (existingPopup) existingPopup.remove();

    // Criar um container isolado para o popup
    const popupContainer = document.createElement('div');
    popupContainer.id = 'popupContainer';
    popupContainer.style.cssText = `
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        z-index: 2147483647 !important;
        pointer-events: none !important;
    `;

    // Adicionar elementos ao container isolado
    popupContainer.appendChild(overlay);
    popupContainer.appendChild(popup);

    // Adicionar o container ao body
    document.body.appendChild(popupContainer);

    // Forçar estilos inline extremos
    overlay.style.pointerEvents = 'auto';
    popup.style.pointerEvents = 'auto';

    // Animação de entrada
    setTimeout(() => {
        overlay.style.opacity = '1';
        popup.style.opacity = '1';
        popup.style.transform = 'translate(-50%, -50%) scale(1)';
    }, 10);

    // Animação de saída e remoção após 7 segundos
    setTimeout(() => {
        fecharPopupSucesso();
    }, 7000);
}

// Função para fechar o popup de sucesso
function fecharPopupSucesso() {
    const popup = document.getElementById('successPopup');
    const overlay = document.getElementById('successPopupOverlay');
    if (popup) {
        popup.style.opacity = '0';
        popup.style.transform = 'translate(-50%, -50%) scale(0.8)';
        setTimeout(() => {
            if (popup.parentNode) {
                popup.parentNode.removeChild(popup);
            }
        }, 300);
    }
    if (overlay) {
        overlay.style.opacity = '0';
        setTimeout(() => {
            if (overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
            }
        }, 300);
    }
}

// Função para concluir serviço rapidamente (do card)
async function concluirServicoRapido(pedidoId) {
    const pedido = pedidos.find(p => p && p.id === pedidoId);
    if (!pedido) {
        alert('Pedido não encontrado.');
        return;
    }

    // Mostrar pop-up de confirmação personalizado
    mostrarConfirmacaoConclusao(pedidoId);
}

// Função para mostrar pop-up de confirmação de conclusão
function mostrarConfirmacaoConclusao(pedidoId) {
    const pedido = pedidos.find(p => p && p.id === pedidoId);
    if (!pedido) return;

    // Remover modal existente se houver
    const existingModal = document.getElementById('confirmacaoConclusaoModal');
    if (existingModal) {
        existingModal.remove();
    }

    const modal = document.createElement('div');
    modal.id = 'confirmacaoConclusaoModal';
    modal.className = 'modal-overlay fullscreen';
    modal.innerHTML = `
        <div class="modal-content fullscreen">
            <div class="modal-header">
                <h2 class="modal-title">Confirmar Conclusão do Serviço</h2>
                <button class="modal-close" onclick="fecharConfirmacaoConclusao()">&times;</button>
            </div>
            <div class="modal-body scrollable" style="max-height: 70vh; overflow-y: auto;">
                <div class="confirmacao-content" style="
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    padding: 1rem;
                    gap: 1rem;
                ">
                    <div class="confirmacao-icon" style="
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        width: 90px;
                        height: 90px;
                        border-radius: 50%;
                        background: #4CAF50;
                        margin: 0.5rem auto;
                    ">
                        <svg width="45" height="45" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="
                            display: block;
                        ">
                            <path d="M8 12l2 2 4-4" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </div>
                    <h3 style="
                        margin: 0 0 1rem 0;
                        font-size: 1.25rem;
                        font-weight: 600;
                        color: #333;
                        line-height: 1.4;
                        text-align: left;
                        max-width: 400px;
                    ">Tem certeza que deseja marcar este serviço como concluído?</h3>
                    <p class="confirmacao-info" style="
                        margin: 0 0 1.5rem 0;
                        color: #666;
                        font-size: 0.95rem;
                        line-height: 1.5;
                        text-align: left;
                        max-width: 400px;
                    ">
                        Ao confirmar, o status do pedido será alterado para "Aguardando Entrega" e o cliente poderá confirmar a entrega quando receber o serviço.
                    </p>
                    <div class="pedido-info-confirmacao" style="
                        background: #f8f9fa;
                        border-radius: 8px;
                        padding: 1.5rem;
                        width: 100%;
                        max-width: 350px;
                        margin: 0 auto;
                    ">
                        <div class="info-row" style="
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                            margin-bottom: 0.75rem;
                            padding-bottom: 0.5rem;
                            border-bottom: 1px solid #e9ecef;
                        ">
                            <span class="info-label" style="font-weight: 500; color: #666;">Pedido:</span>
                            <span class="info-value" style="font-weight: 600; color: #333;">#${pedido.id ? pedido.id.substring(0, 8) : 'N/A'}</span>
                        </div>
                        <div class="info-row" style="
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                            margin-bottom: 0.75rem;
                            padding-bottom: 0.5rem;
                            border-bottom: 1px solid #e9ecef;
                        ">
                            <span class="info-label" style="font-weight: 500; color: #666;">Cliente:</span>
                            <span class="info-value" style="font-weight: 600; color: #333;">${pedido.cliente ? pedido.cliente.nome : 'Cliente'}</span>
                        </div>
                        <div class="info-row" style="
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                        ">
                            <span class="info-label" style="font-weight: 500; color: #666;">Valor:</span>
                            <span class="info-value" style="font-weight: 600; color: #1a73e8;">R$ ${pedido.valor.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            </div>
            <div class="modal-footer" style="
                display: flex;
                gap: 1rem;
                justify-content: center;
                padding: 1.5rem;
                border-top: 1px solid #e9ecef;
            ">
                <button class="btn-secondary" onclick="fecharConfirmacaoConclusao()" style="
                    padding: 0.75rem 1.5rem;
                    border: 1px solid #dee2e6;
                    background: white;
                    color: #6c757d;
                    border-radius: 6px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s;
                ">Cancelar</button>
                <button class="btn-primary" onclick="confirmarConclusao('${pedidoId}')" style="
                    padding: 0.75rem 1.5rem;
                    border: none;
                    background: #1a73e8;
                    color: white;
                    border-radius: 6px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s;
                ">Confirmar</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
}

// Função para fechar modal de confirmação
function fecharConfirmacaoConclusao() {
    const modal = document.getElementById('confirmacaoConclusaoModal');
    if (modal) {
        modal.remove();
    }
}

// Função para confirmar conclusão do serviço
async function confirmarConclusao(pedidoId) {
    const pedido = pedidos.find(p => p && p.id === pedidoId);
    if (!pedido) {
        alert('Pedido não encontrado.');
        return;
    }

    try {
        // Fechar modal de confirmação
        fecharConfirmacaoConclusao();

        // Atualizar status para 'aguardando_entrega'
        if (firebaseEnabled && window.atualizarStatusSolicitacao) {
            await window.atualizarStatusSolicitacao(pedido.id, 'aguardando_entrega');
            pedido.status = 'aguardando_entrega';
            savePedidos();
        } else {
            pedido.status = 'aguardando_entrega';
            savePedidos();
        }

        renderPedidos();
        showSuccessAlert('Serviço marcado como concluído! Status alterado para "Aguardando Entrega".');

    } catch (error) {
        console.error('Erro ao concluir serviço:', error);
        if (pedido) {
            pedido.status = 'aguardando_entrega';
            savePedidos();
        }
        renderPedidos();
        showSuccessAlert('Serviço marcado como concluído (fallback local usado).');
    }
}

// Função para confirmar entrega do cliente
async function confirmarEntrega(pedidoId) {
    const pedido = pedidos.find(p => p && p.id === pedidoId);
    if (!pedido) {
        alert('Pedido não encontrado.');
        return;
    }

    // Mostrar pop-up de avaliação ao invés de confirmação direta
    mostrarPopupAvaliacao(pedidoId);
}

// Função para abrir mensagem rapidamente (do card)
async function abrirMensagemRapido(pedidoId) {
    const pedido = pedidos.find(p => p && p.id === pedidoId);
    if (!pedido) {
        alert('Pedido não encontrado.');
        return;
    }

    try {
        // Verificar se a função existe
        if (typeof window.criarConversaPedido !== 'function') {
            alert('Sistema de mensagens temporariamente indisponível. Tente novamente mais tarde.');
            return;
        }

        const conversaId = await window.criarConversaPedido(pedido, 'mensagem');

        if (conversaId) {
            localStorage.setItem('conversaAberta', conversaId);
            // Pequeno delay para garantir que o localStorage seja salvo
            setTimeout(() => {
                window.location.href = 'mensagens.html';
            }, 100);
        } else {
            alert('Erro ao abrir conversa. Tente novamente.');
        }

    } catch (error) {
        console.error('Erro ao abrir mensagem:', error);
        alert('Erro ao abrir conversa. Verifique sua conexão e tente novamente.');
    }
}

// Função para verificar se há um pedido específico para abrir (vindo das mensagens)
function verificarPedidoParaAbrir() {
    const pedidoId = localStorage.getItem('pedidoParaAbrir');
    if (!pedidoId) return;

    // Limpar o localStorage
    localStorage.removeItem('pedidoParaAbrir');

    // Encontrar o pedido
    const pedido = pedidos.find(p => p && p.id === pedidoId);
    if (!pedido) {
        console.warn('Pedido para abrir não encontrado:', pedidoId);
        return;
    }

    // Determinar qual aba o pedido deve estar baseado no status
    let tabAlvo = 'recebidos'; // padrão

    if (userType === 'Paneleiro' || userType === 'paneleiro') {
        if (pedido.status === 'pendente') {
            tabAlvo = 'recebidos';
        } else if (pedido.status === 'agendado' || pedido.status === 'aguardando_pagamento') {
            tabAlvo = 'agendados';
        } else if (pedido.status === 'concluido' || pedido.status === 'cancelado' || pedido.status === 'reembolsado') {
            tabAlvo = 'historico';
        }
    } else {
        // Cliente
        if (pedido.status === 'concluido' || pedido.status === 'cancelado' || pedido.status === 'reembolsado') {
            tabAlvo = 'historico';
        } else {
            tabAlvo = 'enviados';
        }
    }

    // Mudar para a aba correta
    currentTab = tabAlvo;
    updateActiveTab();

    // Re-renderizar para mostrar a aba correta
    renderPedidos();

    // Pequeno delay para garantir que os elementos estão renderizados
    setTimeout(() => {
        // Abrir os detalhes do pedido
        openPedidoDetails(pedidoId);
    }, 100);
}

// Função para mostrar pop-up de avaliação
function mostrarPopupAvaliacao(pedidoId) {
    const pedido = pedidos.find(p => p && p.id === pedidoId);
    if (!pedido) {
        alert('Pedido não encontrado.');
        return;
    }

    // Remover modal existente se houver
    const existingModal = document.getElementById('avaliacaoModal');
    if (existingModal) {
        existingModal.remove();
    }

    const modal = document.createElement('div');
    modal.id = 'avaliacaoModal';
    modal.className = 'modal-overlay fullscreen';
    modal.innerHTML = `
        <div class="modal-content fullscreen">
            <div class="modal-header">
                <h2 class="modal-title">Avaliar Serviço</h2>
                <button class="modal-close" onclick="fecharAvaliacaoModal()">&times;</button>
            </div>
            <div class="modal-body scrollable" style="max-height: 70vh; overflow-y: auto;">
                <div class="avaliacao-content">
                    <div class="avaliacao-header">
                        <div class="paneleiro-info-avaliacao">
                            <img src="${pedido.paneleiroFoto || './imgs/perfil.png'}" alt="${pedido.paneleiroNome || 'Paneleiro'}" class="paneleiro-avatar-avaliacao">
                            <div class="paneleiro-detalhes-avaliacao">
                                <h3>${pedido.paneleiroNome || 'Paneleiro'}</h3>
                                <p>Serviço realizado</p>
                            </div>
                        </div>
                        <div class="pedido-info-avaliacao">
                            <p><strong>Pedido:</strong> #${pedido.id ? pedido.id.substring(0, 8) : 'N/A'}</p>
                            <p><strong>Valor:</strong> R$ ${pedido.valor.toFixed(2)}</p>
                        </div>
                    </div>

                    <div class="avaliacao-form">
                        <h4>Como foi o serviço?</h4>
                        <div class="estrelas-container">
                            <div class="estrelas" id="estrelasAvaliacao">
                                <span class="estrela" data-value="1" style="font-size: 2.25rem;">★</span>
                                <span class="estrela" data-value="2" style="font-size: 2.25rem;">★</span>
                                <span class="estrela" data-value="3" style="font-size: 2.25rem;">★</span>
                                <span class="estrela" data-value="4" style="font-size: 2.25rem;">★</span>
                                <span class="estrela" data-value="5" style="font-size: 2.25rem;">★</span>
                            </div>
                            <div class="avaliacao-texto" id="avaliacaoTexto">Selecione uma avaliação</div>
                        </div>

                        <div class="comentario-container" id="comentarioContainer" style="display: none;">
                            <label for="comentarioAvaliacao">Conte-nos mais sobre sua experiência (obrigatório para avaliações ruins)</label>
                            <textarea id="comentarioAvaliacao" placeholder="Descreva o que achou do serviço..." rows="3" maxlength="500"></textarea>
                            <div class="caracteres-contador">
                                <span id="contadorCaracteres">0</span>/500 caracteres
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn-secondary" onclick="fecharAvaliacaoModal()">Pular Avaliação</button>
                <button class="btn-primary" id="btnEnviarAvaliacao" onclick="enviarAvaliacao('${pedidoId}')" disabled>Enviar Avaliação</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Configurar eventos das estrelas
    configurarEstrelasAvaliacao();

    // Configurar contador de caracteres
    configurarContadorCaracteres();
}

// Função para configurar eventos das estrelas
function configurarEstrelasAvaliacao() {
    const estrelas = document.querySelectorAll('#estrelasAvaliacao .estrela');
    const textoAvaliacao = document.getElementById('avaliacaoTexto');
    const comentarioContainer = document.getElementById('comentarioContainer');
    const btnEnviar = document.getElementById('btnEnviarAvaliacao');

    let avaliacaoSelecionada = 0;

    estrelas.forEach(estrela => {
        estrela.addEventListener('click', () => {
            const valor = parseInt(estrela.dataset.value);
            avaliacaoSelecionada = valor;

            // Atualizar visual das estrelas
            estrelas.forEach((e, index) => {
                if (index < valor) {
                    e.classList.add('selecionada');
                } else {
                    e.classList.remove('selecionada');
                }
            });

            // Atualizar texto
            const textos = {
                1: 'Muito ruim',
                2: 'Ruim',
                3: 'Regular',
                4: 'Bom',
                5: 'Excelente'
            };
            textoAvaliacao.textContent = textos[valor] || 'Selecione uma avaliação';

            // Mostrar campo de comentário se avaliação <= 2
            if (valor <= 2) {
                comentarioContainer.style.display = 'block';
            } else {
                comentarioContainer.style.display = 'none';
            }

            // Habilitar botão
            btnEnviar.disabled = false;
        });

        estrela.addEventListener('mouseover', () => {
            const valor = parseInt(estrela.dataset.value);
            estrelas.forEach((e, index) => {
                if (index < valor) {
                    e.classList.add('hover');
                } else {
                    e.classList.remove('hover');
                }
            });
        });

        estrela.addEventListener('mouseout', () => {
            estrelas.forEach(e => e.classList.remove('hover'));
        });
    });

    // Salvar avaliação selecionada globalmente
    window.avaliacaoAtual = avaliacaoSelecionada;
}

// Função para configurar contador de caracteres
function configurarContadorCaracteres() {
    const textarea = document.getElementById('comentarioAvaliacao');
    const contador = document.getElementById('contadorCaracteres');

    if (textarea && contador) {
        textarea.addEventListener('input', () => {
            const caracteres = textarea.value.length;
            contador.textContent = caracteres;
        });
    }
}

// Função para enviar avaliação
async function enviarAvaliacao(pedidoId) {
    const pedido = pedidos.find(p => p && p.id === pedidoId);
    if (!pedido) {
        alert('Pedido não encontrado.');
        return;
    }

    // Verificar avaliação diretamente das estrelas selecionadas
    const estrelasSelecionadas = document.querySelectorAll('#estrelasAvaliacao .estrela.selecionada');
    const avaliacao = estrelasSelecionadas.length;

    if (avaliacao === 0) {
        alert('Selecione uma avaliação.');
        return;
    }

    // Pegar comentário apenas se avaliação <= 2
    let comentario = '';
    if (avaliacao <= 2) {
        comentario = document.getElementById('comentarioAvaliacao')?.value?.trim() || '';

        // Validar comentário obrigatório para avaliações ruins
        if (!comentario || comentario.length < 10) {
            alert('Para avaliações ruins (1 ou 2 estrelas), é obrigatório fornecer um comentário com pelo menos 10 caracteres descrevendo sua experiência.');
            document.getElementById('comentarioAvaliacao')?.focus();
            return;
        }
    }

    try {
        // Fechar modal de avaliação
        fecharAvaliacaoModal();

        // Salvar avaliação no Firestore junto com o status concluído
        if (firebaseEnabled && window.atualizarStatusSolicitacao) {
            await window.atualizarStatusSolicitacao(pedido.id, 'concluido', {
                avaliacaoCliente: avaliacao,
                comentarioAvaliacao: comentario || null,
                dataAvaliacao: new Date()
            });

            pedido.status = 'concluido';
            pedido.avaliacaoCliente = avaliacao;
            pedido.comentarioAvaliacao = comentario;
            pedido.dataAvaliacao = new Date();
            savePedidos();
        } else {
            // Fallback local
            pedido.status = 'concluido';
            pedido.avaliacaoCliente = avaliacao;
            pedido.comentarioAvaliacao = comentario;
            pedido.dataAvaliacao = new Date();
            savePedidos();
        }

        // Recalcular avaliação no perfil do paneleiro baseada em todos os serviços
        await recalcularAvaliacaoPaneleiro(pedido.paneleiroId);

        renderPedidos();

        // Mostrar mensagem de sucesso
        showSuccessAlert('Avaliação enviada! Obrigado pelo feedback.');

    } catch (error) {
        console.error('Erro ao enviar avaliação:', error);
        // Mesmo em caso de erro, marcar como concluído localmente
        if (pedido) {
            pedido.status = 'concluido';
            pedido.avaliacaoCliente = avaliacao;
            pedido.comentarioAvaliacao = comentario;
            pedido.dataAvaliacao = new Date();
            savePedidos();
        }
        renderPedidos();
        showSuccessAlert('Avaliação enviada (fallback local usado).');
    }
}

// Função para salvar avaliação na solicitação
async function salvarAvaliacaoPedido(pedidoId, avaliacao, comentario) {
    if (!firebaseEnabled || !window.db) {
        console.warn('Firebase não disponível para salvar avaliação');
        return;
    }

    try {
        const solicitacaoRef = window.db.collection('solicitacoes_servicos').doc(pedidoId);
        await solicitacaoRef.update({
            avaliacaoCliente: avaliacao,
            comentarioAvaliacao: comentario || null,
            dataAvaliacao: new Date()
        });
        console.log('✅ Avaliação salva na solicitação');
    } catch (error) {
        console.error('Erro ao salvar avaliação na solicitação:', error);
        throw error;
    }
}

// Função para recalcular avaliação completa do paneleiro baseada em todos os serviços realizados
async function recalcularAvaliacaoPaneleiro(paneleiroId) {
    try {
        console.log('🔄 Recalculando avaliação completa para paneleiro:', paneleiroId);

        // Buscar todos os pedidos onde este paneleiro foi responsável e estão concluídos
        const pedidosPaneleiro = pedidos.filter(pedido =>
            pedido &&
            pedido.paneleiroId === paneleiroId &&
            pedido.status === 'concluido' &&
            pedido.avaliacaoCliente &&
            pedido.avaliacaoCliente > 0
        );

        console.log(`📊 Encontrados ${pedidosPaneleiro.length} pedidos concluídos com avaliação para paneleiro ${paneleiroId}`);

        if (pedidosPaneleiro.length === 0) {
            // Nenhum serviço avaliado ainda - definir avaliação padrão
            const dadosAvaliacaoPadrao = {
                paneleiroId: paneleiroId,
                avaliacao: 5.0,
                totalAvaliacoes: 0,
                ultimaAtualizacao: new Date().toISOString()
            };

            localStorage.setItem(`avaliacao_paneleiro_${paneleiroId}`, JSON.stringify(dadosAvaliacaoPadrao));
            console.log('⚠️ Nenhum serviço avaliado - avaliação padrão definida:', dadosAvaliacaoPadrao);
            return;
        }

        // Calcular média das avaliações
        const avaliacoes = pedidosPaneleiro.map(p => p.avaliacaoCliente);
        const soma = avaliacoes.reduce((acc, val) => acc + val, 0);
        const media = parseFloat((soma / avaliacoes.length).toFixed(1));

        // Salvar avaliação recalculada
        const dadosAvaliacao = {
            paneleiroId: paneleiroId,
            avaliacao: media,
            totalAvaliacoes: avaliacoes.length,
            ultimaAtualizacao: new Date().toISOString()
        };

        localStorage.setItem(`avaliacao_paneleiro_${paneleiroId}`, JSON.stringify(dadosAvaliacao));
        console.log('✅ Avaliação recalculada e salva:', dadosAvaliacao);

        // Opcionalmente, tentar atualizar no Firebase também
        if (firebaseEnabled && window.rtdb) {
            try {
                const paneleiroRef = window.rtdb.ref(`usuarios/${paneleiroId}`);
                await paneleiroRef.update({
                    mediaAvaliacoes: media,
                    totalAvaliacoes: avaliacoes.length,
                    ultimaAtualizacao: new Date().toISOString()
                });
                console.log('✅ Avaliação também atualizada no Firebase');
            } catch (firebaseError) {
                console.warn('⚠️ Não foi possível atualizar avaliação no Firebase:', firebaseError);
            }
        }

    } catch (error) {
        console.error('❌ Erro ao recalcular avaliação do paneleiro:', error);
    }
}

// Função para atualizar avaliação no perfil do paneleiro
async function atualizarAvaliacaoPaneleiro(paneleiroId, novaAvaliacao) {
    console.log('🔄 Iniciando atualização da avaliação do paneleiro:', paneleiroId, 'nova avaliação:', novaAvaliacao);

    // Sempre tentar atualizar dados locais mockados primeiro
    atualizarAvaliacaoMockada(paneleiroId, novaAvaliacao);

    if (!firebaseEnabled || !window.rtdb || !paneleiroId) {
        console.warn('Firebase não disponível ou paneleiroId não informado - apenas dados mockados atualizados');
        return;
    }

    try {
        // Buscar dados atuais do paneleiro no Realtime Database
        const paneleiroRef = window.rtdb.ref(`usuarios/${paneleiroId}`);
        const snapshot = await paneleiroRef.once('value');

        let dadosPaneleiro = {};
        let avaliacoesAtuais = [];
        let totalAvaliacoes = 0;

        if (snapshot.exists()) {
            dadosPaneleiro = snapshot.val();
            avaliacoesAtuais = dadosPaneleiro.avaliacoes || [];
            totalAvaliacoes = dadosPaneleiro.totalAvaliacoes || 0;
            console.log('📊 Dados atuais do Firebase:', { avaliacoesAtuais, totalAvaliacoes });
        } else {
            console.log('👤 Paneleiro não encontrado no Firebase, criando novo registro');
        }

        // Adicionar nova avaliação
        avaliacoesAtuais.push(novaAvaliacao);

        // Calcular nova média
        const somaAvaliacoes = avaliacoesAtuais.reduce((soma, aval) => soma + aval, 0);
        const mediaAvaliacoes = somaAvaliacoes / avaliacoesAtuais.length;

        // Atualizar perfil no Realtime Database
        const dadosAtualizados = {
            avaliacoes: avaliacoesAtuais,
            totalAvaliacoes: totalAvaliacoes + 1,
            mediaAvaliacoes: mediaAvaliacoes,
            ultimaAtualizacao: new Date().toISOString()
        };

        await paneleiroRef.update(dadosAtualizados);

        console.log('✅ Avaliação incrementada no Firebase:', {
            paneleiroId,
            novaAvaliacao,
            mediaAvaliacoes: mediaAvaliacoes.toFixed(1),
            totalAvaliacoes: totalAvaliacoes + 1
        });

        // Também atualizar dados mockados com informações do Firebase
        atualizarAvaliacaoMockada(paneleiroId, novaAvaliacao, mediaAvaliacoes);

    } catch (error) {
        console.error('Erro ao atualizar avaliação do paneleiro no Firebase:', error);
        // Não lançar erro para não quebrar o fluxo - dados mockados já foram atualizados
    }
}

// Função para atualizar avaliações mockadas (dados locais)
function atualizarAvaliacaoMockada(paneleiroId, novaAvaliacao, mediaFirebase = null) {
    try {
        console.log('🔄 Atualizando dados mockados para paneleiro:', paneleiroId);

        // Dados mockados de paneleiros (usados quando Firebase não está disponível)
        const paneleirosMockados = [
            { id: "paneleiro_mock_1", nome: "João Silva", avaliacao: "4.8" },
            { id: "paneleiro_mock_2", nome: "Maria Santos", avaliacao: "4.9" },
            { id: "paneleiro_mock_3", nome: "Pedro Oliveira", avaliacao: "4.7" }
        ];

        // Procurar paneleiro nos dados mockados
        const paneleiroMockado = paneleirosMockados.find(p => p.id === paneleiroId);
        if (!paneleiroMockado) {
            console.log('ℹ️ Paneleiro não encontrado nos dados mockados, isso é normal para paneleiros reais');
            return;
        }

        // Calcular nova média baseada na avaliação atual + nova avaliação
        const avaliacaoAtual = parseFloat(paneleiroMockado.avaliacao);
        const mediaCalculada = mediaFirebase || ((avaliacaoAtual + novaAvaliacao) / 2);

        // Atualizar avaliação mockada
        paneleiroMockado.avaliacao = mediaCalculada.toFixed(1);

        console.log('✅ Dados mockados atualizados:', {
            paneleiroId,
            nome: paneleiroMockado.nome,
            avaliacaoAntiga: avaliacaoAtual,
            novaAvaliacao,
            avaliacaoNova: paneleiroMockado.avaliacao
        });

        // Salvar no localStorage para persistência
        const dadosAvaliacoesMockadas = JSON.parse(localStorage.getItem('avaliacoes_mockadas') || '{}');
        dadosAvaliacoesMockadas[paneleiroId] = {
            avaliacao: paneleiroMockado.avaliacao,
            ultimaAtualizacao: new Date().toISOString()
        };
        localStorage.setItem('avaliacoes_mockadas', JSON.stringify(dadosAvaliacoesMockadas));

    } catch (error) {
        console.error('Erro ao atualizar dados mockados:', error);
    }
}

// Função para gerar estrelas visuais baseada na avaliação
function gerarEstrelasVisuais(avaliacao) {
    const avaliacaoNum = parseFloat(avaliacao) || 0;
    const estrelasCheias = Math.floor(avaliacaoNum);
    const temMeiaEstrela = avaliacaoNum % 1 >= 0.5;

    let estrelasHtml = '';

    // Estrelas cheias
    for (let i = 0; i < estrelasCheias; i++) {
        estrelasHtml += '<span style="color: #ffc107; font-size: 1.2rem;">★</span>';
    }

    // Meia estrela (se aplicável)
    if (temMeiaEstrela) {
        estrelasHtml += '<span style="color: #ffc107; font-size: 1.2rem;">☆</span>';
    }

    // Estrelas vazias para completar 5
    const estrelasRestantes = 5 - estrelasCheias - (temMeiaEstrela ? 1 : 0);
    for (let i = 0; i < estrelasRestantes; i++) {
        estrelasHtml += '<span style="color: #ddd; font-size: 1.2rem;">★</span>';
    }

    return estrelasHtml;
}

// Função para obter avaliação atual de um paneleiro (combinando Firebase, localStorage calculado e dados mockados)
async function obterAvaliacaoPaneleiro(paneleiroId) {
    try {
        // Primeiro tentar buscar do Firebase
        if (firebaseEnabled && window.rtdb && paneleiroId) {
            try {
                const paneleiroRef = window.rtdb.ref(`usuarios/${paneleiroId}`);
                const snapshot = await paneleiroRef.once('value');

                if (snapshot.exists()) {
                    const dados = snapshot.val();
                    if (dados.mediaAvaliacoes) {
                        return {
                            media: dados.mediaAvaliacoes,
                            total: dados.totalAvaliacoes || 0,
                            fonte: 'firebase'
                        };
                    }
                }
            } catch (firebaseError) {
                console.warn('Erro ao buscar avaliação do Firebase:', firebaseError);
            }
        }

        // Segundo: tentar buscar avaliação calculada do localStorage
        const avaliacaoCalculada = localStorage.getItem(`avaliacao_paneleiro_${paneleiroId}`);
        if (avaliacaoCalculada) {
            try {
                const dadosAvaliacao = JSON.parse(avaliacaoCalculada);
                console.log('Avaliação encontrada no localStorage para paneleiro', paneleiroId, ':', dadosAvaliacao);
                return {
                    media: parseFloat(dadosAvaliacao.avaliacao),
                    total: dadosAvaliacao.totalAvaliacoes || 0,
                    fonte: 'localStorage'
                };
            } catch (parseError) {
                console.warn('Erro ao parsear avaliação do localStorage:', parseError);
            }
        }

        // Terceiro: fallback para dados mockados
        const dadosAvaliacoesMockadas = JSON.parse(localStorage.getItem('avaliacoes_mockadas') || '{}');
        if (dadosAvaliacoesMockadas[paneleiroId]) {
            return {
                media: parseFloat(dadosAvaliacoesMockadas[paneleiroId].avaliacao),
                total: 1, // Mock
                fonte: 'mockada'
            };
        }

        // Quarto: fallback final para valores padrão
        const paneleirosPadrao = [
            { id: "paneleiro_mock_1", avaliacao: 4.8 },
            { id: "paneleiro_mock_2", avaliacao: 4.9 },
            { id: "paneleiro_mock_3", avaliacao: 4.7 }
        ];

        const paneleiroPadrao = paneleirosPadrao.find(p => p.id === paneleiroId);
        return {
            media: paneleiroPadrao ? paneleiroPadrao.avaliacao : 5.0,
            total: 1,
            fonte: 'padrao'
        };

    } catch (error) {
        console.error('Erro ao obter avaliação do paneleiro:', error);
        return { media: 5.0, total: 1, fonte: 'erro' };
    }
}

// Tornar função globalmente disponível
window.obterAvaliacaoPaneleiro = obterAvaliacaoPaneleiro;

// Função para fechar modal de avaliação
function fecharAvaliacaoModal() {
    const modal = document.getElementById('avaliacaoModal');
    if (modal) {
        modal.remove();
    }
}

// Inicializar quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    initializeServicosPage();
    setupQuantityControl();
    atualizarContadorNotificacoes();

    // Verificar se deve abrir modal automaticamente (vindo do home)
    if (window.location.hash === '#abrir-modal') {
        // Pequeno delay para garantir que tudo está carregado
        setTimeout(() => {
            abrirNovoPedidoModal();
            // Limpar o hash da URL
            history.replaceState(null, null, window.location.pathname);
        }, 500);
    }
});
