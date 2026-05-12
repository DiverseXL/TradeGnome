import { useEffect, useRef } from 'react';

const STRAND1  = '#00d4ff';
const STRAND2  = '#6c3bff';
const BASES    = ['#00e5a0', '#ff3bac', '#ffaa00', '#00d4ff'];
const PAIRS    = 14;
const AMP      = 55;
const SPEED    = 0.018;

export default function DnaHelix({ phase }) {
  const canvasRef = useRef(null);
  const rafRef    = useRef(null);
  const tRef      = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    const CY = H / 2;

    function draw() {
      ctx.clearRect(0, 0, W, H);

      const pts1 = [], pts2 = [];
      const steps = PAIRS * 8;

      for (let i = 0; i <= steps; i++) {
        const x     = (i / steps) * W;
        const angle = (i / steps) * Math.PI * PAIRS + tRef.current;
        pts1.push({ x, y: CY + Math.sin(angle) * AMP,           z: Math.cos(angle) });
        pts2.push({ x, y: CY + Math.sin(angle + Math.PI) * AMP, z: Math.cos(angle + Math.PI) });
      }

      // Rungs
      for (let i = 0; i <= PAIRS; i++) {
        const idx   = Math.floor((i / PAIRS) * (pts1.length - 1));
        const p1    = pts1[idx];
        const p2    = pts2[idx];
        const depth = (p1.z + 1) / 2;
        const color = BASES[i % BASES.length];

        ctx.save();
        ctx.globalAlpha  = 0.25 + depth * 0.55;
        ctx.strokeStyle  = color;
        ctx.lineWidth    = 1.5 + depth * 1.5;
        ctx.setLineDash([3, 2]);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle   = color;
        ctx.globalAlpha = 0.55 + depth * 0.45;
        [p1, p2].forEach(p => {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 2.5 + depth * 1.5, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.restore();
      }

      // Strands
      [[pts1, STRAND1], [pts2, STRAND2]].forEach(([pts, color]) => {
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth   = 2.5;
        ctx.lineJoin    = 'round';
        ctx.shadowColor = color;
        ctx.shadowBlur  = 10;
        ctx.beginPath();
        pts.forEach((p, i) => {
          ctx.globalAlpha = 0.45 + (p.z + 1) / 2 * 0.55;
          i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
        });
        ctx.globalAlpha = 1;
        ctx.stroke();
        ctx.restore();
      });

      tRef.current += SPEED;
      rafRef.current = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <div style={{ textAlign: 'center', padding: '24px 0 8px' }}>
      <canvas
        ref={canvasRef}
        width={440}
        height={180}
        style={{ display: 'block', margin: '0 auto', maxWidth: '100%' }}
      />
      <p style={{
        marginTop: 14,
        fontFamily: 'Space Mono, monospace',
        fontSize: 11,
        letterSpacing: 3,
        color: '#4a6080',
        animation: 'blink 1.2s ease-in-out infinite',
      }}>
        {phase || 'SEQUENCING GENOME...'}
      </p>
    </div>
  );
}