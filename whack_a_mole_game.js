// Import checks
if (typeof gsap === 'undefined') {
  console.error('GSAP library not loaded.');
}
if (typeof Howl === 'undefined') {
  console.error('Howler.js library not loaded.');
}

// Constants
const GRID_SIZE = 4;
const HOLE_SIZE = 120;
const MAX_LIVES = 3;
const GAME_DURATION = 30000; // 30 seconds
const MIN_MOLE_APPEAR_TIME = 500; // 0.5 seconds
const MAX_MOLE_APPEAR_TIME = 1000; // 1 second
const SMASH_DURATION = 300; // 0.3 seconds

// Game variables
let canvas, ctx, score = 0, lives = MAX_LIVES;
let gameState = 'intro';
let holes = [];
let currentMole = null;
let gameTimer = null;
let timeLeft = GAME_DURATION / 1000;
let fireworks = [];
let smashEffects = []; // Add this line to define clickEffects

// Load images
const backgroundImg = new Image();
backgroundImg.src = 'whack_background.png';
const moleImg = new Image();
moleImg.src = 'present.png';
const fakeMoleImg = new Image();
fakeMoleImg.src = 'fake_mole.png';
const emptyHoleImg = new Image();
emptyHoleImg.src = 'empty_hole.png';
const smashImg = new Image();
smashImg.src = 'smash.png'; // Make sure to add this image to your assets

// Load sounds
let whackSound, missSound, gameOverSound, introSong;

// Initialize game
function init() {
  canvas = document.getElementById('gameCanvas');
  ctx = canvas.getContext('2d');
  
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  
  initHoles();
  
  canvas.addEventListener('mousedown', handleInput);
  canvas.addEventListener('touchstart', handleInput, { passive: false });
  
  document.getElementById('restart-button').addEventListener('click', restartGame);

  initSounds();
  updateTimer();
  showIntro();
  gameLoop();
}
function initSounds() {
  whackSound = new Howl({ src: ['whack.mp3'] });
  missSound = new Howl({ src: ['gameover.mp3'] });
  gameOverSound = new Howl({ src: ['gameover.mp3'] });
  introSong = new Howl({ src: ['intro_jingle.mp3'] });
}

function initHoles() {
  const gridWidth = GRID_SIZE * HOLE_SIZE;
  const gridHeight = GRID_SIZE * HOLE_SIZE;
  const startX = (canvas.width - gridWidth) / 2;
  const startY = (canvas.height - gridHeight) / 2;

  for (let i = 0; i < GRID_SIZE; i++) {
      for (let j = 0; j < GRID_SIZE; j++) {
          holes.push({
              x: startX + j * HOLE_SIZE,
              y: startY + i * HOLE_SIZE,
              width: HOLE_SIZE,
              height: HOLE_SIZE,
              hasMole: false,
              hasFakeMole: false
          });
      }
  }
}

function handleInput(e) {
  e.preventDefault();
  
  const point = e.type.startsWith('touch') ? e.touches[0] : e;
  const rect = canvas.getBoundingClientRect();
  const x = point.clientX - rect.left;
  const y = point.clientY - rect.top;

  // Add click effect
  addSmashEffect(x, y); // Adjust based on your smash image size();

  switch (gameState) {
      case 'intro':
          if (isStartButtonClicked(x, y)) {
              gameState = 'playing';
              startGame();
          }
          break;
      case 'playing':
          checkMoleHit(x, y);
          break;
      case 'gameOver':
      case 'congrats':
          restartGame();
          break;
  }
}

function addSmashEffect(x, y) {
  smashEffects.push({
      x: x - 50, // Adjust based on your smash image size
      y: y - 50, // Adjust based on your smash image size
      startTime: Date.now()
  });
}

function updateSmashEffects() {
  const currentTime = Date.now();
  smashEffects = smashEffects.filter(effect => {
      return currentTime - effect.startTime < SMASH_DURATION;
  });
}

