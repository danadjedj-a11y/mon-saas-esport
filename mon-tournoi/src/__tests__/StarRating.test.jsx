import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { StarRating } from '../components/comments';

describe('StarRating', () => {
  it('renders 5 stars by default', () => {
    render(<StarRating rating={0} />);
    
    const stars = screen.getAllByText('⭐');
    expect(stars).toHaveLength(5);
  });

  it('shows correct classes based on rating', () => {
    const { container } = render(<StarRating rating={3} />);
    
    // Les 3 premières étoiles devraient avoir la classe text-accent
    const spans = container.querySelectorAll('span');
    expect(spans[0]).toHaveClass('text-accent');
    expect(spans[1]).toHaveClass('text-accent');
    expect(spans[2]).toHaveClass('text-accent');
    // Les 2 dernières devraient avoir la classe text-primary
    expect(spans[3]).toHaveClass('text-primary');
    expect(spans[4]).toHaveClass('text-primary');
  });

  it('calls onRate when clicked', () => {
    const handleRate = jest.fn();
    render(<StarRating rating={0} onRate={handleRate} />);
    
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[2]); // Click 3rd star
    
    expect(handleRate).toHaveBeenCalledWith(3);
  });

  it('does not call onRate when readOnly', () => {
    const handleRate = jest.fn();
    render(<StarRating rating={0} onRate={handleRate} readOnly />);
    
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[2]);
    
    expect(handleRate).not.toHaveBeenCalled();
  });

  it('renders disabled buttons when readOnly', () => {
    render(<StarRating rating={3} readOnly />);
    
    const buttons = screen.getAllByRole('button');
    buttons.forEach(button => {
      expect(button).toBeDisabled();
    });
  });
});
