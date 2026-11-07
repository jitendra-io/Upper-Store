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

    let mouse = { x: width * 0.5, y: height * 0.35, targetX: width * 0.5, targetY: height * 0.35 };
    let scrollY = window.scrollY || 0;
    let isPaused = false;
    let animationFrameId;

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    const handleMouseMove = (e) => {
      mouse.targetX = e.clientX;
      mouse.targetY = e.clientY;
    };

    const handleScroll = () => {
      scrollY = window.scrollY || 0;
    };

    const handleModalToggle = (e) => {
      isPaused = Boolean(e.detail);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('modalToggle', handleModalToggle);

    // Render loop: atmospheric crimson volumetric glows
    const render = () => {
      if (!isPaused) {
        ctx.clearRect(0, 0, width, height);

        // Smooth cursor lerp
        mouse.x += (mouse.targetX - mouse.x) * 0.06;
        mouse.y += (mouse.targetY - mouse.y) * 0.06;

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

        // Subtle interactive mouse ambient spotlight
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
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('scroll', handleScroll);
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
