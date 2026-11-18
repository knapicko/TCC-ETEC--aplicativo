console.log('🏠 [HOME] Iniciando carregamento do home_simple.js');

// Função para obter avaliação do paneleiro via RTDB (substitui obterAvaliacaoPaneleiro não disponível)
window.obterAvaliacaoPaneleiroRTDB = async (paneleiroId) => {
  try {
    console.log("📊 [AVALIACAO-RTDB] Buscando avaliação para paneleiro:", paneleiroId);

    const snapshot = await window.rtdbGet(window.rtdbRef(window.rtdb, `usuarios/${paneleiroId}`));

    if (snapshot.exists()) {
      const userData = snapshot.val();
      console.log("✅ [AVALIACAO-RTDB] Dados encontrados:", userData);

      if (userData.mediaAvaliacoes !== undefined && userData.totalAvaliacoes !== undefined) {
        return {
          media: parseFloat(userData.mediaAvaliacoes) || 5.0,
          total: parseInt(userData.totalAvaliacoes) || 0
        };
      } else if (userData.avaliacao !== undefined) {
        return {
          media: parseFloat(userData.avaliacao) || 5.0,
          total: 1
        };
      }
    }

    console.log("⚠️ [AVALIACAO-RTDB] Nenhuma avaliação encontrada, retornando padrão");
    return { media: 5.0, total: 0 };
  } catch (error) {
    console.warn('❌ [AVALIACAO-RTDB] Erro ao obter avaliação:', error);
    return { media: 5.0, total: 0 };
  }
};

// Verificar se Firebase está disponível

// Função para salvar solicitação de serviço (usando Firebase global)
async function salvarSolicitacaoServico(solicitacao) {
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
            status: 'pendente', // Status inicial
            dataCriacao: new Date(),
            dataAtualizacao: new Date(),
            ativo: true
        };

        // Salvar solicitação principal
        const solicitacaoRef = await db.collection("solicitacoes_servico").add(dadosSolicitacao);
        const solicitacaoId = solicitacaoRef.id;
        console.log("Solicitação de serviço salva com ID: ", solicitacaoId);

        // Buscar paneleiros próximos e criar notificações
        await distribuirSolicitacaoParaPaneleiros(solicitacaoId, dadosSolicitacao, userData);

        return solicitacaoId;
    } catch (e) {
        console.error("Erro ao salvar solicitação de serviço: ", e);
        throw e;
    }
}

// Função para distribuir solicitação para paneleiros próximos
async function distribuirSolicitacaoParaPaneleiros(solicitacaoId, dadosSolicitacao, userData) {
    try {
        console.log("Distribuindo solicitação para paneleiros próximos...");

        // Buscar paneleiros próximos (usando a mesma lógica do mapa)
        let paneleirosProximos = [];

        // Tentar buscar via interface Android primeiro
        if (window.Android && window.Android.getPaneleiros) {
            try {
                const paneleirosData = await window.Android.getPaneleiros();
                const paneleirosRaw = JSON.parse(paneleirosData || '[]');

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
                                avaliacao: paneleiro.avaliacao || "5"
                            });
                        }
                    }
                }
            } catch (error) {
                console.error("Erro ao buscar paneleiros via Android:", error);
            }
        }

        // Fallback: buscar paneleiros do Firestore
        if (paneleirosProximos.length === 0) {
            try {
                const q = db.collection("usuarios").where("tipoUsuario", "==", "Paneleiro").limit(10);
                const querySnapshot = await q.get();

                querySnapshot.forEach((doc) => {
                    const paneleiroData = doc.data();
                    paneleirosProximos.push({
                        id: doc.id,
                        nome: paneleiroData.nome,
                        email: paneleiroData.email,
                        fotoUrl: paneleiroData.fotoUrl,
                        avaliacao: paneleiroData.avaliacao || "5"
                    });
                });
            } catch (error) {
                console.error("Erro ao buscar paneleiros do Firestore:", error);
            }
        }

        // Para demonstração, se não encontrou paneleiros, criar alguns mockados
        if (paneleirosProximos.length === 0) {
            paneleirosProximos = [
                { id: "paneleiro_mock_1", nome: "João Silva", email: "joao@email.com", fotoUrl: "./imgs/perfil.png", avaliacao: "4.8" },
                { id: "paneleiro_mock_2", nome: "Maria Santos", email: "maria@email.com", fotoUrl: "./imgs/perfil.png", avaliacao: "4.9" },
                { id: "paneleiro_mock_3", nome: "Pedro Oliveira", email: "pedro@email.com", fotoUrl: "./imgs/perfil.png", avaliacao: "4.7" }
            ];
            console.log("Usando paneleiros mockados para distribuição");
        }

        console.log(`Encontrados ${paneleirosProximos.length} paneleiros para notificar`);

        // Criar notificações para cada paneleiro
        const notificacoesPromises = paneleirosProximos.map(async (paneleiro) => {
            try {
                const notificacaoData = {
                    solicitacaoId: solicitacaoId,
                    paneleiroId: paneleiro.id,
                    paneleiroNome: paneleiro.nome,
                    paneleiroEmail: paneleiro.email,
                    clienteId: userData.id || userData.uid,
                    clienteNome: userData.nome,
                    clienteEmail: userData.email,
                    titulo: "Nova solicitação de serviço",
                    mensagem: `${userData.nome} solicitou serviços de panela de pressão`,
                    servicos: dadosSolicitacao.servicos,
                    dataMaximaEntrega: dadosSolicitacao.dataMaximaEntrega,
                    tipoEntrega: dadosSolicitacao.tipoEntrega,
                    prioridade: dadosSolicitacao.prioridade,
                    descricao: dadosSolicitacao.description,
                    status: 'pendente', // Status da notificação
                    lida: false,
                    dataCriacao: new Date(),
                    dataAtualizacao: new Date()
                };

                // Salvar notificação no Firestore
                const notificacaoRef = await db.collection("notificacoes_servico").add(notificacaoData);
                console.log(`Notificação criada para ${paneleiro.nome}: ${notificacaoRef.id}`);

                return notificacaoRef.id;
            } catch (error) {
                console.error(`Erro ao criar notificação para ${paneleiro.nome}:`, error);
                return null;
            }
        });

        // Aguardar todas as notificações serem criadas
        const notificacoesIds = await Promise.all(notificacoesPromises);
        const notificacoesCriadas = notificacoesIds.filter(id => id !== null);

        console.log(`Distribuição concluída: ${notificacoesCriadas.length} notificações criadas`);

        return notificacoesCriadas;

    } catch (error) {
        console.error("Erro ao distribuir solicitação para paneleiros:", error);
        throw error;
    }
}

// toast simples
function toast(msg, type = 'error'){
    const d = document.createElement("div");
    d.textContent = msg;
    const bgColor = type === 'success' ? '#4caf50' : type === 'info' ? '#2196f3' : '#f44336';
    Object.assign(d.style,{
        position:"fixed",left:"50%",top:"12px",transform:"translateX(-50%)",
        background: bgColor, color:"#fff", padding:"10px 14px", borderRadius:"12px",
        zIndex:10001, boxShadow:"0 8px 22px rgba(0,0,0,.25)", fontSize:"13px",
        fontFamily: "Poppins, sans-serif"
    });
    document.body.appendChild(d);
    setTimeout(()=>d.remove(),3000);
}





// Variáveis do mapa
let map, marker, paneleiroMarkers = [];
let allPaneleiros = []; // Armazenar todos os paneleiros carregados
let userLocation = null; // Localização do usuário

// Variáveis do carrossel
let carouselPaneleiros = []; // Paneleiros no carrossel
let currentCarouselIndex = 0; // Índice atual do carrossel
let carouselAutoSwitchTimer = null; // Timer para troca automática

// Inicializa o mapa com estilo minimalista Uber-like
function initMap(lat, lng, endereco = null, mapElementId = 'map') {
    // Verificar se já existe um mapa no elemento especificado
    const existingMap = document.getElementById(mapElementId)?._leaflet_id;

    // Se já existe um mapa no mesmo elemento, apenas atualizar
    if (map && map._container && map._container.id === mapElementId) {
        map.setView([lat, lng], 15);
        if (marker) {
            marker.setLatLng([lat, lng]);
            if (endereco) {
                marker.bindPopup(`
                    <strong>${endereco.logradouro}</strong><br>
                    ${endereco.bairro}<br>
                    ${endereco.localidade}/${endereco.uf}<br>
                    CEP: ${endereco.cep}
                `).openPopup();
            }
        }
        return;
    }

    // Se existe um mapa em outro elemento, removê-lo primeiro
    if (map) {
        map.remove();
        map = null;
        marker = null;
    }

    // Criar novo mapa no elemento especificado
    map = L.map(mapElementId, {
        zoomControl: false, // Remove controles de zoom
        scrollWheelZoom: true, // Mantém zoom com scroll
        doubleClickZoom: true, // Mantém zoom com double click
        boxZoom: false, // Desabilita zoom com caixa
        keyboard: false, // Desabilita controles de teclado
        attributionControl: false, // Remove marca d'água do Leaflet
        dragging: true // Sempre habilitar dragging inicialmente
    }).setView([lat, lng], 15);

    // Tile layer minimalista (branco e azul, apenas ruas e nomes)
    L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="http://cartodb.com/attributions">CartoDB</a>',
        maxZoom: 19,
        minZoom: 10
    }).addTo(map);

    // Permitir interação completa no mapa do cliente
    if (mapElementId === 'clientMap') {
        // Para mapa do cliente, permitir todas as interações
        map.dragging.enable();
        map.touchZoom.enable();
        map.doubleClickZoom.enable();
        map.scrollWheelZoom.enable();
        map.boxZoom.enable();
        map.keyboard.enable();

        console.log('ℹ️ Mapa configurado para navegação - clique não altera localização');
    }

    // Criar ícone customizado azul para o usuário
    const userIcon = L.divIcon({
        className: 'user-marker',
        html: `
            <div style="
                width: 40px;
                height: 40px;
                border-radius: 50%;
                background: #007bff;
                border: 3px solid white;
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                display: flex;
                align-items: center;
                justify-content: center;
                position: relative;
            ">
                <div style="
                    width: 16px;
                    height: 16px;
                    border-radius: 50%;
                    background: white;
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                "></div>
            </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 20]
    });

    marker = L.marker([lat, lng], { icon: userIcon }).addTo(map);

    if (endereco) {
        marker.bindPopup(`
            <strong>${endereco.logradouro}</strong><br>
            ${endereco.bairro}<br>
            ${endereco.localidade}/${endereco.uf}<br>
            CEP: ${endereco.cep}
        `).openPopup();
    } else {
        marker.bindPopup("Sua localização").openPopup();
    }

    // Carregar paneleiros se usuário for cliente ou food-service
    carregarPaneleiros(lat, lng);
}

// Função para carregar paneleiros no mapa
async function carregarPaneleiros(userLat, userLng) {
    try {
        // Verificar tipo do usuário
        const userDataRaw = localStorage.getItem("user");
        if (!userDataRaw) {
            console.log("Nenhum dado de usuário encontrado no localStorage");
            return;
        }

        const userData = JSON.parse(userDataRaw);
        const userType = userData.tipoUsuario || userData.tipo;

        console.log("Tipo do usuário atual:", userType);

        // Mostrar paneleiros para todos os tipos de usuário (cliente, food service, etc.)
        // Removida a condição que impedia carregamento para outros tipos
        console.log("Carregando paneleiros para usuário tipo:", userType);

        console.log("Carregando paneleiros para usuário tipo:", userType);

        // Limpar markers anteriores
        paneleiroMarkers.forEach(marker => map.removeLayer(marker));
        paneleiroMarkers = [];

        // Buscar paneleiros via interface Android (do Firebase)
        let paneleiros = [];
        if (window.Android && window.Android.getPaneleiros) {
            try {
                const paneleirosData = await window.Android.getPaneleiros();
                const paneleirosRaw = JSON.parse(paneleirosData || '[]');
                console.log("Paneleiros encontrados via Android:", paneleirosRaw);

                // Para cada paneleiro, buscar coordenadas baseadas no CEP
                for (const paneleiro of paneleirosRaw) {
                    if (paneleiro.ceps || paneleiro.cep) {
                        const cep = (paneleiro.ceps || paneleiro.cep).replace(/\D/g, '');
                        if (cep.length === 8) {
                            try {
                                // Buscar informações do CEP
                                const endereco = await buscarInfoCep(cep);
                                if (endereco) {
                                    // Buscar coordenadas
                                    const coordenadas = await buscarCoordenadas(endereco);
                                    if (coordenadas) {
                                    paneleiros.push({
                                        id: paneleiro.id,
                                        nome: paneleiro.nome,
                                        foto: paneleiro.fotoUrl,
                                        avaliacao: paneleiro.avaliacao || "5.0",
                                        lat: coordenadas.lat,
                                        lng: coordenadas.lng,
                                        endereco: endereco
                                    });
                                    }
                                }
                            } catch (cepError) {
                                console.error(`Erro ao buscar coordenadas para paneleiro ${paneleiro.nome}:`, cepError);
                            }
                        }
                    }
                }

                console.log("Paneleiros com coordenadas processadas:", paneleiros);

                // Buscar avaliações atualizadas para todos os paneleiros ANTES de prosseguir
                const paneleirosComAvaliacoesPromises = paneleiros.map(async (paneleiro) => {
                    let avaliacaoAtual = paneleiro.avaliacao || "5";
                    try {
                        console.log('🔍 Buscando avaliação RTDB para paneleiro:', paneleiro.id);
                        const dadosAvaliacao = await window.obterAvaliacaoPaneleiroRTDB(paneleiro.id);
                        console.log('📊 Dados de avaliação RTDB recebidos:', dadosAvaliacao);
                        if (dadosAvaliacao && dadosAvaliacao.media !== undefined) {
                            avaliacaoAtual = dadosAvaliacao.media.toFixed(1);
                            console.log('✅ Avaliação RTDB atualizada para:', avaliacaoAtual);
                        } else {
                            console.log('⚠️ Dados de avaliação RTDB inválidos ou sem média');
                        }
                    } catch (error) {
                        console.warn('❌ Erro ao obter avaliação RTDB para paneleiro:', error);
                    }
                    return {
                        ...paneleiro,
                        avaliacaoCorrigida: avaliacaoAtual
                    };
                });

                const paneleirosComAvaliacoes = await Promise.all(paneleirosComAvaliacoesPromises);

                paneleiros = paneleirosComAvaliacoes;
            } catch (error) {
                console.error("Erro ao buscar paneleiros via Android:", error);
                // Fallback para paneleiros mockados se Firebase falhar
                paneleiros = [
                    {
                        nome: "João Silva (Mock)",
                        foto: "./imgs/perfil.png",
                        avaliacao: "4.8",
                        lat: userLat + 0.01,
                        lng: userLng + 0.01
                    },
                    {
                        nome: "Maria Santos (Mock)",
                        foto: "./imgs/perfil.png",
                        avaliacao: "4.9",
                        lat: userLat - 0.01,
                        lng: userLng - 0.01
                    }
                ];
                console.log("Usando paneleiros mockados como fallback:", paneleiros);
            }
        } else {
            console.log("Interface Android não disponível, usando paneleiros mockados");
            // Fallback para paneleiros mockados
            paneleiros = [
                {
                    nome: "João Silva (Mock)",
                    foto: "./imgs/perfil.png",
                    avaliacao: "4.8",
                    lat: userLat + 0.01,
                    lng: userLng + 0.01
                },
                {
                    nome: "Maria Santos (Mock)",
                    foto: "./imgs/perfil.png",
                    avaliacao: "4.9",
                    lat: userLat - 0.01,
                    lng: userLng - 0.01
                }
            ];
            console.log("Usando paneleiros mockados:", paneleiros);
        }

        // Armazenar paneleiros para busca
        allPaneleiros = paneleiros;
        userLocation = { lat: userLat, lng: userLng };

        // Função para adicionar offset a coordenadas duplicadas
        function adicionarOffsetCoordenadas(paneleiros) {
            const coordenadasUsadas = new Map();

            return paneleiros.map(paneleiro => {
                if (!paneleiro.lat || !paneleiro.lng) return paneleiro;

                const chave = `${paneleiro.lat.toFixed(6)},${paneleiro.lng.toFixed(6)}`;
                const contador = coordenadasUsadas.get(chave) || 0;
                coordenadasUsadas.set(chave, contador + 1);

                if (contador > 0) {
                    // Adicionar offset sequencial para evitar sobreposição
                    // Offset de aproximadamente 10-50 metros dependendo da posição
                    const offsetLat = (contador * 0.0001) * (Math.random() > 0.5 ? 1 : -1);
                    const offsetLng = (contador * 0.0001) * (Math.random() > 0.5 ? 1 : -1);

                    return {
                        ...paneleiro,
                        lat: paneleiro.lat + offsetLat,
                        lng: paneleiro.lng + offsetLng,
                        coordenadaOriginal: { lat: paneleiro.lat, lng: paneleiro.lng }
                    };
                } else {
                    return paneleiro;
                }
            });
        }

        // Aplicar offset às coordenadas duplicadas
        const paneleirosComOffset = adicionarOffsetCoordenadas(paneleiros);

        // Adicionar markers dos paneleiros no mapa
        paneleirosComOffset.forEach((paneleiro) => {
            if (paneleiro.lat && paneleiro.lng) {
                const avaliacaoAtual = paneleiro.avaliacaoCorrigida;

                // Criar ícone customizado com foto do paneleiro
                const customIcon = L.divIcon({
                    className: 'paneleiro-marker',
                    html: `
                        <div style="
                            width: 50px;
                            height: 50px;
                            border-radius: 50%;
                            background: #007bff;
                            border: 3px solid white;
                            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            overflow: hidden;
                        ">
                            <img src="${paneleiro.foto || './imgs/perfil.png'}"
                                 style="
                                    width: 100%;
                                    height: 100%;
                                    object-fit: cover;
                                    border-radius: 50%;
                                 "
                                 alt="${paneleiro.nome || 'Paneleiro'}">
                        </div>
                    `,
                    iconSize: [50, 50],
                    iconAnchor: [25, 25]
                });

                const paneleiroMarker = L.marker([paneleiro.lat, paneleiro.lng], { icon: customIcon }).addTo(map);

                // Popup com informações do paneleiro (mostrar coordenada original se foi ajustada)
                const coordenadaInfo = paneleiro.coordenadaOriginal ?
                    `<br><small style="color: #666; font-size: 11px;">Mesmo local que outros paneleiros</small>` : '';

                paneleiroMarker.bindPopup(`
                    <div style="text-align: center; font-family: Poppins, sans-serif;">
                        <strong>${paneleiro.nome || 'Paneleiro'}</strong><br>
                        <div style="display: inline-flex; align-items: center; justify-content: center; margin: 4px 0;">
                            ${gerarEstrelasVisuaisComNumero(avaliacaoAtual)}
                        </div>
                        ${coordenadaInfo}
                    </div>
                `);

                // Adicionar event listener para abrir modal de perfil ao clicar no marker
                paneleiroMarker.on('click', () => {
                    console.log('🖱️ MAPA: Clicou no marker do paneleiro:', paneleiro.id);
                    mostrarModalPerfilPaneleiro(paneleiro);
                });

                paneleiroMarkers.push(paneleiroMarker);
            }
        });

        if (paneleiros.length > 0) {
            toast(`Encontrados ${paneleiros.length} paneleiros na sua região`, 'success');
            // Preencher o carrossel com os paneleiros carregados
            preencherCarrosselPaneleiros(paneleirosComOffset);
        } else {
            toast('Nenhum paneleiro encontrado na sua região', 'info');
        }
    } catch (error) {
        console.error("Erro ao carregar paneleiros:", error);
    }
}

// Função para preencher o carrossel com paneleiros dinamicamente
function preencherCarrosselPaneleiros(paneleiros) {
    const carrosselContainer = document.querySelector('#clientCarouselContainer .paneleiros-container');

    if (!carrosselContainer) {
        return;
    }

    // Armazenar paneleiros no carrossel (limitado a 3)
    carouselPaneleiros = paneleiros.slice(0, 3);

    // Resetar índice do carrossel
    currentCarouselIndex = 0;

    // Configurar event listeners para os botões
    const prevBtn = document.getElementById('prevPaneleiro');
    const nextBtn = document.getElementById('nextPaneleiro');

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            pararAutoSwitch();
            mostrarProximoPaneleiro();
            iniciarAutoSwitch();
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            pararAutoSwitch();
            mostrarPaneleiroAnterior();
            iniciarAutoSwitch();
        });
    }

    // Adicionar suporte a gestos de toque/swipe
    adicionarSuporteSwipe(carrosselContainer);

    // Mostrar primeiro paneleiro
    mostrarPaneleiroAtual();

    // Iniciar auto-switch
    iniciarAutoSwitch();

    // Atualizar estado dos botões
    atualizarBotoesCarrossel();
}

// Função para adicionar suporte a gestos de swipe
function adicionarSuporteSwipe(element) {
    let startX = 0;
    let startY = 0;
    let isDragging = false;
    const minSwipeDistance = 50; // Distância mínima para considerar um swipe

    element.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        isDragging = true;
        pararAutoSwitch(); // Parar auto-switch durante interação
    });

    element.addEventListener('touchmove', (e) => {
        if (!isDragging) return;

        const currentX = e.touches[0].clientX;
        const currentY = e.touches[0].clientY;
        const diffX = startX - currentX;
        const diffY = startY - currentY;

        // Se o movimento vertical for maior que o horizontal, não é um swipe
        if (Math.abs(diffY) > Math.abs(diffX)) return;

        e.preventDefault(); // Prevenir scroll da página
    });

    element.addEventListener('touchend', (e) => {
        if (!isDragging) return;

        const endX = e.changedTouches[0].clientX;
        const endY = e.changedTouches[0].clientY;
        const diffX = startX - endX;
        const diffY = startY - endY;

        isDragging = false;

        // Verificar se é um swipe horizontal válido
        if (Math.abs(diffX) > minSwipeDistance && Math.abs(diffY) < Math.abs(diffX)) {
            if (diffX > 0) {
                // Swipe para direita - paneleiro anterior
                mostrarPaneleiroAnterior();
            } else {
                // Swipe para esquerda - próximo paneleiro
                mostrarProximoPaneleiro();
            }
            iniciarAutoSwitch(); // Reiniciar auto-switch após swipe
        }
    });

    // Suporte para mouse (drag)
    element.addEventListener('mousedown', (e) => {
        startX = e.clientX;
        startY = e.clientY;
        isDragging = true;
        pararAutoSwitch();
        e.preventDefault();
    });

    element.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        e.preventDefault();
    });

    element.addEventListener('mouseup', (e) => {
        if (!isDragging) return;

        const endX = e.clientX;
        const endY = e.clientY;
        const diffX = startX - endX;
        const diffY = startY - endY;

        isDragging = false;

        if (Math.abs(diffX) > minSwipeDistance && Math.abs(diffY) < Math.abs(diffX)) {
            if (diffX > 0) {
                mostrarProximoPaneleiro();
            } else {
                mostrarPaneleiroAnterior();
            }
            iniciarAutoSwitch();
        }
    });

    // Prevenir comportamento padrão em dispositivos móveis
    element.addEventListener('touchstart', (e) => {
        e.preventDefault();
    }, { passive: false });
}

// Função para mostrar o paneleiro atual
function mostrarPaneleiroAtual() {
    const carrosselContainer = document.querySelector('#clientCarouselContainer .paneleiros-container');

    if (!carrosselContainer || carouselPaneleiros.length === 0) {
        return;
    }

    // Limpar conteúdo existente
    carrosselContainer.innerHTML = '';

    const paneleiro = carouselPaneleiros[currentCarouselIndex];
    const avaliacaoAtual = paneleiro.avaliacaoCorrigida || paneleiro.avaliacao || "5";

    // Truncar nome para apenas os 2 primeiros nomes
    const nomeCompleto = paneleiro.nome || 'Paneleiro';
    const nomes = nomeCompleto.split(' ');
    const nomeTruncado = nomes.slice(0, 2).join(' ');

    // Calcular distância se localização do usuário estiver disponível
    let distanciaTexto = '';
    if (userLocation && paneleiro.lat && paneleiro.lng) {
        const distanciaKm = calcularDistancia(userLocation.lat, userLocation.lng, paneleiro.lat, paneleiro.lng);
        distanciaTexto = formatarDistancia(distanciaKm);
    }

    const paneleiroElement = document.createElement('div');
    paneleiroElement.className = 'paneleiro fade-in';
    paneleiroElement.innerHTML = `
        <div class="circle">
            <img src="${paneleiro.foto || './imgs/perfil.png'}" alt="${paneleiro.nome}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">
        </div>
        <p class="paneleiro-nome">${nomeTruncado}</p>
        <p class="paneleiro-avaliacao">⭐ ${avaliacaoAtual}${distanciaTexto ? ' • ' + distanciaTexto : ''}</p>
    `;

    carrosselContainer.appendChild(paneleiroElement);
}

// Função para mostrar o próximo paneleiro
function mostrarProximoPaneleiro() {
    if (carouselPaneleiros.length === 0) return;

    // Aplicar animação de deslizamento para a esquerda
    const paneleiroAtual = document.querySelector('#clientCarouselContainer .paneleiro');
    if (paneleiroAtual) {
        paneleiroAtual.classList.remove('fade-in', 'slide-in-left', 'slide-in-right');
        paneleiroAtual.classList.add('slide-out-left');

        setTimeout(() => {
            currentCarouselIndex = (currentCarouselIndex + 1) % carouselPaneleiros.length;
            mostrarPaneleiroAtual();
            atualizarBotoesCarrossel();

            // Aplicar animação de entrada da direita
            const novoPaneleiro = document.querySelector('#clientCarouselContainer .paneleiro');
            if (novoPaneleiro) {
                novoPaneleiro.classList.add('slide-in-right');
            }
        }, 200);
    } else {
        currentCarouselIndex = (currentCarouselIndex + 1) % carouselPaneleiros.length;
        mostrarPaneleiroAtual();
        atualizarBotoesCarrossel();
    }
}

// Função para mostrar o paneleiro anterior
function mostrarPaneleiroAnterior() {
    if (carouselPaneleiros.length === 0) return;

    // Aplicar animação de deslizamento para a direita
    const paneleiroAtual = document.querySelector('#clientCarouselContainer .paneleiro');
    if (paneleiroAtual) {
        paneleiroAtual.classList.remove('fade-in', 'slide-in-left', 'slide-in-right');
        paneleiroAtual.classList.add('slide-out-right');

        setTimeout(() => {
            currentCarouselIndex = currentCarouselIndex === 0 ? carouselPaneleiros.length - 1 : currentCarouselIndex - 1;
            mostrarPaneleiroAtual();
            atualizarBotoesCarrossel();

            // Aplicar animação de entrada da esquerda
            const novoPaneleiro = document.querySelector('#clientCarouselContainer .paneleiro');
            if (novoPaneleiro) {
                novoPaneleiro.classList.add('slide-in-left');
            }
        }, 200);
    } else {
        currentCarouselIndex = currentCarouselIndex === 0 ? carouselPaneleiros.length - 1 : currentCarouselIndex - 1;
        mostrarPaneleiroAtual();
        atualizarBotoesCarrossel();
    }
}

// Função para atualizar estado dos botões (desabilitar se só há 1 paneleiro)
function atualizarBotoesCarrossel() {
    const prevBtn = document.getElementById('prevPaneleiro');
    const nextBtn = document.getElementById('nextPaneleiro');

    const hasMultiple = carouselPaneleiros.length > 1;

    if (prevBtn) {
        prevBtn.disabled = !hasMultiple;
    }
    if (nextBtn) {
        nextBtn.disabled = !hasMultiple;
    }
}

// Função para iniciar auto-switch
function iniciarAutoSwitch() {
    pararAutoSwitch(); // Garantir que não há timer ativo
    if (carouselPaneleiros.length > 1) {
        carouselAutoSwitchTimer = setInterval(() => {
            mostrarProximoPaneleiro();
        }, 7000); // 7 segundos
    }
}

// Função para parar auto-switch
function pararAutoSwitch() {
    if (carouselAutoSwitchTimer) {
        clearInterval(carouselAutoSwitchTimer);
        carouselAutoSwitchTimer = null;
    }
}

// Busca informações do CEP via ViaCEP
async function buscarInfoCep(cep) {
    try {
        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await response.json();

        if (data.erro) {
            throw new Error('CEP não encontrado');
        }

        return data;
    } catch (error) {
        console.error('Erro ao buscar CEP:', error);
        return null;
    }
}

// Busca coordenadas no OpenStreetMap
async function buscarCoordenadas(endereco) {
    try {
        const query = `${endereco.logradouro}, ${endereco.bairro}, ${endereco.localidade}, ${endereco.uf}, Brasil`;
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&countrycodes=BR&q=${encodeURIComponent(query)}`, {
            headers: { "User-Agent": "ConsertaJaApp/1.0" }
        });
        const data = await response.json();

        if (data && data.length > 0) {
            return {
                lat: parseFloat(data[0].lat),
                lng: parseFloat(data[0].lon)
            };
        }
        return null;
    } catch (error) {
        console.error('Erro ao buscar coordenadas:', error);
        return null;
    }
}

