

// Script para a página de perfil estilo Instagram

// Variáveis globais
let currentUser = null;
let userPosts = [];
let userReviews = [];
let userServices = [];
let currentTab = 'posts';
let ceps = [];
let activeCep = null;

// Serviços disponíveis para paneleiros
const availableServices = [
    'Instalação elétrica',
    'Reparos hidráulicos',
    'Pintura',
    'Marcenaria',
    'Jardinagem',
    'Limpeza residencial',
    'Manutenção geral',
    'Instalação de ar condicionado',
    'Reparos automotivos',
    'Serviços de encanamento'
];

// ===== FUNÇÕES FIREBASE PARA PERFIL =====

// Salvar post no Firebase (Firestore + Storage)
window.salvarPostPerfil = async (postData) => {
    try {
        const userDataRaw = localStorage.getItem("user");
        if (!userDataRaw) {
            throw new Error("Usuário não está logado");
        }

        const userData = JSON.parse(userDataRaw);

        // Preparar dados do post
        const postParaSalvar = {
            paneleiroId: userData.id,
            paneleiroNome: userData.nome,
            imagemUrl: postData.imagemUrl,
            legenda: postData.legenda || '',
            dataCriacao: new Date(),
            dataAtualizacao: new Date()
        };

        // Salvar no Firestore usando Firebase v9
        // Usar addDoc diretamente do Firebase
        const { addDoc } = await import("https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js");
        const docRef = await addDoc(window.firestoreCollection(window.db, "posts_perfil"), postParaSalvar);

        console.log("✅ Post salvo com sucesso, ID:", docRef.id);
        return docRef.id;

    } catch (error) {
        console.error("❌ Erro ao salvar post:", error);
        throw error;
    }
};

// Carregar posts do perfil do usuário
window.carregarPostsPerfil = async (paneleiroId) => {
    try {
        console.log("📥 Carregando posts do perfil para paneleiro:", paneleiroId);

        const q = window.firestoreQuery(
            window.firestoreCollection(window.db, "posts_perfil"),
            window.firestoreWhere("paneleiroId", "==", paneleiroId)
        );

        const querySnapshot = await withTimeout(window.firestoreGetDocs(q), 3000);
        const posts = [];

        querySnapshot.forEach((doc) => {
            const postData = doc.data();
            console.log('📄 Post carregado do Firestore:', doc.id, 'imagemUrl length:', postData.imagemUrl ? postData.imagemUrl.length : 'null');

            posts.push({
                id: doc.id,
                ...postData
            });
        });

        console.log("✅ Posts carregados:", posts.length);
        return posts;

    } catch (error) {
        console.error("❌ Erro ao carregar posts:", error);
        return [];
    }
};

// Atualizar post
window.atualizarPostPerfil = async (postId, dadosAtualizacao) => {
    try {
        // Importar updateDoc do Firebase v9
        const { updateDoc, doc } = await import("https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js");

        const postRef = doc(window.db, "posts_perfil", postId);
        await updateDoc(postRef, {
            ...dadosAtualizacao,
            dataAtualizacao: new Date()
        });

        console.log("✅ Post atualizado:", postId);
        return true;

    } catch (error) {
        console.error("❌ Erro ao atualizar post:", error);
        throw error;
    }
};

// Excluir post
window.excluirPostPerfil = async (postId) => {
    try {
        // Importar funções do Firebase v9
        const { doc, deleteDoc } = await import("https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js");

        // Excluir diretamente do Firestore (a imagem está armazenada como base64 no documento)
        const postRef = doc(window.db, "posts_perfil", postId);
        await deleteDoc(postRef);

        console.log("✅ Post excluído:", postId);
        return true;

    } catch (error) {
        console.error("❌ Erro ao excluir post:", error);
        throw error;
    }
};

// Salvar imagem como base64 no Firestore (sem usar Firebase Storage)
window.uploadImagemPerfil = async (fileOrBlob, fileName = 'imagem.jpg') => {
    try {
        const userDataRaw = localStorage.getItem("user");
        if (!userDataRaw) {
            throw new Error("Usuário não está logado");
        }

        const userData = JSON.parse(userDataRaw);

        // Se já é uma string, verificar se já é uma data URL completa
        if (typeof fileOrBlob === 'string') {
            if (fileOrBlob.startsWith('data:')) {
                console.log("📦 Imagem já é data URL completa, retornando diretamente");
                return fileOrBlob;
            } else {
                console.log("📦 Imagem é base64 puro, convertendo para data URL");
                return `data:image/jpeg;base64,${fileOrBlob}`;
            }
        }

        // Se é um File ou Blob, converter para base64
        if (fileOrBlob instanceof File || fileOrBlob instanceof Blob) {
            const base64Data = await fileToBase64(fileOrBlob);
            console.log("📦 Imagem convertida para base64");
            // Retornar como data URL
            return `data:${fileOrBlob.type || 'image/jpeg'};base64,${base64Data}`;
        }

        // Fallback: assumir que já é uma data URL
        console.log("📦 Imagem já é data URL, retornando diretamente");
        return fileOrBlob;

    } catch (error) {
        console.error("❌ Erro no processamento da imagem:", error);
        throw error;
    }
};

// ===== AVALIAÇÕES NO REALTIME DATABASE =====

// Salvar avaliação no Realtime Database
window.salvarAvaliacao = async (avaliacaoData) => {
    try {
        const avaliacaoId = Date.now().toString();
        const path = `avaliacoes/${avaliacaoData.paneleiroId}/${avaliacaoId}`;

        await window.rtdb.ref(path).set({
            id: avaliacaoId,
            ...avaliacaoData,
            dataCriacao: new Date().toISOString(),
            timestamp: Date.now()
        });

        console.log("✅ Avaliação salva:", avaliacaoId);
        return avaliacaoId;

    } catch (error) {
        console.error("❌ Erro ao salvar avaliação:", error);
        throw error;
    }
};

// Carregar avaliações do paneleiro
window.carregarAvaliacoesPaneleiro = async (paneleiroId) => {
    try {
        console.log("📥 Carregando avaliações para paneleiro:", paneleiroId);

        // Buscar estatísticas de avaliação no RTDB no caminho "usuarios/{paneleiroId}" com timeout
        const snapshot = await withTimeout(
            window.rtdbGet(window.rtdbRef(window.rtdb, `usuarios/${paneleiroId}`)),
            3000 // 3 segundos timeout
        );

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

        // Tentar caminho alternativo: "avaliacoes/{paneleiroId}" com timeout
        try {
            const snapshotAlternativo = await withTimeout(
                window.rtdbGet(window.rtdbRef(window.rtdb, `avaliacoes/${paneleiroId}`)),
                3000 // 3 segundos timeout
            );
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

        // Se não encontrou em nenhum caminho, retornar array vazio
        console.log("ℹ️ Nenhuma avaliação encontrada - retornando array vazio");
        return [];

    } catch (error) {
        console.error("❌ Erro ao carregar avaliações:", error);

        // Fallback para array vazio em caso de erro
        console.log("🔄 Retornando array vazio devido a erro");
        return [];
    }
};

// Função para inicializar a página
function initializeProfilePage() {
    // Timeout de segurança para esconder loading após 10 segundos
    const safetyTimeout = setTimeout(() => {
        console.log("⏰ Timeout de segurança: escondendo loading");
        const loading = document.getElementById('loading');
        if (loading && loading.style.display !== 'none') {
            loading.style.display = 'none';
        }
    }, 10000); // 10 segundos

    loadUserData().finally(() => {
        clearTimeout(safetyTimeout);
    });
    setupEventListeners();
}

// Função auxiliar para timeout de promessas
function withTimeout(promise, timeoutMs = 5000) {
    return Promise.race([
        promise,
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), timeoutMs)
        )
    ]);
}

