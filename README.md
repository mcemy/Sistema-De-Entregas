# 🚁 Sistema de Entregas por Drones

Sistema completo de simulação de entregas por drones urbanos com otimização inteligente, gerenciamento de estados, APIs RESTful e dashboard em tempo real.

## Características

- **Gerenciamento de Drones**: Criação, monitoramento e remoção de drones com capacidade, alcance e bateria
- **Sistema de Pedidos**: Criação e cancelamento de pedidos com localização, peso e prioridade
- **Otimização Inteligente**: Algoritmo que distribui pedidos entre múltiplos drones de forma eficiente
- **Simulação em Tempo Real**: Sistema de estados (Idle → Carregando → Em voo → Entregando → Retornando)
- **Gerenciamento de Bateria**: Bateria diminui com a distância percorrida
- **Dashboard Moderno**: Interface React com visualização em tempo real (atualização a cada 1 segundo)
- **Estatísticas**: Relatórios de desempenho e drone mais eficiente
- **APIs RESTful**: Endpoints completos para todas as operações
- **Persistência SQLite**: Dados persistem após reiniciar o servidor
- **Testes Unitários**: Cobertura de testes para modelos e utilitários

## Tecnologias Utilizadas

**Backend**: Node.js + Express + TypeScript + SQLite  
**Frontend**: React + TypeScript + CSS3  
**Banco de Dados**: SQLite 3 com better-sqlite3  
**Testes**: Jest

## Como Executar

### Pré-requisitos

- Node.js 18+ instalado
- npm ou yarn

### ⚡ Instalação e Execução

**Você precisa rodar 2 terminais diferentes ao mesmo tempo:**

#### 📺 Terminal 1 - Backend (API)

```bash
cd server
npm install
npm run dev
```

Isso inicia o Express na **porta 3001** ⚙️

#### 📺 Terminal 2 - Frontend (Dashboard)

```bash
# Na raiz do projeto (em outro terminal)
npm install
npm start
```

Isso inicia o React na **porta 3000** 🎨

### Acessar o Sistema

