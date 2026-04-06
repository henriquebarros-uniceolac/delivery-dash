/* ========================================
   CONFIG.JS - Configurações do Jogo
   ========================================
   Aqui ficam todas as constantes e valores
   que controlam o comportamento do jogo.

   Separamos em um arquivo para facilitar
   ajustes sem mexer na lógica principal.
   ======================================== */

// ---------- TAMANHO DO CANVAS ----------
// Resolução INTERNA fixa do jogo (nunca muda).
// No mobile, o CSS escala visualmente para caber na tela,
// mas o jogo SEMPRE usa 800x600 internamente.
const LARGURA_CANVAS = 800;
const ALTURA_CANVAS = 600;

// ---------- CONFIGURAÇÕES DO JOGADOR ----------
const CONFIG_JOGADOR = {
    largura: 32,       // Largura do sprite (moto é mais estreita que carro)
    altura: 55,        // Altura do sprite (moto é comprida)
    velocidade: 5,     // Velocidade de movimento (pixels por frame)
    cor: '#e94560'     // Cor principal da moto
};

// ---------- CONFIGURAÇÕES DO TEMPO ----------
const CONFIG_TEMPO = {
    inicial: 35,         // Tempo inicial em segundos
    bonusEntrega: 4,     // Segundos extras por entrega concluída
    alertaSegundos: 10,  // Quando faltar esse tempo, spawna bônus na pista
    bonusItemMin: 8,     // Mínimo de segundos do item de tempo
    bonusItemMax: 10     // Máximo de segundos do item de tempo
};

// ---------- CONFIGURAÇÕES DE VIDAS ----------
const CONFIG_VIDAS = {
    inicial: 5,            // Começa com 5 vidas (corações)
    invencivel: 90,        // Frames de invencibilidade após dano (~1.5 segundos)
    tempoCoracaoAparecer: 5 // Segundos até um coração de recuperação aparecer na pista
};

// ---------- CONFIGURAÇÕES DE DIFICULDADE ----------
// A dificuldade sobe gradualmente — desafiante mas sempre jogável
const CONFIG_DIFICULDADE = {
    // A cada X entregas, sobe de nível
    entregasPorNivel: 3,

    // Quantidade inicial de obstáculos na tela
    obstaculosIniciais: 3,

    // Obstáculos adicionais por nível (máximo de 1 novo por vez)
    obstaculosPorNivel: 1,

    // Máximo de obstáculos na tela (nunca fica impossível)
    obstaculosMaximo: 12,

    // Aumento de velocidade dos obstáculos por nível (suave)
    aumentoVelocidade: 0.25,

    // Velocidade máxima dos obstáculos (teto)
    velocidadeMaxima: 5
};

// ---------- CONFIGURAÇÕES DOS OBSTÁCULOS ----------
const CONFIG_OBSTACULOS = {
    larguraMin: 40,     // Largura mínima
    larguraMax: 70,     // Largura máxima
    alturaMin: 40,      // Altura mínima
    alturaMax: 60,      // Altura máxima
    velocidadeBase: 1.5 // Velocidade base de movimento
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

// ---------- CONFIGURAÇÕES DE CENÁRIO POR NÍVEL ----------
// Cada nível muda a aparência do jogo para dar variedade
// e sensação de progressão. Definido como função para facilitar.
/**
 * obterCenarioNivel(nivel)
 * -------------------------
 * Retorna as cores e efeitos visuais para cada nível.
 * O cenário muda gradualmente conforme o jogador avança.
 *
 * Nível 1-2:  Dia ensolarado (verde, céu claro)
 * Nível 3-4:  Entardecer (tons de laranja)
 * Nível 5-6:  Noite (escuro, asfalto mais escuro)
 * Nível 7-8:  Noite com chuva (gotas na tela)
 * Nível 9-10: Amanhecendo com neblina (tons claros)
 * Nível 11+:  Tempestade (chuva forte + relâmpagos)
 *
 * @param {number} nivel - Nível atual do jogo
 * @returns {Object} - Cores e flags de efeitos
 */
function obterCenarioNivel(nivel) {
    if (nivel <= 2) {
        // DIA ENSOLARADO
        return {
            nome: 'Dia Ensolarado',
            grama: '#2d5a1e',
            calcada: '#c4b9a0',
            estrada: '#3d3d3d',
            faixa: '#ffffff',
            ceu: '#87CEEB',
            chuva: false,
            neblina: false,
            relampago: false,
            escuridao: 0   // 0 = totalmente claro
        };
    } else if (nivel <= 4) {
        // ENTARDECER
        return {
            nome: 'Entardecer',
            grama: '#4a5a1e',
            calcada: '#b8a080',
            estrada: '#353535',
            faixa: '#f0e0c0',
            ceu: '#e8734a',
            chuva: false,
            neblina: false,
            relampago: false,
            escuridao: 0.1
        };
    } else if (nivel <= 6) {
        // NOITE (clareada — dá pra enxergar bem)
        return {
            nome: 'Noite',
            grama: '#1a3a15',
            calcada: '#5a5a4a',
            estrada: '#2a2a2a',
            faixa: '#aaaaaa',
            ceu: '#151535',
            chuva: false,
            neblina: false,
            relampago: false,
            escuridao: 0.2
        };
    } else if (nivel <= 8) {
        // NOITE COM CHUVA
        return {
            nome: 'Chuva Noturna',
            grama: '#1a3a15',
            calcada: '#4a4a3a',
            estrada: '#222222',
            faixa: '#888888',
            ceu: '#101030',
            chuva: true,
            neblina: false,
            relampago: false,
            escuridao: 0.25
        };
    } else if (nivel <= 10) {
        // AMANHECENDO COM NEBLINA
        return {
            nome: 'Neblina',
            grama: '#3a5a2e',
            calcada: '#a0a090',
            estrada: '#3a3a3a',
            faixa: '#cccccc',
            ceu: '#8899aa',
            chuva: false,
            neblina: true,
            relampago: false,
            escuridao: 0.15
        };
    } else {
        // TEMPESTADE (nível 11+)
        return {
            nome: 'Tempestade',
            grama: '#152015',
            calcada: '#353535',
            estrada: '#1a1a1a',
            faixa: '#777777',
            ceu: '#0a0a25',
            chuva: true,
            neblina: true,
            relampago: true,
            escuridao: 0.3
        };
    }
}
