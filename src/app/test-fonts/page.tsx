'use client';

import { useEffect } from 'react';

export default function TestFontsPage() {
  useEffect(() => {
    // Test font loading
    const testFont = () => {
      console.log('Testing font loading...');
      
      // Test 1: Direct Google Fonts
      const directLink = document.createElement('link');
      directLink.rel = 'stylesheet';
      directLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400&display=swap';
      document.head.appendChild(directLink);
      
      // Test 2: Our proxy
      const proxyLink = document.createElement('link');
      proxyLink.rel = 'stylesheet';
      proxyLink.href = '/api/fonts/css/css2?family=Inter:wght@400&display=swap';
      document.head.appendChild(proxyLink);
      
      console.log('Font links added:', {
        direct: directLink.href,
        proxy: proxyLink.href
      });
    };
    
    testFont();
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'Inter, sans-serif' }}>
      <h1>Font Loading Test</h1>
      <p>This text should be in Inter font if loading works.</p>
      <p style={{ fontFamily: 'Arial, sans-serif' }}>This text is in Arial for comparison.</p>
      
      <div style={{ marginTop: '20px' }}>
        <h3>Test Results:</h3>
        <p>Check the browser console for font loading logs.</p>
        <p>Check the Network tab to see if font requests are successful.</p>
      </div>
    </div>
  );
}
