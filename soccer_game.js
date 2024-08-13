// Import checks
if (typeof gsap === 'undefined') {
  console.error('GSAP library not loaded.');
}
if (typeof Howl === 'undefined') {
  console.error('Howler.js library not loaded.');
}

// Constants
const BALL_RADIUS = 35;
const GOAL_WIDTH = 600;
const GOAL_HEIGHT = 400;
const GOALIE_WIDTH = 200;
const GOALIE_HEIGHT = 200;
const INITIAL_GOALIE_SPEED = 5;
const MAX_LIVES = 5;
const POWER_FACTOR = 0.3;
const BALL_SPEED = 10;
const KEEPER_ANIMATION_FRAMES = 20;
const KEEPER_SAVE_TOLERANCE = 10;
const goalieYOffset = -70;

// Game variables
let canvas, ctx, ball, goal, goalie, score = 0;
let isDragging = false;
let dragStartX, dragStartY, dragEndX, dragEndY;
let lives = MAX_LIVES;
let gameState = 'intro';
let GOALIE_SPEED = INITIAL_GOALIE_SPEED;
let goalieDirection = 1;
let scoreAnimation = null;
let congratsAnimation = null;
let keeperAnimationFrame = 0;
let isKeeperAnimating = false;
let fireworks = [];

// Load images
const backgroundImg = new Image();
backgroundImg.src = 'soccer_background_2.png';
const ballImg = new Image();
ballImg.src = 'soccer_ball.png';
const goalImg = new Image();
goalImg.src = 'soccer_goal.png';
const goalieImg = new Image();
goalieImg.src = 'soccer_goalie_2.png';

// Load sounds
let kickSound, scoreSound, gameOverSound, introSong;

// Initialize game
function init() {
  canvas = document.getElementById('gameCanvas');
  ctx = canvas.getContext('2d');
  
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  
  resetBall();
  
  goal = {
    x: canvas.width / 2 - GOAL_WIDTH / 2,
    y: 10,
    width: GOAL_WIDTH,
    height: GOAL_HEIGHT
  };

  goalie = {
    x: canvas.width / 2 - GOALIE_WIDTH / 2,
    y: goal.y + goal.height - GOALIE_HEIGHT + goalieYOffset,
    width: GOALIE_WIDTH,
    height: GOALIE_HEIGHT
  };
  
  canvas.addEventListener('mousedown', handleInput);
  canvas.addEventListener('touchstart', handleInput, { passive: false });
  
  document.getElementById('restart-button').addEventListener('click', restartGame);

  initSounds();
  updateLives();
  showIntro();
  gameLoop();
}

function initSounds() {
  kickSound = new Howl({ src: ['kick.mp3'] });
  scoreSound = new Howl({ src: ['score.mp3'] });
  gameOverSound = new Howl({ src: ['gameover.mp3'] });
  introSong = new Howl({ src: ['intro_jingle.mp3'] });
}

function handleInput(e) {
  e.preventDefault();
  
  const point = e.type.startsWith('touch') ? e.touches[0] : e;
  const rect = canvas.getBoundingClientRect();
  const x = point.clientX - rect.left;
  const y = point.clientY - rect.top;

  console.log('Input detected:', gameState);

  switch (gameState) {
    case 'intro':
      console.log('Transitioning from intro to playing state');
      gameState = 'playing';
      break;
    case 'playing':
      startDrag(x, y);
      break;
    case 'gameOver':
    case 'congrats':
      restartGame();
      break;
  }
}

function update() {
  if (gameState !== 'playing') return;

  if (isKeeperAnimating) {
    keeperAnimationFrame++;
    if (keeperAnimationFrame >= KEEPER_ANIMATION_FRAMES) {
      isKeeperAnimating = false;
      keeperAnimationFrame = 0;
      resetBall();
    }
    return;
  }

  goalie.x += GOALIE_SPEED * goalieDirection;
  if (goalie.x <= goal.x || goalie.x + GOALIE_WIDTH >= goal.x + GOAL_WIDTH) {
    goalieDirection *= -1;
  }
  
  if (!isDragging && ball.isLaunched) {
    ball.x += ball.velocityX;
    ball.y += ball.velocityY;
  }
  
  if (ball.y < 0 || ball.y > canvas.height || ball.x < 0 || ball.x > canvas.width) {
    lives--;
    updateLives();
    if (lives > 0) {
      resetBall();
    } else {
      gameOver();
    }
  }
  
  if (ballInGoal()) {
    if (!ballHitGoalie()) {
      score++;
      updateScore();
      showCongrats();
      if (scoreSound) scoreSound.play();
    } else {
      if (kickSound) kickSound.play();
      startKeeperAnimation();
    }
    lives--;
    updateLives();
    if (lives <= 0) {
      gameOver();
    }
  }
}

