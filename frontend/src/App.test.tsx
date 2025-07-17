import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from './App';

describe('App', () => {
  it('renders upload page heading', () => {
    render(<App />);
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent('Upload Food Image');
  });

  it('renders file upload button', () => {
    render(<App />);
    const button = screen.getByRole('button', { name: /choose file/i });
    expect(button).toBeInTheDocument();
  });

  it('renders camera button', () => {
    render(<App />);
    const button = screen.getByRole('button', { name: /use camera/i });
    expect(button).toBeInTheDocument();
  });
});