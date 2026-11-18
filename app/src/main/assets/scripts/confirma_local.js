// ==========================================================
// SISTEMA DE DEBUG BÁSICO
// ==========================================================

// ==========================================================
// MAPA E GEOLOCALIZAÇÃO CORRIGIDOS
// ==========================================================

// Verificar se Leaflet está carregado
console.log("🔍 Verificando se Leaflet está carregado...");

if (typeof L !== 'undefined') {
    console.log("✅ Leaflet CARREGADO - inicializando mapa");

    // Inicializar mapa na página
    initMapAutomatico();

    function initMapAutomatico() {
        try {
            console.log("🗺️ INICIANDO CRIAÇÃO DO MAPA...");

            // Procurar pelo elemento do mapa
            const mapElement = document.getElementById('map');

            if (mapElement) {
                console.log("✅ Elemento #map encontrado");

                // Garantir que o elemento tenha as dimensões corretas
                mapElement.style.width = '88%';
                mapElement.style.height = '50vh';
                mapElement.style.position = 'absolute';
                mapElement.style.top = '25%';
                mapElement.style.left = '50%';
                mapElement.style.transform = 'translateX(-50%)';
                mapElement.style.borderRadius = '20px';
                mapElement.style.zIndex = '5';

                // Inicializar mapa imediatamente
                console.log("🚀 Inicializando mapa com São Paulo...");
                initMap(-23.55052, -46.63331); // São Paulo
                console.log("✅ Mapa inicializado");

            } else {
                console.log("❌ Elemento #map NÃO encontrado!");
                toast("Erro: Elemento do mapa não encontrado.", 'error');
            }

        } catch (error) {
            console.error("❌ ERRO CRÍTICO ao inicializar mapa:", error);
            console.trace("Stack trace do erro:");
            toast("Erro ao carregar mapa. Verifique sua conexão.", 'error');
        }
    }

    function initMap(lat, lng) {
        console.log(`📍 Inicializando mapa em: ${lat}, ${lng}`);

        try {
            if (!window.mapInstance) {
                window.mapInstance = L.map('map', {
                    zoomControl: false,
                    scrollWheelZoom: true,
                    doubleClickZoom: true,
                    boxZoom: false,
                    keyboard: false,
                    attributionControl: false
                }).setView([lat, lng], 16);

                // Tile layer minimalista
                L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png', {
                    attribution: '© OpenStreetMap contributors',
                    maxZoom: 19,
                    minZoom: 10
                }).addTo(window.mapInstance);

                console.log("✅ Mapa criado com sucesso");
            } else {
                window.mapInstance.setView([lat, lng], 16);
            }

            // Adicionar marcador
            if (window.markerInstance) {
                window.mapInstance.removeLayer(window.markerInstance);
            }

            // Ícone personalizado
            const customIcon = L.divIcon({
                className: 'custom-marker',
                html: `<div style="
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    background: #007bff;
                    border: 3px solid white;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                ">
                    <div style="
                        width: 16px;
                        height: 16px;
                        border-radius: 50%;
                        background: white;
                    "></div>
                </div>`,
                iconSize: [40, 40],
                iconAnchor: [20, 20]
            });

            window.markerInstance = L.marker([lat, lng], { icon: customIcon })
                .addTo(window.mapInstance)
                .bindPopup("Sua localização")
                .openPopup();

            console.log("✅ Marcador adicionado");

        } catch (error) {
            console.error("❌ Erro ao criar mapa:", error);
            toast("Erro ao configurar mapa.", 'error');
        }
    }

} else {
    console.log("❌ Leaflet não carregado - mapa ficará indisponível");
    toast("Biblioteca de mapa não carregada.", 'error');
}

// ==========================================================
// VARIÁVEIS GLOBAIS PARA ACESSO ENTRE FUNÇÕES
// ==========================================================
// Declarar variáveis globais para serem acessíveis em geocodeCepAvancado
window.cepInput = null;
window.loadingDiv = null;

