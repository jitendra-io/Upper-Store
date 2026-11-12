import { useEffect, useRef } from 'react';
import './BackgroundAnimation.css';

const BackgroundAnimation = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const isMobile = window.innerWidth <= 768 || 'ontouchstart' in window;
    let mouse = { x: width * 0.5, y: height * 0.35, targetX: width * 0.5, targetY: height * 0.35 };
    let scrollY = window.scrollY || 0;
    let isPaused = false;
    let animationFrameId = null;
    let needsRender = true;

    const drawFrame = () => {
      ctx.clearRect(0, 0, width, height);

      // Ambient Hero Crimson Glow (Left focal anchor)
      const heroLeftGrad = ctx.createRadialGradient(
        width * 0.18,
        height * 0.22 - scrollY * 0.15,
        10,
        width * 0.18,
        height * 0.22 - scrollY * 0.15,
        Math.min(width, height) * 0.45
      );
      heroLeftGrad.addColorStop(0, 'rgba(230, 25, 25, 0.11)');
      heroLeftGrad.addColorStop(0.5, 'rgba(160, 15, 15, 0.04)');
      heroLeftGrad.addColorStop(1, 'rgba(7, 7, 9, 0)');
      ctx.fillStyle = heroLeftGrad;
      ctx.fillRect(0, 0, width, height);

      // Ambient 3D Crystal Core Crimson Glow (Right focal anchor)
      const coreRightGrad = ctx.createRadialGradient(
        width * 0.78,
        height * 0.32 - scrollY * 0.18,
        10,
        width * 0.78,
        height * 0.32 - scrollY * 0.18,
        Math.min(width, height) * 0.5
      );
      coreRightGrad.addColorStop(0, 'rgba(255, 42, 42, 0.13)');
      coreRightGrad.addColorStop(0.5, 'rgba(180, 10, 10, 0.05)');
      coreRightGrad.addColorStop(1, 'rgba(7, 7, 9, 0)');
      ctx.fillStyle = coreRightGrad;
      ctx.fillRect(0, 0, width, height);

      // Subtle interactive mouse ambient spotlight on desktop only
      if (!isMobile) {
        const mouseGrad = ctx.createRadialGradient(
          mouse.x,
          mouse.y,
          0,
          mouse.x,
          mouse.y,
          260
        );
        mouseGrad.addColorStop(0, 'rgba(230, 25, 25, 0.06)');
        mouseGrad.addColorStop(1, 'rgba(7, 7, 9, 0)');
        ctx.fillStyle = mouseGrad;
        ctx.fillRect(0, 0, width, height);
      }
    };

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      needsRender = true;
      if (isMobile) {
        drawFrame();
      }
    };

    const handleMouseMove = (e) => {
      mouse.targetX = e.clientX;
      mouse.targetY = e.clientY;
      needsRender = true;
    };

    const handleScroll = () => {
      scrollY = window.scrollY || 0;
      needsRender = true;
    };

    const handleModalToggle = (e) => {
      isPaused = Boolean(e.detail);
    };

    window.addEventListener('resize', handleResize);
    if (!isMobile) {
      window.addEventListener('mousemove', handleMouseMove, { passive: true });
      window.addEventListener('scroll', handleScroll, { passive: true });
    }
    window.addEventListener('modalToggle', handleModalToggle);

    // Initial render
    drawFrame();

    // Render loop: on mobile, initial frame is drawn statically and does not run continuous RAF loops.
    // On desktop, runs RAF to smoothly track cursor.
    const render = () => {
      if (!isPaused && needsRender) {
        const dx = Math.abs(mouse.targetX - mouse.x);
        const dy = Math.abs(mouse.targetY - mouse.y);
        if (dx > 0.5 || dy > 0.5) {
          mouse.x += (mouse.targetX - mouse.x) * 0.06;
          mouse.y += (mouse.targetY - mouse.y) * 0.06;
        } else {
          needsRender = false;
        }
        drawFrame();
      }
      if (!isMobile) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    if (!isMobile) {
      render();
    }

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      window.removeEventListener('resize', handleResize);
      if (!isMobile) {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('scroll', handleScroll);
      }
      window.removeEventListener('modalToggle', handleModalToggle);
    };
  }, []);

  return (
    <div className="bg-animation-wrapper">
      <div className="bg-grid-overlay" />
      <canvas ref={canvasRef} className="bg-canvas" />
    </div>
  );
};

export default BackgroundAnimation;
