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
let teclas = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false
};

// ---------- CONTROLES INVERTIDOS ----------
// Quando o jogador passa numa poça, os controles esquerda/direita invertem
let controlesInvertidos = false;
let framesInvertidos = 0;  // Contador de frames (2.5s = 150 frames)

/**
 * inicializarJogador()
 * ---------------------
 * Posiciona o jogador no centro-inferior do canvas.
 * Chamada sempre que um novo jogo começa.
 */
function inicializarJogador() {
    jogador.x = LARGURA_CANVAS / 2 - jogador.largura / 2;
    jogador.y = ALTURA_CANVAS - jogador.altura - 100; // Mais acima pra não ficar atrás dos botões
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

    // ---------- CONTROLES MOBILE (TOUCH) ----------
    // Configura os botões na tela para dispositivos touch
    configurarControlesMobile();
}

/**
 * configurarControlesMobile()
 * -----------------------------
 * Adiciona eventos de toque (touch) nos botões direcionais.
 *
 * Usa 'touchstart' e 'touchend' em vez de 'click' porque:
 * - touchstart: detecta o toque imediatamente (sem delay)
 * - touchend: detecta quando o dedo sai do botão
 * - click tem um delay de ~300ms no mobile
 *
 * Também usa preventDefault() para evitar que o navegador
 * interprete o toque como scroll ou zoom.
 */
