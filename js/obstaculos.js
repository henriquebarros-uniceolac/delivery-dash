/* ========================================
   OBSTACULOS.JS - Sistema de Obstáculos
   ========================================
   Gerencia os obstáculos que aparecem no jogo:
   - Carros (se movem pela estrada)
   - Buracos (estáticos no chão)
   - Pedestres (andam devagar)

   Os obstáculos nascem no topo e descem,
   simulando o jogador avançando pela cidade.
   ======================================== */

// ---------- LISTA DE OBSTÁCULOS ----------
// Array que guarda todos os obstáculos ativos
let obstaculos = [];

// ---------- TIPOS DE OBSTÁCULOS ----------
// Cores variadas para os carros (cada carro ganha uma aleatória)
const CORES_CARROS = [
    '#e74c3c',  // Vermelho
    '#3498db',  // Azul
    '#2ecc71',  // Verde
    '#f1c40f',  // Amarelo
    '#9b59b6',  // Roxo
    '#1abc9c',  // Verde-água
    '#e67e22',  // Laranja
    '#ecf0f1',  // Branco
    '#34495e',  // Cinza escuro
    '#c0392b'   // Vermelho escuro
];

// Cada tipo tem aparência e comportamento diferente
const TIPOS_OBSTACULO = {
    carro: {
        cor: CORES.obstaculo_carro,
        emoji: '🚗',
        largura: 45,
        altura: 55,
        velocidadeExtra: 1  // Carros são mais rápidos
    },
    buraco: {
        cor: CORES.obstaculo_buraco,
        emoji: '🕳️',
        largura: 40,
        altura: 40,
        velocidadeExtra: 0  // Buracos não se movem sozinhos
    },
    pedestre: {
        cor: CORES.obstaculo_pedestre,
        emoji: '🚶',
        largura: 30,
        altura: 35,
        velocidadeExtra: -0.5  // Pedestres são mais lentos
    },
    moto: {
        cor: '#ff6600',
        emoji: '🏍️',
        largura: 28,
        altura: 45,
        velocidadeExtra: 1.5   // Motos são as mais rápidas
    }
};

/**
 * criarObstaculo(nivelAtual)
 * ---------------------------
 * Cria um novo obstáculo com posição aleatória no topo.
 * O tipo é escolhido aleatoriamente.
 * A velocidade aumenta conforme o nível.
 *
 * @param {number} nivelAtual - Nível atual do jogo (afeta velocidade)
 * @returns {Object} - O obstáculo criado
 */
function criarObstaculo(nivelAtual) {
    // Tipos disponíveis mudam conforme o nível
    // Nível 1-7: carro, buraco, pedestre
    // Nível 8+: adiciona motos (mais rápidas e finas)
    let tipos = ['carro', 'buraco', 'pedestre'];
    if (nivelAtual >= 8) {
        tipos.push('moto');
    }
    let tipoEscolhido = tipos[Math.floor(Math.random() * tipos.length)];
    let tipo = TIPOS_OBSTACULO[tipoEscolhido];

    // Calcula velocidade baseada no nível (com teto)
    let velocidade = CONFIG_OBSTACULOS.velocidadeBase
        + tipo.velocidadeExtra
        + (nivelAtual - 1) * CONFIG_DIFICULDADE.aumentoVelocidade;
    if (velocidade > CONFIG_DIFICULDADE.velocidadeMaxima) {
        velocidade = CONFIG_DIFICULDADE.velocidadeMaxima;
    }

    // Cria o objeto do obstáculo (só na área da estrada: 135px a 665px)
    let zonaEstrada = LARGURA_CANVAS - 270; // Largura da estrada (sem calçadas)
    let obstaculo = {
        x: 135 + Math.random() * (zonaEstrada - tipo.largura),  // Posição X na estrada
        y: -tipo.altura,   // Começa acima da tela (fora do canvas)
        largura: tipo.largura,
        altura: tipo.altura,
        velocidade: velocidade,
        cor: tipoEscolhido === 'carro'
            ? CORES_CARROS[Math.floor(Math.random() * CORES_CARROS.length)]
            : tipo.cor,
        tipo: tipoEscolhido,
        emoji: tipo.emoji
    };

    return obstaculo;
}

/**
 * inicializarObstaculos(nivel)
 * -----------------------------
 * Cria os obstáculos iniciais para o nível atual.
 * Limpa os obstáculos anteriores e gera novos.
 *
 * @param {number} nivel - Nível atual
 */
function inicializarObstaculos(nivel) {
    obstaculos = [];

    // Calcula quantos obstáculos baseado no nível (com teto máximo)
    let quantidade = CONFIG_DIFICULDADE.obstaculosIniciais
        + (nivel - 1) * CONFIG_DIFICULDADE.obstaculosPorNivel;
    if (quantidade > CONFIG_DIFICULDADE.obstaculosMaximo) {
        quantidade = CONFIG_DIFICULDADE.obstaculosMaximo;
    }

    for (let i = 0; i < quantidade; i++) {
        let obstaculo = criarObstaculo(nivel);
        // Distribui verticalmente para não começarem todos juntos
        obstaculo.y = -Math.random() * ALTURA_CANVAS;
        obstaculos.push(obstaculo);
    }
}