// Função para carregar dados do usuário
async function loadUserData() {
    try {
        console.log("🔄 Iniciando loadUserData...");
        const userDataRaw = localStorage.getItem('user');
        if (!userDataRaw) {
            console.log("❌ Usuário não encontrado no localStorage");
            window.location.href = "index.html";
            return;
        }

        currentUser = JSON.parse(userDataRaw);
        console.log("✅ Usuário carregado do localStorage:", currentUser);

        // Buscar dados atualizados do RTDB com timeout
        try {
            console.log("📥 Buscando dados atualizados do usuário no RTDB...");
            const snapshot = await withTimeout(
                window.rtdbGet(window.rtdbRef(window.rtdb, `users/${currentUser.id}`)),
                3000 // 3 segundos timeout
            );

            if (snapshot.exists()) {
                const rtdbData = snapshot.val();
                console.log("✅ Dados do RTDB encontrados:", rtdbData);
                console.log("🔍 Campos do RTDB:", Object.keys(rtdbData));
                console.log("🔍 Campo tipo no RTDB:", rtdbData.tipo);

                // Atualizar currentUser com dados do RTDB, mas preservar o campo 'tipo' do localStorage
                const tipoLocalStorage = currentUser.tipo;
                currentUser = {
                    ...currentUser,
                    ...rtdbData
                };
                // Restaurar o campo tipo se foi sobrescrito
                if (tipoLocalStorage && !rtdbData.tipo) {
                    currentUser.tipo = tipoLocalStorage;
                }

                // Salvar dados atualizados no localStorage
                localStorage.setItem('user', JSON.stringify(currentUser));
                console.log("✅ Dados do usuário atualizados com RTDB");
                console.log("🔍 currentUser após atualização:", currentUser);
                console.log("🔍 Campo tipo em currentUser:", currentUser.tipo);
            } else {
                console.log("ℹ️ Dados do RTDB não encontrados, usando localStorage");
            }
        } catch (rtdbError) {
            console.error("❌ Erro ao buscar dados do RTDB:", rtdbError);
            console.log("🔄 Continuando com dados do localStorage");
        }

        // Preencher informações básicas
        document.getElementById('userName').textContent = currentUser.nome || 'Nome não informado';

        // Preencher foto de perfil
        const profilePhoto = document.getElementById('profilePhoto');
        if (profilePhoto && currentUser.fotoUrl && currentUser.fotoUrl !== '') {
            profilePhoto.src = currentUser.fotoUrl;
        }

        // Preencher descrição (endereço) - buscar de múltiplas fontes
        const userAddress = document.getElementById('userAddress');
        if (userAddress) {
            let enderecoTexto = 'Endereço não informado';

            console.log("🔍 Verificando endereço - currentUser:", currentUser);
            console.log("🔍 Campo enderecoCompleto:", currentUser.enderecoCompleto);
            console.log("🔍 Campo endereco:", currentUser.endereco);
            console.log("🔍 Campo cep:", currentUser.cep);
            console.log("🔍 Campo ceps:", currentUser.ceps);

            // Priorizar enderecoCompleto do RTDB (para usuários que passaram pelo confirma_local)
            if (currentUser.enderecoCompleto) {
                enderecoTexto = currentUser.enderecoCompleto;
                console.log("✅ Usando enderecoCompleto do RTDB:", enderecoTexto);
            }
            // Fallback para endereco do localStorage
            else if (currentUser.endereco) {
                enderecoTexto = currentUser.endereco;
                console.log("✅ Usando endereco do localStorage:", enderecoTexto);
            }
            // Fallback para CEP formatado (ceps do RTDB)
            else if (currentUser.ceps) {
                enderecoTexto = `CEP: ${currentUser.ceps}`;
                console.log("✅ Usando ceps do RTDB:", enderecoTexto);
            }
            // Último fallback para cep do localStorage
            else if (currentUser.cep) {
                enderecoTexto = `CEP: ${currentUser.cep}`;
                console.log("✅ Usando CEP do localStorage:", enderecoTexto);
            }

            userAddress.textContent = enderecoTexto;
        }

        // Carregar serviços do usuário
        if (Array.isArray(currentUser.servicos)) {
            userServices = currentUser.servicos;
        } else if (typeof currentUser.servicos === 'string') {
            userServices = currentUser.servicos.split(',').map(s => s.trim()).filter(s => s.length > 0);
        } else {
            userServices = [];
        }
        renderServices();

        // Calcular e exibir avaliação
        calculateAndDisplayRating();

        // Verificar tipo de usuário e mostrar interface apropriada
        // O campo se chama 'tipoUsuario' (não 'tipo')
        console.log("🔍 Verificando tipo de usuário:", currentUser);
        console.log("🔍 Campo tipoUsuario:", currentUser?.tipoUsuario);
        console.log("🔍 Campo tipo:", currentUser?.tipo);
        console.log("🔍 Comparação tipoUsuario === 'Paneleiro':", currentUser?.tipoUsuario === 'Paneleiro');
        console.log("🔍 Comparação tipo === 'Paneleiro':", currentUser?.tipo === 'Paneleiro');

        if (currentUser && (currentUser.tipoUsuario === 'Paneleiro' || currentUser.tipo === 'Paneleiro')) {
            console.log("👷 Usuário é paneleiro - mostrando interface completa");
            loadUserPosts();
            showPaneleiroInterface();
        } else {
            console.log("👤 Usuário é cliente - mostrando interface simples");
            showClienteInterface();
        }

        console.log("✅ loadUserData concluído com sucesso");

        // Esconder loading
        const loading = document.getElementById('loading');
        if (loading) {
            loading.style.display = 'none';
        }

    } catch (error) {
        console.error('Erro ao carregar dados do usuário:', error);
        // Esconder loading mesmo em erro
        const loading = document.getElementById('loading');
        if (loading) {
            loading.style.display = 'none';
        }
        window.location.href = "index.html";
    }
}

// Função para renderizar serviços
function renderServices() {
    const servicesList = document.getElementById('servicesList');
    servicesList.innerHTML = '';

    if (userServices.length === 0) {
        servicesList.innerHTML = '<p style="color: #8e8e8e; font-size: 14px;">Nenhum serviço cadastrado</p>';
        return;
    }

    userServices.forEach(service => {
        const serviceTag = document.createElement('span');
        serviceTag.className = 'service-tag';
        serviceTag.textContent = service;
        servicesList.appendChild(serviceTag);
    });
}

