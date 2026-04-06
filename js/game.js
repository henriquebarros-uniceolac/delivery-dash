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
        tempoRestante--;
        document.getElementById('tempo').textContent = tempoRestante;

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

    // 7. Verifica colisões com obstáculos
    // Só toma dano se NÃO estiver invencível
    if (framesInvencivel === 0 && verificarColisaoObstaculos()) {
        vidas--;

        if (vidas <= 0) {
            gameOver('vidas');
            return;
        }

        // Ativa invencibilidade temporária
        framesInvencivel = CONFIG_VIDAS.invencivel;

        // Reposiciona o jogador (respawn)
        jogador.y = ALTURA_CANVAS - jogador.altura - 100;

        // Efeito visual de dano (flash vermelho)
        canvas.style.boxShadow = '0 0 30px red';
        setTimeout(function() {
            canvas.style.boxShadow = 'none';
        }, 300);

        mostrarMensagem('💔 -1 vida! Restam ' + vidas);

        // Agenda aparição de coração de recuperação
        agendarCoracao();
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

    // 9. Verifica entregas
    let resultadoEntrega = verificarEntregas();

    if (resultadoEntrega.coletou) {
        mostrarMensagem('📦 Pedido coletado! Vá até o destino 🏠');
    }

    if (resultadoEntrega.entregou) {
        // Entrega concluída!
        pontuacao += CONFIG_ENTREGAS.pontosEntrega;
        tempoRestante += CONFIG_TEMPO.bonusEntrega;
        totalEntregas++;

        mostrarMensagem('✅ +' + CONFIG_ENTREGAS.pontosEntrega + ' pts | +' + CONFIG_TEMPO.bonusEntrega + 's');

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
    }

    // 10. Efeitos visuais do cenário
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
