// Pesquisa JavaScript

// Variáveis globais
let allPaneleiros = [];
let userLocation = null;
let currentQuery = '';
let currentSortBy = 'distance';
let currentMinRating = 0;

// Função para voltar à página anterior
function goBack() {
    window.history.back();
}

// Função para carregar paneleiros
async function carregarPaneleiros() {
    try {
        // Verificar tipo do usuário
        const userDataRaw = localStorage.getItem("user");
        if (!userDataRaw) {
            console.log("Nenhum dado de usuário encontrado");
            return;
        }

        const userData = JSON.parse(userDataRaw);
        const userType = userData.tipoUsuario || userData.tipo;

        // Só mostrar paneleiros para cliente e food-service
        if (userType !== 'Cliente' && userType !== 'Food Service') {
            console.log("Usuário não é cliente ou food service");
            return;
        }

        // Buscar paneleiros via interface Android
        if (window.Android && window.Android.getPaneleiros) {
            try {
                const paneleirosData = await window.Android.getPaneleiros();
                const paneleirosRaw = JSON.parse(paneleirosData || '[]');

                // Processar paneleiros com coordenadas
                for (const paneleiro of paneleirosRaw) {
                    if (paneleiro.ceps || paneleiro.cep) {
                        const cep = (paneleiro.ceps || paneleiro.cep).replace(/\D/g, '');
                        if (cep.length === 8) {
                            try {
                                const endereco = await buscarInfoCep(cep);
                                if (endereco) {
                                    const coordenadas = await buscarCoordenadas(endereco);
                                    if (coordenadas) {
                                        allPaneleiros.push({
                                            nome: paneleiro.nome,
                                            foto: paneleiro.fotoUrl,
                                            avaliacao: parseFloat(paneleiro.avaliacao || "5.0"),
                                            lat: coordenadas.lat,
                                            lng: coordenadas.lng,
                                            endereco: endereco
                                        });
                                    }
                                }
                            } catch (cepError) {
                                console.error(`Erro ao buscar coordenadas para ${paneleiro.nome}:`, cepError);
                            }
                        }
                    }
                }
            } catch (error) {
                console.error("Erro ao buscar paneleiros:", error);
                // Fallback para paneleiros mockados
                allPaneleiros = [
                    { nome: "João Silva", foto: "./imgs/perfil.png", avaliacao: 4.8, lat: -23.5505, lng: -46.6333 },
                    { nome: "Maria Santos", foto: "./imgs/perfil.png", avaliacao: 4.9, lat: -23.5510, lng: -46.6340 },
                    { nome: "Carlos Oliveira", foto: "./imgs/perfil.png", avaliacao: 4.2, lat: -23.5520, lng: -46.6350 },
                    { nome: "Ana Pereira", foto: "./imgs/perfil.png", avaliacao: 4.7, lat: -23.5530, lng: -46.6360 }
                ];
            }
        } else {
            // Fallback para paneleiros mockados
            allPaneleiros = [
                { nome: "João Silva", foto: "./imgs/perfil.png", avaliacao: 4.8, lat: -23.5505, lng: -46.6333 },
                { nome: "Maria Santos", foto: "./imgs/perfil.png", avaliacao: 4.9, lat: -23.5510, lng: -46.6340 },
                { nome: "Carlos Oliveira", foto: "./imgs/perfil.png", avaliacao: 4.2, lat: -23.5520, lng: -46.6350 },
                { nome: "Ana Pereira", foto: "./imgs/perfil.png", avaliacao: 4.7, lat: -23.5530, lng: -46.6360 }
            ];
        }

        // Obter localização do usuário
        await obterLocalizacaoUsuario();

        console.log("Paneleiros carregados:", allPaneleiros);
    } catch (error) {
        console.error("Erro ao carregar paneleiros:", error);
    }
}

// Função para obter localização do usuário
async function obterLocalizacaoUsuario() {
    try {
        const userDataRaw = localStorage.getItem("user");
        if (userDataRaw) {
            const userData = JSON.parse(userDataRaw);
            if (userData.ceps) {
                const endereco = await buscarInfoCep(userData.ceps.replace(/\D/g, ''));
                if (endereco) {
                    const coordenadas = await buscarCoordenadas(endereco);
                    if (coordenadas) {
                        userLocation = { lat: coordenadas.lat, lng: coordenadas.lng };
                    }
                }
            }
        }
    } catch (error) {
        console.error("Erro ao obter localização do usuário:", error);
    }
}

// Função para buscar informações do CEP
async function buscarInfoCep(cep) {
    try {
        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await response.json();
        if (data.erro) throw new Error('CEP não encontrado');
        return data;
    } catch (error) {
        console.error('Erro ao buscar CEP:', error);
        return null;
    }
}

