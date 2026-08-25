# Conserta Já — Aplicativo Mobile (TCC ETEC)

> **Aplicativo Android para conexão entre clientes, estabelecimentos food-service e profissionais de manutenção especializada (paneleiros).**
> 
> Projeto desenvolvido como Trabalho de Conclusão de Curso (TCC) no curso técnico da ETEC.

---

## Sobre o Projeto

O **Conserta Já** é uma solução mobile projetada para facilitar a contratação, acompanhamento e gerenciamento de serviços de manutenção. O app conecta diretamente clientes residenciais e comerciais (food-service) a prestadores de serviço especializados, oferecendo navegação por mapa, sistema de pedidos e comunicação integrada.

---

## Tecnologias e Ferramentas

* **IDE / Linguagem:** Android Studio (Java)
* **Backend & Autenticação:** Firebase Auth, Firebase Realtime Database
* **Geolocalização & Mapas:** Leaflet, OpenStreetMap / Nominatim, API ViaCEP
* **Design & Layout:** XML Android, Material Design

---

## Funcionalidades Principais

### Autenticação e Gestão de Contas
* **Opções de Login:** Login via Google, E-mail/Senha e Telefone (com verificação por SMS).
* **Recuperação de Acesso:** Recuperação de senha por e-mail e telefone.
* **Perfis Personalizados:** Perfis distintos para Cliente, Paneleiro e Food-Service com validação de CPF/CNPJ, foto e localização.
* **Sessão:** Opção de manter-se conectado e efetuar logout com segurança.

### Localização e Endereços
* **Geolocalização Integrada:** Busca de endereço via GPS/Leaflet e inserção manual via CEP (APIs ViaCEP + Nominatim).
* **Gerenciamento de CEP:** Salvamento e rápida seleção de endereços cadastrados.

### Serviços e Pedidos
* **Fluxo Completo de Pedidos:** Abertura, confirmação, acompanhamento e cancelamento de serviços.
* **Histórico:** Consulta a solicitações passadas e status detalhado dos atendimentos.
* **Portfólio para Prestadores:** Postagem e exibição de fotos de trabalhos realizados no perfil do profissional.
* **Comunicação:** Sistema de mensagens direto entre cliente e prestador.
* **Avaliação:** Sistema de avaliação do serviço prestado (1 a 5 estrelas).

### Acessibilidade
* Recursos integrados para melhor usabilidade de diferentes perfis de usuário.

---

## Estrutura do Projeto

```text
Conserta-Ja-App/
├── app/
│   ├── src/
│   │   └── main/
│   │       ├── java/          # Código-fonte Java (Activities, Adapters, Models)
│   │       ├── res/           # Layouts XML, Drawables, Values e Recursos
│   │       └── AndroidManifest.xml
│   └── build.gradle
├── README.md
└── build.gradle