// Função para calcular e exibir avaliação
async function calculateAndDisplayRating() {
    try {
        // Carregar avaliações do Firebase Realtime Database
        userReviews = await window.carregarAvaliacoesPaneleiro(currentUser.id) || [];

        // Verificar se é paneleiro
        const isPaneleiro = currentUser && (currentUser.tipoUsuario === 'Paneleiro' || currentUser.tipo === 'Paneleiro');

        const averageRating = userReviews.length > 0 ?
            userReviews.reduce((sum, review) => sum + review.rating, 0) / userReviews.length :
            (isPaneleiro ? 5.0 : 0); // Paneleiros sem avaliações mostram 5.0
        const roundedRating = Math.round(averageRating * 10) / 10;

        // Exibir avaliação média
        document.getElementById('ratingValue').textContent = userReviews.length > 0 ? `(${roundedRating.toFixed(1)})` : (isPaneleiro ? '(5.0)' : '(0.0)');
        document.getElementById('averageRating').textContent = roundedRating.toFixed(1);
        document.getElementById('totalReviewsCount').textContent = userReviews.length;

        // Renderizar estrelas
        renderStars('ratingStars', Math.floor(averageRating));
        renderStars('averageStars', Math.floor(averageRating));

        // Renderizar breakdown das avaliações
        renderRatingBreakdown();

        // Renderizar lista de avaliações
        renderReviewsList();

    } catch (error) {
        console.error('Erro ao carregar avaliações:', error);
        // Fallback para dados vazios
        userReviews = [];
        const isPaneleiro = currentUser && (currentUser.tipoUsuario === 'Paneleiro' || currentUser.tipo === 'Paneleiro');
        document.getElementById('ratingValue').textContent = isPaneleiro ? '(5.0)' : '(0.0)';
        document.getElementById('averageRating').textContent = isPaneleiro ? '5.0' : '0.0';
        document.getElementById('totalReviewsCount').textContent = '0';
        renderStars('ratingStars', isPaneleiro ? 5 : 0);
        renderStars('averageStars', isPaneleiro ? 5 : 0);
        renderRatingBreakdown();
        renderReviewsList();
    }
}

// Função para renderizar estrelas
function renderStars(containerId, filledStars) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';

    for (let i = 1; i <= 5; i++) {
        const star = document.createElement('span');
        star.className = `star ${i <= filledStars ? 'filled' : ''}`;
        star.textContent = '★';
        container.appendChild(star);
    }
}

// Função para renderizar breakdown das avaliações
function renderRatingBreakdown() {
    const ratingCounts = [0, 0, 0, 0, 0, 0]; // Índice 0 não usado

    userReviews.forEach(review => {
        ratingCounts[review.rating]++;
    });

    // Só mostrar breakdown se houver avaliações
    if (userReviews.length > 0) {
        for (let i = 5; i >= 1; i--) {
            const percentage = (ratingCounts[i] / userReviews.length) * 100;
            document.getElementById(`rating${i}Fill`).style.width = `${percentage}%`;
            document.getElementById(`rating${i}Count`).textContent = ratingCounts[i];
        }
    } else {
        // Se não há avaliações, mostrar tudo zerado
        for (let i = 5; i >= 1; i--) {
            document.getElementById(`rating${i}Fill`).style.width = '0%';
            document.getElementById(`rating${i}Count`).textContent = '0';
        }
    }
}

// Função para renderizar lista de avaliações
function renderReviewsList() {
    const reviewsList = document.getElementById('reviewsList');
    reviewsList.innerHTML = '';

    if (userReviews.length === 0) {
        reviewsList.innerHTML = '<p style="text-align: center; color: #8e8e8e; padding: 40px;">Nenhuma avaliação ainda</p>';
        return;
    }

    userReviews.forEach(review => {
        const reviewItem = document.createElement('div');
        reviewItem.className = 'review-item';

        const stars = [];
        for (let i = 1; i <= 5; i++) {
            stars.push(`<span class="star ${i <= review.rating ? 'filled' : ''}">★</span>`);
        }

        reviewItem.innerHTML = `
            <div class="review-header">
                <img src="./imgs/perfil.png" alt="Cliente" class="review-avatar">
                <div class="review-user-info">
                    <h4 class="review-user-name">Cliente Anônimo</h4>
                    <p class="review-date">${formatDate(review.dataCriacao || review.date)}</p>
                </div>
            </div>
            <div class="review-rating">
                ${stars.join('')}
            </div>
            <p class="review-comment">${review.comment || 'Sem comentário'}</p>
        `;

        reviewsList.appendChild(reviewItem);
    });
}

// Função para carregar posts do usuário
async function loadUserPosts() {
    try {
        // Carregar posts do Firebase Firestore
        userPosts = await window.carregarPostsPerfil(currentUser.id) || [];
        console.log("Posts carregados do Firebase:", userPosts.length);

        renderPostsGrid();
    } catch (error) {
        console.error('Erro ao carregar posts:', error);
        // Fallback para array vazio
        userPosts = [];
        renderPostsGrid();
    }
}

// Função para renderizar grid de posts
function renderPostsGrid() {
    const postsGrid = document.getElementById('postsGrid');
    postsGrid.innerHTML = '';

    if (userPosts.length === 0) {
        postsGrid.innerHTML = '<p style="text-align: center; color: #8e8e8e; padding: 40px; grid-column: 1 / -1;">Nenhum post ainda</p>';
        return;
    }

    console.log('🎨 Renderizando grid de posts:', userPosts.length);

    userPosts.forEach(post => {
        const postItem = document.createElement('div');
        postItem.className = 'post-item';

        // Debug: verificar se imagemUrl existe
        console.log('📸 Post:', post.id, 'imagemUrl length:', post.imagemUrl ? post.imagemUrl.length : 'null');

        // Processar imagem corretamente (usar mesma lógica do modal)
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

        // Para imagens base64 grandes, mostrar a própria imagem (não placeholder)
        // A otimização será feita no onload se necessário
        const displaySrc = imageSrc;

        console.log('Processando imagem do post:', {
            hasImage: !!imageSrc,
            isBase64: imageSrc.startsWith('data:image'),
            length: imageSrc.length,
            willOptimize: imageSrc.startsWith('data:image') && imageSrc.length > 50000
        });

        postItem.innerHTML = `
            <img src="${displaySrc}"
                 alt="Post"
                 class="post-image"
                 onclick="openPostModal('${post.id}')"
                 onerror="this.src='./imgs/perfil.png'"
                 onload="otimizarImagemPost(this, '${imageSrc.replace(/'/g, "\\'")}')">
        `;

        postsGrid.appendChild(postItem);
    });
}

