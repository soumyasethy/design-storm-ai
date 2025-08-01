'use client';

import React from 'react';
import { isFooterComponent, getLayoutMode, getResponsiveBreakpoints } from '@/lib/utils';

interface FigmaLayoutProps {
  node: any;
  children: React.ReactNode;
  showDebug?: boolean;
  imageMap?: Record<string, string>;
}

// Specialized footer layout component
const FooterLayout: React.FC<{ node: any; children: React.ReactNode; showDebug?: boolean }> = ({ 
  node, 
  children, 
  showDebug 
}) => {
  // Extract footer-specific layout properties
  const hasLogo = node.children?.some((child: any) => 
    child.name?.toLowerCase().includes('logo') || 
    child.name?.toLowerCase().includes('brand')
  );
  
  const hasLinks = node.children?.some((child: any) => 
    child.name?.toLowerCase().includes('link') || 
    child.name?.toLowerCase().includes('nav') ||
    child.name?.toLowerCase().includes('menu')
  );
  
  const hasAddress = node.children?.some((child: any) => 
    child.name?.toLowerCase().includes('address') || 
    child.name?.toLowerCase().includes('contact') ||
    child.name?.toLowerCase().includes('info')
  );
  
  const hasSocialIcons = node.children?.some((child: any) => 
    child.name?.toLowerCase().includes('social') || 
    child.name?.toLowerCase().includes('linkedin') ||
    child.name?.toLowerCase().includes('instagram') ||
    child.name?.toLowerCase().includes('youtube')
  );

  // Determine grid layout based on content
  const gridColumns = [hasLogo, hasLinks, hasAddress, hasSocialIcons].filter(Boolean).length;
  
  const gridTemplateColumns = gridColumns === 4 ? '1fr 2fr 1fr 1fr' :
                             gridColumns === 3 ? '1fr 2fr 1fr' :
                             gridColumns === 2 ? '1fr 1fr' : '1fr';

  return (
    <div
      className="w-full"
      style={{
        display: 'grid',
        gridTemplateColumns,
        gap: '2rem',
        alignItems: 'center',
        padding: '2rem 0',
        ...(showDebug ? { 
          border: '2px solid #f59e0b',
          backgroundColor: 'rgba(245, 158, 11, 0.1)'
        } : {})
      }}
    >
      {showDebug && (
        <div className="absolute -top-8 left-0 bg-orange-600 text-white text-xs px-2 py-1 rounded z-20 whitespace-nowrap shadow-lg">
          <div className="font-bold">Footer Layout</div>
          <div>Grid: {gridColumns} columns</div>
          <div>Logo: {hasLogo ? 'Yes' : 'No'}</div>
          <div>Links: {hasLinks ? 'Yes' : 'No'}</div>
          <div>Address: {hasAddress ? 'Yes' : 'No'}</div>
          <div>Social: {hasSocialIcons ? 'Yes' : 'No'}</div>
        </div>
      )}
      {children}
    </div>
  );
};

// Specialized social icons layout component
const SocialIconsLayout: React.FC<{ node: any; children: React.ReactNode; showDebug?: boolean }> = ({ 
  node, 
  children, 
  showDebug 
}) => {
  const socialIcons = node.children?.filter((child: any) => 
    child.name?.toLowerCase().includes('linkedin') || 
    child.name?.toLowerCase().includes('instagram') ||
    child.name?.toLowerCase().includes('youtube') ||
    child.name?.toLowerCase().includes('twitter') ||
    child.name?.toLowerCase().includes('social')
  ) || [];

  return (
    <div
      className="flex items-center justify-center space-x-4"
      style={{
        ...(showDebug ? { 
          border: '1px solid #10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)'
        } : {})
      }}
    >
      {showDebug && (
        <div className="absolute -top-8 left-0 bg-green-600 text-white text-xs px-2 py-1 rounded z-20 whitespace-nowrap shadow-lg">
          <div className="font-bold">Social Icons</div>
          <div>Count: {socialIcons.length}</div>
        </div>
      )}
      {children}
    </div>
  );
};

// Specialized navigation links layout component
const NavigationLinksLayout: React.FC<{ node: any; children: React.ReactNode; showDebug?: boolean }> = ({ 
  node, 
  children, 
  showDebug 
}) => {
  const links = node.children?.filter((child: any) => 
    child.type === 'TEXT' || 
    child.name?.toLowerCase().includes('link') ||
    child.name?.toLowerCase().includes('nav')
  ) || [];

  // Determine if links should be horizontal or vertical
  const isHorizontal = node.layoutMode === 'HORIZONTAL' || 
                      node.primaryAxisAlignItems === 'CENTER' ||
                      node.primaryAxisAlignItems === 'SPACE_BETWEEN';

  return (
    <div
      className={isHorizontal ? "flex items-center space-x-6" : "flex flex-col space-y-2"}
      style={{
        ...(showDebug ? { 
          border: '1px solid #3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)'
        } : {})
      }}
    >
      {showDebug && (
        <div className="absolute -top-8 left-0 bg-blue-600 text-white text-xs px-2 py-1 rounded z-20 whitespace-nowrap shadow-lg">
          <div className="font-bold">Navigation Links</div>
          <div>Count: {links.length}</div>
          <div>Layout: {isHorizontal ? 'Horizontal' : 'Vertical'}</div>
        </div>
      )}
      {children}
    </div>
  );
};

// Main FigmaLayout component
const FigmaLayout: React.FC<FigmaLayoutProps> = ({ 
  node, 
  children, 
  showDebug = false,
  imageMap = {}
}) => {
  // Check if this is a footer component
  if (isFooterComponent(node)) {
    return (
      <FooterLayout node={node} showDebug={showDebug}>
        {children}
      </FooterLayout>
    );
  }

  // Check if this is a social icons container
  if (node.name?.toLowerCase().includes('social') || 
      node.children?.some((child: any) => 
        child.name?.toLowerCase().includes('linkedin') || 
        child.name?.toLowerCase().includes('instagram') ||
        child.name?.toLowerCase().includes('youtube')
      )) {
    return (
      <SocialIconsLayout node={node} showDebug={showDebug}>
        {children}
      </SocialIconsLayout>
    );
  }

  // Check if this is a navigation links container
  if (node.name?.toLowerCase().includes('nav') || 
      node.name?.toLowerCase().includes('menu') ||
      node.name?.toLowerCase().includes('links')) {
    return (
      <NavigationLinksLayout node={node} showDebug={showDebug}>
        {children}
      </NavigationLinksLayout>
    );
  }

  // Default layout handling
  const layoutStyles = getLayoutMode(node);
  
  return (
    <div
      style={{
        ...layoutStyles,
        ...(showDebug ? { 
          border: '1px solid #8b5cf6',
          backgroundColor: 'rgba(139, 92, 246, 0.1)'
        } : {})
      }}
    >
      {showDebug && (
        <div className="absolute -top-8 left-0 bg-purple-600 text-white text-xs px-2 py-1 rounded z-20 whitespace-nowrap shadow-lg">
          <div className="font-bold">Layout: {node.name}</div>
          <div>Mode: {node.layoutMode || 'Default'}</div>
          <div>Children: {node.children?.length || 0}</div>
        </div>
      )}
      {children}
    </div>
  );
};

export default FigmaLayout; 