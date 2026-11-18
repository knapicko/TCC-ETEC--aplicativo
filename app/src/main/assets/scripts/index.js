// ================= ALERTA =================
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

// ================= MODAL DE TERMOS DE USO =================
let pendingAction = null; // Armazenar ação pendente após aceitar termos

function showTermsModal(action = null) {
    const modal = document.getElementById('termsModal');
    if (modal) {
        modal.style.visibility = 'visible';
        modal.style.opacity = '1';
        document.body.style.overflow = 'hidden'; // Prevenir scroll do body
        pendingAction = action; // Armazenar ação pendente
    }
}

function closeTermsModal() {
    const modal = document.getElementById('termsModal');
    if (modal) {
        modal.style.visibility = 'hidden';
        modal.style.opacity = '0';
        document.body.style.overflow = ''; // Restaurar scroll do body
        // Limpar a ação pendente imediatamente
        pendingAction = null;
    }
}



function validateAndAcceptTerms() {
    const termsCheck = document.getElementById('termsCheck');
    const privacyCheck = document.getElementById('privacyCheck');

    if (!termsCheck.checked) {
        showAlert('Você deve aceitar os Termos de Uso para continuar.');
        return;
    }

    if (!privacyCheck.checked) {
        showAlert('Você deve aceitar a Política de Privacidade para continuar.');
        return;
    }

    // Salvar que o usuário aceitou os termos
    localStorage.setItem('termsAccepted', 'true');

    console.log('Termos aceitos, pendingAction:', pendingAction);

    // Executar ação pendente imediatamente após salvar os termos
    if (pendingAction) {
        console.log('Executando ação pendente:', pendingAction);
        if (pendingAction === 'google') {
            console.log('Tentando login com Google...');
            closeTermsModal(); // Fechar modal primeiro
            // Executar ação do Google imediatamente
            if (window.Android && window.Android.loginWithGoogle) {
                console.log('Chamando window.Android.loginWithGoogle()');
                try {
                    window.Android.loginWithGoogle();
                    console.log('Login com Google iniciado com sucesso');
                } catch (error) {
                    console.error('Erro ao chamar loginWithGoogle:', error);
                    showAlert('Erro ao iniciar login com Google');
                }
            } else {
                console.log('window.Android não disponível');
                closeTermsModal();
                showAlert("Erro: Interface Android não disponível. No app real, isso abriria a seleção de contas Google.");
            }
        } else if (pendingAction === 'createAccount') {
            console.log('Redirecionando para criar conta');
            closeTermsModal();
            window.location.href = "criar_conta.html";
        }
    } else {
        console.log('Nenhuma ação pendente');
        closeTermsModal();
    }
}

function cancelRegistration() {
    // Limpar dados do Firebase se houver
    if (window.Android && window.Android.cancelRegistration) {
        window.Android.cancelRegistration();
    }

    // Limpar dados do localStorage
    localStorage.removeItem('termsAccepted');

    // Fechar modal
    closeTermsModal();

    showAlert('Cadastro cancelado com sucesso.');
}

function acceptTerms() {
    // Função legada para compatibilidade
    validateAndAcceptTerms();
}



// Verificar se os termos foram aceitos
function checkTermsAccepted() {
    const termsAccepted = localStorage.getItem('termsAccepted');
    return termsAccepted === 'true';
}

// ================= VALIDAÇÕES =================
function validarEmail(email) {
    // Validação mais simples - apenas verifica se tem @ e .
    return email.includes('@') && email.includes('.') && email.length > 5;
}

function validarTelefone(telefone) {
    // Remove caracteres não numéricos
    const numero = telefone.replace(/\D/g, '');
    // Verifica se tem 10 ou 11 dígitos (com DDD)
    return numero.length >= 10 && numero.length <= 11;
}

function validarSenha(senha) {
    // Validação: 8-32 dígitos, pelo menos uma letra minúscula, maiúscula e um número
    if (senha.length < 8) {
        return { valido: false, mensagem: "A senha deve ter pelo menos 8 caracteres." };
    }

    if (senha.length > 32) {
        return { valido: false, mensagem: "A senha deve ter no máximo 32 caracteres." };
    }

    if (!/[A-Z]/.test(senha)) {
        return { valido: false, mensagem: "A senha deve conter pelo menos uma letra maiúscula." };
    }

    if (!/[a-z]/.test(senha)) {
        return { valido: false, mensagem: "A senha deve conter pelo menos uma letra minúscula." };
    }

    if (!/\d/.test(senha)) {
        return { valido: false, mensagem: "A senha deve conter pelo menos um número." };
    }

    return { valido: true, mensagem: "" };
}