function renderSmashEffects() {
  smashEffects.forEach(effect => {
      ctx.drawImage(smashImg, effect.x, effect.y, 100, 100); // Adjust size as needed
  });
}

function isStartButtonClicked(x, y) {
  const buttonX = canvas.width / 2 - 75;
  const buttonY = canvas.height / 2 + 100;
  const buttonWidth = 150;
  const buttonHeight = 50;
  
  return x >= buttonX && x <= buttonX + buttonWidth &&
         y >= buttonY && y <= buttonY + buttonHeight;
}

function startGame() {
  score = 0;
  timeLeft = GAME_DURATION / 1000;
  updateScore();
  updateTimer();
  
  // Clear any existing timer
  if (gameTimer) {
      clearInterval(gameTimer);
  }
  
  gameTimer = setInterval(() => {
      timeLeft--;
      updateTimer();
      if (timeLeft <= 0) {
          endGame();
      }
  }, 1000);
  
  showMole();
}

function showMole() {
  if (currentMole) {
      currentMole.hasMole = false;
      currentMole.hasFakeMole = false;
  }

  const availableHoles = holes.filter(hole => !hole.hasMole && !hole.hasFakeMole);
  if (availableHoles.length === 0) return;

  currentMole = availableHoles[Math.floor(Math.random() * availableHoles.length)];
  currentMole.hasMole = Math.random() > 0.3; // 80% chance of real mole
  currentMole.hasFakeMole = !currentMole.hasMole;

  const appearTime = Math.random() * (MAX_MOLE_APPEAR_TIME - MIN_MOLE_APPEAR_TIME) + MIN_MOLE_APPEAR_TIME;
  setTimeout(() => {
      if (gameState === 'playing') {
          currentMole.hasMole = false;
          currentMole.hasFakeMole = false;
          showMole();
      }
  }, appearTime);
}

function checkMoleHit(x, y) {
  const hitHole = holes.find(hole => 
      x >= hole.x && x <= hole.x + hole.width &&
      y >= hole.y && y <= hole.y + hole.height
  );

  if (hitHole && hitHole.hasMole) {
      score++;
      updateScore();
      whackSound.play();
      showCongrats();
  } else if (hitHole && hitHole.hasFakeMole) {
      missSound.play();
      timeLeft = Math.max(0, timeLeft - 2); // Subtract 2 seconds for hitting a fake mole
      updateTimer();
      if (timeLeft <= 0) {
          endGame();
      }
  }
}

function showIntro() {
  gameState = 'intro';
  if(introSong) introSong.play();
}

function updateScore() {
  document.getElementById('scoreValue').textContent = score;
  animateScore();
}

function updateTimer() {
  const timerElement = document.getElementById('timer');
  if (timerElement) {
      timerElement.textContent = `Time: ${timeLeft}s`;
  } else {
      console.error("Timer element not found in the DOM");
  }
}


function animateScore() {
  const scoreElement = document.getElementById('scoreValue');
  gsap.to(scoreElement, {
      scale: 1.5,
      duration: 0.3,
      yoyo: true,
      repeat: 1,
      ease: "power2.inOut",
      onComplete: () => {
          gsap.set(scoreElement, { scale: 1 });
      }
  });
}

function showCongrats() {
  gameState = 'congrats';
  clearInterval(gameTimer);
  createFireworks();
}

function createFireworks() {
  fireworks = [];
  const particleCount = 500;
  const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];

  for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 5 + 2;
      fireworks.push({
          x: canvas.width / 2,
          y: canvas.height / 2,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          radius: Math.random() * 3 + 1,
          color: colors[Math.floor(Math.random() * colors.length)],
          alpha: 1
      });
  }
}

function updateFireworks() {
  fireworks.forEach((particle, index) => {
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.vy += 0.05; // gravity
      particle.alpha -= 0.005; // Slower fade out

      if (particle.alpha <= 0) {
          fireworks.splice(index, 1);
      }
  });

  if (fireworks.length === 0 && gameState === 'congrats') {
      createFireworks();
  }
}

