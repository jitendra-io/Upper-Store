import { useEffect, useRef } from 'react';

/**
 * Generates pre-rendered high-resolution snowflake sprites on offscreen canvases
 * to ensure 60fps rendering without redrawing complex paths on every frame.
 */
function createSnowflakeSprites() {
  const SPRITE_RES = 64; // Base pixel resolution per sprite

  // 1. Dendrite Crystal (Detailed 6-armed branching snowflake)
  const dendriteCanvas = document.createElement('canvas');
  dendriteCanvas.width = dendriteCanvas.height = SPRITE_RES;
  const dCtx = dendriteCanvas.getContext('2d');
  if (dCtx) {
    const r = SPRITE_RES / 2;
    dCtx.translate(r, r);
    dCtx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
    dCtx.lineWidth = 2.2;
    dCtx.lineCap = 'round';

    for (let i = 0; i < 6; i++) {
      // Main stem
      dCtx.beginPath();
      dCtx.moveTo(0, 0);
      dCtx.lineTo(0, -r * 0.86);
      dCtx.stroke();

      // Lower primary barbs
      const b1 = -r * 0.44;
      const bLen1 = r * 0.28;
      dCtx.beginPath();
      dCtx.moveTo(0, b1);
      dCtx.lineTo(-bLen1, b1 - bLen1 * 0.55);
      dCtx.moveTo(0, b1);
      dCtx.lineTo(bLen1, b1 - bLen1 * 0.55);
      dCtx.stroke();

      // Upper secondary barbs
      const b2 = -r * 0.68;
      const bLen2 = r * 0.18;
      dCtx.beginPath();
      dCtx.moveTo(0, b2);
      dCtx.lineTo(-bLen2, b2 - bLen2 * 0.5);
      dCtx.moveTo(0, b2);
      dCtx.lineTo(bLen2, b2 - bLen2 * 0.5);
      dCtx.stroke();

      dCtx.rotate((Math.PI * 2) / 6);
    }

    // Center faceted star glow
    const centerGrad = dCtx.createRadialGradient(0, 0, 0, 0, 0, r * 0.35);
    centerGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
    centerGrad.addColorStop(0.5, 'rgba(240, 248, 255, 0.4)');
    centerGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    dCtx.fillStyle = centerGrad;
    dCtx.beginPath();
    dCtx.arc(0, 0, r * 0.35, 0, Math.PI * 2);
    dCtx.fill();
  }

  // 2. Stellar Star Crystal (Crisp 6-point star flake)
  const starCanvas = document.createElement('canvas');
  starCanvas.width = starCanvas.height = SPRITE_RES;
  const sCtx = starCanvas.getContext('2d');
  if (sCtx) {
    const r = SPRITE_RES / 2;
    sCtx.translate(r, r);
    sCtx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    sCtx.strokeStyle = 'rgba(255, 255, 255, 0.92)';
    sCtx.lineWidth = 1.8;

    sCtx.beginPath();
    for (let i = 0; i < 6; i++) {
      const outerAngle = (i * Math.PI) / 3;
      const x1 = Math.cos(outerAngle) * r * 0.85;
      const y1 = Math.sin(outerAngle) * r * 0.85;
      const innerAngle = outerAngle + Math.PI / 6;
      const x2 = Math.cos(innerAngle) * r * 0.38;
      const y2 = Math.sin(innerAngle) * r * 0.38;

      if (i === 0) sCtx.moveTo(x1, y1);
      else sCtx.lineTo(x1, y1);
      sCtx.lineTo(x2, y2);
    }
    sCtx.closePath();
    sCtx.fill();
    sCtx.stroke();

    // Internal needle spines
    sCtx.lineWidth = 1.2;
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3;
      sCtx.beginPath();
      sCtx.moveTo(0, 0);
      sCtx.lineTo(Math.cos(a) * r * 0.82, Math.sin(a) * r * 0.82);
      sCtx.stroke();
    }
  }

  // 3. Fluffy Snow Puff (Soft-edged textured winter flake)
  const puffCanvas = document.createElement('canvas');
  puffCanvas.width = puffCanvas.height = SPRITE_RES;
  const pCtx = puffCanvas.getContext('2d');
  if (pCtx) {
    const r = SPRITE_RES / 2;

    // Central soft Gaussian cloud
    const coreGrad = pCtx.createRadialGradient(r, r, 0, r, r, r * 0.85);
    coreGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
    coreGrad.addColorStop(0.35, 'rgba(240, 248, 255, 0.7)');
    coreGrad.addColorStop(0.7, 'rgba(220, 235, 255, 0.22)');
    coreGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    pCtx.fillStyle = coreGrad;
    pCtx.beginPath();
    pCtx.arc(r, r, r * 0.85, 0, Math.PI * 2);
    pCtx.fill();

    // Secondary clustered organic puffs to give uneven snowy fluff texture
    const clumps = [
      [0.22, 0.18, 0.48],
      [-0.24, 0.12, 0.44],
      [0.1, -0.25, 0.45],
      [-0.18, -0.22, 0.42],
      [0.26, -0.1, 0.4],
    ];
    for (const [ox, oy, sr] of clumps) {
      const cGrad = pCtx.createRadialGradient(
        r + ox * r,
        r + oy * r,
        0,
        r + ox * r,
        r + oy * r,
        r * sr
      );
      cGrad.addColorStop(0, 'rgba(255, 255, 255, 0.65)');
      cGrad.addColorStop(0.6, 'rgba(240, 248, 255, 0.25)');
      cGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      pCtx.fillStyle = cGrad;
      pCtx.beginPath();
      pCtx.arc(r + ox * r, r + oy * r, r * sr, 0, Math.PI * 2);
      pCtx.fill();
    }
  }

  // 4. Crimson Shimmer Crystal (Accents Upper Store obsidian & crimson core)
  const crimsonCanvas = document.createElement('canvas');
  crimsonCanvas.width = crimsonCanvas.height = SPRITE_RES;
  const cCtx = crimsonCanvas.getContext('2d');
  if (cCtx) {
    const r = SPRITE_RES / 2;
    cCtx.translate(r, r);
    cCtx.strokeStyle = 'rgba(255, 95, 95, 0.9)';
    cCtx.lineWidth = 1.8;
    cCtx.lineCap = 'round';

    for (let i = 0; i < 6; i++) {
      cCtx.beginPath();
      cCtx.moveTo(0, 0);
      cCtx.lineTo(0, -r * 0.82);
      cCtx.stroke();

      const b = -r * 0.5;
      const bLen = r * 0.22;
      cCtx.beginPath();
      cCtx.moveTo(0, b);
      cCtx.lineTo(-bLen, b - bLen * 0.5);
      cCtx.moveTo(0, b);
      cCtx.lineTo(bLen, b - bLen * 0.5);
      cCtx.stroke();

      cCtx.rotate((Math.PI * 2) / 6);
    }

    const cGrad = cCtx.createRadialGradient(0, 0, 0, 0, 0, r * 0.4);
    cGrad.addColorStop(0, 'rgba(255, 120, 120, 0.95)');
    cGrad.addColorStop(0.5, 'rgba(230, 25, 25, 0.4)');
    cGrad.addColorStop(1, 'rgba(230, 25, 25, 0)');
    cCtx.fillStyle = cGrad;
    cCtx.beginPath();
    cCtx.arc(0, 0, r * 0.4, 0, Math.PI * 2);
    cCtx.fill();
  }

  return [dendriteCanvas, starCanvas, puffCanvas, crimsonCanvas];
}

