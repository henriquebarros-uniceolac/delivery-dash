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

// Cores variadas para as motos
const CORES_MOTOS = [
    '#ff4444',  // Vermelho vivo
    '#00bfff',  // Azul elétrico
    '#ff8c00',  // Laranja
    '#00ff7f',  // Verde neon
    '#ff1493',  // Pink
    '#ffdd00',  // Amarelo
    '#8b00ff',  // Violeta
    '#ffffff'   // Branca
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
    },
    poca: {
        cor: '#2a6090',
        emoji: '💧',
        largura: 50,
        altura: 30,
        velocidadeExtra: 0     // Poças são estáticas (como buracos)
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
    // Tipos disponíveis mudam conforme o nível e clima
    // Com chuva: troca buracos por poças de água
    // Nível 8+: adiciona motos
    let temChuva = cenarioAtual && cenarioAtual.chuva;
    let tipos = temChuva ? ['carro', 'poca', 'pedestre'] : ['carro', 'buraco', 'pedestre'];
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
            : tipoEscolhido === 'moto'
            ? CORES_MOTOS[Math.floor(Math.random() * CORES_MOTOS.length)]
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

        } else if (obs.tipo === 'poca') {
            // Poça de água: elipse azul com reflexo
            let pcx = obs.x + obs.largura / 2;
            let pcy = obs.y + obs.altura / 2;

            // Água
            ctx.fillStyle = '#1a4a70';
            ctx.beginPath();
            ctx.ellipse(pcx, pcy, obs.largura / 2, obs.altura / 2, 0, 0, Math.PI * 2);
            ctx.fill();

            // Borda mais clara (ondulação)
            ctx.strokeStyle = '#3a7ab0';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Reflexo da luz na água
            ctx.fillStyle = 'rgba(150, 200, 255, 0.4)';
            ctx.beginPath();
            ctx.ellipse(pcx - 5, pcy - 3, obs.largura / 4, obs.altura / 5, -0.3, 0, Math.PI * 2);
            ctx.fill();

            // Ondas na poça
            ctx.strokeStyle = 'rgba(100, 170, 230, 0.3)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.ellipse(pcx, pcy, obs.largura / 3, obs.altura / 3, 0, 0, Math.PI * 2);
            ctx.stroke();

        } else if (obs.tipo === 'moto') {
            // Moto obstáculo (visão de cima, detalhada)
            let cx = obs.x + obs.largura / 2;
            let my = obs.y;
            let mh = obs.altura;

            // Roda traseira
            ctx.fillStyle = '#111';
            ctx.beginPath();
            ctx.ellipse(cx, my + mh - 4, 7, 4, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#444';
            ctx.lineWidth = 1;
            ctx.stroke();

            // Chassi da moto (corpo colorido)
            ctx.fillStyle = obs.cor;
            ctx.beginPath();
            ctx.moveTo(cx - 5, my + mh - 8);
            ctx.lineTo(cx + 5, my + mh - 8);
            ctx.lineTo(cx + 4, my + 16);
            ctx.lineTo(cx - 4, my + 16);
            ctx.closePath();
            ctx.fill();

            // Tanque de combustível (destaque)
            ctx.fillStyle = obs.cor;
            ctx.beginPath();
            ctx.ellipse(cx, my + 20, 5, 3, 0, 0, Math.PI * 2);
            ctx.fill();
            // Faixa no tanque
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(cx, my + 17);
            ctx.lineTo(cx, my + 23);
            ctx.stroke();

            // Assento
            ctx.fillStyle = '#222';
            ctx.fillRect(cx - 4, my + 25, 8, 8);

            // Guidão
            ctx.fillStyle = '#777';
            ctx.fillRect(cx - 12, my + 14, 24, 3);
            // Punhos
            ctx.fillStyle = '#222';
            ctx.fillRect(cx - 13, my + 13, 4, 5);
            ctx.fillRect(cx + 9, my + 13, 4, 5);

            // Piloto (capacete + corpo)
            ctx.fillStyle = '#222';
            ctx.fillRect(cx - 6, my + 10, 12, 12);
            // Capacete colorido (combina com a moto)
            ctx.fillStyle = obs.cor;
            ctx.beginPath();
            ctx.arc(cx, my + 7, 6, 0, Math.PI * 2);
            ctx.fill();
            // Viseira preta
            ctx.fillStyle = '#111';
            ctx.beginPath();
            ctx.arc(cx, my + 8, 4, -0.3, Math.PI + 0.3);
            ctx.fill();

            // Braços no guidão
            ctx.fillStyle = '#222';
            ctx.fillRect(cx - 12, my + 12, 6, 3);
            ctx.fillRect(cx + 6, my + 12, 6, 3);

            // Roda dianteira
            ctx.fillStyle = '#111';
            ctx.beginPath();
            ctx.ellipse(cx, my + 3, 6, 3, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#444';
            ctx.lineWidth = 1;
            ctx.stroke();

            // Farol dianteiro
            ctx.fillStyle = '#ffff88';
            ctx.beginPath();
            ctx.ellipse(cx, my + 1, 3, 2, 0, 0, Math.PI * 2);
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

/**
 * obterObstaculoColidido()
 * --------------------------
 * Retorna o primeiro obstáculo com que o jogador colidiu,
 * ou null se não colidiu com nenhum.
 * Usado para saber o TIPO do obstáculo (poça vs carro etc).
 *
 * @returns {Object|null} - O obstáculo colidido ou null
 */
function obterObstaculoColidido() {
    for (let i = 0; i < obstaculos.length; i++) {
        if (verificarColisao(jogador, obstaculos[i])) {
            return obstaculos[i];
        }
    }
    return null;
}
