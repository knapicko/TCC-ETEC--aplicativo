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
function showTermsModal() {
    const modal = document.getElementById('termsModal');
    if (modal) {
        modal.classList.add('show');
    }
}

function closeTermsModal() {
    const modal = document.getElementById('termsModal');
    if (modal) {
        modal.classList.remove('show');
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
    closeTermsModal();
    // Não redireciona automaticamente, apenas fecha o modal e permite continuar com o cadastro
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

// Função para aplicar máscara de telefone
function aplicarMascaraTelefone(telefone) {
    const numeros = telefone.replace(/\D/g, '');

    if (numeros.length <= 10) {
        // Formato fixo: (11) 9999-9999
        return numeros.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    } else {
        // Formato celular: (11) 99999-9999
        return numeros.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
}

function validarSenha(senha) {
    // Validação: 8-32 dígitos, pelo menos uma letra minúscula, maiúscula e um número
    if (senha.length < 8 || senha.length > 32) {
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

// ================= VARIÁVEIS GLOBAIS =================
let currentFormData = null; // Armazena dados do formulário durante verificação

// ================= EVENTO BOTÃO CRIAR CONTA =================
document.addEventListener("DOMContentLoaded", () => {
    console.log("DOM carregado, configurando eventos de criação de conta...");

    const btnCriar = document.getElementById("btnLogin");
    const linkVoltar = document.querySelector(".leg2");
    const btnToggleSenha = document.getElementById("btnToggleSenha");
    const senhaInput = document.getElementById("senhaInput");
    const eyeIcon = document.getElementById("eyeIcon");
    const emailInputConta = document.getElementById("emailInput");

    console.log("Botão criar conta encontrado:", !!btnCriar);
    console.log("Link voltar encontrado:", !!linkVoltar);
    console.log("Botão toggle senha encontrado:", !!btnToggleSenha);
    console.log("Interface Android disponível:", !!window.Android);
    console.log("Email input encontrado:", !!emailInputConta);

    // ================= MÁSCARA DE TELEFONE MELHORADA =================
    if (emailInputConta) {
        emailInputConta.addEventListener('input', (e) => {
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
        emailInputConta.addEventListener('blur', (e) => {
            let valor = e.target.value;
            const apenasNumeros = valor.replace(/\D/g, '');
            
            // Se não é email e tem exatamente 11 dígitos, aplica máscara de telefone
            if (!valor.includes('@') && apenasNumeros.length === 11) {
                e.target.value = aplicarMascaraTelefone(apenasNumeros);
            }
        });

        // Ao focar, se for telefone formatado, remove a máscara para edição
        emailInputConta.addEventListener('focus', (e) => {
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
        emailInputConta.addEventListener('keypress', (e) => {
            if (e.key === '@') {
                // Permite @ ser digitado, depois no evento input será tratado
                return true;
            }
        });
    }

    if (btnCriar) {
        btnCriar.addEventListener("click", (e) => {
            console.log("Botão criar conta clicado!");
            e.preventDefault();

            const nome = document.getElementById("nomeInput").value.trim();
            const input = document.getElementById("emailInput").value.trim();
            const senha = document.getElementById("senhaInput").value.trim();
            const nascimento = document.getElementById("dateInput").value;

            console.log("Dados coletados:", { nome, input, senha: senha ? "***" : "", nascimento });



            // Validações
            if (!nome) { showAlert("O nome é obrigatório."); return; }
            if (!validarNome(nome)) { showAlert("Nome inválido."); return; }
            if (!input) { showAlert("O email ou telefone é obrigatório."); return; }
            if (!senha) { showAlert("A senha é obrigatória."); return; }
            if (!nascimento) { showAlert("A data de nascimento é obrigatória."); return; }

            if (!validarSenha(senha).valido) {
                showAlert(validarSenha(senha).mensagem);
                return;
            }

            // Armazena dados do formulário para usar depois da verificação
            currentFormData = { nome, input, senha, nascimento };

            // Verifica se é email ou telefone
            if (isEmail(input)) {
                if (!validarEmail(input)) { 
                    showAlert("Email inválido."); 
                    return; 
                }
                console.log("Verificando se email já existe:", input);
                // Primeiro verifica se o email já existe
                if (window.Android && window.Android.checkEmailExists) {
                    window.Android.checkEmailExists(input);
                } else {
                    showAlert("Erro: Interface Android não disponível.");
                }
            } else if (isPhone(input)) {
                if (!validarTelefone(input)) {
                    showAlert("Telefone inválido. Use o formato: (11) 9 9999-9999");
                    return;
                }
                console.log("Verificando se telefone já existe:", input);
                // Primeiro verifica se o telefone já existe
                if (window.Android && window.Android.checkPhoneExists) {
                    window.Android.checkPhoneExists(input);
                } else {
                    console.log("Interface Android não disponível, tentando verificação direta");
                    // Se não conseguir verificar, tenta criar diretamente
                    if (window.Android && window.Android.sendPhoneVerification) {
                        window.Android.sendPhoneVerification(input);
                    } else {
                        showAlert("Erro: Interface Android não disponível.");
                    }
                }
            } else {
                showAlert("Digite um email válido ou telefone válido.");
                return;
            }
        });
    } else {
        console.error("Botão de criar conta não encontrado!");
    }

    // ================= LINK VOLTAR =================
    if (linkVoltar) {
        // Desabilitar menu de contexto (segurar no link)
        linkVoltar.addEventListener("contextmenu", (e) => {
            e.preventDefault();
            e.stopPropagation();
            return false;
        });

        // Desabilitar long press em dispositivos móveis
        linkVoltar.addEventListener("touchstart", (e) => {
            // Prevenir comportamento padrão se segurar por muito tempo
            let longPressTimer;

            longPressTimer = setTimeout(() => {
                e.preventDefault();
                e.stopPropagation();
            }, 500); // 500ms para considerar long press

            linkVoltar.addEventListener("touchend", () => {
                clearTimeout(longPressTimer);
            }, { once: true });

            linkVoltar.addEventListener("touchmove", () => {
                clearTimeout(longPressTimer);
            }, { once: true });
        });

        linkVoltar.addEventListener("click", (e) => {
            console.log("Link voltar clicado!");
            e.preventDefault();
            window.location.href = "index.html";
        });
    }

// ================= BOTÃO TOGGLE SENHA =================
    if (btnToggleSenha && senhaInput && eyeIcon) {
        let senhaVisivel = false;

        // Aplicar estilos inline COM !IMPORTANT para prioridade máxima
        btnToggleSenha.setAttribute('style', `
            position: absolute !important;
            right: 15px !important;
            top: 50% !important;
            transform: translateY(-50%) !important;
            z-index: 999 !important;
            padding: 5px !important;
            background: none !important;
            border: none !important;
            cursor: pointer !important;
        `);

        // Garantir que a imagem inicial seja carregada
        eyeIcon.onload = function() {
            console.log("Ícone de senha carregado com sucesso");
        };

        eyeIcon.onerror = function() {
            console.error("Erro ao carregar ícone de senha");
            // Fallback para uma imagem padrão se houver erro
            eyeIcon.src = "./imgs/visivel.png";
        };

        // Manter a imagem original que está no HTML
        // eyeIcon.src = "./imgs/visivel.png";
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
});

// ================= CALLBACKS DO ANDROID =================
function onSuccess(message) {
    showAlert(message || "Operação realizada com sucesso!");

    // Para criação de conta, apenas mostrar sucesso e limpar dados
    if (message && message.includes("Conta criada com sucesso!")) {
        currentFormData = null;
    }
}

function onError(errorMessage) {
    showAlert("Erro: " + errorMessage);
}

function onPhoneCodeSent(message) {
    showAlert(message || "Código SMS enviado!");
    mostrarModalSMS();
}

function onPhoneCodeVerified(phoneNumber) {
    // Código SMS verificado com sucesso, agora salvar dados do usuário
    if (currentFormData && window.Android && window.Android.createUserWithPhone) {
        console.log("Salvando dados do usuário após verificação SMS:", currentFormData);
        console.log("Telefone do callback:", phoneNumber);
        console.log("Telefone original do formulário:", currentFormData.input);

        // Usar o telefone original do formulário em vez do que vem do callback
        // pois o callback pode ter apenas "+55"
        const telefoneCompleto = currentFormData.input;
        window.Android.createUserWithPhone(telefoneCompleto, currentFormData.nome, currentFormData.nascimento);
    } else {
        showAlert("Erro: Dados do formulário não encontrados ou interface Android indisponível.");
    }
}

function onEmailCheckResult(emailExists) {
    if (emailExists) {
        showAlert("Este email já está cadastrado. Use outro email ou faça login.");
        currentFormData = null; // Limpa dados
    } else {
        // Email não existe, pode criar conta
        if (currentFormData && window.Android && window.Android.createUserWithEmail) {
            console.log("Criando conta com email:", currentFormData.input);
            window.Android.createUserWithEmail(currentFormData.input, currentFormData.senha, currentFormData.nome, currentFormData.nascimento);
        }
        currentFormData = null; // Limpa dados
    }
}

function onPhoneCheckResult(phoneExists) {
    if (phoneExists) {
        showAlert("Este telefone já está cadastrado. Use outro telefone ou faça login.");
        currentFormData = null; // Limpa dados
    } else {
        // Telefone não existe, pode criar conta
        if (currentFormData && window.Android && window.Android.sendPhoneVerification) {
            console.log("Criando conta com telefone:", currentFormData.input);
            window.Android.sendPhoneVerification(currentFormData.input);
        }
        // NÃO limpa dados aqui - eles serão usados depois da verificação SMS
    }
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
        max-width: 300px;
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
            width: 240px;
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

// ================= FLOATING LABELS E PLACEHOLDER FADE-OUT =================
    // Configurar labels dentro do DOMContentLoaded
    const nomeInput = document.getElementById("nomeInput");
    const emailLabelConta = document.querySelector('.input-gmail label');
    const emailInputConta = document.getElementById("emailInput");
    const senhaInputConta = document.getElementById("senhaInput");
    const nomeLabel = document.querySelector('.input-nome label');
    const senhaLabelConta = document.querySelector('.input-senha label');

    // Função para animar label e placeholder
    function animateLabel(input, label) {
        if (input.value || input === document.activeElement) {
            // Campo preenchido ou em foco - animar label para posição "encaixada"
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
            // Campo vazio e sem foco - animar label para posição inicial
            label.style.top = '50%';
            label.style.left = '20px';
            label.style.transform = 'translateY(-50%)';
            label.style.fontSize = '16px';
            label.style.background = 'transparent';
            label.style.padding = '0';
            label.style.borderRadius = '0';
            label.style.opacity = '0';

            // Restaurar placeholder baseado no campo
            if (input.id === 'nomeInput') {
                input.placeholder = 'Nome completo';
            } else if (input.id === 'emailInput') {
                input.placeholder = 'Email ou telefone';
            } else if (input.id === 'senhaInput') {
                input.placeholder = 'Senha';
            }
        }
    }

    // Inicializar labels como invisíveis
    function initializeLabels() {
        if (nomeLabel) {
            nomeLabel.style.top = '50%';
            nomeLabel.style.left = '20px';
            nomeLabel.style.transform = 'translateY(-50%)';
            nomeLabel.style.fontSize = '16px';
            nomeLabel.style.background = 'transparent';
            nomeLabel.style.padding = '0';
            nomeLabel.style.borderRadius = '0';
            nomeLabel.style.opacity = '0';
        }
        
        if (emailLabelConta) {
            emailLabelConta.style.top = '50%';
            emailLabelConta.style.left = '20px';
            emailLabelConta.style.transform = 'translateY(-50%)';
            emailLabelConta.style.fontSize = '16px';
            emailLabelConta.style.background = 'transparent';
            emailLabelConta.style.padding = '0';
            emailLabelConta.style.borderRadius = '0';
            emailLabelConta.style.opacity = '0';
        }
        
        if (senhaLabelConta) {
            senhaLabelConta.style.top = '50%';
            senhaLabelConta.style.left = '20px';
            senhaLabelConta.style.transform = 'translateY(-50%)';
            senhaLabelConta.style.fontSize = '16px';
            senhaLabelConta.style.background = 'transparent';
            senhaLabelConta.style.padding = '0';
            senhaLabelConta.style.borderRadius = '0';
            senhaLabelConta.style.opacity = '0';
        }
    }

    // Configurar eventos para os labels
    if (nomeInput && nomeLabel) {
        nomeInput.addEventListener('focus', () => animateLabel(nomeInput, nomeLabel));
        nomeInput.addEventListener('blur', () => animateLabel(nomeInput, nomeLabel));
        nomeInput.addEventListener('input', () => animateLabel(nomeInput, nomeLabel));
    }

    if (emailInputConta && emailLabelConta) {
        emailInputConta.addEventListener('focus', () => animateLabel(emailInputConta, emailLabelConta));
        emailInputConta.addEventListener('blur', () => animateLabel(emailInputConta, emailLabelConta));
        emailInputConta.addEventListener('input', () => animateLabel(emailInputConta, emailLabelConta));
    }

    if (senhaInputConta && senhaLabelConta) {
        senhaInputConta.addEventListener('focus', () => animateLabel(senhaInputConta, senhaLabelConta));
        senhaInputConta.addEventListener('blur', () => animateLabel(senhaInputConta, senhaLabelConta));
        senhaInputConta.addEventListener('input', () => animateLabel(senhaInputConta, senhaLabelConta));
    }

    // Inicializar labels quando a página carrega
    initializeLabels();

// ================= FUNCIONALIDADE BOTÃO VOLTAR DO DISPOSITIVO =================
// Adiciona uma entrada no histórico para interceptar o botão voltar
window.history.pushState({page: 'criar_conta'}, 'Criar Conta', window.location.href);

// Intercepta o botão voltar do dispositivo
window.addEventListener('popstate', function(event) {
    if (event.state && event.state.page === 'criar_conta') {
        // Impede o comportamento padrão e redireciona
        event.preventDefault();
        window.location.href = "index.html";
        return false;
    }
});

// Fallback para beforeunload
window.addEventListener('beforeunload', function(event) {
    window.location.href = "index.html";
});

// Abordagem adicional: Interceptar unload
window.addEventListener('unload', function(event) {
    window.location.href = "index.html";
});

// Verificar se estamos em WebView Android
if (window.Android && window.Android.onBackPressed) {
    window.Android.onBackPressed = function() {
        window.location.href = "index.html";
    };
}

// Timer de segurança
let backPressedConta = false;
document.addEventListener('visibilitychange', function() {
    if (document.hidden && !backPressedConta) {
        backPressedConta = true;
        setTimeout(() => {
            if (backPressedConta) {
                window.location.href = "index.html";
            }
        }, 500);
    }
});