// Carrega mapa com geolocalização GPS
async function carregarMapaComGPS() {
    console.log("🚀 [MAPA-GPS] Iniciando carregamento do mapa com GPS...");

    // Aguardar Firebase estar pronto antes de prosseguir
    try {
        console.log("⏳ [MAPA-GPS] Aguardando Firebase...");
        let tentativasFirebase = 0;
        const maxTentativasFirebase = 15; // 1.5 segundos

        while (!window.db && tentativasFirebase < maxTentativasFirebase) {
            console.log(`⏳ [MAPA-GPS] Aguardando Firebase... Tentativa ${tentativasFirebase + 1}/${maxTentativasFirebase}`);
            await new Promise(resolve => setTimeout(resolve, 100));
            tentativasFirebase++;
        }

        if (!window.db) {
            console.error("❌ [MAPA-GPS] Firebase não ficou disponível após aguardar");
            toast("Erro: Firebase não inicializou", 'error');
            return;
        }

        console.log("✅ [MAPA-GPS] Firebase disponível, prosseguindo...");
    } catch (firebaseWaitError) {
        console.error("❌ [MAPA-GPS] Erro ao aguardar Firebase:", firebaseWaitError);
        toast("Erro ao inicializar mapa", 'error');
        return;
    }

    try {
        // PRIMEIRO: tentar usar coordenadas salvas no localStorage (confirmedLocation) - PRIORIDADE MÁXIMA
        const confirmedLocationRaw = localStorage.getItem('confirmedLocation');
        console.log("📦 [GPS-LOAD] Verificando confirmedLocation no localStorage:", confirmedLocationRaw);

        if (confirmedLocationRaw) {
            try {
                const confirmedLocation = JSON.parse(confirmedLocationRaw);
                console.log("✅ [GPS-LOAD] confirmedLocation parseado:", confirmedLocation);

                if (confirmedLocation.latitude && confirmedLocation.longitude) {
                    console.log("🎯 [GPS-LOAD] Usando localização CONFIRMADA (prioridade máxima):", confirmedLocation);

                    // Criar objeto endereço baseado nos dados salvos
                    const endereco = {
                        logradouro: confirmedLocation.endereco || 'Localização GPS',
                        bairro: '',
                        localidade: '',
                        uf: '',
                        cep: confirmedLocation.cep || ''
                    };

                    // Inicializa o mapa para clientes com coordenadas salvas
                    initMap(confirmedLocation.latitude, confirmedLocation.longitude, endereco, 'clientMap');

                    toast(`Localização carregada`, 'success');

                    // Atualiza informações do usuário na tela
                    const userDataRaw = localStorage.getItem("user");
                    let userData = {};
                    try {
                        userData = JSON.parse(userDataRaw || "{}");
                    } catch (e) {
                        console.warn("Erro ao parsear userData:", e);
                    }
                    atualizarInfoUsuario(endereco, userData);

                    console.log("✅ [GPS-LOAD] Mapa carregado com localização CONFIRMADA!");
                    return; // SUCESSO - não continua para outras fontes
                } else {
                    console.log("⚠️ [GPS-LOAD] confirmedLocation não tem coordenadas válidas");
                }
            } catch (parseError) {
                console.warn("❌ [GPS-LOAD] Erro ao parsear confirmedLocation:", parseError);
                // Remove dados corrompidos
                localStorage.removeItem('confirmedLocation');
            }
        } else {
            console.log("ℹ️ [GPS-LOAD] Nenhum confirmedLocation encontrado no localStorage");
        }

        // SEGUNDO: tentar geolocalização GPS automática
        console.log("🛰️ [GPS-LOAD] Tentando geolocalização GPS automática...");

        if (navigator.geolocation) {
            try {
                const position = await new Promise((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject, {
                        enableHighAccuracy: true,
                        timeout: 10000,
                        maximumAge: 300000 // 5 minutos
                    });
                });

                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                console.log("✅ [GPS-LOAD] GPS automático encontrado:", { lat, lng });

                // Criar endereço genérico para GPS
                const endereco = {
                    logradouro: 'Localização GPS',
                    bairro: '',
                    localidade: 'GPS Detectado',
                    uf: '',
                    cep: ''
                };

                // Inicializa o mapa com coordenadas GPS
                initMap(lat, lng, endereco, 'clientMap');

                toast(`Localização GPS carregada`, 'success');

                // Atualiza informações do usuário na tela
                const userDataRaw = localStorage.getItem("user");
                let userData = {};
                try {
                    userData = JSON.parse(userDataRaw || "{}");
                } catch (e) {
                    console.warn("Erro ao parsear userData:", e);
                }
                atualizarInfoUsuario(endereco, userData);

                console.log("✅ [GPS-LOAD] Mapa carregado com GPS automático!");
                return;

            } catch (gpsError) {
                console.log("⚠️ [GPS-LOAD] GPS automático falhou:", gpsError.message);
            }
        } else {
            console.log("⚠️ [GPS-LOAD] Geolocalização não suportada pelo navegador");
        }

        // TERCEIRO: usar localização padrão (São Paulo) como último recurso
        console.log("🏙️ [GPS-LOAD] Usando localização padrão (São Paulo)...");

        const latPadrao = -23.55052;
        const lngPadrao = -46.63331;

        const enderecoPadrao = {
            logradouro: 'São Paulo',
            bairro: 'Centro',
            localidade: 'São Paulo',
            uf: 'SP',
            cep: '01000-000'
        };

        // Inicializa o mapa com localização padrão
        initMap(latPadrao, lngPadrao, enderecoPadrao, 'clientMap');

        toast(`Localização padrão carregada`, 'info');

        // Atualiza informações do usuário na tela
        const userDataRaw = localStorage.getItem("user");
        let userData = {};
        try {
            userData = JSON.parse(userDataRaw || "{}");
        } catch (e) {
            console.warn("Erro ao parsear userData:", e);
        }
        atualizarInfoUsuario(enderecoPadrao, userData);

        console.log("✅ [GPS-LOAD] Mapa carregado com localização padrão!");

    } catch (error) {
        console.error('❌ Erro crítico ao carregar mapa:', error);

        // Último fallback: tentar carregar mapa vazio
        try {
            console.log("🚨 [GPS-LOAD] Usando último fallback...");
            initMap(-23.55052, -46.63331, null, 'clientMap');
            toast("Mapa carregado com localização padrão", 'info');
        } catch (fallbackError) {
            console.error("❌ Mesmo fallback falhou:", fallbackError);
            toast("Erro crítico no carregamento do mapa", 'error');
        }
    }
}

// Atualiza informações do usuário na tela
function atualizarInfoUsuario(endereco, userData) {
    // Procura por elementos para atualizar
    const nomeElement = document.querySelector('.user-name');
    const cepElement = document.querySelector('.user-cep');
    const enderecoElement = document.querySelector('.user-endereco');

    if (nomeElement) nomeElement.textContent = userData.nome || 'Usuário';
    if (cepElement) cepElement.textContent = endereco.cep;
    if (enderecoElement) {
        enderecoElement.textContent = `${endereco.logradouro}, ${endereco.bairro} - ${endereco.localidade}/${endereco.uf}`;
    }
}

// Função para calcular distância entre duas coordenadas (fórmula de Haversine)
function calcularDistancia(lat1, lng1, lat2, lng2) {
    const R = 6371; // Raio da Terra em km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distância em km
}

// Função para formatar distância
function formatarDistancia(distanciaKm) {
    if (distanciaKm < 1) {
        return `${Math.round(distanciaKm * 1000)}m`;
    } else {
        return `${distanciaKm.toFixed(1)}km`;
    }
}

// Função para buscar paneleiros
function buscarPaneleiros(query) {
    if (!query.trim()) {
        ocultarResultadosBusca();
        return;
    }

    const queryLower = query.toLowerCase();
    let resultados = allPaneleiros.filter(paneleiro => {
        return paneleiro.nome && paneleiro.nome.toLowerCase().includes(queryLower);
    });

    // Ordenar por distância se localização do usuário estiver disponível
    if (userLocation) {
        resultados.sort((a, b) => {
            const distA = calcularDistancia(userLocation.lat, userLocation.lng, a.lat, a.lng);
            const distB = calcularDistancia(userLocation.lat, userLocation.lng, b.lat, b.lng);
            return distA - distB;
        });
    }

    // Limitar a 3 resultados para a busca rápida
    const resultadosLimitados = resultados.slice(0, 3);
    renderizarResultadosBusca(resultadosLimitados, resultados.length > 3);
}

