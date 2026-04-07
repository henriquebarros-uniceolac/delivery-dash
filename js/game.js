/* ========================================
   GAME.JS - Loop Principal do Jogo v2
   ======================================== */

// ---------- VARIÁVEIS DO JOGO ----------
let canvas;
let ctx;
let pontuacao = 0;
let tempoRestante;
let totalEntregas = 0;
let nivelAtual = 1;
let jogoRodando = false;
let timerIntervalo;
let animacaoFrame;

// ---------- SISTEMA DE VIDAS ----------
let vidas = 5;
let framesInvencivel = 0;
let coracaoItem = null;
let timerCoracao = null;

// ---------- ITEM DE TEMPO ----------
let tempoItem = null;
let tempoItemSpawnado = false;

// ---------- PAUSA DO TIMER ----------
let tempoPausado = false;

// ---------- PODER ESCUDO ----------
let escudoItem = null;
let escudoAtivo = false;
let escudoFrames = 0;
let timerEscudo = null;

// ---------- LADRÃO DE PEDIDOS ----------
let ladroes = [];
let contadorEntregas = 0;

// ---------- FAIXA BRT ----------
let brtAtivo = false;
let brtOnibus = [];
let brtTempoRestante = 0;
let brtProximoSpawn = 1800;
const BRT_ESQUERDA_X = 130;
const BRT_DIREITA_X = 622;
const BRT_LARGURA = 48;

// ---------- EFEITOS VISUAIS ----------
let cenarioAtual = null;
let gotasChuva = [];
let frameRelampago = 0;

// Variáveis para o efeito da estrada
let offsetEstrada = 0;

// ---------- PRÉDIOS DE BRASÍLIA ----------
let prediosEsquerda = [
    { tipo: 'ministerio', y: 0 },
    { tipo: 'catedral',   y: 180 },
    { tipo: 'ministerio', y: 360 },
    { tipo: 'palacio',    y: 540 }
];
let prediosDireita = [
    { tipo: 'ministerio', y: 0 },
    { tipo: 'congresso',  y: 180 },
    { tipo: 'ministerio', y: 360 },
    { tipo: 'palacio',    y: 540 }
];
let velocidadePredios = 1.5;

// ========================================
// AJUSTAR CANVAS
// ========================================
function ajustarCanvas() {
    canvas.width = LARGURA_CANVAS;
    canvas.height = ALTURA_CANVAS;

    let larguraTela = window.innerWidth;

    if (larguraTela <= 650) {
        let alturaTela = window.innerHeight;
        let alturaDisponivel = alturaTela - 55;
        let escalaLargura = larguraTela / LARGURA_CANVAS;
        let escalaAltura = alturaDisponivel / ALTURA_CANVAS;
        let escala = Math.min(escalaLargura, escalaAltura);
        canvas.style.width = Math.floor(LARGURA_CANVAS * escala) + 'px';
        canvas.style.height = Math.floor(ALTURA_CANVAS * escala) + 'px';
    } else {
        canvas.style.width = '';
        canvas.style.height = '';
    }
}

// ========================================
// INICIAR JOGO
// ========================================
function iniciarJogo() {
    document.getElementById('tela-inicio').classList.add('escondido');
    document.getElementById('tela-gameover').classList.add('escondido');
    document.getElementById('tela-jogo').classList.remove('escondido');

    canvas = document.getElementById('canvas-jogo');
    ajustarCanvas();
    ctx = canvas.getContext('2d');

    pontuacao = 0;
    tempoRestante = CONFIG_TEMPO.inicial;
    totalEntregas = 0;
    nivelAtual = 1;
    jogoRodando = true;

    vidas = CONFIG_VIDAS.inicial;
    framesInvencivel = 0;
    coracaoItem = null;
    if (timerCoracao) clearTimeout(timerCoracao);

    tempoItem = null;
    tempoItemSpawnado = false;
    tempoPausado = false;

    escudoItem = null;
    escudoAtivo = false;
    escudoFrames = 0;
    if (timerEscudo) clearTimeout(timerEscudo);
    agendarEscudo();

    ladroes = [];
    contadorEntregas = 0;

    brtAtivo = false;
    brtOnibus = [];
    brtTempoRestante = 0;
    brtProximoSpawn = 1800;

    cenarioAtual = obterCenarioNivel(1);
    gotasChuva = [];
    frameRelampago = 0;

    // Reseta prédios
    prediosEsquerda = [
        { tipo: 'ministerio', y: 0 },
        { tipo: 'catedral',   y: 180 },
        { tipo: 'ministerio', y: 360 },
        { tipo: 'palacio',    y: 540 }
    ];
    prediosDireita = [
        { tipo: 'ministerio', y: 0 },
        { tipo: 'congresso',  y: 180 },
        { tipo: 'ministerio', y: 360 },
        { tipo: 'palacio',    y: 540 }
    ];

    teclas.ArrowUp = false;
    teclas.ArrowDown = false;
    teclas.ArrowLeft = false;
    teclas.ArrowRight = false;

    inicializarJogador();
    inicializarObstaculos(nivelAtual);
    criarPedido();
    configurarTeclas();
    atualizarHUD();

    timerIntervalo = setInterval(function() {
        if (tempoPausado) return;

        tempoRestante--;
        document.getElementById('tempo').textContent = tempoRestante;

        if (tempoRestante <= CONFIG_TEMPO.alertaSegundos && !tempoItemSpawnado && !tempoItem) {
            tempoItemSpawnado = true;
            tempoItem = {
                x: 140 + Math.random() * (LARGURA_CANVAS - 280),
                y: 80 + Math.random() * (ALTURA_CANVAS - 250),
                largura: 30,
                altura: 30,
                valor: CONFIG_TEMPO.bonusItemMin + Math.floor(
                    Math.random() * (CONFIG_TEMPO.bonusItemMax - CONFIG_TEMPO.bonusItemMin + 1)
                )
            };
            mostrarMensagem('⏱️ Relógio apareceu! Corra até ele!');
        }

        if (tempoRestante > CONFIG_TEMPO.alertaSegundos) {
            tempoItemSpawnado = false;
        }

        if (tempoRestante <= 0) {
            gameOver('tempo');
        }
    }, 1000);

    loopPrincipal();
}