// Função para buscar coordenadas
async function buscarCoordenadas(endereco) {
    try {
        const query = `${endereco.logradouro}, ${endereco.bairro}, ${endereco.localidade}, ${endereco.uf}, Brasil`;
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&countrycodes=BR&q=${encodeURIComponent(query)}`);
        const data = await response.json();
        if (data && data.length > 0) {
            return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
        }
        return null;
    } catch (error) {
        console.error('Erro ao buscar coordenadas:', error);
        return null;
    }
}

// Função para calcular distância
function calcularDistancia(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// Função para formatar distância
function formatarDistancia(distanciaKm) {
    if (distanciaKm < 1) {
        return `${Math.round(distanciaKm * 1000)}m`;
    } else {
        return `${distanciaKm.toFixed(1)}km`;
    }
}

// Função para executar busca
function executarBusca() {
    const query = document.getElementById('searchInput').value.trim();
    currentQuery = query;

    let resultados = allPaneleiros.filter(paneleiro => {
        // Filtro por nome
        const nomeMatch = !query || paneleiro.nome.toLowerCase().includes(query.toLowerCase());

        // Filtro por avaliação
        const ratingMatch = paneleiro.avaliacao >= currentMinRating;

        return nomeMatch && ratingMatch;
    });

    // Aplicar ordenação
    switch (currentSortBy) {
        case 'distance':
            if (userLocation) {
                resultados.sort((a, b) => {
                    const distA = calcularDistancia(userLocation.lat, userLocation.lng, a.lat, a.lng);
                    const distB = calcularDistancia(userLocation.lat, userLocation.lng, b.lat, b.lng);
                    return distA - distB;
                });
            }
            break;
        case 'name-asc':
            resultados.sort((a, b) => a.nome.localeCompare(b.nome));
            break;
        case 'name-desc':
            resultados.sort((a, b) => b.nome.localeCompare(a.nome));
            break;
        case 'rating':
            resultados.sort((a, b) => b.avaliacao - a.avaliacao);
            break;
    }

    renderizarResultados(resultados);
}

// Função para renderizar resultados
function renderizarResultados(resultados) {
    const resultsList = document.getElementById('resultsList');
    const noResults = document.getElementById('noResults');

    if (resultados.length === 0) {
        resultsList.innerHTML = '';
        noResults.style.display = 'flex';
        return;
    }

    noResults.style.display = 'none';

    resultsList.innerHTML = resultados.map(paneleiro => {
        const distancia = userLocation ?
            calcularDistancia(userLocation.lat, userLocation.lng, paneleiro.lat, paneleiro.lng) : 0;

        return `
            <div class="result-item" data-lat="${paneleiro.lat}" data-lng="${paneleiro.lng}">
                <div class="result-avatar">
                    <img src="${paneleiro.foto || './imgs/perfil.png'}" alt="${paneleiro.nome}">
                </div>
                <div class="result-info">
                    <div class="result-name">${paneleiro.nome}</div>
                    <div class="result-details">
                        <span class="result-rating">${paneleiro.avaliacao}</span>
                        ${userLocation ? `<span>• ${formatarDistancia(distancia)}</span>` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // Adicionar event listeners
    resultsList.querySelectorAll('.result-item').forEach(item => {
        item.addEventListener('click', () => {
            const lat = parseFloat(item.dataset.lat);
            const lng = parseFloat(item.dataset.lng);

            // Salvar coordenadas na sessionStorage para voltar ao mapa focado
            sessionStorage.setItem('focusLat', lat);
            sessionStorage.setItem('focusLng', lng);

            // Voltar para home
            window.location.href = 'home.html';
        });
    });
}

// Função para configurar navegação
function setupNavigation() {
    const btnPedidos = document.getElementById('btnPedidos');
    const btnHome = document.getElementById('btnHome');
    const btnMensagens = document.getElementById('btnMensagens');

    if (btnPedidos) {
        btnPedidos.addEventListener('click', () => {
            window.location.href = 'servicos.html';
        });
    }

    if (btnHome) {
        btnHome.addEventListener('click', () => {
            window.location.href = 'home.html';
        });
    }

    if (btnMensagens) {
        btnMensagens.addEventListener('click', () => {
            window.location.href = 'mensagens.html';
        });
    }
}

// Inicialização da página
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Página de pesquisa carregada');

    // Carregar paneleiros
    await carregarPaneleiros();

    // Configurar filtros
    const sortBySelect = document.getElementById('sortBy');
    const minRatingSelect = document.getElementById('minRating');
    const searchInput = document.getElementById('searchInput');

    // Carregar query da sessionStorage se existir
    const savedQuery = sessionStorage.getItem('searchQuery');
    if (savedQuery) {
        searchInput.value = savedQuery;
        currentQuery = savedQuery;
        sessionStorage.removeItem('searchQuery'); // Limpar após usar
    }

    // Event listeners
    if (sortBySelect) {
        sortBySelect.addEventListener('change', (e) => {
            currentSortBy = e.target.value;
            executarBusca();
        });
    }

    if (minRatingSelect) {
        minRatingSelect.addEventListener('change', (e) => {
            currentMinRating = parseFloat(e.target.value);
            executarBusca();
        });
    }

    if (searchInput) {
        searchInput.addEventListener('input', () => {
            executarBusca();
        });
    }

    // Busca inicial
    executarBusca();

    // Configurar navegação
    setupNavigation();

    // Configurar botão voltar do dispositivo
    setupBackButton();
});

// Função para configurar o botão voltar do dispositivo
function setupBackButton() {
    // Adiciona uma entrada no histórico para interceptar o botão voltar
    window.history.pushState({page: 'pesquisa'}, 'Pesquisa', window.location.href);

    // Intercepta o botão voltar do dispositivo
    window.addEventListener('popstate', function(event) {
        if (event.state && event.state.page === 'pesquisa') {
            // Voltar para a página home
            event.preventDefault();
            window.location.href = 'home.html';
            return false;
        }
    });

    // Fallback para beforeunload
    window.addEventListener('beforeunload', function(event) {
        console.log('Botão voltar pressionado na página pesquisa - voltando para home');
    });

    // Verificar se estamos em WebView Android
    if (window.Android && window.Android.onBackPressed) {
        window.Android.onBackPressed = function() {
            console.log('Botão voltar pressionado na página pesquisa - voltando para home');
            window.location.href = 'home.html';
        };
    }
}