// ==========================================================
// MÚLTIPLAS APIs BRASILEIRAS PARA CEP (GRATUITAS)
// ==========================================================

// Função aprimorada para buscar CEP usando múltiplas APIs gratuitas
async function geocodeCepAvancado(cep) {
    console.log(`🔎 Buscando CEP ${cep} com múltiplas APIs`);

    const apis = [
        {
            nome: 'ViaCEP',
            url: `https://viacep.com.br/ws/${cep}/json/`,
            dataKey: 'logradouro'
        },
        {
            nome: 'BrasilAPI',
            url: `https://brasilapi.com.br/api/cep/v1/${cep}`,
            dataKey: 'street'
        },
        {
            nome: 'Postmon',
            url: `http://api.postmon.com.br/v1/cep/${cep}`,
            dataKey: 'logradouro'
        },
        {
            nome: 'OpenCep',
            url: `https://api.opencep.com/v1/${cep}`,
            dataKey: 'rua'
        },
        {
            nome: 'BrasilAberto',
            url: `https://api.brasilaberto.com/api/${cep}`,
            dataKey: 'street'
        },
        {
            nome: 'CepAberto',
            url: `https://www.cepaberto.com/api/v3/cep?cep=${cep}`,
            dataKey: 'logradouro',
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'ConsertaJa App'
            }
        }
    ];

    for (const api of apis) {
        try {
            console.log(`📡 Tentando ${api.nome}...`);
            const headers = api.headers || {
                'Accept': 'application/json',
                'User-Agent': 'ConsertaJa App'
            };

            const response = await fetch(api.url, {
                timeout: 5000,
                headers: headers
            });

            if (!response.ok) {
                console.log(`⚠️ ${api.nome} retornou ${response.status}`);
                continue;
            }

            const data = await response.json();

            // Verificar se há erro na resposta
            if (data.erro || !data[api.dataKey]) {
                console.log(`⚠️ ${api.nome} retornou dados inválidos`);
                continue;
            }

            console.log(`✅ Sucesso com ${api.nome}`);

            // Buscar coordenadas via Nominatim
            const endereco = montarEndereco(data);
            if (endereco) {
                const coordenadas = await buscarCoordenadas(endereco);
            if (coordenadas) {
                    // PREENCHER INPUT AUTOMATICAMENTE COM O CEP FORMATADO
                    if (cepInput) {
                        cepInput.value = formatarCep(cep);
                        console.log(`✅ INPUT CEP PREENCHIDO: ${formatarCep(cep)}`);
                    }

                    toast(`CEP encontrado via ${api.nome}: ${formatarCep(cep)}`, 'success');
                    return coordenadas;
                }
            }

        } catch (error) {
            console.log(`❌ Falha em ${api.nome}:`, error.message);
            continue;
        }
    }

    return null;
}

// Função para montar endereço das diferentes APIs
function montarEndereco(data) {
    // Tentar diferentes possibilidades
    let endereco = '';

    if (data.logradouro) {
        endereco = `${data.logradouro}`;
        if (data.bairro) endereco += `, ${data.bairro}`;
        if (data.localidade) endereco += `, ${data.localidade}`;
        if (data.uf) endereco += `, ${data.uf}`;
    } else if (data.street) {
        endereco = `${data.street}`;
        if (data.neighborhood) endereco += `, ${data.neighborhood}`;
        if (data.city) endereco += `, ${data.city}`;
        if (data.state) endereco += `, ${data.state}`;
    }

    return endereco ? `${endereco}, Brasil` : null;
}

