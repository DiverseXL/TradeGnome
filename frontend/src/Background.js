import { useEffect, useRef } from 'react';

export default function Background() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animId;

    function resize() {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    // ── Particles ──────────────────────────────────────────
    const COUNT   = 72;
    const CONNECT = 140;
    const particles = Array.from({ length: COUNT }, () => ({
      x:  Math.random() * canvas.width,
      y:  Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      r:  1 + Math.random() * 1.5,
      hue: Math.random() < 0.5 ? 195 : 258, // cyan or purple
    }));

    // ── Data streams ───────────────────────────────────────
    const COLS   = Math.floor(window.innerWidth / 22);
    const FONT   = 12;
    const CHARS  = '01アイウエオカキクケコABCDEF∑∆∫≈◊'.split('');
    const drops  = Array.from({ length: COLS }, () => Math.random() * -80);
    const speeds = Array.from({ length: COLS }, () => 0.3 + Math.random() * 0.4);

    let frame = 0;

    function draw() {
      const W = canvas.width;
      const H = canvas.height;

      // Fade trail
      ctx.fillStyle = 'rgba(1,2,10,0.18)';
      ctx.fillRect(0, 0, W, H);

      // ── Matrix rain ──────────────────────────────────────
      ctx.font = `${FONT}px "Space Mono", monospace`;
      for (let i = 0; i < drops.length; i++) {
        const char = CHARS[Math.floor(Math.random() * CHARS.length)];
        const x    = i * 22;
        const y    = drops[i] * FONT;

        // Head glow
        ctx.fillStyle = `rgba(0,212,255,${0.55 + Math.random() * 0.3})`;
        ctx.fillText(char, x, y);

        // Trail chars above
        for (let j = 1; j < 6; j++) {
          const alpha = (0.25 - j * 0.04);
          if (alpha <= 0) continue;
          const tc = CHARS[Math.floor(Math.random() * CHARS.length)];
          ctx.fillStyle = j === 1
            ? `rgba(108,59,255,${alpha})`
            : `rgba(0,212,255,${alpha * 0.5})`;
          ctx.fillText(tc, x, y - j * FONT);
        }

        drops[i] += speeds[i];
        if (drops[i] * FONT > H + FONT * 10) drops[i] = -Math.random() * 40;
      }

      // ── Particle network ─────────────────────────────────
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > W) p.vx *= -1;
        if (p.y < 0 || p.y > H) p.vy *= -1;
      }

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i], b = particles[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < CONNECT) {
            const alpha = (1 - dist / CONNECT) * 0.18;
            ctx.strokeStyle = `rgba(108,59,255,${alpha})`;
            ctx.lineWidth   = 0.6;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }

        const p = particles[i];
        const pulse = 0.5 + 0.5 * Math.sin(frame * 0.03 + i);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.hue === 195
          ? `rgba(0,212,255,${0.4 + pulse * 0.4})`
          : `rgba(108,59,255,${0.3 + pulse * 0.4})`;
        ctx.fill();
      }

      frame++;
      animId = requestAnimationFrame(draw);
    }

    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        opacity: 0.38,
      }}
    />
  );
}