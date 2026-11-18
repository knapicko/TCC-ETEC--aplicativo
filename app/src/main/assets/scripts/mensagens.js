// Script para a página de mensagens

// Variáveis globais
let messages = [];
let conversations = [];
let currentConversation = null;
let userType = null;
let firebaseEnabled = false;
let messagesListener = null; // Listener em tempo real para mensagens
let conversationsListener = null; // Listener em tempo real para conversas
let currentPlayingAudio = null; // Controle para áudio atualmente tocando

// Função para formatar hora
function formatTime(date) {
    return date.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
}

// Função para formatar tempo relativo (igual à do pedidos.js)
function formatRelativeTime(dateString) {
    try {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;

        // Menos de 3 minutos: "Agora"
        if (diffMs < 3 * 60 * 1000) return 'Agora';

        // Menos de 1 hora: "X min atrás"
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        if (diffMinutes < 60) return `${diffMinutes} min atrás`;

        // Menos de 24 horas: "há X horas"
        const diffHours = Math.floor(diffMinutes / 60);
        if (diffHours < 24) {
            if (diffHours === 1) return 'há 1 hora';
            return `há ${diffHours} horas`;
        }

        // Mesmo dia: "Hoje"
        const dataHoje = new Date(now);
        dataHoje.setHours(0, 0, 0, 0);
        const dataItem = new Date(date);
        dataItem.setHours(0, 0, 0, 0);

        if (dataItem.getTime() === dataHoje.getTime()) return 'Hoje';

        // Ontem
        const dataOntem = new Date(dataHoje);
        dataOntem.setDate(dataOntem.getDate() - 1);
        if (dataItem.getTime() === dataOntem.getTime()) return 'Ontem';

        // Até 7 dias atrás: "há X dias"
        const diffDays = Math.floor((dataHoje - dataItem) / (1000 * 60 * 60 * 24));
        if (diffDays <= 7) {
            if (diffDays === 1) return 'há 1 dia';
            return `há ${diffDays} dias`;
        }

        // Semana passada ou mais: "há X semanas" ou "há 1 mês" ou "há X meses"
        const diffWeeks = Math.floor(diffDays / 7);
        if (diffWeeks <= 4) {
            if (diffWeeks === 1) return 'há 1 semana';
            return `há ${diffWeeks} semanas`;
        }

        // Formatação padrão para datas antigas
        return new Intl.DateTimeFormat('pt-BR').format(date);

    } catch (e) {
        return 'Tempo desconhecido';
    }
}

// Função para criar elemento de mensagem
function createMessageElement(message, type) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';

    const textP = document.createElement('p');
    textP.textContent = message.text;

    const timeSpan = document.createElement('span');
    timeSpan.className = 'message-time';
    timeSpan.textContent = message.time;

    contentDiv.appendChild(textP);
    contentDiv.appendChild(timeSpan);
    messageDiv.appendChild(contentDiv);

    return messageDiv;
}

// Função para adicionar mensagem
function addMessage(text, type = 'sent') {
    const message = {
        text: text,
        time: formatTime(new Date()),
        type: type
    };

    messages.push(message);

    const messagesArea = document.getElementById('messagesArea');
    const messageElement = createMessageElement(message, type);
    messagesArea.appendChild(messageElement);

    // Scroll para o final
    scrollToBottom();

    // Salvar no localStorage (simulando persistência)
    saveMessages();
}

// Função para scroll para o final
function scrollToBottom() {
    const messagesArea = document.getElementById('messagesArea');
    messagesArea.scrollTop = messagesArea.scrollHeight;
}

// Função para salvar mensagens no localStorage
function saveMessages() {
    localStorage.setItem('chat_messages', JSON.stringify(messages));
}

// Função para carregar mensagens do localStorage
function loadMessages() {
    const saved = localStorage.getItem('chat_messages');
    if (saved) {
        messages = JSON.parse(saved);
        const messagesArea = document.getElementById('messagesArea');

        // Limpar mensagens existentes (exceto as de exemplo)
        const existingMessages = messagesArea.querySelectorAll('.message');
        existingMessages.forEach(msg => msg.remove());

        // Adicionar mensagens salvas
        messages.forEach(message => {
            const messageElement = createMessageElement(message, message.type);
            messagesArea.appendChild(messageElement);
        });
    }
}

// Função para alternar ícone do botão baseado no conteúdo do input
function toggleAudioSendIcon() {
    const input = document.getElementById('messageInput');
    const icon = document.getElementById('audioSendIcon');
    const btn = document.getElementById('audioSendBtn');

    if (input && icon && btn) {
        const hasText = input.value.trim().length > 0;

        if (hasText) {
            // Mostrar ícone de enviar
            icon.src = './imgs/enviar.png';
            icon.alt = 'Enviar';
            btn.onclick = sendMessage;
            // Adicionar classe visual para indicar que está pronto para enviar
            btn.classList.add('send-mode');
        } else {
            // Se não está gravando, mostrar ícone de áudio para iniciar
            if (!isRecording) {
                icon.src = './imgs/audio.png';
                icon.alt = 'Áudio';
                btn.onclick = startAudioRecording;
                // Remover classe visual
                btn.classList.remove('send-mode');
            } else {
                // Se está gravando, mostrar ícone de parar
                icon.src = './imgs/enviar.png'; // Usar ícone de enviar como "stop"
                icon.alt = 'Parar Gravação';
                btn.onclick = stopAudioRecording;
                // Manter classe de gravação
                btn.classList.remove('send-mode');
            }
        }
    }
}

// Função para enviar mensagem
async function sendMessage() {
    const input = document.getElementById('messageInput');
    const text = input.value.trim();

    if (text && currentConversation) {
        try {
            console.log('💬 Enviando mensagem para conversa:', currentConversation.id);

            // Enviar mensagem via Firebase
            if (firebaseEnabled && window.enviarMensagem) {
                await window.enviarMensagem(currentConversation.id, text);
                console.log('✅ Mensagem enviada com sucesso');

                // Não adicionar localmente - o listener em tempo real vai cuidar disso
            } else {
                console.log('📱 Firebase não disponível, usando modo local');
                // Para modo local, adicionar diretamente
                addMessageToUI(text, 'sent');
            }

            input.value = '';

            // Atualizar ícone após enviar
            toggleAudioSendIcon();

        } catch (error) {
            console.error('❌ Erro ao enviar mensagem:', error);
            alert('Erro ao enviar mensagem. Tente novamente.');
        }
    }
}

// Função auxiliar para adicionar mensagem à interface
function addMessageToUI(text, type = 'sent') {
    const message = {
        text: text,
        time: formatTime(new Date()),
        type: type
    };

    const messagesArea = document.getElementById('messagesArea');
    const messageElement = createMessageElement(message, type);
    messagesArea.appendChild(messageElement);

    // Scroll para o final
    scrollToBottom();
}

// Variáveis para gravação de áudio
let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;
let isPaused = false;
let recordingStartTime = null;
let recordingTimer = null;
let recordingDuration = 0;

// Função para iniciar gravação de áudio
async function startAudioRecording() {
    console.log('🎤 Iniciando gravação de áudio...');
    console.log('🎤 Estado atual antes de iniciar:', {
        isRecording,
        mediaRecorder: !!mediaRecorder,
        mediaRecorderState: mediaRecorder ? mediaRecorder.state : 'null',
        audioChunksLength: audioChunks.length,
        isPaused
    });

    // Verificar se já está gravando
    if (isRecording) {
        console.log('🎤 Já está gravando, ignorando...');
        return;
    }

    // Limpar qualquer estado residual
    console.log('🎤 Limpando estado residual...');
    if (mediaRecorder) {
        try {
            if (mediaRecorder.state === 'recording') {
                mediaRecorder.stop();
            }
        } catch (e) {
            console.log('🎤 Erro ao parar MediaRecorder anterior:', e);
        }
    }

    // Resetar todas as variáveis
    mediaRecorder = null;
    audioChunks = [];
    isRecording = false;
    isPaused = false;
    recordingStartTime = null;

    console.log('🎤 Estado após limpeza:', {
        isRecording,
        mediaRecorder: !!mediaRecorder,
        audioChunksLength: audioChunks.length,
        isPaused
    });

    try {
        // Verificar se há suporte para gravação
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            alert('Seu navegador não suporta gravação de áudio.');
            return;
        }

        // Solicitar permissão para microfone com melhor qualidade
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
                sampleRate: 44100,
                channelCount: 1,
                sampleSize: 16,
                volume: 1.0
            }
        });

        console.log('🎤 Stream de áudio obtido:', stream);

        // Tentar diferentes tipos MIME para MediaRecorder
        let mimeType = 'audio/webm;codecs=opus';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = 'audio/webm';
            if (!MediaRecorder.isTypeSupported(mimeType)) {
                mimeType = 'audio/mp4';
                if (!MediaRecorder.isTypeSupported(mimeType)) {
                    mimeType = ''; // Deixar o navegador escolher
                }
            }
        }

        console.log('🎤 Usando MIME type:', mimeType);

        // Criar MediaRecorder com configurações mais simples
        const options = mimeType ? { mimeType: mimeType } : {};
        mediaRecorder = new MediaRecorder(stream, options);

        console.log('🎤 MediaRecorder criado:', mediaRecorder);

        audioChunks = [];

        // Event listeners
        mediaRecorder.ondataavailable = (event) => {
            console.log('🎤 Dados de áudio disponíveis:', event.data.size, 'bytes');
            if (event.data.size > 0) {
                audioChunks.push(event.data);
            }
        };

        mediaRecorder.onstop = async () => {
            console.log('🎤 Gravação parada, chunks:', audioChunks.length);

            // Parar todas as tracks do stream
            stream.getTracks().forEach(track => {
                console.log('🎤 Parando track:', track.kind);
                track.stop();
            });

            if (audioChunks.length > 0) {
                // Criar blob de áudio
                const audioBlob = new Blob(audioChunks, { type: mediaRecorder.mimeType || 'audio/webm' });
                console.log('🎤 Blob criado:', audioBlob.size, 'bytes');

                // Criar URL do blob para reprodução
                const audioUrl = URL.createObjectURL(audioBlob);
                console.log('🎤 URL do blob criada:', audioUrl);

                // Enviar áudio diretamente sem mostrar preview local
                console.log('🎤 Enviando áudio diretamente...');
                await sendAudioMessage(audioBlob);
            } else {
                console.warn('⚠️ Nenhum dado de áudio foi gravado');
                alert('Nenhum áudio foi gravado. Tente novamente.');
            }

            // Reset variáveis
            mediaRecorder = null;
            audioChunks = [];
            isRecording = false;

            // Atualizar UI
            updateRecordingUI(false);
        };

        mediaRecorder.onerror = (event) => {
            console.error('❌ Erro no MediaRecorder:', event.error);
            alert('Erro durante a gravação: ' + event.error.message);
            isRecording = false;
            updateRecordingUI(false);
        };

        // Iniciar gravação com timeslice menor para dados mais frequentes
        mediaRecorder.start(100); // 100ms chunks
        isRecording = true;

        console.log('🎤 Gravação iniciada com sucesso');
        updateRecordingUI(true);

        // Auto-stop após 30 segundos (máximo)
        setTimeout(() => {
            if (isRecording && mediaRecorder && mediaRecorder.state === 'recording') {
                console.log('🎤 Auto-stop após 30 segundos');
                stopAudioRecording();
            }
        }, 30000);

    } catch (error) {
        console.error('❌ Erro ao iniciar gravação:', error);

        // Limpar stream se foi criado
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }

        if (error.name === 'NotAllowedError') {
            alert('Permissão para microfone negada. Permita o acesso ao microfone para gravar áudio.');
        } else if (error.name === 'NotFoundError') {
            alert('Microfone não encontrado.');
        } else if (error.name === 'NotSupportedError') {
            alert('Formato de áudio não suportado. Tente usar um dispositivo diferente.');
        } else if (error.name === 'SecurityError') {
            alert('Erro de segurança. Verifique se está em uma conexão HTTPS.');
        } else {
            alert('Erro ao iniciar gravação de áudio: ' + (error.message || 'Erro desconhecido'));
        }

        isRecording = false;
        updateRecordingUI(false);
    }
}

// Função para parar gravação de áudio
function stopAudioRecording() {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        console.log('🎤 Parando gravação...');
        mediaRecorder.stop();
    }
}

// Função para atualizar UI durante gravação
function updateRecordingUI(recording) {
    const messageInputContainer = document.querySelector('.message-input-container');
    const audioRecordingContainer = document.querySelector('.audio-recording-container');

    // Procurar por todas as possíveis navbars
    const bottomNavs = document.querySelectorAll('.bottom-nav, .bottom-navigation, nav, [class*="nav"]');
    console.log('🎤 Navbars encontradas:', bottomNavs.length, bottomNavs);

    if (recording) {
        // Esconder input normal e mostrar interface de gravação
        if (messageInputContainer) messageInputContainer.style.display = 'none';

        // Ocultar TODAS as navbars encontradas durante gravação
        bottomNavs.forEach((nav, index) => {
            nav.style.display = 'none';
            console.log(`🎤 Navbar ${index} ocultada durante gravação:`, nav.className);
        });

        // Criar ou mostrar container de gravação
        if (!audioRecordingContainer) {
            createAudioRecordingInterface();
        } else {
            audioRecordingContainer.style.display = 'flex';
            audioRecordingContainer.classList.remove('paused');
            startRecordingTimer();
        }

        // Resetar estado de pausa
        isPaused = false;

    } else {
        // Esconder interface de gravação e mostrar input normal
        if (audioRecordingContainer) {
            audioRecordingContainer.style.display = 'none';
            stopRecordingTimer();
        }

        if (messageInputContainer) messageInputContainer.style.display = 'flex';

        // Mostrar TODAS as navbars novamente
        bottomNavs.forEach((nav, index) => {
            nav.style.display = '';
            console.log(`🎤 Navbar ${index} mostrada novamente:`, nav.className);
        });

        // Resetar variáveis
        isPaused = false;
        recordingDuration = 0;
    }
}