// Função para configurar event listeners
function setupEventListeners() {
    // Abas de navegação
    document.getElementById('postsTab').addEventListener('click', () => switchTab('posts'));
    document.getElementById('reviewsTab').addEventListener('click', () => switchTab('reviews'));

    // Botões de edição - DESABILITADO conforme solicitado
    // document.getElementById('editProfileBtn').addEventListener('click', openEditProfileModal);
    document.getElementById('editServicesBtn').addEventListener('click', openEditServicesModal);
    document.getElementById('newPostBtn').addEventListener('click', openNewPostModal);

    // Modais
    document.getElementById('closeEditProfileModal').addEventListener('click', closeEditProfileModal);
    document.getElementById('closeEditServicesModal').addEventListener('click', closeEditServicesModal);
    document.getElementById('closeNewPostModal').addEventListener('click', closeNewPostModal);

    // Formulários
    document.getElementById('editProfileForm').addEventListener('submit', saveProfile);
    document.getElementById('editServicesForm').addEventListener('submit', saveServices);
    document.getElementById('newPostForm').addEventListener('submit', createNewPost);

    // Preview de imagem no modal de novo post
    document.getElementById('postImage').addEventListener('change', previewImage);

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

    // Navegação bottom
    document.getElementById('btnServicos').addEventListener('click', () => window.location.href = "pedidos.html");
    document.getElementById('btnHome').addEventListener('click', () => window.location.href = "home.html");
    document.getElementById('btnMensagens').addEventListener('click', () => window.location.href = "mensagens.html");

    // Botões de configurações e logout
    document.getElementById('btnSettings').addEventListener('click', () => window.location.href = "configuracoes.html");
    document.getElementById('btnLogout').addEventListener('click', () => {
        if (confirm('Tem certeza que deseja sair?')) {
            if (window.Android && window.Android.logout) {
                window.Android.logout();
            } else {
                localStorage.clear();
                window.location.href = "index.html";
            }
        }
    });
}

// Função para alternar abas
function switchTab(tabName) {
    currentTab = tabName;

    // Atualizar botões das abas
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`${tabName}Tab`).classList.add('active');

    // Atualizar conteúdo das abas
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.getElementById(`${tabName}Content`).classList.add('active');
}

// Função para abrir modal de editar perfil
function openEditProfileModal() {
    document.getElementById('editName').value = currentUser.nome || '';
    document.getElementById('editDescription').value = currentUser.endereco || currentUser.cep || '';
    document.getElementById('editProfileModal').classList.add('show');
}

// Função para fechar modal de editar perfil
function closeEditProfileModal() {
    document.getElementById('editProfileModal').classList.remove('show');
}

// Função para salvar perfil
function saveProfile(e) {
    e.preventDefault();

    const name = document.getElementById('editName').value.trim();
    const description = document.getElementById('editDescription').value.trim();

    if (!name) {
        alert('Por favor, insira seu nome.');
        return;
    }

    currentUser.nome = name;
    currentUser.endereco = description;

    localStorage.setItem('user', JSON.stringify(currentUser));

    document.getElementById('userName').textContent = name;
    document.getElementById('userAddress').textContent = description || 'Endereço não informado';

    closeEditProfileModal();
    showSuccess('Perfil atualizado com sucesso!');
}

// Função para abrir modal de editar serviços
function openEditServicesModal() {
    const servicesText = document.getElementById('servicesText');
    servicesText.value = userServices.join(', ');

    document.getElementById('editServicesModal').classList.add('show');
}

// Função para fechar modal de editar serviços
function closeEditServicesModal() {
    document.getElementById('editServicesModal').classList.remove('show');
}

// Função para salvar serviços
function saveServices(e) {
    e.preventDefault();

    const servicesText = document.getElementById('servicesText').value.trim();
    const selectedServices = servicesText.split(',').map(s => s.trim()).filter(s => s.length > 0);

    userServices = selectedServices;
    currentUser.servicos = userServices;

    localStorage.setItem('user', JSON.stringify(currentUser));

    // Atualizar no Firebase
    if (window.Android && window.Android.updateUserField) {
        window.Android.updateUserField("servicos", userServices.join(', '));
    }

    renderServices();
    closeEditServicesModal();
    showSuccess('Serviços atualizados com sucesso!');
}

// Função para abrir modal de novo post
function openNewPostModal() {
    // Verificar se estamos no Android WebView
    if (window.Android && window.Android.selectMessageImage) {
        console.log('📱 Usando interface nativa do Android para seleção de imagem');
        try {
            // Para posts, vamos usar um identificador especial
            window.currentPostContext = 'profile_post';
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

// Função para fechar modal de novo post
function closeNewPostModal() {
    document.getElementById('newPostModal').classList.remove('show');
}

// Função para preview da imagem
function previewImage(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('imagePreview').innerHTML = `<img src="${e.target.result}" alt="Preview" style="max-width: 100%; max-height: 200px; border-radius: 8px;">`;
        };
        reader.readAsDataURL(file);
    }
}

// Função para converter arquivo para base64
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            try {
                // Sempre retornar a data URL completa (data:mime;base64,...)
                if (reader.result && reader.result.startsWith('data:')) {
                    console.log('📦 File convertido para data URL completa, length:', reader.result.length);
                    resolve(reader.result);
                } else {
                    console.error('❌ Resultado do FileReader não é uma data URL válida');
                    reject(new Error('Formato de arquivo inválido'));
                }
            } catch (error) {
                console.error('❌ Erro ao processar resultado do FileReader:', error);
                reject(error);
            }
        };
        reader.onerror = (error) => {
            console.error('❌ Erro no FileReader:', error);
            reject(error);
        };
        reader.readAsDataURL(file);
    });
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
    const imagePreview = modal.querySelector('.image-preview');
    const imageCaption = modal.querySelector('.image-caption-input');

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
        // Verificar se base64Data já é uma data URL completa
        let imageSrc;
        if (base64Data.startsWith('data:')) {
            // Já é uma data URL completa
            imageSrc = base64Data;
            console.log('🖼️ Usando data URL completa recebida:', imageSrc.substring(0, 100) + '...');
        } else {
            // Criar data URL a partir do base64 puro
            imageSrc = `data:${mimeType};base64,${base64Data}`;
            console.log('🖼️ Criando data URL a partir do base64:', imageSrc.substring(0, 100) + '...');
        }
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

// Função para fechar modal de imagem
function closeImageModal() {
    const modal = document.getElementById('imageModal');
    modal.style.display = 'none';

    // Limpar dados
    const imagePreview = modal.querySelector('.image-preview');
    const imageCaption = modal.querySelector('.image-caption-input');

    imagePreview.src = '';
    imageCaption.value = '';
}

