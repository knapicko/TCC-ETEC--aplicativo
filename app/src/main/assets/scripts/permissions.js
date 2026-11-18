// permissions.js - Gerenciamento da tela de permissões

document.addEventListener('DOMContentLoaded', function() {
    console.log('Página de permissões carregada');

    // Elementos DOM
    const requestBtn = document.getElementById('request-permissions-btn');
    const nextBtn = document.getElementById('next-btn');
    const skipBtn = document.getElementById('skip-btn');
    const locationStatus = document.getElementById('location-status');
    const microphoneStatus = document.getElementById('microphone-status');
    const mediaStatus = document.getElementById('media-status');

    // Verificar status inicial das permissões
    checkPermissionsStatus();

    // Event listeners
    requestBtn.addEventListener('click', requestPermissions);
    nextBtn.addEventListener('click', redirectToIndex);
    skipBtn.addEventListener('click', skipPermissions);

    // Funções globais para callbacks do Android
    window.onSuccess = function(message) {
        console.log('Permissão concedida:', message);
        showToast(message, 'success');

        // Atualizar status baseado na mensagem
        if (message.includes('localização')) {
            updatePermissionStatus('location-status', 'granted');
        } else if (message.includes('microfone')) {
            updatePermissionStatus('microphone-status', 'granted');
        } else if (message.includes('mídia')) {
            updatePermissionStatus('media-status', 'granted');
        }
    };

    window.onError = function(message) {
        console.log('Erro na permissão:', message);
        showToast(message, 'error');

        // Atualizar status baseado na mensagem
        if (message.includes('localização')) {
            updatePermissionStatus('location-status', 'denied');
        } else if (message.includes('microfone')) {
            updatePermissionStatus('microphone-status', 'denied');
        } else if (message.includes('mídia')) {
            updatePermissionStatus('media-status', 'denied');
        }
    };

    // Verificar status das permissões
    function checkPermissionsStatus() {
        // Como estamos em uma WebView, não podemos verificar permissões diretamente
        // O status será atualizado pelos callbacks do Android
        console.log('Verificando status das permissões...');
    }

    // Atualizar status visual de uma permissão
    function updatePermissionStatus(elementId, status) {
        const element = document.getElementById(elementId);
        if (element) {
            element.className = `permission-status ${status}`;
            element.textContent = status === 'granted' ? 'Concedida' : status === 'denied' ? 'Negada' : 'Pendente';
        }
    }

    // Solicitar permissões
    function requestPermissions() {
        console.log('Solicitando permissões...');

        // Mostrar loading no botão
        requestBtn.classList.add('loading');
        requestBtn.disabled = true;
        requestBtn.textContent = 'Solicitando...';

        try {
            // Chamar método do Android para solicitar permissões
            if (window.Android && window.Android.requestAllPermissions) {
                window.Android.requestAllPermissions();
            } else {
                console.warn('Interface Android não disponível');
                // Simular resposta para desenvolvimento
                setTimeout(() => {
                    onSuccess('Permissões solicitadas com sucesso!');
                    requestBtn.classList.remove('loading');
                    requestBtn.disabled = false;
                    requestBtn.textContent = 'Conceder Permissões';
                }, 2000);
            }
        } catch (error) {
            console.error('Erro ao solicitar permissões:', error);
            showToast('Erro ao solicitar permissões', 'error');
            requestBtn.classList.remove('loading');
            requestBtn.disabled = false;
            requestBtn.textContent = 'Conceder Permissões';
        }
    }

    // Pular permissões
    function skipPermissions() {
        console.log('Pulando permissões...');

        // Salvar no SharedPreferences do Android
        if (window.Android && window.Android.setPermissionsSkipped) {
            window.Android.setPermissionsSkipped();
        }

        // Salvar no localStorage também (para compatibilidade)
        localStorage.setItem('permissionsSkipped', 'true');
        localStorage.setItem('permissionsRequested', new Date().toISOString());

        // Redirecionar para index.html
        redirectToIndex();
    }

    // Redirecionar para index.html
    function redirectToIndex() {
        console.log('Redirecionando para index.html...');

        // Pequeno delay para feedback visual
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 500);
    }

    // Mostrar toast de notificação
    function showToast(message, type = 'info') {
        // Remover toast existente
        const existingToast = document.querySelector('.toast');
        if (existingToast) {
            existingToast.remove();
        }

        // Criar novo toast
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <span class="toast-icon">${getToastIcon(type)}</span>
                <span class="toast-message">${message}</span>
            </div>
        `;

        document.body.appendChild(toast);

        // Mostrar toast
        setTimeout(() => toast.classList.add('show'), 100);

        // Esconder toast após 3 segundos
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // Obter ícone para toast
    function getToastIcon(type) {
        switch (type) {
            case 'success': return '✅';
            case 'error': return '❌';
            case 'warning': return '⚠️';
            default: return 'ℹ️';
        }
    }

    // Verificar se devemos pular automaticamente (usuário já concedeu permissões)
    function shouldSkipPermissions() {
        const granted = localStorage.getItem('permissionsGranted');
        const skipped = localStorage.getItem('permissionsSkipped');

        // Se já concedeu permissões ou pulou, não mostrar novamente
        if (granted === 'true' || skipped === 'true') {
            return true;
        }

        return false;
    }

    // Verificar se devemos redirecionar automaticamente
    if (shouldSkipPermissions()) {
        console.log('Usuário já concedeu permissões ou pulou, redirecionando...');
        redirectToIndex();
        return; // Parar execução do script
    }
});

// Funções de callback para o Android (devem estar no escopo global)
function onPermissionsGranted() {
    console.log('Todas as permissões foram concedidas!');
    document.getElementById('location-status').className = 'permission-status granted';
    document.getElementById('location-status').textContent = 'Concedida';
    document.getElementById('microphone-status').className = 'permission-status granted';
    document.getElementById('microphone-status').textContent = 'Concedida';
    document.getElementById('media-status').className = 'permission-status granted';
    document.getElementById('media-status').textContent = 'Concedida';

    // Salvar no SharedPreferences do Android
    if (window.Android && window.Android.setPermissionsGranted) {
        window.Android.setPermissionsGranted();
    }

    // Salvar no localStorage também (para compatibilidade)
    localStorage.setItem('permissionsGranted', 'true');
    localStorage.setItem('permissionsRequested', new Date().toISOString());

    // Trocar botões: esconder "Conceder Permissões" e mostrar "Próximo"
    document.getElementById('request-permissions-btn').style.display = 'none';
    document.getElementById('next-btn').style.display = 'block';

    // Mostrar toast de sucesso
    showToast('Todas as permissões foram concedidas!', 'success');
}

function onPermissionsPartiallyGranted(grantedPermissions) {
    console.log('Permissões parcialmente concedidas:', grantedPermissions);

    // Atualizar status baseado nas permissões concedidas
    if (grantedPermissions.includes('location')) {
        document.getElementById('location-status').className = 'permission-status granted';
        document.getElementById('location-status').textContent = 'Concedida';
    }

    if (grantedPermissions.includes('microphone')) {
        document.getElementById('microphone-status').className = 'permission-status granted';
        document.getElementById('microphone-status').textContent = 'Concedida';
    }

    if (grantedPermissions.includes('media')) {
        document.getElementById('media-status').className = 'permission-status granted';
        document.getElementById('media-status').textContent = 'Concedida';
    }

    // Salvar status parcial
    localStorage.setItem('permissionsPartiallyGranted', JSON.stringify(grantedPermissions));
    localStorage.setItem('permissionsRequested', new Date().toISOString());
}

function onPermissionsDenied() {
    console.log('Permissões negadas!');
    document.getElementById('location-status').className = 'permission-status denied';
    document.getElementById('location-status').textContent = 'Negada';
    document.getElementById('microphone-status').className = 'permission-status denied';
    document.getElementById('microphone-status').textContent = 'Negada';
    document.getElementById('media-status').className = 'permission-status denied';
    document.getElementById('media-status').textContent = 'Negada';

    // Salvar que as permissões foram negadas
    localStorage.setItem('permissionsDenied', 'true');
    localStorage.setItem('permissionsRequested', new Date().toISOString());
}

// CSS para toasts (adicionado dinamicamente)
const toastStyles = `
.toast {
    position: fixed;
    top: 20px;
    right: 20px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.15);
    padding: 16px 20px;
    z-index: 10000;
    transform: translateX(400px);
    transition: transform 0.3s ease;
    max-width: 300px;
}

.toast.show {
    transform: translateX(0);
}

.toast-content {
    display: flex;
    align-items: center;
    gap: 12px;
}

.toast-icon {
    font-size: 1.2rem;
    flex-shrink: 0;
}

.toast-message {
    font-size: 0.9rem;
    line-height: 1.4;
    color: #333;
}

.toast-success .toast-content {
    color: #28a745;
}

.toast-error .toast-content {
    color: #dc3545;
}

.toast-warning .toast-content {
    color: #ffc107;
}

.toast-info .toast-content {
    color: #007bff;
}

@media (max-width: 480px) {
    .toast {
        left: 20px;
        right: 20px;
        max-width: none;
    }
}
`;

// Verificar se todas as permissões já foram concedidas automaticamente
function checkIfAllPermissionsGranted() {
    console.log('Verificando se todas as permissões já foram concedidas...');

    // Pequeno delay para garantir que a interface esteja pronta
    setTimeout(() => {
        // Verificar se já temos registro de permissões concedidas
        const permissionsGranted = localStorage.getItem('permissionsGranted');

        if (permissionsGranted === 'true') {
            console.log('Permissões já foram concedidas anteriormente, mostrando botão Próximo...');

            // Atualizar status visual
            updatePermissionStatus('location-status', 'granted');
            updatePermissionStatus('microphone-status', 'granted');
            updatePermissionStatus('media-status', 'granted');

            // Trocar botões: esconder "Conceder Permissões" e mostrar "Próximo"
            document.getElementById('request-permissions-btn').style.display = 'none';
            document.getElementById('next-btn').style.display = 'block';

            return;
        }

        // Se não temos registro, tentar verificar via Android
        if (window.Android && window.Android.checkPermissionsStatus) {
            try {
                // Chamar método do Android para verificar status das permissões
                const statusJson = window.Android.checkPermissionsStatus();
                console.log('Status das permissões do Android:', statusJson);

                // Parse do JSON retornado
                const status = JSON.parse(statusJson);
                if (status && status.allGranted) {
                    console.log('Todas as permissões já estão concedidas no sistema, mostrando botão Próximo...');

                    // Atualizar status visual
                    updatePermissionStatus('location-status', 'granted');
                    updatePermissionStatus('microphone-status', 'granted');
                    updatePermissionStatus('media-status', 'granted');

                    // Salvar estado
                    localStorage.setItem('permissionsGranted', 'true');
                    localStorage.setItem('permissionsRequested', new Date().toISOString());

                    if (window.Android && window.Android.setPermissionsGranted) {
                        window.Android.setPermissionsGranted();
                    }

                    // Trocar botões
                    document.getElementById('request-permissions-btn').style.display = 'none';
                    document.getElementById('next-btn').style.display = 'block';
                } else {
                    console.log('Nem todas as permissões estão concedidas:', status);
                }
            } catch (error) {
                console.log('Erro ao verificar permissões via Android:', error);
            }
        }
    }, 500); // Delay de 500ms para garantir que tudo esteja carregado
}

// Adicionar estilos dos toasts ao documento
const styleSheet = document.createElement('style');
styleSheet.textContent = toastStyles;
document.head.appendChild(styleSheet);