// Função para criar interface de gravação de áudio estilo WhatsApp
function createAudioRecordingInterface() {
    // Remover container existente se houver
    const existingContainer = document.querySelector('.audio-recording-container');
    if (existingContainer) {
        existingContainer.remove();
    }

    const container = document.createElement('div');
    container.className = 'audio-recording-container';
    container.style.cssText = `
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        background: #007bff;
        border-top: 1px solid #0056b3;
        padding: 16px 20px;
        display: flex;
        align-items: center;
        gap: 16px;
        z-index: 1001;
        box-shadow: 0 -2px 10px rgba(0,0,0,0.1);
    `;

    container.innerHTML = `
        <div class="audio-recording-info" style="display: flex; align-items: center; gap: 10px; flex: 1;">
            <div class="recording-indicator" style="display: flex; align-items: center; gap: 8px;">
                <div class="recording-dot" style="
                    width: 12px;
                    height: 12px;
                    background: #ff4444;
                    border-radius: 50%;
                    animation: pulse 1s infinite;
                "></div>
                <span class="recording-text" style="color: white; font-size: 14px; font-weight: 500;">Gravando</span>
            </div>
            <span class="recording-timer" style="color: white; font-size: 16px; font-weight: 600; font-variant-numeric: tabular-nums;">00:00</span>
        </div>

        <div class="audio-wave-container" style="display: flex; align-items: center; gap: 2px; flex: 1;">
            <div class="audio-wave-bar" style="width: 4px; height: 20px; background: #666; border-radius: 2px; animation: wave 1.5s ease-in-out infinite;"></div>
            <div class="audio-wave-bar" style="width: 4px; height: 15px; background: #666; border-radius: 2px; animation: wave 1.5s ease-in-out 0.1s infinite;"></div>
            <div class="audio-wave-bar" style="width: 4px; height: 25px; background: #666; border-radius: 2px; animation: wave 1.5s ease-in-out 0.2s infinite;"></div>
            <div class="audio-wave-bar" style="width: 4px; height: 18px; background: #666; border-radius: 2px; animation: wave 1.5s ease-in-out 0.3s infinite;"></div>
            <div class="audio-wave-bar" style="width: 4px; height: 22px; background: #666; border-radius: 2px; animation: wave 1.5s ease-in-out 0.4s infinite;"></div>
            <div class="audio-wave-bar" style="width: 4px; height: 16px; background: #666; border-radius: 2px; animation: wave 1.5s ease-in-out 0.5s infinite;"></div>
            <div class="audio-wave-bar" style="width: 4px; height: 28px; background: #666; border-radius: 2px; animation: wave 1.5s ease-in-out 0.6s infinite;"></div>
            <div class="audio-wave-bar" style="width: 4px; height: 12px; background: #666; border-radius: 2px; animation: wave 1.5s ease-in-out 0.7s infinite;"></div>
        </div>

        <div class="audio-recording-controls" style="display: flex; align-items: center; gap: 10px;">
            <button id="btnCancelRecording" class="btn-audio-cancel" onclick="console.log('🎤 Botão CANCELAR clicado'); event.preventDefault(); event.stopPropagation(); cancelAudioRecording(); return false;" style="
                background: #007bff;
                border: none;
                cursor: pointer;
                width: 40px;
                height: 40px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: background 0.2s ease;
            " onmouseover="this.style.background='#0056b3'" onmouseout="this.style.background='#007bff'">
                <img src="./imgs/cancelar.png" alt="Cancelar" style="width: 20px; height: 20px;">
            </button>
            <button id="btnSendRecording" class="btn-audio-send" onclick="console.log('🎤 Botão ENVIAR clicado'); stopAudioRecording()" style="
                background: #007bff;
                border: none;
                cursor: pointer;
                width: 40px;
                height: 40px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s ease;
            ">
                <img src="./imgs/enviar.png" alt="Enviar" style="width: 24px; height: 24px; filter: brightness(0) invert(1);">
            </button>
        </div>
    `;

    // Adicionar estilos CSS para animações
    const style = document.createElement('style');
    style.textContent = `
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
        @keyframes wave {
            0%, 100% { height: 4px; background: #666; }
            25% { height: 12px; background: #999; }
            50% { height: 20px; background: #ccc; }
            75% { height: 8px; background: #888; }
        }
    `;
    document.head.appendChild(style);

    // Inserir no body (posição fixa)
    document.body.appendChild(container);



    // Iniciar timer
    startRecordingTimer();

    console.log('🎤 Interface de gravação criada e exibida');
}

// Função para iniciar timer de gravação
function startRecordingTimer() {
    recordingStartTime = Date.now();
    recordingDuration = 0;

    if (recordingTimer) {
        clearInterval(recordingTimer);
    }

    recordingTimer = setInterval(() => {
        if (!isPaused) {
            recordingDuration = Math.floor((Date.now() - recordingStartTime) / 1000);
            updateRecordingTimer();
        }
    }, 100);
}

// Função para parar timer de gravação
function stopRecordingTimer() {
    if (recordingTimer) {
        clearInterval(recordingTimer);
        recordingTimer = null;
    }
}

