import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AdminStatCard } from '../components/admin';

describe('AdminStatCard', () => {
  it('renders with default props', () => {
    render(<AdminStatCard title="Test Title" value={42} />);
    
    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('renders with subtitle', () => {
    render(<AdminStatCard title="With Subtitle" value={100} subtitle="+10%" />);
    
    expect(screen.getByText('With Subtitle')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText('+10%')).toBeInTheDocument();
  });

  it('renders with gradient style', () => {
    const { container } = render(
      <AdminStatCard 
        title="Gradient" 
        value={50} 
        gradient="linear-gradient(135deg, #ff36a3, #c10468)" 
      />
    );
    
    // Check that the gradient style is applied to the card
    const card = container.firstChild;
    expect(card).toHaveStyle({ background: 'linear-gradient(135deg, #ff36a3, #c10468)' });
  });

  it('renders in alert mode', () => {
    render(<AdminStatCard title="Alert" value={5} isAlert={true} />);
    
    expect(screen.getByText('Alert')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });
});