function validarNome(nome) {
    return /^[A-Za-zÀ-ÿ\s]+$/.test(nome);
}

function isEmail(input) {
    return input.includes('@');
}

function isPhone(input) {
    return /^\d+$/.test(input.replace(/\D/g, ''));
}

// Função para aplicar máscara de telefone - FORMATO CORRIGIDO (11) 99999-9999
function aplicarMascaraTelefone(telefone) {
    const numeros = telefone.replace(/\D/g, '');
    
    // Formato brasileiro padrão: (11) 99999-9999
    if (numeros.length > 0) {
        return numeros.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
    return '';
}

// ================= EVENTOS LOGIN =================
document.addEventListener("DOMContentLoaded", () => {
    console.log("DOM carregado, configurando eventos...");

    const btnLogin = document.getElementById("btnLogin");
    const btnGoogle = document.getElementById("btnGoogle");
    const senhaLink = document.querySelector(".senha");
    const criarLink = document.querySelector(".criar");
    const emailInput = document.getElementById("emailInput");

    console.log("Elementos encontrados:", {
        btnLogin: !!btnLogin,
        btnGoogle: !!btnGoogle,
        senhaLink: !!senhaLink,
        criarLink: !!criarLink,
        windowAndroid: !!window.Android,
        emailInput: !!emailInput
    });

    // ================= MÁSCARA DE TELEFONE MELHORADA =================
    if (emailInput) {
        emailInput.addEventListener('input', (e) => {
            let valor = e.target.value;
            
            // Durante a digitação, apenas limpa caracteres inválidos
            // mas não aplica máscara
            if (valor.includes('@')) {
                // Se contém @, é email - limpa apenas caracteres inválidos
                valor = valor.replace(/[^\w@.\-_]/g, '');
                e.target.value = valor;
            }
            // Se não contém @, deixa livre para digitação
            // (não aplica máscara durante a digitação)
        });

        // Ao perder o foco, aplica a máscara se for telefone
        emailInput.addEventListener('blur', (e) => {
            let valor = e.target.value;
            const apenasNumeros = valor.replace(/\D/g, '');
            
            // Se não é email e tem exatamente 11 dígitos, aplica máscara de telefone
            if (!valor.includes('@') && apenasNumeros.length === 11) {
                e.target.value = aplicarMascaraTelefone(apenasNumeros);
            }
        });

        // Ao focar, se for telefone formatado, remove a máscara para edição
        emailInput.addEventListener('focus', (e) => {
            let valor = e.target.value;
            
            if (!valor.includes('@')) {
                // Verificar se é um número formatado (telefone)
                const apenasNumeros = valor.replace(/\D/g, '');
                if (apenasNumeros.length >= 11) {
                    e.target.value = apenasNumeros;
                }
            }
        });

        // Evento keypress para permitir @ ser digitado normalmente
        emailInput.addEventListener('keypress', (e) => {
            if (e.key === '@') {
                // Permite @ ser digitado, depois no evento input será tratado
                return true;
            }
        });
    }

    if (btnLogin) {
        console.log("Adicionando event listener ao botão login...");
        btnLogin.addEventListener("click", (e) => {
            console.log("Botão login clicado!");
            e.preventDefault();

            const input = document.getElementById("emailInput").value.trim();
            const senha = document.getElementById("senhaInput").value.trim();

            console.log("Dados coletados:", { input, senha: senha ? "***" : "" });

            if (!input) {
                console.log("Input vazio");
                showAlert("O email ou telefone é obrigatório.");
                return;
            }

            // Verifica se é email ou telefone
            if (isEmail(input)) {
                if (!validarEmail(input)) {
                    console.log("Email inválido:", input);
                    showAlert("Email inválido: " + input);
                    return;
                }
                // Para email, senha é obrigatória
                if (!senha) {
                    console.log("Senha vazia para email");
                    showAlert("A senha é obrigatória para login com email.");
                    return;
                }
                if (!validarSenha(senha).valido) {
                    console.log("Senha inválida");
                    showAlert(validarSenha(senha).mensagem);
                    return;
                }
                console.log("Tentando login com email:", input);
                if (window.Android && window.Android.loginWithEmail) {
                    window.Android.loginWithEmail(input, senha);
                } else {
                    showAlert("Erro: Interface Android não disponível.");
                }
            } else if (isPhone(input)) {
                if (!validarTelefone(input)) {
                    console.log("Telefone inválido:", input);
                    showAlert("Telefone inválido. Use o formato: (11) 99999-9999");
                    return;
                }
                // Para telefone, não precisa de senha - apenas código SMS
                console.log("Tentando login com telefone:", input);
                if (window.Android && window.Android.sendPhoneVerification) {
                    window.Android.sendPhoneVerification(input);
                } else {
                    showAlert("Erro: Interface Android não disponível.");
                }
            } else {
                showAlert("Digite um email válido ou telefone válido.");
                return;
            }
        });
        console.log("Event listener adicionado com sucesso");
    } else {
        console.error("Botão login não encontrado!");
    }

    // ================= LOGIN COM GOOGLE =================
    if (btnGoogle) {
        btnGoogle.addEventListener("click", (e) => {
            console.log("Botão Google clicado!");
            e.preventDefault();

            // Verificar se os termos foram aceitos
            if (!checkTermsAccepted()) {
                showTermsModal('google');
                return;
            }

            // Usar interface Android para login com Google
            if (window.Android && window.Android.loginWithGoogle) {
                window.Android.loginWithGoogle();
            } else {
                showAlert("Erro: Interface Android não disponível.");
            }
        });
    }



    // ================= ESQUECI MINHA SENHA =================
    if (senhaLink) {
        senhaLink.addEventListener("click", (e) => {
            e.preventDefault();
            const input = document.getElementById("emailInput").value.trim();
            
            if (!input) { 
                showAlert("Digite seu email ou telefone para recuperar a senha."); 
                return; 
            }
            
            if (isEmail(input)) {
                if (!validarEmail(input)) { 
                    showAlert("Email inválido."); 
                    return; 
                }
                
                // Envia email de recuperação
                if (window.Android && window.Android.sendPasswordResetEmail) {
                    window.Android.sendPasswordResetEmail(input);
                } else {
                    showAlert("Erro: Interface Android não disponível.");
                }
            } else if (isPhone(input)) {
                if (!validarTelefone(input)) { 
                    showAlert("Telefone inválido. Use o formato: (11) 99999-9999"); 
                    return; 
                }
                
                // Para telefone, envia SMS para permitir login
                if (window.Android && window.Android.sendPhonePasswordReset) {
                    window.Android.sendPhonePasswordReset(input);
                } else {
                    showAlert("Erro: Interface Android não disponível.");
                }
            } else {
                showAlert("Digite um email ou telefone válido.");
                return;
            }
        });
    }

    // ================= LINK CRIAR CONTA =================
    if (criarLink) {
        console.log("Adicionando event listener ao link criar conta...");
        console.log("Elemento criarLink:", criarLink);
        console.log("Texto do link:", criarLink.textContent);
        console.log("Classes do link:", criarLink.className);

        // Desabilitar menu de contexto (segurar no link)
        criarLink.addEventListener("contextmenu", (e) => {
            e.preventDefault();
            e.stopPropagation();
            return false;
        });

        // Desabilitar long press em dispositivos móveis
        criarLink.addEventListener("touchstart", (e) => {
            // Prevenir comportamento padrão se segurar por muito tempo
            let longPressTimer;
            const startTime = Date.now();

            longPressTimer = setTimeout(() => {
                e.preventDefault();
                e.stopPropagation();
            }, 500); // 500ms para considerar long press

            criarLink.addEventListener("touchend", () => {
                clearTimeout(longPressTimer);
            }, { once: true });

            criarLink.addEventListener("touchmove", () => {
                clearTimeout(longPressTimer);
            }, { once: true });
        });

        criarLink.addEventListener("click", (e) => {
            console.log("Link criar conta clicado!");
            console.log("Evento:", e);
            console.log("Target:", e.target);
            e.preventDefault();
            e.stopPropagation();

            // Verificar se os termos foram aceitos
            const termosAceitos = checkTermsAccepted();
            console.log("Termos aceitos?", termosAceitos);

            if (!termosAceitos) {
                console.log("Termos não aceitos, mostrando modal");
                showTermsModal('createAccount');
            } else {
                console.log("Termos já aceitos, redirecionando para criar conta");
                // Se já aceitou, vai direto para criar conta
                try {
                    console.log("Tentando redirecionamento para criar_conta.html");
                    window.location.href = "criar_conta.html";
                    console.log("Redirecionamento executado");
                } catch (error) {
                    console.error("Erro no redirecionamento:", error);
                    showAlert("Erro ao redirecionar para criar conta");
                }
            }
        });
        console.log("Event listener adicionado com sucesso ao link criar conta");

        // Teste adicional: verificar se o elemento é clicável
        criarLink.style.pointerEvents = 'auto';
        criarLink.style.zIndex = '1000';
    } else {
        console.error("Link criar conta não encontrado!");
    }

    // ================= FLOATING LABELS =================
    const emailLabel = document.querySelector('.input-gmail label');
    const senhaInput = document.getElementById("senhaInput");
    const senhaLabel = document.querySelector('.input-senha label');

    // Função para animar label e placeholder
    function animateLabel(input, label) {
        if (input.value || input === document.activeElement) {
            // Campo preenchido ou em foco - label para posição "encaixada"
            label.style.top = '4px';
            label.style.left = '20px';
            label.style.fontSize = '18px';
            label.style.background = 'white';
            label.style.padding = '0 8px';
            label.style.borderRadius = '4px';
            label.style.opacity = '1';

            // Esconder placeholder quando em foco
            input.placeholder = '';
        } else {
            // Campo vazio e sem foco - label para posição inicial
            label.style.top = '50%';
            label.style.left = '20px';
            label.style.transform = 'translateY(-50%)';
            label.style.fontSize = '16px';
            label.style.background = 'transparent';
            label.style.padding = '0';
            label.style.borderRadius = '0';
            label.style.opacity = '0';

            // Restaurar placeholder baseado no campo
            if (input.id === 'emailInput') {
                input.placeholder = 'Email ou telefone';
            } else if (input.id === 'senhaInput') {
                input.placeholder = 'Senha';
            }
        }
    }

    // Inicializar labels como invisíveis
    function initializeLabels() {
        if (emailLabel) {
            emailLabel.style.top = '50%';
            emailLabel.style.left = '20px';
            emailLabel.style.transform = 'translateY(-50%)';
            emailLabel.style.fontSize = '16px';
            emailLabel.style.background = 'transparent';
            emailLabel.style.padding = '0';
            emailLabel.style.borderRadius = '0';
            emailLabel.style.opacity = '0';
        }
        
        if (senhaLabel) {
            senhaLabel.style.top = '50%';
            senhaLabel.style.left = '20px';
            senhaLabel.style.transform = 'translateY(-50%)';
            senhaLabel.style.fontSize = '16px';
            senhaLabel.style.background = 'transparent';
            senhaLabel.style.padding = '0';
            senhaLabel.style.borderRadius = '0';
            senhaLabel.style.opacity = '0';
        }
    }

    // Eventos para email
    if (emailInput && emailLabel) {
        emailInput.addEventListener('focus', () => animateLabel(emailInput, emailLabel));
        emailInput.addEventListener('blur', () => animateLabel(emailInput, emailLabel));
        emailInput.addEventListener('input', () => animateLabel(emailInput, emailLabel));
    }

    // Eventos para senha
    if (senhaInput && senhaLabel) {
        senhaInput.addEventListener('focus', () => animateLabel(senhaInput, senhaLabel));
        senhaInput.addEventListener('blur', () => animateLabel(senhaInput, senhaLabel));
        senhaInput.addEventListener('input', () => animateLabel(senhaInput, senhaLabel));
    }

    // Inicializar labels quando a página carrega
    initializeLabels();

    // ================= BOTÃO TOGGLE SENHA =================
    const btnToggleSenha = document.getElementById("btnToggleSenha");
    const eyeIcon = document.getElementById("eyeIcon");

    if (btnToggleSenha && senhaInput && eyeIcon) {
        let senhaVisivel = false;

        // Garantir que a imagem inicial seja carregada
        eyeIcon.onload = function() {
            console.log("Ícone de senha carregado com sucesso na tela de login");
        };

        eyeIcon.onerror = function() {
            console.error("Erro ao carregar ícone de senha na tela de login");
            // Fallback para uma imagem padrão se houver erro
            eyeIcon.src = "./imgs/visivel.png";
        };

        // Garantir que a imagem inicial seja visivel.png
        eyeIcon.src = "./imgs/visivel.png";
        eyeIcon.alt = "Mostrar senha";

        btnToggleSenha.addEventListener("click", () => {
            senhaVisivel = !senhaVisivel;

            if (senhaVisivel) {
                senhaInput.type = "text";
                eyeIcon.src = "./imgs/invisivel.png"; // Ícone para ocultar
                eyeIcon.alt = "Ocultar senha";
            } else {
                senhaInput.type = "password";
                eyeIcon.src = "./imgs/visivel.png"; // Ícone para mostrar
                eyeIcon.alt = "Mostrar senha";
            }
        });
    }

    // ================= VERIFICAR E SOLICITAR PERMISSÕES =================
    // Aguardar um pouco para garantir que a página carregou completamente
    setTimeout(() => {
        console.log("Verificando permissões...");

        // Verificar se as permissões já foram concedidas
        if (window.Android && window.Android.checkPermissionsStatus) {
            try {
                const statusJson = window.Android.checkPermissionsStatus();
                console.log('Status das permissões:', statusJson);

                const status = JSON.parse(statusJson);
                if (status && status.allGranted) {
                    console.log('Todas as permissões já estão concedidas, continuando normalmente');
                } else {
                    console.log('Nem todas as permissões estão concedidas, redirecionando para permissions.html');
                    // Redirecionar para tela de permissões se não foram todas concedidas
                    window.location.href = "permissions.html";
                    return;
                }
            } catch (error) {
                console.log('Erro ao verificar permissões:', error);
                // Em caso de erro, assumir que permissões não foram concedidas
                window.location.href = "permissions.html";
                return;
            }
        } else {
            console.log("Interface Android não disponível para verificar permissões");
        }

        // Se chegou aqui, permissões estão OK, solicitar novamente (por garantia)
        console.log("Solicitando permissões novamente...");
        if (window.Android && window.Android.requestAllPermissions) {
            window.Android.requestAllPermissions();
        } else {
            console.log("Interface Android não disponível para permissões");
        }
    }, 500);
});

// ================= CALLBACKS DO ANDROID =================
function onSuccess(message) {
    showAlert(message || "Login realizado com sucesso!");
}

function onError(errorMessage) {
    showAlert("Erro: " + errorMessage);
}

function onPhoneCodeSent(message) {
    showAlert(message || "Código SMS enviado!");
    mostrarModalSMS();
}

function mostrarModalSMS() {
    // Remove modal existente se houver
    const existingModal = document.getElementById('smsModal');
    if (existingModal) {
        existingModal.remove();
    }

    // Cria modal para inserir código SMS
    const modal = document.createElement("div");
    modal.id = 'smsModal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0,0,0,0.7);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 99999;
        box-sizing: border-box;
    `;

    const modalContent = document.createElement("div");
    modalContent.style.cssText = `
        background: white;
        padding: 25px;
        border-radius: 20px;
        width: 90%;
        max-width: 350px;
        text-align: center;
        font-family: 'Poppins', sans-serif;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        box-sizing: border-box;
        margin: 20px;
        position: relative;
    `;

    modalContent.innerHTML = `
        <h3 style="margin: 0 0 20px 0; color: #1a73e8; font-size: 20px; font-weight: 600;">Verificação SMS</h3>

        <!-- Campo de input invisível sobreposto -->
        <input type="text" id="smsInput" inputmode="numeric" maxlength="6" style="
            position: absolute;
            top: 45px;
            left: 50%;
            transform: translateX(-50%);
            width: 280px;
            height: 40px;
            border: none;
            outline: none;
            background: transparent;
            font-size: 24px;
            text-align: center;
            font-family: 'Poppins', sans-serif;
            font-weight: 600;
            color: transparent;
            caret-color: transparent;
            z-index: 10;
        ">

        <!-- Quadradinhos visuais -->
        <div style="display: flex; gap: 8px; justify-content: center; margin-bottom: 20px; position: relative;">
            <div id="smsBox1" class="sms-box" style="
                width: 40px;
                height: 40px;
                border: 2px solid #1a73e8;
                border-radius: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 24px;
                font-family: 'Poppins', sans-serif;
                font-weight: 600;
                background: white;
                transition: border-color 0.2s;
            "></div>
            <div id="smsBox2" class="sms-box" style="
                width: 40px;
                height: 40px;
                border: 2px solid #1a73e8;
                border-radius: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 24px;
                font-family: 'Poppins', sans-serif;
                font-weight: 600;
                background: white;
                transition: border-color 0.2s;
            "></div>
            <div id="smsBox3" class="sms-box" style="
                width: 40px;
                height: 40px;
                border: 2px solid #1a73e8;
                border-radius: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 24px;
                font-family: 'Poppins', sans-serif;
                font-weight: 600;
                background: white;
                transition: border-color 0.2s;
            "></div>
            <div id="smsBox4" class="sms-box" style="
                width: 40px;
                height: 40px;
                border: 2px solid #1a73e8;
                border-radius: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 24px;
                font-family: 'Poppins', sans-serif;
                font-weight: 600;
                background: white;
                transition: border-color 0.2s;
            "></div>
            <div id="smsBox5" class="sms-box" style="
                width: 40px;
                height: 40px;
                border: 2px solid #1a73e8;
                border-radius: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 24px;
                font-family: 'Poppins', sans-serif;
                font-weight: 600;
                background: white;
                transition: border-color 0.2s;
            "></div>
            <div id="smsBox6" class="sms-box" style="
                width: 40px;
                height: 40px;
                border: 2px solid #1a73e8;
                border-radius: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 24px;
                font-family: 'Poppins', sans-serif;
                font-weight: 600;
                background: white;
                transition: border-color 0.2s;
            "></div>
        </div>

        <div style="display: flex; gap: 10px; width: 100%;">
            <button id="btnVerificarSMS" style="
                flex: 1;
                background: #1a73e8;
                color: white;
                border: none;
                padding: 14px;
                border-radius: 12px;
                font-size: 16px;
                cursor: pointer;
                font-family: 'Poppins', sans-serif;
                font-weight: 500;
                transition: background 0.2s;
            ">Verificar</button>
            <button id="btnCancelarSMS" style="
                flex: 1;
                background: #6c757d;
                color: white;
                border: none;
                padding: 14px;
                border-radius: 12px;
                font-size: 16px;
                cursor: pointer;
                font-family: 'Poppins', sans-serif;
                font-weight: 500;
                transition: background 0.2s;
            ">Cancelar</button>
        </div>
    `;

    modal.appendChild(modalContent);
    document.body.appendChild(modal);

    // Elementos do DOM
    const smsInput = document.getElementById('smsInput');
    const boxes = ['smsBox1', 'smsBox2', 'smsBox3', 'smsBox4', 'smsBox5', 'smsBox6'];

    // Função para atualizar os quadradinhos visuais
    function updateBoxes() {
        const value = smsInput.value;
        boxes.forEach((boxId, index) => {
            const box = document.getElementById(boxId);
            const digit = value[index] || '';
            box.textContent = digit;
            box.style.borderColor = digit ? '#1a73e8' : '#ccc';
        });
    }

    // Configurar input principal
    smsInput.addEventListener('input', (e) => {
        // Permitir apenas números
        e.target.value = e.target.value.replace(/[^0-9]/g, '');
        updateBoxes();
    });

    smsInput.addEventListener('keydown', (e) => {
        // Permitir todas as teclas de edição
        // Não bloquear nada - deixar o comportamento natural
    });

    smsInput.addEventListener('paste', (e) => {
        setTimeout(() => {
            smsInput.value = smsInput.value.replace(/[^0-9]/g, '');
            updateBoxes();
        }, 10);
    });

    // Event listeners do modal
    const btnVerificar = document.getElementById("btnVerificarSMS");
    const btnCancelar = document.getElementById("btnCancelarSMS");

    // Hover effects
    btnVerificar.addEventListener("mouseenter", () => {
        btnVerificar.style.background = "#0178a3";
    });
    btnVerificar.addEventListener("mouseleave", () => {
        btnVerificar.style.background = "#1a73e8";
    });

    btnCancelar.addEventListener("mouseenter", () => {
        btnCancelar.style.background = "#5a6268";
    });
    btnCancelar.addEventListener("mouseleave", () => {
        btnCancelar.style.background = "#6c757d";
    });

    btnVerificar.addEventListener("click", () => {
        const code = smsInput.value;

        if (code.length === 6) {
            if (window.Android && window.Android.verifyPhoneCode) {
                window.Android.verifyPhoneCode(code);
            }
            modal.remove();
        } else {
            showAlert("Digite o código completo de 6 dígitos.");
            smsInput.focus();
        }
    });

    btnCancelar.addEventListener("click", () => {
        modal.remove();
    });

    // Fechar modal clicando fora
    modal.addEventListener("click", (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });

    // Focar no input
    setTimeout(() => smsInput.focus(), 100);
}