// Função para abrir página de pesquisa completa
function abrirPesquisaCompleta() {
    const searchInput = document.getElementById('searchInput');
    const query = searchInput ? searchInput.value.trim() : '';

    // Salvar a query na sessionStorage para usar na página de pesquisa
    sessionStorage.setItem('searchQuery', query);

    // Redirecionar para página de pesquisa
    window.location.href = 'pesquisa.html';
}

// Função para renderizar resultados da busca
async function renderizarResultadosBusca(resultados, hasMoreResults = false) {
    const container = document.getElementById('searchResults');
    const searchBar = document.querySelector('.search');

    if (resultados.length === 0) {
        container.innerHTML = `
            <div style="padding: 20px; text-align: center; color: #1a73e8;">
                Nenhum paneleiro encontrado
            </div>
        `;
        container.classList.add('show');
        searchBar.classList.add('has-results');
        return;
    }

    // Obter avaliações atualizadas para todos os paneleiros via RTDB
    const promisesAvaliacoes = resultados.map(async (paneleiro) => {
                try {
                    const dadosAvaliacao = await window.obterAvaliacaoPaneleiroRTDB(paneleiro.id);
                    return {
                        ...paneleiro,
                        avaliacaoAtual: dadosAvaliacao && dadosAvaliacao.media !== undefined ? dadosAvaliacao.media.toFixed(1) : (paneleiro.avaliacao || '5.0')
                    };
                } catch (error) {
                    console.warn('Erro ao obter avaliação RTDB para busca:', error);
                    return {
                        ...paneleiro,
                        avaliacaoAtual: paneleiro.avaliacao || '5.0'
                    };
                }
    });

    const resultadosComAvaliacoes = await Promise.all(promisesAvaliacoes);

    let html = resultadosComAvaliacoes.map(paneleiro => {
        const distancia = userLocation ?
            calcularDistancia(userLocation.lat, userLocation.lng, paneleiro.lat, paneleiro.lng) : 0;

        return `
            <div class="search-result-card" data-lat="${paneleiro.lat}" data-lng="${paneleiro.lng}">
                <div class="search-result-avatar">
                    <img src="${paneleiro.foto || './imgs/perfil.png'}" alt="${paneleiro.nome}">
                </div>
                <div class="search-result-info">
                    <div class="search-result-name">${paneleiro.nome}</div>
                    <div class="search-result-details">
                        <span class="search-result-rating">${paneleiro.avaliacaoAtual}</span>
                        ${userLocation ? `<span>• ${formatarDistancia(distancia)}</span>` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // Adicionar botão "Ver mais resultados" se houver mais resultados
    if (hasMoreResults) {
        html += `
            <div class="search-see-more" onclick="abrirPesquisaCompleta()">
                <span>Ver mais resultados</span>
                <img src="./imgs/Search.png" alt="Buscar" style="width: 16px; height: 16px;">
            </div>
        `;
    }

    container.innerHTML = html;
    container.classList.add('show');
    searchBar.classList.add('has-results');

    // Adicionar event listeners aos cards
    container.querySelectorAll('.search-result-card').forEach(card => {
        card.addEventListener('click', () => {
            const lat = parseFloat(card.dataset.lat);
            const lng = parseFloat(card.dataset.lng);

            // Encontrar o paneleiro correspondente nos dados carregados
            const paneleiro = allPaneleiros.find(p =>
                p.lat === lat && p.lng === lng
            );

            if (paneleiro) {
                // Abrir modal de perfil do paneleiro
                mostrarModalPerfilPaneleiro(paneleiro);
            } else {
                // Fallback: focar no paneleiro no mapa
                if (map) {
                    map.setView([lat, lng], 16);
                }
            }

            // Ocultar resultados da busca
            ocultarResultadosBusca();
        });
    });
}

// Função para ocultar resultados da busca
function ocultarResultadosBusca() {
    const container = document.getElementById('searchResults');
    const searchBar = document.querySelector('.search');

    container.classList.remove('show');
    searchBar.classList.remove('has-results');

    // Aguardar a animação terminar antes de limpar o conteúdo
    setTimeout(() => {
        if (!container.classList.contains('show')) {
            container.innerHTML = '';
        }
    }, 300);
}

// Verificar tipo de usuário e configurar interface
function configurarInterfacePorTipoUsuario() {
    try {
        const userDataRaw = localStorage.getItem("user");

        if (!userDataRaw) {
            console.log('⚠️ Nenhum dado de usuário encontrado, usando configuração padrão');
            // Configuração padrão para demonstração
            configurarInterfacePadrao();
            return;
        }

        const userData = JSON.parse(userDataRaw);
        const userType = userData.tipoUsuario || userData.tipo;

        console.log('👤 Configurando interface para usuário tipo:', userType, 'ID:', userData.id);

        if (!userType) {
            console.log('⚠️ Tipo de usuário não definido, usando configuração padrão');
            configurarInterfacePadrao();
            return;
        }

        const servicesContainer = document.getElementById('servicesContainer');
        const mapCalendarContainer = document.getElementById('mapCalendarContainer');
        const clientMapContainer = document.getElementById('clientMapContainer');
        const clientCarouselContainer = document.getElementById('clientCarouselContainer');
        const searchInput = document.getElementById('searchInput');

        if (userType === 'Paneleiro' || userType === 'paneleiro') {
            console.log('🔧 Configurando interface para PANELEIRO');

            // Mostrar containers para paneleiros
            if (servicesContainer) servicesContainer.style.display = 'flex';
            if (mapCalendarContainer) mapCalendarContainer.style.display = 'flex';
            if (clientMapContainer) clientMapContainer.style.display = 'none';
            if (clientCarouselContainer) clientCarouselContainer.style.display = 'none';

            // Esconder completamente a topbar (barra de pesquisa) para paneleiros
            const topbar = document.querySelector('.topbar');
            if (topbar) {
                topbar.style.display = 'none';
            }

            // Ajustar padding do app para compensar a topbar oculta
            const app = document.querySelector('.app');
            if (app) {
                app.style.paddingTop = '20px';
            }

            // Carregar serviços do paneleiro
            carregarServicosPaneleiro();

            // Renderizar calendário imediatamente
            setTimeout(() => {
                renderCalendario();
                configurarEventosCalendario();
            }, 50);

            // Carregar mapa para paneleiros (sem paneleiros marcados)
            carregarMapaPaneleiro();

        } else {
            console.log('👤 Configurando interface para CLIENTE');

            // Mostrar containers para clientes
            if (servicesContainer) servicesContainer.style.display = 'none';
            if (mapCalendarContainer) mapCalendarContainer.style.display = 'none';
            if (clientMapContainer) clientMapContainer.style.display = 'flex';
            if (clientCarouselContainer) clientCarouselContainer.style.display = 'flex';

            // Mostrar busca para clientes
            if (searchInput) {
                searchInput.style.display = 'block';
            }

            // Carregar mapa normal para clientes
            carregarMapaComGPS();
        }
    } catch (error) {
        console.error("❌ Erro ao configurar interface:", error);
        // Configuração padrão em caso de erro
        configurarInterfacePadrao();
    }
}

// Função para configurar interface padrão (para demonstração)
function configurarInterfacePadrao() {
    const servicesContainer = document.getElementById('servicesContainer');
    const mapCalendarContainer = document.getElementById('mapCalendarContainer');
    const clientMapContainer = document.getElementById('clientMapContainer');
    const clientCarouselContainer = document.getElementById('clientCarouselContainer');
    const searchInput = document.getElementById('searchInput');

    // Configuração padrão: mostrar interface de cliente
    if (servicesContainer) servicesContainer.style.display = 'none';
    if (mapCalendarContainer) mapCalendarContainer.style.display = 'none';
    if (clientMapContainer) clientMapContainer.style.display = 'flex';
    if (clientCarouselContainer) clientCarouselContainer.style.display = 'flex';
    if (searchInput) searchInput.style.display = 'block';

    // Carregar mapa normal para clientes
    carregarMapaComGPS();
}

// Carregar serviços do paneleiro (serviços atuais)
async function carregarServicosPaneleiro() {
    const servicesList = document.querySelector('.services-list');

    try {
        console.log('🔍 Carregando serviços atuais do paneleiro...');

        const userDataRaw = localStorage.getItem("user");
        if (!userDataRaw) {
            console.log('❌ Nenhum dado de usuário encontrado');
            servicesList.innerHTML = `
                <div class="empty-services">
                    <p>Erro ao carregar serviços</p>
                </div>
            `;
            return;
        }

        const userData = JSON.parse(userDataRaw);
        const userType = userData.tipoUsuario || userData.tipo;

        if (userType !== 'Paneleiro' && userType !== 'paneleiro') {
            console.log('ℹ️ Usuário não é paneleiro');
            servicesList.innerHTML = `
                <div class="empty-services">
                    <p>Interface não disponível para este tipo de usuário</p>
                </div>
            `;
            return;
        }

        // Buscar pedidos do paneleiro no Firebase
        let pedidosAtivos = [];

        try {
            console.log('🔥 Buscando pedidos ativos do Firebase...');

            // Aguardar Firebase estar pronto
            let tentativas = 0;
            const maxTentativas = 10;

            while (!window.db && tentativas < maxTentativas) {
                console.log(`⏳ Aguardando Firebase... Tentativa ${tentativas + 1}/${maxTentativas}`);
                await new Promise(resolve => setTimeout(resolve, 500));
                tentativas++;
            }

            if (window.db && window.firestoreQuery) {
                console.log('✅ Firebase disponível, executando query...');

                // Buscar pedidos do paneleiro
                const pedidosRef = window.firestoreCollection(window.db, 'solicitacoes_servico');
                let q = window.firestoreQuery(
                    pedidosRef,
                    window.firestoreWhere('paneleiroId', '==', userData.id)
                );

                const querySnapshot = await window.firestoreGetDocs(q);
                console.log('📄 Documentos encontrados:', querySnapshot.size);

                // Filtrar pedidos ativos (não concluídos)
                const statusAtivos = ['pago', 'em_andamento', 'aguardando_entrega', 'agendado'];

                querySnapshot.forEach((doc) => {
                    const pedidoData = doc.data();
                    if (statusAtivos.includes(pedidoData.status)) {
                        pedidosAtivos.push({
                            id: doc.id,
                            ...pedidoData
                        });
                        console.log(`✅ Pedido ativo encontrado: ${doc.id} - ${pedidoData.status}`);
                    }
                });

                console.log(`📦 Encontrados ${pedidosAtivos.length} pedidos ativos`);
            } else {
                console.log('⚠️ Firebase não disponível');
            }
        } catch (firebaseError) {
            console.error('❌ Erro ao buscar pedidos do Firebase:', firebaseError);
        }

        // Se não há pedidos ativos, mostrar mensagem vazia
        if (pedidosAtivos.length === 0) {
            servicesList.innerHTML = `
                <div class="empty-services">
                    <p>Nenhum serviço agendado no momento</p>
                    <small>Seus serviços aparecerão aqui quando houver pedidos ativos</small>
                </div>
            `;
            return;
        }

        // Limitar a 3 serviços para não sobrecarregar a tela
        const pedidosParaMostrar = pedidosAtivos.slice(0, 3);

        // Criar HTML dos cards de serviço
        let servicesHtml = '';

        for (const pedido of pedidosParaMostrar) {
            try {
                // Formatar data
                let dataFormatada = 'Data não definida';
                if (pedido.dataMaximaEntrega) {
                    const [ano, mes, dia] = pedido.dataMaximaEntrega.split('-');
                    const dataObj = new Date(ano, mes - 1, dia);
                    dataFormatada = dataObj.toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                    });
                }

                // Formatar status
                const statusMap = {
                    'pago': { texto: 'Pago', cor: '#28a745' },
                    'em_andamento': { texto: 'Em Andamento', cor: '#007bff' },
                    'aguardando_entrega': { texto: 'Aguardando Entrega', cor: '#ffc107' },
                    'agendado': { texto: 'Agendado', cor: '#17a2b8' }
                };

                const statusInfo = statusMap[pedido.status] || { texto: pedido.status, cor: '#6c757d' };

                // Formatar serviços
                const servicosTexto = Array.isArray(pedido.servicos)
                    ? pedido.servicos.join(', ')
                    : (pedido.servicos || 'Serviços não especificados');

                // Criar card do serviço
                servicesHtml += `
                    <div class="service-card" data-pedido-id="${pedido.id}" style="
                        background: white;
                        border-radius: 12px;
                        padding: 12px;
                        margin-bottom: 10px;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                        border: 1px solid #e9ecef;
                        cursor: pointer;
                        transition: transform 0.2s, box-shadow 0.2s;
                    " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.15)'"
                       onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 8px rgba(0,0,0,0.1)'">

                        <!-- Cabeçalho com cliente e status -->
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                            <div style="font-weight: 600; color: #333; font-size: 16px;">
                                ${pedido.clienteNome || 'Cliente'}
                            </div>
                            <div style="
                                background: ${statusInfo.cor};
                                color: white;
                                padding: 4px 8px;
                                border-radius: 12px;
                                font-size: 11px;
                                font-weight: 500;
                                text-transform: uppercase;
                            ">
                                ${statusInfo.texto}
                            </div>
                        </div>

                        <!-- Serviços -->
                        <div style="margin-bottom: 12px;">
                            <div style="color: #666; font-size: 14px; margin-bottom: 4px;">Serviços:</div>
                            <div style="color: #333; font-weight: 500;">${servicosTexto}</div>
                        </div>

                        <!-- Data e horário -->
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <div style="color: #666; font-size: 12px;">Data de entrega</div>
                                <div style="color: #333; font-weight: 500;">${dataFormatada}</div>
                            </div>
                            ${pedido.preferredTime ? `
                            <div style="text-align: right;">
                                <div style="color: #666; font-size: 12px;">Horário</div>
                                <div style="color: #333; font-weight: 500;">${pedido.preferredTime}</div>
                            </div>
                            ` : ''}
                        </div>

                        <!-- Descrição (se existir) -->
                        ${pedido.description ? `
                        <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #e9ecef;">
                            <div style="color: #666; font-size: 12px; margin-bottom: 4px;">Observações:</div>
                            <div style="color: #333; font-size: 14px;">${pedido.description}</div>
                        </div>
                        ` : ''}
                    </div>
                `;
            } catch (error) {
                console.error('Erro ao processar pedido:', pedido.id, error);
            }
        }

        // Se há mais pedidos, adicionar indicador
        if (pedidosAtivos.length > 3) {
            servicesHtml += `
                <div style="
                    text-align: center;
                    padding: 12px;
                    color: #666;
                    font-size: 14px;
                    background: #f8f9fa;
                    border-radius: 8px;
                    margin-top: 8px;
                ">
                    + ${pedidosAtivos.length - 3} serviço(s) adicional(is)
                </div>
            `;
        }

        servicesList.innerHTML = servicesHtml;

        // Adicionar event listeners aos cards
        servicesList.querySelectorAll('.service-card').forEach(card => {
            card.addEventListener('click', () => {
                const pedidoId = card.dataset.pedidoId;
                if (pedidoId) {
                    console.log(`🔗 Clicou no serviço: ${pedidoId}`);
                    redirecionarParaPedido(pedidoId);
                }
            });
        });

        console.log(`✅ ${pedidosParaMostrar.length} serviços carregados com sucesso`);

    } catch (error) {
        console.error('❌ Erro ao carregar serviços do paneleiro:', error);
        servicesList.innerHTML = `
            <div class="empty-services">
                <p>Erro ao carregar serviços</p>
                <small>Tente novamente mais tarde</small>
            </div>
        `;
    }
}

// Carregar mapa para paneleiros (sem mostrar outros paneleiros)
function carregarMapaPaneleiro() {
    console.log('🗺️ Iniciando carregamento do mapa para paneleiros...');

    // Verificar se o mapa já existe
    if (map) {
        console.log('🗺️ Mapa já existe, apenas centralizando...');
        // Se o mapa já existe, apenas centralizar na localização do usuário
        carregarMapaPaneleiroInterno();
        return;
    }

    // Primeiro, tenta atualizar os dados do usuário do Firebase
    if (window.Android && window.Android.refreshUserData) {
        console.log('🗺️ Atualizando dados do usuário via Android...');
        window.Android.refreshUserData();
        // Aguarda um pouco para a atualização
        setTimeout(() => carregarMapaPaneleiroInterno(), 1000);
    } else {
        console.log('🗺️ Interface Android não disponível, carregando mapa diretamente...');
        carregarMapaPaneleiroInterno();
    }
}

function carregarMapaPaneleiroInterno() {
    console.log('🗺️ [MAPA-PANELEIRO] Iniciando carregamento interno do mapa...');

    // Tenta obter dados do localStorage
    const userDataRaw = localStorage.getItem("user");
    console.log('🗺️ [MAPA-PANELEIRO] Dados do usuário no localStorage:', userDataRaw);

    let userData;
    try {
        userData = JSON.parse(userDataRaw || "{}");
        console.log('🗺️ [MAPA-PANELEIRO] Dados do usuário parseados:', userData);
    } catch (error) {
        console.error("🗺️ [MAPA-PANELEIRO] Erro ao fazer parse do JSON do usuário:", error);
        toast("Dados de configuração corrompidos. Redirecionando para configuração...", 'error');
        setTimeout(() => window.location.href = "confirma_local.html", 2000);
        return;
    }

    // Verifica se tem CEP salvo
    let cepEncontrado = null;
    if (userData.ceps && userData.ceps.trim().length > 0) {
        cepEncontrado = userData.ceps;
        console.log('🗺️ [MAPA-PANELEIRO] CEP encontrado em userData.ceps:', cepEncontrado);
    } else if (userData.cep && userData.cep.trim().length > 0) {
        cepEncontrado = userData.cep;
        console.log('🗺️ [MAPA-PANELEIRO] CEP encontrado em userData.cep:', cepEncontrado);
    }

    if (!cepEncontrado) {
        console.log('🗺️ [MAPA-PANELEIRO] Nenhum CEP encontrado, redirecionando...');
        toast("CEP não encontrado. Redirecionando para configuração...", 'info');
        setTimeout(() => window.location.href = "confirma_local.html", 2000);
        return;
    }

    const cepToUse = cepEncontrado.replace(/\D/g, '');
    console.log('🗺️ [MAPA-PANELEIRO] CEP a ser usado (limpo):', cepToUse);

    toast("Carregando sua localização...", 'info');

    try {
        console.log('🗺️ [MAPA-PANELEIRO] Iniciando busca de informações do CEP...');
        // Busca informações do CEP
        buscarInfoCep(cepToUse).then(endereco => {
            console.log('🗺️ [MAPA-PANELEIRO] Resultado da busca do CEP:', endereco);
            if (!endereco) {
                console.error('🗺️ [MAPA-PANELEIRO] CEP inválido - nenhum endereço retornado');
                throw new Error('CEP inválido');
            }

            console.log('🗺️ [MAPA-PANELEIRO] CEP válido, buscando coordenadas...');
            // Busca coordenadas
            buscarCoordenadas(endereco).then(coordenadas => {
                console.log('🗺️ [MAPA-PANELEIRO] Resultado da busca de coordenadas:', coordenadas);
                if (!coordenadas) {
                    console.error('🗺️ [MAPA-PANELEIRO] Coordenadas não encontradas');
                    throw new Error('Coordenadas não encontradas');
                }

                console.log('🗺️ [MAPA-PANELEIRO] Coordenadas encontradas, inicializando mapa...');
                // Inicializa o mapa apenas com a localização do usuário
                initMapPaneleiro(coordenadas.lat, coordenadas.lng, endereco);

                toast(`Localização carregada: ${endereco.localidade}/${endereco.uf}`, 'success');
                console.log('🗺️ [MAPA-PANELEIRO] Mapa carregado com sucesso!');
            });
        });
    } catch (error) {
        console.error('🗺️ [MAPA-PANELEIRO] Erro ao carregar mapa:', error);
        toast("Erro ao carregar localização. Redirecionando para configuração...", 'error');
        setTimeout(() => window.location.href = "confirma_local.html", 2000);
    }
}

// Inicializar mapa para paneleiros (sem markers de outros paneleiros)
function initMapPaneleiro(lat, lng, endereco = null) {
    console.log('Iniciando mapa para paneleiros com coordenadas:', lat, lng);

    const mapContainer = document.getElementById('map');
    if (!mapContainer) {
        console.error('Container do mapa não encontrado!');
        return;
    }

    // Forçar invalidação do tamanho do container
    setTimeout(() => {
        if (map) {
            map.invalidateSize();
            console.log('Tamanho do mapa invalidado');
        }
    }, 100);

    if (!map) {
        console.log('Criando novo mapa...');
        map = L.map('map', {
            zoomControl: false, // Remove controles de zoom
            scrollWheelZoom: false, // Desabilita zoom com scroll
            doubleClickZoom: false, // Desabilita zoom com double click
            boxZoom: false, // Desabilita zoom com caixa
            keyboard: false, // Desabilita controles de teclado
            attributionControl: false, // Remove marca d'água do Leaflet
            dragging: false, // Desabilita arrastar
            touchZoom: false, // Desabilita zoom por toque
            scrollWheelZoom: false, // Desabilita zoom com scroll
            doubleClickZoom: false, // Desabilita zoom com double click
            boxZoom: false, // Desabilita zoom com caixa
            keyboard: false // Desabilita controles de teclado
        }).setView([lat, lng], 15);

        // Tile layer minimalista
        L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="http://cartodb.com/attributions">CartoDB</a>',
            maxZoom: 19,
            minZoom: 10
        }).addTo(map);

        console.log('Tile layer adicionado ao mapa');
    } else {
        console.log('Mapa já existe, atualizando visualização...');
    }

    // Sempre atualizar a visualização e o marcador
    map.setView([lat, lng], 15);
    console.log('Visualização do mapa definida para:', [lat, lng]);

    // Criar ou atualizar marcador do usuário
    if (marker) {
        marker.setLatLng([lat, lng]);
        console.log('Marcador existente movido para:', [lat, lng]);
    } else {
        // Criar ícone customizado azul para o usuário
        const userIcon = L.divIcon({
            className: 'user-marker',
            html: `
                <div style="
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    background: #007bff;
                    border: 3px solid white;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    position: relative;
                ">
                    <div style="
                        width: 16px;
                        height: 16px;
                        border-radius: 50%;
                        background: white;
                        position: absolute;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%);
                    "></div>
                </div>
            `,
            iconSize: [40, 40],
            iconAnchor: [20, 20]
        });

        marker = L.marker([lat, lng], { icon: userIcon }).addTo(map);
        console.log('Novo marcador criado na posição:', [lat, lng]);
    }

    // Atualizar popup
    if (endereco) {
        marker.bindPopup(`
            <strong>Sua localização</strong><br>
            ${endereco.logradouro}<br>
            ${endereco.bairro}<br>
            ${endereco.localidade}/${endereco.uf}<br>
            CEP: ${endereco.cep}
        `).openPopup();
    } else {
        marker.bindPopup("Sua localização").openPopup();
    }

    // Garantir que o mapa seja renderizado completamente
    setTimeout(() => {
        if (map) {
            map.invalidateSize();
            // Forçar recentralização após invalidação
            map.setView([lat, lng], 15);
            console.log('Mapa renderizado e recentralizado completamente');
        }
    }, 200);
}

// Sistema de abas
function inicializarAbas() {
    console.log('🎯 INICIALIZANDO ABAS - INÍCIO');

    const tabCalendario = document.getElementById('tabCalendario');
    const tabMapa = document.getElementById('tabMapa');
    const calendarTab = document.getElementById('calendarTab');
    const mapTab = document.getElementById('mapTab');

    console.log('🔍 Elementos das abas encontrados:', {
        tabCalendario: !!tabCalendario,
        tabMapa: !!tabMapa,
        calendarTab: !!calendarTab,
        mapTab: !!mapTab
    });

    if (!tabCalendario || !tabMapa || !calendarTab || !mapTab) {
        console.error('❌ ELEMENTOS DAS ABAS NÃO ENCONTRADOS! Abortando inicialização');
        return;
    }

    // Função para mostrar aba do calendário
    const mostrarCalendario = () => {
        console.log('🗂️ MOSTRANDO ABA DO CALENDÁRIO');
        tabCalendario.classList.add('active');
        tabMapa.classList.remove('active');
        calendarTab.classList.add('active');
        mapTab.classList.remove('active');

        // Recarregar calendário
        setTimeout(async () => {
            console.log('🔄 RECARREGANDO CALENDÁRIO NA ABA...');
            await renderCalendario();
            configurarEventosCalendario();
        }, 50);
    };

    // Função para mostrar aba do mapa
    const mostrarMapa = () => {
        console.log('Mostrando aba do mapa');
        tabCalendario.classList.remove('active');
        tabMapa.classList.add('active');
        calendarTab.classList.remove('active');
        mapTab.classList.add('active');

        // Recarregar mapa
        setTimeout(() => {
            carregarMapaPaneleiro();
        }, 50);
    };

    // Adicionar event listeners
    tabCalendario.addEventListener('click', mostrarCalendario);
    tabMapa.addEventListener('click', mostrarMapa);

    console.log('Abas inicializadas com sucesso');
}

// Função para obter o nome do mês em português
function getNomeMes(mes) {
    const meses = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril',
        'Maio', 'Junho', 'Julho', 'Agosto',
        'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return meses[mes];
}

// Função principal para renderizar o calendário
async function renderCalendario() {
    console.log(`🚀 RENDER_CALENDARIO CHAMADO: mes=${mesAtualCalendario}, ano=${anoAtualCalendario}`);

    try {
        const dataAtual = new Date();
        const diaAtual = dataAtual.getDate();
        const mesAtualSistema = dataAtual.getMonth();
        const anoAtualSistema = dataAtual.getFullYear();

        // Usa as variáveis globais para navegação, mas mantém o mês/ano atual como referência
        const mesParaMostrar = mesAtualCalendario;
        const anoParaMostrar = anoAtualCalendario;

        console.log(`📅 RENDER: Mostrando ${getNomeMes(mesParaMostrar)} ${anoParaMostrar}`);

        // Atualiza o cabeçalho com mês e ano
        const headerElement = document.getElementById('mes-ano');
        if (headerElement) {
            headerElement.textContent = `${getNomeMes(mesParaMostrar)} ${anoParaMostrar}`;
        }

        // Primeiro dia do mês e quantidade de dias no mês
        const primeiroDiaDoMes = new Date(anoParaMostrar, mesParaMostrar, 1).getDay();
        const ultimoDiaDoMes = new Date(anoParaMostrar, mesParaMostrar + 1, 0).getDate();

        const tbody = document.getElementById('dias-calendario');
        if (!tbody) {
            console.error('Elemento dias-calendario não encontrado');
            return;
        }

        console.log(`📅 Antes da limpeza: ${tbody.querySelectorAll('td').length} células existentes`);
        tbody.innerHTML = ''; // Limpa conteúdo anterior
        console.log(`📅 Após limpeza: ${tbody.querySelectorAll('td').length} células restantes`);

        // Buscar dias de entrega máxima para destacar (agora é async)
        const diasEntregaMaxima = await buscarDiasEntregaMaxima(mesParaMostrar, anoParaMostrar);

        let linha = document.createElement('tr');
        let diaContador = 1;

        // DEBUG: Informações sobre o mês
        console.log(`📅 Renderizando mês ${mesParaMostrar + 1}/${anoParaMostrar}`);
        console.log(`📅 Primeiro dia da semana: ${primeiroDiaDoMes} (0=domingo, 6=sábado)`);
        console.log(`📅 Último dia do mês: ${ultimoDiaDoMes}`);
        console.log(`📅 Dias de entrega máxima:`, diasEntregaMaxima);

        // Adiciona células vazias antes do primeiro dia do mês
        for (let i = 0; i < primeiroDiaDoMes; i++) {
            const celulaVazia = document.createElement('td');
            linha.appendChild(celulaVazia);
            console.log(`📅 Adicionada célula vazia ${i + 1}/${primeiroDiaDoMes}`);
        }

        // Renderiza os dias do mês
        diaContador = 1; // Reset do contador
        while (diaContador <= ultimoDiaDoMes) {
            console.log(`📅 Processando dia ${diaContador}/${ultimoDiaDoMes}, linha atual tem ${linha.children.length} células`);

            // Validação extra: garantir que não criamos dias inválidos
            if (diaContador > ultimoDiaDoMes) {
                console.error(`❌ ERRO CRÍTICO: Tentando criar dia ${diaContador} mas último dia é ${ultimoDiaDoMes}`);
                break;
            }

            // Se a linha estiver cheia (7 células), adiciona ao tbody e cria nova linha
            if (linha.children.length === 7) {
                tbody.appendChild(linha);
                linha = document.createElement('tr');
                console.log(`📅 Nova linha criada, dia ${diaContador}`);
            }

            const coluna = document.createElement('td');
            coluna.textContent = diaContador;
            console.log(`📅 Criada célula para dia ${diaContador}`);

            // Marca o dia atual (apenas se estiver no mês/ano atual)
            if (diaContador === diaAtual &&
                mesParaMostrar === mesAtualSistema &&
                anoParaMostrar === anoAtualSistema) {
                coluna.classList.add('dia-atual');
                console.log(`📅 Dia ${diaContador} marcado como dia atual`);
            }

            // Marca fins de semana
            const diaSemana = new Date(anoParaMostrar, mesParaMostrar, diaContador).getDay();
            if (diaSemana === 0 || diaSemana === 6) {
                coluna.classList.add('fim-de-semana');
                console.log(`📅 Dia ${diaContador} marcado como fim de semana (dia da semana: ${diaSemana})`);
            }

            // Destaca dias de entrega máxima em laranja
            if (diasEntregaMaxima.includes(diaContador)) {
                coluna.classList.add('dia-entrega-maxima');
                console.log(`📅 Dia ${diaContador} destacado como dia de entrega máxima`);

                // Adicionar event listener para clicar no dia agendado
                // IMPORTANTE: Capturar o valor atual de diaContador para evitar problemas de closure
                const diaClicado = diaContador;
                coluna.style.cursor = 'pointer';
                coluna.addEventListener('click', async () => {
                    console.log(`📅 Dia ${diaClicado}/${mesParaMostrar + 1}/${anoParaMostrar} clicado (dia agendado)`);
                    console.log(`🔍 Parâmetros para buscarPedidosPorDia: dia=${diaClicado}, mes=${mesParaMostrar}, ano=${anoParaMostrar}`);

                    // Buscar pedidos para este dia específico
                    const pedidosDoDia = await buscarPedidosPorDia(diaClicado, mesParaMostrar, anoParaMostrar);

                    console.log(`📋 Resultado da busca: ${pedidosDoDia.length} pedidos encontrados`);
                    console.log('📋 Pedidos encontrados:', pedidosDoDia);

                    if (pedidosDoDia.length > 0) {
                        console.log(`📋 Encontrados ${pedidosDoDia.length} pedidos para este dia`);

                        // Se houver apenas um pedido, ir direto para ele
                        if (pedidosDoDia.length === 1) {
                            const pedido = pedidosDoDia[0];
                            console.log(`🔗 Redirecionando para pedido único: ${pedido.id}`);
                            redirecionarParaPedido(pedido.id);
                        } else {
                            // Se houver múltiplos pedidos, mostrar lista ou ir para página de pedidos
                            console.log(`📋 Múltiplos pedidos encontrados, redirecionando para página de pedidos`);
                            // Salvar os pedidos do dia para mostrar na página de pedidos
                            localStorage.setItem('pedidosDiaSelecionado', JSON.stringify({
                                data: `${anoParaMostrar}-${String(mesParaMostrar + 1).padStart(2, '0')}-${String(diaClicado).padStart(2, '0')}`,
                                pedidos: pedidosDoDia
                            }));
                            window.location.href = 'pedidos.html';
                        }
                    } else {
                        console.log(`⚠️ Nenhum pedido encontrado para este dia`);
                        toast('Nenhum pedido agendado para este dia', 'info');
                    }
                });
            }

            linha.appendChild(coluna);
            diaContador++;
        }

        console.log(`📅 Finalizado processamento dos dias. Última linha tem ${linha.children.length} células`);

        // Adicionar a última linha se ela não estiver vazia
        if (linha.children.length > 0) {
            tbody.appendChild(linha);
            console.log(`📅 Última linha adicionada ao tbody com ${linha.children.length} células`);
        }

        // Verificar total de células criadas
        const totalCelulas = tbody.querySelectorAll('td').length;
        const totalLinhas = tbody.querySelectorAll('tr').length;
        console.log(`📅 Calendário finalizado: ${totalLinhas} linhas, ${totalCelulas} células totais`);
    } catch (error) {
        console.error("Erro ao renderizar calendário:", error);
    }
}

async function inicializarCalendario() {
    await renderizarCalendario();
    configurarEventosCalendario();
}

// Variável global para controlar o mês atual do calendário
let mesAtualCalendario = new Date().getMonth();
let anoAtualCalendario = new Date().getFullYear();

function configurarEventosCalendario() {
    console.log('🎯 CONFIGURANDO EVENTOS DO CALENDÁRIO - INÍCIO');

    const btnMesAnterior = document.getElementById('mes-anterior');
    const btnMesProximo = document.getElementById('mes-proximo');

    console.log('🔍 Botões encontrados:', {
        anterior: btnMesAnterior,
        proximo: btnMesProximo,
        anteriorExists: !!btnMesAnterior,
        proximoExists: !!btnMesProximo
    });

    if (!btnMesAnterior || !btnMesProximo) {
        console.error('❌ BOTÕES NÃO ENCONTRADOS! Abortando configuração');
        return;
    }

    // Remover todos os event listeners existentes
    if (btnMesAnterior) {
        console.log('✅ Configurando botão mês anterior');
        btnMesAnterior.replaceWith(btnMesAnterior.cloneNode(true));
        const novoBtnAnterior = document.getElementById('mes-anterior');
        novoBtnAnterior.addEventListener('click', async (event) => {
            console.log('🖱️ BOTÃO MÊS ANTERIOR CLICADO!');
            console.log(`📅 Navegando para mês anterior. Atual: ${mesAtualCalendario}/${anoAtualCalendario}`);
            mesAtualCalendario--;
            if (mesAtualCalendario < 0) {
                mesAtualCalendario = 11;
                anoAtualCalendario--;
                console.log(`📅 Virou o ano: ${mesAtualCalendario}/${anoAtualCalendario}`);
            }
            console.log(`📅 Renderizando calendário para: ${getNomeMes(mesAtualCalendario)} ${anoAtualCalendario}`);
            await renderCalendario();
            console.log(`✅ Navegação concluída para: ${getNomeMes(mesAtualCalendario)} ${anoAtualCalendario}`);
        });
    } else {
        console.error('❌ Botão mês anterior não encontrado!');
    }

    if (btnMesProximo) {
        console.log('✅ Configurando botão mês próximo');
        btnMesProximo.replaceWith(btnMesProximo.cloneNode(true));
        const novoBtnProximo = document.getElementById('mes-proximo');
        novoBtnProximo.addEventListener('click', async () => {
            console.log(`📅 Navegando para próximo mês. Atual: ${mesAtualCalendario}/${anoAtualCalendario}`);
            mesAtualCalendario++;
            if (mesAtualCalendario > 11) {
                mesAtualCalendario = 0;
                anoAtualCalendario++;
                console.log(`📅 Virou o ano: ${mesAtualCalendario}/${anoAtualCalendario}`);
            }
            console.log(`📅 Renderizando calendário para: ${getNomeMes(mesAtualCalendario)} ${anoAtualCalendario}`);
            await renderCalendario();
            console.log(`✅ Navegação concluída para: ${getNomeMes(mesAtualCalendario)} ${anoAtualCalendario}`);
        });
    } else {
        console.error('❌ Botão mês próximo não encontrado!');
    }

    console.log('✅ Configuração de eventos do calendário concluída');
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Configurar interface baseada no tipo de usuário
    configurarInterfacePorTipoUsuario();

    // Inicializar abas com delay para garantir que os elementos existem
    setTimeout(() => {
        inicializarAbas();
    }, 100);

    // Configurar busca de paneleiros (apenas para clientes)
    const searchInput = document.getElementById('searchInput');
    if (searchInput && searchInput.style.display !== 'none') {
        let searchTimeout;

        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                buscarPaneleiros(e.target.value);
            }, 300); // Debounce de 300ms
        });

        // Event listener para tecla Enter
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                abrirPesquisaCompleta();
            }
        });

        // Ocultar resultados ao clicar fora
        document.addEventListener('click', (e) => {
            if (!searchInput.contains(e.target) && !document.getElementById('searchResults').contains(e.target)) {
                ocultarResultadosBusca();
            }
        });
    }

    // Adiciona botão de logout se existir
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (window.Android && window.Android.logout) {
                window.Android.logout();
            } else {
                toast("Erro: Interface Android não disponível", 'error');
            }
        });
    }

    // Adiciona botão para alterar localização se existir
    const changeLocationBtn = document.getElementById('changeLocationBtn');
    if (changeLocationBtn) {
        changeLocationBtn.addEventListener('click', () => {
            window.location.href = "confirma_local.html";
        });
    }

    // Adiciona evento para o botão de serviços na bottom nav
    const btnServicos = document.getElementById('btnServicos');
    if (btnServicos) {
        btnServicos.addEventListener('click', () => {
            window.location.href = "pedidos.html";
        });
    }

    // Adiciona evento para o botão "Solicitar Serviço"
    const btnSolicitarServico = document.getElementById('btnSolicitarServico');
    if (btnSolicitarServico) {
        btnSolicitarServico.addEventListener('click', () => {
            showServiceRequestModal();
        });
    }

    // Verificar disponibilidade da aba de mensagens
    checkMessagesTabAvailability();

    // Adiciona evento para o botão de mensagens na bottom nav
    const btnMensagens = document.getElementById('btnMensagens');
    if (btnMensagens) {
        btnMensagens.addEventListener('click', () => {
            window.location.href = "mensagens.html";
        });
    }

    // Adiciona evento para o botão de perfil na bottom nav
    const btnPerfil = document.getElementById('btnPerfil');
    if (btnPerfil) {
        btnPerfil.addEventListener('click', () => {
            window.location.href = "perfil.html";
        });
    }


});

// Callbacks do Android
function onSuccess(message) {
    toast(message || "Operação realizada com sucesso!", 'success');

    // Se o usuário fez login e é paneleiro, inicializar avaliação
    const userDataRaw = localStorage.getItem("user");
    if (userDataRaw) {
        try {
            const userData = JSON.parse(userDataRaw);
            const userType = userData.tipoUsuario || userData.tipo;

            if (userType === 'Paneleiro' || userType === 'paneleiro') {
                // Verificar se já tem avaliação inicializada
                const avaliacaoExistente = localStorage.getItem(`avaliacao_paneleiro_${userData.id}`);
                if (!avaliacaoExistente) {
                    console.log('Inicializando avaliação para paneleiro recém-logado:', userData.id);
                    inicializarAvaliacaoPaneleiro();
                }
            }
        } catch (error) {
            console.warn('Erro ao verificar tipo de usuário para inicialização de avaliação:', error);
        }
    }
}

function onError(errorMessage) {
    toast("Erro: " + errorMessage, 'error');
}

// Funcionalidade do botão voltar do dispositivo na página home
// Adiciona uma entrada no histórico para interceptar o botão voltar
window.history.pushState({page: 'home'}, 'Home', window.location.href);

// Intercepta o botão voltar do dispositivo
window.addEventListener('popstate', function(event) {
    if (event.state && event.state.page === 'home') {
        // Na página home, permite o comportamento padrão (sair do app)
        console.log('Botão voltar pressionado na página home - permitindo saída do app');
        // Não impede o evento, permitindo que o usuário saia do app
    }
});

// Fallback para beforeunload
window.addEventListener('beforeunload', function(event) {
    console.log('Botão voltar pressionado na página home - permitindo saída do app');
});

// Abordagem adicional: Interceptar unload
window.addEventListener('unload', function(event) {
    console.log('Botão voltar pressionado na página home - permitindo saída do app');
});

// Verificar se estamos em WebView Android
if (window.Android && window.Android.onBackPressed) {
    window.Android.onBackPressed = function() {
        console.log('Botão voltar pressionado na página home - permitindo saída do app');
    };
}

// Modal de solicitação de serviço
function showServiceRequestModal() {
    const modal = document.getElementById('serviceRequestModal');
    if (modal) {
        modal.style.display = 'flex';

        // Pequeno delay para garantir que o modal está totalmente carregado
        setTimeout(() => {
            // Configurar data mínima (amanhã)
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const dateInput = document.getElementById('preferredDate');
            if (dateInput) {
                const tomorrowStr = tomorrow.toISOString().split('T')[0];
                dateInput.min = tomorrowStr;
                dateInput.value = tomorrowStr;
            }

            // Focar no primeiro campo
            const firstInput = document.getElementById('serviceType');
            if (firstInput) {
                firstInput.focus();
            }
        }, 100);
    }
}

function hideServiceRequestModal() {
    const modal = document.getElementById('serviceRequestModal');
    if (modal) {
        modal.style.display = 'none';

        // Limpar formulário
        const form = document.getElementById('serviceRequestForm');
        if (form) {
            form.reset();
        }
    }
}

// Função para aguardar Firebase estar pronto
function waitForFirebase() {
    return new Promise((resolve) => {
        const checkFirebase = () => {
            if (window.db && typeof window.db.collection === 'function') {
                console.log("✅ Firebase está pronto!");
                resolve();
            } else {
                console.log("⏳ Aguardando Firebase...");
                setTimeout(checkFirebase, 100);
            }
        };
        checkFirebase();
    });
}

async function handleServiceRequestSubmit(event) {
    event.preventDefault();

    console.log("🚀 Iniciando envio da solicitação de serviço...");

    // Aguardar Firebase estar pronto
    try {
        await waitForFirebase();
    } catch (error) {
        console.error("❌ Timeout aguardando Firebase:", error);
        toast("Erro: Firebase não inicializou", 'error');
        return;
    }

    console.log("✅ Firebase está disponível");

    // Verificar dados do usuário
    const userDataRaw = localStorage.getItem("user");
    if (!userDataRaw) {
        console.error("❌ Nenhum dado de usuário encontrado");
        toast("Erro: Usuário não está logado", 'error');
        return;
    }

    console.log("👤 Dados do usuário:", userDataRaw);

    // Coletar serviços selecionados
    const selectedServices = [];
    const serviceCheckboxes = document.querySelectorAll('.service-checkbox input[type="checkbox"]:checked');

    serviceCheckboxes.forEach(checkbox => {
        selectedServices.push(checkbox.value);
    });

    console.log("🔧 Serviços selecionados:", selectedServices);

    // Coletar dados do formulário
    const formData = new FormData(event.target);

    // Processar data corretamente (evitar problemas de fuso horário)
    const preferredDateStr = formData.get('preferredDate');
    let preferredDate = null;
    if (preferredDateStr) {
        // Criar data no fuso horário local para evitar conversão automática
        const [year, month, day] = preferredDateStr.split('-').map(Number);
        preferredDate = new Date(year, month - 1, day); // month - 1 porque Date usa 0-based
        console.log('📅 Data selecionada:', preferredDateStr, '→ Data processada:', preferredDate.toISOString().split('T')[0]);
    }

    const serviceRequest = {
        servicos: selectedServices,
        description: formData.get('serviceDescription'),
        preferredDate: preferredDate ? preferredDate.toISOString().split('T')[0] : null, // Salvar apenas a data (YYYY-MM-DD)
        preferredTime: formData.get('preferredTime'),
        tipoEntrega: formData.get('tipoEntrega'),
        priority: formData.get('priority'),
        metodoPagamento: formData.get('metodoPagamento'),
        timestamp: new Date().toISOString()
    };

    console.log("📋 Dados da solicitação:", serviceRequest);



    // Coletar anexos (fotos)
    const attachmentInput = document.getElementById('serviceAttachment');
    if (attachmentInput && attachmentInput.files.length > 0) {
        serviceRequest.anexos = [];
        const maxFiles = 5; // Limite de 5 arquivos

        for (let i = 0; i < Math.min(attachmentInput.files.length, maxFiles); i++) {
            const file = attachmentInput.files[i];
            // Em produção, aqui seria feito upload para storage (Firebase Storage, etc.)
            // Por enquanto, apenas guardamos as informações dos arquivos
            serviceRequest.anexos.push({
                nome: file.name,
                tamanho: file.size,
                tipo: file.type,
                // Em produção: url: await uploadFile(file)
            });
        }
    }

    // Validação básica
    if (selectedServices.length === 0) {
        toast('Por favor, selecione pelo menos um serviço', 'error');
        return;
    }

    // Validação específica de campos obrigatórios
    if (!serviceRequest.preferredDate) {
        toast('Por favor, selecione uma data preferida', 'error');
        return;
    }

    if (!serviceRequest.preferredTime || serviceRequest.preferredTime === "") {
        toast('Por favor, selecione um horário preferido', 'error');
        return;
    }

    if (!serviceRequest.tipoEntrega || serviceRequest.tipoEntrega === "") {
        toast('Por favor, selecione o tipo de entrega', 'error');
        return;
    }

    // Validação de anexos (opcional)
    if (serviceRequest.anexos && serviceRequest.anexos.length > 5) {
        toast('Você pode anexar no máximo 5 fotos', 'error');
        return;
    }

    // Enviar solicitação para o Firebase
    try {
        console.log('📤 Enviando solicitação para Firebase...');

        const solicitacaoId = await salvarSolicitacaoServico(serviceRequest);
        console.log('✅ Solicitação salva no Firebase com ID:', solicitacaoId);

        // Mostrar confirmação
        const numAnexos = serviceRequest.anexos ? serviceRequest.anexos.length : 0;
        const anexosMsg = numAnexos > 0 ? ` com ${numAnexos} foto(s) anexa(s)` : '';
        toast(`Solicitação enviada com sucesso!${anexosMsg}`, 'success');

        // Fechar modal
        hideServiceRequestModal();

    } catch (error) {
        console.error('❌ Erro ao salvar solicitação no Firebase:', error);
        toast('Erro ao enviar solicitação. Tente novamente.', 'error');
    }
}

// Event listeners para o modal
document.addEventListener('DOMContentLoaded', () => {
    // ... existing code ...

    // Modal event listeners
    const modalClose = document.getElementById('modalClose');
    const btnCancel = document.getElementById('btnCancel');
    const serviceForm = document.getElementById('serviceRequestForm');
    const attachmentInput = document.getElementById('serviceAttachment');

    if (modalClose) {
        modalClose.addEventListener('click', hideServiceRequestModal);
    }

    if (btnCancel) {
        btnCancel.addEventListener('click', hideServiceRequestModal);
    }

    if (serviceForm) {
        serviceForm.addEventListener('submit', handleServiceRequestSubmit);
    }

    // Funcionalidade do anexo de fotos
    if (attachmentInput) {
        attachmentInput.addEventListener('change', handleFileSelection);
    }

    // Fechar modal ao clicar no overlay
    const modal = document.getElementById('serviceRequestModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                hideServiceRequestModal();
            }
        });
    }
});

// Função para lidar com seleção de arquivos
function handleFileSelection(event) {
    const files = event.target.files;
    const maxFiles = 5;

    // Limpar prévias anteriores
    const existingPreview = document.querySelector('.attachment-preview');
    if (existingPreview) {
        existingPreview.remove();
    }

    if (files.length === 0) return;

    if (files.length > maxFiles) {
        toast(`Você pode selecionar no máximo ${maxFiles} fotos`, 'error');
        event.target.value = ''; // Limpar seleção
        return;
    }

    // Criar container de prévia
    const previewContainer = document.createElement('div');
    previewContainer.className = 'attachment-preview';
    previewContainer.style.cssText = `
        margin-top: 10px;
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        padding: 10px;
        background: #ffffffff;
        border-radius: 8px;
        border: 1px solid #e5e7eb;
    `;

    // Adicionar texto informativo
    const infoText = document.createElement('small');
    infoText.textContent = `${files.length} foto(s) selecionada(s)`;
    infoText.style.cssText = `
        width: 100%;
        color: #6b7280;
        font-size: 12px;
        margin-bottom: 8px;
    `;
    previewContainer.appendChild(infoText);

    // Processar cada arquivo
    Array.from(files).forEach((file, index) => {
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const imageContainer = document.createElement('div');
                imageContainer.style.cssText = `
                    position: relative;
                    width: 60px;
                    height: 60px;
                    border-radius: 6px;
                    overflow: hidden;
                    border: 1px solid #ffffffff;
                `;

                const img = document.createElement('img');
                img.src = e.target.result;
                img.style.cssText = `
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                `;

                // Botão de remover
                const removeBtn = document.createElement('button');
                removeBtn.innerHTML = '×';
                removeBtn.style.cssText = `
                    position: absolute;
                    top: -5px;
                    right: -5px;
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                    background: #ef4444;
                    color: white;
                    border: none;
                    font-size: 14px;
                    font-weight: bold;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    line-height: 1;
                `;

                removeBtn.onclick = function() {
                    // Remover arquivo da lista
                    const dt = new DataTransfer();
                    const input = document.getElementById('serviceAttachment');
                    const files = Array.from(input.files);

                    files.splice(index, 1);
                    files.forEach(file => dt.items.add(file));
                    input.files = dt.files;

                    // Remover prévia
                    imageContainer.remove();

                    // Atualizar contador
                    const remainingFiles = document.querySelectorAll('.attachment-preview img').length;
                    if (remainingFiles === 0) {
                        document.querySelector('.attachment-preview').remove();
                    } else {
                        const infoText = document.querySelector('.attachment-preview small');
                        if (infoText) {
                            infoText.textContent = `${remainingFiles} foto(s) selecionada(s)`;
                        }
                    }
                };

                imageContainer.appendChild(img);
                imageContainer.appendChild(removeBtn);
                previewContainer.appendChild(imageContainer);
            };
            reader.readAsDataURL(file);
        }
    });

    // Adicionar prévia após o campo de anexo
    const attachmentField = document.querySelector('input[type="file"]').parentNode;
    attachmentField.appendChild(previewContainer);
}

// Função para verificar disponibilidade da aba de mensagens
function checkMessagesTabAvailability() {
    // Em produção, verificar se há negociações/pedidos em andamento via Firebase
    // Por enquanto, simulamos que sempre há conversas disponíveis para demonstração

    const userDataRaw = localStorage.getItem("user");
    if (!userDataRaw) return;

    const userData = JSON.parse(userDataRaw);
    const userType = userData.tipoUsuario || userData.tipo;

    // Simular que há negociações em andamento
    // Em produção, isso viria do Firebase
    const hasActiveNegotiations = true; // Sempre true para demonstração

    const messagesTab = document.querySelector('.bottom-nav .nav-btn:nth-child(3)');
    if (messagesTab) {
        if (hasActiveNegotiations) {
            messagesTab.style.display = 'block';
            console.log('Aba de mensagens habilitada - há negociações em andamento');
        } else {
            messagesTab.style.display = 'none';
            console.log('Aba de mensagens desabilitada - nenhuma negociação em andamento');
        }
    }
}

// Função para buscar dias de entrega máxima para destacar no calendário
async function buscarDiasEntregaMaxima(mes, ano) {
    try {
        console.log('🔍 Buscando dias de entrega máxima para:', { mes, ano });

        const userDataRaw = localStorage.getItem("user");
        if (!userDataRaw) {
            console.log('❌ Nenhum dado de usuário encontrado para buscar dias de entrega');
            return [];
        }

        const userData = JSON.parse(userDataRaw);
        const userType = userData.tipoUsuario || userData.tipo;
        console.log('👤 Tipo de usuário:', userType, 'ID:', userData.id);

        // Só buscar dias de entrega para paneleiros
        if (userType !== 'Paneleiro' && userType !== 'paneleiro') {
            console.log('ℹ️ Usuário não é paneleiro, não buscará dias de entrega');
            return [];
        }

        // Inicializar lista de pedidos (apenas do Firebase)
        let pedidos = [];

        // Buscar pedidos do Firebase para paneleiros
        try {
            console.log('🔥 Buscando pedidos do Firebase...');

            // Aguardar Firebase estar pronto
            let tentativas = 0;
            const maxTentativas = 10;

            while (!window.db && tentativas < maxTentativas) {
                console.log(`⏳ Aguardando Firebase... Tentativa ${tentativas + 1}/${maxTentativas}`);
                await new Promise(resolve => setTimeout(resolve, 500));
                tentativas++;
            }

            if (window.db && window.firestoreQuery) {
                console.log('✅ Firebase disponível, executando query...');

                // Primeiro, vamos buscar TODOS os documentos para debug
                const pedidosRef = window.firestoreCollection(window.db, 'solicitacoes_servico');
                console.log('🔍 Buscando TODOS os documentos da coleção solicitacoes_servico...');

                const allDocsSnapshot = await window.firestoreGetDocs(pedidosRef);
                console.log('📄 TOTAL de documentos na coleção:', allDocsSnapshot.size);

                // Mostrar alguns documentos para debug
                let count = 0;
                allDocsSnapshot.forEach((doc) => {
                    if (count < 3) { // Mostrar apenas os primeiros 3
                        const data = doc.data();
                        console.log(`📋 Documento ${count + 1}:`, {
                            id: doc.id,
                            status: data.status,
                            paneleiroId: data.paneleiroId,
                            clienteId: data.clienteId,
                            dataCriacao: data.dataCriacao
                        });
                        count++;
                    }
                });

                // Agora buscar com filtros específicos
                console.log('🎯 Aplicando filtros: paneleiroId ==', userData.id);

                // Usar sintaxe Firebase v9 - uma condição de cada vez para evitar problemas
                let q = window.firestoreQuery(
                    pedidosRef,
                    window.firestoreWhere('paneleiroId', '==', userData.id)
                );

                const querySnapshot = await window.firestoreGetDocs(q);
                console.log('📄 Documentos encontrados com filtro paneleiroId:', querySnapshot.size);

                // Filtrar manualmente os status desejados
                const statusDesejados = ['pago', 'em_andamento', 'aguardando_entrega', 'agendado'];
                let pedidosFirebaseValidos = 0;

                querySnapshot.forEach((doc) => {
                    const pedidoData = doc.data();
                    const statusValido = statusDesejados.includes(pedidoData.status);

                    console.log(`🔍 Pedido ${doc.id}: status="${pedidoData.status}", válido=${statusValido}`);

                    if (statusValido) {
                        // Adicionar apenas se não existir já na lista
                        const pedidoExistente = pedidos.find(p => p.id === doc.id);
                        if (!pedidoExistente) {
                            pedidos.push({
                                id: doc.id,
                                ...pedidoData
                            });
                            pedidosFirebaseValidos++;
                        }
                    }
                });

                console.log('📦 Pedidos válidos adicionados do Firebase:', pedidosFirebaseValidos);
                console.log('📦 Total de pedidos após Firebase:', pedidos.length);
            } else {
                console.log('⚠️ Firebase não ficou disponível após aguardar');
            }
        } catch (firebaseError) {
            console.error('❌ Erro ao buscar pedidos do Firebase:', firebaseError);
            console.error('Detalhes do erro:', firebaseError.message);
        }

        const diasEntrega = [];

        pedidos.forEach((pedido, index) => {
            console.log(`🔍 Verificando pedido ${index}:`);
            console.log(`   Status: "${pedido?.status}" (esperado: "aguardando_entrega")`);
            console.log(`   PaneleiroId: "${pedido?.paneleiroId}" (usuário atual: "${userData.id}")`);
            console.log(`   DataMaximaEntrega: "${pedido?.dataMaximaEntrega}"`);

            if (!pedido) {
                console.log(`❌ Pedido ${index} é null/undefined`);
                return;
            }

            // Verificar se o pedido está em andamento (pago, em_andamento, aguardando_entrega, agendado) e pertence ao paneleiro atual
            const statusEmAndamento = ['pago', 'em_andamento', 'aguardando_entrega', 'agendado'].includes(pedido.status);
            const paneleiroCorreto = pedido.paneleiroId === userData.id;
            const temData = !!pedido.dataMaximaEntrega;

            console.log(`   ✅ Status em andamento: ${statusEmAndamento} (${pedido.status})`);
            console.log(`   ✅ Paneleiro correto: ${paneleiroCorreto}`);
            console.log(`   ✅ Tem data: ${temData}`);

            if (statusEmAndamento && paneleiroCorreto && temData) {
                try {
                    // Parse da data máxima de entrega como data local (não UTC)
                    const [year, month, day] = pedido.dataMaximaEntrega.split('-').map(Number);
                    const dataEntrega = new Date(year, month - 1, day); // month - 1 porque Date usa 0-based
                    const mesEntrega = dataEntrega.getMonth();
                    const anoEntrega = dataEntrega.getFullYear();
                    const diaEntrega = dataEntrega.getDate();

                    console.log(`📅 Data parseada: ${dataEntrega.toISOString()}`);
                    console.log(`   Mês: ${mesEntrega}, Ano: ${anoEntrega}, Dia: ${diaEntrega}`);
                    console.log(`🎯 Comparação: ${mesEntrega} === ${mes} && ${anoEntrega} === ${ano} = ${mesEntrega === mes && anoEntrega === ano}`);

                    // Verificar se está no mês/ano sendo exibido
                    if (mesEntrega === mes && anoEntrega === ano) {
                        // Adicionar o dia se não estiver já na lista
                        if (!diasEntrega.includes(diaEntrega)) {
                            diasEntrega.push(diaEntrega);
                            console.log(`✅ Dia ${diaEntrega} adicionado aos dias de entrega`);
                        }
                    } else {
                        console.log(`❌ Data fora do mês/ano atual`);
                    }
                } catch (dateError) {
                    console.warn('❌ Erro ao processar data de entrega máxima:', dateError);
                }
            } else {
                console.log(`❌ Pedido ${index} não atende aos critérios:`);
                console.log(`   Status em andamento: ${statusEmAndamento} (${pedido.status} não está em ['pago', 'em_andamento', 'aguardando_entrega'])`);
                console.log(`   Paneleiro correto: ${paneleiroCorreto} (${pedido.paneleiroId} !== ${userData.id})`);
                console.log(`   Tem data: ${temData} (${!!pedido.dataMaximaEntrega})`);
            }
        });

        console.log(`🎉 Encontrados ${diasEntrega.length} dias de entrega máxima para ${getNomeMes(mes)} ${ano}:`, diasEntrega);
        return diasEntrega;

    } catch (error) {
        console.error('❌ Erro ao buscar dias de entrega máxima:', error);
        return [];
    }
}



// Função para gerar estrelas visuais baseada na avaliação (mostra apenas as estrelas equivalentes à nota)
function gerarEstrelasVisuais(avaliacao) {
    const avaliacaoNum = parseFloat(avaliacao) || 0;
    const estrelasCheias = Math.floor(avaliacaoNum);
    const temMeiaEstrela = avaliacaoNum % 1 >= 0.5;

    let estrelasHtml = '';

    // Estrelas cheias
    for (let i = 0; i < estrelasCheias; i++) {
        estrelasHtml += '<span style="color: #ffc107; font-size: 14px;">★</span>';
    }

    // Meia estrela (se aplicável)
    if (temMeiaEstrela) {
        estrelasHtml += '<span style="color: #ffc107; font-size: 14px;">☆</span>';
    }

    // Adicionar valor numérico com fonte branca
    estrelasHtml += `<span style="font-size: 12px; color: white; margin-left: 4px;">${avaliacaoNum.toFixed(1)}</span>`;

    return estrelasHtml;
}

// Função para gerar estrelas visuais com número na frente (para popup do mapa)
function gerarEstrelasVisuaisComNumero(avaliacao) {
    const avaliacaoNum = parseFloat(avaliacao) || 0;
    const estrelasCheias = Math.floor(avaliacaoNum);
    const temMeiaEstrela = avaliacaoNum % 1 >= 0.5;

    let estrelasHtml = '';

    // Adicionar valor numérico primeiro
    estrelasHtml += `<span style="font-size: 14px; color: #333; margin-right: 4px;">${avaliacaoNum.toFixed(1)}</span>`;

    // Estrelas cheias
    for (let i = 0; i < estrelasCheias; i++) {
        estrelasHtml += '<span style="color: #ffc107; font-size: 14px;">★</span>';
    }

    // Meia estrela (se aplicável)
    if (temMeiaEstrela) {
        estrelasHtml += '<span style="color: #ffc107; font-size: 14px;">☆</span>';
    }

    return estrelasHtml;
}

// Função para inicializar avaliação do paneleiro
function inicializarAvaliacaoPaneleiro() {
    try {
        console.log("Inicializando avaliação para novo paneleiro...");

        // Obter dados do usuário atual
        const userData = JSON.parse(localStorage.getItem('user') || '{}');
        const paneleiroId = userData.id;

        if (!paneleiroId) {
            console.warn("ID do usuário não encontrado");
            return;
        }

        // Tentar calcular avaliação baseada em serviços realizados
        calcularAvaliacaoPaneleiro(paneleiroId).then(avaliacao => {
            console.log("Avaliação calculada para paneleiro", paneleiroId, ":", avaliacao);

            // Salvar avaliação no localStorage
            const dadosAvaliacao = {
                paneleiroId: paneleiroId,
                avaliacao: avaliacao.media,
                totalAvaliacoes: avaliacao.total,
                ultimaAtualizacao: new Date().toISOString()
            };

            localStorage.setItem(`avaliacao_paneleiro_${paneleiroId}`, JSON.stringify(dadosAvaliacao));
            console.log("Avaliação do paneleiro salva no localStorage:", dadosAvaliacao);

        }).catch(error => {
            console.error("Erro ao calcular avaliação do paneleiro:", error);

            // Fallback: definir avaliação padrão
            const avaliacaoPadrao = {
                paneleiroId: paneleiroId,
                avaliacao: 5.0, // Avaliação padrão para novos paneleiros
                totalAvaliacoes: 0,
                ultimaAtualizacao: new Date().toISOString()
            };

            localStorage.setItem(`avaliacao_paneleiro_${paneleiroId}`, JSON.stringify(avaliacaoPadrao));
            console.log("Avaliação padrão definida para paneleiro:", avaliacaoPadrao);
        });

    } catch (error) {
        console.error("Erro ao inicializar avaliação do paneleiro:", error);
    }
}

// Função para calcular avaliação do paneleiro baseada nos serviços realizados
async function calcularAvaliacaoPaneleiro(paneleiroId) {
    return new Promise((resolve, reject) => {
        try {
            console.log("Calculando avaliação para paneleiro:", paneleiroId);

            // Buscar todos os pedidos onde este paneleiro foi responsável
            const pedidos = JSON.parse(localStorage.getItem('pedidos') || '[]');

            // Filtrar pedidos concluídos onde este paneleiro foi responsável
            const pedidosPaneleiro = pedidos.filter(pedido =>
                pedido &&
                pedido.paneleiroId === paneleiroId &&
                pedido.status === 'concluido' &&
                pedido.avaliacaoCliente &&
                pedido.avaliacaoCliente > 0
            );

            console.log("Pedidos encontrados para paneleiro:", pedidosPaneleiro.length);

            if (pedidosPaneleiro.length === 0) {
                // Nenhum serviço avaliado ainda
                resolve({
                    media: 5.0, // Avaliação padrão
                    total: 0
                });
                return;
            }

            // Calcular média das avaliações
            const avaliacoes = pedidosPaneleiro.map(p => p.avaliacaoCliente);
            const soma = avaliacoes.reduce((acc, val) => acc + val, 0);
            const media = soma / avaliacoes.length;

            console.log("Avaliações encontradas:", avaliacoes);
            console.log("Média calculada:", media.toFixed(1));

            resolve({
                media: parseFloat(media.toFixed(1)),
                total: avaliacoes.length
            });

        } catch (error) {
            console.error("Erro no cálculo da avaliação:", error);
            reject(error);
        }
    });
}

// Função para buscar pedidos por dia específico
async function buscarPedidosPorDia(dia, mes, ano) {
    try {
        console.log(`🔍 Buscando pedidos para ${dia}/${mes + 1}/${ano}`);

        const userDataRaw = localStorage.getItem("user");
        if (!userDataRaw) {
            console.log('❌ Nenhum dado de usuário encontrado');
            return [];
        }

        const userData = JSON.parse(userDataRaw);
        const userType = userData.tipoUsuario || userData.tipo;
        const userId = userData.id;

        console.log('👤 Tipo de usuário:', userType, 'ID:', userId);

        // Só buscar pedidos para paneleiros
        if (userType !== 'Paneleiro' && userType !== 'paneleiro') {
            console.log('ℹ️ Usuário não é paneleiro');
            return [];
        }

        let pedidosDoDia = [];

        // Buscar pedidos do Firebase
        try {
            console.log('🔥 Buscando pedidos do Firebase...');

            // Aguardar Firebase estar pronto
            let tentativas = 0;
            const maxTentativas = 10;

            while (!window.db && tentativas < maxTentativas) {
                console.log(`⏳ Aguardando Firebase... Tentativa ${tentativas + 1}/${maxTentativas}`);
                await new Promise(resolve => setTimeout(resolve, 500));
                tentativas++;
            }

            if (window.db && window.firestoreQuery) {
                console.log('✅ Firebase disponível, executando query...');

                // Buscar pedidos do paneleiro
                const pedidosRef = window.firestoreCollection(window.db, 'solicitacoes_servico');
                let q = window.firestoreQuery(
                    pedidosRef,
                    window.firestoreWhere('paneleiroId', '==', userId)
                );

                const querySnapshot = await window.firestoreGetDocs(q);
                console.log('📄 Documentos encontrados:', querySnapshot.size);

                // Filtrar pedidos para o dia específico
                const dataAlvo = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
                console.log('🎯 Data alvo:', dataAlvo);

                querySnapshot.forEach((doc) => {
                    const pedidoData = doc.data();

                    // Verificar se a data máxima de entrega corresponde
                    if (pedidoData.dataMaximaEntrega === dataAlvo) {
                        // Verificar se está em status válido
                        const statusValidos = ['pago', 'em_andamento', 'aguardando_entrega', 'agendado'];
                        if (statusValidos.includes(pedidoData.status)) {
                            pedidosDoDia.push({
                                id: doc.id,
                                ...pedidoData
                            });
                            console.log(`✅ Pedido encontrado: ${doc.id} - ${pedidoData.status}`);
                        }
                    }
                });

                console.log(`📦 Encontrados ${pedidosDoDia.length} pedidos para o dia ${dia}`);
            } else {
                console.log('⚠️ Firebase não disponível');
            }
        } catch (firebaseError) {
            console.error('❌ Erro ao buscar pedidos do Firebase:', firebaseError);
        }

        return pedidosDoDia;

    } catch (error) {
        console.error('❌ Erro ao buscar pedidos por dia:', error);
        return [];
    }
}

// Função para redirecionar para um pedido específico
function redirecionarParaPedido(pedidoId) {
    console.log(`🔗 Redirecionando para pedido: ${pedidoId}`);

    // Salvar o ID do pedido para abrir nos detalhes quando carregar pedidos.html
    localStorage.setItem('pedidoParaAbrir', pedidoId);

    // Redirecionar para a página de pedidos
    window.location.href = 'pedidos.html';
}

// Função para carregar posts do perfil do usuário
window.carregarPostsPerfil = async (paneleiroId) => {
    try {
        console.log("📥 [MODAL] Carregando posts do perfil para paneleiro:", paneleiroId);

        const q = window.firestoreQuery(
            window.firestoreCollection(window.db, "posts_perfil"),
            window.firestoreWhere("paneleiroId", "==", paneleiroId)
        );

        const querySnapshot = await window.firestoreGetDocs(q);
        const posts = [];

        querySnapshot.forEach((doc) => {
            const postData = doc.data();
            console.log('📄 [MODAL] Post carregado do Firestore:', doc.id, 'imagemUrl length:', postData.imagemUrl ? postData.imagemUrl.length : 'null');

            posts.push({
                id: doc.id,
                ...postData
            });
        });

        console.log("✅ [MODAL] Posts carregados:", posts.length);
        return posts;

    } catch (error) {
        console.error("❌ [MODAL] Erro ao carregar posts:", error);
        return [];
    }
};

// Função para carregar avaliações do paneleiro
window.carregarAvaliacoesPaneleiro = async (paneleiroId) => {
    try {
        console.log("📥 Carregando avaliações para paneleiro:", paneleiroId);

        // Buscar estatísticas de avaliação no RTDB no caminho "usuarios/{paneleiroId}"
        const snapshot = await window.rtdbGet(window.rtdbRef(window.rtdb, `usuarios/${paneleiroId}`));

        if (!snapshot.exists()) {
            console.log("ℹ️ Dados do usuário não encontrados no RTDB");
        } else {
            const userData = snapshot.val();
            console.log("✅ Dados do usuário encontrados:", userData);

            // Verificar se há estatísticas de avaliação agregadas
            if (userData.mediaAvaliacoes !== undefined && userData.totalAvaliacoes !== undefined) {
                console.log("✅ Estatísticas de avaliação encontradas:", {
                    media: userData.mediaAvaliacoes,
                    total: userData.totalAvaliacoes,
                    ultimaAtualizacao: userData.ultimaAtualizacao
                });

                // Criar avaliações simuladas baseadas nas estatísticas
                const avaliacoesSimuladas = [];
                const media = parseFloat(userData.mediaAvaliacoes) || 5;
                const total = parseInt(userData.totalAvaliacoes) || 1;

                // Criar avaliações simuladas para mostrar na interface
                for (let i = 0; i < Math.min(total, 5); i++) { // Máximo 5 avaliações simuladas
                    avaliacoesSimuladas.push({
                        id: `simulada_${i + 1}`,
                        rating: Math.round(media), // Arredondar para inteiro
                        comment: i === 0 ?
                            `Avaliação baseada em ${total} serviço(s) realizado(s). Média: ${media.toFixed(1)} estrelas.` :
                            `Cliente satisfeito - ${total} avaliação(ões) total.`,
                        dataCriacao: userData.ultimaAtualizacao || new Date().toISOString(),
                        clienteNome: `Cliente ${i + 1}`
                    });
                }

                console.log("✅ Avaliações simuladas criadas:", avaliacoesSimuladas.length);
                return avaliacoesSimuladas;
            }
        }

        // Se não encontrou estatísticas, tentar caminhos alternativos
        console.log("ℹ️ Estatísticas não encontradas - verificando caminhos alternativos");

        // Tentar caminho alternativo: "avaliacoes/{paneleiroId}"
        try {
            const snapshotAlternativo = await window.rtdbGet(window.rtdbRef(window.rtdb, `avaliacoes/${paneleiroId}`));
            if (snapshotAlternativo.exists()) {
                console.log("✅ Avaliações encontradas no caminho alternativo");
                const avaliacoesRaw = snapshotAlternativo.val();
                const avaliacoes = Object.values(avaliacoesRaw);

                // Ordenar por data (mais recente primeiro)
                avaliacoes.sort((a, b) => new Date(b.dataCriacao || b.timestamp) - new Date(a.dataCriacao || a.timestamp));

                console.log("✅ Avaliações carregadas do caminho alternativo:", avaliacoes.length);
                return avaliacoes;
            }
        } catch (altError) {
            console.log("❌ Caminho alternativo também falhou:", altError.message);
        }

        // Se não encontrou em nenhum caminho, usar dados de exemplo
        console.log("ℹ️ Nenhuma avaliação encontrada - adicionando dados de exemplo para teste");

        // Dados de exemplo para teste
        const dadosExemplo = [
            {
                id: "exemplo1",
                rating: 5,
                comment: "Excelente trabalho! Muito profissional e pontual.",
                dataCriacao: new Date().toISOString(),
                clienteNome: "Cliente Exemplo 1"
            },
            {
                id: "exemplo2",
                rating: 4,
                comment: "Bom serviço, recomendo!",
                dataCriacao: new Date(Date.now() - 86400000).toISOString(), // 1 dia atrás
                clienteNome: "Cliente Exemplo 2"
            },
            {
                id: "exemplo3",
                rating: 5,
                comment: "Perfeito! Voltarei a contratar.",
                dataCriacao: new Date(Date.now() - 172800000).toISOString(), // 2 dias atrás
                clienteNome: "Cliente Exemplo 3"
            }
        ];

        console.log("✅ Usando dados de exemplo:", dadosExemplo.length);
        return dadosExemplo;

    } catch (error) {
        console.error("❌ Erro ao carregar avaliações:", error);

        // Fallback com dados de exemplo em caso de erro
        console.log("🔄 Usando dados de exemplo devido a erro");
        return [
            {
                id: "fallback1",
                rating: 5,
                comment: "Dados de exemplo - Firebase RTDB indisponível",
                dataCriacao: new Date().toISOString(),
                clienteNome: "Sistema"
            }
        ];
    }
};

// Função para mostrar modal de perfil do paneleiro
async function mostrarModalPerfilPaneleiro(paneleiro) {
    console.log('🎯 MODAL: Iniciando modal de perfil para paneleiro:', paneleiro.id);

    // Criar modal em tela cheia ocupando toda a tela
    const modal = document.createElement('div');
    modal.className = 'modal-overlay fullscreen';
    modal.style.cssText = `
        font-family: 'Poppins', sans-serif;
    `;

    // Conteúdo inicial do modal (loading) - tela cheia
    modal.innerHTML = `
        <div style="
            background: white;
            width: 100vw;
            height: 100vh;
            position: relative;
            overflow-y: auto;
            margin: 0;
            padding: 0;
        ">
            <div style="
                padding: 40px 20px;
                text-align: center;
                color: #666;
                height: 100vh;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                box-sizing: border-box;
            ">
                <div style="margin-bottom: 24px;">Carregando perfil...</div>
                <div style="
                    width: 50px;
                    height: 50px;
                    border: 4px solid #f3f3f3;
                    border-top: 4px solid #007bff;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                "></div>
            </div>
        </div>
    `;

    // Adicionar modal ao body
    document.body.appendChild(modal);

    // Fechar modal ao clicar fora
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    });

    try {
        // Carregar dados do perfil do paneleiro do Firebase
        let postsData = [];
        let avaliacaoMedia = 5.0;
        let totalAvaliacoes = 0;
        let enderecoTexto = 'Endereço não informado';

        // Buscar posts do Firestore
        try {
            console.log('🔍 Tentando carregar posts para paneleiro:', paneleiro.id);
            console.log('🔍 window.carregarPostsPerfil existe:', !!window.carregarPostsPerfil);

            if (window.carregarPostsPerfil) {
                console.log('🔥 Chamando carregarPostsPerfil...');
                postsData = await window.carregarPostsPerfil(paneleiro.id) || [];
                console.log('✅ Posts carregados com sucesso:', postsData.length);
                if (postsData.length > 0) {
                    console.log('📋 Primeiro post:', postsData[0]);
                }
            } else {
                console.log('⚠️ Função carregarPostsPerfil não encontrada');
            }
        } catch (error) {
            console.error('❌ Erro ao carregar posts:', error);
            console.error('Detalhes do erro:', error.message);

            // Fallback: dados mockados para posts
            console.log('🔄 Usando dados mockados para posts');
            postsData = [
                {
                    id: 'mock1',
                    imagemUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDMwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+Cjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTgiIGZpbGw9IiM5Q0E0QUYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5QYW5lbGEgZGUgUHJlc3PDo28gTm92YTwvdGV4dD4KPHN2ZyB4PSIyNTAiIHk9IjE1MCIgd2lkdGg9IjUwIiBoZWlnaHQ9IjUwIiB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzk0QTNCMCIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxyZWN0IHg9IjMiIHk9IjMiIHdpZHRoPSIxOCIgaGVpZ2h0PSIxOCIiIHJ4PSIyIiByeT0iMiIvPjxjaXJjbGUgY3g9IjkiIGN5PSI5IiByPSIyIi8+PHBhdGggZD0iTTIxIDE1djYtYTMgMyAwIDAgMC0zLTNINmYTMgMyAwIDAgMC0zIDN2Nm0tOSA5djFhMyAzIDAgMCAwIDMgM2gxMmEzIDMgMCAwIDAgMy0zdi0xIi8+PC9zdmc+Cjwvc3ZnPg==',
                    legenda: 'Panela de pressão nova em folha! Pronta para uso.',
                    dataCriacao: new Date().toISOString()
                },
                {
                    id: 'mock2',
                    imagemUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDMwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+Cjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTgiIGZpbGw9IiM5Q0E0QUYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5TZXJ2acOnbyBkZSBNYW51dGVuw6fDo28gdGVybWluYWRvPC90ZXh0Pgo8c3ZnIHg9IjI1MCIgeT0iMTUwIiB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMjhBMzQ1IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTAiLz48cGF0aCBkPSJNMTEgMTJ2Nm0wIDBoNm0tNiAwdi02Ii8+PC9zdmc+Cjwvc3ZnPg==',
                    legenda: 'Serviço de manutenção concluído com sucesso.',
                    dataCriacao: new Date(Date.now() - 86400000).toISOString()
                }
            ];
        }

        // Buscar dados do RTDB (avaliações e endereço) - com aguardar Firebase
        try {
            console.log('🔍 [MODAL] Iniciando busca RTDB para paneleiro:', paneleiro.id);

            // Aguardar RTDB estar disponível (módulo ES6 pode carregar de forma assíncrona)
            let tentativasRTDB = 0;
            const maxTentativasRTDB = 20; // 2 segundos

            while (!window.rtdb && tentativasRTDB < maxTentativasRTDB) {
                console.log(`⏳ [MODAL] Aguardando RTDB... Tentativa ${tentativasRTDB + 1}/${maxTentativasRTDB}`);
                await new Promise(resolve => setTimeout(resolve, 100));
                tentativasRTDB++;
            }

            if (window.rtdb && window.rtdbRef && window.rtdbGet) {
                console.log('🔍 [MODAL] RTDB disponível após aguardar, fazendo busca...');

                try {
                const snapshot = await window.rtdbGet(window.rtdbRef(window.rtdb, `users/${paneleiro.id}`));

                    console.log('🔍 [MODAL] Snapshot existe?', snapshot.exists());
                    if (snapshot.exists()) {
                        const userData = snapshot.val();
                        console.log('✅ [MODAL] Dados RTDB encontrados:', userData);
                        console.log('🔍 [MODAL] Campos disponíveis:', Object.keys(userData));

                        // Avaliações - tentar múltiplas possibilidades
                        if (userData.mediaAvaliacoes !== undefined) {
                            avaliacaoMedia = parseFloat(userData.mediaAvaliacoes) || 5.0;
                            totalAvaliacoes = parseInt(userData.totalAvaliacoes) || 0;
                            console.log('⭐ [MODAL] Avaliação RTDB encontrada:', avaliacaoMedia, 'Total:', totalAvaliacoes);
                        } else if (userData.avaliacao !== undefined) {
                            avaliacaoMedia = parseFloat(userData.avaliacao) || 5.0;
                            totalAvaliacoes = 1;
                            console.log('⭐ [MODAL] Avaliação simples encontrada:', avaliacaoMedia);
                        } else {
                            console.log('⚠️ [MODAL] Nenhum campo de avaliação encontrado no RTDB');
                        }

                        // Endereço - tentar múltiplas possibilidades
                        if (userData.enderecoCompleto) {
                            enderecoTexto = userData.enderecoCompleto;
                            console.log('📍 [MODAL] Endereço encontrado (enderecoCompleto):', enderecoTexto);
                        } else if (userData.endereco) {
                            enderecoTexto = userData.endereco;
                            console.log('📍 [MODAL] Endereço encontrado (endereco):', enderecoTexto);
                        } else if (userData.ceps) {
                            enderecoTexto = `CEP: ${userData.ceps}`;
                            console.log('📍 [MODAL] CEP encontrado:', enderecoTexto);
                        } else if (userData.cep) {
                            enderecoTexto = `CEP: ${userData.cep}`;
                            console.log('📍 [MODAL] CEP alternativo encontrado:', enderecoTexto);
                        } else {
                            console.log('⚠️ [MODAL] Nenhum endereço encontrado no RTDB');
                        }
                    } else {
                        console.log('⚠️ [MODAL] Nenhum dado encontrado no RTDB para este paneleiro');
                        // Tentar buscar dados diretamente do objeto paneleiro se disponível
                        if (paneleiro.avaliacao) {
                            avaliacaoMedia = parseFloat(paneleiro.avaliacao) || 5.0;
                            totalAvaliacoes = 1;
                            console.log('⭐ [MODAL] Usando avaliação do objeto paneleiro:', avaliacaoMedia);
                        }
                        if (paneleiro.endereco) {
                            enderecoTexto = paneleiro.endereco;
                            console.log('📍 [MODAL] Usando endereço do objeto paneleiro:', enderecoTexto);
                        }
                    }
                } catch (firebaseError) {
                    console.error('❌ [MODAL] Erro específico do Firebase RTDB:', firebaseError);
                    console.error('❌ [MODAL] Código do erro:', firebaseError.code);
                    console.error('❌ [MODAL] Mensagem:', firebaseError.message);
                }
            } else {
                console.log('⚠️ [MODAL] RTDB não ficou disponível mesmo após aguardar');
                console.log('🔍 [MODAL] Estado das variáveis globais:', {
                    rtdb: !!window.rtdb,
                    rtdbRef: !!window.rtdbRef,
                    rtdbGet: !!window.rtdbGet
                });
                // Fallback: usar dados do objeto paneleiro
                if (paneleiro.avaliacao) {
                    avaliacaoMedia = parseFloat(paneleiro.avaliacao) || 5.0;
                    totalAvaliacoes = 1;
                    console.log('⭐ [MODAL] Fallback - Usando avaliação do objeto paneleiro:', avaliacaoMedia);
                }
                if (paneleiro.endereco) {
                    enderecoTexto = paneleiro.endereco;
                    console.log('📍 [MODAL] Fallback - Usando endereço do objeto paneleiro:', enderecoTexto);
                }
            }
        } catch (error) {
            console.error('❌ [MODAL] Erro geral ao carregar dados RTDB:', error);
            console.error('❌ [MODAL] Detalhes do erro:', error.message);
            console.error('❌ [MODAL] Stack:', error.stack);
            // Fallback final: usar dados do objeto paneleiro
            if (paneleiro.avaliacao) {
                avaliacaoMedia = parseFloat(paneleiro.avaliacao) || 5.0;
                totalAvaliacoes = 1;
                console.log('⭐ [MODAL] Fallback final - Usando avaliação do objeto paneleiro:', avaliacaoMedia);
            }
            if (paneleiro.endereco) {
                enderecoTexto = paneleiro.endereco;
                console.log('📍 [MODAL] Fallback final - Usando endereço do objeto paneleiro:', enderecoTexto);
            }
        }

        // Fallback sempre ativo para garantir dados
        console.log('🔄 [MODAL] Aplicando fallbacks...');

        // Fallback para endereço - sempre tentar buscar CEP se disponível
        if (enderecoTexto === 'Endereço não informado' || enderecoTexto.includes('não especificada')) {
            if (paneleiro.ceps || paneleiro.cep) {
                const cep = (paneleiro.ceps || paneleiro.cep).replace(/\D/g, '');
                if (cep.length === 8) {
                    try {
                        console.log('🔍 [MODAL] Buscando endereço via CEP:', cep);
                        const enderecoCep = await buscarInfoCep(cep);
                        if (enderecoCep && enderecoCep.logradouro) {
                            enderecoTexto = `${enderecoCep.logradouro}, ${enderecoCep.bairro || ''} - ${enderecoCep.localidade}/${enderecoCep.uf}`;
                            console.log('✅ [MODAL] Endereço via CEP:', enderecoTexto);
                        } else {
                            enderecoTexto = `CEP: ${cep}`;
                        }
                    } catch (cepError) {
                        console.error('❌ [MODAL] Erro CEP:', cepError);
                        enderecoTexto = `CEP: ${cep}`;
                    }
                } else {
                    enderecoTexto = 'CEP inválido';
                }
            } else if (paneleiro.endereco && paneleiro.endereco.logradouro) {
                const end = paneleiro.endereco;
                enderecoTexto = `${end.logradouro}, ${end.bairro || ''} - ${end.localidade || ''}/${end.uf || ''}`;
            } else {
                enderecoTexto = 'Localização não disponível';
            }
            console.log('📍 [MODAL] Endereço final:', enderecoTexto);
        }

        // Fallback para avaliação
        if (avaliacaoMedia === 5.0 && totalAvaliacoes === 0) {
            if (paneleiro.avaliacao) {
                avaliacaoMedia = parseFloat(paneleiro.avaliacao) || 5.0;
                totalAvaliacoes = 1;
                console.log('⭐ [MODAL] Avaliação fallback do objeto paneleiro:', avaliacaoMedia);
            } else {
                console.log('⚠️ [MODAL] Mantendo avaliação padrão (5.0)');
            }
        }

        console.log('🏁 [MODAL] Dados finais - Avaliação:', avaliacaoMedia, 'Total:', totalAvaliacoes, 'Endereço:', enderecoTexto);

        // Buscar avaliações detalhadas para a aba de avaliações
        let avaliacoesData = [];
        let userData = null; // Definir userData como null inicialmente

        try {
            if (window.rtdb && window.rtdbRef && window.rtdbGet) {
                // Primeiro buscar dados do usuário para ter as estatísticas
                const snapshotUser = await window.rtdbGet(window.rtdbRef(window.rtdb, `usuarios/${paneleiro.id}`));
                if (snapshotUser.exists()) {
                    userData = snapshotUser.val();
                    console.log('✅ Dados do usuário para avaliações:', userData);
                }

                // Depois tentar caminho alternativo para avaliações detalhadas
                const snapshotAvaliacoes = await window.rtdbGet(window.rtdbRef(window.rtdb, `avaliacoes/${paneleiro.id}`));
                if (snapshotAvaliacoes.exists()) {
                    const avaliacoesRaw = snapshotAvaliacoes.val();
                    console.log('Avaliações detalhadas encontradas em avaliacoes/', paneleiro.id, ':', avaliacoesRaw);

                    // Converter objeto em array
                    if (avaliacoesRaw && typeof avaliacoesRaw === 'object') {
                        avaliacoesData = Object.values(avaliacoesRaw).map(avaliacao => ({
                            rating: parseFloat(avaliacao.rating) || 5,
                            comment: avaliacao.comment || avaliacao.comentario || 'Sem comentário',
                            dataCriacao: avaliacao.dataCriacao || new Date().toISOString()
                        }));
                        console.log('Avaliações processadas:', avaliacoesData.length);
                    }
                } else {
                    console.log('Nenhuma avaliação detalhada encontrada, criando dados simulados baseados nas estatísticas');

                    // Criar avaliações simuladas baseadas nas estatísticas agregadas
                    const totalAvaliacoes = parseInt(userData?.totalAvaliacoes) || 0;
                    const mediaAvaliacoes = parseFloat(userData?.mediaAvaliacoes) || 5;

                    console.log('📊 Estatísticas encontradas:', { totalAvaliacoes, mediaAvaliacoes });

                    if (totalAvaliacoes > 0) {
                        // Criar até 5 avaliações simuladas
                        const numAvaliacoes = Math.min(totalAvaliacoes, 5);
                        for (let i = 0; i < numAvaliacoes; i++) {
                            avaliacoesData.push({
                                rating: Math.round(mediaAvaliacoes), // Arredondar para inteiro
                                comment: i === 0 ?
                                    `Avaliação baseada em ${totalAvaliacoes} serviço(s) realizado(s). Média: ${mediaAvaliacoes.toFixed(1)} estrelas.` :
                                    `Cliente satisfeito - ${totalAvaliacoes} avaliação(ões) total.`,
                                dataCriacao: userData?.ultimaAtualizacao || new Date().toISOString()
                            });
                        }
                        console.log('Avaliações simuladas criadas:', avaliacoesData.length);
                    } else {
                        // Se não há estatísticas, criar uma avaliação padrão
                        avaliacoesData = [{
                            rating: 5,
                            comment: 'Avaliação padrão - ainda não há avaliações registradas.',
                            dataCriacao: new Date().toISOString()
                        }];
                        console.log('Avaliação padrão criada');
                    }
                }
            }
        } catch (error) {
            console.error('Erro ao carregar avaliações detalhadas:', error);
            // Fallback: criar avaliação simulada baseada nas estatísticas
            if (userData && userData.mediaAvaliacoes) {
                avaliacoesData = [{
                    rating: Math.round(parseFloat(userData.mediaAvaliacoes) || 5),
                    comment: `Avaliação baseada nas estatísticas do usuário. Média: ${userData.mediaAvaliacoes} estrelas.`,
                    dataCriacao: userData.ultimaAtualizacao || new Date().toISOString()
                }];
            } else {
                // Último fallback
                avaliacoesData = [{
                    rating: 5,
                    comment: 'Avaliação padrão - dados indisponíveis.',
                    dataCriacao: new Date().toISOString()
                }];
            }
        }

        // Fallback para endereço antigo se disponível
        if (enderecoTexto === 'Endereço não informado' && paneleiro.endereco && paneleiro.endereco.logradouro) {
            const end = paneleiro.endereco;
            enderecoTexto = `${end.logradouro}, ${end.bairro} - ${end.localidade}/${end.uf}`;
            console.log('📍 Usando endereço fallback do paneleiro:', enderecoTexto);
        }

        // Se ainda não encontrou endereço, tentar buscar do CEP se disponível
        if (enderecoTexto === 'Endereço não informado' && paneleiro.ceps) {
            try {
                console.log('🔍 Tentando buscar endereço do CEP:', paneleiro.ceps);
                const enderecoCep = await buscarInfoCep(paneleiro.ceps.replace(/\D/g, ''));
                if (enderecoCep && enderecoCep.logradouro) {
                    enderecoTexto = `${enderecoCep.logradouro}, ${enderecoCep.bairro} - ${enderecoCep.localidade}/${enderecoCep.uf}`;
                    console.log('📍 Endereço encontrado via CEP:', enderecoTexto);
                } else {
                    console.log('⚠️ CEP não retornou endereço válido');
                }
            } catch (cepError) {
                console.error('❌ Erro ao buscar endereço via CEP:', cepError);
            }
        }

        // Tentar buscar endereço do próprio objeto paneleiro (se disponível)
        if (enderecoTexto === 'Endereço não informado' && paneleiro.endereco) {
            console.log('🔍 Verificando endereço no objeto paneleiro:', paneleiro.endereco);
            if (typeof paneleiro.endereco === 'string') {
                enderecoTexto = paneleiro.endereco;
                console.log('📍 Endereço encontrado como string:', enderecoTexto);
            } else if (paneleiro.endereco.logradouro) {
                const end = paneleiro.endereco;
                enderecoTexto = `${end.logradouro}, ${end.bairro || ''} - ${end.localidade || ''}/${end.uf || ''}`.replace(/, -/, ' -').replace(/- \//, '/').trim();
                console.log('📍 Endereço encontrado como objeto:', enderecoTexto);
            }
        }

        // Último fallback: endereço genérico
        if (enderecoTexto === 'Endereço não informado') {
            enderecoTexto = 'Localização não especificada';
            console.log('⚠️ Usando endereço genérico');
        }

        console.log('🏁 Endereço final determinado:', enderecoTexto);

        // Calcular distância se localização estiver disponível
        let distanciaTexto = '';
        if (userLocation && paneleiro.lat && paneleiro.lng) {
            const distanciaKm = calcularDistancia(userLocation.lat, userLocation.lng, paneleiro.lat, paneleiro.lng);
            distanciaTexto = formatarDistancia(distanciaKm);
        }

        // Renderizar conteúdo do modal em tela cheia
        modal.innerHTML = `
            <div style="
                background: white;
                width: 100%;
                height: 100%;
                position: relative;
                overflow-y: auto;
            ">
                <!-- Botão fechar -->
                <button style="
                    position: absolute;
                    top: 16px;
                    right: 16px;
                    background: rgba(0,0,0,0.1);
                    border: none;
                    font-size: 24px;
                    color: white;
                    cursor: pointer;
                    z-index: 10;
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                " onclick="this.closest('.modal-overlay').remove()">×</button>

                <!-- Header do perfil -->
                <div style="
                    padding: 40px 20px 20px 20px;
                    text-align: center;
                    border-bottom: 1px solid #e9ecef;
                    background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
                    color: white;
                ">
                    <img src="${paneleiro.foto || './imgs/perfil.png'}"
                         style="
                            width: 100px;
                            height: 100px;
                            border-radius: 50%;
                            object-fit: cover;
                            margin-bottom: 16px;
                            border: 4px solid white;
                            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                         " alt="${paneleiro.nome}">

                    <h2 style="
                        margin: 0 0 12px 0;
                        font-size: 24px;
                        font-weight: 700;
                    ">${paneleiro.nome || 'Paneleiro'}</h2>

                    <div style="
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        margin-bottom: 12px;
                        font-size: 18px;
                    ">
                        ${gerarEstrelasVisuais(avaliacaoMedia)}
                    </div>

                    <div style="
                        font-size: 16px;
                        margin-bottom: 8px;
                        opacity: 0.9;
                        color: white;
                    ">
                        ${totalAvaliacoes} avaliação${totalAvaliacoes !== 1 ? 'ões' : ''}
                    </div>

                    ${distanciaTexto ? `<div style="font-size: 14px; opacity: 0.8;">${distanciaTexto} de distância</div>` : ''}
                </div>

                <!-- Informações do endereço -->
                <div style="
                    padding: 20px;
                    background: #f8f9fa;
                    border-bottom: 1px solid #e9ecef;
                ">
                    <div style="
                        font-size: 16px;
                        color: #333;
                        font-weight: 500;
                        margin-bottom: 4px;
                    ">Localização</div>
                    <div style="
                        font-size: 14px;
                        color: #666;
                    ">${enderecoTexto}</div>
                </div>

                <!-- Abas -->
                <div style="
                    display: flex;
                    border-bottom: 1px solid #e9ecef;
                    background: white;
                    position: sticky;
                    top: 0;
                    z-index: 5;
                ">
                    <button id="tab-posts" class="tab-btn active" style="
                        flex: 1;
                        padding: 16px;
                        background: none;
                        border: none;
                        border-bottom: 3px solid #007bff;
                        color: #007bff;
                        font-weight: 600;
                        font-size: 16px;
                        cursor: pointer;
                    " onclick="switchTabModal('posts')">
                        Posts
                    </button>
                    <button id="tab-avaliacoes" class="tab-btn" style="
                        flex: 1;
                        padding: 16px;
                        background: none;
                        border: none;
                        border-bottom: 3px solid transparent;
                        color: #666;
                        font-weight: 600;
                        font-size: 16px;
                        cursor: pointer;
                    " onclick="switchTabModal('avaliacoes')">
                        Avaliações
                    </button>
                </div>

                <!-- Conteúdo das abas -->
                <div style="flex: 1;">
                    <!-- Aba Posts -->
                    <div id="modal-posts-content" class="modal-tab-content" style="display: block;">
                        ${renderizarPostsModal(postsData)}
                    </div>

                    <!-- Aba Avaliações -->
                    <div id="modal-avaliacoes-content" class="modal-tab-content" style="display: none;">
                        ${renderizarAvaliacoesModal(avaliacoesData)}
                    </div>
                </div>

                <!-- Botão Solicitar Serviço -->
                <div style="
                    padding: 20px;
                    border-top: 1px solid #e9ecef;
                    text-align: center;
                    background: white;
                    position: sticky;
                    bottom: 0;
                ">
                    <button style="
                        background: #007bff;
                        color: white;
                        border: none;
                        padding: 16px 32px;
                        border-radius: 12px;
                        font-size: 18px;
                        font-weight: 600;
                        cursor: pointer;
                        width: 100%;
                        max-width: 300px;
                        box-shadow: 0 4px 12px rgba(0,123,255,0.3);
                        transition: transform 0.2s;
                    " onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'" onclick="window.location.href='pedidos.html?paneleiro=${paneleiro.id}'">
                        Solicitar Serviço
                    </button>
                </div>
            </div>
        `;

    } catch (error) {
        console.error('Erro ao carregar perfil do paneleiro:', error);

        // Mostrar erro no modal
        modal.innerHTML = `
            <div style="
                background: white;
                width: 100%;
                height: 100%;
                padding: 40px 20px;
                text-align: center;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
            ">
                <button style="
                    position: absolute;
                    top: 16px;
                    right: 16px;
                    background: rgba(0,0,0,0.1);
                    border: none;
                    font-size: 24px;
                    color: #666;
                    cursor: pointer;
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                " onclick="this.closest('.modal-overlay').remove()">×</button>

                <div style="color: #dc3545; margin-bottom: 16px; font-size: 18px;">Erro ao carregar perfil</div>
                <div style="color: #666; font-size: 16px;">Tente novamente mais tarde</div>
            </div>
        `;
    }
}

// Função para carregar dados do perfil do paneleiro
async function carregarDadosPerfilPaneleiro(paneleiroId) {
    // Simular carregamento com dados mockados para teste
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simular delay

    // Dados mockados para teste
    const mockPosts = [
        {
            imagemUrl: './imgs/panela.png',
            legenda: 'Panela de pressão nova em folha! Pronta para uso.'
        },
        {
            imagemUrl: './imgs/panela1.png',
            legenda: 'Serviço de manutenção concluído com sucesso.'
        }
    ];

    const mockAvaliacoes = [
        {
            rating: 5,
            comment: 'Excelente profissional! Muito cuidadoso e eficiente.',
            dataCriacao: new Date().toISOString()
        },
        {
            rating: 4,
            comment: 'Bom trabalho, chegou no prazo.',
            dataCriacao: new Date(Date.now() - 86400000).toISOString() // 1 dia atrás
        }
    ];

    return {
        posts: mockPosts,
        avaliacoes: mockAvaliacoes,
        avaliacao: 4.5
    };
}

// Função para otimizar imagem base64 para visualização
function otimizarImagemBase64(base64String, maxWidth = 300, maxHeight = 200, qualidade = 0.8) {
    return new Promise((resolve) => {
        // Se não for base64, retornar como está
        if (!base64String || !base64String.startsWith('data:image')) {
            resolve(base64String);
            return;
        }

        const img = new Image();
        img.onload = function() {
            try {
                // Criar canvas para redimensionar
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                // Calcular novas dimensões mantendo proporção
                let { width, height } = img;

                if (width > height) {
                    if (width > maxWidth) {
                        height = (height * maxWidth) / width;
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = (width * maxHeight) / height;
                        height = maxHeight;
                    }
                }

                // Configurar canvas
                canvas.width = width;
                canvas.height = height;

                // Desenhar imagem redimensionada
                ctx.drawImage(img, 0, 0, width, height);

                // Converter para base64 otimizado
                const otimizado = canvas.toDataURL('image/jpeg', qualidade);
                resolve(otimizado);
            } catch (error) {
                console.warn('Erro ao otimizar imagem:', error);
                resolve(base64String); // Retornar original em caso de erro
            }
        };

        img.onerror = function() {
            console.warn('Erro ao carregar imagem para otimização');
            resolve(base64String);
        };

        img.src = base64String;
    });
}

// Função para renderizar posts no modal
function renderizarPostsModal(posts) {
    if (!posts || posts.length === 0) {
        return `
            <div style="
                padding: 40px 20px;
                text-align: center;
                color: #666;
            ">
                <div style="font-size: 18px; margin-bottom: 16px;">Nenhum post ainda</div>
                <div>Este paneleiro ainda não publicou nenhum post</div>
            </div>
        `;
    }

    // Criar grade 3 por linha
    const postsHtml = posts.slice(0, 9).map(post => {
        // Processar imagem corretamente
        let imageSrc = post.imagemUrl || post.imageUrl || post.ImageUrl || './imgs/perfil.png';

        // Limpar e processar base64 corretamente
        if (imageSrc && typeof imageSrc === 'string') {
            // Remover qualquer prefixo data: existente para evitar duplicação
            if (imageSrc.startsWith('data:image')) {
                // Já tem o prefixo correto, manter como está
            } else if (imageSrc.startsWith('data:') && imageSrc.includes('base64,')) {
                // Já tem algum prefixo data:, verificar se está completo
                if (!imageSrc.includes('data:image/')) {
                    // Prefixo incompleto, corrigir assumindo jpeg
                    imageSrc = imageSrc.replace(/^data:[^,]*,/, 'data:image/jpeg;base64,');
                }
            } else if (imageSrc.length > 100 && !imageSrc.startsWith('http') && !imageSrc.startsWith('data:')) {
                // Parece ser base64 puro, adicionar prefixo
                imageSrc = `data:image/jpeg;base64,${imageSrc}`;
            }
        }

        // Para imagens base64 grandes, criar uma versão otimizada
        let displaySrc = imageSrc;
        let originalSrc = imageSrc;

        console.log('Processando imagem do post:', {
            hasImage: !!imageSrc,
            isBase64: imageSrc.startsWith('data:image'),
            length: imageSrc.length,
            willOptimize: imageSrc.startsWith('data:image') && imageSrc.length > 50000
        });

        return `
            <div style="
                padding: 8px;
                box-sizing: border-box;
            ">
                <div style="
                    background: white;
                    border-radius: 8px;
                    overflow: hidden;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                    height: 100%;
                    cursor: pointer;
                " onclick="abrirImagemPost('${originalSrc.replace(/'/g, "\\'")}', '${(post.legenda || '').replace(/'/g, "\\'")}')">
                    <img src="${displaySrc}"
                         style="
                            width: 100%;
                            height: 120px;
                            object-fit: cover;
                            display: block;
                         " alt="Post"
                         onerror="this.src='./imgs/perfil.png'"
                         onload="otimizarImagemPost(this, '${originalSrc.replace(/'/g, "\\'")}')">
                    ${post.legenda ? `
                    <div style="
                        padding: 8px;
                        font-size: 12px;
                        color: #333;
                        line-height: 1.3;
                        max-height: 36px;
                        overflow: hidden;
                    ">${post.legenda}</div>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');

    return `
        <div style="
            padding: 16px;
        ">
            <div style="
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 8px;
                width: 100%;
            ">
                ${postsHtml}
            </div>
        </div>
    `;
}

// Função para otimizar imagem quando carregada
function otimizarImagemPost(imgElement, originalSrc) {
    if (!originalSrc || !originalSrc.startsWith('data:image')) {
        return; // Não é base64
    }

    // Para imagens grandes (>50KB), tentar otimizar
    if (originalSrc.length > 50000) {
        console.log('Tentando otimizar imagem:', originalSrc.length, 'caracteres');

        // Tentar otimizar a imagem para visualização
        otimizarImagemBase64(originalSrc, 300, 200, 0.7).then(otimizado => {
            if (otimizado && otimizado !== originalSrc) {
                const reducao = ((originalSrc.length - otimizado.length) / originalSrc.length * 100).toFixed(1);
                console.log(`Imagem otimizada: ${originalSrc.length} → ${otimizado.length} caracteres (${reducao}% redução)`);
                imgElement.src = otimizado;
                imgElement.setAttribute('data-otimizada', 'true');
            } else {
                console.log('Otimização não foi aplicada, mantendo original');
            }
        }).catch(error => {
            console.warn('Erro ao otimizar imagem do post:', error.message);
            // Mesmo com erro, garantir que a imagem original seja exibida
            imgElement.src = originalSrc;
        });
    } else {
        console.log('Imagem pequena, exibindo sem otimização:', originalSrc.length, 'caracteres');
        // Para imagens pequenas, garantir que sejam exibidas
        imgElement.src = originalSrc;
    }
}

// Função para abrir imagem em modal ampliado
function abrirImagemPost(imageSrc, legenda) {
    // Criar modal para imagem ampliada
    const modal = document.createElement('div');
    modal.className = 'image-modal-overlay';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0, 0, 0, 0.9);
        z-index: 10001;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
    `;

    modal.innerHTML = `
        <div style="position: relative; max-width: 90vw; max-height: 90vh;">
            <img src="${imageSrc}" style="max-width: 100%; max-height: 100%; object-fit: contain;" alt="Post ampliado">
            ${legenda ? `<div style="color: white; text-align: center; margin-top: 16px; font-size: 16px;">${legenda}</div>` : ''}
            <button style="
                position: absolute;
                top: -20px;
                right: -20px;
                background: rgba(0,0,0,0.7);
                border: none;
                color: white;
                font-size: 24px;
                width: 40px;
                height: 40px;
                border-radius: 50%;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
            " onclick="event.stopPropagation(); this.closest('.image-modal-overlay').remove()">×</button>
        </div>
    `;

    // Fechar modal ao clicar fora
    modal.addEventListener('click', () => {
        document.body.removeChild(modal);
    });

    document.body.appendChild(modal);
}

// Função para renderizar avaliações no modal
function renderizarAvaliacoesModal(avaliacoes) {
    if (!avaliacoes || avaliacoes.length === 0) {
        return `
            <div style="
                padding: 40px 20px;
                text-align: center;
                color: #666;
            ">
                <div style="font-size: 18px; margin-bottom: 16px;">Nenhuma avaliação ainda</div>
                <div>Este paneleiro ainda não recebeu avaliações</div>
            </div>
        `;
    }

    return avaliacoes.slice(0, 5).map(avaliacao => `
        <div style="
            padding: 12px;
            border-bottom: 1px solid #f0f0f0;
        ">
            <div style="
                display: flex;
                align-items: center;
                margin-bottom: 8px;
            ">
                <div style="
                    display: flex;
                    margin-right: 8px;
                ">
                    ${Array.from({length: 5}, (_, i) =>
                        `<span style="color: ${i < (avaliacao.rating || 5) ? '#ffc107' : '#ddd'};">★</span>`
                    ).join('')}
                </div>
                <div style="
                    color: #666;
                    font-size: 12px;
                ">
                    ${avaliacao.dataCriacao ?
                        new Date(avaliacao.dataCriacao).toLocaleDateString('pt-BR') :
                        'Data não informada'
                    }
                </div>
            </div>
            <div style="
                color: #333;
                font-size: 14px;
                line-height: 1.4;
            ">
                ${avaliacao.comment || avaliacao.comentario || 'Sem comentário'}
            </div>
        </div>
    `).join('');
}

// Função para alternar entre as tabs do modal
function switchTabModal(tabName) {
    console.log('🔄 Alternando para tab:', tabName);

    // Encontrar o modal atual
    const modalOverlay = document.querySelector('.modal-overlay');
    if (!modalOverlay) {
        console.error('❌ Modal overlay não encontrado');
        return;
    }

    // Encontrar as tabs
    const tabPosts = modalOverlay.querySelector('#tab-posts');
    const tabAvaliacoes = modalOverlay.querySelector('#tab-avaliacoes');

    // Encontrar os containers de conteúdo pelos IDs
    const contentPosts = modalOverlay.querySelector('#modal-posts-content');
    const contentAvaliacoes = modalOverlay.querySelector('#modal-avaliacoes-content');

    console.log('🔍 Elementos encontrados:', {
        tabPosts: !!tabPosts,
        tabAvaliacoes: !!tabAvaliacoes,
        contentPosts: !!contentPosts,
        contentAvaliacoes: !!contentAvaliacoes,
        contentPostsDisplay: contentPosts?.style.display,
        contentAvaliacoesDisplay: contentAvaliacoes?.style.display
    });

    if (tabName === 'posts') {
        console.log('📄 Mostrando aba Posts');

        // Ativar tab Posts
        if (tabPosts) {
            tabPosts.classList.add('active');
            tabPosts.style.borderBottom = '3px solid #007bff';
            tabPosts.style.color = '#007bff';
            tabPosts.style.fontWeight = '600';
        }

        // Desativar tab Avaliações
        if (tabAvaliacoes) {
            tabAvaliacoes.classList.remove('active');
            tabAvaliacoes.style.borderBottom = '3px solid transparent';
            tabAvaliacoes.style.color = '#666';
            tabAvaliacoes.style.fontWeight = 'normal';
        }

        // Mostrar conteúdo Posts, esconder Avaliações
        if (contentPosts) {
            contentPosts.style.display = 'block';
            console.log('✅ Conteúdo Posts exibido - display:', contentPosts.style.display);
        }
        if (contentAvaliacoes) {
            contentAvaliacoes.style.display = 'none';
            console.log('✅ Conteúdo Avaliações ocultado - display:', contentAvaliacoes.style.display);
        }

    } else if (tabName === 'avaliacoes') {
        console.log('⭐ Mostrando aba Avaliações');

        // Ativar tab Avaliações
        if (tabAvaliacoes) {
            tabAvaliacoes.classList.add('active');
            tabAvaliacoes.style.borderBottom = '3px solid #007bff';
            tabAvaliacoes.style.color = '#007bff';
            tabAvaliacoes.style.fontWeight = '600';
        }

        // Desativar tab Posts
        if (tabPosts) {
            tabPosts.classList.remove('active');
            tabPosts.style.borderBottom = '3px solid transparent';
            tabPosts.style.color = '#666';
            tabPosts.style.fontWeight = 'normal';
        }

        // Mostrar conteúdo Avaliações, esconder Posts
        if (contentAvaliacoes) {
            contentAvaliacoes.style.display = 'block';
            console.log('✅ Conteúdo Avaliações exibido - display:', contentAvaliacoes.style.display);
        }
        if (contentPosts) {
            contentPosts.style.display = 'none';
            console.log('✅ Conteúdo Posts ocultado - display:', contentPosts.style.display);
        }
    }

    console.log('✅ Alternância de tab concluída');
}

// Forçar renderização do calendário apenas para paneleiros
(async function() {
    async function tentarRenderizarCalendario() {
        const headerElement = document.getElementById('mes-ano');
        const tbody = document.getElementById('dias-calendario');

        if (headerElement && tbody) {
            console.log('Elementos do calendário encontrados, verificando tipo de usuário...');

            // Verificar se usuário é paneleiro antes de renderizar calendário
            const userDataRaw = localStorage.getItem("user");
            if (userDataRaw) {
                try {
                    const userData = JSON.parse(userDataRaw);
                    const userType = userData.tipoUsuario || userData.tipo;

                    if (userType === 'Paneleiro' || userType === 'paneleiro') {
                        console.log('🎯 Usuário é paneleiro, procurando mês com pedidos...');
                        const mesComPedidos = await encontrarMesComPedidos();
                        mesAtualCalendario = mesComPedidos.mes;
                        anoAtualCalendario = mesComPedidos.ano;
                        console.log(`📅 Inicializando calendário no mês: ${getNomeMes(mesAtualCalendario)} ${anoAtualCalendario}`);

                        // Renderizar calendário apenas para paneleiros
                        (async () => {
                            await renderCalendario();
                            configurarEventosCalendario();
                        })();
                    } else {
                        console.log('👤 Usuário não é paneleiro, calendário não será renderizado');
                    }
                } catch (error) {
                    console.error('Erro ao determinar tipo de usuário para calendário:', error);
                }
            } else {
                console.log('⚠️ Nenhum dado de usuário encontrado para calendário');
            }
        } else {
            console.log('Elementos do calendário ainda não disponíveis, tentando novamente...');
            setTimeout(tentarRenderizarCalendario, 100);
        }
    }

    // Iniciar tentativa de renderização
    tentarRenderizarCalendario();
})();