// Função para buscar coordenadas via Nominatim
async function buscarCoordenadas(endereco) {
    try {
        console.log(`📍 Buscando coordenadas para: ${endereco}`);
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&countrycodes=BR&q=${encodeURIComponent(endereco)}&limit=1`,
            {
                headers: {
                    'User-Agent': 'ConsertaJa App'
                }
            }
        );

        const data = await response.json();

        if (data && data.length > 0) {
            return {
                lat: parseFloat(data[0].lat),
                lng: parseFloat(data[0].lon),
                endereco: endereco
            };
        }

    } catch (error) {
        console.error("❌ Erro ao buscar coordenadas:", error);
    }

    return null;
}

// ==========================================================
// FUNÇÕES UTILITÁRIAS AUSENTES
// ==========================================================

// Função de validar CEP (necessária mas não estava definida)
function validarCep(cep) {
    // Remove caracteres não numéricos
    cep = cep.replace(/\D/g, '');

    // Verifica se tem exatamente 8 dígitos
    if (cep.length !== 8) {
        return false;
    }

    // Verifica se não é uma sequência de números repetidos (12345678, 99999999, etc.)
    if (/^(\d)\1{7}$/.test(cep)) {
        return false;
    }

    return true;
}

// Função de formatar CEP (necessária mas não estava definida)
function formatarCep(cep) {
    cep = cep.replace(/\D/g, '');

    // Adiciona o hífen na posição correta
    if (cep.length === 8) {
        return cep.replace(/(\d{5})(\d{3})/, '$1-$2');
    }

    return cep; // Retorna sem formatação se não tiver 8 dígitos
}

// Função para buscar CEP baseado nas coordenadas (geocodificação reversa)
async function buscarCepPorCoordenadas(lat, lng) {
    try {
        console.log(`🔍 Fazendo geocodificação reversa para: ${lat}, ${lng}`);

        // Usar Nominatim para geocodificação reversa
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&countrycodes=BR`,
            {
                headers: {
                    'User-Agent': 'ConsertaJa App'
                }
            }
        );

        const data = await response.json();

        if (data && data.address) {
            // Tentar extrair componentes do endereço brasileiro
            const address = data.address;

            // Em dados brasileiros, o postcode pode estar em address.postcode
            if (address.postcode) {
                const cep = address.postcode.replace(/\D/g, '');
                if (cep.length === 8) {
                    console.log(`✅ CEP encontrado via geocodificação reversa: ${cep}`);
                    return cep;
                }
            }

            // Fallback: tentar construir endereço e usar API de CEP
            const rua = address.road || address.pedestrian || address.footway || '';
            const bairro = address.suburb || address.neighbourhood || '';
            const cidade = address.city || address.town || address.municipality || '';
            const estado = address.state || '';

            if (rua && cidade && estado) {
                const enderecoCompleto = `${rua}, ${bairro ? bairro + ', ' : ''}${cidade}, ${estado}, Brasil`;
                console.log(`🏠 Tentando localizar CEP via endereço completo: ${enderecoCompleto}`);

                // Usar a função existente para buscar coordenadas do endereço e ver se volta relatorio
                // Na verdade, vamos tentar usar uma API de CEP baseada no endereço
                // Para simpes, vamos tentar usar ViaCEP com coordenadas
                // Como não temos uma API direta, vamos usar o endereço para georreferenciamento novamente

                // Tentar usar BrasilAPI que supostamente aceita lat/lng
                try {
                    const cepResponse = await fetch(`https://brasilapi.com.br/api/cep/v1/${lat},${lng}`, {
                        headers: {
                            'Accept': 'application/json'
                        }
                    });

                    if (cepResponse.ok) {
                        const cepData = await cepResponse.json();
                        if (cepData.code) {
                            const cep = cepData.code.replace(/\D/g, '');
                            if (cep.length === 8) {
                                console.log(`✅ CEP confirmado via BrasilAPI: ${cep}`);
                                return cep;
                            }
                        }
                    }
                } catch (apiError) {
                    console.log("⚠️ BrasilAPI não conseguiu encontrar CEP");
                }

                // Fallback final: tentativa com Postmon ou outras APIs
                // Como as APIs brasileiras dificilmente aceitam lat/lng diretamente,
                // vamos retornar null e usar GPS padrão
                console.log("⚠️ Geocodificação reversa não encontrou CEP direto");
            }
        }

        return null;
    } catch (error) {
        console.error("❌ Erro na geocodificação reversa:", error);
        return null;
    }
}

