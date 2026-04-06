/* ========================================
   CONFIG.JS - Configurações do Jogo
   ========================================
   Aqui ficam todas as constantes e valores
   que controlam o comportamento do jogo.

   Separamos em um arquivo para facilitar
   ajustes sem mexer na lógica principal.
   ======================================== */

// ---------- TAMANHO DO CANVAS ----------
// Define a área jogável (em pixels)
const LARGURA_CANVAS = 800;
const ALTURA_CANVAS = 600;

// ---------- CONFIGURAÇÕES DO JOGADOR ----------
const CONFIG_JOGADOR = {
    largura: 40,       // Largura do sprite do jogador
    altura: 50,        // Altura do sprite do jogador
    velocidade: 5,     // Velocidade de movimento (pixels por frame)
    cor: '#00d4ff'     // Cor principal do jogador
};

// ---------- CONFIGURAÇÕES DO TEMPO ----------
const CONFIG_TEMPO = {
    inicial: 60,       // Tempo inicial em segundos
    bonusEntrega: 10   // Segundos extras por entrega concluída
};

// ---------- CONFIGURAÇÕES DE DIFICULDADE ----------
const CONFIG_DIFICULDADE = {
    // A cada X entregas, sobe de nível
    entregasPorNivel: 3,

    // Quantidade inicial de obstáculos na tela
    obstaculosIniciais: 4,

    // Obstáculos adicionais por nível
    obstaculosPorNivel: 2,

    // Aumento de velocidade dos obstáculos por nível
    aumentoVelocidade: 0.5
};

// ---------- CONFIGURAÇÕES DOS OBSTÁCULOS ----------
const CONFIG_OBSTACULOS = {
    larguraMin: 40,     // Largura mínima
    larguraMax: 70,     // Largura máxima
    alturaMin: 40,      // Altura mínima
    alturaMax: 60,      // Altura máxima
    velocidadeBase: 2   // Velocidade base de movimento
};

// ---------- CONFIGURAÇÕES DAS ENTREGAS ----------
const CONFIG_ENTREGAS = {
    tamanhoPedido: 30,   // Tamanho da caixa de pedido
    tamanhoDestino: 45,  // Tamanho do marcador de destino
    pontosEntrega: 100   // Pontos ganhos por entrega
};

// ---------- CORES DO JOGO ----------
// Paleta de cores usada para desenhar os elementos
const CORES = {
    estrada: '#3d3d3d',       // Cor do asfalto
    faixa: '#ffffff',          // Faixas da estrada
    calcada: '#5a5a5a',       // Calçada lateral
    grama: '#2d5a1e',         // Grama nas bordas
    obstaculo_carro: '#e74c3c',  // Carros vermelhos
    obstaculo_buraco: '#1a1a1a', // Buracos escuros
    obstaculo_pedestre: '#f39c12', // Pedestres amarelos
    pedido: '#ff6b35',         // Caixa de pedido (laranja)
    destino: '#2ecc71',        // Destino (verde)
    jogador: '#00d4ff'         // Jogador (azul)
};
