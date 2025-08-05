import { useEffect, useState } from 'react';

export function useFigmaScale(designWidth: number, maxScale = 1.2) {
  const [scale, setScale] = useState(() => {
    // Handle SSR by checking if window exists
    if (typeof window === 'undefined') return 1;
    // Calculate scale to fill viewport width completely
    const viewportWidth = window.innerWidth;
    const calculatedScale = viewportWidth / designWidth;
    // Don't limit by maxScale - let it fill the full width
    return calculatedScale;
  });

  useEffect(() => {
    const onResize = () => {
      const viewportWidth = window.innerWidth;
      const calculatedScale = viewportWidth / designWidth;
      // Don't limit by maxScale - let it fill the full width
      setScale(calculatedScale);
    };
    
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [designWidth, maxScale]);

  return scale;
} 