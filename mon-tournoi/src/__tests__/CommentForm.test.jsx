import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CommentForm } from '../components/comments';

// Mock des fonctions
const mockOnSubmit = jest.fn();

describe('CommentForm', () => {
  beforeEach(() => {
    mockOnSubmit.mockClear();
  });

  it('renders textarea and submit button', () => {
    render(<CommentForm onSubmit={mockOnSubmit} />);
    
    expect(screen.getByPlaceholderText(/Partagez votre expérience/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /publier/i })).toBeInTheDocument();
  });

  it('shows character count', () => {
    render(<CommentForm onSubmit={mockOnSubmit} />);
    
    expect(screen.getByText('0/1000 caractères')).toBeInTheDocument();
  });

  it('updates character count on input', () => {
    render(<CommentForm onSubmit={mockOnSubmit} />);
    
    const textarea = screen.getByPlaceholderText(/Partagez votre expérience/i);
    fireEvent.change(textarea, { target: { value: 'Hello' } });
    
    expect(screen.getByText('5/1000 caractères')).toBeInTheDocument();
  });

  it('renders rating label', () => {
    render(<CommentForm onSubmit={mockOnSubmit} />);
    
    expect(screen.getByText(/votre note/i)).toBeInTheDocument();
  });
});
