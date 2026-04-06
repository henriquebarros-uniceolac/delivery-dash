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
    // Grama (fundo)
    ctx.fillStyle = CORES.grama;
    ctx.fillRect(0, 0, LARGURA_CANVAS, ALTURA_CANVAS);

    // Calçadas laterais
    ctx.fillStyle = CORES.calcada;
    ctx.fillRect(0, 0, 60, ALTURA_CANVAS);
    ctx.fillRect(LARGURA_CANVAS - 60, 0, 60, ALTURA_CANVAS);

    // Estrada principal (asfalto)
    ctx.fillStyle = CORES.estrada;
    ctx.fillRect(60, 0, LARGURA_CANVAS - 120, ALTURA_CANVAS);

    // Faixas brancas (animadas para dar sensação de movimento)
    offsetEstrada += 2; // Velocidade da animação
    if (offsetEstrada > 60) offsetEstrada = 0;

    ctx.fillStyle = CORES.faixa;
    // Faixa central tracejada
    for (let y = -60 + offsetEstrada; y < ALTURA_CANVAS; y += 60) {
        ctx.fillRect(LARGURA_CANVAS / 2 - 2, y, 4, 30);
    }

    // Faixas laterais contínuas
    ctx.fillRect(62, 0, 3, ALTURA_CANVAS);
    ctx.fillRect(LARGURA_CANVAS - 65, 0, 3, ALTURA_CANVAS);

    // Faixas de divisão das pistas
    for (let y = -60 + offsetEstrada; y < ALTURA_CANVAS; y += 60) {
        ctx.fillRect(LARGURA_CANVAS / 4 + 30, y, 4, 30);
        ctx.fillRect(LARGURA_CANVAS * 3 / 4 - 30, y, 4, 30);
    }

    // Detalhes na calçada (postes/árvores)
    ctx.fillStyle = '#4a7a2e';
    for (let y = 50; y < ALTURA_CANVAS; y += 150) {
        // Árvores na esquerda
        ctx.beginPath();
        ctx.arc(30, y, 15, 0, Math.PI * 2);
        ctx.fill();
        // Árvores na direita
        ctx.beginPath();
        ctx.arc(LARGURA_CANVAS - 30, y, 15, 0, Math.PI * 2);
        ctx.fill();
    }
    // Troncos das árvores
    ctx.fillStyle = '#5c3a1e';
    for (let y = 50; y < ALTURA_CANVAS; y += 150) {
        ctx.fillRect(28, y + 12, 4, 15);
        ctx.fillRect(LARGURA_CANVAS - 32, y + 12, 4, 15);
    }
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