// Função para atualizar display do timer
function updateRecordingTimer() {
    const timerElement = document.querySelector('.recording-timer');
    if (timerElement) {
        const minutes = Math.floor(recordingDuration / 60);
        const seconds = recordingDuration % 60;
        timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
}

// Função para cancelar gravação
function cancelAudioRecording() {
    console.log('🎤 Cancelando gravação...');
    console.log('🎤 Estado atual - isRecording:', isRecording, 'mediaRecorder:', !!mediaRecorder, 'state:', mediaRecorder ? mediaRecorder.state : 'null');

    try {
        // Parar MediaRecorder se estiver rodando
        if (mediaRecorder && mediaRecorder.state === 'recording') {
            console.log('🎤 Parando MediaRecorder...');
            mediaRecorder.stop();
        } else if (mediaRecorder && mediaRecorder.state === 'paused') {
            console.log('🎤 MediaRecorder estava pausado, parando...');
            mediaRecorder.stop();
        } else {
            console.log('🎤 MediaRecorder não estava gravando, state:', mediaRecorder ? mediaRecorder.state : 'null');
        }

        // Parar todas as tracks do stream para liberar microfone completamente
        if (mediaRecorder && mediaRecorder.stream) {
            console.log('🎤 Parando tracks do stream...');
            mediaRecorder.stream.getTracks().forEach(track => {
                console.log('🎤 Parando track:', track.kind);
                track.stop();
            });
        }

        // Resetar variáveis imediatamente
        console.log('🎤 Resetando variáveis...');
        isRecording = false;
        isPaused = false;
        recordingDuration = 0;
        audioChunks = [];
        mediaRecorder = null;

        // Atualizar UI imediatamente
        console.log('🎤 Atualizando UI...');
        updateRecordingUI(false);

        console.log('✅ Gravação cancelada completamente');

    } catch (error) {
        console.error('❌ Erro ao cancelar gravação:', error);

        // Mesmo com erro, tentar resetar tudo
        console.log('🎤 Resetando tudo devido a erro...');
        isRecording = false;
        isPaused = false;
        recordingDuration = 0;
        audioChunks = [];
        mediaRecorder = null;

        updateRecordingUI(false);
    }
}

// Função para pausar/continuar gravação
function togglePauseRecording() {
    if (!mediaRecorder) return;

    const container = document.querySelector('.audio-recording-container');
    const pauseBtn = document.querySelector('.btn-audio-pause');

    if (isPaused) {
        // Continuar gravação
        console.log('🎤 Continuando gravação...');
        isPaused = false;
        container.classList.remove('paused');

        if (pauseBtn) {
            pauseBtn.textContent = 'Pausar';
        }

        // Reiniciar timer
        recordingStartTime = Date.now() - (recordingDuration * 1000);

    } else {
        // Pausar gravação
        console.log('🎤 Pausando gravação...');
        isPaused = true;
        container.classList.add('paused');

        if (pauseBtn) {
            pauseBtn.textContent = 'Continuar';
        }
    }
}

// Função para enviar mensagem de áudio
async function sendAudioMessage(audioBlob) {
    console.log('🎤 sendAudioMessage chamada com blob:', audioBlob);
    console.log('🎤 Tamanho do blob:', audioBlob.size, 'bytes');
    console.log('🎤 Tipo do blob:', audioBlob.type);

    if (!currentConversation) {
        console.error('❌ Nenhuma conversa ativa para enviar áudio');
        return;
    }

    console.log('🎤 Conversa ativa:', currentConversation.id);
    console.log('🎤 Firebase habilitado:', firebaseEnabled);
    console.log('🎤 Função enviarMensagemAudio existe:', typeof window.enviarMensagemAudio);

    try {
        console.log('📤 Enviando áudio...');

        // Usar a nova função que faz upload para Firebase Storage
        if (firebaseEnabled && window.enviarMensagemAudio) {
            console.log('📤 Chamando window.enviarMensagemAudio...');
            const result = await window.enviarMensagemAudio(currentConversation.id, audioBlob);
            console.log('✅ Áudio enviado com sucesso para Firebase Storage, resultado:', result);

            // Remover mensagem local pendente para evitar duplicação
            console.log('🗑️ Removendo mensagem local pendente...');
            const localPendingMessages = document.querySelectorAll('.message.sent.audio-message[data-local-pending="true"]');
            localPendingMessages.forEach(message => {
                console.log('🗑️ Removendo mensagem local pendente');
                message.remove();
            });

            // Recarregar mensagens para mostrar a nova mensagem de áudio
            console.log('📤 Recarregando mensagens...');
            await loadConversationMessages(currentConversation.id);
            console.log('✅ Mensagens recarregadas');
        } else {
            console.log('📱 Firebase não disponível, simulando envio local');
            console.log('   - firebaseEnabled:', firebaseEnabled);
            console.log('   - window.enviarMensagemAudio:', typeof window.enviarMensagemAudio);
            // Criar URL do blob para reprodução local
            const audioUrl = URL.createObjectURL(audioBlob);
            addAudioMessageToUI(audioUrl, audioBlob.size, 'sent');
        }

    } catch (error) {
        console.error('❌ Erro ao enviar áudio:', error);
        console.error('❌ Detalhes do erro:', error.message);
        console.error('❌ Stack trace:', error.stack);
        alert('Erro ao enviar áudio. Tente novamente.');
        // Mesmo com erro, tentar adicionar localmente para não perder a gravação
        try {
            const audioUrl = URL.createObjectURL(audioBlob);
            addAudioMessageToUI(audioUrl, audioBlob.size, 'sent');
        } catch (localError) {
            console.error('❌ Erro ao adicionar áudio localmente:', localError);
        }
    }
}

function createAudioMessageElement(messageData, currentUserId, isLocal = false) {
    const messageDiv = document.createElement('div');
    const isSent = messageData.remetenteId === currentUserId;
    messageDiv.className = `message ${isSent ? 'sent' : 'received'} audio-message`;

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';

    // O player de áudio agora FAZ PARTE do balão de mensagem (não é um container separado)
    // Criar container para o player de áudio integrado ao balão
    const audioContainer = document.createElement('div');
    audioContainer.className = 'audio-message-container';
    audioContainer.style.cssText = `
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        min-width: 180px;
        max-width: 250px;
        position: relative;
        width: 100%;
        box-sizing: border-box;
    `;

    // Botão play/pause (sem background e sem borda circular)
    const playButton = document.createElement('button');
    playButton.className = 'audio-play-btn';
    playButton.innerHTML = `<img src="./imgs/play.png" alt="Play" style="width: 20px; height: 20px; ${!isSent ? 'filter: brightness(0) saturate(100%) invert(14%) sepia(100%) saturate(7442%) hue-rotate(241deg) brightness(91%) contrast(108%);' : ''}">`;
    playButton.style.cssText = `
        background: transparent;
        border: none;
        cursor: pointer;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
        flex-shrink: 0;
        padding: 0;
    `;

    // Container da barra de progresso e tempo
    const progressContainer = document.createElement('div');
    progressContainer.className = 'audio-progress-container';
    progressContainer.style.cssText = `
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 2px;
        cursor: pointer;
        min-width: 80px;
    `;

    // Barra de progresso (linha do ruído)
    const progressBar = document.createElement('div');
    progressBar.className = 'audio-progress-bar';
    progressBar.style.cssText = `
        width: 100%;
        height: 2px;
        background: ${isSent ? 'rgba(255,255,255,0.3)' : 'rgba(0,123,255,0.3)'};
        border-radius: 1px;
        position: relative;
        overflow: hidden;
        cursor: pointer;
    `;

    const progressFill = document.createElement('div');
    progressFill.className = 'audio-progress-fill';
    progressFill.style.cssText = `
        height: 100%;
        background: ${isSent ? '#fff' : '#007bff'};
        border-radius: 1px;
        width: 0%;
        transition: width 0.05s linear;
    `;

    progressBar.appendChild(progressFill);

    // Tempo decorrido/total (abaixo da barra)
    const timeDisplay = document.createElement('span');
    timeDisplay.className = 'audio-time-display';
    timeDisplay.textContent = '0:00 / 0:00';
    timeDisplay.style.cssText = `
        font-size: 11px;
        color: ${isSent ? 'rgba(255,255,255,0.7)' : 'rgba(0,123,255,0.7)'};
        font-variant-numeric: tabular-nums;
        align-self: flex-start;
        margin-top: 2px;
    `;

    progressContainer.appendChild(progressBar);
    progressContainer.appendChild(timeDisplay);

    // Elemento de áudio oculto
    const audioElement = document.createElement('audio');
    if (messageData.audioBase64 && messageData.audioMimeType) {
        const dataUrl = `data:${messageData.audioMimeType};base64,${messageData.audioBase64}`;
        console.log('🎵 Criando áudio para mensagem:', messageData.id, 'isSent:', isSent);
        console.log('🎵 Data URL length:', dataUrl.length);
        console.log('🎵 MIME type:', messageData.audioMimeType);
        audioElement.src = dataUrl;
        audioElement.preload = 'metadata';
        // Forçar carregamento dos metadados imediatamente
        audioElement.load();
    } else {
        console.warn('🎵 Dados de áudio ausentes para mensagem:', messageData.id);
    }
    audioElement.style.display = 'none';

    // Montar o container
    audioContainer.appendChild(playButton);
    audioContainer.appendChild(progressContainer);
    audioContainer.appendChild(audioElement);

    // Funcionalidade do player
    let isPlaying = false;

    playButton.addEventListener('click', () => {
        if (isPlaying) {
            audioElement.pause();
            playButton.innerHTML = `<img src="./imgs/play.png" alt="Play" style="width: 20px; height: 20px; ${!isSent ? 'filter: brightness(0) saturate(100%) invert(14%) sepia(100%) saturate(7442%) hue-rotate(241deg) brightness(91%) contrast(108%);' : ''}">`;
            currentPlayingAudio = null;
        } else {
            // Parar áudio atualmente tocando
            if (currentPlayingAudio && currentPlayingAudio !== audioElement) {
                currentPlayingAudio.pause();
                currentPlayingAudio.currentTime = 0;

                // Resetar visual do botão anterior
                const previousContainer = currentPlayingAudio.closest('.audio-message-container');
                if (previousContainer) {
                    const previousButton = previousContainer.querySelector('.audio-play-btn');
                    const previousTimeDisplay = previousContainer.querySelector('.audio-time-display');
                    if (previousButton) {
                        previousButton.innerHTML = `<img src="./imgs/play.png" alt="Play" style="width: 20px; height: 20px; ${!previousContainer.closest('.message.sent') ? 'filter: brightness(0) saturate(100%) invert(14%) sepia(100%) saturate(7442%) hue-rotate(241deg) brightness(91%) contrast(108%);' : ''}">`;
                        const isSent = previousContainer.closest('.message.sent');
                        previousButton.style.background = 'transparent';
                    }
                    if (previousTimeDisplay) {
                        const totalMinutes = Math.floor(currentPlayingAudio.duration / 60);
                        const totalSeconds = Math.floor(currentPlayingAudio.duration % 60);
                        previousTimeDisplay.textContent = `0:00 / ${totalMinutes}:${totalSeconds.toString().padStart(2, '0')}`;
                    }
                }
            }

            // Tocar o novo áudio
            audioElement.play();
            playButton.innerHTML = `<img src="./imgs/pause.png" alt="Pause" style="width: 20px; height: 20px; ${!isSent ? 'filter: brightness(0) saturate(100%) invert(14%) sepia(100%) saturate(7442%) hue-rotate(241deg) brightness(91%) contrast(108%);' : ''}">`;
            currentPlayingAudio = audioElement;
        }
    });

    audioElement.addEventListener('play', () => {
        isPlaying = true;
        playButton.innerHTML = `<img src="./imgs/pause.png" alt="Pause" style="width: 20px; height: 20px; ${!isSent ? 'filter: brightness(0) saturate(100%) invert(14%) sepia(100%) saturate(7442%) hue-rotate(241deg) brightness(91%) contrast(108%);' : ''}">`;
        playButton.style.background = 'transparent';
    });

    audioElement.addEventListener('pause', () => {
        isPlaying = false;
        playButton.innerHTML = `<img src="./imgs/play.png" alt="Play" style="width: 20px; height: 20px; ${!isSent ? 'filter: brightness(0) saturate(100%) invert(14%) sepia(100%) saturate(7442%) hue-rotate(241deg) brightness(91%) contrast(108%);' : ''}">`;
        playButton.style.background = 'transparent';
    });

    audioElement.addEventListener('ended', () => {
        isPlaying = false;
        playButton.innerHTML = `<img src="./imgs/play.png" alt="Play" style="width: 20px; height: 20px; ${!isSent ? 'filter: brightness(0) saturate(100%) invert(14%) sepia(100%) saturate(7442%) hue-rotate(241deg) brightness(91%) contrast(108%);' : ''}">`;
        playButton.style.background = 'transparent';
        progressFill.style.width = '0%';

        // Resetar para o início e mostrar tempo total
        audioElement.currentTime = 0;
        const totalMinutes = Math.floor(audioElement.duration / 60);
        const totalSeconds = Math.floor(audioElement.duration % 60);
        timeDisplay.textContent = `0:00 / ${totalMinutes}:${totalSeconds.toString().padStart(2, '0')}`;
        currentPlayingAudio = null;
    });

    audioElement.addEventListener('timeupdate', () => {
        if (audioElement.duration && !isNaN(audioElement.duration) && isFinite(audioElement.duration) && audioElement.duration > 0) {
            const progress = (audioElement.currentTime / audioElement.duration) * 100;
            if (!isNaN(progress) && progress >= 0 && progress <= 100) {
                progressFill.style.width = `${progress}%`;
            }

            // Atualização do tempo decorrido e total
            const currentMinutes = Math.floor(audioElement.currentTime / 60);
            const currentSeconds = Math.floor(audioElement.currentTime % 60);
            const totalMinutes = Math.floor(audioElement.duration / 60);
            const totalSeconds = Math.floor(audioElement.duration % 60);

            timeDisplay.textContent = `${currentMinutes}:${currentSeconds.toString().padStart(2, '0')} / ${totalMinutes}:${totalSeconds.toString().padStart(2, '0')}`;
        }
    });

    // Função para atualizar o display de tempo com a duração total
    const updateTimeDisplay = () => {
        if (audioElement.duration && !isNaN(audioElement.duration) && isFinite(audioElement.duration) && audioElement.duration > 0 && audioElement.duration < Infinity) {
            const totalMinutes = Math.floor(audioElement.duration / 60);
            const totalSeconds = Math.floor(audioElement.duration % 60);
            timeDisplay.textContent = `0:00 / ${totalMinutes}:${totalSeconds.toString().padStart(2, '0')}`;
            console.log('🎵 Time display updated to:', timeDisplay.textContent);
            return true; // Sucesso
        } else {
            timeDisplay.textContent = '0:00 / 0:00';
            console.log('🎵 Invalid duration, setting to 0:00 / 0:00');
            return false; // Falha
        }
    };

    // Função para tentar carregar duração com múltiplas tentativas
    const tryLoadDuration = () => {
        let attempts = 0;
        const maxAttempts = 50; // 5 segundos (50 * 100ms)

        const checkDuration = () => {
            attempts++;
            console.log(`🎵 Attempt ${attempts}, duration:`, audioElement.duration, 'readyState:', audioElement.readyState);

            if (updateTimeDisplay()) {
                console.log('🎵 Duration loaded successfully on attempt', attempts);
                return; // Sucesso, parar tentativas
            }

            if (attempts < maxAttempts) {
                setTimeout(checkDuration, 100); // Tentar novamente em 100ms
            } else {
                console.log('🎵 Max attempts reached, giving up');
                // Como último recurso, tentar estimar baseado no tamanho do base64
                if (messageData.audioBase64) {
                    const base64Size = messageData.audioBase64.length;
                    const estimatedBytes = (base64Size * 3) / 4; // Converter base64 para bytes
                    // Estimativa mais realista: assumir ~64kbps para áudios gravados (muito maior que 32kbps)
                    const estimatedDuration = Math.max(1, Math.round(estimatedBytes / 64000));
                    const totalMinutes = Math.floor(estimatedDuration / 60);
                    const totalSeconds = estimatedDuration % 60;
                    timeDisplay.textContent = `0:00 / ${totalMinutes}:${totalSeconds.toString().padStart(2, '0')}`;
                    console.log('🎵 Using estimated duration:', estimatedDuration, 'seconds');
                }
            }
        };

        // Iniciar verificação contínua
        checkDuration();
    };

    // Configurar eventos
    audioElement.addEventListener('loadedmetadata', () => {
        console.log('🎵 Loaded metadata event fired, duration:', audioElement.duration);
        updateTimeDisplay();
    });

    audioElement.addEventListener('canplay', () => {
        console.log('🎵 Can play event fired, duration:', audioElement.duration);
        updateTimeDisplay();
    });

    audioElement.addEventListener('canplaythrough', () => {
        console.log('🎵 Can play through event fired, duration:', audioElement.duration);
        updateTimeDisplay();
    });

    // Forçar carregamento
    audioElement.load();

    // Iniciar tentativas de carregamento
    tryLoadDuration();

    // Permitir clique na barra de progresso para avançar
    progressContainer.addEventListener('click', (e) => {
        e.stopPropagation();
        const rect = progressBar.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const percentage = clickX / rect.width;
        const newTime = percentage * audioElement.duration;

        if (!isNaN(newTime) && isFinite(newTime)) {
            audioElement.currentTime = newTime;
        }
    });



    // Adicionar botão de cancelar para mensagens enviadas (apenas para mensagens locais não enviadas)
    // Para mensagens do Firebase, o cancelamento seria feito no servidor
    if (isSent && isLocal) {
        console.log('🗑️ Criando botão de cancelar para mensagem local');
        const cancelButton = document.createElement('button');
        cancelButton.innerHTML = '<img src="./imgs/cancelar.png" alt="Cancelar" style="width: 16px; height: 16px;">';
        cancelButton.style.cssText = `
            background: transparent;
            border: none;
            cursor: pointer;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
            flex-shrink: 0;
            margin-left: 8px;
            position: relative;
            z-index: 10;
        `;

        // Função de cancelamento isolada
        const cancelMessage = (e) => {
            // Parar TODOS os eventos imediatamente
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();

            // Parar o áudio se estiver tocando
            if (currentPlayingAudio) {
                currentPlayingAudio.pause();
                currentPlayingAudio.currentTime = 0;
                currentPlayingAudio = null;
            }

            // Remover a mensagem de áudio
            const messageElement = cancelButton.closest('.message');
            if (messageElement) {
                messageElement.remove();
            }

            // Retornar false para garantir que nenhum outro handler seja executado
            return false;
        };

        // Remover qualquer event listener existente primeiro
        cancelButton.removeEventListener('click', cancelMessage);
        cancelButton.removeEventListener('touchend', cancelMessage);

        // Adicionar event listeners com prioridade máxima
        cancelButton.addEventListener('click', cancelMessage, { capture: true, passive: false });
        cancelButton.addEventListener('touchend', cancelMessage, { capture: true, passive: false });

        // Impedir que cliques no botão se propaguem para outros elementos
        cancelButton.addEventListener('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            return false;
        }, { passive: false });

        cancelButton.addEventListener('touchstart', (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            return false;
        }, { passive: false });

        // Também bloquear outros tipos de eventos
        cancelButton.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            return false;
        }, { passive: false });

        cancelButton.addEventListener('pointerup', (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            return false;
        }, { passive: false });

        audioContainer.appendChild(cancelButton);
        console.log('✅ Botão de cancelar adicionado ao container');
    } else {
        console.log('ℹ️ Botão de cancelar NÃO criado - isSent:', isSent, 'isLocal:', isLocal);
    }

    // Timestamp dentro do balão (estilo WhatsApp)
    const timeSpan = document.createElement('span');
    timeSpan.className = 'message-time';
    timeSpan.textContent = messageData.dataEnvio ?
        new Date(messageData.dataEnvio.seconds * 1000).toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit'
        }) :
        formatTime(new Date());
    timeSpan.style.cssText = `
        display: block;
        font-size: 11px;
        color: ${isSent ? 'rgba(255,255,255,0.7)' : '#64748b'};
        margin-top: 4px;
        text-align: right;
        align-self: flex-end;
    `;

    // Adicionar timestamp dentro do container de áudio
    audioContainer.appendChild(timeSpan);

    // Adicionar o player diretamente ao contentDiv (integrado ao balão)
    contentDiv.appendChild(audioContainer);

    messageDiv.appendChild(contentDiv);

    return messageDiv;
}

