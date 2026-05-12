import { useState, useEffect, useRef, useCallback } from 'react';
import './Intro.css';

const LINES = [
  { text: 'Microsoft (R) 32-bit C/C++ Optimizing Compiler Version 12.00.8168', delay: 0,    color: 'white' },
  { text: 'Copyright (C) Microsoft Corp 1984-1998. All rights reserved.',       delay: 60,   color: 'white' },
  { text: '',                                                                    delay: 120,  color: '' },
  { text: 'cl /O2 /W3 /D_WINDOWS genome.cpp goldrush.cpp agent.cpp',           delay: 200,  color: 'white' },
  { text: '',                                                                    delay: 320,  color: '' },
  { text: 'genome.cpp',                                                          delay: 420,  color: 'white' },
  { text: 'goldrush.cpp',                                                        delay: 680,  color: 'white' },
  { text: 'agent.cpp',                                                           delay: 940,  color: 'white' },
  { text: '',                                                                    delay: 1060, color: '' },
  { text: 'Linking...',                                                          delay: 1160, color: 'white' },
  { text: '',                                                                    delay: 1400, color: '' },
  { text: 'genome.cpp(42) : warning C4244: conversion from double to float',    delay: 1500, color: 'yellow' },
  { text: 'goldrush.cpp(118) : warning C4101: unreferenced local variable',     delay: 1620, color: 'yellow' },
  { text: 'agent.cpp(77) : warning C4018: signed/unsigned mismatch',            delay: 1740, color: 'yellow' },
  { text: '',                                                                    delay: 1860, color: '' },
  { text: '        0 error(s)    3 warning(s)',                                 delay: 1980, color: 'white' },
  { text: '',                                                                    delay: 2100, color: '' },
  { text: '------------------------------------------------------------',        delay: 2200, color: 'green' },
  { text: '',                                                                    delay: 2280, color: '' },
  { text: 'TRADGENOME v0.1.0  --  BUILD SUCCESSFUL',                           delay: 2380, color: 'green' },
  { text: '',                                                                    delay: 2460, color: '' },
  { text: '  [AI Engine]      gpt-4o                     LOADED',               delay: 2560, color: 'green' },
  { text: '  [Data Layer]     GoldRush API v1             CONNECTED',           delay: 2680, color: 'green' },
  { text: '  [Agent Monitor]  WebSocket :3002             LISTENING',           delay: 2800, color: 'green' },
  { text: '  [Chain Support]  ETH / MATIC / BSC / SOL    READY',               delay: 2920, color: 'green' },
  { text: '',                                                                    delay: 3040, color: '' },
  { text: '------------------------------------------------------------',        delay: 3100, color: 'green' },
  { text: '',                                                                    delay: 3180, color: '' },
  { text: 'Press any key to launch...',                                          delay: 3280, color: 'blink'  },
];

// Grid config
const COLS = 9;
const ROWS = 14;
const RADIUS = 140; // px — how far cursor affects squares

function SquareGrid() {
  const gridRef   = useRef(null);
  const mouseRef  = useRef({ x: -999, y: -999 });
  const rafRef    = useRef(null);
  const squareEls = useRef([]);

  const animate = useCallback(() => {
    const grid = gridRef.current;
    if (!grid) return;

    const rect = grid.getBoundingClientRect();
    const mx = mouseRef.current.x;
    const my = mouseRef.current.y;

    squareEls.current.forEach((el, idx) => {
      if (!el) return;
      const col = idx % COLS;
      const row = Math.floor(idx / COLS);

      // Centre of this square relative to viewport
      const cellW = rect.width  / COLS;
      const cellH = rect.height / ROWS;
      const cx = rect.left + col * cellW + cellW / 2;
      const cy = rect.top  + row * cellH + cellH / 2;

      const dist   = Math.sqrt((mx - cx) ** 2 + (my - cy) ** 2);
      const factor = Math.max(0, 1 - dist / RADIUS); // 0–1

      // Scale up close squares
      const scale   = 1 + factor * 0.55;
      // Green glow intensity
      const glow    = Math.round(factor * 180);
      const opacity = 0.08 + factor * 0.7;
      const border  = factor > 0.15 ? `rgba(0,${130 + glow},0,${0.4 + factor * 0.6})` : 'rgba(0,80,0,0.25)';

      el.style.transform      = `scale(${scale})`;
      el.style.opacity        = opacity;
      el.style.borderColor    = border;
      el.style.boxShadow      = factor > 0.1
        ? `0 0 ${Math.round(factor * 18)}px rgba(0,${100 + glow},0,${factor * 0.6}), inset 0 0 ${Math.round(factor * 10)}px rgba(0,${80+glow},0,${factor * 0.2})`
        : 'none';
      el.style.backgroundColor = `rgba(0,${Math.round(factor * 60)},0,${factor * 0.12})`;
    });

    rafRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    const onMove = (e) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('mousemove', onMove);
    rafRef.current = requestAnimationFrame(animate);
    return () => {
      window.removeEventListener('mousemove', onMove);
      cancelAnimationFrame(rafRef.current);
    };
  }, [animate]);

  const squares = Array.from({ length: COLS * ROWS });

  return (
    <div className="intro-squares" ref={gridRef}>
      {squares.map((_, i) => (
        <div
          key={i}
          className="intro-sq"
          ref={(el) => (squareEls.current[i] = el)}
        />
      ))}
      <div className="intro-squares-label">HOVER TO INTERACT</div>
    </div>
  );
}

export default function Intro({ onDone }) {
  const [visible, setVisible] = useState([]);
  const [exiting, setExiting] = useState(false);
  const [cursor,  setCursor]  = useState(true);
  const doneRef   = useRef(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    const timers = LINES.map((line, i) =>
      setTimeout(() => setVisible(v => [...v, { ...line, i }]), line.delay)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [visible]);

  useEffect(() => {
    const id = setInterval(() => setCursor(c => !c), 530);
    return () => clearInterval(id);
  }, []);

  function launch() {
    if (doneRef.current) return;
    doneRef.current = true;
    setExiting(true);
    setTimeout(onDone, 700);
  }

  useEffect(() => {
  window.addEventListener('keydown', launch);
  return () => window.removeEventListener('keydown', launch);
}, [launch]);

  return (
    <div className={`intro ${exiting ? 'intro--exit' : ''}`} onClick={launch}>
      <div className="intro-scanlines" />
      <div className="intro-vignette" />

      <div className="intro-layout">
        {/* Left — compiler output */}
        <div className="intro-terminal">
          <div className="intro-lines">
            {visible.map((line) => (
              <div key={line.i} className={`intro-line intro-line--${line.color || 'white'}`}>
                {line.text || '\u00A0'}
              </div>
            ))}
            <div ref={bottomRef} className="intro-line intro-line--white">
              {cursor ? '█' : '\u00A0'}
            </div>
          </div>
        </div>

        {/* Right — interactive square grid */}
        <SquareGrid />
      </div>
    </div>
  );
}