// Função para enviar imagem com legenda
async function sendImageWithCaption() {
    const modal = document.getElementById('imageModal');
    const imagePreview = modal.querySelector('.image-preview');
    const imageCaption = modal.querySelector('.image-caption-input');

    if (!imagePreview.src || imagePreview.src === '') {
        console.error('❌ Nenhuma imagem para enviar');
        return;
    }

    // Usar diretamente a data URL completa do preview (que sabemos que funciona)
    const imageUrl = imagePreview.src;
    const caption = imageCaption.value.trim();

    console.log('📤 Enviando imagem com legenda:', caption ? caption.substring(0, 50) + '...' : 'sem legenda');
    console.log('📤 URL da imagem (preview):', imageUrl.substring(0, 100) + '...');

    try {
        // Fechar modal
        closeImageModal();

        // Salvar diretamente a data URL completa
        const postData = {
            imagemUrl: imageUrl, // Usar a data URL completa que funciona
            legenda: caption
        };

        const postId = await window.salvarPostPerfil(postData);
        console.log('✅ Post salvo com ID:', postId);

        // Recarregar posts para mostrar o novo
        await loadUserPosts();

        showSuccess('Post criado com sucesso!');

    } catch (error) {
        console.error('❌ Erro ao enviar imagem:', error);
        const errorMessage = error.message || error.toString() || 'Erro desconhecido';
        alert('Erro ao enviar imagem: ' + errorMessage);
    }
}

// Função para enviar imagem como post
async function sendImagePost(base64Data, mimeType, fileName, caption = '') {
    try {
        console.log('📤 Enviando imagem como post...', caption ? `com legenda: ${caption}` : 'sem legenda');

        // Usar o método de upload das mensagens que salva no Firestore
        if (window.enviarMensagemImagem) {
            // Adaptar para posts: criar um "post" em vez de mensagem
            // Como não temos uma função específica para posts, vamos usar o upload de imagem do perfil
            // e depois salvar como post

            // Primeiro fazer upload da imagem
            const imageBlob = base64ToBlob(base64Data, mimeType);
            const imageUrl = await window.uploadImagemPerfil(imageBlob);

            // Depois salvar o post
            const postData = {
                imagemUrl: imageUrl,
                legenda: caption
            };

            const postId = await window.salvarPostPerfil(postData);

            // Recarregar posts para mostrar o novo
            await loadUserPosts();

            showSuccess('Post criado com sucesso!');
        } else {
            console.log('📱 Método de upload não disponível, usando método alternativo');

            // Método alternativo: converter base64 para blob e usar uploadImagemPerfil
            const imageBlob = base64ToBlob(base64Data, mimeType);
            const imageUrl = await window.uploadImagemPerfil(imageBlob);

            // Salvar dados do post no Firestore
            const postData = {
                imagemUrl: imageUrl,
                legenda: caption
            };

            const postId = await window.salvarPostPerfil(postData);

            // Recarregar posts para mostrar o novo
            await loadUserPosts();

            showSuccess('Post criado com sucesso!');
        }

    } catch (error) {
        console.error('❌ Erro ao enviar imagem como post:', error);
        const errorMessage = error.message || error.toString() || 'Erro desconhecido';
        alert('Erro ao criar post: ' + errorMessage);
    }
}

// Função auxiliar para converter base64 para blob
function base64ToBlob(base64, mimeType) {
    try {
        // Limpar e validar a string base64
        let cleanBase64 = base64.replace(/[^A-Za-z0-9+/=]/g, '');

        // Garantir que tenha o padding correto
        while (cleanBase64.length % 4 !== 0) {
            cleanBase64 += '=';
        }

        console.log('🔧 Base64 limpa, comprimento:', cleanBase64.length);

        const byteCharacters = atob(cleanBase64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        return new Blob([byteArray], { type: mimeType });
    } catch (error) {
        console.error('❌ Erro ao converter base64 para blob:', error);
        console.error('❌ Base64 original (primeiros 100 chars):', base64.substring(0, 100));
        throw new Error('String base64 inválida: ' + error.message);
    }
}

// Função para processar imagem selecionada da galeria (chamada pelo Android)
function onMessageImageSelected(base64Data, mimeType) {
    console.log('📸 onMessageImageSelected CHAMADA no perfil!');
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

// Função para criar novo post (mantida para compatibilidade, mas não usada no novo fluxo)
async function createNewPost(e) {
    e.preventDefault();

    const imageFile = document.getElementById('postImage').files[0];
    const caption = document.getElementById('postCaption').value.trim();

    if (!imageFile) {
        alert('Por favor, selecione uma imagem.');
        return;
    }

    try {
        // Upload da imagem para Firebase Storage
        const imageUrl = await window.uploadImagemPerfil(imageFile);

        // Salvar dados do post no Firestore
        const postData = {
            imagemUrl: imageUrl,
            legenda: caption
        };

        const postId = await window.salvarPostPerfil(postData);

        // Recarregar posts para mostrar o novo
        await loadUserPosts();

        closeNewPostModal();
        showSuccess('Post criado com sucesso!');

    } catch (error) {
        console.error('Erro ao criar post:', error);
        alert('Erro ao criar post. Tente novamente.');
    }
}

// Função para abrir modal de post
function openPostModal(postId) {
    const post = userPosts.find(p => p.id === postId);
    if (!post) return;

    console.log('🖼️ Abrindo modal do post:', post.id);
    console.log('🖼️ imagemUrl length:', post.imagemUrl ? post.imagemUrl.length : 'null');
    console.log('🖼️ imagemUrl preview:', post.imagemUrl ? post.imagemUrl.substring(0, 100) + '...' : 'null');

    // Criar modal de post com opções de editar/excluir
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.9);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 3000;
    `;

    modal.innerHTML = `
        <div style="position: relative; max-width: 90%; max-height: 90%;">
            <!-- Botões de ação -->
            <div style="position: absolute; top: 10px; right: 10px; z-index: 10;">
                <button id="editPostBtn" style="background: rgba(255,255,255,0.8); border: none; border-radius: 50%; width: 40px; height: 40px; margin-right: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center;">
                    <span style="font-size: 18px; color: #0095f6;">E</span>
                </button>
                <button id="deletePostBtn" style="background: rgba(255,0,0,0.8); border: none; border-radius: 50%; width: 40px; height: 40px; cursor: pointer; display: flex; align-items: center; justify-content: center;">
                    <span style="font-size: 18px; color: white;">X</span>
                </button>
            </div>

            <!-- Imagem do post -->
            <img src="${post.imagemUrl || post.image}" alt="Post" style="max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 8px;" onload="console.log('✅ Imagem carregada com sucesso no modal')" onerror="console.error('❌ Erro ao carregar imagem no modal'); console.log('🔍 SRC completo:', this.src); console.log('🔍 SRC length:', this.src.length); this.style.display='none'; this.nextElementSibling.style.display='block';">
            <div style="display: none; color: white; text-align: center; padding: 20px; background: rgba(255,0,0,0.8); border-radius: 8px;">
                <p>❌ Erro ao carregar imagem</p>
                <p style="font-size: 12px;">Tamanho: ${post.imagemUrl ? post.imagemUrl.length : 'N/A'} caracteres</p>
                <button onclick="testImageDirectly('${post.id}')" style="margin-top: 10px; padding: 5px 10px; background: white; color: black; border: none; border-radius: 4px; cursor: pointer;">Testar Imagem</button>
            </div>

            <!-- Legenda -->
            ${post.legenda || post.caption ? `<p style="color: white; margin-top: 16px; text-align: center; background: rgba(0,0,0,0.5); padding: 10px; border-radius: 8px;">${post.legenda || post.caption}</p>` : ''}
        </div>
    `;

    // Adicionar event listeners
    modal.querySelector('#editPostBtn').addEventListener('click', () => {
        document.body.removeChild(modal);
        openEditPostModal(post);
    });

    modal.querySelector('#deletePostBtn').addEventListener('click', () => {
        if (confirm('Tem certeza que deseja excluir este post?')) {
            document.body.removeChild(modal);
            deletePost(post.id);
        }
    });

    modal.addEventListener('click', (e) => {
        // Fechar modal apenas se clicar fora da imagem
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    });

    document.body.appendChild(modal);
}

// Função para abrir modal de editar post
function openEditPostModal(post) {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 3000;
    `;

    modal.innerHTML = `
        <div style="background: white; border-radius: 12px; width: 90%; max-width: 400px; max-height: 80vh; overflow-y: auto;">
            <div style="padding: 20px;">
                <h3 style="margin: 0 0 20px 0; color: #262626;">Editar Post</h3>

                <form id="editPostForm">
                    <div style="margin-bottom: 16px;">
                        <label style="display: block; font-size: 14px; font-weight: 600; color: #262626; margin-bottom: 8px;">Legenda</label>
                        <textarea id="editPostCaption" rows="3" style="width: 100%; padding: 12px; border: 1px solid #dbdbdb; border-radius: 6px; font-size: 14px; font-family: 'Poppins', sans-serif; resize: vertical;">${post.legenda || post.caption || ''}</textarea>
                    </div>

                    <div style="display: flex; gap: 12px; justify-content: flex-end;">
                        <button type="button" id="cancelEditPost" style="background: #f0f0f0; color: #262626; border: none; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer;">Cancelar</button>
                        <button type="submit" style="background: #0095f6; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer;">Salvar</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    // Event listeners
    modal.querySelector('#cancelEditPost').addEventListener('click', () => document.body.removeChild(modal));
    modal.querySelector('#editPostForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const newCaption = document.getElementById('editPostCaption').value.trim();

        try {
            await window.atualizarPostPerfil(post.id, { legenda: newCaption });
            await loadUserPosts(); // Recarregar posts
            document.body.removeChild(modal);
            showSuccess('Post atualizado com sucesso!');
        } catch (error) {
            console.error('Erro ao atualizar post:', error);
            alert('Erro ao atualizar post. Tente novamente.');
        }
    });

    document.body.appendChild(modal);
}

// Função para excluir post
async function deletePost(postId) {
    try {
        await window.excluirPostPerfil(postId);
        await loadUserPosts(); // Recarregar posts
        showSuccess('Post excluído com sucesso!');
    } catch (error) {
        console.error('Erro ao excluir post:', error);
        alert('Erro ao excluir post. Tente novamente.');
    }
}

// Função para testar imagem diretamente
function testImageDirectly(postId) {
    const post = userPosts.find(p => p.id === postId);
    if (!post || !post.imagemUrl) {
        alert('Post ou imagem não encontrada');
        return;
    }

    console.log('🧪 Testando imagem diretamente...');
    console.log('🧪 Post ID:', postId);
    console.log('🧪 imagemUrl length:', post.imagemUrl.length);
    console.log('🧪 imagemUrl start:', post.imagemUrl.substring(0, 100));

    // Criar uma nova imagem para teste
    const testImg = new Image();
    testImg.onload = function() {
        console.log('✅ Teste: Imagem carregou com sucesso!');
        console.log('✅ Teste: Dimensões:', this.naturalWidth, 'x', this.naturalHeight);
        alert('✅ Imagem carregou com sucesso!\nDimensões: ' + this.naturalWidth + 'x' + this.naturalHeight);
    };
    testImg.onerror = function() {
        console.error('❌ Teste: Imagem falhou ao carregar');
        console.error('❌ Teste: SRC usado:', this.src);
        alert('❌ Imagem falhou ao carregar. Ver console para detalhes.');
    };

    testImg.src = post.imagemUrl;
}

// Função para mostrar sucesso
function showSuccess(message) {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #10b981;
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        z-index: 4000;
        font-size: 14px;
        font-weight: 500;
    `;
    document.body.appendChild(notification);

    setTimeout(() => {
        document.body.removeChild(notification);
    }, 3000);
}

// Função para formatar data
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
}