// Função para adicionar mensagem de áudio à interface
function addAudioMessageToUI(audioUrl, audioSize, type = 'sent', isLocal = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type} audio-message`;

    // Marcar como mensagem local pendente se for local
    if (isLocal) {
        messageDiv.setAttribute('data-local-pending', 'true');
        console.log('🎤 Marcando mensagem como local pendente');
    }

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';

    // Criar container para o player de áudio estilo WhatsApp
    const audioContainer = document.createElement('div');
    audioContainer.className = 'audio-message-container';
    audioContainer.style.cssText = `
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 16px;
        background: rgba(255,255,255,0.1);
        border-radius: 12px;
        margin-bottom: 4px;
        min-width: 200px;
        max-width: 280px;
    `;

    // Botão play/pause (sem background)
    const playButton = document.createElement('button');
    playButton.className = 'audio-play-btn';
    playButton.innerHTML = '<img src="./imgs/play.png" alt="Play" style="width: 20px; height: 20px;">';
    playButton.style.cssText = `
        background: transparent;
        border: none;
        cursor: pointer;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
        flex-shrink: 0;
    `;

    // Barra de progresso
    const progressContainer = document.createElement('div');
    progressContainer.className = 'audio-progress-container';
    progressContainer.style.cssText = `
        flex: 1;
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
    `;

    const progressBar = document.createElement('div');
    progressBar.className = 'audio-progress-bar';
    progressBar.style.cssText = `
        flex: 1;
        height: 3px;
        background: rgba(255,255,255,0.3);
        border-radius: 2px;
        position: relative;
        overflow: hidden;
    `;

    const progressFill = document.createElement('div');
    progressFill.className = 'audio-progress-fill';
    progressFill.style.cssText = `
        height: 100%;
        background: #fff;
        border-radius: 2px;
        width: 0%;
        transition: width 0.1s ease;
    `;

    progressBar.appendChild(progressFill);

    // Tempo decorrido/total
    const timeDisplay = document.createElement('span');
    timeDisplay.className = 'audio-time-display';
    timeDisplay.textContent = '0:00';
    timeDisplay.style.cssText = `
        font-size: 12px;
        color: rgba(255,255,255,0.8);
        font-variant-numeric: tabular-nums;
        min-width: 35px;
        text-align: center;
    `;

    progressContainer.appendChild(progressBar);
    progressContainer.appendChild(timeDisplay);

    // Elemento de áudio oculto
    const audioElement = document.createElement('audio');
    audioElement.src = audioUrl;
    audioElement.style.display = 'none';

    // Informações do áudio
    const audioInfo = document.createElement('div');
    audioInfo.className = 'audio-info';
    audioInfo.style.cssText = `
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 2px;
    `;

    // Duração estimada baseada no tamanho do arquivo
    const sizeKB = audioSize / 1024;
    const estimatedDuration = sizeKB > 0 ? Math.max(1, Math.round(sizeKB / 32)) : 0;

    const durationText = document.createElement('span');
    durationText.className = 'audio-duration';
    durationText.textContent = estimatedDuration > 0 ? `${estimatedDuration}s` : '';
    durationText.style.cssText = `
        font-size: 11px;
        color: rgba(255,255,255,0.6);
    `;

    // Ícone de áudio
    const audioIcon = document.createElement('span');
    audioIcon.textContent = 'Audio';
    audioIcon.style.cssText = `
        font-size: 14px;
        color: rgba(255,255,255,0.8);
    `;

    audioInfo.appendChild(durationText);
    audioInfo.appendChild(audioIcon);

    // Montar o container
    audioContainer.appendChild(playButton);
    audioContainer.appendChild(progressContainer);
    audioContainer.appendChild(audioInfo);
    audioContainer.appendChild(audioElement);

    // Funcionalidade do player
    let isPlaying = false;

    playButton.addEventListener('click', () => {
        if (isPlaying) {
            audioElement.pause();
            playButton.innerHTML = '<img src="./imgs/play.png" alt="Play" style="width: 20px; height: 20px;">';
        } else {
            audioElement.play();
            playButton.innerHTML = '<img src="./imgs/pause.png" alt="Pause" style="width: 20px; height: 20px;">';
        }
    });

    audioElement.addEventListener('play', () => {
        isPlaying = true;
        playButton.innerHTML = '<img src="./imgs/pause.png" alt="Pause" style="width: 20px; height: 20px;">';
        playButton.style.background = 'transparent';
    });

    audioElement.addEventListener('pause', () => {
        isPlaying = false;
        playButton.innerHTML = '<img src="./imgs/play.png" alt="Play" style="width: 20px; height: 20px;">';
        playButton.style.background = 'transparent';
    });

    audioElement.addEventListener('ended', () => {
        isPlaying = false;
        playButton.innerHTML = '<img src="./imgs/play.png" alt="Play" style="width: 20px; height: 20px;">';
        playButton.style.background = 'transparent';
        progressFill.style.width = '0%';

        // Resetar para o início e mostrar tempo total
        audioElement.currentTime = 0;
        const totalMinutes = Math.floor(audioElement.duration / 60);
        const totalSeconds = Math.floor(audioElement.duration % 60);
        timeDisplay.textContent = `0:00 / ${totalMinutes}:${totalSeconds.toString().padStart(2, '0')}`;
    });

    audioElement.addEventListener('timeupdate', () => {
        if (audioElement.duration && !isNaN(audioElement.duration) && isFinite(audioElement.duration) && audioElement.duration > 0) {
            const progress = (audioElement.currentTime / audioElement.duration) * 100;
            if (!isNaN(progress) && progress >= 0 && progress <= 100) {
                progressFill.style.width = `${progress}%`;
            }

            // Atualização do tempo decorrido e total
            const currentMinutes = Math.floor(audioElement.currentTime / 60);
            const currentSeconds = Math.floor(audioElement.currentTime % 60);
            const totalMinutes = Math.floor(audioElement.duration / 60);
            const totalSeconds = Math.floor(audioElement.duration % 60);

            timeDisplay.textContent = `${currentMinutes}:${currentSeconds.toString().padStart(2, '0')} / ${totalMinutes}:${totalSeconds.toString().padStart(2, '0')}`;
        }
    });

    audioElement.addEventListener('loadedmetadata', () => {
        if (audioElement.duration && !isNaN(audioElement.duration) && isFinite(audioElement.duration)) {
            const totalMinutes = Math.floor(audioElement.duration / 60);
            const totalSeconds = Math.floor(audioElement.duration % 60);
            timeDisplay.textContent = `0:00 / ${totalMinutes}:${totalSeconds.toString().padStart(2, '0')}`;
        } else {
            timeDisplay.textContent = '0:00 / 0:00';
        }
    });

    // Permitir clique na barra de progresso para avançar
    progressContainer.addEventListener('click', (e) => {
        const rect = progressBar.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const percentage = clickX / rect.width;
        const newTime = percentage * audioElement.duration;

        if (!isNaN(newTime) && isFinite(newTime)) {
            audioElement.currentTime = newTime;
        }
    });

    // Adicionar botão de cancelar para mensagens enviadas (apenas para mensagens locais não enviadas)
    // Para mensagens do Firebase, o cancelamento seria feito no servidor
    if (type === 'sent' && isLocal) {
        console.log('🗑️ Criando botão de cancelar para mensagem local');
        const cancelButton = document.createElement('button');
        cancelButton.innerHTML = '<img src="./imgs/cancelar.png" alt="Cancelar" style="width: 16px; height: 16px;">';
        cancelButton.style.cssText = `
            background: transparent;
            border: none;
            cursor: pointer;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
            flex-shrink: 0;
            margin-left: 8px;
            position: relative;
            z-index: 10;
        `;

        // Função de cancelamento isolada
        const cancelMessage = (e) => {
            console.log('🗑️ Botão de cancelar clicado - INÍCIO');

            // Parar TODOS os eventos imediatamente
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();

            console.log('🗑️ Botão de cancelar clicado - cancelando mensagem de áudio local');

            // Parar o áudio se estiver tocando
            if (currentPlayingAudio) {
                currentPlayingAudio.pause();
                currentPlayingAudio.currentTime = 0;
                currentPlayingAudio = null;
            }

            // Remover a mensagem de áudio
            const messageElement = cancelButton.closest('.message');
            if (messageElement) {
                messageElement.remove();
                console.log('✅ Mensagem de áudio removida da interface');
            } else {
                console.error('❌ Não foi possível encontrar o elemento da mensagem para remover');
            }

            // Retornar false para garantir que nenhum outro handler seja executado
            return false;
        };

        // Remover qualquer event listener existente primeiro
        cancelButton.removeEventListener('click', cancelMessage);
        cancelButton.removeEventListener('touchend', cancelMessage);

        // Adicionar event listeners com prioridade máxima
        cancelButton.addEventListener('click', cancelMessage, { capture: true, passive: false });
        cancelButton.addEventListener('touchend', cancelMessage, { capture: true, passive: false });

        // Impedir que cliques no botão se propaguem para outros elementos
        cancelButton.addEventListener('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            return false;
        }, { passive: false });

        cancelButton.addEventListener('touchstart', (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            return false;
        }, { passive: false });

        // Também bloquear outros tipos de eventos
        cancelButton.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            return false;
        }, { passive: false });

        cancelButton.addEventListener('pointerup', (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            return false;
        }, { passive: false });

        audioContainer.appendChild(cancelButton);
        console.log('✅ Botão de cancelar adicionado ao container');
    } else {
        console.log('ℹ️ Botão de cancelar NÃO criado - type:', type, 'isLocal:', isLocal);
    }

    // Timestamp separado (fora do balão) - igual às outras mensagens
    const timeSpan = document.createElement('span');
    timeSpan.className = 'message-time';
    timeSpan.textContent = formatTime(new Date());
    timeSpan.style.cssText = `
        display: block;
        font-size: 11px;
        color: #64748b;
        margin-top: 4px;
        text-align: ${type === 'sent' ? 'right' : 'left'};
        position: relative;
        z-index: 1;
        clear: both;
        float: none;
    `;

    // Adicionar o player diretamente ao contentDiv (integrado ao balão)
    contentDiv.appendChild(audioContainer);

    messageDiv.appendChild(contentDiv);
    messageDiv.appendChild(timeSpan);

    // Adicionar à área de mensagens
    const messagesArea = document.getElementById('messagesArea');
    messagesArea.appendChild(messageDiv);

    // Scroll para o final
    scrollToBottom();
}

// Função para ajustar input quando teclado aparece/some
function adjustInputForKeyboard() {
    const messageInput = document.getElementById('messageInput');
    const inputContainer = document.querySelector('.message-input-container');

    if (messageInput && inputContainer) {
        // Garantir que o viewport meta tag esteja configurado corretamente
        ensureViewportMetaTag();

        // Variáveis para controlar o estado do teclado
        let keyboardVisible = false;
        let originalViewportHeight = window.innerHeight;
        let keyboardCheckInterval = null;

        // Função para detectar se o teclado está visível (múltiplas estratégias)
        function isKeyboardVisible() {
            // Estratégia 1: window.innerHeight
            const currentHeight = window.innerHeight;
            const heightDifference = originalViewportHeight - currentHeight;
            console.log('📏 Estratégia 1 - Altura atual:', currentHeight, 'Diferença:', heightDifference);

            // Estratégia 2: document.documentElement.clientHeight
            const clientHeight = document.documentElement.clientHeight;
            const clientDifference = originalViewportHeight - clientHeight;
            console.log('📏 Estratégia 2 - Client height:', clientHeight, 'Diferença:', clientDifference);

            // Estratégia 3: visualViewport API (se disponível)
            let visualViewportDifference = 0;
            if (window.visualViewport) {
                const visualHeight = window.visualViewport.height;
                visualViewportDifference = originalViewportHeight - visualHeight;
                console.log('📏 Estratégia 3 - Visual viewport:', visualHeight, 'Diferença:', visualViewportDifference);
            }

            // Estratégia 4: Comparar com altura esperada (mais conservadora)
            const minDifference = Math.max(heightDifference, clientDifference, visualViewportDifference || 0);

            console.log('📏 Diferença máxima detectada:', minDifference);

            // Considerar teclado visível se qualquer diferença for maior que 50px (ainda mais sensível)
            return minDifference > 50;
        }

        // Função para ajustar posição do input baseado no teclado
        function adjustInputPosition() {
            const keyboardVisibleNow = isKeyboardVisible();

            if (keyboardVisibleNow && !keyboardVisible) {
                // Teclado apareceu
                console.log('⌨️ Teclado apareceu - ajustando posição');
                keyboardVisible = true;
                inputContainer.classList.add('keyboard-active');

                // Scroll mais agressivo para manter o input visível
                setTimeout(() => {
                    // Primeiro tentar scrollIntoView
                    messageInput.scrollIntoView({
                        behavior: 'smooth',
                        block: 'center',
                        inline: 'nearest'
                    });

                    // Depois de um delay, tentar scroll adicional se necessário
                    setTimeout(() => {
                        const inputRect = messageInput.getBoundingClientRect();
                        const viewportHeight = window.innerHeight;

                        // Se o input não estiver completamente visível, fazer scroll adicional
                        if (inputRect.bottom > viewportHeight - 50) {
                            const scrollAmount = inputRect.bottom - (viewportHeight - 50);
                            console.log('📜 Scroll adicional necessário:', scrollAmount);
                            window.scrollBy({
                                top: scrollAmount,
                                behavior: 'smooth'
                            });
                        }
                    }, 500);
                }, 200);

            } else if (!keyboardVisibleNow && keyboardVisible) {
                // Teclado desapareceu
                console.log('⌨️ Teclado desapareceu - restaurando posição');
                keyboardVisible = false;
                inputContainer.classList.remove('keyboard-active');
            }
        }

        // Quando o input ganha foco
        messageInput.addEventListener('focus', function(e) {
            console.log('📝 Input ganhou foco');

            // Para dispositivos Android WebView, forçar ajuste imediato
            inputContainer.classList.add('keyboard-active');

            // Scroll forçado para garantir visibilidade
            setTimeout(() => {
                // Tentar scrollIntoView primeiro
                messageInput.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center',
                    inline: 'nearest'
                });

                // Scroll adicional para garantir que fique acima do teclado
                setTimeout(() => {
                    const inputRect = messageInput.getBoundingClientRect();
                    const viewportHeight = window.innerHeight;

                    // Em dispositivos móveis, garantir que o input fique na parte superior
                    if (inputRect.bottom > viewportHeight * 0.7) {
                        const scrollAmount = inputRect.bottom - (viewportHeight * 0.6);
                        console.log('📜 Scroll forçado para input:', scrollAmount);
                        window.scrollBy({
                            top: scrollAmount,
                            behavior: 'smooth'
                        });
                    }
                }, 300);

                // Pequeno delay para verificar se o teclado realmente apareceu
                setTimeout(() => {
                    adjustInputPosition();

                    // Iniciar monitoramento contínuo da altura da viewport
                    if (keyboardCheckInterval) {
                        clearInterval(keyboardCheckInterval);
                    }

                    keyboardCheckInterval = setInterval(adjustInputPosition, 200); // Menos frequente

                    // Parar monitoramento após 3 segundos
                    setTimeout(() => {
                        if (keyboardCheckInterval) {
                            clearInterval(keyboardCheckInterval);
                            keyboardCheckInterval = null;
                        }
                    }, 3000);
                }, 500);
            }, 100);
        });

        // Quando o input perde foco
        messageInput.addEventListener('blur', function(e) {
            console.log('📝 Input perdeu foco');

            // Pequeno delay antes de considerar que o teclado desapareceu
            setTimeout(() => {
                if (!isKeyboardVisible()) {
                    keyboardVisible = false;
                    inputContainer.classList.remove('keyboard-active');
                    console.log('⌨️ Teclado confirmado como oculto');
                }
            }, 200);
        });

        // Detectar mudanças na orientação da tela
        window.addEventListener('orientationchange', function() {
            console.log('📱 Orientação mudou - recalculando viewport');
            // Recalcular altura original após mudança de orientação
            setTimeout(() => {
                originalViewportHeight = window.innerHeight;
                adjustInputPosition();
            }, 500);
        });

        // Detectar redimensionamento da janela (útil para desktop)
        window.addEventListener('resize', function() {
            // Só ajustar se não for uma mudança muito pequena (evitar flickering)
            const heightDiff = Math.abs(window.innerHeight - originalViewportHeight);
            if (heightDiff > 50) {
                console.log('📏 Janela redimensionada - ajustando posição');
                originalViewportHeight = window.innerHeight;
                adjustInputPosition();
            }
        });

        // Detectar toques fora do input para forçar blur
        document.addEventListener('touchstart', function(e) {
            // Verificar se o toque foi fora do input e do container
            const isOutsideInput = !messageInput.contains(e.target);
            const isOutsideContainer = !inputContainer.contains(e.target);

            if (isOutsideInput && isOutsideContainer) {
                console.log('👆 Toque fora do input - forçando blur');
                messageInput.blur();

                // Garantir que o teclado seja ocultado
                setTimeout(() => {
                    if (!isKeyboardVisible()) {
                        keyboardVisible = false;
                        inputContainer.classList.remove('keyboard-active');
                    }
                }, 300);
            }
        }, { passive: true });

        // Detectar quando a página perde/ganha foco (útil para alguns dispositivos)
        document.addEventListener('visibilitychange', function() {
            if (document.hidden) {
                console.log('📱 Página ficou oculta - resetando estado do teclado');
                keyboardVisible = false;
                inputContainer.classList.remove('keyboard-active');
                if (keyboardCheckInterval) {
                    clearInterval(keyboardCheckInterval);
                    keyboardCheckInterval = null;
                }
            } else {
                console.log('📱 Página ficou visível - recalculando viewport');
                // Recalcular altura quando a página volta ao foco
                setTimeout(() => {
                    originalViewportHeight = window.innerHeight;
                }, 100);
            }
        });

        console.log('⌨️ Ajuste de teclado configurado');
    }
}

// Função para garantir que o viewport meta tag esteja configurado corretamente
function ensureViewportMetaTag() {
    // Verificar se já existe um viewport meta tag
    let viewportMeta = document.querySelector('meta[name="viewport"]');

    if (!viewportMeta) {
        // Criar viewport meta tag se não existir
        viewportMeta = document.createElement('meta');
        viewportMeta.name = 'viewport';
        document.head.appendChild(viewportMeta);
        console.log('📱 Viewport meta tag criado');
    }

    // Configurar viewport para melhor compatibilidade com teclados virtuais
    viewportMeta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';
    console.log('📱 Viewport configurado para melhor compatibilidade com teclado');
}

// Função para lidar com anexo
function handleAttachment() {
    console.log('🎴 Abrindo seletor de imagens...');

    // Verificar se há uma conversa ativa
    if (!currentConversation) {
        console.log('⚠️ Nenhuma conversa ativa para enviar imagem');
        alert('Abra uma conversa primeiro para enviar imagens.');
        return;
    }

    // Verificar se estamos no Android WebView
    if (window.Android && window.Android.selectMessageImage) {
        console.log('📱 Usando interface nativa do Android para seleção de imagem');
        try {
            window.Android.selectMessageImage();
        } catch (error) {
            console.error('❌ Erro ao chamar interface nativa:', error);
            alert('Erro ao abrir galeria. Tente novamente.');
        }
    } else {
        console.log('💻 Usando seletor HTML padrão');

        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.multiple = false; // Apenas uma imagem por vez
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (file) {
                console.log('📸 Imagem selecionada:', file.name, '(', (file.size / 1024).toFixed(1), 'KB )');

                // Validar tamanho do arquivo (máximo 5MB)
                if (file.size > 5 * 1024 * 1024) {
                    alert('Imagem muito grande. Máximo 5MB.');
                    return;
                }

                // Validar tipo do arquivo
                if (!file.type.startsWith('image/')) {
                    alert('Por favor, selecione apenas arquivos de imagem.');
                    return;
                }

                try {
                    // Converter para base64
                    const base64Data = await fileToBase64(file);
                    console.log('📦 Imagem convertida para base64');

                    // Mostrar modal de imagem em vez de enviar diretamente
                    showImageSelectionModal(base64Data, file.type);

                } catch (error) {
                    console.error('❌ Erro ao processar imagem:', error);
                    alert('Erro ao processar imagem. Tente novamente.');
                }
            }
        };
        input.click();
    }
}

// Função para converter arquivo para base64
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            // Extrair apenas a parte base64 (remover "data:image/...;base64,")
            const base64 = reader.result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Função para enviar mensagem de imagem
async function sendImageMessage(base64Data, mimeType, fileName) {
    if (!currentConversation) {
        console.error('❌ Nenhuma conversa ativa para enviar imagem');
        return;
    }

    try {
        console.log('📤 Enviando imagem...');

        // Enviar mensagem via Firebase
        if (firebaseEnabled && window.enviarMensagemImagem) {
            await window.enviarMensagemImagem(currentConversation.id, base64Data, mimeType, fileName);
            console.log('✅ Imagem enviada com sucesso');

            // Recarregar mensagens para mostrar a nova mensagem de imagem
            await loadConversationMessages(currentConversation.id);
        } else {
            console.log('📱 Firebase não disponível, simulando envio local');
            // Para modo local, adicionar diretamente
            addImageMessageToUI(base64Data, mimeType, 'sent');
        }

    } catch (error) {
        console.error('❌ Erro ao enviar imagem:', error);
        alert('Erro ao enviar imagem. Tente novamente.');
    }
}

// Função para criar elemento de mensagem de imagem
function createImageMessageElement(messageData, currentUserId) {
    const messageDiv = document.createElement('div');
    const isSent = messageData.remetenteId === currentUserId;
    messageDiv.className = `message ${isSent ? 'sent' : 'received'}`;

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';

    // Criar container para a imagem com largura máxima controlada
    const imageContainer = document.createElement('div');
    imageContainer.style.cssText = `
        display: flex;
        flex-direction: column;
        gap: 4px;
        align-items: ${isSent ? 'flex-end' : 'flex-start'};
        max-width: 250px;
    `;

    // Elemento de imagem com largura máxima controlada
    const imgElement = document.createElement('img');
    if (messageData.imagemBase64 && messageData.imagemMimeType) {
        imgElement.src = `data:${messageData.imagemMimeType};base64,${messageData.imagemBase64}`;
    }
    imgElement.className = 'message-image';
    imgElement.style.cssText = `
        max-width: 250px;
        max-height: 200px;
        border-radius: 12px;
        cursor: pointer;
        transition: transform 0.2s ease;
        object-fit: cover;
        width: auto;
        height: auto;
    `;

    // Adicionar evento de clique para visualizar imagem em tamanho maior
    imgElement.addEventListener('click', () => {
        showImageModal(imgElement.src);
    });

    // Timestamp igual às outras mensagens
    const timeSpan = document.createElement('span');
    timeSpan.className = 'message-time';
    timeSpan.textContent = messageData.dataEnvio ?
        new Date(messageData.dataEnvio.seconds * 1000).toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit'
        }) :
        formatTime(new Date());

    imageContainer.appendChild(imgElement);
    imageContainer.appendChild(timeSpan);
    contentDiv.appendChild(imageContainer);
    messageDiv.appendChild(contentDiv);

    return messageDiv;
}

// Função para adicionar mensagem de imagem à interface
function addImageMessageToUI(base64Data, mimeType, type = 'sent') {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';

    // Criar container para a imagem com largura máxima controlada
    const imageContainer = document.createElement('div');
    imageContainer.style.cssText = `
        display: flex;
        flex-direction: column;
        gap: 4px;
        align-items: ${type === 'sent' ? 'flex-end' : 'flex-start'};
        max-width: 250px;
    `;

    // Elemento de imagem com largura máxima controlada
    const imgElement = document.createElement('img');
    imgElement.src = `data:${mimeType};base64,${base64Data}`;
    imgElement.className = 'message-image';
    imgElement.style.cssText = `
        max-width: 250px;
        max-height: 200px;
        border-radius: 12px;
        cursor: pointer;
        transition: transform 0.2s ease;
        object-fit: cover;
        width: auto;
        height: auto;
    `;

    // Adicionar evento de clique para visualizar imagem em tamanho maior
    imgElement.addEventListener('click', () => {
        showImageModal(imgElement.src);
    });

    // Timestamp igual às outras mensagens
    const timeSpan = document.createElement('span');
    timeSpan.className = 'message-time';
    timeSpan.textContent = formatTime(new Date());

    imageContainer.appendChild(imgElement);
    imageContainer.appendChild(timeSpan);
    contentDiv.appendChild(imageContainer);
    messageDiv.appendChild(contentDiv);

    // Adicionar à área de mensagens
    const messagesArea = document.getElementById('messagesArea');
    messagesArea.appendChild(messageDiv);

    // Scroll para o final
    scrollToBottom();
}

// Função para mostrar modal de imagem em tamanho maior
function showImageModal(imageSrc) {
    // Criar modal de imagem
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.9);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        cursor: pointer;
    `;

    const img = document.createElement('img');
    img.src = imageSrc;
    img.style.cssText = `
        max-width: 90vw;
        max-height: 90vh;
        object-fit: contain;
        border-radius: 8px;
    `;

    modal.appendChild(img);

    // Fechar modal ao clicar
    modal.addEventListener('click', () => {
        modal.remove();
    });

    document.body.appendChild(modal);
}