function ballInGoal() {
  return (
    ball.x > goal.x &&
    ball.x < goal.x + GOAL_WIDTH &&
    ball.y > goal.y &&
    ball.y < goal.y + GOAL_HEIGHT/2
  );
}

function ballHitGoalie() {
  return (
    ball.x > goalie.x - KEEPER_SAVE_TOLERANCE &&
    ball.x < goalie.x + GOALIE_WIDTH + KEEPER_SAVE_TOLERANCE &&
    ball.y > goalie.y &&
    ball.y < goalie.y + GOALIE_HEIGHT
  );
}

function startKeeperAnimation() {
  isKeeperAnimating = true;
  keeperAnimationFrame = 0;
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(backgroundImg, 0, 0, canvas.width, canvas.height);
  
  // Draw goal
  ctx.drawImage(goalImg, goal.x, goal.y, goal.width, goal.height);
  
  // Draw goalie
  if (isKeeperAnimating) {
    // Simple animation: make the goalie larger when catching the ball
    const scale = 1 + (keeperAnimationFrame / KEEPER_ANIMATION_FRAMES) * 0.2;
    ctx.drawImage(
      goalieImg, 
      goalie.x - (goalie.width * scale - goalie.width) / 2, 
      goalie.y - (goalie.height * scale - goalie.height) / 2, 
      goalie.width * scale, 
      goalie.height * scale
    );
  } else {
    ctx.drawImage(goalieImg, goalie.x, goalie.y, goalie.width, goalie.height);
  }
  
  // Draw ball
  ctx.drawImage(ballImg, ball.x - ball.radius, ball.y - ball.radius, ball.radius * 2, ball.radius * 2);

  if (gameState === 'intro') {
    renderIntro();
  } else if (gameState === 'playing') {
    if (isDragging) {
      ctx.beginPath();
      ctx.moveTo(dragStartX, dragStartY);
      ctx.lineTo(dragEndX, dragEndY);
      
      const gradient = ctx.createLinearGradient(dragStartX, dragStartY, dragEndX, dragEndY);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 5;
      ctx.stroke();
    }
  } else if (gameState === 'gameOver') {
    renderGameOver();
  } else if (gameState === 'congrats') {
    renderCongrats();
    renderFireworks();
  }
}

function startDrag(x, y) {
  if (Math.sqrt((x - ball.x) ** 2 + (y - ball.y) ** 2) < ball.radius) {
    isDragging = true;
    dragStartX = dragEndX = x;
    dragStartY = dragEndY = y;
    
    // Add event listeners for drag and end drag
    canvas.addEventListener('mousemove', drag);
    canvas.addEventListener('mouseup', endDrag);
    canvas.addEventListener('touchmove', drag, { passive: false });
    canvas.addEventListener('touchend', endDrag);
  }
}

function drag(e) {
  e.preventDefault();
  const point = e.type.startsWith('touch') ? e.touches[0] : e;
  const rect = canvas.getBoundingClientRect();
  dragEndX = point.clientX - rect.left;
  dragEndY = point.clientY - rect.top;
}

function endDrag() {
  if (!isDragging) return;
  isDragging = false;
  
  const dx = dragStartX - dragEndX;
  const dy = dragStartY - dragEndY;
  
  // Calculate the angle of the shot
  const angle = Math.atan2(dy, dx);
  
  // Calculate the drag distance
  const dragDistance = Math.sqrt(dx * dx + dy * dy);
  
  // Set the ball speed based on drag distance
  const speed = Math.min(dragDistance * POWER_FACTOR, BALL_SPEED * 2);
  
  ball.velocityX = Math.cos(angle) * speed;
  ball.velocityY = Math.sin(angle) * speed;
  ball.isLaunched = true;
  
  if (kickSound) kickSound.play();
  
  canvas.removeEventListener('mousemove', drag);
  canvas.removeEventListener('mouseup', endDrag);
  canvas.removeEventListener('touchmove', drag);
  canvas.removeEventListener('touchend', endDrag);
}

function resetBall() {
  ball = {
    x: canvas.width / 2,
    y: canvas.height - BALL_RADIUS - 100,
    radius: BALL_RADIUS,
    velocityX: 0,
    velocityY: 0,
    isLaunched: false
  };
  isDragging = false;
}