/**
 * atualizarObstaculos(nivel)
 * ---------------------------
 * Move todos os obstáculos para baixo.
 * Quando um sai da tela, reposiciona no topo
 * com nova posição X aleatória.
 *
 * @param {number} nivel - Nível atual (para ajustar velocidade)
 */
function atualizarObstaculos(nivel) {
    for (let i = 0; i < obstaculos.length; i++) {
        let obs = obstaculos[i];

        // Move para baixo
        obs.y += obs.velocidade;

        // Se saiu da tela por baixo, reposiciona no topo
        if (obs.y > ALTURA_CANVAS) {
            obs.y = -obs.altura - Math.random() * 100;
            obs.x = 135 + Math.random() * (LARGURA_CANVAS - 270 - obs.largura);

            // Recalcula velocidade (pode ter mudado de nível)
            let tipo = TIPOS_OBSTACULO[obs.tipo];
            obs.velocidade = CONFIG_OBSTACULOS.velocidadeBase
                + tipo.velocidadeExtra
                + (nivel - 1) * CONFIG_DIFICULDADE.aumentoVelocidade;
        }
    }
}

/**
 * desenharObstaculos(ctx)
 * ------------------------
 * Desenha todos os obstáculos no canvas.
 * Cada tipo tem uma aparência diferente.
 *
 * @param {CanvasRenderingContext2D} ctx - Contexto do canvas
 */
function desenharObstaculos(ctx) {
    for (let i = 0; i < obstaculos.length; i++) {
        let obs = obstaculos[i];

        // Desenha o corpo do obstáculo
        ctx.fillStyle = obs.cor;

        if (obs.tipo === 'carro') {
            // Carro: retângulo com detalhes
            ctx.fillRect(obs.x, obs.y, obs.largura, obs.altura);
            // Janelas do carro
            ctx.fillStyle = '#87CEEB';
            ctx.fillRect(obs.x + 5, obs.y + 8, obs.largura - 10, 12);
            // Rodas
            ctx.fillStyle = '#333';
            ctx.fillRect(obs.x - 3, obs.y + 5, 6, 10);
            ctx.fillRect(obs.x + obs.largura - 3, obs.y + 5, 6, 10);
            ctx.fillRect(obs.x - 3, obs.y + obs.altura - 15, 6, 10);
            ctx.fillRect(obs.x + obs.largura - 3, obs.y + obs.altura - 15, 6, 10);

        } else if (obs.tipo === 'buraco') {
            // Buraco: círculo escuro
            ctx.beginPath();
            ctx.ellipse(
                obs.x + obs.largura / 2,
                obs.y + obs.altura / 2,
                obs.largura / 2,
                obs.altura / 3,
                0, 0, Math.PI * 2
            );
            ctx.fill();
            // Borda do buraco
            ctx.strokeStyle = '#555555';
            ctx.lineWidth = 2;
            ctx.stroke();

        } else if (obs.tipo === 'pedestre') {
            // Pedestre: círculo (cabeça) + retângulo (corpo)
            ctx.fillStyle = obs.cor;
            // Cabeça
            ctx.beginPath();
            ctx.arc(obs.x + obs.largura / 2, obs.y + 8, 8, 0, Math.PI * 2);
            ctx.fill();
            // Corpo
            ctx.fillRect(obs.x + 5, obs.y + 16, obs.largura - 10, obs.altura - 16);

        } else if (obs.tipo === 'moto') {
            // Moto obstáculo: fina e rápida
            let cx = obs.x + obs.largura / 2;

            // Roda traseira
            ctx.fillStyle = '#1a1a1a';
            ctx.beginPath();
            ctx.ellipse(cx, obs.y + obs.altura - 3, 6, 4, 0, 0, Math.PI * 2);
            ctx.fill();

            // Corpo da moto
            ctx.fillStyle = obs.cor;
            ctx.fillRect(cx - 5, obs.y + 10, 10, obs.altura - 18);

            // Piloto
            ctx.fillStyle = '#333';
            ctx.beginPath();
            ctx.arc(cx, obs.y + 8, 6, 0, Math.PI * 2);
            ctx.fill();

            // Guidão
            ctx.fillStyle = '#666';
            ctx.fillRect(cx - 10, obs.y + 14, 20, 2);

            // Roda dianteira
            ctx.fillStyle = '#1a1a1a';
            ctx.beginPath();
            ctx.ellipse(cx, obs.y + 3, 5, 3, 0, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

/**
 * verificarColisaoObstaculos()
 * -----------------------------
 * Verifica se o jogador colidiu com algum obstáculo.
 *
 * @returns {boolean} - true se houve colisão
 */
function verificarColisaoObstaculos() {
    for (let i = 0; i < obstaculos.length; i++) {
        if (verificarColisao(jogador, obstaculos[i])) {
            return true;
        }
    }
    return false;
}