- **Dashboard**: [http://localhost:3000](http://localhost:3000)
- **API**: [http://localhost:3001/api](http://localhost:3001/api)
- **Health Check**: [http://localhost:3001/health](http://localhost:3001/health)

### Testes

```bash
cd server
npm test
npm run test:coverage
```

## Como Funciona

### Fluxo de Funcionamento

#### 1. Criação de Drones

- Nome identificador
- Capacidade máxima de peso (kg)
- Alcance máximo (km)
- Bateria (inicia com 100%)
- Localização inicial: base (0, 0)

#### 2. Criação de Pedidos

- Localização do cliente (coordenadas x, y)
- Destino de entrega (opcional, diferente da localização do pedido)
- Peso do pacote (kg)
- Prioridade (low, medium, high)

#### 3. Entregas

As entregas são criadas através da API usando o endpoint de otimização ou podem ser gerenciadas manualmente. O sistema distribui pedidos entre drones disponíveis considerando:

- Prioridade dos pedidos
- Disponibilidade de drones (idle + bateria > 20%)
- Capacidade e alcance dos drones
- Rota otimizada: **Base → Pedido → Destino → Base**

#### 4. Simulação em Tempo Real

Estados dos drones:

```text
IDLE → LOADING → FLYING → DELIVERING → RETURNING → IDLE
```

**Durante o voo:**

- Bateria diminui 1% por km
- Localização atualizada em tempo real
- Quando chega no destino: status muda para "delivered"
- Retorna à base e recarrega automaticamente

#### 5. Visualização no Mapa

- **Base (roxo)**: Localização de saída
- **Pedido (laranja)**: Ponto onde pegar o pacote
- **Destino (rosa)**: Ponto de entrega final
- **Drone em Voo (azul)**: Se movimentando pela rota
- Rotas traçadas em tempo real

## Capturas de Tela

### Tela Inicial

![Tela Inicial](screenshots/1%20-%20tela%20inicial.jpeg)

### Gerenciamento de Drones

![Drones](screenshots/2%20-%20%20Drones.jpeg)

### Gerenciamento de Pedidos

![Pedidos](screenshots/3%20-%20Pedidos.jpeg)

## Video Demonstrativo

Veja o sistema em ação:

📹 [Assista o vídeo do sistema de entregas](screenshots/Sistema%20de%20entregas.MP4)

> Demonstração do sistema funcionando

## APIs Disponíveis

### Pedidos

- `POST /api/orders` - Criar novo pedido (com `deliveryLocation` opcional)
- `GET /api/orders` - Listar todos os pedidos
- `GET /api/orders/:id` - Obter pedido específico
- `DELETE /api/orders/:id` - Cancelar pedido

### Drones

- `POST /api/drones` - Criar novo drone
- `GET /api/drones` - Listar todos os drones
- `GET /api/drones/:id` - Obter drone específico
- `GET /api/drones/:id/status` - Obter status detalhado do drone
- `POST /api/drones/:id/recharge` - Recarregar bateria
- `DELETE /api/drones/:id` - Remover drone (idle apenas)

### Entregas

- `POST /api/deliveries/optimize` - Otimizar e criar entregas
- `GET /api/deliveries` - Listar todas as entregas (com filtro por status)
- `GET /api/deliveries/:id` - Obter entrega específica
- `GET /api/deliveries/:id/route` - Obter rota da entrega
- `GET /api/deliveries/stats` - Estatísticas do sistema

### Simulação

- `POST /api/deliveries/simulate/start` - Iniciar simulação
- `POST /api/deliveries/simulate/stop` - Parar simulação
- `POST /api/deliveries/simulate/step` - Executar um passo da simulação
- `POST /api/deliveries/reset` - Resetar todo o sistema

## 📊 Estrutura do Projeto

```text
.
├── server/                 # Backend Node.js/Express
│   ├── src/
│   │   ├── controllers/   # Controladores da API
│   │   ├── models/        # Modelos de dados
│   │   ├── services/      # Serviços (Otimização, Simulação)
│   │   ├── routes/        # Rotas da API
│   │   ├── types/         # Tipos TypeScript
│   │   ├── utils/         # Utilitários
│   │   └── __tests__/     # Testes unitários
│   └── package.json
├── client/                # Frontend React
│   ├── src/
│   │   ├── components/    # Componentes React
│   │   ├── services/      # Cliente API
│   │   └── types/         # Tipos TypeScript
│   └── package.json
└── package.json          # Scripts
```

## 🎨 Funcionalidades Avançadas

### Sistema de Estados dos Drones

- **Idle**: Drone ocioso
- **Loading**: Carregando pacotes
- **Flying**: Em voo pela rota
- **Delivering**: Entregando pacotes
- **Returning**: Retornando à base

### Operações de Drones

- Criação com capacidade e alcance personalizados
- Recarga automática de bateria na base
- Remoção apenas de drones ociosos
- Monitoramento em tempo real

### Otimização Inteligente

- Prioriza por prioridade e tempo de criação
- Distribui entre múltiplos drones
- Agrupa pedidos quando necessário
- Seleciona drone com mais bateria
- Algoritmo Nearest Neighbor para rotas

### Armazenamento de dados com SQLite

- Armazenamento automático de todos os dados
- Recuperação automática ao reiniciar servidor
- Três tabelas: orders, drones, deliveries
- Modo WAL para melhor desempenho

## Exemplos de Uso

### Criar um drone

```bash
curl -X POST http://localhost:3001/api/drones \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Drone Alpha",
    "maxWeight": 10,
    "maxDistance": 50,
    "baseLocation": {"x": 0, "y": 0}
  }'
```

### Criar um pedido

```bash
curl -X POST http://localhost:3001/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customerLocation": {"x": 10, "y": 20},
    "deliveryLocation": {"x": 15, "y": 25},
    "weight": 5,
    "priority": "high"
  }'
```

### Iniciar simulação

```bash
curl -X POST http://localhost:3001/api/deliveries/simulate/start \
  -H "Content-Type: application/json" \
  -d '{"intervalMs": 1000}'
```

## Desenvolvimento

Arquitetura modular com separação clara de responsabilidades:

- Controllers: Lidam com requisições HTTP
- Models: Lógica de dados
- Services: Contêm lógica de negócio complexa
- Routes: Definem endpoints da API
- Utils: Funções auxiliares reutilizáveis