// ========================================
// LOOP PRINCIPAL
// ========================================
function loopPrincipal() {
    if (!jogoRodando) return;

    ctx.clearRect(0, 0, LARGURA_CANVAS, ALTURA_CANVAS);

    desenharCenario();

    atualizarObstaculos(nivelAtual);
    desenharObstaculos(ctx);

    desenharEntregas(ctx);

    if (coracaoItem) {
        desenharCoracao(ctx);
    }

    moverJogador();

    if (framesInvencivel > 0) {
        framesInvencivel--;
    }

    // Escudo
    if (escudoAtivo) {
        escudoFrames--;
        if (escudoFrames <= 0) {
            escudoAtivo = false;
            mostrarMensagem('🛡️ Escudo acabou!');
            agendarEscudo();
        }
    }

    // Desenha jogador (pisca se invencível)
    if (framesInvencivel > 0 && Math.floor(framesInvencivel / 5) % 2 === 0) {
        // Pisca
    } else {
        desenharJogador(ctx);
    }

    // Colisões com obstáculos
    if (framesInvencivel === 0 && !escudoAtivo) {
        let obstaculoColidido = obterObstaculoColidido();

        if (obstaculoColidido) {
            if (obstaculoColidido.tipo === 'poca') {
                if (!controlesInvertidos) {
                    controlesInvertidos = true;
                    framesInvertidos = 150;
                    mostrarMensagem('💦 Poça! Controles invertidos!');
                    canvas.style.boxShadow = '0 0 30px blue';
                    setTimeout(function() { canvas.style.boxShadow = 'none'; }, 300);
                    framesInvencivel = 30;
                }
            } else {
                vidas--;
                if (vidas <= 0) { gameOver('vidas'); return; }
                framesInvencivel = CONFIG_VIDAS.invencivel;
                jogador.y = ALTURA_CANVAS - jogador.altura - 100;
                canvas.style.boxShadow = '0 0 30px red';
                setTimeout(function() { canvas.style.boxShadow = 'none'; }, 300);
                mostrarMensagem('💔 -1 vida! Restam ' + vidas);
                agendarCoracao();
            }
        }
    }

    // Coleta de coração
    if (coracaoItem && framesInvencivel === 0) {
        if (verificarColisao(jogador, coracaoItem)) {
            if (vidas < CONFIG_VIDAS.inicial) {
                vidas++;
                mostrarMensagem('❤️ +1 vida!');
            } else {
                pontuacao += 50;
                mostrarMensagem('⭐ +50 pts (vida cheia!)');
            }
            coracaoItem = null;
        }
    }

    // Item de tempo
    if (tempoItem) {
        desenharTempoItem(ctx);
        if (verificarColisao(jogador, tempoItem)) {
            tempoRestante += tempoItem.valor;
            mostrarMensagem('⏱️ +' + tempoItem.valor + ' segundos!');
            tempoItem = null;
            tempoItemSpawnado = false;
        }
    }

    // Escudo item
    if (escudoItem) {
        desenharEscudoItem(ctx);
        if (verificarColisao(jogador, escudoItem)) {
            escudoAtivo = true;
            escudoFrames = 360;
            escudoItem = null;
            mostrarMensagem('🛡️ ESCUDO ATIVADO! 6 segundos!');
            agendarEscudo();
        }
    }

    // Aura do escudo
    if (escudoAtivo) {
        let pulso = Math.sin(Date.now() / 100) * 3;
        ctx.strokeStyle = 'rgba(0, 200, 255, 0.6)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(
            jogador.x + jogador.largura / 2,
            jogador.y + jogador.altura / 2,
            jogador.largura / 2 + 10 + pulso,
            jogador.altura / 2 + 10 + pulso,
            0, 0, Math.PI * 2
        );
        ctx.stroke();
        let porcentagem = escudoFrames / 360;
        ctx.fillStyle = 'rgba(0, 200, 255, 0.5)';
        ctx.fillRect(jogador.x - 5, jogador.y + jogador.altura + 5, (jogador.largura + 10) * porcentagem, 4);
    }

    // Entregas
    let resultadoEntrega = verificarEntregas();

    if (resultadoEntrega.coletou) {
        mostrarMensagem('📦 Pedido coletado! Vá até o destino 🏠');

        if (nivelAtual >= 7 && ladroes.length === 0) {
            contadorEntregas++;
            if (contadorEntregas >= 3) {
                contadorEntregas = 0;
                setTimeout(function() {
                    if (jogoRodando && jogador.carregando && ladroes.length === 0) {
                        let vemDois = Math.random() < 0.3;
                        iniciarLadrao('esquerda');
                        if (vemDois) {
                            iniciarLadrao('direita');
                            mostrarMensagem('🚨 DOIS LADRÕES! PASSE ENTRE ELES!');
                        }
                    }
                }, (2 + Math.random()) * 1000);
            }
        }
    }

    if (resultadoEntrega.entregou) {
        pontuacao += CONFIG_ENTREGAS.pontosEntrega;
        let bonus = CONFIG_TEMPO.bonusEntrega;
        tempoRestante += bonus;
        totalEntregas++;

        tempoPausado = true;
        setTimeout(function() { tempoPausado = false; }, 3000);

        mostrarMensagem('✅ +' + CONFIG_ENTREGAS.pontosEntrega + ' pts | +' + bonus + 's | ⏸️ 3s');

        if (totalEntregas % CONFIG_DIFICULDADE.entregasPorNivel === 0) {
            nivelAtual++;
            cenarioAtual = obterCenarioNivel(nivelAtual);

            mostrarMensagem('⬆️ NÍVEL ' + nivelAtual + ' - ' + cenarioAtual.nome);

            inicializarObstaculos(nivelAtual);

            if (cenarioAtual.chuva && gotasChuva.length === 0) {
                inicializarChuva();
            }
            if (!cenarioAtual.chuva) {
                gotasChuva = [];
            }
        }

        if (nivelAtual >= 7 && ladroes.length === 0) {
            contadorEntregas++;
        }

        criarPedido();
    }

    // Ladrões
    for (let i = ladroes.length - 1; i >= 0; i--) {
        atualizarLadrao(ladroes[i], i);
        desenharLadrao(ctx, ladroes[i]);
    }

    // BRT
    atualizarBRT();
    if (brtAtivo) {
        for (let i = brtOnibus.length - 1; i >= 0; i--) {
            let bus = brtOnibus[i];
            bus.y -= bus.velocidade;

            if (bus.y + bus.altura < -10) {
                brtOnibus.splice(i, 1);
                continue;
            }

            desenharBRT(ctx, bus);

            if (framesInvencivel === 0 && !escudoAtivo && verificarColisao(jogador, bus)) {
                vidas--;
                if (vidas <= 0) { gameOver('vidas'); return; }
                framesInvencivel = CONFIG_VIDAS.invencivel;
                jogador.y = ALTURA_CANVAS - jogador.altura - 100;
                canvas.style.boxShadow = '0 0 30px red';
                setTimeout(function() { canvas.style.boxShadow = 'none'; }, 300);
                mostrarMensagem('🚌 Atropelado pelo BRT! -1 vida');
                agendarCoracao();
            }
        }
    }

    // Efeitos visuais
    desenharEfeitosCenario();

    atualizarHUD();

    animacaoFrame = requestAnimationFrame(loopPrincipal);
}

