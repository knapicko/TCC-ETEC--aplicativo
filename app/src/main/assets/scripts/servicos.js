// Script para a página de serviços

// Carregar todos os serviços (diferente para paneleiros e clientes)
function carregarTodosServicos() {
    const servicosList = document.getElementById('servicosList');

    // Verificar tipo do usuário
    const userDataRaw = localStorage.getItem("user");
    let userType = 'Cliente'; // padrão

    if (userDataRaw) {
        try {
            const userData = JSON.parse(userDataRaw);
            userType = userData.tipoUsuario || userData.tipo || 'Cliente';
        } catch (error) {
            console.error('Erro ao parsear dados do usuário:', error);
        }
    }

    let servicosMock = [];

    if (userType === 'Paneleiro') {
        // Serviços que o paneleiro PRESTA (trabalhos realizados)
        servicosMock = [
            {
                id: 1,
                titulo: 'Instalação Elétrica',
                cliente: 'João Silva',
                endereco: 'Rua das Flores, 123',
                status: 'in-progress',
                data: '2023-12-15',
                horario: '14:00'
            },
            {
                id: 2,
                titulo: 'Manutenção Hidráulica',
                cliente: 'Maria Santos',
                endereco: 'Av. Brasil, 456',
                status: 'pending',
                data: '2023-12-16',
                horario: '09:00'
            },
            {
                id: 3,
                titulo: 'Reparo Geral',
                cliente: 'Pedro Oliveira',
                endereco: 'Rua Verde, 789',
                status: 'completed',
                data: '2023-12-10',
                horario: '16:30'
            },
            {
                id: 4,
                titulo: 'Instalação de Ar Condicionado',
                cliente: 'Ana Costa',
                endereco: 'Av. Central, 1000',
                status: 'pending',
                data: '2023-12-18',
                horario: '10:00'
            },
            {
                id: 5,
                titulo: 'Pintura Residencial',
                cliente: 'Carlos Mendes',
                endereco: 'Rua Azul, 250',
                status: 'in-progress',
                data: '2023-12-12',
                horario: '08:00'
            },
            {
                id: 6,
                titulo: 'Manutenção de Jardim',
                cliente: 'Fernanda Lima',
                endereco: 'Rua Verde, 150',
                status: 'completed',
                data: '2023-12-08',
                horario: '14:30'
            }
        ];
    } else {
        // Serviços que o cliente SOLICITOU (trabalhos solicitados)
        servicosMock = [
            {
                id: 1,
                titulo: 'Instalação Elétrica Residencial',
                paneleiro: 'João Silva',
                endereco: 'Minha casa - Rua das Flores, 123',
                status: 'in-progress',
                data: '2023-12-15',
                horario: '14:00',
                valor: 'R$ 250,00'
            },
            {
                id: 2,
                titulo: 'Conserto de Vazamento',
                paneleiro: 'Maria Santos',
                endereco: 'Minha casa - Av. Brasil, 456',
                status: 'pending',
                data: '2023-12-16',
                horario: '09:00',
                valor: 'R$ 180,00'
            },
            {
                id: 3,
                titulo: 'Troca de Tomadas',
                paneleiro: 'Pedro Oliveira',
                endereco: 'Minha casa - Rua Verde, 789',
                status: 'completed',
                data: '2023-12-10',
                horario: '16:30',
                valor: 'R$ 120,00'
            },
            {
                id: 4,
                titulo: 'Instalação de Ar Condicionado',
                paneleiro: 'Ana Costa',
                endereco: 'Minha casa - Av. Central, 1000',
                status: 'pending',
                data: '2023-12-18',
                horario: '10:00',
                valor: 'R$ 350,00'
            }
        ];
    }

    servicosList.innerHTML = servicosMock.map(servico => `
        <div class="service-item">
            <div class="service-info">
                <div class="service-icon">🔧</div>
                <div class="service-details">
                    <h4>${servico.titulo}</h4>
                    <p>${userType === 'Paneleiro' ? servico.cliente : servico.paneleiro} - ${servico.endereco}</p>
                    <small>${servico.data} às ${servico.horario} ${servico.valor ? '- ' + servico.valor : ''}</small>
                </div>
            </div>
            <div class="service-status ${servico.status}">
                ${servico.status === 'pending' ? 'Pendente' :
                  servico.status === 'in-progress' ? 'Em Andamento' : 'Concluído'}
            </div>
        </div>
    `).join('');
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    console.log('Página serviços carregada');

    // Carregar todos os serviços
    carregarTodosServicos();

    // Navegação da bottom nav
    const btnHome = document.getElementById('btnHome');
    if (btnHome) {
        btnHome.addEventListener('click', () => {
            window.location.href = "home.html";
        });
    }

    const btnMensagens = document.getElementById('btnMensagens');
    if (btnMensagens) {
        btnMensagens.addEventListener('click', () => {
            window.location.href = "mensagens.html";
        });
    }

    const btnPerfil = document.getElementById('btnPerfil');
    if (btnPerfil) {
        btnPerfil.addEventListener('click', () => {
            window.location.href = "perfil.html";
        });
    }
});

// Funcionalidade do botão voltar do dispositivo
// Adiciona uma entrada no histórico para interceptar o botão voltar
window.history.pushState({page: 'servicos'}, 'Serviços', window.location.href);

// Intercepta o botão voltar do dispositivo
window.addEventListener('popstate', function(event) {
    if (event.state && event.state.page === 'servicos') {
        // Impede o comportamento padrão e redireciona
        event.preventDefault();
        window.location.href = "home.html";
        return false;
    }
});

// Fallback para beforeunload
window.addEventListener('beforeunload', function(event) {
    window.location.href = "home.html";
});

// Abordagem adicional: Interceptar unload
window.addEventListener('unload', function(event) {
    window.location.href = "home.html";
});

// Verificar se estamos em WebView Android
if (window.Android && window.Android.onBackPressed) {
    window.Android.onBackPressed = function() {
        window.location.href = "home.html";
    };
}

// Timer de segurança
let backPressed = false;
document.addEventListener('visibilitychange', function() {
    if (document.hidden && !backPressed) {
        backPressed = true;
        setTimeout(() => {
            if (backPressed) {
                window.location.href = "home.html";
            }
        }, 500);
    }
});