function endGame() {
  gameState = 'gameOver';
  if (gameTimer) {
      clearInterval(gameTimer);
  }
  gameOverSound.play();
}


function restartGame() {
  if (gameTimer) {
      clearInterval(gameTimer);
  }
  score = 0;
  timeLeft = GAME_DURATION / 1000;
  updateScore();
  updateTimer();
  gameState = 'playing';
  startGame();
}


function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(backgroundImg, 0, 0, canvas.width, canvas.height);
  
  holes.forEach(hole => {
      if (hole.hasMole) {
          ctx.drawImage(moleImg, hole.x, hole.y, hole.width, hole.height);
      } else if (hole.hasFakeMole) {
          ctx.drawImage(fakeMoleImg, hole.x, hole.y, hole.width, hole.height);
      } else {
          ctx.drawImage(emptyHoleImg, hole.x, hole.y, hole.width, hole.height);
      }
  });

  renderSmashEffects();

  if (gameState === 'intro') {
      renderIntro();
  } else if (gameState === 'gameOver') {
      renderGameOver();
  } else if (gameState === 'congrats') {
      renderCongrats();
      renderFireworks();
  }
}

function renderIntro() {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  ctx.fillStyle = 'white';
  ctx.font = '30px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Whack-a-Mole', canvas.width / 2, canvas.height / 2 - 50);
  ctx.fillText('Tap the moles, avoid the fakes!', canvas.width / 2, canvas.height / 2);
  ctx.fillText('Tap to start', canvas.width / 2, canvas.height / 2 + 50);

  // Draw start button
  ctx.fillStyle = '#4CAF50';
  ctx.fillRect(canvas.width / 2 - 75, canvas.height / 2 + 100, 150, 50);
  ctx.fillStyle = 'white';
  ctx.font = 'bold 24px Arial';
  ctx.fillText('Start', canvas.width / 2, canvas.height / 2 + 130);
  
}

function renderGameOver() {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  ctx.fillStyle = 'white';
  ctx.font = '30px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Game Over', canvas.width / 2, canvas.height / 2 - 25);
  ctx.fillText(`Final Score: ${score}`, canvas.width / 2, canvas.height / 2 + 25);
  ctx.fillText('Tap to restart', canvas.width / 2, canvas.height / 2 + 75);
}

function renderCongrats() {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  ctx.fillStyle = '#FFD700';
  ctx.font = 'bold 48px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Congratulations!', canvas.width / 2, canvas.height / 2 - 50);
  
  ctx.fillStyle = '#4CAF50';
  ctx.fillRect(canvas.width / 2 - 150, canvas.height / 2 + 50, 300, 60);
  
  ctx.fillStyle = 'white';
  ctx.font = 'bold 24px Arial';
  ctx.fillText('Claim your prize', canvas.width / 2, canvas.height / 2 + 85);
}

function renderFireworks() {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  fireworks.forEach(particle => {
      ctx.globalAlpha = particle.alpha;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        ctx.fillStyle = particle.color;
        ctx.fill();
    });
    ctx.restore();
}

function gameLoop() {
    update();
    render();
    requestAnimationFrame(gameLoop);
}

function update() {
    if (gameState === 'playing') {
        updateSmashEffects();
    } else if (gameState === 'congrats') {
        updateFireworks();
    }
}

// Debugging function
function debug(message) {
    console.log(`[DEBUG] ${message}`);
}

// Error handling function
function handleError(error) {
    console.error(`[ERROR] ${error.message}`);
    // You can add more error handling logic here if needed
}

// Try-catch wrapper for main game functions
function tryCatch(fn) {
    return function(...args) {
        try {
            return fn.apply(this, args);
        } catch (error) {
            handleError(error);
        }
    };
}

// Wrap main game functions with try-catch
init = tryCatch(init);
startGame = tryCatch(startGame);
showMole = tryCatch(showMole);
checkMoleHit = tryCatch(checkMoleHit);
gameLoop = tryCatch(gameLoop);

// Add resize event listener to make the game responsive
window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    initHoles();
});

// Start the game
window.onload = init;