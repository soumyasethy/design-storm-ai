import { useEffect, useState } from 'react';

export function useFigmaScale(designWidth: number, maxScale = 1.2) {
  const [scale, setScale] = useState(() => {
    // Handle SSR by checking if window exists
    if (typeof window === 'undefined') return 1;
    // Calculate scale to use full viewport width
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Calculate scale based on width
    const widthScale = viewportWidth / designWidth;
    
    // Apply max scale constraint to prevent excessive scaling on ultra-wide displays
    const constrainedScale = Math.min(widthScale, maxScale);
    
    // Ensure minimum scale for readability
    return Math.max(constrainedScale, 0.1);
  });

  useEffect(() => {
    const onResize = () => {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      // Calculate scale based on width
      const widthScale = viewportWidth / designWidth;
      
      // Apply max scale constraint to prevent excessive scaling on ultra-wide displays
      const constrainedScale = Math.min(widthScale, maxScale);
      
      // Ensure minimum scale for readability
      setScale(Math.max(constrainedScale, 0.1));
    };
    
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [designWidth, maxScale]);

  return scale;
} 