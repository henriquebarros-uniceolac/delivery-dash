/* ========================================
   GAME.JS - Loop Principal do Jogo
   ========================================
   Este é o arquivo central que conecta tudo:
   - Controla as telas (início, jogo, game over)
   - Roda o loop principal (atualizar + desenhar)
   - Gerencia tempo, pontos e níveis
   - Desenha o cenário (estrada de Brasília)

   O loop principal funciona assim:
   1. Limpa o canvas
   2. Desenha o cenário
   3. Move e desenha os obstáculos
   4. Move e desenha o jogador
   5. Verifica colisões e entregas
   6. Atualiza HUD
   7. Repete (60 vezes por segundo)
   ======================================== */

// ---------- VARIÁVEIS DO JOGO ----------
let canvas;           // Elemento canvas HTML
let ctx;              // Contexto 2D para desenhar
let pontuacao = 0;    // Pontos do jogador
let tempoRestante;    // Segundos restantes
let totalEntregas = 0;// Total de entregas feitas
let nivelAtual = 1;   // Nível de dificuldade
let jogoRodando = false;  // Se o jogo está ativo
let timerIntervalo;   // Referência do setInterval do timer
let animacaoFrame;    // Referência do requestAnimationFrame

// ---------- SISTEMA DE VIDAS ----------
let vidas = 5;              // Vidas atuais
let framesInvencivel = 0;   // Contador de invencibilidade (pisca após dano)
let coracaoItem = null;     // Coração de recuperação na pista
let timerCoracao = null;    // Timer para spawnar coração

// ---------- ITEM DE TEMPO ----------
let tempoItem = null;        // Relógio de bônus na pista
let tempoItemSpawnado = false; // Se já spawnou neste ciclo de alerta

// ---------- PAUSA DO TIMER ----------
let tempoPausado = false;     // Se o timer está pausado (após entrega)
let framesPausa = 0;          // Contador de frames da pausa

// ---------- PODER ESCUDO ----------
let escudoItem = null;         // Item de escudo na pista
let escudoAtivo = false;       // Se o poder está ativo
let escudoFrames = 0;          // Frames restantes do escudo (6s = 360 frames)
let timerEscudo = null;        // Timer para spawnar escudo

// ---------- LADRÃO DE PEDIDOS ----------
let ladroes = [];               // Array de ladrões ativos
let contadorEntregas = 0;       // Conta entregas para saber quando ativar ladrão

// ---------- FAIXA BRT ----------
let brtAtivo = false;          // Se as faixas BRT estão visíveis
let brtOnibus = [];            // Ônibus BRT passando
let brtTempoRestante = 0;     // Frames restantes (20s = 1200)
let brtProximoSpawn = 1800;   // Frames até aparecer (30s)
// Faixas BRT: coladas nas calçadas, uma de cada lado
const BRT_ESQUERDA_X = 130;
const BRT_DIREITA_X = 622;
const BRT_LARGURA = 48;

// ---------- EFEITOS VISUAIS ----------
let cenarioAtual = null;    // Objeto com cores/efeitos do nível
let gotasChuva = [];        // Array de gotas de chuva
let frameRelampago = 0;     // Contador para efeito de relâmpago

// Variáveis para o efeito da estrada
let offsetEstrada = 0; // Para animar as faixas da estrada

// ---------- PRÉDIOS DE BRASÍLIA ----------
// Cada prédio tem um tipo fixo e uma posição Y que desce pela tela.
// Quando sai por baixo, volta ao topo mantendo o mesmo tipo.
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
let velocidadePredios = 1.5; // Velocidade que os prédios descem

/**
 * ajustarCanvas()
 * -----------------
 * Adapta o tamanho do canvas ao dispositivo.
 *
 * No MOBILE: o canvas ocupa a largura da tela e a altura
 * disponível (descontando HUD e controles).
 *
 * No DESKTOP: usa um tamanho fixo confortável.
 *
 * O truque é: o canvas tem um tamanho INTERNO (resolução lógica)
 * e um tamanho VISUAL (CSS). O jogo desenha na resolução interna,
 * e o CSS escala para o tamanho visual. Assim tudo fica proporcional.
 */
function ajustarCanvas() {
    // A resolução interna é SEMPRE 800x600
    canvas.width = LARGURA_CANVAS;
    canvas.height = ALTURA_CANVAS;

    let larguraTela = window.innerWidth;

    if (larguraTela <= 650) {
        // ---------- MOBILE ----------
        // O canvas ocupa TODA a tela disponível (abaixo do HUD).
        // Os controles ficam por cima do jogo (overlay), sem roubar espaço.
        let alturaTela = window.innerHeight;

        // Espaço: tela toda menos o HUD no topo (~55px)
        let alturaDisponivel = alturaTela - 55;

        // Escala pela LARGURA para preencher horizontalmente
        // e depois estica a altura para preencher o espaço todo
        let escala = larguraTela / LARGURA_CANVAS;

        canvas.style.width = larguraTela + 'px';
        canvas.style.height = alturaDisponivel + 'px';
    } else {
        // ---------- DESKTOP ----------
        // Sem escala, tamanho natural
        canvas.style.width = '';
        canvas.style.height = '';
    }
}

/**
 * iniciarJogo()
 * ---------------
 * Chamada quando o jogador clica em "Começar Entrega!".
 * Prepara tudo e inicia o loop do jogo.
 */