// Detecção automática de localização (necessária mas não estava definida)
async function autoGeolocate() {
    console.log("🛰️ Tentando detectar localização automática...");

    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            console.error("❌ Geolocation não é suportada neste navegador");
            toast("Geolocalização não suportada neste dispositivo.", 'error');
            reject(new Error("Geolocation not supported"));
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async position => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                console.log(`📲 Localização encontrada via GPS: ${lat}, ${lng}`);

                // Tentar buscar CEP baseado nas coordenadas
                let cepEncontrado = null;
                try {
                    console.log("🔍 Tentando encontrar CEP da localização GPS...");
                    cepEncontrado = await buscarCepPorCoordenadas(lat, lng);
                    console.log(`📍 CEP encontrado via GPS: ${cepEncontrado}`);
                } catch (cepError) {
                    console.log("⚠️ Não foi possível encontrar CEP, prosseguindo sem CEP");
                }

                // SALVAR LOCALIZAÇÃO ATUAL GLOBALMENTE
                window.currentLocation = {
                    cep: cepEncontrado,
                    endereco: cepEncontrado ? `Endereço encontrado via GPS` : `GPS Localização: ${lat}, ${lng}`,
                    lat: lat,
                    lng: lng
                };

                console.log("📍 Localização GPS armazenada globalmente:", window.currentLocation);

                // PREENCHER INPUT CEP AUTOINTECALMENTO se encontrado
                if (cepEncontrado && cepInput) {
                    cepInput.value = formatarCep(cepEncontrado);
                    console.log(`✅ INPUT CEP PREENCHIDO via GPS: ${formatarCep(cepEncontrado)}`);
                }

                // Atualizar mapa com localização encontrada
                if (window.mapInstance) {
                    initMap(lat, lng);
                    toast("Localização encontrada!", 'success');
                } else {
                    console.log("⚠️ Mapa ainda não inicializado, guardando coordenadas...");
                    // Mapa será atualizado quando inicializar
                }

                resolve({ lat, lng });
            },
            error => {
                console.error("❌ Erro na geolocalização:", error);

                // Fallback para localização padrão (São Paulo)
                console.log("🔄 Usando localização padrão (São Paulo)");
                if (window.mapInstance) {
                    initMap(-23.55052, -46.63331);
                    toast("Usando localização padrão.", 'info');
                }

                // Como a localização falhou, resolvemos com null mas sem erro
                resolve(null);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 300000 // 5 minutos
            }
        );
    });
}