// Inicializar quando a página carregar e Firebase estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    console.log("🚀 DOMContentLoaded - Iniciando carregamento do perfil");

    // Aguardar Firebase estar pronto
    const checkFirebase = () => {
        if (window.firebaseReady) {
            console.log("✅ Firebase pronto, inicializando perfil...");
            initializeProfilePage();
        } else {
            console.log("⏳ Aguardando Firebase...");
            setTimeout(checkFirebase, 100);
        }
    };
    checkFirebase();
});

// Função para editar campo
function editField(field) {
    const fieldContainer = document.querySelector(`#${field}Edit`);
    if (fieldContainer) {
        fieldContainer.style.display = 'flex';

        // Preencher valor atual
        const input = document.getElementById(`${field}Input`);
        if (input) {
            switch(field) {
                case 'email':
                    input.value = currentUser.email || '';
                    break;
        case 'phone':
          input.value = currentUser.telefone || '';
          // Adicionar máscara ao campo de telefone
          if (input) {
            input.addEventListener('input', function() {
              formatPhone(this);
            });
          }
          break;
                case 'birthDate':
                    input.value = currentUser.dataNascimento || '';
                    break;
                case 'cpfCnpj':
                    input.value = currentUser.cpfCnpj || '';
                    break;
                case 'cep':
                    input.value = currentUser.cep || '';
                    break;
            }
        }
    }
}

// Função para cancelar edição
function cancelEdit(field) {
    const fieldContainer = document.querySelector(`#${field}Edit`);
    if (fieldContainer) {
        fieldContainer.style.display = 'none';
    }
}

// Função para salvar campo
function saveField(field) {
    const input = document.getElementById(`${field}Input`);
    if (!input) return;

    const value = input.value.trim();
    if (value === '') {
        alert('Por favor, preencha o campo.');
        return;
    }

    if (field === 'email' && !isValidEmail(value)) {
        alert('Por favor, insira um email válido.');
        return;
    }

    if (field === 'phone' && !isValidPhone(value)) {
        alert('Por favor, insira um telefone válido.');
        return;
    }

    switch(field) {
        case 'email':
            currentUser.email = value;
            document.getElementById('userEmail').textContent = value;
            if (window.Android) window.Android.updateUserField("email", value);
            break;
        case 'phone':
            currentUser.telefone = value;
            document.getElementById('userPhone').textContent = value;
            if (window.Android) window.Android.updateUserField("telefone", value);
            break;
        case 'birthDate':
            currentUser.dataNascimento = value;
            document.getElementById('userBirthDate').textContent = formatDate(value);
            if (window.Android) window.Android.updateUserField("dataNascimento", value);
            break;
        case 'cpfCnpj':
            currentUser.cpfCnpj = value;
            document.getElementById('userCpfCnpj').textContent = value;
            if (window.Android) window.Android.updateUserField("cpfCnpj", value);
            break;
        case 'cep':
            currentUser.cep = value;
            document.getElementById('userCep').textContent = value;
            if (window.Android) window.Android.updateUserField("cep", value);
            break;
    }

    localStorage.setItem('user', JSON.stringify(currentUser));
    cancelEdit(field);
    showSuccess('Campo atualizado com sucesso!');
}

