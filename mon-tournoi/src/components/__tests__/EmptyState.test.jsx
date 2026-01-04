import { render, screen } from '@testing-library/react';
import EmptyState, { EmptyTournaments, EmptyComments, EmptyNotifications, EmptyBadges } from '../EmptyState';

describe('EmptyState Components', () => {
  test('EmptyState renders with title and message', () => {
    render(<EmptyState title="Test Title" message="Test Message" />);
    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test Message')).toBeInTheDocument();
  });

  test('EmptyState renders with action button', () => {
    const onAction = jest.fn();
    render(
      <EmptyState
        title="Test Title"
        message="Test Message"
        actionLabel="Action"
        onAction={onAction}
      />
    );
    const button = screen.getByText('Action');
    expect(button).toBeInTheDocument();
    button.click();
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  test('EmptyTournaments renders correctly', () => {
    render(<EmptyTournaments />);
    expect(screen.getByText(/Aucun tournoi disponible/i)).toBeInTheDocument();
  });

  test('EmptyComments renders correctly', () => {
    render(<EmptyComments />);
    expect(screen.getByText(/Aucun commentaire/i)).toBeInTheDocument();
  });

  test('EmptyNotifications renders correctly', () => {
    render(<EmptyNotifications />);
    expect(screen.getByText(/Aucune notification/i)).toBeInTheDocument();
  });

  test('EmptyBadges renders correctly', () => {
    render(<EmptyBadges />);
    expect(screen.getByText(/Aucun badge obtenu/i)).toBeInTheDocument();
  });
});

