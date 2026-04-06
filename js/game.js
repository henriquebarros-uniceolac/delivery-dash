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

// Variáveis para o efeito da estrada
let offsetEstrada = 0; // Para animar as faixas da estrada

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
        // O canvas interno continua 800x600, mas visualmente
        // é encolhido via CSS para caber na tela.
        // O navegador escala automaticamente (como uma imagem).
        let alturaTela = window.innerHeight;

        // Espaço disponível: tela menos HUD (~40px) e controles (~125px)
        let alturaDisponivel = alturaTela - 165;

        // Calcula qual dimensão limita (largura ou altura)
        let escalaLargura = larguraTela / LARGURA_CANVAS;
        let escalaAltura = alturaDisponivel / ALTURA_CANVAS;
        let escala = Math.min(escalaLargura, escalaAltura);

        canvas.style.width = Math.floor(LARGURA_CANVAS * escala) + 'px';
        canvas.style.height = Math.floor(ALTURA_CANVAS * escala) + 'px';
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
            gameOver();
        }
    }, 1000); // Executa a cada 1 segundo

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

    // 5. Move e desenha o jogador
    moverJogador();
    desenharJogador(ctx);

    // 6. Verifica colisões
    // Colisão com obstáculo = perde tempo
    if (verificarColisaoObstaculos()) {
        tempoRestante -= 3; // Perde 3 segundos
        document.getElementById('tempo').textContent = tempoRestante;

        // Reposiciona o jogador (como um "respawn")
        jogador.y = ALTURA_CANVAS - jogador.altura - 20;

        // Efeito visual de dano (flash vermelho)
        canvas.style.boxShadow = '0 0 30px red';
        setTimeout(function() {
            canvas.style.boxShadow = 'none';
        }, 200);

        if (tempoRestante <= 0) {
            gameOver();
            return;
        }
    }

    // Verifica entregas
    let resultadoEntrega = verificarEntregas();

    if (resultadoEntrega.coletou) {
        mostrarMensagem('📦 Pedido coletado! Vá até o destino 🏠');
    }

    if (resultadoEntrega.entregou) {
        // Entrega concluída!
        pontuacao += CONFIG_ENTREGAS.pontosEntrega;
        tempoRestante += CONFIG_TEMPO.bonusEntrega;
        totalEntregas++;

        mostrarMensagem('✅ Entrega feita! +' + CONFIG_ENTREGAS.pontosEntrega + ' pts | +' + CONFIG_TEMPO.bonusEntrega + 's');

        // Verifica se subiu de nível
        if (totalEntregas % CONFIG_DIFICULDADE.entregasPorNivel === 0) {
            nivelAtual++;
            inicializarObstaculos(nivelAtual);
            mostrarMensagem('⬆️ NÍVEL ' + nivelAtual + '! Mais obstáculos!');
        }

        // Cria novo pedido
        criarPedido();
    }

    // 7. Atualiza HUD
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

    // Grama (fundo verde de Brasília)
    ctx.fillStyle = CORES.grama;
    ctx.fillRect(0, 0, LARGURA_CANVAS, ALTURA_CANVAS);

    // Calçadas laterais (concreto claro, estilo Esplanada)
    ctx.fillStyle = '#c4b9a0';
    ctx.fillRect(0, 0, larguraCalcada, ALTURA_CANVAS);
    ctx.fillRect(LARGURA_CANVAS - larguraCalcada, 0, larguraCalcada, ALTURA_CANVAS);

    // Estrada principal (asfalto do Eixo Monumental)
    ctx.fillStyle = CORES.estrada;
    ctx.fillRect(larguraCalcada, 0, LARGURA_CANVAS - larguraCalcada * 2, ALTURA_CANVAS);

    // ========== FAIXAS DA ESTRADA ==========
    offsetEstrada += 0.5; // Velocidade suave (era 2, agora 0.5)
    if (offsetEstrada > 60) offsetEstrada = 0;

    ctx.fillStyle = CORES.faixa;
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
    // Prédios se movem junto com a estrada para dar sensação de velocidade
    // Os monumentos se repetem nas laterais da Esplanada

    // --- LADO ESQUERDO ---
    desenharMinisterio(5, -40 + offsetEstrada * 0.8);       // Ministério 1
    desenharCatedral(5, 140 + offsetEstrada * 0.8);          // Catedral
    desenharMinisterio(5, 320 + offsetEstrada * 0.8);        // Ministério 2
    desenharPalacio(5, 500 + offsetEstrada * 0.8);           // Palácio

    // --- LADO DIREITO ---
    desenharMinisterio(LARGURA_CANVAS - 125, -40 + offsetEstrada * 0.8);
    desenharCongresso(LARGURA_CANVAS - 125, 140 + offsetEstrada * 0.8);
    desenharMinisterio(LARGURA_CANVAS - 125, 320 + offsetEstrada * 0.8);
    desenharPalacio(LARGURA_CANVAS - 125, 500 + offsetEstrada * 0.8);

    // Arvorezinhas entre os prédios (jardim da Esplanada)
    ctx.fillStyle = '#3d7a2e';
    for (let y = -20 + offsetEstrada * 0.8; y < ALTURA_CANVAS + 100; y += 180) {
        // Esquerda
        ctx.beginPath();
        ctx.arc(larguraCalcada - 15, y + 90, 8, 0, Math.PI * 2);
        ctx.fill();
        // Direita
        ctx.beginPath();
        ctx.arc(LARGURA_CANVAS - larguraCalcada + 15, y + 90, 8, 0, Math.PI * 2);
        ctx.fill();
    }
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
 * gameOver()
 * ------------
 * Chamada quando o tempo acaba.
 * Para o jogo e mostra a tela de resultado.
 */
function gameOver() {
    jogoRodando = false;

    // Para o timer e a animação
    clearInterval(timerIntervalo);
    cancelAnimationFrame(animacaoFrame);

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
 * Chamada pelo botão "Tentar Novamente".
 */
function voltarInicio() {
    document.getElementById('tela-gameover').classList.add('escondido');
    document.getElementById('tela-inicio').classList.remove('escondido');
}