// FUNÇÃO TOAST EXTREMAMENTE SIMPLIFICADA - SEM console.log PARA EVITAR RECURSÃO
function toast(message, type = 'info') {
    // REMOVIDO console.log PARA NÃO CAUSAR RECURSÃO
    // console.log(`[${type.toUpperCase()}] ${message}`);

    // NÃO USAR FUNÇÃO GLOBAL PARA EVITAR CONFLITOS
    // if (window.toast && typeof window.toast === 'function') {
    //     window.toast(message, type);
    //     return;
    // }

    try {
        let toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 16px;
            background: ${type === 'success' ? '#28a745' : '#dc3545'};
            color: white;
            border-radius: 4px;
            z-index: 9999;
            font-family: Arial, sans-serif;
            font-size: 14px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            max-width: 300px;
        `;
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => {
            if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, 3000);
    } catch (e) {
        // SILENT FAIL PARA NÃO CAUSAR MAIS ERROS
        console.error("Toast fallback failed:", e.message);
    }
}

// ==========================================================
// INICIALIZAÇÃO GERAL DO SISTEMA
// ==========================================================

// ==========================================================
// SISTEMA COMPLETO COM BOTÃO CANCELAR CADASTRO
// ==========================================================

// VARIÁVEL GLOBAL PARA ESTADO DE AUTENTICAÇÃO
window.isUserAuthenticated = false;

// ESCUTAR MUDANÇAS DE ESTADO DE AUTENTICAÇÃO
if (typeof firebase !== 'undefined') {
    firebase.auth().onAuthStateChanged(user => {
        window.isUserAuthenticated = !!(user && user.uid);
        console.log("🔐 Estado de autenticação atualizado:", window.isUserAuthenticated);
        if (user) {
            console.log("👤 Usuário autenticado:", user.uid);
        } else {
            console.log("⚠️ Usuário não autenticado");
        }
    });
}

// INICIALIZAÇÃO SIMPLES - DEIXAR FIREBASE CARREGAR NATURALMENTE
document.addEventListener('DOMContentLoaded', function() {
    console.log("🚀 Inicializando sistema de localização...");

    try {
        // Tentar detecção automática (não aguardar)
        autoGeolocate().then(() => {
            console.log("✅ Detecção automática concluída");
        }).catch(() => {
            console.log("⚠️ Detecção automática falhou - usando fallback");
        });

        configurarBotaoVoltar();
        configurarBotaoDetectarLocalizacao();
        configurarBotaoConfirmar();

        console.log("✅ Sistema de localização inicializado");

    } catch (error) {
        console.error("❌ Erro na inicialização:", error);
        // Erro crítico durante inicialização
    }
});

// ==========================================================
// BOTÃO CANCELAR CADASTRO (VOLTAR)
// ==========================================================

function configurarBotaoVoltar() {
    const btnVoltar = document.getElementById("btnVoltarLocal");
    if (!btnVoltar) {
        console.error("Botão voltar não encontrado");
        return;
    }

    btnVoltar.addEventListener('click', function() {

        // Criar modal de confirmação - CORRIGIDO PARA TELA CHEIA
        const modal = document.createElement('div');
        modal.id = 'modalConfirmacao';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0,0,0,0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            font-family: Poppins, Arial, sans-serif;
            padding: 20px;
            box-sizing: border-box;
        `;

        modal.innerHTML = `
            <div style="
                background: white;
                padding: 30px;
                border-radius: 20px;
                width: 90%;
                max-width: 400px;
                box-shadow: 0 20px 40px rgba(0,0,0,0.4);
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                min-height: 300px;
            ">
                <div style="flex: 1; display: flex; align-items: center; justify-content: center; text-align: center;">
                    <h3 style="
                        color: #333;
                        font-weight: 600;
                        font-size: 24px;
                        margin: 0;
                    ">
                        Cancelar Cadastro?
                    </h3>
                </div>

                <div style="flex: 2; display: flex; align-items: center; justify-content: center; padding: 0 20px; text-align: center;">
                    <p style="
                        color: #666;
                        font-size: 16px;
                        line-height: 1.6;
                        margin: 0;
                        word-wrap: break-word;
                    ">
                        Se você cancelar, todas as informações preenchidas serão perdidas e você precisará começar o cadastro novamente.
                    </p>
                </div>

                <div style="flex: 1; display: flex; gap: 15px; justify-content: center; align-items: center; width: 100%;">
                    <button id="btnNaoConfirmar" style="
                        flex: 1;
                        padding: 15px 20px;
                        background: #6c757d;
                        color: white;
                        border: none;
                        border-radius: 10px;
                        cursor: pointer;
                        font-weight: 500;
                        font-size: 16px;
                        min-height: 50px;
                    ">
                        Continuar Cadastro
                    </button>
                    <button id="btnConfirmarCancelar" style="
                        flex: 1;
                        padding: 15px 20px;
                        background: #dc3545;
                        color: white;
                        border: none;
                        border-radius: 10px;
                        cursor: pointer;
                        font-weight: 500;
                        font-size: 16px;
                        min-height: 50px;
                    ">
                        Sim, Cancelar
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Event listeners para os botões do modal
        document.getElementById('btnNaoConfirmar').addEventListener('click', function() {
            document.body.removeChild(modal); // Apenas fechar modal
        });

        document.getElementById('btnConfirmarCancelar').addEventListener('click', function() {
            cancelarCadastroERedirecionar();
            // Note: o modal será removido automaticamente pelo redirect
        });

        // Fechar modal ao clicar fora
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
    });
}

// Função para cancelar cadastro e redirecionar - CORRIGIDO PARA IR AO INDEX
async function cancelarCadastroERedirecionar() {
    try {
        console.log("🔄 Cancelando cadastro e redirecionando...");
        console.log("🗑️ Iniciando limpeza de dados...");

        // 1. Limpar TODOS os dados do cadastro COMPLETAMENTE
        if (typeof Storage !== "undefined") {
            sessionStorage.clear();
            localStorage.clear();
            console.log("🧹 Dados do cadastro limpos (localStorage e sessionStorage)");
        }

        // 2. Limpar dados específicos do cadastro se existirem
        try {
            // Remove dados específicos de cadastro se houver
            localStorage.removeItem('userType');
            localStorage.removeItem('userData');
            localStorage.removeItem('registrationStep');
            localStorage.removeItem('formData');
            console.log("🗑️ Dados específicos do cadastro removidos");
        } catch (e) {
            console.log("⚠️ Alguns dados específicos não puderam ser removidos");
        }

        // 3. LIMPAR FIREBASE REALTIME DATABASE (Via Android Interface para garantir funcionamento) - DEBUG MELHORADO
        try {
            console.log("🗑️ [DEBUG] Tentando limpar dados do Firebase Realtime Database via Android...");

            // Usar a interface Android para garantir que funcione no WebView
            if (window.Android && window.Android.deleteCurrentUser) {
                console.log("✅ [DEBUG] Usando interface Android para deletar usuário");
                window.Android.deleteCurrentUser();
                console.log("✅ [DEBUG] Comando de deletar enviado para Android");
            } else {
                console.log("⚠️ [DEBUG] Interface Android não disponível para deletar usuário");
                // Fallback: tentar deletar diretamente se Firebase disponível
                if (typeof firebase !== 'undefined' && firebase.auth().currentUser) {
                    console.log("🔄 [DEBUG] Tentando deletar diretamente via Firebase...");

                    const user = firebase.auth().currentUser;
                    console.log("👤 [DEBUG] Usuário atual:", user);
                    console.log("👤 [DEBUG] UID do usuário:", user ? user.uid : "NÃO ENCONTRADO");

                    if (user && user.uid) {
                        try {
                            // Remover dados do usuário do Realtime Database
                            await firebase.database().ref('users/' + user.uid).remove();
                            console.log("✅ [DEBUG] Dados de /users removidos diretamente");
                        } catch (usersError) {
                            console.log("⚠️ [DEBUG] Erro ao remover /users diretamente:", usersError);
                        }
                    }
                } else {
                    console.log("⚠️ [DEBUG] Firebase não disponível ou usuário não logado");
                }
            }

        } catch (deleteError) {
            console.error("❌ [DEBUG] Erro ao deletar usuário:", deleteError);
            console.error("❌ [DEBUG] Stack:", deleteError.stack);
            // Mesmo com erro, continuar com o redirecionamento
        }

        console.log("🎯 Todos os dados foram removidos");

        // 4. Sempre redirecionar para PRIMEIRA TELA DO LOGIN - CORRIGIDO!
        console.log("🏠 Redirecionando para primeira tela de login...");
        setTimeout(() => {
            window.location.href = 'index.html';  // PRIMEIRA TELA DE LOGIN
        }, 1000); // Delay pequeno para mostrar limpeza

    } catch (error) {
        console.error("❌ Erro crítico ao cancelar cadastro:", error);
        // Ultimate fallback: forçar navegação
        console.log("🚨 Usando fallback para redirecionamento");
        window.location.replace('index.html');
    }
}

// ==========================================================
// REMOVIDO: BUSCA DE CEP - AGORA SÓ GEOLOCALIZAÇÃO GPS
// ==========================================================

// Manter apenas função de formatação de CEP para uso futuro
function formatarCep(cep) {
    cep = cep.replace(/\D/g, '');
    if (cep.length === 8) {
        return cep.replace(/(\d{5})(\d{3})/, '$1-$2');
    }
    return cep;
}

// ==========================================================
// BOTÃO DETECTAR LOCALIZAÇÃO MANUAL
// ==========================================================

function configurarBotaoDetectarLocalizacao() {
    console.log("📍 Configurando botão detectar localização...");

    const btnDetectar = document.getElementById("detectarLocalizacaoBtn");
    if (!btnDetectar) {
        console.error("❌ Botão detectar localização não encontrado!");
        return;
    }

    btnDetectar.addEventListener('click', async function() {
        console.log("🛰️ Usuário clicou em detectar localização manual");

    // Mudar texto do botão para indicar carregamento com spinner
    const textoOriginal = btnDetectar.innerHTML;
    btnDetectar.innerHTML = `
        <span style="
            display: inline-block;
            width: 16px;
            height: 16px;
            border: 2px solid white;
            border-radius: 50%;
            border-top-color: transparent;
            animation: spin 1s linear infinite;
            margin-right: 8px;
        "></span>
        Detectando...
    `;
    btnDetectar.style.minWidth = '180px';
    btnDetectar.style.width = '180px';
    btnDetectar.disabled = true;

        try {
            toast("Detectando localização...", 'info');
            const geo = await autoGeolocate();

            if (geo) {
                console.log(`✅ Localização detectada com sucesso: ${geo.lat}, ${geo.lng}`);
                toast("Localização encontrada e mapa atualizado!", 'success');
            } else {
                console.log("⚠️ Detecção falhou, usando localização padrão");
                toast("Não foi possível detectar localização automática.", 'info');
            }

        } catch (error) {
            console.error('❌ Erro na detecção manual de localização:', error);
            toast("Erro ao detectar localização. Tente novamente.", 'error');
        } finally {
            // Sempre restaurar o botão
            btnDetectar.innerHTML = textoOriginal;
            btnDetectar.disabled = false;
        }
    });
}

// ==========================================================
// BOTÃO CONFIRMAR LOCALIZAÇÃO
// ==========================================================

function configurarBotaoConfirmar() {
    const btnConfirmar = document.getElementById("btnConfirmar");
    if (!btnConfirmar) {
        console.error("Botão confirmar não encontrado");
        return;
    }

    btnConfirmar.addEventListener('click', function() {
        // Verificar se temos localização selecionada
        if (!window.currentLocation) {
            toast("Selecione uma localização primeiro!", 'error');
            return;
        }

        // Mostrar modal de endereço em tela cheia
        mostrarModalEndereco();
    });
}

// Função para mostrar modal de endereço
function mostrarModalEndereco() {
    const modal = document.getElementById('enderecoModal');
    if (modal) {
        modal.style.display = 'flex';

        // Configurar event listeners do modal
        configurarModalEndereco();
    }
}

// Função para configurar event listeners do modal
function configurarModalEndereco() {
    // Botão fechar modal
    const btnFechar = document.getElementById('enderecoModalClose');
    if (btnFechar) {
        btnFechar.addEventListener('click', function() {
            document.getElementById('enderecoModal').style.display = 'none';
        });
    }



    // Formatação do CEP
    const cepInput = document.getElementById('cep');
    if (cepInput) {
        cepInput.addEventListener('input', function(e) {
            formatarCepInput(e.target);
        });
    }

    // Formulário de endereço
    const enderecoForm = document.getElementById('enderecoForm');
    if (enderecoForm) {
        enderecoForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            await salvarEnderecoCompleto();
        });
    }
}

// Função para formatar CEP no input
function formatarCepInput(input) {
    let value = input.value.replace(/\D/g, '');
    if (value.length <= 8) {
        if (value.length >= 6) {
            value = value.replace(/(\d{5})(\d{1,3})/, '$1-$2');
        }
        input.value = value;
    }
}

// Função para salvar endereço completo
async function salvarEnderecoCompleto() {
    console.log("🏠 Salvando endereço completo...");

    // Verificar se Firebase está carregado
    if (typeof firebase === 'undefined') {
        console.log("❌ Firebase não carregado");
        toast("Erro: Firebase não carregado. Recarregue a página.", 'error');
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
            latitude: window.currentLocation.lat,
            longitude: window.currentLocation.lng,
            enderecoCompleto: '',
            timestamp: new Date().toISOString(),
            ativo: true
        };

        console.log("� Dados coletados do formulário:", enderecoData);

        // Validar campos obrigatórios
        if (!enderecoData.logradouro || !enderecoData.numero || !enderecoData.bairro || !enderecoData.cep || !enderecoData.cidade || !enderecoData.estado) {
            console.log("❌ Campos obrigatórios faltando");
            toast("Preencha todos os campos obrigatórios!", 'error');
            return;
        }

        // Validar CEP
        const cepNumericoEndereco = enderecoData.cep.replace(/\D/g, '');
        if (cepNumericoEndereco.length !== 8) {
            console.log("❌ CEP inválido:", cepNumericoEndereco);
            toast("Digite um CEP válido!", 'error');
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

                try {
                    // Salvar dados de localização no Realtime Database
                    await firebase.database().ref('users/' + user.uid).update({
                        ceps: enderecoData.cep, // Salvar CEP no campo que o Java verifica
                        enderecoCompleto: enderecoData.enderecoCompleto,
                        enderecoSalvo: new Date().toISOString()
                    });

                    console.log("✅ Endereço salvo no Realtime Database");
                } catch (rtError) {
                    console.error("❌ Erro ao salvar no Realtime Database:", rtError);
                    toast("Erro ao salvar endereço.", 'error');
                    return;
                }
            } else {
                console.log("🚫 Nenhum método de autenticação funcionou - redirecionando para login");
                toast("Sessão expirada. Faça login novamente.", 'error');

                // Redirecionar para tela de login após 2 segundos
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 2000);

                return;
            }
        } else {
            console.log("⚠️ Firebase não disponível");
            toast("Erro: Firebase não carregado.", 'error');
            return;
        }

        // Também salvar no Firestore como backup (opcional)
        if (window.db) {
            try {
                const user = firebase.auth().currentUser;
                await window.db.collection('enderecos').doc(user.uid).set({
                    ...enderecoData,
                    userId: user.uid,
                    tipo: 'principal',
                    savedAt: new Date().toISOString()
                });
                console.log("✅ Endereço salvo no Firestore como backup");
            } catch (firestoreError) {
                console.error("❌ Erro ao salvar no Firestore:", firestoreError);
                // Não bloquear se Firestore falhar
            }
        }

        // Salvar no localStorage como backup
        localStorage.setItem('userAddress', JSON.stringify(enderecoData));
        console.log("💾 Endereço salvo no localStorage");

        // Fechar modal
        const modal = document.getElementById('enderecoModal');
        if (modal) {
            modal.style.display = 'none';
            console.log("✅ Modal fechado");
        }

        toast("Endereço salvo com sucesso!", 'success');

        // Redirecionar para próxima tela
        setTimeout(() => {
            console.log("➡️ Redirecionando para tipo_user.html");
            window.location.href = 'tipo_user.html';
        }, 1500);

    } catch (error) {
        console.error("❌ Erro ao salvar endereço:", error);
        toast("Erro ao salvar endereço. Tente novamente.", 'error');
    }
}



// ==========================================================
// MODAL EM TELA CHEIA
// ==========================================================

// ==========================================================
// SUBSTITUIR BUSCA ANTIGA PELA NOVA
// ==========================================================

//// Override da função geocodeCep para usar múltiplas APIs
//const geocodeCepOriginal = geocodeCep;
//geocodeCep = geocodeCepAvancado;
