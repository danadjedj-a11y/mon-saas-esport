import { render, screen, fireEvent } from '@testing-library/react';
import { useTranslation } from 'react-i18next';
import LanguageSelector from '../LanguageSelector';

// Mock useTranslation
jest.mock('react-i18next', () => ({
  useTranslation: jest.fn()
}));

describe('LanguageSelector', () => {
  const mockChangeLanguage = jest.fn();
  const mockUseTranslation = useTranslation;

  beforeEach(() => {
    mockChangeLanguage.mockClear();
    mockUseTranslation.mockReturnValue({
      i18n: {
        changeLanguage: mockChangeLanguage,
        language: 'fr'
      }
    });
  });

  test('renders current language', () => {
    render(<LanguageSelector />);
    expect(screen.getByText('Français')).toBeInTheDocument();
  });

  test('opens dropdown on click', () => {
    render(<LanguageSelector />);
    const button = screen.getByText('Français').closest('button');
    fireEvent.click(button);
    expect(screen.getByText('English')).toBeInTheDocument();
  });

  test('changes language when option is clicked', () => {
    render(<LanguageSelector />);
    const button = screen.getByText('Français').closest('button');
    fireEvent.click(button);
    
    const englishOption = screen.getByText('English');
    fireEvent.click(englishOption);
    
    expect(mockChangeLanguage).toHaveBeenCalledWith('en');
  });
});