// Verificar integração Firebase
function checkFirebaseIntegration() {
    try {
        const hasFirebase = typeof window.firebase !== 'undefined';
        const hasDb = typeof window.db !== 'undefined';
        const hasConversasFunc = typeof window.buscarConversasUsuario === 'function';
        const hasMensagensFunc = typeof window.buscarMensagensConversa === 'function';
        const hasEnviarMensagemFunc = typeof window.enviarMensagem === 'function';
        const hasEnviarAudioFunc = typeof window.enviarMensagemAudio === 'function';
        const hasEnviarImagemFunc = typeof window.enviarMensagemImagem === 'function';

        firebaseEnabled = hasFirebase && hasDb && hasConversasFunc && hasMensagensFunc && hasEnviarMensagemFunc && hasEnviarAudioFunc && hasEnviarImagemFunc;
        console.log('💬 Firebase para mensagens:', firebaseEnabled ? 'Ativo' : 'Inativo');
        console.log('   - Firebase:', hasFirebase);
        console.log('   - Firestore:', hasDb);
        console.log('   - buscarConversasUsuario:', hasConversasFunc);
        console.log('   - buscarMensagensConversa:', hasMensagensFunc);
        console.log('   - enviarMensagem:', hasEnviarMensagemFunc);
        console.log('   - enviarMensagemAudio:', hasEnviarAudioFunc);
        console.log('   - enviarMensagemImagem:', hasEnviarImagemFunc);

        // Teste adicional do Firebase
        if (hasDb && window.db) {
            console.log('🔥 Testando conexão com Firestore...');
            try {
                // Tentar uma operação simples para verificar se o Firestore está funcionando
                const testRef = window.db.collection('test').doc('connection');
                console.log('🔥 Firestore reference criado:', testRef.path);
            } catch (testError) {
                console.error('🔥 Erro no teste do Firestore:', testError);
            }
        }
    } catch (e) {
        firebaseEnabled = false;
        console.error('❌ Erro na verificação Firebase para mensagens:', e);
    }
}

// Função para determinar tipo de usuário e carregar conversas apropriadas
function initializeMessagesPage() {
    console.log('💬 Inicializando página de mensagens...');

    // Garantir que estamos na tela inicial (lista de conversas)
    ensureConversationsScreenVisible();

    // Verificar Firebase
    checkFirebaseIntegration();

    const userDataRaw = localStorage.getItem("user");
    if (!userDataRaw) {
        console.log("Nenhum dado de usuário encontrado");
        return;
    }

    const userData = JSON.parse(userDataRaw);
    userType = userData.tipoUsuario || userData.tipo;

    console.log("Tipo de usuário:", userType);

    // Verificar se há uma conversa específica para abrir
    const conversaAberta = localStorage.getItem('conversaAberta');
    if (conversaAberta) {
        console.log('💬 Conversa específica para abrir:', conversaAberta);
        localStorage.removeItem('conversaAberta'); // Limpar para não abrir novamente
        // Carregar conversas primeiro, depois abrir a conversa específica
        loadConversations().then(() => {
            openConversation(conversaAberta);
        });
    } else {
        // Carregar conversas normalmente
        loadConversations();
    }

    // Verificar se deve mostrar aba de mensagens
    checkMessagesAvailability();
}

// Função para verificar se mensagens devem estar disponíveis
function checkMessagesAvailability() {
    // Em produção, verificar se há negociações/pedidos em andamento
    // Por enquanto, sempre mostrar (para demonstração)
    const messagesTab = document.querySelector('.bottom-nav .nav-btn:nth-child(3)');
    if (messagesTab) {
        messagesTab.style.display = 'block';
    }
}