function iniciarJogo() {
    // Troca as telas
    document.getElementById('tela-inicio').classList.add('escondido');
    document.getElementById('tela-gameover').classList.add('escondido');
    document.getElementById('tela-jogo').classList.remove('escondido');

    // Configura o canvas com tamanho adaptado à tela
    canvas = document.getElementById('canvas-jogo');
    ajustarCanvas();
    ctx = canvas.getContext('2d');

    // Reseta variáveis
    pontuacao = 0;
    tempoRestante = CONFIG_TEMPO.inicial;
    totalEntregas = 0;
    nivelAtual = 1;
    jogoRodando = true;

    // Reseta vidas
    vidas = CONFIG_VIDAS.inicial;
    framesInvencivel = 0;
    coracaoItem = null;
    if (timerCoracao) clearTimeout(timerCoracao);

    // Reseta item de tempo
    tempoItem = null;
    tempoItemSpawnado = false;
    tempoPausado = false;
    framesPausa = 0;

    // Reseta ladrões
    ladroes = [];
    contadorEntregas = 0;

    // Reseta BRT (primeira aparição após 30 segundos)
    brtAtivo = false;
    brtOnibus = [];
    brtTempoRestante = 0;
    brtProximoSpawn = 1800; // 30 segundos primeira vez

    // Reseta escudo
    escudoItem = null;
    escudoAtivo = false;
    escudoFrames = 0;
    if (timerEscudo) clearInterval(timerEscudo);
    agendarEscudo();

    // Reseta efeitos visuais
    cenarioAtual = obterCenarioNivel(1);
    gotasChuva = [];
    frameRelampago = 0;

    // Reseta prédios nas posições iniciais
    prediosEsquerda[0].y = 0;
    prediosEsquerda[1].y = 180;
    prediosEsquerda[2].y = 360;
    prediosEsquerda[3].y = 540;
    prediosDireita[0].y = 0;
    prediosDireita[1].y = 180;
    prediosDireita[2].y = 360;
    prediosDireita[3].y = 540;

    // Reseta teclas (evita jogador sair andando)
    teclas.ArrowUp = false;
    teclas.ArrowDown = false;
    teclas.ArrowLeft = false;
    teclas.ArrowRight = false;

    // Inicializa os módulos
    inicializarJogador();
    inicializarObstaculos(nivelAtual);
    criarPedido();
    configurarTeclas();

    // Atualiza HUD
    atualizarHUD();

    // Inicia o timer (conta regressiva)
    timerIntervalo = setInterval(function() {
        // Se o timer está pausado (após entrega), não decrementa
        if (tempoPausado) return;

        tempoRestante--;
        document.getElementById('tempo').textContent = tempoRestante;

        // Quando faltar poucos segundos, spawna um item de tempo na pista
        if (tempoRestante <= CONFIG_TEMPO.alertaSegundos && !tempoItemSpawnado && !tempoItem) {
            tempoItemSpawnado = true;
            // Cria relógio na estrada
            tempoItem = {
                x: 140 + Math.random() * (LARGURA_CANVAS - 280),
                y: 80 + Math.random() * (ALTURA_CANVAS - 250),
                largura: 30,
                altura: 30,
                // Valor aleatório entre min e max
                valor: CONFIG_TEMPO.bonusItemMin + Math.floor(
                    Math.random() * (CONFIG_TEMPO.bonusItemMax - CONFIG_TEMPO.bonusItemMin + 1)
                )
            };
            mostrarMensagem('⏱️ Relógio apareceu! Corra até ele!');
        }

        // Reseta o flag quando o tempo volta acima do alerta (pegou entrega)
        if (tempoRestante > CONFIG_TEMPO.alertaSegundos) {
            tempoItemSpawnado = false;
        }

        // Tempo acabou = Game Over
        if (tempoRestante <= 0) {
            gameOver('tempo');
        }
    }, 1000);

    // Inicia o loop principal
    loopPrincipal();
}

/**
 * loopPrincipal()
 * -----------------
 * O coração do jogo. Roda ~60 vezes por segundo.
 * Usa requestAnimationFrame para performance suave.
 *
 * Ordem de execução a cada frame:
 * 1. Limpa tela → 2. Cenário → 3. Obstáculos →
 * 4. Entregas → 5. Jogador → 6. Colisões → 7. HUD
 */
