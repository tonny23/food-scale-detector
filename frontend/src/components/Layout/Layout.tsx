import React from 'react';
import './Layout.css';

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
}

export const Layout: React.FC<LayoutProps> = ({ children, title }) => {
  return (
    <div className="layout">
      <header className="layout-header">
        <h1 className="layout-title">
          {title || 'Food Nutrition Detector'}
        </h1>
      </header>
      <main className="layout-main">
        {children}
      </main>
    </div>
  );
};