// Função para carregar conversas do Firebase
async function loadConversations() {
    console.log('💬 Carregando conversas do Firebase...');

    try {
        if (firebaseEnabled && window.buscarConversasUsuario) {
            const firebaseConversas = await window.buscarConversasUsuario();
            console.log('💬 Conversas recebidas do Firebase:', firebaseConversas ? firebaseConversas.length : 0, 'conversas');

            if (firebaseConversas && firebaseConversas.length > 0) {
                // Buscar status real dos pedidos
                const userDataRaw = localStorage.getItem("user");
                const userData = userDataRaw ? JSON.parse(userDataRaw) : {};
                const currentUserId = userData.id;
                const userType = userData.tipoUsuario || userData.tipo;

                let pedidosStatus = {};
                try {
                    // Buscar status dos pedidos dependendo do tipo de usuário
                    if (userType === 'Paneleiro' || userType === 'paneleiro') {
                        if (window.buscarSolicitacoesPaneleiro && currentUserId) {
                            const solicitacoes = await window.buscarSolicitacoesPaneleiro(currentUserId);
                            solicitacoes.forEach(sol => {
                                pedidosStatus[sol.id] = sol.status;
                            });
                        }
                    } else {
                        if (window.buscarSolicitacoesCliente && currentUserId) {
                            const solicitacoes = await window.buscarSolicitacoesCliente(currentUserId);
                            solicitacoes.forEach(sol => {
                                pedidosStatus[sol.id] = sol.status;
                            });
                        }
                    }
                } catch (statusError) {
                    console.warn('⚠️ Erro ao buscar status dos pedidos:', statusError);
                }

                // Mapear para o formato esperado pela interface
                conversations = firebaseConversas.map(conversa => {
                    // Determinar se o usuário atual é cliente ou paneleiro nesta conversa
                    const isCliente = conversa.tipoUsuario === 'cliente';

                    // Determinar status online/offline baseado na última atividade
                    let status = 'Offline';
                    if (conversa.ultimaMensagemData) {
                        const ultimaAtividade = new Date(conversa.ultimaMensagemData.seconds * 1000);
                        const agora = new Date();
                        const diffMinutos = (agora - ultimaAtividade) / (1000 * 60);

                        // Considerar online se atividade nos últimos 5 minutos
                        if (diffMinutos <= 5) {
                            status = 'Online';
                        } else if (diffMinutos <= 60) {
                            status = 'Ausente'; // Ausente se atividade na última hora
                        }
                    }

                    // Obter status real do pedido
                    const pedidoStatus = pedidosStatus[conversa.pedidoId] || conversa.status || 'Ativa';

                    return {
                        id: conversa.id,
                        name: isCliente ? conversa.paneleiroNome : conversa.clienteNome,
                        avatar: isCliente ? conversa.paneleiroFoto : conversa.clienteFoto,
                        lastMessage: conversa.ultimaMensagem || 'Nenhuma mensagem ainda',
                        lastMessageTime: conversa.ultimaMensagemData ?
                            formatRelativeTime(new Date(conversa.ultimaMensagemData.seconds * 1000)) :
                            'Agora',
                        status: status,
                        pedidoId: conversa.pedidoId,
                        orderId: conversa.pedidoId,
                        orderStatus: pedidoStatus,
                        tipoUsuario: conversa.tipoUsuario
                    };
                });

                console.log('💬 Conversas mapeadas com sucesso:', conversations.length);
            } else {
                console.log('⚠️ Nenhuma conversa encontrada no Firebase');
                conversations = [];
            }
        } else {
            console.log('💬 Firebase não disponível para buscar conversas');
            conversations = [];
        }
    } catch (error) {
        console.error('❌ Erro ao carregar conversas:', error.message);
        conversations = [];
    }

    renderConversationsList();

    // Iniciar listener em tempo real para novas conversas
    startConversationsListener();
}

// Função para iniciar listener em tempo real para conversas
function startConversationsListener() {
    console.log('🔄 Iniciando listener em tempo real para conversas...');

    // Parar listener anterior se existir
    if (conversationsListener) {
        conversationsListener();
        conversationsListener = null;
    }

    // Obter dados do usuário atual
    const userDataRaw = localStorage.getItem("user");
    if (!userDataRaw) {
        console.log('⚠️ Nenhum dado de usuário encontrado para listener de conversas');
        return;
    }

    const userData = JSON.parse(userDataRaw);
    const currentUserId = userData.id;

    if (!currentUserId) {
        console.log('⚠️ ID do usuário não encontrado para listener de conversas');
        return;
    }

    // Iniciar novo listener
    if (firebaseEnabled && window.db) {
        conversationsListener = window.db.collection("conversas")
            .where("participantes", "array-contains", currentUserId)
            .orderBy("ultimaMensagemData", "desc")
            .onSnapshot(async (snapshot) => {
                console.log('📡 Listener de conversas recebeu atualização:', snapshot.docChanges().length, 'mudanças');

                // Processar mudanças
                for (const change of snapshot.docChanges()) {
                    const conversaData = { id: change.doc.id, ...change.doc.data() };
                    console.log('💬 Mudança na conversa:', change.type, conversaData.id);

                    if (change.type === "added") {
                        // Nova conversa adicionada
                        console.log('➕ Nova conversa detectada:', conversaData.id);

                        // Verificar se já existe na lista
                        const existingConversation = conversations.find(c => c.id === conversaData.id);
                        if (!existingConversation) {
                            // Buscar status do pedido para nova conversa
                            let pedidoStatus = conversaData.status || 'Ativa';
                            try {
                                const userDataRaw = localStorage.getItem("user");
                                const userData = userDataRaw ? JSON.parse(userDataRaw) : {};
                                const currentUserId = userData.id;
                                const userType = userData.tipoUsuario || userData.tipo;

                                if (userType === 'Paneleiro' || userType === 'paneleiro') {
                                    if (window.buscarSolicitacoesPaneleiro && currentUserId && conversaData.pedidoId) {
                                        const solicitacoes = await window.buscarSolicitacoesPaneleiro(currentUserId);
                                        const pedido = solicitacoes.find(s => s.id === conversaData.pedidoId);
                                        if (pedido) {
                                            pedidoStatus = pedido.status;
                                        }
                                    }
                                } else {
                                    if (window.buscarSolicitacoesCliente && currentUserId && conversaData.pedidoId) {
                                        const solicitacoes = await window.buscarSolicitacoesCliente(currentUserId);
                                        const pedido = solicitacoes.find(s => s.id === conversaData.pedidoId);
                                        if (pedido) {
                                            pedidoStatus = pedido.status;
                                        }
                                    }
                                }
                            } catch (statusError) {
                                console.warn('⚠️ Erro ao buscar status do pedido para nova conversa:', statusError);
                            }

                            // Mapear para o formato da interface
                            const isCliente = conversaData.tipoUsuario === 'cliente';

                            let status = 'Offline';
                            if (conversaData.ultimaMensagemData) {
                                const ultimaAtividade = new Date(conversaData.ultimaMensagemData.seconds * 1000);
                                const agora = new Date();
                                const diffMinutos = (agora - ultimaAtividade) / (1000 * 60);

                                if (diffMinutos <= 5) {
                                    status = 'Online';
                                } else if (diffMinutos <= 60) {
                                    status = 'Ausente';
                                }
                            }

                            const newConversation = {
                                id: conversaData.id,
                                name: isCliente ? conversaData.paneleiroNome : conversaData.clienteNome,
                                avatar: isCliente ? conversaData.paneleiroFoto : conversaData.clienteFoto,
                                lastMessage: conversaData.ultimaMensagem || 'Nenhuma mensagem ainda',
                                lastMessageTime: conversaData.ultimaMensagemData ?
                                    formatRelativeTime(new Date(conversaData.ultimaMensagemData.seconds * 1000)) :
                                    'Agora',
                                status: status,
                                pedidoId: conversaData.pedidoId,
                                orderId: conversaData.pedidoId,
                                orderStatus: pedidoStatus,
                                tipoUsuario: conversaData.tipoUsuario
                            };

                            // Adicionar à lista
                            conversations.unshift(newConversation); // Adicionar no início para aparecer primeiro

                            console.log('✅ Nova conversa adicionada à lista:', newConversation.id, 'orderStatus:', pedidoStatus);
                        }

                    } else if (change.type === "modified") {
                        // Conversa modificada (nova mensagem, status alterado, etc.)
                        console.log('🔄 Conversa modificada:', conversaData.id);

                        const existingIndex = conversations.findIndex(c => c.id === conversaData.id);
                        if (existingIndex !== -1) {
                            // Buscar status atualizado do pedido
                            let pedidoStatus = conversaData.status || 'Ativa';
                            try {
                                const userDataRaw = localStorage.getItem("user");
                                const userData = userDataRaw ? JSON.parse(userDataRaw) : {};
                                const currentUserId = userData.id;
                                const userType = userData.tipoUsuario || userData.tipo;

                                if (userType === 'Paneleiro' || userType === 'paneleiro') {
                                    if (window.buscarSolicitacoesPaneleiro && currentUserId && conversaData.pedidoId) {
                                        const solicitacoes = await window.buscarSolicitacoesPaneleiro(currentUserId);
                                        const pedido = solicitacoes.find(s => s.id === conversaData.pedidoId);
                                        if (pedido) {
                                            pedidoStatus = pedido.status;
                                        }
                                    }
                                } else {
                                    if (window.buscarSolicitacoesCliente && currentUserId && conversaData.pedidoId) {
                                        const solicitacoes = await window.buscarSolicitacoesCliente(currentUserId);
                                        const pedido = solicitacoes.find(s => s.id === conversaData.pedidoId);
                                        if (pedido) {
                                            pedidoStatus = pedido.status;
                                        }
                                    }
                                }
                            } catch (statusError) {
                                console.warn('⚠️ Erro ao buscar status atualizado do pedido:', statusError);
                            }

                            // Atualizar conversa existente
                            const isCliente = conversaData.tipoUsuario === 'cliente';

                            let status = 'Offline';
                            if (conversaData.ultimaMensagemData) {
                                const ultimaAtividade = new Date(conversaData.ultimaMensagemData.seconds * 1000);
                                const agora = new Date();
                                const diffMinutos = (agora - ultimaAtividade) / (1000 * 60);

                                if (diffMinutos <= 5) {
                                    status = 'Online';
                                } else if (diffMinutos <= 60) {
                                    status = 'Ausente';
                                }
                            }

                            conversations[existingIndex] = {
                                id: conversaData.id,
                                name: isCliente ? conversaData.paneleiroNome : conversaData.clienteNome,
                                avatar: isCliente ? conversaData.paneleiroFoto : conversaData.clienteFoto,
                                lastMessage: conversaData.ultimaMensagem || 'Nenhuma mensagem ainda',
                                lastMessageTime: conversaData.ultimaMensagemData ?
                                    formatRelativeTime(new Date(conversaData.ultimaMensagemData.seconds * 1000)) :
                                    'Agora',
                                status: status,
                                pedidoId: conversaData.pedidoId,
                                orderId: conversaData.pedidoId,
                                orderStatus: pedidoStatus,
                                tipoUsuario: conversaData.tipoUsuario
                            };

                            // Reordenar para colocar a conversa modificada no topo
                            const updatedConversation = conversations.splice(existingIndex, 1)[0];
                            conversations.unshift(updatedConversation);

                            console.log('✅ Conversa atualizada:', conversaData.id, 'orderStatus:', pedidoStatus);
                        }

                    } else if (change.type === "removed") {
                        // Conversa removida
                        console.log('🗑️ Conversa removida:', conversaData.id);

                        const existingIndex = conversations.findIndex(c => c.id === conversaData.id);
                        if (existingIndex !== -1) {
                            conversations.splice(existingIndex, 1);
                            console.log('✅ Conversa removida da lista:', conversaData.id);
                        }
                    }
                }

                // Re-renderizar a lista de conversas
                renderConversationsList();

            }, (error) => {
                console.error('❌ Erro no listener de conversas:', error);
            });
    } else {
        console.log('💬 Firebase não disponível para listener de conversas');
    }
}

// Função para parar listener em tempo real de conversas
function stopConversationsListener() {
    if (conversationsListener) {
        console.log('🛑 Parando listener em tempo real de conversas');
        conversationsListener();
        conversationsListener = null;
    }
}

// Função para renderizar lista de conversas
function renderConversationsList() {
    const conversationsList = document.getElementById('conversationsList');
    conversationsList.innerHTML = '';

    if (conversations.length === 0) {
        conversationsList.innerHTML = `
            <div style="padding: 40px; text-align: center; color: #64748b;">
                <p>Nenhuma conversa encontrada</p>
                <small>Conversas aparecerão quando houver negociações em andamento</small>
            </div>
        `;
        return;
    }

    conversations.forEach(conversation => {
        const conversationElement = createConversationElement(conversation);
        conversationsList.appendChild(conversationElement);
    });
}

// Função para criar elemento de conversa estilo WhatsApp
function createConversationElement(conversation) {
    const div = document.createElement('div');
    div.className = 'conversation-item whatsapp-style';
    div.dataset.conversationId = conversation.id;

    // Determinar status online/offline para indicador visual
    const statusClass = conversation.status === 'Online' ? 'online' : 'offline';
    const statusIndicator = conversation.status === 'Online' ? '<div class="status-indicator online"></div>' : '';

    // Truncar última mensagem se for muito longa
    const lastMessage = conversation.lastMessage.length > 50 ?
        conversation.lastMessage.substring(0, 50) + '...' : conversation.lastMessage;

    // Verificar se o pedido está finalizado
    const isFinalizado = conversation.orderStatus === 'concluido';
    const buttonText = isFinalizado ? 'Finalizado' : 'Ver Pedido';
    const buttonClass = isFinalizado ? 'btn-finalizado' : 'btn-ver-pedido';

    div.innerHTML = `
        <div class="conversation-avatar-container">
            <img src="${conversation.avatar || './imgs/perfil.png'}" alt="${conversation.name}" class="conversation-avatar" onerror="this.src='./imgs/perfil.png'">
            ${statusIndicator}
        </div>
        <div class="conversation-content">
            <div class="conversation-header">
                <div class="conversation-name">${conversation.name}</div>
                <div class="conversation-time">${conversation.lastMessageTime}</div>
            </div>
            <div class="conversation-last-message">${lastMessage}</div>
            <div class="conversation-actions">
                <button class="${buttonClass}" data-order-id="${conversation.orderId}" title="${isFinalizado ? 'Serviço finalizado' : 'Ver detalhes do pedido'}">
                    ${buttonText}
                </button>
            </div>
        </div>
    `;

    // Event listener para abrir conversa ao clicar no card (exceto no botão)
    div.addEventListener('click', (e) => {
        if (!e.target.classList.contains('btn-ver-pedido') && !e.target.classList.contains('btn-finalizado') &&
            !e.target.closest('.btn-ver-pedido') && !e.target.closest('.btn-finalizado')) {
            openConversation(conversation.id);
        }
    });

    // Event listener para botão Ver Pedido/Finalizado
    const actionBtn = div.querySelector('.btn-ver-pedido, .btn-finalizado');
    actionBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Evitar que o clique no botão abra a conversa
        viewOrderDetails(conversation.orderId);
    });

    return div;
}

