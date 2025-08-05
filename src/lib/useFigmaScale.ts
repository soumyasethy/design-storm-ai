import { useEffect, useState } from 'react';

export function useFigmaScale(designWidth: number, maxScale = 1.2) {
  const [scale, setScale] = useState(() => {
    // Handle SSR by checking if window exists
    if (typeof window === 'undefined') return 1;
    // Calculate scale to use full viewport width
    const viewportWidth = window.innerWidth;
    const calculatedScale = Math.min(viewportWidth / designWidth, maxScale);
    return Math.max(calculatedScale, 0.1); // Minimum scale of 0.1
  });

  useEffect(() => {
    const onResize = () => {
      const viewportWidth = window.innerWidth;
      const calculatedScale = Math.min(viewportWidth / designWidth, maxScale);
      setScale(Math.max(calculatedScale, 0.1)); // Minimum scale of 0.1
    };
    
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [designWidth, maxScale]);

  return scale;
} 