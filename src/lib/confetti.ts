'use client';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  rotation: number;
  rotationSpeed: number;
  life: number;
  maxLife: number;
}

const COLORS = ['#ff6b35', '#ffbb33', '#44bb44', '#4488ff', '#ff44aa', '#aa44ff', '#44cccc', '#ff4444'];

export function launchConfetti(canvas: HTMLCanvasElement, duration = 3000) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const particles: Particle[] = [];
  const startTime = Date.now();

  // Create particles
  for (let i = 0; i < 150; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: -20 - Math.random() * 100,
      vx: (Math.random() - 0.5) * 8,
      vy: Math.random() * 3 + 2,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      size: Math.random() * 8 + 4,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.2,
      life: 0,
      maxLife: duration + Math.random() * 1000,
    });
  }

  function animate() {
    const elapsed = Date.now() - startTime;
    if (elapsed > duration + 2000) {
      ctx!.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    ctx!.clearRect(0, 0, canvas.width, canvas.height);

    for (const p of particles) {
      p.life += 16;
      if (p.life > p.maxLife) continue;

      p.x += p.vx;
      p.vy += 0.05; // gravity
      p.y += p.vy;
      p.vx *= 0.99;
      p.rotation += p.rotationSpeed;

      const alpha = Math.max(0, 1 - p.life / p.maxLife);
      ctx!.save();
      ctx!.translate(p.x, p.y);
      ctx!.rotate(p.rotation);
      ctx!.globalAlpha = alpha;
      ctx!.fillStyle = p.color;
      ctx!.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      ctx!.restore();
    }

    requestAnimationFrame(animate);
  }

  animate();
}

export function launchExplosionParticles(canvas: HTMLCanvasElement, centerX: number, centerY: number) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const particles: Particle[] = [];
  const FIRE_COLORS = ['#ff4444', '#ff6600', '#ffaa00', '#ffdd00', '#ff2200'];

  for (let i = 0; i < 80; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 12 + 3;
    particles.push({
      x: centerX,
      y: centerY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      color: FIRE_COLORS[Math.floor(Math.random() * FIRE_COLORS.length)],
      size: Math.random() * 10 + 3,
      rotation: 0,
      rotationSpeed: 0,
      life: 0,
      maxLife: 800 + Math.random() * 400,
    });
  }

  function animate() {
    const allDead = particles.every(p => p.life > p.maxLife);
    if (allDead) {
      ctx!.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    ctx!.clearRect(0, 0, canvas.width, canvas.height);

    for (const p of particles) {
      p.life += 16;
      if (p.life > p.maxLife) continue;

      p.x += p.vx;
      p.vy += 0.15;
      p.y += p.vy;
      p.vx *= 0.97;

      const alpha = Math.max(0, 1 - p.life / p.maxLife);
      const currentSize = p.size * (1 - p.life / p.maxLife);

      ctx!.save();
      ctx!.globalAlpha = alpha;
      ctx!.fillStyle = p.color;
      ctx!.beginPath();
      ctx!.arc(p.x, p.y, currentSize, 0, Math.PI * 2);
      ctx!.fill();
      ctx!.restore();
    }

    requestAnimationFrame(animate);
  }

  animate();
}