// Função para iniciar listener em tempo real para mensagens
function startMessagesListener(conversationId) {
    console.log('🔄 Iniciando listener em tempo real para conversa:', conversationId);

    // Parar listener anterior se existir
    if (messagesListener) {
        messagesListener();
        messagesListener = null;
    }

    // Iniciar novo listener
    if (firebaseEnabled && window.db) {
        messagesListener = window.db.collection("conversas")
            .doc(conversationId)
            .collection("mensagens")
            .orderBy("dataEnvio", "asc")
            .onSnapshot((snapshot) => {
                console.log('📡 Listener recebeu atualização:', snapshot.docChanges().length, 'mudanças');

                // Obter dados do usuário atual
                const userDataRaw = localStorage.getItem("user");
                const userData = userDataRaw ? JSON.parse(userDataRaw) : {};
                const currentUserId = userData.id;

                // Processar apenas mudanças (novas mensagens)
                snapshot.docChanges().forEach((change) => {
                    if (change.type === "added") {
                        const messageData = { id: change.doc.id, ...change.doc.data() };
                        console.log('📨 Nova mensagem recebida:', messageData.id);

                        // Verificar se a mensagem já existe na interface
                        const existingMessage = document.querySelector(`[data-message-id="${messageData.id}"]`);
                        if (!existingMessage) {
                            // Adicionar nova mensagem à interface
                            addNewMessageToUI(messageData, currentUserId);
                        }
                    }
                });
            }, (error) => {
                console.error('❌ Erro no listener de mensagens:', error);
            });
    }
}

// Função para parar listener em tempo real
function stopMessagesListener() {
    if (messagesListener) {
        console.log('🛑 Parando listener em tempo real');
        messagesListener();
        messagesListener = null;
    }
}

// Função para adicionar nova mensagem à interface (usada pelo listener)
function addNewMessageToUI(messageData, currentUserId) {
    const messagesArea = document.getElementById('messagesArea');

    // Verificar se é uma mensagem de áudio
    if (messageData.audioBase64 && messageData.tipo === 'audio') {
        // Criar elemento de mensagem de áudio
        const audioMessageElement = createAudioMessageElement(messageData, currentUserId);
        audioMessageElement.setAttribute('data-message-id', messageData.id);
        messagesArea.appendChild(audioMessageElement);
    } else if (messageData.imagemBase64 && messageData.tipo === 'imagem') {
        // Criar elemento de mensagem de imagem
        const imageMessageElement = createImageMessageElement(messageData, currentUserId);
        imageMessageElement.setAttribute('data-message-id', messageData.id);
        messagesArea.appendChild(imageMessageElement);
    } else {
        // Mensagem de texto normal
        const message = {
            text: messageData.texto || messageData.text,
            time: messageData.dataEnvio ?
                new Date(messageData.dataEnvio.seconds * 1000).toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit'
                }) :
                formatTime(new Date()),
            type: messageData.remetenteId === currentUserId ? 'sent' : 'received'
        };

        const messageElement = createMessageElement(message, message.type);
        messageElement.setAttribute('data-message-id', messageData.id);
        messagesArea.appendChild(messageElement);
    }

    // Scroll para o final
    setTimeout(scrollToBottom, 100);
}

// Função para abrir uma conversa
function openConversation(conversationId) {
    const conversation = conversations.find(c => c.id === conversationId);
    if (!conversation) return;

    currentConversation = conversation;

    // Verificar se o pedido está finalizado
    const isFinalizado = conversation.orderStatus === 'concluido';

    // Atualizar header do chat
    document.getElementById('chatAvatar').src = conversation.avatar;
    document.getElementById('chatName').textContent = conversation.name;
    document.getElementById('chatStatus').textContent = conversation.status || 'Offline';

    // Marcar conversa como ativa
    document.querySelectorAll('.conversation-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`[data-conversation-id="${conversationId}"]`).classList.add('active');

    // Mostrar chat, esconder lista
    document.getElementById('conversationsList').style.display = 'none';
    document.getElementById('chatContainer').style.display = 'flex';

    // Se o pedido estiver finalizado, ocultar o input de mensagens
    const messageInputContainer = document.querySelector('.message-input-container');
    if (messageInputContainer) {
        if (isFinalizado) {
            messageInputContainer.style.display = 'none';
            console.log('💬 Pedido finalizado - input de mensagens ocultado');
        } else {
            messageInputContainer.style.display = 'flex';
            console.log('💬 Pedido ativo - input de mensagens visível');
        }
    }

    // Entrar no modo chat (ocultar header e navbar)
    setTimeout(() => {
        const appElement = document.querySelector('.app');
        const topbarElement = document.querySelector('.topbar');

        // Procurar por TODAS as navbars possíveis
        const bottomNavs = document.querySelectorAll('.bottom-nav, .bottom-navigation, nav, [class*="nav"]');
        console.log('🎤 Navbars encontradas no modo chat:', bottomNavs.length, bottomNavs);

        console.log('Elementos encontrados:', {
            app: !!appElement,
            topbar: !!topbarElement,
            bottomNavs: bottomNavs.length
        });

        if (appElement) {
            appElement.classList.add('chat-mode');
            console.log('Modo chat ativado - header e navbar devem estar ocultos');
        }

        // Ocultar diretamente os elementos (fallback)
        if (topbarElement) {
            topbarElement.style.display = 'none';
            console.log('Header ocultado diretamente');
        } else {
            console.error('Header não encontrado');
        }

        // Ocultar TODAS as navbars encontradas
        bottomNavs.forEach((nav, index) => {
            nav.style.display = 'none';
            console.log(`Navbar ${index} ocultada no modo chat:`, nav.className);
        });
    }, 50);

    // Carregar mensagens da conversa
    loadConversationMessages(conversationId);

    // Iniciar listener em tempo real para novas mensagens
    startMessagesListener(conversationId);

    // Configurar ajuste do input para teclado (apenas se não estiver finalizado)
    if (!isFinalizado) {
        adjustInputForKeyboard();
    }

    // Scroll para o final
    setTimeout(scrollToBottom, 100);
}

// Função para voltar para lista de conversas
function backToConversations() {
    // Parar listener em tempo real
    stopMessagesListener();

    document.getElementById('chatContainer').style.display = 'none';
    document.getElementById('conversationsList').style.display = 'block';
    currentConversation = null;

    // Sair do modo chat (mostrar header e navbar novamente)
    const appElement = document.querySelector('.app');
    const topbarElement = document.querySelector('.topbar');

    // Procurar por TODAS as navbars possíveis (igual ao ensureConversationsScreenVisible)
    const bottomNavs = document.querySelectorAll('.bottom-nav, .bottom-navigation, nav, [class*="nav"]');
    console.log('🔙 Navbars encontradas ao voltar para conversas:', bottomNavs.length);

    if (appElement) {
        appElement.classList.remove('chat-mode');
        console.log('Modo chat desativado - header e navbar devem aparecer');
    }

    // Mostrar diretamente os elementos (igual ao ensureConversationsScreenVisible)
    if (topbarElement) {
        topbarElement.style.display = '';
        console.log('Header mostrado diretamente');
    }

    // Mostrar TODAS as navbars encontradas (igual ao ensureConversationsScreenVisible)
    bottomNavs.forEach((nav, index) => {
        nav.style.display = '';
        console.log(`Navbar ${index} mostrada ao voltar para conversas:`, nav.className);
    });

    // Limpar seleção ativa
    document.querySelectorAll('.conversation-item').forEach(item => {
        item.classList.remove('active');
    });

    console.log('✅ Voltou para lista de conversas com navbar visível');
}

// Função para carregar mensagens de uma conversa específica
async function loadConversationMessages(conversationId) {
    const messagesArea = document.getElementById('messagesArea');

    // Preservar mensagens locais pendentes (não enviadas ainda)
    const localPendingMessages = Array.from(messagesArea.querySelectorAll('[data-local-pending="true"]'));
    console.log('💬 Mensagens locais pendentes encontradas:', localPendingMessages.length);

    messagesArea.innerHTML = '';

    // Re-adicionar mensagens locais pendentes após limpar
    localPendingMessages.forEach(message => {
        console.log('💬 Re-adicionando mensagem local pendente');
        messagesArea.appendChild(message);
    });

    console.log('💬 Carregando mensagens da conversa:', conversationId);

    try {
        if (firebaseEnabled && window.buscarMensagensConversa) {
            const firebaseMessages = await window.buscarMensagensConversa(conversationId);
            console.log('💬 Mensagens recebidas do Firebase:', firebaseMessages);

            // Obter dados do usuário atual para determinar se é enviado ou recebido
            const userDataRaw = localStorage.getItem("user");
            const userData = userDataRaw ? JSON.parse(userDataRaw) : {};
            const currentUserId = userData.id;

            // Mapear e exibir mensagens
            firebaseMessages.forEach(messageData => {
                console.log('Processando mensagem:', messageData.id, 'tipo:', messageData.tipo, 'audioBase64:', !!messageData.audioBase64);

                // Verificar se é uma mensagem de áudio
                if (messageData.audioBase64) {
                    console.log('🎵 Detectada mensagem de áudio:', messageData.id);
                    // Criar elemento de mensagem de áudio
                    const audioMessageElement = createAudioMessageElement(messageData, currentUserId);
                    audioMessageElement.setAttribute('data-message-id', messageData.id);
                    messagesArea.appendChild(audioMessageElement);
                } else if (messageData.imagemBase64) {
                    // Criar elemento de mensagem de imagem
                    const imageMessageElement = createImageMessageElement(messageData, currentUserId);
                    imageMessageElement.setAttribute('data-message-id', messageData.id);
                    messagesArea.appendChild(imageMessageElement);
                } else {
                    // Mensagem de texto normal
                    const message = {
                        text: messageData.texto || messageData.text,
                        time: messageData.dataEnvio ?
                            new Date(messageData.dataEnvio.seconds * 1000).toLocaleTimeString('pt-BR', {
                                hour: '2-digit',
                                minute: '2-digit'
                            }) :
                            formatTime(new Date()),
                        type: messageData.remetenteId === currentUserId ? 'sent' : 'received'
                    };

                    const messageElement = createMessageElement(message, message.type);
                    messageElement.setAttribute('data-message-id', messageData.id);
                    messagesArea.appendChild(messageElement);
                }
            });

            console.log('💬 Mensagens exibidas:', firebaseMessages.length);

        } else {
            console.log('📱 Firebase não disponível para mensagens, usando dados vazios');
            // Mostrar mensagem indicando que não há mensagens
            messagesArea.innerHTML = `
                <div style="padding: 20px; text-align: center; color: #64748b;">
                    <p>Nenhuma mensagem ainda</p>
                    <small>Envie a primeira mensagem para iniciar a conversa</small>
                </div>
            `;
        }
    } catch (error) {
        console.error('❌ Erro ao carregar mensagens:', error);
        messagesArea.innerHTML = `
            <div style="padding: 20px; text-align: center; color: #dc3545;">
                <p>Erro ao carregar mensagens</p>
                <small>Tente recarregar a página</small>
            </div>
        `;
    }

    // Scroll para o final
    setTimeout(scrollToBottom, 100);
}

// Função para ver detalhes do pedido
function viewOrderDetails(orderId) {
    console.log('Ver detalhes do pedido:', orderId);

    // Salvar o ID do pedido para abrir nos detalhes quando carregar pedidos.html
    localStorage.setItem('pedidoParaAbrir', orderId);

    // Redirecionar para a página de pedidos
    window.location.href = 'pedidos.html';
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    console.log('Página mensagens carregada');

    // Inicializar página de mensagens
    initializeMessagesPage();

    // Event listener para input de mensagem
    const messageInput = document.getElementById('messageInput');
    const sendBtn = document.getElementById('sendBtn');
    const backBtn = document.getElementById('backBtn');
    const attachmentBtn = document.getElementById('attachmentBtn');

    // Enviar ao clicar no botão
    if (sendBtn) {
        sendBtn.addEventListener('click', sendMessage);
    }

    // Botão de anexo
    if (attachmentBtn) {
        attachmentBtn.addEventListener('click', handleAttachment);
    }

    // Alternar ícone baseado no conteúdo do input
    if (messageInput) {
        messageInput.addEventListener('input', toggleAudioSendIcon);

        // Inicializar ícone
        toggleAudioSendIcon();

        // Enviar ao pressionar Enter
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                sendMessage();
            }
        });
    }

    // Botão voltar para lista de conversas
    if (backBtn) {
        backBtn.addEventListener('click', backToConversations);
    }

    // Event listeners para modal de imagem
    const imageModalClose = document.getElementById('imageModalClose');
    const imageModalOverlay = document.getElementById('imageModalOverlay');
    const imageCancelBtn = document.getElementById('imageCancelBtn');
    const imageSendBtn = document.getElementById('imageSendBtn');

    // Fechar modal
    if (imageModalClose) {
        imageModalClose.addEventListener('click', closeImageModal);
    }
    if (imageModalOverlay) {
        imageModalOverlay.addEventListener('click', closeImageModal);
    }
    if (imageCancelBtn) {
        imageCancelBtn.addEventListener('click', closeImageModal);
    }

    // Enviar imagem
    if (imageSendBtn) {
        imageSendBtn.addEventListener('click', sendImageWithCaption);
    }



    // Navegação da bottom nav
    const btnServicos = document.getElementById('btnServicos');
    if (btnServicos) {
        btnServicos.addEventListener('click', () => {
            window.location.href = "pedidos.html";
        });
    }

    const btnHome = document.getElementById('btnHome');
    if (btnHome) {
        btnHome.addEventListener('click', () => {
            window.location.href = "home.html";
        });
    }

    const btnPerfil = document.getElementById('btnPerfil');
    if (btnPerfil) {
        btnPerfil.addEventListener('click', () => {
            window.location.href = "perfil.html";
        });
    }
});

