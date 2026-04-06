/* ========================================
   JOGADOR.JS - Controle do Personagem
   ========================================
   Este arquivo cuida de tudo relacionado ao
   jogador (Alex, o entregador):
   - Posição e movimento
   - Captura de teclas
   - Desenho na tela
   - Verificação de colisão
   ======================================== */

// ---------- ESTADO DO JOGADOR ----------
// Objeto que guarda todas as informações do jogador
let jogador = {
    x: 0,           // Posição horizontal
    y: 0,           // Posição vertical
    largura: CONFIG_JOGADOR.largura,
    altura: CONFIG_JOGADOR.altura,
    velocidade: CONFIG_JOGADOR.velocidade,
    carregando: false  // Se está carregando um pedido
};

// ---------- CONTROLE DE TECLAS ----------
// Objeto que rastreia quais teclas estão pressionadas
// Isso permite movimento suave (segurar a tecla)
let teclas = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false
};

/**
 * inicializarJogador()
 * ---------------------
 * Posiciona o jogador no centro-inferior do canvas.
 * Chamada sempre que um novo jogo começa.
 */
function inicializarJogador() {
    jogador.x = LARGURA_CANVAS / 2 - jogador.largura / 2;
    jogador.y = ALTURA_CANVAS - jogador.altura - 20;
    jogador.carregando = false;
}

/**
 * configurarTeclas()
 * -------------------
 * Adiciona os "event listeners" para capturar
 * quando o jogador pressiona ou solta uma tecla.
 */
function configurarTeclas() {
    // Quando pressiona a tecla
    document.addEventListener('keydown', function(evento) {
        if (evento.key in teclas) {
            teclas[evento.key] = true;
            // Previne scroll da página com as setas
            evento.preventDefault();
        }
    });

    // Quando solta a tecla
    document.addEventListener('keyup', function(evento) {
        if (evento.key in teclas) {
            teclas[evento.key] = false;
        }
    });
}

/**
 * moverJogador()
 * ----------------
 * Atualiza a posição do jogador baseado nas teclas
 * pressionadas. Também impede que saia do canvas.
 *
 * Chamada a cada frame do jogo (dentro do loop principal).
 */
function moverJogador() {
    // Move para cima
    if (teclas.ArrowUp) {
        jogador.y -= jogador.velocidade;
    }
    // Move para baixo
    if (teclas.ArrowDown) {
        jogador.y += jogador.velocidade;
    }
    // Move para esquerda
    if (teclas.ArrowLeft) {
        jogador.x -= jogador.velocidade;
    }
    // Move para direita
    if (teclas.ArrowRight) {
        jogador.x += jogador.velocidade;
    }

    // ---------- LIMITES DO CANVAS ----------
    // Impede o jogador de sair da tela
    if (jogador.x < 0) {
        jogador.x = 0;
    }
    if (jogador.x + jogador.largura > LARGURA_CANVAS) {
        jogador.x = LARGURA_CANVAS - jogador.largura;
    }
    if (jogador.y < 50) { // 50px de margem pro HUD
        jogador.y = 50;
    }
    if (jogador.y + jogador.altura > ALTURA_CANVAS) {
        jogador.y = ALTURA_CANVAS - jogador.altura;
    }
}

/**
 * desenharJogador(ctx)
 * ---------------------
 * Desenha o jogador no canvas.
 * Usa formas simples para representar a bike/moto.
 *
 * @param {CanvasRenderingContext2D} ctx - Contexto do canvas
 */
function desenharJogador(ctx) {
    // Corpo da moto (retângulo principal)
    ctx.fillStyle = CORES.jogador;
    ctx.fillRect(jogador.x, jogador.y, jogador.largura, jogador.altura);

    // Guidão (linha no topo)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(jogador.x - 5, jogador.y + 5, jogador.largura + 10, 4);

    // Rodas (dois círculos)
    ctx.fillStyle = '#333333';
    ctx.beginPath();
    ctx.arc(jogador.x + 8, jogador.y + jogador.altura - 3, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(jogador.x + jogador.largura - 8, jogador.y + jogador.altura - 3, 6, 0, Math.PI * 2);
    ctx.fill();

    // Indicador de pedido (se está carregando)
    if (jogador.carregando) {
        ctx.fillStyle = CORES.pedido;
        ctx.fillRect(jogador.x + 10, jogador.y - 15, 20, 15);
        ctx.fillStyle = '#ffffff';
        ctx.font = '10px Arial';
        ctx.fillText('📦', jogador.x + 11, jogador.y - 3);
    }

    // Capacete do Alex (circulo no topo)
    ctx.fillStyle = '#e94560';
    ctx.beginPath();
    ctx.arc(jogador.x + jogador.largura / 2, jogador.y + 12, 10, 0, Math.PI * 2);
    ctx.fill();
}

/**
 * verificarColisao(obj1, obj2)
 * -----------------------------
 * Verifica se dois objetos retangulares estão colidindo.
 * Usa a técnica AABB (Axis-Aligned Bounding Box).
 *
 * Como funciona:
 * Se os retângulos NÃO se sobrepõem em nenhum eixo,
 * não há colisão. Caso contrário, há colisão.
 *
 * @param {Object} obj1 - Primeiro objeto {x, y, largura, altura}
 * @param {Object} obj2 - Segundo objeto {x, y, largura, altura}
 * @returns {boolean} - true se há colisão
 */
function verificarColisao(obj1, obj2) {
    return (
        obj1.x < obj2.x + obj2.largura &&
        obj1.x + obj1.largura > obj2.x &&
        obj1.y < obj2.y + obj2.altura &&
        obj1.y + obj1.altura > obj2.y
    );
}