function configurarControlesMobile() {
    // Mapeamento: ID do botão → tecla correspondente
    let botoes = {
        'btn-cima': 'ArrowUp',
        'btn-baixo': 'ArrowDown',
        'btn-esquerda': 'ArrowLeft',
        'btn-direita': 'ArrowRight'
    };

    // Para cada botão, adiciona os eventos de toque
    for (let idBotao in botoes) {
        let elemento = document.getElementById(idBotao);
        let teclaMapeada = botoes[idBotao];

        if (!elemento) continue; // Segurança: pula se o botão não existir

        // Quando TOCA no botão → ativa a tecla
        elemento.addEventListener('touchstart', function(evento) {
            evento.preventDefault(); // Evita scroll/zoom
            teclas[teclaMapeada] = true;
            elemento.classList.add('pressionado'); // Efeito visual
        });

        // Quando SOLTA o botão → desativa a tecla
        elemento.addEventListener('touchend', function(evento) {
            evento.preventDefault();
            teclas[teclaMapeada] = false;
            elemento.classList.remove('pressionado');
        });

        // Quando o dedo SAI do botão (arrasta pra fora) → desativa
        elemento.addEventListener('touchcancel', function(evento) {
            teclas[teclaMapeada] = false;
            elemento.classList.remove('pressionado');
        });
    }
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
    // Conta inversão de controles
    if (controlesInvertidos) {
        framesInvertidos--;
        if (framesInvertidos <= 0) {
            controlesInvertidos = false;
        }
    }

    // Move para esquerda/direita (inverte se passou na poça)
    if (controlesInvertidos) {
        // INVERTIDO: esquerda vai pra direita e vice-versa
        if (teclas.ArrowLeft) {
            jogador.x += jogador.velocidade;
        }
        if (teclas.ArrowRight) {
            jogador.x -= jogador.velocidade;
        }
    } else {
        // Normal
        if (teclas.ArrowLeft) {
            jogador.x -= jogador.velocidade;
        }
        if (teclas.ArrowRight) {
            jogador.x += jogador.velocidade;
        }
    }

    // ---------- LIMITES DA ESTRADA ----------
    // Quando BRT está ativo, jogador pode entrar na faixa BRT
    // Senão, fica limitado à pista normal
    let limiteEsquerdo = brtAtivo ? 132 : 182;
    let limiteDireito = brtAtivo ? LARGURA_CANVAS - 132 : LARGURA_CANVAS - 182;

    if (jogador.x < limiteEsquerdo) {
        jogador.x = limiteEsquerdo;
    }
    if (jogador.x + jogador.largura > limiteDireito) {
        jogador.x = limiteDireito - jogador.largura;
    }
    if (jogador.y < 50) { // 50px de margem pro HUD
        jogador.y = 50;
    }
    // No mobile, não deixa o jogador descer até onde ficam os botões
    let limiteInferior = ALTURA_CANVAS - 80;
    if (jogador.y + jogador.altura > limiteInferior) {
        jogador.y = limiteInferior - jogador.altura;
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
    let cx = jogador.x + jogador.largura / 2; // Centro X do jogador
    let x = jogador.x;
    let y = jogador.y;
    let larg = jogador.largura;
    let alt = jogador.altura;

    // ===== MOTO (visão de cima) =====

    // Roda traseira
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.ellipse(cx, y + alt - 4, 8, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    // Aro da roda traseira
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Corpo da moto (chassi fino e comprido)
    ctx.fillStyle = '#e94560';
    ctx.beginPath();
    ctx.moveTo(cx - 6, y + alt - 8);  // Traseira esquerda
    ctx.lineTo(cx + 6, y + alt - 8);  // Traseira direita
    ctx.lineTo(cx + 5, y + 18);       // Frente direita
    ctx.lineTo(cx - 5, y + 18);       // Frente esquerda
    ctx.closePath();
    ctx.fill();

    // Assento (onde o Alex senta)
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(cx - 5, y + 28, 10, 10);

    // Tanque de combustível
    ctx.fillStyle = '#c81d4e';
    ctx.beginPath();
    ctx.ellipse(cx, y + 22, 6, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // ===== ALEX (o entregador) =====
    // Verifica se está chovendo para trocar a roupa
    let estaChovendo = cenarioAtual && cenarioAtual.chuva;

    // Corpo do Alex (jaqueta normal OU capa de chuva preta)
    let corRoupa = estaChovendo ? '#1a1a1a' : '#00b894';
    ctx.fillStyle = corRoupa;
    ctx.fillRect(cx - 8, y + 12, 16, 14);

    // Capuz da capa de chuva (só quando chove)
    if (estaChovendo) {
        ctx.fillStyle = '#1a1a1a';
        // Capuz cobrindo a cabeça
        ctx.beginPath();
        ctx.arc(cx, y + 8, 9, 0, Math.PI * 2);
        ctx.fill();
    }

    // Braços (segurando o guidão)
    ctx.fillStyle = corRoupa;
    ctx.fillRect(cx - 14, y + 14, 7, 4);  // Braço esquerdo
    ctx.fillRect(cx + 7, y + 14, 7, 4);   // Braço direito

    // Capacete do Alex (vermelho, aparece por cima do capuz)
    ctx.fillStyle = estaChovendo ? '#333' : '#e94560';
    ctx.beginPath();
    ctx.arc(cx, y + 8, 7, 0, Math.PI * 2);
    ctx.fill();
    // Viseira do capacete
    ctx.fillStyle = estaChovendo ? '#111' : '#333';
    ctx.beginPath();
    ctx.arc(cx, y + 9, 5, -0.5, Math.PI + 0.5);
    ctx.fill();

    // Guidão
    ctx.fillStyle = '#888';
    ctx.fillRect(cx - 15, y + 16, 30, 3);
    // Punhos
    ctx.fillStyle = '#333';
    ctx.fillRect(cx - 16, y + 15, 4, 5);
    ctx.fillRect(cx + 12, y + 15, 4, 5);

    // Roda dianteira
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.ellipse(cx, y + 4, 6, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1;
    ctx.stroke();

    // ===== BAG DE ENTREGA (se carregando pedido) =====
    if (jogador.carregando) {
        // Mochila/bag nas costas do Alex
        ctx.fillStyle = CORES.pedido;
        ctx.fillRect(cx - 10, y + 24, 20, 16);
        // Detalhe da bag
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(cx - 6, y + 27, 12, 2);
        ctx.font = 'bold 9px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('iFood', cx, y + 38);
        ctx.textAlign = 'start';
    }
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