// Funções de validação
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function isValidPhone(phone) {
    const phoneRegex = /^\(?(\d{2})\)?\s?9?\d{4}-?\d{4}$/;
    return phoneRegex.test(phone.replace(/\D/g, ''));
}

function formatDate(dateString) {
    if (!dateString) return 'Não informado';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
}

function formatPhone(input) {
  let value = input.value.replace(/\D/g, ''); // Remove non-digits

  // Limita a 11 dígitos (DDD + 9 dígitos)
  if (value.length > 11) {
    value = value.substring(0, 11);
  }

  // Aplica máscara: (11) 99999-9999
  if (value.length <= 11) {
    if (value.length <= 2) {
      value = value.replace(/(\d{0,2})/, '($1');
    } else if (value.length <= 6) {
      value = value.replace(/(\d{2})(\d{0,4})/, '($1) $2');
    } else if (value.length <= 10) {
      value = value.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
    } else {
      value = value.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
    }
  }

  input.value = value;
}

// Função para mostrar sucesso
function showSuccess(message) {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #28a745;
        color: white;
        padding: 10px 20px;
        border-radius: 8px;
        z-index: 3000;
        font-size: 14px;
    `;
    document.body.appendChild(notification);

    setTimeout(() => {
        document.body.removeChild(notification);
    }, 3000);
}

// Funções para gerenciar CEPs
function loadCeps() {
    try {
        // Primeiro tentar carregar o array completo de CEPs
        const savedCepsArray = localStorage.getItem('userCepsArray');
        if (savedCepsArray) {
            ceps = JSON.parse(savedCepsArray);
            console.log('CEPs carregados do array:', ceps);
        } else {
            // Fallback: carregar CEP único (compatibilidade)
            const savedCep = localStorage.getItem('userCeps');
            if (savedCep) {
                // Se for string simples, converter para array
                if (typeof savedCep === 'string' && !savedCep.startsWith('[')) {
                    ceps = [savedCep];
                } else {
                    ceps = JSON.parse(savedCep);
                }
                console.log('CEPs carregados do fallback:', ceps);
            }
        }

        const savedActiveCep = localStorage.getItem('activeCep');
        if (savedActiveCep) {
            activeCep = savedActiveCep;
        }

        if (ceps.length === 0 && window.Android && window.Android.loadUserCeps) {
            console.log('Tentando carregar CEPs do Firebase...');
            window.Android.loadUserCeps();
        }

        renderCeps();
    } catch (error) {
        console.error('Erro ao carregar CEPs:', error);
        ceps = [];
        renderCeps();
    }
}

function renderCeps() {
    const cepList = document.getElementById('cepList');
    if (!cepList) return;

    if (ceps.length === 0) {
        cepList.innerHTML = '<p class="no-addresses">Nenhum CEP cadastrado</p>';
        return;
    }

    cepList.innerHTML = ceps.map((cep, index) => `
        <div class="cep-item ${activeCep === cep ? 'active' : ''}">
            <div class="cep-content">
                <p><strong>CEP: ${cep}</strong></p>
                ${activeCep === cep ? '<span class="active-badge">ATIVO</span>' : ''}
            </div>
            <div class="cep-actions">
                ${activeCep !== cep ? `<button onclick="activateCep('${cep}')">Ativar</button>` : ''}
                <button onclick="deleteCep(${index})">Excluir</button>
            </div>
        </div>
    `).join('');
}

function addNewCep() {
    document.getElementById('cepModalTitle').textContent = 'Adicionar CEP';
    document.getElementById('cepForm').reset();
    document.getElementById('cepModal').style.display = 'block';
}

function closeCepModal() {
    document.getElementById('cepModal').style.display = 'none';
}

function activateCep(cep) {
    activeCep = cep;
    localStorage.setItem('activeCep', activeCep);

    // Atualizar o campo ceps no objeto user para manter consistência
    if (currentUser) {
        currentUser.ceps = cep; // Atualiza o campo ceps com o CEP ativo
        localStorage.setItem('user', JSON.stringify(currentUser));
        console.log('Campo ceps atualizado no user:', cep);
    }

    if (window.Android && window.Android.updateUserField) {
        window.Android.updateUserField('activeCep', cep);
        // Também atualizar o campo ceps no Firebase
        window.Android.updateUserField('ceps', cep);
    }

    updateGeolocationFromCep(cep);
    renderCeps();
    showSuccess(`CEP ${cep} ativado com sucesso!`);
}

function deleteCep(index) {
    const cepToDelete = ceps[index];

    // Não permitir excluir se for o único CEP
    if (ceps.length <= 1) {
        alert('Você não pode excluir seu único endereço. Adicione outro endereço antes de excluir este.');
        return;
    }

    if (confirm(`Tem certeza que deseja excluir o CEP ${cepToDelete}?`)) {
        if (activeCep === cepToDelete) {
            activeCep = null;
            localStorage.removeItem('activeCep');
        }

        ceps.splice(index, 1);

        // Atualizar localStorage com CEP ativo e array completo
        if (ceps.length > 0) {
            const novoCepAtivo = activeCep || ceps[0];
            localStorage.setItem('userCeps', novoCepAtivo);
            localStorage.setItem('userCepsArray', JSON.stringify(ceps));
            localStorage.setItem('activeCep', novoCepAtivo);

            if (window.Android && window.Android.saveUserCeps) {
                window.Android.saveUserCeps(novoCepAtivo);
            }
        } else {
            // Se não há mais CEPs, limpar tudo
            localStorage.removeItem('userCeps');
            localStorage.removeItem('userCepsArray');
            localStorage.removeItem('activeCep');
        }

        renderCeps();
        showSuccess('CEP excluído com sucesso!');
    }
}

function saveCep(editIndex = -1) {
    const cepInput = document.getElementById('cepInput');
    const cepValue = cepInput.value.trim().replace(/\D/g, '');

    if (!isValidCep(cepValue)) {
        alert('Por favor, insira um CEP válido (8 dígitos).');
        return;
    }

    const formattedCep = formatCep(cepValue);

    if (ceps.includes(formattedCep)) {
        alert('Este CEP já está cadastrado.');
        return;
    }

    if (editIndex >= 0) {
        ceps[editIndex] = formattedCep;
    } else {
        ceps.push(formattedCep);
        if (ceps.length === 1) {
            activeCep = formattedCep;
            localStorage.setItem('activeCep', activeCep);
        }
    }

    // Sempre salvar como string simples (CEP ativo), não como array
    const cepAtivo = activeCep || formattedCep;
    localStorage.setItem('userCeps', cepAtivo);

    // Para compatibilidade, também salvar o array completo em outra chave
    localStorage.setItem('userCepsArray', JSON.stringify(ceps));

    if (window.Android && window.Android.saveUserCeps) {
        window.Android.saveUserCeps(cepAtivo);
    }

    renderCeps();
    closeCepModal();
    showSuccess(editIndex >= 0 ? 'CEP atualizado!' : 'CEP adicionado!');
}

function isValidCep(cep) {
    return cep.length === 8;
}

function formatCep(cep) {
    return cep.replace(/(\d{5})(\d{3})/, '$1-$2');
}

function updateGeolocationFromCep(cep) {
    console.log('Atualizando geolocalização para CEP:', cep);
    if (window.Android && window.Android.updateGeolocation) {
        window.Android.updateGeolocation(cep);
    }
}

function syncWithFirebase() {
    if (window.Android && window.Android.refreshUserData) {
        console.log('Sincronizando dados com Firebase...');
        window.Android.refreshUserData();
        setTimeout(() => {
            console.log('Recarregando dados após sync com Firebase...');
            loadUserData();
            loadCeps();
        }, 1000);
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    loadCeps();

    const cepForm = document.getElementById('cepForm');
    if (cepForm) {
        cepForm.addEventListener('submit', (e) => {
            e.preventDefault();
            saveCep();
        });
    }

    // Não fazer sincronização automática no perfil para evitar sobrescrever dados locais
    console.log('Perfil carregado - usando dados locais');

    const btnServicos = document.getElementById('btnServicos');
    if (btnServicos) btnServicos.addEventListener('click', () => window.location.href = "pedidos.html");

    const btnHome = document.getElementById('btnHome');
    if (btnHome) btnHome.addEventListener('click', () => window.location.href = "home.html");

    const btnMensagens = document.getElementById('btnMensagens');
    if (btnMensagens) btnMensagens.addEventListener('click', () => window.location.href = "mensagens.html");

    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            if (window.Android && window.Android.logout) {
                window.Android.logout();
            } else {
                localStorage.clear();
                window.location.href = "index.html";
            }
        });
    }

    const btnSettings = document.getElementById('btnSettings');
    if (btnSettings) {
        btnSettings.addEventListener('click', () => {
            window.location.href = "configuracoes.html";
        });
    }
});

// Funcionalidade botão voltar
window.history.pushState({page: 'perfil'}, 'Perfil', window.location.href);

window.addEventListener('popstate', function(event) {
    if (event.state && event.state.page === 'perfil') {
        event.preventDefault();
        window.location.href = "home.html";
        return false;
    }
});

window.addEventListener('beforeunload', function() {
    setTimeout(() => window.location.href = "home.html", 100);
});

window.addEventListener('unload', function() {
    window.location.href = "home.html";
});

if (window.Android && window.Android.onBackPressed) {
    window.Android.onBackPressed = function() {
        window.location.href = "home.html";
    };
}

// Função para mostrar interface completa de paneleiro
function showPaneleiroInterface() {
    console.log("👷 Mostrando interface completa para paneleiro");

    // Mostrar seção de serviços
    const servicesSection = document.getElementById('servicesSection');
    if (servicesSection) {
        servicesSection.style.display = 'block';
    }

    // Mostrar abas de navegação (posts/avaliações)
    const profileTabs = document.getElementById('profileTabs');
    if (profileTabs) {
        profileTabs.style.display = 'flex';
    }

    // As abas são controladas pela classe .active no CSS, não por style.display

    // Mostrar botão de novo post
    const newPostBtn = document.getElementById('newPostBtn');
    if (newPostBtn) {
        newPostBtn.style.display = 'flex';
    }

    // Mostrar botão de editar serviços
    const editServicesBtn = document.getElementById('editServicesBtn');
    if (editServicesBtn) {
        editServicesBtn.style.display = 'block';
    }

    // Botões de configurações e logout já estão posicionados corretamente no HTML
    const profileActions = document.querySelector('.profile-actions');
    if (profileActions) {
        profileActions.style.display = 'flex';
    }

    // Calcular e mostrar avaliações
    calculateAndDisplayRating();
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

// Função para mostrar interface simples de cliente
function showClienteInterface() {
    console.log("👤 Mostrando interface simples para cliente");

    // Esconder seção de serviços completamente (usar classe CSS)
    const servicesSection = document.querySelector('.services-section');
    console.log("👤 servicesSection encontrado:", !!servicesSection);
    if (servicesSection) {
        servicesSection.style.display = 'none';
        console.log("👤 servicesSection escondido");
    }

    // Esconder abas de navegação completamente (usar classe CSS)
    const profileTabs = document.querySelector('.profile-tabs');
    console.log("👤 profileTabs encontrado:", !!profileTabs);
    if (profileTabs) {
        profileTabs.style.display = 'none';
        console.log("👤 profileTabs escondido");
    }

    // Esconder todo o conteúdo principal (posts/avaliações) (usar classe CSS)
    const profileContent = document.querySelector('.profile-content');
    console.log("👤 profile-content encontrado:", !!profileContent);
    if (profileContent) {
        profileContent.style.display = 'none';
        console.log("👤 profile-content escondido");
    }

    // Esconder botão de novo post
    const newPostBtn = document.getElementById('newPostBtn');
    console.log("👤 newPostBtn encontrado:", !!newPostBtn);
    if (newPostBtn) {
        newPostBtn.style.display = 'none';
        console.log("👤 newPostBtn escondido");
    }

    // Esconder botão de editar serviços
    const editServicesBtn = document.getElementById('editServicesBtn');
    console.log("👤 editServicesBtn encontrado:", !!editServicesBtn);
    if (editServicesBtn) {
        editServicesBtn.style.display = 'none';
        console.log("👤 editServicesBtn escondido");
    }

    // Para clientes, mostrar apenas informações básicas
    // Remover avaliações e estrelas
    const ratingStars = document.getElementById('ratingStars');
    const ratingValue = document.getElementById('ratingValue');
    console.log("👤 ratingStars encontrado:", !!ratingStars);
    console.log("👤 ratingValue encontrado:", !!ratingValue);
    if (ratingStars) {
        ratingStars.style.display = 'none';
        console.log("👤 ratingStars escondido");
    }
    if (ratingValue) {
        ratingValue.style.display = 'none';
        console.log("👤 ratingValue escondido");
    }

    // Mostrar botões de configurações e logout para clientes
    const profileActions = document.querySelector('.profile-actions');
    console.log("👤 profile-actions encontrado:", !!profileActions);
    if (profileActions) {
        profileActions.style.display = 'flex'; // Mostrar os botões
        console.log("👤 profile-actions mostrado");
    }
}

let backPressed = false;
document.addEventListener('visibilitychange', function() {
    if (document.hidden && !backPressed) {
        backPressed = true;
        setTimeout(() => {
            if (backPressed) {
                window.location.href = "home.html";
            }
        }, 500);
    } else if (!document.hidden) {
        // Quando a página volta a ficar visível, recarregar dados para garantir consistência
        console.log('Página do perfil voltou a ficar visível, recarregando dados...');
        loadUserData();
    }
});
