import { useState, useEffect } from 'react';
import { FallingLeaves } from 'falling-leaves/react';

/* Upper Store Obsidian & Crimson Ambient Autumn Palette */
const CRIMSON_AUTUMN_PALETTE = [
  '#dc2626', // Crimson red
  '#b91c1c', // Deep ruby
  '#ef4444', // Bright red
  '#f59e0b', // Warm amber
  '#d97706', // Autumn gold
  '#991b1b', // Dark wine
  '#7f1d1d', // Deep burgundy
  '#e0a800', // Rich gold
  '#ea580c', // Ember orange
];

const LEAF_SHAPES = ['maple', 'oak', 'birch'];

export default function FallingLeavesDecoration() {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth <= 768;
    }
    return false;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <FallingLeaves
      fullScreen
      zIndex={999}
      count={isMobile ? 14 : 26}
      size={isMobile ? [12, 22] : [14, 28]}
      speed={isMobile ? [0.45, 0.95] : [0.55, 1.25]}
      wind={[-0.2, 0.5]}
      sway={[0.5, 1.3]}
      rotationSpeed={[-1.2, 1.2]}
      opacity={isMobile ? 0.65 : 0.72}
      shapes={LEAF_SHAPES}
      colors={CRIMSON_AUTUMN_PALETTE}
      respectReducedMotion={true}
      autoStart={true}
    />
  );
}