function loopPrincipal() {
    if (!jogoRodando) return;

    // 1. Limpa o canvas inteiro
    ctx.clearRect(0, 0, LARGURA_CANVAS, ALTURA_CANVAS);

    // 2. Desenha o cenário (estrada de Brasília)
    desenharCenario();

    // 3. Atualiza e desenha obstáculos
    atualizarObstaculos(nivelAtual);
    desenharObstaculos(ctx);

    // 4. Desenha pedido/destino
    desenharEntregas(ctx);

    // 5. Desenha coração de recuperação (se existir)
    if (coracaoItem) {
        desenharCoracao(ctx);
    }

    // 6. Move e desenha o jogador
    moverJogador();

    // Conta invencibilidade (jogador pisca)
    if (framesInvencivel > 0) {
        framesInvencivel--;
    }

    // Desenha jogador (pisca se invencível)
    if (framesInvencivel > 0 && Math.floor(framesInvencivel / 5) % 2 === 0) {
        // Não desenha nesse frame (efeito de piscar)
    } else {
        desenharJogador(ctx);
    }

    // 7. Escudo: conta frames e desativa quando acabar
    if (escudoAtivo) {
        escudoFrames--;
        if (escudoFrames <= 0) {
            escudoAtivo = false;
            mostrarMensagem('🛡️ Escudo acabou!');
            agendarEscudo();
        }
    }

    // 8. Verifica colisões com obstáculos
    if (framesInvencivel === 0 && !escudoAtivo) {
        let obstaculoColidido = obterObstaculoColidido();

        if (obstaculoColidido) {
            if (obstaculoColidido.tipo === 'poca') {
                // POÇA: não perde vida, mas controles invertem!
                if (!controlesInvertidos) {
                    controlesInvertidos = true;
                    framesInvertidos = 150; // 2.5 segundos
                    mostrarMensagem('💦 Poça! Controles invertidos!');

                    // Flash azul
                    canvas.style.boxShadow = '0 0 30px blue';
                    setTimeout(function() {
                        canvas.style.boxShadow = 'none';
                    }, 300);

                    // Pequena invencibilidade pra não pegar a mesma poça
                    framesInvencivel = 30;
                }
            } else {
                // Outros obstáculos: perde vida
                vidas--;

                if (vidas <= 0) {
                    gameOver('vidas');
                    return;
                }

                framesInvencivel = CONFIG_VIDAS.invencivel;
                jogador.y = ALTURA_CANVAS - jogador.altura - 100;

                canvas.style.boxShadow = '0 0 30px red';
                setTimeout(function() {
                    canvas.style.boxShadow = 'none';
                }, 300);

                mostrarMensagem('💔 -1 vida! Restam ' + vidas);
                agendarCoracao();
            }
        }
    }

    // 8. Verifica coleta de coração
    if (coracaoItem && framesInvencivel === 0) {
        if (verificarColisao(jogador, coracaoItem)) {
            if (vidas < CONFIG_VIDAS.inicial) {
                vidas++;
                mostrarMensagem('❤️ +1 vida!');
            } else {
                // Já tem vida cheia, ganha pontos
                pontuacao += 50;
                mostrarMensagem('⭐ +50 pts (vida cheia!)');
            }
            coracaoItem = null;
        }
    }

    // 9. Desenha e verifica item de tempo
    if (tempoItem) {
        desenharTempoItem(ctx);
        if (verificarColisao(jogador, tempoItem)) {
            tempoRestante += tempoItem.valor;
            mostrarMensagem('⏱️ +' + tempoItem.valor + ' segundos!');
            tempoItem = null;
            tempoItemSpawnado = false;
        }
    }

    // 10. Desenha e verifica escudo
    if (escudoItem) {
        desenharEscudoItem(ctx);
        if (verificarColisao(jogador, escudoItem)) {
            escudoAtivo = true;
            escudoFrames = 360; // 6 segundos a 60fps
            escudoItem = null;
            mostrarMensagem('🛡️ ESCUDO ATIVADO! 6 segundos!');
            agendarEscudo(); // Agenda o próximo
        }
    }

    // Aura do escudo ao redor do jogador quando ativo
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

        // Barra de duração do escudo (embaixo do jogador)
        let porcentagem = escudoFrames / 360;
        ctx.fillStyle = 'rgba(0, 200, 255, 0.5)';
        ctx.fillRect(jogador.x - 5, jogador.y + jogador.altura + 5, (jogador.largura + 10) * porcentagem, 4);
    }

    // 11. Verifica entregas
    let resultadoEntrega = verificarEntregas();

    if (resultadoEntrega.coletou) {
        mostrarMensagem('📦 Pedido coletado! Vá até o destino 🏠');

        // Nível 7+: a cada 3 coletas, ladrão(ões) tentam roubar
        if (nivelAtual >= 7 && ladroes.length === 0) {
            contadorEntregas++;
            if (contadorEntregas >= 3) {
                contadorEntregas = 0;
                setTimeout(function() {
                    if (jogoRodando && jogador.carregando && ladroes.length === 0) {
                        // 30% de chance de vir 2 ladrões (um de cada lado)
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
        // Entrega concluída!
        pontuacao += CONFIG_ENTREGAS.pontosEntrega;
        let bonus = CONFIG_TEMPO.bonusEntrega;
        tempoRestante += bonus;
        totalEntregas++;

        // Pausa o timer por 3 segundos após entregar (respiro pro jogador)
        tempoPausado = true;
        setTimeout(function() {
            tempoPausado = false;
        }, 3000);

        mostrarMensagem('✅ +' + CONFIG_ENTREGAS.pontosEntrega + ' pts | +' + bonus + 's | ⏸️ 3s');

        // Verifica se subiu de nível
        if (totalEntregas % CONFIG_DIFICULDADE.entregasPorNivel === 0) {
            nivelAtual++;
            cenarioAtual = obterCenarioNivel(nivelAtual);

            // Adiciona obstáculos gradualmente (respeitando o máximo)
            let novaQuantidade = CONFIG_DIFICULDADE.obstaculosIniciais
                + (nivelAtual - 1) * CONFIG_DIFICULDADE.obstaculosPorNivel;
            if (novaQuantidade > CONFIG_DIFICULDADE.obstaculosMaximo) {
                novaQuantidade = CONFIG_DIFICULDADE.obstaculosMaximo;
            }
            inicializarObstaculos(nivelAtual);

            mostrarMensagem('⬆️ NÍVEL ' + nivelAtual + ' - ' + cenarioAtual.nome + '!');

            // Inicializa gotas de chuva se necessário
            if (cenarioAtual.chuva && gotasChuva.length === 0) {
                inicializarChuva();
            }
            if (!cenarioAtual.chuva) {
                gotasChuva = [];
            }
        }

        // Cria novo pedido
        criarPedido();

        // Conta entregas para o ladrão (nível 10+, a cada 3 entregas)
        if (nivelAtual >= 10) {
            contadorEntregas++;
        }
    }

    // 12. Atualiza e desenha ladrões
    for (let i = ladroes.length - 1; i >= 0; i--) {
        atualizarLadrao(ladroes[i], i);
        desenharLadrao(ctx, ladroes[i]);
    }

    // 13. Sistema BRT
    atualizarBRT();
    if (brtAtivo) {
        // Desenha e move ônibus
        for (let i = brtOnibus.length - 1; i >= 0; i--) {
            let bus = brtOnibus[i];
            bus.y -= bus.velocidade;

            // Saiu da tela
            if (bus.y + bus.altura < -10) {
                brtOnibus.splice(i, 1);
                continue;
            }

            // Desenha o ônibus BRT
            desenharBRT(ctx, bus);

            // Colisão com jogador
            if (framesInvencivel === 0 && !escudoAtivo && verificarColisao(jogador, bus)) {
                vidas--;
                if (vidas <= 0) {
                    gameOver('vidas');
                    return;
                }
                framesInvencivel = CONFIG_VIDAS.invencivel;
                jogador.y = ALTURA_CANVAS - jogador.altura - 100;
                canvas.style.boxShadow = '0 0 30px red';
                setTimeout(function() { canvas.style.boxShadow = 'none'; }, 300);
                mostrarMensagem('🚌 Atropelado pelo BRT! -1 vida');
                agendarCoracao();
            }
        }
    }

    // 14. Efeitos visuais do cenário
    desenharEfeitosCenario();

    // 11. Atualiza HUD
    atualizarHUD();

    // Agenda o próximo frame
    animacaoFrame = requestAnimationFrame(loopPrincipal);
}

/**
 * desenharCenario()
 * -------------------
 * Desenha a estrada e as calçadas de Brasília.
 * As faixas se movem para dar sensação de velocidade.
 */
function desenharCenario() {
    // Largura das calçadas (onde ficam os prédios)
    let larguraCalcada = 130;

    // Usa cores do cenário atual (muda conforme o nível)
    let c = cenarioAtual;

    // Grama (muda de cor conforme horário)
    ctx.fillStyle = c.grama;
    ctx.fillRect(0, 0, LARGURA_CANVAS, ALTURA_CANVAS);

    // Calçadas laterais
    ctx.fillStyle = c.calcada;
    ctx.fillRect(0, 0, larguraCalcada, ALTURA_CANVAS);
    ctx.fillRect(LARGURA_CANVAS - larguraCalcada, 0, larguraCalcada, ALTURA_CANVAS);

    // Estrada principal (asfalto)
    ctx.fillStyle = c.estrada;
    ctx.fillRect(larguraCalcada, 0, LARGURA_CANVAS - larguraCalcada * 2, ALTURA_CANVAS);

    // ========== FAIXAS DA ESTRADA ==========
    offsetEstrada += 1.5; // Velocidade das faixas da estrada
    if (offsetEstrada > 60) offsetEstrada = 0;

    ctx.fillStyle = c.faixa;
    // Faixa central tracejada
    for (let y = -60 + offsetEstrada; y < ALTURA_CANVAS; y += 60) {
        ctx.fillRect(LARGURA_CANVAS / 2 - 2, y, 4, 30);
    }
    // Faixas laterais contínuas
    ctx.fillRect(larguraCalcada + 2, 0, 3, ALTURA_CANVAS);
    ctx.fillRect(LARGURA_CANVAS - larguraCalcada - 5, 0, 3, ALTURA_CANVAS);
    // Divisão de pistas
    for (let y = -60 + offsetEstrada; y < ALTURA_CANVAS; y += 60) {
        ctx.fillRect(LARGURA_CANVAS * 0.35, y, 4, 30);
        ctx.fillRect(LARGURA_CANVAS * 0.65, y, 4, 30);
    }

    // ========== FAIXA EXCLUSIVA BRT ==========
    if (brtAtivo) {
        // Pinta a faixa cinza por cima do asfalto
        ctx.fillStyle = '#666666';
        ctx.fillRect(BRT_ESQUERDA_X, 0, BRT_LARGURA, ALTURA_CANVAS);
        ctx.fillRect(BRT_DIREITA_X, 0, BRT_LARGURA, ALTURA_CANVAS);

        // Texto "BRT" pintado no chão (desce com a estrada)
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        for (let y = offsetEstrada * 2; y < ALTURA_CANVAS + 100; y += 150) {
            ctx.fillText('BRT', BRT_ESQUERDA_X + BRT_LARGURA / 2, y);
            ctx.fillText('BRT', BRT_DIREITA_X + BRT_LARGURA / 2, y);
        }
        ctx.textAlign = 'start';
    }

    // ========== ARQUITETURA DE BRASÍLIA ==========
    // Cada prédio desce pela tela (simula o jogador passando por eles).
    // Quando sai por baixo, volta ao topo. O tipo nunca muda.

    // Move e desenha os prédios do lado ESQUERDO
    let xEsq = 5;
    for (let i = 0; i < prediosEsquerda.length; i++) {
        let p = prediosEsquerda[i];
        p.y += velocidadePredios;
        // Se saiu por baixo, volta ao topo
        if (p.y > ALTURA_CANVAS) {
            p.y = -100;
        }
        desenharPredio(p.tipo, xEsq, p.y);
    }

    // Move e desenha os prédios do lado DIREITO
    let xDir = LARGURA_CANVAS - 125;
    for (let i = 0; i < prediosDireita.length; i++) {
        let p = prediosDireita[i];
        p.y += velocidadePredios;
        if (p.y > ALTURA_CANVAS) {
            p.y = -100;
        }
        desenharPredio(p.tipo, xDir, p.y);
    }

    // Arvorezinhas entre os prédios (jardim da Esplanada)
    ctx.fillStyle = '#3d7a2e';
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

/**
 * desenharPredio(tipo, x, y)
 * ---------------------------
 * Desenha o prédio correto baseado no tipo.
 *
 * @param {string} tipo - 'ministerio', 'congresso', 'catedral' ou 'palacio'
 * @param {number} x - Posição horizontal
 * @param {number} y - Posição vertical
 */
function desenharPredio(tipo, x, y) {
    if (tipo === 'ministerio') desenharMinisterio(x, y);
    else if (tipo === 'congresso') desenharCongresso(x, y);
    else if (tipo === 'catedral') desenharCatedral(x, y);
    else if (tipo === 'palacio') desenharPalacio(x, y);
}

/**
 * desenharMinisterio(x, y)
 * -------------------------
 * Desenha um Ministério da Esplanada.
 * Retângulo branco com colunas e janelas azuis,
 * inspirado nos prédios do Oscar Niemeyer.
 *
 * @param {number} x - Posição horizontal
 * @param {number} y - Posição vertical
 */
function desenharMinisterio(x, y) {
    // Estrutura principal (concreto branco)
    ctx.fillStyle = '#e8e0d0';
    ctx.fillRect(x + 10, y, 100, 70);

    // Pilotis (colunas de sustentação - marca do Niemeyer)
    ctx.fillStyle = '#b0a89a';
    for (let i = 0; i < 5; i++) {
        ctx.fillRect(x + 15 + i * 22, y + 55, 4, 15);
    }

    // Janelas azuis (vidro espelhado)
    ctx.fillStyle = '#5a8faf';
    for (let linha = 0; linha < 3; linha++) {
        for (let col = 0; col < 6; col++) {
            ctx.fillRect(x + 16 + col * 15, y + 5 + linha * 16, 10, 12);
        }
    }

    // Sombra inferior
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fillRect(x + 10, y + 65, 100, 5);
}

/**
 * desenharCongresso(x, y)
 * -------------------------
 * Desenha o Congresso Nacional.
 * Duas torres no centro + cúpula (Senado) e
 * cúpula invertida (Câmara).
 */
function desenharCongresso(x, y) {
    // Plataforma base
    ctx.fillStyle = '#e8e0d0';
    ctx.fillRect(x + 5, y + 40, 110, 30);

    // Torres gêmeas (centro)
    ctx.fillStyle = '#d0c8b8';
    ctx.fillRect(x + 42, y, 12, 55);
    ctx.fillRect(x + 62, y, 12, 55);

    // Janelas das torres
    ctx.fillStyle = '#5a8faf';
    for (let i = 0; i < 5; i++) {
        ctx.fillRect(x + 44, y + 4 + i * 10, 8, 6);
        ctx.fillRect(x + 64, y + 4 + i * 10, 8, 6);
    }

    // Cúpula do Senado (lado direito - semicírculo para cima)
    ctx.fillStyle = '#d0c8b8';
    ctx.beginPath();
    ctx.arc(x + 90, y + 42, 18, Math.PI, 0);
    ctx.fill();

    // Cúpula invertida da Câmara (lado esquerdo - semicírculo para baixo)
    ctx.beginPath();
    ctx.arc(x + 28, y + 38, 18, 0, Math.PI);
    ctx.fill();

    // Sombra
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fillRect(x + 5, y + 65, 110, 5);
}

/**
 * desenharCatedral(x, y)
 * ------------------------
 * Desenha a Catedral de Brasília.
 * Estrutura com "costelas" curvas que se encontram
 * no topo, com vitrais azuis entre elas.
 */
function desenharCatedral(x, y) {
    // Base circular
    ctx.fillStyle = '#d0c8b8';
    ctx.beginPath();
    ctx.ellipse(x + 60, y + 60, 45, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    // Costelas da catedral (linhas curvas)
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

    // Vitrais (azul entre as costelas)
    ctx.fillStyle = 'rgba(70, 150, 220, 0.5)';
    ctx.beginPath();
    ctx.moveTo(x + 25, y + 55);
    ctx.quadraticCurveTo(x + 60, y - 5, x + 95, y + 55);
    ctx.fill();

    // Cruz no topo
    ctx.fillStyle = '#c0a030';
    ctx.fillRect(x + 58, y - 5, 4, 15);
    ctx.fillRect(x + 54, y, 12, 3);
}

/**
 * desenharPalacio(x, y)
 * -----------------------
 * Desenha o Palácio do Planalto / Palácio da Alvorada.
 * Estrutura retangular com as famosas colunas em
 * formato de "asas" (curvas características).
 */
function desenharPalacio(x, y) {
    // Estrutura principal (vidro/concreto)
    ctx.fillStyle = '#e8e0d0';
    ctx.fillRect(x + 10, y + 15, 100, 45);

    // Faixa de vidro
    ctx.fillStyle = '#5a8faf';
    ctx.fillRect(x + 15, y + 20, 90, 30);

    // Reflexo no vidro
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(x + 15, y + 20, 90, 10);

    // Colunas em formato de asas (marca do Palácio da Alvorada)
    ctx.strokeStyle = '#d0c8b8';
    ctx.lineWidth = 3;
    for (let i = 0; i < 6; i++) {
        let colX = x + 18 + i * 18;
        ctx.beginPath();
        // Coluna curva: começa larga, afina e alarga de novo
        ctx.moveTo(colX - 4, y + 60);
        ctx.quadraticCurveTo(colX + 2, y + 30, colX - 2, y + 10);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(colX + 8, y + 60);
        ctx.quadraticCurveTo(colX + 2, y + 30, colX + 6, y + 10);
        ctx.stroke();
    }

    // Teto/marquise
    ctx.fillStyle = '#d0c8b8';
    ctx.fillRect(x + 5, y + 12, 110, 5);

    // Sombra
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fillRect(x + 10, y + 58, 100, 5);
}

/**
 * atualizarHUD()
 * ----------------
 * Atualiza os valores exibidos no topo da tela.
 */
function atualizarHUD() {
    document.getElementById('tempo').textContent = tempoRestante;
    document.getElementById('pontos').textContent = pontuacao;
    document.getElementById('entregas').textContent = totalEntregas;
    document.getElementById('nivel').textContent = nivelAtual;
    document.getElementById('nivel-nome').textContent = cenarioAtual.nome;

    // Atualiza corações
    let coracoes = '';
    for (let i = 0; i < CONFIG_VIDAS.inicial; i++) {
        coracoes += i < vidas ? '❤️' : '🖤';
    }
    document.getElementById('vidas-display').textContent = coracoes;
}

/**
 * mostrarMensagem(texto)
 * ------------------------
 * Exibe uma mensagem temporária na tela.
 *
 * @param {string} texto - Texto da mensagem
 */
function mostrarMensagem(texto) {
    let msg = document.getElementById('mensagem-entrega');
    msg.textContent = texto;
    msg.classList.remove('escondido');

    // Esconde após 2 segundos
    setTimeout(function() {
        msg.classList.add('escondido');
    }, 2000);
}

/**
 * gameOver(motivo)
 * ------------------
 * Chamada quando o jogador perde.
 * Pode ser por tempo esgotado ou vidas zeradas.
 *
 * @param {string} motivo - 'tempo' ou 'vidas'
 */
function gameOver(motivo) {
    jogoRodando = false;

    // Para o timer e a animação
    clearInterval(timerIntervalo);
    cancelAnimationFrame(animacaoFrame);
    if (timerCoracao) clearTimeout(timerCoracao);
    if (timerEscudo) clearInterval(timerEscudo);

    // Mensagem diferente conforme o motivo
    if (motivo === 'vidas') {
        document.getElementById('titulo-gameover').textContent = '💀 Sem Vidas!';
        document.getElementById('subtitulo-gameover').textContent = 'A moto não aguentou tantas batidas...';
    } else {
        document.getElementById('titulo-gameover').textContent = '⏰ Tempo Esgotado!';
        document.getElementById('subtitulo-gameover').textContent = 'O rush venceu dessa vez...';
    }

    // Atualiza tela de game over
    document.getElementById('pontos-final').textContent = pontuacao;
    document.getElementById('entregas-final').textContent = totalEntregas;
    document.getElementById('nivel-final').textContent = nivelAtual;

    // Troca as telas
    document.getElementById('tela-jogo').classList.add('escondido');
    document.getElementById('tela-gameover').classList.remove('escondido');
}

/**
 * voltarInicio()
 * ----------------
 * Volta para a tela inicial.
 */
function voltarInicio() {
    document.getElementById('tela-gameover').classList.add('escondido');
    document.getElementById('tela-inicio').classList.remove('escondido');
}

// ========================================
// SISTEMA DE CORAÇÃO DE RECUPERAÇÃO
// ========================================

/**
 * agendarCoracao()
 * ------------------
 * Após perder uma vida, agenda um coração para
 * aparecer na pista depois de alguns segundos.
 * Só aparece se não houver um coração já na pista.
 */
function agendarCoracao() {
    if (coracaoItem) return; // Já tem um na pista

    timerCoracao = setTimeout(function() {
        if (!jogoRodando) return;
        // Cria coração em posição aleatória na estrada
        coracaoItem = {
            x: 140 + Math.random() * (LARGURA_CANVAS - 280),
            y: 80 + Math.random() * (ALTURA_CANVAS - 250),
            largura: 25,
            altura: 25
        };
    }, CONFIG_VIDAS.tempoCoracaoAparecer * 1000);
}

/**
 * desenharCoracao(ctx)
 * ----------------------
 * Desenha o coração de recuperação na pista.
 * Pulsa para chamar atenção.
 */
function desenharCoracao(ctx) {
    if (!coracaoItem) return;

    let pulso = Math.sin(Date.now() / 200) * 3;
    let cx = coracaoItem.x + coracaoItem.largura / 2;
    let cy = coracaoItem.y + coracaoItem.altura / 2;
    let tamanho = 12 + pulso;

    // Brilho atrás
    ctx.fillStyle = 'rgba(255, 50, 50, 0.3)';
    ctx.beginPath();
    ctx.arc(cx, cy, tamanho + 5, 0, Math.PI * 2);
    ctx.fill();

    // Coração (dois semicírculos + triângulo)
    ctx.fillStyle = '#ff2d55';
    ctx.beginPath();
    ctx.moveTo(cx, cy + tamanho * 0.7);
    ctx.bezierCurveTo(cx - tamanho, cy, cx - tamanho, cy - tamanho * 0.7, cx, cy - tamanho * 0.3);
    ctx.bezierCurveTo(cx + tamanho, cy - tamanho * 0.7, cx + tamanho, cy, cx, cy + tamanho * 0.7);
    ctx.fill();

    // Texto
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 9px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('+1', cx, cy + tamanho + 14);
    ctx.textAlign = 'start';
}

// ========================================
// SISTEMA DE ESCUDO
// ========================================

/**
 * agendarEscudo()
 * -----------------
 * Agenda o próximo escudo para aparecer na pista.
 * Primeiro aparece após 15s, depois a cada 20-30s.
 */
function agendarEscudo() {
    if (timerEscudo) clearTimeout(timerEscudo);

    // Primeiro escudo aparece após 15 segundos
    // Os próximos a cada 20-30 segundos
    let tempo = escudoFrames === 0 && !escudoAtivo ? 15000 : (20 + Math.random() * 10) * 1000;

    timerEscudo = setTimeout(function() {
        if (!jogoRodando || escudoItem || escudoAtivo) {
            // Tenta de novo em 5 segundos
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

// ========================================
// ITEM DE ESCUDO (DESENHO)
// ========================================

/**
 * desenharEscudoItem(ctx)
 * -------------------------
 * Desenha o item de escudo na pista.
 * Estrela azul brilhante que pulsa.
 */
function desenharEscudoItem(ctx) {
    if (!escudoItem) return;

    let pulso = Math.sin(Date.now() / 150) * 3;
    let cx = escudoItem.x + escudoItem.largura / 2;
    let cy = escudoItem.y + escudoItem.altura / 2;
    let raio = 14 + pulso;

    // Brilho
    ctx.fillStyle = 'rgba(0, 200, 255, 0.3)';
    ctx.beginPath();
    ctx.arc(cx, cy, raio + 8, 0, Math.PI * 2);
    ctx.fill();

    // Escudo (forma de escudo)
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

    // Borda
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Estrela no centro
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('★', cx, cy + 4);

    // Texto
    ctx.font = 'bold 9px Arial';
    ctx.fillText('6s', cx, cy + raio + 14);
    ctx.textAlign = 'start';
}

// ========================================
// ITEM DE TEMPO (RELÓGIO)
// ========================================

/**
 * desenharTempoItem(ctx)
 * ------------------------
 * Desenha o relógio de bônus de tempo na pista.
 * Pulsa em azul para chamar atenção.
 */
function desenharTempoItem(ctx) {
    if (!tempoItem) return;

    let pulso = Math.sin(Date.now() / 150) * 3;
    let cx = tempoItem.x + tempoItem.largura / 2;
    let cy = tempoItem.y + tempoItem.altura / 2;
    let raio = 14 + pulso;

    // Brilho atrás
    ctx.fillStyle = 'rgba(52, 152, 219, 0.3)';
    ctx.beginPath();
    ctx.arc(cx, cy, raio + 6, 0, Math.PI * 2);
    ctx.fill();

    // Círculo do relógio
    ctx.fillStyle = '#3498db';
    ctx.beginPath();
    ctx.arc(cx, cy, raio, 0, Math.PI * 2);
    ctx.fill();

    // Borda branca
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Ponteiros do relógio
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

    // Texto com valor
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('+' + tempoItem.valor + 's', cx, cy + raio + 14);
    ctx.textAlign = 'start';
}

// ========================================
// SISTEMA BRT (FAIXA EXCLUSIVA)
// ========================================

/**
 * atualizarBRT()
 * ----------------
 * Controla o ciclo do BRT:
 * - Conta até 3 minutos → ativa faixa por 20 segundos
 * - Durante os 20s, spawna ônibus de vez em quando
 * - Depois desativa e recomeça a contagem
 */
function atualizarBRT() {
    if (brtAtivo) {
        brtTempoRestante--;

        // Spawna ônibus a cada ~2-4 segundos (120-240 frames)
        if (Math.random() < 0.008) {
            // Escolhe faixa aleatória (esquerda ou direita)
            let lado = Math.random() < 0.5 ? 'esquerda' : 'direita';
            let bx = lado === 'esquerda'
                ? BRT_ESQUERDA_X + 4
                : BRT_DIREITA_X + 4;

            brtOnibus.push({
                x: bx,
                y: ALTURA_CANVAS + 10,
                largura: BRT_LARGURA - 8,
                altura: 100,    // Ônibus longo
                velocidade: 7 + Math.random() * 3,  // Rápido
                lado: lado
            });
        }

        // Acabou os 20 segundos
        if (brtTempoRestante <= 0) {
            brtAtivo = false;
            brtProximoSpawn = 3600; // Próxima em 1 minuto
            mostrarMensagem('🚌 Faixa BRT liberada!');
        }
    } else {
        // Contagem para próxima ativação
        brtProximoSpawn--;
        if (brtProximoSpawn <= 0) {
            brtAtivo = true;
            brtTempoRestante = 1200; // 20 segundos
            brtOnibus = [];
            mostrarMensagem('🚌 FAIXA BRT ATIVA! Cuidado com os ônibus!');
        }
    }
}

/**
 * desenharBRT(ctx, bus)
 * -----------------------
 * Desenha um ônibus BRT (amarelo, longo, com janelas).
 */
function desenharBRT(ctx, bus) {
    // Corpo do ônibus (amarelo)
    ctx.fillStyle = '#f0c820';
    ctx.fillRect(bus.x, bus.y, bus.largura, bus.altura);

    // Teto (mais escuro)
    ctx.fillStyle = '#d4ac0d';
    ctx.fillRect(bus.x + 2, bus.y + 2, bus.largura - 4, bus.altura - 4);

    // Janelas (azuis, em duas fileiras)
    ctx.fillStyle = '#5dade2';
    for (let j = 0; j < 5; j++) {
        // Janelas esquerda
        ctx.fillRect(bus.x + 3, bus.y + 10 + j * 18, 8, 12);
        // Janelas direita
        ctx.fillRect(bus.x + bus.largura - 11, bus.y + 10 + j * 18, 8, 12);
    }

    // Frente do ônibus (para-brisa)
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(bus.x + 4, bus.y + 2, bus.largura - 8, 8);

    // Faróis
    ctx.fillStyle = '#ffffaa';
    ctx.fillRect(bus.x + 4, bus.y, 6, 4);
    ctx.fillRect(bus.x + bus.largura - 10, bus.y, 6, 4);

    // Texto "BRT" no teto
    ctx.fillStyle = '#333';
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('BRT', bus.x + bus.largura / 2, bus.y + bus.altura / 2 + 3);
    ctx.textAlign = 'start';

    // Rodas
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(bus.x - 2, bus.y + 15, 4, 8);
    ctx.fillRect(bus.x + bus.largura - 2, bus.y + 15, 4, 8);
    ctx.fillRect(bus.x - 2, bus.y + bus.altura - 20, 4, 8);
    ctx.fillRect(bus.x + bus.largura - 2, bus.y + bus.altura - 20, 4, 8);
}

// ========================================
// LADRÃO DE PEDIDOS
// ========================================

/**
 * iniciarLadrao(lado)
 * ---------------------
 * Cria um ladrão atrás do jogador em um lado específico.
 * @param {string} lado - 'esquerda' ou 'direita'
 */
function iniciarLadrao(lado) {
    if (!jogador.carregando) return;

    // Offset lateral: esquerda fica à esquerda do jogador, direita à direita
    let offsetX = lado === 'esquerda' ? -40 : 40;

    let novoLadrao = {
        x: jogador.x + offsetX,
        y: ALTURA_CANVAS + 60,
        largura: 28,
        altura: 45,
        velocidade: 1.5,
        temPedido: false,
        alertaFrames: 120,  // 2 segundos de alerta
        fase: 'alerta',
        lado: lado
    };
    ladroes.push(novoLadrao);

    if (ladroes.length === 1) {
        mostrarMensagem('🚨 LADRÃO ATRÁS DE VOCÊ! DESVIE!');
    }
}

/**
 * atualizarLadrao(l, index)
 * ---------------------------
 * Atualiza um ladrão específico.
 * @param {Object} l - O ladrão
 * @param {number} index - Índice no array
 */
function atualizarLadrao(l, index) {
    // Se o jogador entregou o pedido, ladrão desiste
    if (!jogador.carregando && !l.temPedido) {
        l.fase = 'fugindo';
        l.velocidade = 8;
    }

    if (l.fase === 'alerta') {
        // Sobe devagar (vem de trás)
        l.y -= l.velocidade;

        // Fica no lado dele (esquerda ou direita do jogador)
        let offsetX = l.lado === 'esquerda' ? -40 : 40;
        l.x = jogador.x + offsetX;

        l.alertaFrames--;

        // Após 2 segundos, AVANÇA
        if (l.alertaFrames <= 0) {
            l.fase = 'avancando';
            l.velocidade = 3;
        }

    } else if (l.fase === 'avancando') {
        // Acelera pra cima
        l.velocidade += 0.12;
        l.y -= l.velocidade;

        // Persegue o jogador (lento no X pra dar chance de desviar)
        let diffX = jogador.x - l.x;
        l.x += diffX * 0.06;

        // Encostou? ROUBA!
        if (verificarColisao(l, jogador) && jogador.carregando) {
            jogador.carregando = false;
            l.temPedido = true;
            l.fase = 'fugindo';
            l.velocidade = 10;
            mostrarMensagem('😡 Roubaram seu pedido!');

            // Outros ladrões desistem
            for (let j = 0; j < ladroes.length; j++) {
                if (j !== index && !ladroes[j].temPedido) {
                    ladroes[j].fase = 'fugindo';
                    ladroes[j].velocidade = 10;
                }
            }

            // Novo pedido
            destinoAtual = null;
            setTimeout(function() {
                if (jogoRodando) criarPedido();
            }, 1500);
        }

        // Passou sem pegar (desviou!)
        if (l.y < jogador.y - 120) {
            l.fase = 'fugindo';
            l.velocidade = 10;
            if (!l.temPedido) {
                pontuacao += 50;
            }
        }

    } else if (l.fase === 'fugindo') {
        l.y -= l.velocidade;
        l.velocidade += 0.3;

        // Saiu da tela — remove
        if (l.y < -120) {
            ladroes.splice(index, 1);
            // Se todos sumiram e nenhum roubou
            if (ladroes.length === 0 && jogador.carregando) {
                mostrarMensagem('✅ Você escapou dos ladrões!');
            }
        }
    }
}

/**
 * desenharLadrao(ctx)
 * ---------------------
 * Desenha o ladrão como uma moto preta com piloto
 * de capuz (visual de bandido).
 */
function desenharLadrao(ctx, ladrao) {
    if (!ladrao) return;

    let cx = ladrao.x + ladrao.largura / 2;
    let ly = ladrao.y;

    // Roda traseira (embaixo, pq vem de trás)
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.ellipse(cx, ly + ladrao.altura - 4, 7, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Chassi (moto preta)
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.moveTo(cx - 5, ly + ladrao.altura - 8);
    ctx.lineTo(cx + 5, ly + ladrao.altura - 8);
    ctx.lineTo(cx + 4, ly + 16);
    ctx.lineTo(cx - 4, ly + 16);
    ctx.closePath();
    ctx.fill();

    // Piloto (capuz preto = bandido)
    ctx.fillStyle = '#111';
    ctx.fillRect(cx - 6, ly + 10, 12, 12);

    // Capuz
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(cx, ly + 7, 7, 0, Math.PI * 2);
    ctx.fill();

    // Olhos vermelhos
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(cx - 4, ly + 5, 3, 2);
    ctx.fillRect(cx + 1, ly + 5, 3, 2);

    // Guidão
    ctx.fillStyle = '#444';
    ctx.fillRect(cx - 12, ly + 14, 24, 2);

    // Roda dianteira
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.ellipse(cx, ly + 3, 6, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Mão estendida pro lado (quando avançando, tentando pegar)
    if (ladrao.fase === 'avancando') {
        ctx.fillStyle = '#8B6914';
        let lado = ladrao.x < jogador.x ? 1 : -1;
        ctx.fillRect(cx + lado * 10, ly + 12, lado * 12, 4);
    }

    // Pedido roubado nas costas
    if (ladrao.temPedido) {
        ctx.fillStyle = CORES.pedido;
        ctx.fillRect(cx - 8, ly + 22, 16, 12);
        ctx.fillStyle = '#fff';
        ctx.fillRect(cx - 1, ly + 23, 2, 10);
        ctx.fillRect(cx - 5, ly + 27, 10, 2);
    }

    // Indicador de perigo (pisca mais rápido quando avançando)
    let velocidadePisca = ladrao.fase === 'alerta' ? 400 : 150;
    if (Math.floor(Date.now() / velocidadePisca) % 2 === 0) {
        ctx.fillStyle = '#ff0000';
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('⚠', cx, ly - 8);

        // Na fase de alerta, mostra texto grande "LADRÃO!"
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

/**
 * inicializarChuva()
 * --------------------
 * Cria as gotas de chuva iniciais.
 */
function inicializarChuva() {
    gotasChuva = [];
    let quantidade = cenarioAtual.relampago ? 150 : 80; // Mais gotas na tempestade
    for (let i = 0; i < quantidade; i++) {
        gotasChuva.push({
            x: Math.random() * LARGURA_CANVAS,
            y: Math.random() * ALTURA_CANVAS,
            velocidade: 4 + Math.random() * 4,
            comprimento: 8 + Math.random() * 12
        });
    }
}

/**
 * desenharEfeitosCenario()
 * --------------------------
 * Desenha efeitos visuais por cima do jogo:
 * - Escuridão (overlay escuro)
 * - Chuva (gotas caindo)
 * - Neblina (overlay branco)
 * - Relâmpagos (flash branco ocasional)
 *
 * Chamada APÓS desenhar tudo, como camada final.
 */
function desenharEfeitosCenario() {
    let c = cenarioAtual;

    // --- ESCURIDÃO (overlay escuro sobre tudo) ---
    if (c.escuridao > 0) {
        ctx.fillStyle = 'rgba(0, 0, 10, ' + c.escuridao + ')';
        ctx.fillRect(0, 0, LARGURA_CANVAS, ALTURA_CANVAS);

        // Farol da moto (cone de luz à frente do jogador)
        if (c.escuridao >= 0.3) {
            let grad = ctx.createRadialGradient(
                jogador.x + jogador.largura / 2, jogador.y - 10,
                5,
                jogador.x + jogador.largura / 2, jogador.y - 60,
                80
            );
            grad.addColorStop(0, 'rgba(255, 255, 200, 0.25)');
            grad.addColorStop(1, 'rgba(255, 255, 200, 0)');
            ctx.fillStyle = grad;
            ctx.fillRect(jogador.x - 60, jogador.y - 140, jogador.largura + 120, 150);
        }
    }

    // --- CHUVA ---
    if (c.chuva && gotasChuva.length > 0) {
        ctx.strokeStyle = 'rgba(150, 180, 255, 0.4)';
        ctx.lineWidth = 1;
        for (let i = 0; i < gotasChuva.length; i++) {
            let gota = gotasChuva[i];
            ctx.beginPath();
            ctx.moveTo(gota.x, gota.y);
            ctx.lineTo(gota.x - 1, gota.y + gota.comprimento);
            ctx.stroke();

            // Move a gota para baixo
            gota.y += gota.velocidade;
            gota.x -= 0.5; // Leve inclinação (vento)

            // Reseta quando sai da tela
            if (gota.y > ALTURA_CANVAS) {
                gota.y = -gota.comprimento;
                gota.x = Math.random() * LARGURA_CANVAS;
            }
        }
    }

    // --- NEBLINA ---
    if (c.neblina) {
        ctx.fillStyle = 'rgba(180, 180, 200, 0.15)';
        ctx.fillRect(0, 0, LARGURA_CANVAS, ALTURA_CANVAS);

        // Faixas de neblina ondulantes
        let onda = Math.sin(Date.now() / 2000) * 20;
        ctx.fillStyle = 'rgba(200, 200, 220, 0.1)';
        ctx.fillRect(0, 150 + onda, LARGURA_CANVAS, 80);
        ctx.fillRect(0, 350 - onda, LARGURA_CANVAS, 60);
    }

    // --- RELÂMPAGO ---
    if (c.relampago) {
        frameRelampago++;
        // Relâmpago aleatório a cada ~4 segundos
        if (frameRelampago > 240 && Math.random() < 0.01) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.fillRect(0, 0, LARGURA_CANVAS, ALTURA_CANVAS);
            frameRelampago = 0;
        }
    }
}
