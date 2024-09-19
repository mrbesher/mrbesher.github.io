const themeToggle = document.getElementById("theme-toggle");
const body = document.body;

// Set initial theme based on OS preference
if (
  window.matchMedia &&
  window.matchMedia("(prefers-color-scheme: dark)").matches
) {
  body.dataset.theme = "dark";
} else {
  body.dataset.theme = "light";
}

themeToggle.addEventListener("click", () => {
  body.dataset.theme = body.dataset.theme === "dark" ? "light" : "dark";
});

// Easter Egg
const easterEgg = document.getElementById("easter-egg");
const artisticSide = document.getElementById("artistic-side");
const closeArtistic = document.getElementById("close-artistic");
const canvas = document.getElementById("artistic-canvas");
const ctx = canvas.getContext("2d");

easterEgg.addEventListener("click", () => {
  artisticSide.style.display = "flex";
  startNLPAnimation();
});

closeArtistic.addEventListener("click", () => {
  artisticSide.style.display = "none";
  cancelAnimationFrame(animationId);
});

let animationId;
const particles = [];
const words = [
  "Heuristic",
  "Cybernetics",
  "Turing Test",
  "Perceptron",
  "Symbolic AI",
  "Expert System",
  "Logic Theorem",
  "Machine Intelligence",
  "Positronic Brain",
  "Cognitive Architecture",
  "Semantic Network",
  "Frame Problem",
  "Artificial Neural Network",
  "Connectionism",
  "Natural Language Processing",
  "Knowledge Representation",
  "Machine Learning",
  "Artificial Life",
];

function createParticle(x, y, word) {
  return {
    x: x,
    y: y,
    radius: Math.random() * 3 + 1,
    word: word,
    vx: (Math.random() - 0.5) * 2,
    vy: (Math.random() - 0.5) * 2,
    hue: Math.random() * 360,
    createdAt: Date.now(),
  };
}

function startNLPAnimation() {
  particles.length = 0; // Clear existing particles
  addNewWord();

  canvas.addEventListener("click", onCanvasClick);

  function animate() {
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const currentTime = Date.now();

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = `hsl(${p.hue}, 100%, 50%)`;
      ctx.fill();

      ctx.fillStyle = "white";
      ctx.font = "12px Arial";
      ctx.fillText(p.word, p.x + p.radius + 2, p.y);

      p.x += p.vx;
      p.y += p.vy;

      if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
      if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

      // Remove particles older than 10 seconds
      if (currentTime - p.createdAt > 15000) {
        particles.splice(i, 1);
        i--;
        continue;
      }

      // Draw connections
      for (let j = i + 1; j < particles.length; j++) {
        const p2 = particles[j];
        const dx = p.x - p2.x;
        const dy = p.y - p2.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 100) {
          ctx.beginPath();
          const alpha = 1 - distance / 100;
          ctx.strokeStyle = `hsla(${(p.hue + p2.hue) / 2}, 100%, 50%, ${alpha})`;
          ctx.lineWidth = alpha * 2;
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }
      }
    }

    animationId = requestAnimationFrame(animate);
  }

  animate();
  setInterval(addNewWord, 5000);
}

function addNewWord() {
  const word = words[Math.floor(Math.random() * words.length)];
  particles.push(
    createParticle(
      Math.random() * canvas.width,
      Math.random() * canvas.height,
      word,
    ),
  );
}

function onCanvasClick(event) {
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  const newWord = words[Math.floor(Math.random() * words.length)];
  particles.push(createParticle(x, y, newWord));
}

const models = [
  "claude-3-5-sonnet-20240620",
  "qwen/qwen-2.5-72b-instruct",
  "meta-llama/llama-3.1-70b-instruct",
];
let currentModelIndex = 0;
const modelNameElement = document.getElementById("model-name");

function updateModelName() {
  modelNameElement.textContent = models[currentModelIndex];
  currentModelIndex = (currentModelIndex + 1) % models.length;
}

updateModelName();
setInterval(updateModelName, 5000);