// Função para processar imagem selecionada da galeria (chamada pelo Android)
function onMessageImageSelected(base64Data, mimeType) {
    console.log('📸 onMessageImageSelected CHAMADA!');
    console.log('📸 Parâmetros recebidos:', {
        base64DataLength: base64Data ? base64Data.length : 'null',
        mimeType: mimeType,
        base64DataPreview: base64Data ? base64Data.substring(0, 50) + '...' : 'null'
    });

    // Verificar se os parâmetros são válidos
    if (!base64Data || !mimeType) {
        console.error('❌ Parâmetros inválidos para onMessageImageSelected');
        alert('Erro: Dados da imagem inválidos.');
        return;
    }

    try {
        console.log('📸 Chamando showImageSelectionModal...');
        // Mostrar modal de imagem em vez de enviar diretamente
        showImageSelectionModal(base64Data, mimeType);
        console.log('✅ showImageSelectionModal chamada com sucesso');
    } catch (error) {
        console.error('❌ Erro ao chamar showImageSelectionModal:', error);
        alert('Erro ao processar imagem: ' + error.message);
    }
}

// Função para mostrar modal de seleção de imagem (estilo WhatsApp)
function showImageSelectionModal(base64Data, mimeType) {
    console.log('🖼️ Mostrando modal de seleção de imagem');
    console.log('🖼️ Dados recebidos:', {
        base64Length: base64Data ? base64Data.length : 'null',
        mimeType: mimeType,
        base64Preview: base64Data ? base64Data.substring(0, 50) + '...' : 'null'
    });

    const modal = document.getElementById('imageModal');
    const imagePreview = document.getElementById('imagePreview');
    const imageCaption = document.getElementById('imageCaption');

    console.log('🖼️ Elementos do DOM:', {
        modal: !!modal,
        imagePreview: !!imagePreview,
        imageCaption: !!imageCaption
    });

    if (!modal) {
        console.error('❌ Modal de imagem não encontrado no DOM!');
        alert('Erro: Modal de imagem não encontrado. Recarregue a página.');
        return;
    }

    if (!imagePreview) {
        console.error('❌ Elemento imagePreview não encontrado!');
        alert('Erro: Elemento de preview não encontrado.');
        return;
    }

    if (!imageCaption) {
        console.error('❌ Elemento imageCaption não encontrado!');
        alert('Erro: Campo de legenda não encontrado.');
        return;
    }

    try {
        // Configurar preview da imagem
        const imageSrc = `data:${mimeType};base64,${base64Data}`;
        console.log('🖼️ Configurando src da imagem:', imageSrc.substring(0, 100) + '...');
        imagePreview.src = imageSrc;

        // Limpar legenda anterior
        imageCaption.value = '';

        // Mostrar modal
        modal.style.display = 'flex';
        console.log('✅ Modal exibido com sucesso');

        // Focar no campo de legenda
        setTimeout(() => {
            imageCaption.focus();
            console.log('✅ Foco no campo de legenda');
        }, 300);

    } catch (error) {
        console.error('❌ Erro ao configurar modal:', error);
        alert('Erro ao configurar modal: ' + error.message);
    }
}

// Função de teste para verificar se o modal funciona (chamada manual)
function testImageModal() {
    console.log('🧪 Testando modal de imagem...');

    // Criar dados de teste (uma imagem pequena em base64)
    const testBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    const testMimeType = 'image/png';

    showImageSelectionModal(testBase64, testMimeType);
}

// Função para fechar modal de imagem
function closeImageModal() {
    const modal = document.getElementById('imageModal');
    modal.style.display = 'none';

    // Limpar dados
    const imagePreview = document.getElementById('imagePreview');
    const imageCaption = document.getElementById('imageCaption');

    imagePreview.src = '';
    imageCaption.value = '';
}

// Função para enviar imagem com legenda
async function sendImageWithCaption() {
    const imagePreview = document.getElementById('imagePreview');
    const imageCaption = document.getElementById('imageCaption');

    if (!imagePreview.src || imagePreview.src === '') {
        console.error('❌ Nenhuma imagem para enviar');
        return;
    }

    // Extrair base64 da imagem
    const base64Data = imagePreview.src.split(',')[1];
    const mimeType = imagePreview.src.split(';')[0].split(':')[1];
    const caption = imageCaption.value.trim();

    console.log('📤 Enviando imagem com legenda:', caption ? caption.substring(0, 50) + '...' : 'sem legenda');

    try {
        // Fechar modal
        closeImageModal();

        // Enviar imagem como mensagem
        await sendImageMessage(base64Data, mimeType, 'imagem_enviada.jpg', caption);

    } catch (error) {
        console.error('❌ Erro ao enviar imagem:', error);
        alert('Erro ao enviar imagem. Tente novamente.');
    }
}



// Função para garantir que a tela de conversas mostre a navbar
function ensureConversationsScreenVisible() {
    console.log('📱 Garantindo que a tela de conversas esteja visível com navbar');

    // Garantir que estamos mostrando a lista de conversas
    const conversationsList = document.getElementById('conversationsList');
    const chatContainer = document.getElementById('chatContainer');

    if (conversationsList && chatContainer) {
        conversationsList.style.display = 'block';
        chatContainer.style.display = 'none';
        console.log('📱 Lista de conversas mostrada, chat ocultado');
    }

    // Garantir que a navbar esteja visível
    const bottomNavs = document.querySelectorAll('.bottom-nav, .bottom-navigation, nav, [class*="nav"]');
    console.log('📱 Navbars encontradas para mostrar:', bottomNavs.length);

    bottomNavs.forEach((nav, index) => {
        nav.style.display = '';
        console.log(`📱 Navbar ${index} mostrada na tela inicial:`, nav.className);
    });

    // Remover classe de modo chat se existir
    const appElement = document.querySelector('.app');
    if (appElement) {
        appElement.classList.remove('chat-mode');
        console.log('📱 Classe chat-mode removida');
    }

    // Garantir que o header esteja visível
    const topbarElement = document.querySelector('.topbar');
    if (topbarElement) {
        topbarElement.style.display = '';
        console.log('📱 Header/topbar mostrado');
    }

    console.log('✅ Tela de conversas configurada com navbar visível');
}

// Função modificada para enviar mensagem de imagem (agora aceita legenda)
async function sendImageMessage(base64Data, mimeType, fileName, caption = '') {
    if (!currentConversation) {
        console.error('❌ Nenhuma conversa ativa para enviar imagem');
        return;
    }

    try {
        console.log('📤 Enviando imagem...', caption ? `com legenda: ${caption}` : 'sem legenda');

        // Enviar mensagem via Firebase
        if (firebaseEnabled && window.enviarMensagemImagem) {
            await window.enviarMensagemImagem(currentConversation.id, base64Data, mimeType, fileName, caption);
            console.log('✅ Imagem enviada com sucesso');

            // Recarregar mensagens para mostrar a nova mensagem de imagem
            await loadConversationMessages(currentConversation.id);
        } else {
            console.log('📱 Firebase não disponível, simulando envio local');
            // Para modo local, adicionar diretamente
            addImageMessageToUI(base64Data, mimeType, 'sent', caption);
        }

    } catch (error) {
        console.error('❌ Erro ao enviar imagem:', error);
        alert('Erro ao enviar imagem. Tente novamente.');
    }
}

// Função modificada para criar elemento de mensagem de imagem (agora aceita legenda)
function createImageMessageElement(messageData, currentUserId) {
    const messageDiv = document.createElement('div');
    const isSent = messageData.remetenteId === currentUserId;
    messageDiv.className = `message ${isSent ? 'sent' : 'received'}`;

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';

    // Criar container para a imagem com largura máxima controlada
    const imageContainer = document.createElement('div');
    imageContainer.style.cssText = `
        display: flex;
        flex-direction: column;
        gap: 4px;
        align-items: ${isSent ? 'flex-end' : 'flex-start'};
        max-width: 250px;
    `;

    // Elemento de imagem com largura máxima controlada
    const imgElement = document.createElement('img');
    if (messageData.imagemBase64 && messageData.imagemMimeType) {
        imgElement.src = `data:${messageData.imagemMimeType};base64,${messageData.imagemBase64}`;
    }
    imgElement.className = 'message-image';
    imgElement.style.cssText = `
        max-width: 250px;
        max-height: 200px;
        border-radius: 12px;
        cursor: pointer;
        transition: transform 0.2s ease;
        object-fit: cover;
        width: auto;
        height: auto;
    `;

    // Adicionar evento de clique para visualizar imagem em tamanho maior
    imgElement.addEventListener('click', () => {
        showImageModal(imgElement.src);
    });

    // Adicionar legenda se existir
    const legenda = messageData.legenda || messageData.caption;
    if (legenda && legenda.trim()) {
        const captionElement = document.createElement('div');
        captionElement.textContent = legenda;
        captionElement.style.cssText = `
            font-size: 14px;
            color: ${isSent ? 'rgba(255,255,255,0.9)' : '#64748b'};
            margin-top: 4px;
            word-wrap: break-word;
            max-width: 250px;
        `;
        imageContainer.appendChild(imgElement);
        imageContainer.appendChild(captionElement);
    } else {
        imageContainer.appendChild(imgElement);
    }

    // Timestamp dentro do balão (estilo WhatsApp)
    const timeSpan = document.createElement('span');
    timeSpan.className = 'message-time';
    timeSpan.textContent = messageData.dataEnvio ?
        new Date(messageData.dataEnvio.seconds * 1000).toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit'
        }) :
        formatTime(new Date());
    timeSpan.style.cssText = `
        display: block;
        font-size: 11px;
        color: rgba(255,255,255,0.7);
        margin-top: 4px;
        text-align: right;
        align-self: flex-end;
    `;

    // Adicionar timestamp dentro do container de imagem
    imageContainer.appendChild(timeSpan);

    contentDiv.appendChild(imageContainer);
    messageDiv.appendChild(contentDiv);

    return messageDiv;
}

// Função modificada para adicionar mensagem de imagem à interface (agora aceita legenda)
function addImageMessageToUI(base64Data, mimeType, type = 'sent', caption = '') {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';

    // Criar container para a imagem com largura máxima controlada
    const imageContainer = document.createElement('div');
    imageContainer.style.cssText = `
        display: flex;
        flex-direction: column;
        gap: 4px;
        align-items: ${type === 'sent' ? 'flex-end' : 'flex-start'};
        max-width: 250px;
    `;

    // Elemento de imagem com largura máxima controlada
    const imgElement = document.createElement('img');
    imgElement.src = `data:${mimeType};base64,${base64Data}`;
    imgElement.className = 'message-image';
    imgElement.style.cssText = `
        max-width: 250px;
        max-height: 200px;
        border-radius: 12px;
        cursor: pointer;
        transition: transform 0.2s ease;
        object-fit: cover;
        width: auto;
        height: auto;
    `;

    // Adicionar evento de clique para visualizar imagem em tamanho maior
    imgElement.addEventListener('click', () => {
        showImageModal(imgElement.src);
    });

    // Adicionar legenda se existir
    if (caption && caption.trim()) {
        const captionElement = document.createElement('div');
        captionElement.textContent = caption;
        captionElement.style.cssText = `
            font-size: 14px;
            color: ${type === 'sent' ? 'rgba(255,255,255,0.9)' : '#64748b'};
            margin-top: 4px;
            word-wrap: break-word;
            max-width: 250px;
        `;
        imageContainer.appendChild(imgElement);
        imageContainer.appendChild(captionElement);
    } else {
        imageContainer.appendChild(imgElement);
    }

    // Timestamp igual às outras mensagens
    const timeSpan = document.createElement('span');
    timeSpan.className = 'message-time';
    timeSpan.textContent = formatTime(new Date());

    imageContainer.appendChild(timeSpan);
    contentDiv.appendChild(imageContainer);
    messageDiv.appendChild(contentDiv);

    // Adicionar à área de mensagens
    const messagesArea = document.getElementById('messagesArea');
    messagesArea.appendChild(messageDiv);

    // Scroll para o final
    scrollToBottom();
}

// Funcionalidade do botão voltar do dispositivo
// Múltiplas abordagens para garantir funcionamento no Android WebView

// Abordagem 1: Interceptar popstate
window.history.pushState({page: 'mensagens'}, 'Mensagens', window.location.href);

window.addEventListener('popstate', function(event) {
    if (event.state && event.state.page === 'mensagens') {
        event.preventDefault();
        window.location.href = "home.html";
        return false;
    }
});

// Abordagem 2: Interceptar beforeunload
window.addEventListener('beforeunload', function(event) {
    // Pequeno delay para permitir redirecionamento
    setTimeout(() => {
        window.location.href = "home.html";
    }, 100);
});

// Abordagem 3: Interceptar unload
window.addEventListener('unload', function(event) {
    window.location.href = "home.html";
});

// Abordagem 4: Verificar se estamos em WebView Android e tentar comunicação nativa
if (window.Android && window.Android.onBackPressed) {
    // Se existir interface nativa, usar ela
    window.Android.onBackPressed = function() {
        window.location.href = "home.html";
    };
}

// Abordagem 5: Timer de segurança
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
