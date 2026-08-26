# Conserta Já — Aplicativo Mobile

<p align="center">
  <a href="https://developer.android.com/studio" target="_blank">
    <img src="https://img.shields.io/badge/Android%20Studio-3DDC84?style=for-the-badge&logo=android-studio&logoColor=white" alt="Android Studio">
  </a>
  <a href="https://www.java.com/" target="_blank">
    <img src="https://img.shields.io/badge/Java-ED8B00?style=for-the-badge&logo=openjdk&logoColor=white" alt="Java">
  </a>
  <a href="https://firebase.google.com/" target="_blank">
    <img src="https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black" alt="Firebase">
  </a>
  <a href="https://leafletjs.com/" target="_blank">
    <img src="https://img.shields.io/badge/Leaflet-199900?style=for-the-badge&logo=leaflet&logoColor=white" alt="Leaflet">
  </a>
</p>

> A **Conserta Já** é uma plataforma de integração mobile voltada para a conexão entre prestadores de serviços especializados em manutenção e seus clientes. O foco central reside em profissionais de ocupações tradicionais e pouco mercantilizados (como paneleiros, afiadores e técnicos de eletrodomésticos), que frequentemente operam na informalidade e com baixa visibilidade de mercado.

---

## Funcionalidades Principais

* **Autenticação:** Login com Google, E-mail/Senha e Telefone (com verificação por SMS).
* **Perfis Personalizados:** Cadastro de clientes, estabelecimentos *food-service* e paneleiros/afiadores com validação de CPF/CNPJ, fotos e CEP.
* **Geolocalização & Endereços:** Navegação por mapa via Leaflet + Android Studio e busca por CEP via API ViaCEP e Nominatim.
* **Gestão de Serviços:** Abertura, confirmação, acompanhamento e cancelamento de solicitações de manutenção.
* **Comunicação & Avaliação:** Troca de mensagens entre cliente e prestador, galeria/portfólio no perfil do profissional e avaliações de 1 a 5 estrelas.
* **Acessibilidade:** Ajustes e recursos integrados de acessibilidade.

---

## APIs e Serviços Utilizados

* **[Firebase Auth](https://firebase.google.com/docs/auth)** — Autenticação de usuários (E-mail, Google e SMS)
* **[Firebase Realtime Database](https://firebase.google.com/docs/database)** — Armazenamento e sincronização de dados em tempo real
* **[ViaCEP](https://viacep.com.br/)** — Consulta automática de CEP e logradouros
* **[Nominatim / OpenStreetMap](https://nominatim.org/)** — Geocodificação de endereços
* **[Leaflet](https://leafletjs.com/)** — Visualização interativa de mapas

---

## Nossa Equipe

O projeto foi desenvolvido por uma equipe multidisciplinar:

* **Flávio Henrique** — *Líder do Grupo*
* **Gabriel Santos** — *Desenvolvedor Back-end*
* **Leandro Oliveira** — *Designer e Analista*
* **Luiz Knapick** — *Analista e Desenvolvedor Full-Stack*

---

## Como executar o projeto

Você pode testar a **Conserta Já** de duas maneiras: utilizando o aplicativo pronto ou executando o código-fonte na sua máquina.

### Opção 1 — Baixar o APK (Instalação Rápida)

Se você deseja apenas testar o aplicativo sem precisar configurar um ambiente de desenvolvimento:

1. Acesse a área de **[Releases](../../releases)** deste repositório.
2. Baixe o arquivo `app-debug.apk`.
3. Transfira para o seu dispositivo Android e execute-o para instalar.

---

### Opção 2 — Executar pelo Android Studio (Para Desenvolvedores)

Para compilar, modificar e executar o projeto, certifique-se de ter os seguintes requisitos instalados:

* **[Android Studio](https://developer.android.com/studio)** (Versão Jellyfish, Koala ou superior recomendada)
* **JDK (Java Development Kit)** versão 11 ou superior
* Dispositivo físico Android conectado via depuração USB ou um emulador (AVD) configurado.

> **Atenção!** Ao compilar e executar o aplicativo localmente em sua máquina, o **Login com Google** e a **Verificação por SMS (Firebase Auth)** podem não funcionar se a chave **SHA-1** da sua máquina não estiver cadastrada no seu projeto do Console Firebase.

> **Dica:** Certifique-se de ter o arquivo `google-services.json` configurado na pasta `/app` do projeto para que a conexão com o Firebase funcione corretamente.

**Passo a passo:**

1. Clone o repositório em sua máquina:
   ```bash
   git clone [https://github.com/knapicko/TCC-ETEC--app.git](https://github.com/knapicko/TCC-ETEC--app.git)
