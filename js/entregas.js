/* ========================================
   ENTREGAS.JS - Sistema de Entregas
   ========================================
   Gerencia o ciclo de entrega do jogo:
   1. Um PEDIDO aparece no mapa (caixa laranja)
   2. O jogador coleta o pedido (colisão)
   3. Um DESTINO aparece (marcador verde)
   4. O jogador entrega no destino (colisão)
   5. Ganha pontos + tempo extra
   6. Novo pedido aparece (ciclo recomeça)
   ======================================== */

// ---------- ESTADO DAS ENTREGAS ----------
let pedidoAtual = null;    // O pedido que precisa ser coletado
let destinoAtual = null;   // O local de entrega

/**
 * criarPedido()
 * ---------------
 * Gera um novo pedido em posição aleatória no mapa.
 * Evita que apareça muito perto das bordas.
 */
function criarPedido() {
    // Pedido aparece só na estrada (entre as calçadas de 130px)
    let xMin = 140;
    let xMax = LARGURA_CANVAS - 170;
    pedidoAtual = {
        x: xMin + Math.random() * (xMax - xMin),
        y: 80 + Math.random() * (ALTURA_CANVAS - 200),
        largura: CONFIG_ENTREGAS.tamanhoPedido,
        altura: CONFIG_ENTREGAS.tamanhoPedido,
        coletado: false
    };
    destinoAtual = null; // Limpa destino anterior
}

/**
 * criarDestino()
 * ----------------
 * Gera o local de entrega após o pedido ser coletado.
 * Garante que o destino fica longe do jogador
 * (para dar um desafio mínimo).
 */
function criarDestino() {
    let margem = 80;
    let tentativas = 0;

    // Tenta criar um destino que não fique muito perto do jogador
    let xMin = 140;
    let xMax = LARGURA_CANVAS - 170;
    do {
        destinoAtual = {
            x: xMin + Math.random() * (xMax - xMin),
            y: 80 + Math.random() * (ALTURA_CANVAS - 200),
            largura: CONFIG_ENTREGAS.tamanhoDestino,
            altura: CONFIG_ENTREGAS.tamanhoDestino
        };
        tentativas++;
    } while (calcularDistancia(jogador, destinoAtual) < 200 && tentativas < 10);
    // Repete se o destino estiver muito perto (mínimo 200px de distância)
}

/**
 * calcularDistancia(a, b)
 * -------------------------
 * Calcula a distância entre dois objetos.
 * Usa o Teorema de Pitágoras.
 *
 * @param {Object} a - Primeiro objeto {x, y}
 * @param {Object} b - Segundo objeto {x, y}
 * @returns {number} - Distância em pixels
 */
function calcularDistancia(a, b) {
    let dx = a.x - b.x;  // Diferença horizontal
    let dy = a.y - b.y;  // Diferença vertical
    return Math.sqrt(dx * dx + dy * dy);  // Pitágoras: √(dx² + dy²)
}

/**
 * verificarEntregas()
 * ---------------------
 * Verifica as interações do jogador com pedidos e destinos.
 * Retorna informações sobre o que aconteceu.
 *
 * @returns {Object} - { coletou: bool, entregou: bool }
 */
function verificarEntregas() {
    let resultado = { coletou: false, entregou: false };

    // Verifica se coletou o pedido
    if (pedidoAtual && !pedidoAtual.coletado) {
        if (verificarColisao(jogador, pedidoAtual)) {
            pedidoAtual.coletado = true;
            jogador.carregando = true;
            criarDestino();
            resultado.coletou = true;
        }
    }

    // Verifica se entregou no destino
    if (destinoAtual && jogador.carregando) {
        if (verificarColisao(jogador, destinoAtual)) {
            jogador.carregando = false;
            resultado.entregou = true;
            // Novo pedido será criado pelo game.js
        }
    }

    return resultado;
}

/**
 * desenharEntregas(ctx)
 * -----------------------
 * Desenha o pedido e/ou destino no canvas.
 *
 * @param {CanvasRenderingContext2D} ctx - Contexto do canvas
 */
function desenharEntregas(ctx) {
    // Desenha o pedido (se não foi coletado)
    if (pedidoAtual && !pedidoAtual.coletado) {
        // Efeito de brilho pulsante
        let brilho = Math.sin(Date.now() / 200) * 0.3 + 0.7;
        ctx.globalAlpha = brilho;

        // Caixa do pedido
        ctx.fillStyle = CORES.pedido;
        ctx.fillRect(pedidoAtual.x, pedidoAtual.y, pedidoAtual.largura, pedidoAtual.altura);

        // Fita da caixa
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(
            pedidoAtual.x + pedidoAtual.largura / 2 - 2,
            pedidoAtual.y,
            4,
            pedidoAtual.altura
        );
        ctx.fillRect(
            pedidoAtual.x,
            pedidoAtual.y + pedidoAtual.altura / 2 - 2,
            pedidoAtual.largura,
            4
        );

        ctx.globalAlpha = 1;

        // Texto indicador
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('PEDIDO', pedidoAtual.x + pedidoAtual.largura / 2, pedidoAtual.y - 5);
    }

    // Desenha o destino (se o pedido foi coletado)
    if (destinoAtual && jogador.carregando) {
        // Efeito de brilho pulsante
        let brilho = Math.sin(Date.now() / 150) * 0.3 + 0.7;
        ctx.globalAlpha = brilho;

        // Marcador do destino
        ctx.fillStyle = CORES.destino;
        ctx.fillRect(destinoAtual.x, destinoAtual.y, destinoAtual.largura, destinoAtual.altura);

        // Casa no destino
        ctx.fillStyle = '#ffffff';
        // Telhado (triângulo)
        ctx.beginPath();
        ctx.moveTo(destinoAtual.x, destinoAtual.y + 15);
        ctx.lineTo(destinoAtual.x + destinoAtual.largura / 2, destinoAtual.y + 2);
        ctx.lineTo(destinoAtual.x + destinoAtual.largura, destinoAtual.y + 15);
        ctx.closePath();
        ctx.fill();
        // Porta
        ctx.fillStyle = '#1a5c2e';
        ctx.fillRect(
            destinoAtual.x + destinoAtual.largura / 2 - 5,
            destinoAtual.y + 25,
            10,
            destinoAtual.altura - 25
        );

        ctx.globalAlpha = 1;

        // Texto indicador
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('ENTREGA', destinoAtual.x + destinoAtual.largura / 2, destinoAtual.y - 5);
    }

    // Reseta alinhamento do texto
    ctx.textAlign = 'start';
}