function updateScore() {
  document.getElementById('scoreValue').textContent = score;
  animateScore();
}

function updateLives() {
  document.getElementById('lives').textContent = '⚽'.repeat(lives);
}

function animateScore() {
  if (scoreAnimation) scoreAnimation.kill();
  
  const scoreElement = document.getElementById('scoreValue');
  scoreAnimation = gsap.to(scoreElement, {
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

function createFireworks() {
  console.log('createFireworks() called');
  fireworks = []; // Clear existing fireworks
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
    createFireworks(); // Regenerate fireworks if they're all gone
  }
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

function showCongrats() {
  console.log('showCongrats() called');
  gameState = 'congrats';
  animateCongrats();
  createFireworks();
}

function animateCongrats() {
  if (congratsAnimation) congratsAnimation.kill();
  
  const congratsElement = document.createElement('div');
  congratsElement.textContent = 'Goal!';
  congratsElement.style.position = 'absolute';
  congratsElement.style.top = '50%';
  congratsElement.style.left = '50%';
  congratsElement.style.transform = 'translate(-50%, -50%)';
  congratsElement.style.fontSize = '48px';
  congratsElement.style.fontWeight = 'bold';
  congratsElement.style.color = '#FFD700';
  congratsElement.style.textShadow = '2px 2px 4px rgba(0,0,0,0.5)';
  document.body.appendChild(congratsElement);

  congratsAnimation = gsap.fromTo(congratsElement, 
    { scale: 0, opacity: 0 },
    { scale: 1, opacity: 1, duration: 1, ease: "elastic.out(1, 0.3)" }
  );
}

function gameLoop() {
  update();
  if (gameState === 'congrats') {
    updateFireworks();
  }
  render();
  requestAnimationFrame(gameLoop);
}

function gameOver() {
  gameState = 'gameOver';
  if (gameOverSound) gameOverSound.play();
}

function restartGame() {
  score = 0;
  lives = MAX_LIVES;
  GOALIE_SPEED = INITIAL_GOALIE_SPEED;
  updateScore();
  updateLives();
  resetBall();
  gameState = 'playing';
}

function showIntro() {
  gameState = 'intro';
  if (introSong) introSongs.play();
}

function renderIntro() {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  ctx.fillStyle = 'white';
  ctx.font = '30px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Drag the ball to shoot!', canvas.width / 2, canvas.height / 2);
  ctx.fillText('Tap to start', canvas.width / 2, canvas.height / 2 + 50);
  
  // Add a visual indicator for tapping
  const indicatorRadius = 20;
  const indicatorY = canvas.height / 2 + 100;
  
  ctx.beginPath();
  ctx.arc(canvas.width / 2, indicatorY, indicatorRadius, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.fill();
  
  ctx.beginPath();
  ctx.arc(canvas.width / 2, indicatorY, indicatorRadius * 0.8, 0, Math.PI * 2);
  ctx.fillStyle = 'white';
  ctx.fill();
}

function renderGameOver() {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  ctx.fillStyle = 'white';
  ctx.font = '30px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Game Over', canvas.width / 2, canvas.height / 2);
  ctx.fillText('Tap to restart', canvas.width / 2, canvas.height / 2 + 50);
}

function renderCongrats() {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Add a banner for "Claim your prize"
  ctx.fillStyle = '#4CAF50';
  ctx.fillRect(canvas.width / 2 - 150, canvas.height / 2 + 50, 300, 60);
  
  ctx.fillStyle = 'white';
  ctx.font = 'bold 24px Arial';
  ctx.fillText('Claim your prize', canvas.width / 2, canvas.height / 2 + 85);
}

window.onload = init;

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
update = tryCatch(update);
render = tryCatch(render);
gameLoop = tryCatch(gameLoop);

// Add resize event listener to make the game responsive
window.addEventListener('resize', () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  resetBall();
});

// Add touch events for mobile devices
canvas.addEventListener('touchmove', (e) => {
  e.preventDefault();
  const touch = e.touches[0];
  const mouseEvent = new MouseEvent('mousemove', {
    clientX: touch.clientX,
    clientY: touch.clientY
  });
  canvas.dispatchEvent(mouseEvent);
}, { passive: false });

canvas.addEventListener('touchend', () => {
  const mouseEvent = new MouseEvent('mouseup');
  canvas.dispatchEvent(mouseEvent);
});