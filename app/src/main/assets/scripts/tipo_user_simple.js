// toast simples
function toast(msg, type = 'error'){
    const d = document.createElement("div");
    d.textContent = msg;
    const bgColor = type === 'success' ? '#4caf50' : type === 'info' ? '#2196f3' : '#f44336';
    Object.assign(d.style,{
        position:"fixed",left:"50%",top:"12px",transform:"translateX(-50%)",
        background: bgColor, color:"#fff", padding:"10px 14px", borderRadius:"12px",
        zIndex:9999, boxShadow:"0 8px 22px rgba(0,0,0,.25)", fontSize:"13px",
        fontFamily: "Poppins, sans-serif"
    });
    document.body.appendChild(d);
    setTimeout(()=>d.remove(),3000);
}

console.log("Página tipo_user carregada");

// Botão voltar no topo
document.getElementById("btnVoltarTipo").addEventListener("click", function() {
    window.location.href = "confirma_local.html";
});

// Sistema de seleção de tipo de usuário
let tipoSelecionado = null;

const optionItems = document.querySelectorAll(".option-item");
const btnConfirmar = document.getElementById("btnConfirmarTipo");

console.log("Elementos de opção encontrados:", optionItems.length);

optionItems.forEach((item) => {
    item.addEventListener("click", () => {
        // Remove seleção anterior
        optionItems.forEach(el => el.classList.remove("selected"));

        // Adiciona seleção atual
        item.classList.add("selected");

        // Armazena tipo selecionado
        tipoSelecionado = item.dataset.type;
        console.log("Tipo selecionado:", tipoSelecionado);

        // Habilita botão confirmar
        btnConfirmar.disabled = false;
        btnConfirmar.style.backgroundColor = "#FFF";
        btnConfirmar.style.color = "#01588E";
    });
});

// Botão confirmar
btnConfirmar.addEventListener("click", () => {
    if (tipoSelecionado) {
        console.log("Confirmando tipo:", tipoSelecionado);

        // Se o usuário selecionou "Paneleiro", inicializar avaliação
        if (tipoSelecionado === "Paneleiro") {
            inicializarAvaliacaoPaneleiro();
        }

        // Usar interface Android em vez do Firebase web
        if (window.Android && window.Android.updateUserTipo) {
            console.log("Chamando updateUserTipo...");
            window.Android.updateUserTipo(tipoSelecionado);
        } else {
            console.log("Interface Android não disponível");
            toast("Erro: Interface Android não disponível.");
        }
    }
});

// ================= CALLBACKS DO ANDROID =================
function onSuccess(message) {
    console.log("onSuccess chamado (tipo_user):", message);
    toast(message || "Tipo de usuário atualizado com sucesso!", 'success');

    // Aguardar um pouco mais para garantir que o localStorage foi atualizado
    setTimeout(() => {
        console.log("Verificando localStorage antes de redirecionar para home...");
        const userData = localStorage.getItem("user");
        console.log("localStorage antes do redirecionamento:", userData);

        if (userData) {
            try {
                const parsed = JSON.parse(userData);
                console.log("Dados parseados antes do redirecionamento:", parsed);
                console.log("Redirecionando para home.html...");
                window.location.href = "home.html";
            } catch (e) {
                console.error("Erro ao parsear localStorage antes do redirecionamento:", e);
                toast("Erro nos dados do usuário. Tente novamente.", 'error');
            }
        } else {
            console.error("localStorage vazio antes do redirecionamento!");
            toast("Erro: Dados do usuário não foram salvos. Tente novamente.", 'error');
        }
    }, 1500); // Aumentei o delay para 1.5 segundos
}

function onError(errorMessage) {
    console.log("Erro:", errorMessage);
    toast("Erro: " + errorMessage, 'error');
}

// Aguarda um pouco para garantir que a página carregou
setTimeout(() => {
    console.log("Página tipo_user pronta para uso");
}, 100);

// ================= FUNCIONALIDADE BOTÃO VOLTAR DO DISPOSITIVO =================
// Adiciona uma entrada no histórico para interceptar o botão voltar
window.history.pushState({page: 'tipo_user'}, 'Tipo Usuário', window.location.href);

// Intercepta o botão voltar do dispositivo
window.addEventListener('popstate', function(event) {
    if (event.state && event.state.page === 'tipo_user') {
        // Impede o comportamento padrão e redireciona
        event.preventDefault();
        window.location.href = "confirma_local.html";
        return false;
    }
});

// Fallback para beforeunload
window.addEventListener('beforeunload', function(event) {
    window.location.href = "confirma_local.html";
});

// Abordagem adicional: Interceptar unload
window.addEventListener('unload', function(event) {
    window.location.href = "confirma_local.html";
});

// Verificar se estamos em WebView Android
if (window.Android && window.Android.onBackPressed) {
    window.Android.onBackPressed = function() {
        window.location.href = "confirma_local.html";
    };
}

// Função para inicializar avaliação do paneleiro
function inicializarAvaliacaoPaneleiro() {
    try {
        console.log("Inicializando avaliação para novo paneleiro...");

        // Obter dados do usuário atual
        const userData = localStorage.getItem('user');
        if (!userData) {
            console.warn("Dados do usuário não encontrados no localStorage");
            return;
        }

        const user = JSON.parse(userData);
        const paneleiroId = user.id;

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
                avaliacao: 4.5, // Avaliação padrão para novos paneleiros
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
                    media: 4.5, // Avaliação padrão
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

// Timer de segurança
let backPressedTipo = false;
document.addEventListener('visibilitychange', function() {
    if (document.hidden && !backPressedTipo) {
        backPressedTipo = true;
        setTimeout(() => {
            if (backPressedTipo) {
                window.location.href = "confirma_local.html";
            }
        }, 500);
    }
});