// ========================================
// CENÁRIO
// ========================================
function desenharCenario() {
    let larguraCalcada = 130;
    let c = cenarioAtual;

    ctx.fillStyle = c.grama;
    ctx.fillRect(0, 0, LARGURA_CANVAS, ALTURA_CANVAS);

    ctx.fillStyle = c.calcada;
    ctx.fillRect(0, 0, larguraCalcada, ALTURA_CANVAS);
    ctx.fillRect(LARGURA_CANVAS - larguraCalcada, 0, larguraCalcada, ALTURA_CANVAS);

    ctx.fillStyle = c.estrada;
    ctx.fillRect(larguraCalcada, 0, LARGURA_CANVAS - larguraCalcada * 2, ALTURA_CANVAS);

    offsetEstrada += 1.5;
    if (offsetEstrada > 60) offsetEstrada = 0;

    ctx.fillStyle = c.faixa;
    for (let y = -60 + offsetEstrada; y < ALTURA_CANVAS; y += 60) {
        ctx.fillRect(LARGURA_CANVAS / 2 - 2, y, 4, 30);
    }
    ctx.fillRect(larguraCalcada + 2, 0, 3, ALTURA_CANVAS);
    ctx.fillRect(LARGURA_CANVAS - larguraCalcada - 5, 0, 3, ALTURA_CANVAS);
    for (let y = -60 + offsetEstrada; y < ALTURA_CANVAS; y += 60) {
        ctx.fillRect(LARGURA_CANVAS * 0.35, y, 4, 30);
        ctx.fillRect(LARGURA_CANVAS * 0.65, y, 4, 30);
    }

    // Faixa BRT
    if (brtAtivo) {
        ctx.fillStyle = '#666666';
        ctx.fillRect(BRT_ESQUERDA_X, 0, BRT_LARGURA, ALTURA_CANVAS);
        ctx.fillRect(BRT_DIREITA_X, 0, BRT_LARGURA, ALTURA_CANVAS);

        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        for (let y = offsetEstrada * 2; y < ALTURA_CANVAS + 100; y += 150) {
            ctx.fillText('BRT', BRT_ESQUERDA_X + BRT_LARGURA / 2, y);
            ctx.fillText('BRT', BRT_DIREITA_X + BRT_LARGURA / 2, y);
        }
        ctx.textAlign = 'start';
    }

    // Prédios / Casas
    let xEsq = 5;
    for (let i = 0; i < prediosEsquerda.length; i++) {
        let p = prediosEsquerda[i];
        p.y += velocidadePredios;
        if (p.y > ALTURA_CANVAS) { p.y = -100; }
        desenharPredio(p.tipo, xEsq, p.y);
    }

    let xDir = LARGURA_CANVAS - 125;
    for (let i = 0; i < prediosDireita.length; i++) {
        let p = prediosDireita[i];
        p.y += velocidadePredios;
        if (p.y > ALTURA_CANVAS) { p.y = -100; }
        desenharPredio(p.tipo, xDir, p.y);
    }

    // Arvorezinhas entre os monumentos
    ctx.fillStyle = '#3d7a2e';
    {
        for (let i = 0; i < prediosEsquerda.length; i++) {
            let yArvore = prediosEsquerda[i].y + 85;
            ctx.beginPath();
            ctx.arc(larguraCalcada - 15, yArvore, 8, 0, Math.PI * 2);
            ctx.fill();
            yArvore = prediosDireita[i].y + 85;
            ctx.beginPath();
            ctx.arc(LARGURA_CANVAS - larguraCalcada + 15, yArvore, 8, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

function desenharPredio(tipo, x, y) {
    if (tipo === 'ministerio') desenharMinisterio(x, y);
    else if (tipo === 'congresso') desenharCongresso(x, y);
    else if (tipo === 'catedral') desenharCatedral(x, y);
    else if (tipo === 'palacio') desenharPalacio(x, y);
}

// ========================================
// MONUMENTOS DE BRASÍLIA
// ========================================
function desenharMinisterio(x, y) {
    ctx.fillStyle = '#e8e0d0';
    ctx.fillRect(x + 10, y, 100, 70);
    ctx.fillStyle = '#b0a89a';
    for (let i = 0; i < 5; i++) {
        ctx.fillRect(x + 15 + i * 22, y + 55, 4, 15);
    }
    ctx.fillStyle = '#5a8faf';
    for (let linha = 0; linha < 3; linha++) {
        for (let col = 0; col < 6; col++) {
            ctx.fillRect(x + 16 + col * 15, y + 5 + linha * 16, 10, 12);
        }
    }
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fillRect(x + 10, y + 65, 100, 5);
}

function desenharCongresso(x, y) {
    ctx.fillStyle = '#e8e0d0';
    ctx.fillRect(x + 5, y + 40, 110, 30);
    ctx.fillStyle = '#d0c8b8';
    ctx.fillRect(x + 42, y, 12, 55);
    ctx.fillRect(x + 62, y, 12, 55);
    ctx.fillStyle = '#5a8faf';
    for (let i = 0; i < 5; i++) {
        ctx.fillRect(x + 44, y + 4 + i * 10, 8, 6);
        ctx.fillRect(x + 64, y + 4 + i * 10, 8, 6);
    }
    ctx.fillStyle = '#d0c8b8';
    ctx.beginPath();
    ctx.arc(x + 90, y + 42, 18, Math.PI, 0);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 28, y + 38, 18, 0, Math.PI);
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fillRect(x + 5, y + 65, 110, 5);
}

function desenharCatedral(x, y) {
    ctx.fillStyle = '#d0c8b8';
    ctx.beginPath();
    ctx.ellipse(x + 60, y + 60, 45, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#e8e0d0';
    ctx.lineWidth = 3;
    for (let i = 0; i < 8; i++) {
        let angulo = (i / 8) * Math.PI * 2;
        let baseX = x + 60 + Math.cos(angulo) * 35;
        let baseY = y + 60 + Math.sin(angulo) * 8;
        ctx.beginPath();
        ctx.moveTo(baseX, baseY);
        ctx.quadraticCurveTo(baseX, y + 15, x + 60, y + 5);
        ctx.stroke();
    }
    ctx.fillStyle = 'rgba(70, 150, 220, 0.5)';
    ctx.beginPath();
    ctx.moveTo(x + 25, y + 55);
    ctx.quadraticCurveTo(x + 60, y - 5, x + 95, y + 55);
    ctx.fill();
    ctx.fillStyle = '#c0a030';
    ctx.fillRect(x + 58, y - 5, 4, 15);
    ctx.fillRect(x + 54, y, 12, 3);
}

function desenharPalacio(x, y) {
    ctx.fillStyle = '#e8e0d0';
    ctx.fillRect(x + 10, y + 15, 100, 45);
    ctx.fillStyle = '#5a8faf';
    ctx.fillRect(x + 15, y + 20, 90, 30);
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(x + 15, y + 20, 90, 10);
    ctx.strokeStyle = '#d0c8b8';
    ctx.lineWidth = 3;
    for (let i = 0; i < 6; i++) {
        let colX = x + 18 + i * 18;
        ctx.beginPath();
        ctx.moveTo(colX - 4, y + 60);
        ctx.quadraticCurveTo(colX + 2, y + 30, colX - 2, y + 10);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(colX + 8, y + 60);
        ctx.quadraticCurveTo(colX + 2, y + 30, colX + 6, y + 10);
        ctx.stroke();
    }
    ctx.fillStyle = '#d0c8b8';
    ctx.fillRect(x + 5, y + 12, 110, 5);
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fillRect(x + 10, y + 58, 100, 5);
}

// ========================================
// HUD
// ========================================
function atualizarHUD() {
    document.getElementById('tempo').textContent = tempoRestante;
    document.getElementById('pontos').textContent = pontuacao;
    document.getElementById('entregas').textContent = totalEntregas;
    document.getElementById('nivel').textContent = nivelAtual;
    document.getElementById('nivel-nome').textContent = 'Brasília';

    let coracoes = '';
    for (let i = 0; i < CONFIG_VIDAS.inicial; i++) {
        coracoes += i < vidas ? '❤️' : '🖤';
    }
    document.getElementById('vidas-display').textContent = coracoes;
}

function mostrarMensagem(texto) {
    let msg = document.getElementById('mensagem-entrega');
    msg.textContent = texto;
    msg.classList.remove('escondido');
    setTimeout(function() { msg.classList.add('escondido'); }, 2000);
}

// ========================================
// GAME OVER
// ========================================
function gameOver(motivo) {
    jogoRodando = false;
    clearInterval(timerIntervalo);
    cancelAnimationFrame(animacaoFrame);
    if (timerCoracao) clearTimeout(timerCoracao);
    if (timerEscudo) clearTimeout(timerEscudo);

    if (motivo === 'vidas') {
        document.getElementById('titulo-gameover').textContent = '💀 Sem Vidas!';
        document.getElementById('subtitulo-gameover').textContent = 'A moto não aguentou tantas batidas...';
    } else {
        document.getElementById('titulo-gameover').textContent = '⏰ Tempo Esgotado!';
        document.getElementById('subtitulo-gameover').textContent = 'O rush venceu dessa vez...';
    }

    document.getElementById('pontos-final').textContent = pontuacao;
    document.getElementById('entregas-final').textContent = totalEntregas;
    document.getElementById('nivel-final').textContent = nivelAtual;

    document.getElementById('tela-jogo').classList.add('escondido');
    document.getElementById('tela-gameover').classList.remove('escondido');
}

function voltarInicio() {
    document.getElementById('tela-gameover').classList.add('escondido');
    document.getElementById('tela-inicio').classList.remove('escondido');
}

// ========================================
// SISTEMA DE CORAÇÃO
// ========================================
function agendarCoracao() {
    if (coracaoItem) return;
    timerCoracao = setTimeout(function() {
        if (!jogoRodando) return;
        coracaoItem = {
            x: 140 + Math.random() * (LARGURA_CANVAS - 280),
            y: 80 + Math.random() * (ALTURA_CANVAS - 250),
            largura: 25,
            altura: 25
        };
    }, CONFIG_VIDAS.tempoCoracaoAparecer * 1000);
}

function desenharCoracao(ctx) {
    if (!coracaoItem) return;
    let pulso = Math.sin(Date.now() / 200) * 3;
    let cx = coracaoItem.x + coracaoItem.largura / 2;
    let cy = coracaoItem.y + coracaoItem.altura / 2;
    let tamanho = 12 + pulso;

    ctx.fillStyle = 'rgba(255, 50, 50, 0.3)';
    ctx.beginPath();
    ctx.arc(cx, cy, tamanho + 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ff2d55';
    ctx.beginPath();
    ctx.moveTo(cx, cy + tamanho * 0.7);
    ctx.bezierCurveTo(cx - tamanho, cy, cx - tamanho, cy - tamanho * 0.7, cx, cy - tamanho * 0.3);
    ctx.bezierCurveTo(cx + tamanho, cy - tamanho * 0.7, cx + tamanho, cy, cx, cy + tamanho * 0.7);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 9px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('+1', cx, cy + tamanho + 14);
    ctx.textAlign = 'start';
}

// ========================================
// SISTEMA DE ESCUDO
// ========================================
function agendarEscudo() {
    if (timerEscudo) clearTimeout(timerEscudo);
    let tempo = 15000;
    timerEscudo = setTimeout(function() {
        if (!jogoRodando || escudoItem || escudoAtivo) {
            agendarEscudo();
            return;
        }
        escudoItem = {
            x: 140 + Math.random() * (LARGURA_CANVAS - 280),
            y: 80 + Math.random() * (ALTURA_CANVAS - 250),
            largura: 30,
            altura: 30
        };
        mostrarMensagem('🛡️ Escudo apareceu na pista!');
    }, tempo);
}

function desenharEscudoItem(ctx) {
    if (!escudoItem) return;
    let pulso = Math.sin(Date.now() / 150) * 3;
    let cx = escudoItem.x + escudoItem.largura / 2;
    let cy = escudoItem.y + escudoItem.altura / 2;
    let raio = 14 + pulso;

    ctx.fillStyle = 'rgba(0, 200, 255, 0.3)';
    ctx.beginPath();
    ctx.arc(cx, cy, raio + 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#00c8ff';
    ctx.beginPath();
    ctx.moveTo(cx, cy - raio);
    ctx.lineTo(cx + raio, cy - raio * 0.3);
    ctx.lineTo(cx + raio * 0.7, cy + raio * 0.8);
    ctx.lineTo(cx, cy + raio);
    ctx.lineTo(cx - raio * 0.7, cy + raio * 0.8);
    ctx.lineTo(cx - raio, cy - raio * 0.3);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('★', cx, cy + 4);
    ctx.font = 'bold 9px Arial';
    ctx.fillText('6s', cx, cy + raio + 14);
    ctx.textAlign = 'start';
}

// ========================================
// ITEM DE TEMPO
// ========================================
function desenharTempoItem(ctx) {
    if (!tempoItem) return;
    let pulso = Math.sin(Date.now() / 150) * 3;
    let cx = tempoItem.x + tempoItem.largura / 2;
    let cy = tempoItem.y + tempoItem.altura / 2;
    let raio = 14 + pulso;

    ctx.fillStyle = 'rgba(52, 152, 219, 0.3)';
    ctx.beginPath();
    ctx.arc(cx, cy, raio + 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#3498db';
    ctx.beginPath();
    ctx.arc(cx, cy, raio, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx, cy - raio * 0.6);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + raio * 0.4, cy);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('+' + tempoItem.valor + 's', cx, cy + raio + 14);
    ctx.textAlign = 'start';
}

// ========================================
// BRT
// ========================================
function atualizarBRT() {
    if (brtAtivo) {
        brtTempoRestante--;

        if (Math.random() < 0.008) {
            let lado = Math.random() < 0.5 ? 'esquerda' : 'direita';
            let bx = lado === 'esquerda' ? BRT_ESQUERDA_X + 4 : BRT_DIREITA_X + 4;
            brtOnibus.push({
                x: bx,
                y: ALTURA_CANVAS + 10,
                largura: BRT_LARGURA - 8,
                altura: 100,
                velocidade: 7 + Math.random() * 3,
                lado: lado
            });
        }

        if (brtTempoRestante <= 0) {
            brtAtivo = false;
            brtProximoSpawn = 3600;
            mostrarMensagem('🚌 Faixa BRT liberada!');
        }
    } else {
        brtProximoSpawn--;
        if (brtProximoSpawn <= 0) {
            brtAtivo = true;
            brtTempoRestante = 1200;
            brtOnibus = [];
            mostrarMensagem('🚌 FAIXA BRT ATIVA! Cuidado com os ônibus!');
        }
    }
}

function desenharBRT(ctx, bus) {
    ctx.fillStyle = '#f0c820';
    ctx.fillRect(bus.x, bus.y, bus.largura, bus.altura);
    ctx.fillStyle = '#d4ac0d';
    ctx.fillRect(bus.x + 2, bus.y + 2, bus.largura - 4, bus.altura - 4);
    ctx.fillStyle = '#5dade2';
    for (let j = 0; j < 5; j++) {
        ctx.fillRect(bus.x + 3, bus.y + 10 + j * 18, 8, 12);
        ctx.fillRect(bus.x + bus.largura - 11, bus.y + 10 + j * 18, 8, 12);
    }
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(bus.x + 4, bus.y + 2, bus.largura - 8, 8);
    ctx.fillStyle = '#ffffaa';
    ctx.fillRect(bus.x + 4, bus.y, 6, 4);
    ctx.fillRect(bus.x + bus.largura - 10, bus.y, 6, 4);
    ctx.fillStyle = '#333';
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('BRT', bus.x + bus.largura / 2, bus.y + bus.altura / 2 + 3);
    ctx.textAlign = 'start';
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(bus.x - 2, bus.y + 15, 4, 8);
    ctx.fillRect(bus.x + bus.largura - 2, bus.y + 15, 4, 8);
    ctx.fillRect(bus.x - 2, bus.y + bus.altura - 20, 4, 8);
    ctx.fillRect(bus.x + bus.largura - 2, bus.y + bus.altura - 20, 4, 8);
}

// ========================================
// LADRÃO DE PEDIDOS
// ========================================
function iniciarLadrao(lado) {
    if (!jogador.carregando) return;
    let offsetX = lado === 'esquerda' ? -40 : 40;
    let novoLadrao = {
        x: jogador.x + offsetX,
        y: ALTURA_CANVAS + 60,
        largura: 28,
        altura: 45,
        velocidade: 1.5,
        temPedido: false,
        alertaFrames: 120,
        fase: 'alerta',
        lado: lado
    };
    ladroes.push(novoLadrao);
    if (ladroes.length === 1) {
        mostrarMensagem('🚨 LADRÃO ATRÁS DE VOCÊ! DESVIE!');
    }
}

function atualizarLadrao(l, index) {
    if (!jogador.carregando && !l.temPedido) {
        l.fase = 'fugindo';
        l.velocidade = 8;
    }

    if (l.fase === 'alerta') {
        l.y -= l.velocidade;
        let offsetX = l.lado === 'esquerda' ? -40 : 40;
        l.x = jogador.x + offsetX;
        l.alertaFrames--;
        if (l.alertaFrames <= 0) {
            l.fase = 'avancando';
            l.velocidade = 3;
        }
    } else if (l.fase === 'avancando') {
        l.velocidade += 0.12;
        l.y -= l.velocidade;
        let diffX = jogador.x - l.x;
        l.x += diffX * 0.06;

        if (verificarColisao(l, jogador) && jogador.carregando) {
            jogador.carregando = false;
            l.temPedido = true;
            l.fase = 'fugindo';
            l.velocidade = 10;
            mostrarMensagem('😡 Roubaram seu pedido!');
            for (let j = 0; j < ladroes.length; j++) {
                if (j !== index && !ladroes[j].temPedido) {
                    ladroes[j].fase = 'fugindo';
                    ladroes[j].velocidade = 10;
                }
            }
            destinoAtual = null;
            setTimeout(function() { if (jogoRodando) criarPedido(); }, 1500);
        }

        if (l.y < jogador.y - 120) {
            l.fase = 'fugindo';
            l.velocidade = 10;
            if (!l.temPedido) pontuacao += 50;
        }
    } else if (l.fase === 'fugindo') {
        l.y -= l.velocidade;
        l.velocidade += 0.3;
        if (l.y < -120) {
            ladroes.splice(index, 1);
            if (ladroes.length === 0 && jogador.carregando) {
                mostrarMensagem('✅ Você escapou dos ladrões!');
            }
        }
    }
}

function desenharLadrao(ctx, ladrao) {
    if (!ladrao) return;
    let cx = ladrao.x + ladrao.largura / 2;
    let ly = ladrao.y;

    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.ellipse(cx, ly + ladrao.altura - 4, 7, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.moveTo(cx - 5, ly + ladrao.altura - 8);
    ctx.lineTo(cx + 5, ly + ladrao.altura - 8);
    ctx.lineTo(cx + 4, ly + 16);
    ctx.lineTo(cx - 4, ly + 16);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#111';
    ctx.fillRect(cx - 6, ly + 10, 12, 12);
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(cx, ly + 7, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(cx - 4, ly + 5, 3, 2);
    ctx.fillRect(cx + 1, ly + 5, 3, 2);

    ctx.fillStyle = '#444';
    ctx.fillRect(cx - 12, ly + 14, 24, 2);

    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.ellipse(cx, ly + 3, 6, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    if (ladrao.fase === 'avancando') {
        ctx.fillStyle = '#8B6914';
        let lado = ladrao.x < jogador.x ? 1 : -1;
        ctx.fillRect(cx + lado * 10, ly + 12, lado * 12, 4);
    }

    if (ladrao.temPedido) {
        ctx.fillStyle = CORES.pedido;
        ctx.fillRect(cx - 8, ly + 22, 16, 12);
        ctx.fillStyle = '#fff';
        ctx.fillRect(cx - 1, ly + 23, 2, 10);
        ctx.fillRect(cx - 5, ly + 27, 10, 2);
    }

    let velocidadePisca = ladrao.fase === 'alerta' ? 400 : 150;
    if (Math.floor(Date.now() / velocidadePisca) % 2 === 0) {
        ctx.fillStyle = '#ff0000';
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('⚠', cx, ly - 8);
        if (ladrao.fase === 'alerta') {
            ctx.font = 'bold 14px Arial';
            ctx.fillText('LADRÃO!', cx, ly - 22);
        }
        ctx.textAlign = 'start';
    }
}

// ========================================
// EFEITOS VISUAIS DE CENÁRIO
// ========================================
function inicializarChuva() {
    gotasChuva = [];
    let quantidade = cenarioAtual.relampago ? 150 : 80;
    for (let i = 0; i < quantidade; i++) {
        gotasChuva.push({
            x: Math.random() * LARGURA_CANVAS,
            y: Math.random() * ALTURA_CANVAS,
            velocidade: 4 + Math.random() * 4,
            comprimento: 8 + Math.random() * 12
        });
    }
}

function desenharEfeitosCenario() {
    let c = cenarioAtual;

    if (c.escuridao > 0) {
        ctx.fillStyle = 'rgba(0, 0, 10, ' + c.escuridao + ')';
        ctx.fillRect(0, 0, LARGURA_CANVAS, ALTURA_CANVAS);

        if (c.escuridao >= 0.3) {
            let grad = ctx.createRadialGradient(
                jogador.x + jogador.largura / 2, jogador.y - 10, 5,
                jogador.x + jogador.largura / 2, jogador.y - 60, 80
            );
            grad.addColorStop(0, 'rgba(255, 255, 200, 0.25)');
            grad.addColorStop(1, 'rgba(255, 255, 200, 0)');
            ctx.fillStyle = grad;
            ctx.fillRect(jogador.x - 60, jogador.y - 140, jogador.largura + 120, 150);
        }
    }

    if (c.chuva && gotasChuva.length > 0) {
        ctx.strokeStyle = 'rgba(150, 180, 255, 0.4)';
        ctx.lineWidth = 1;
        for (let i = 0; i < gotasChuva.length; i++) {
            let gota = gotasChuva[i];
            ctx.beginPath();
            ctx.moveTo(gota.x, gota.y);
            ctx.lineTo(gota.x - 1, gota.y + gota.comprimento);
            ctx.stroke();
            gota.y += gota.velocidade;
            gota.x -= 0.5;
            if (gota.y > ALTURA_CANVAS) {
                gota.y = -gota.comprimento;
                gota.x = Math.random() * LARGURA_CANVAS;
            }
        }
    }

    if (c.neblina) {
        ctx.fillStyle = 'rgba(180, 180, 200, 0.15)';
        ctx.fillRect(0, 0, LARGURA_CANVAS, ALTURA_CANVAS);
        let onda = Math.sin(Date.now() / 2000) * 20;
        ctx.fillStyle = 'rgba(200, 200, 220, 0.1)';
        ctx.fillRect(0, 150 + onda, LARGURA_CANVAS, 80);
        ctx.fillRect(0, 350 - onda, LARGURA_CANVAS, 60);
    }

    if (c.relampago) {
        frameRelampago++;
        if (frameRelampago > 240 && Math.random() < 0.01) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.fillRect(0, 0, LARGURA_CANVAS, ALTURA_CANVAS);
            frameRelampago = 0;
        }
    }
}