export default function FallingSnowDecoration() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Respect user's operating system setting for reduced motion
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (motionQuery.matches) {
      return;
    }

    let animationFrameId = null;
    let lastTime = performance.now();
    let isPaused = false;

    let width = window.innerWidth;
    let height = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener('resize', resize);

    // Pre-render snowflake sprites once
    const sprites = createSnowflakeSprites();

    // Particle distribution: 75 on desktop, 32 on mobile
    const isMobile = width <= 768;
    const flakeCount = isMobile ? 32 : 75;

    const createFlake = (initialY = null) => {
      // Depth layer: 0 = distant small fluff, 1 = close detailed crystal
      const depth = Math.random();

      // Flake size in CSS pixels (reduced by 50%):
      // Background: 4px - 7px (soft fluffy drifts)
      // Midground: 8px - 11px (star & dendritic flakes)
      // Foreground: 12px - 16px (fine spinning crystals)
      const size = 4 + depth * 12;

      // Vertical speed: smaller flakes float slower, larger flakes fall slightly faster
      const speed = 0.35 + depth * 0.95;

      // Horizontal sway and 3D wobble
      const sway = 0.35 + depth * 0.9;
      const opacity = 0.35 + depth * 0.6; // 0.35 to 0.95

      // Sprite assignment:
      // ~45% Fluffy puffs, ~30% Dendrite crystals, ~15% Star crystals, ~10% Crimson shimmer crystals
      const randType = Math.random();
      let spriteIndex = 2; // Default Puff
      if (randType < 0.32) {
        spriteIndex = 0; // Dendrite
      } else if (randType < 0.55) {
        spriteIndex = 1; // Star
      } else if (randType < 0.88) {
        spriteIndex = 2; // Puff
      } else {
        spriteIndex = 3; // Crimson crystal
      }

      return {
        x: Math.random() * width,
        y: initialY !== null ? initialY : Math.random() * height,
        size,
        speed,
        sway,
        opacity,
        spriteIndex,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.025,
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: 0.015 + Math.random() * 0.02,
        angle: Math.random() * Math.PI * 2,
        angleSpeed: 0.008 + Math.random() * 0.015,
      };
    };

    const flakes = Array.from({ length: flakeCount }, () => createFlake());

    let wind = 0.2;
    let windTarget = 0.2;

    const render = (currentTime) => {
      if (isPaused) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      const delta = Math.min((currentTime - lastTime) / 16.67, 2.5);
      lastTime = currentTime;

      // Gentle natural breeze shifting
      if (Math.random() < 0.008) {
        windTarget = (Math.random() - 0.35) * 0.55;
      }
      wind += (windTarget - wind) * 0.015 * delta;

      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < flakes.length; i++) {
        const f = flakes[i];

        f.angle += f.angleSpeed * delta;
        f.rotation += f.rotationSpeed * delta;
        f.wobble += f.wobbleSpeed * delta;

        f.x += (Math.sin(f.angle) * f.sway + wind) * delta;
        f.y += f.speed * delta;

        // Wrap around horizontally
        if (f.x > width + f.size) {
          f.x = -f.size;
        } else if (f.x < -f.size) {
          f.x = width + f.size;
        }

        // Reset to top when falling past viewport
        if (f.y > height + f.size) {
          flakes[i] = createFlake(-f.size);
          continue;
        }

        const sprite = sprites[f.spriteIndex];
        if (!sprite) continue;

        ctx.save();
        ctx.translate(f.x, f.y);
        ctx.rotate(f.rotation);

        // 3D tumbling flutter simulation
        const flutterScaleX = 0.55 + 0.45 * Math.cos(f.wobble);
        ctx.scale(flutterScaleX, 1);

        ctx.globalAlpha = f.opacity;
        ctx.drawImage(sprite, -f.size / 2, -f.size / 2, f.size, f.size);
        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    const handleVisibilityChange = () => {
      isPaused = document.hidden;
      if (!isPaused) {
        lastTime = performance.now();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 999,
      }}
    />
  );
}
