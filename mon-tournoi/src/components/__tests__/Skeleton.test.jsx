import { render } from '@testing-library/react';
import Skeleton, { TournamentCardSkeleton, CommentSkeleton, TableSkeleton } from '../Skeleton';

describe('Skeleton Components', () => {
  test('Skeleton renders with default props', () => {
    const { container } = render(<Skeleton />);
    const skeleton = container.firstChild;
    expect(skeleton).toBeInTheDocument();
  });

  test('Skeleton renders with custom width and height', () => {
    const { container } = render(<Skeleton width="200px" height="50px" />);
    const skeleton = container.firstChild;
    expect(skeleton).toHaveStyle({ width: '200px', height: '50px' });
  });

  test('Skeleton renders multiple instances with count', () => {
    const { container } = render(<Skeleton count={3} />);
    const skeletons = container.querySelectorAll('div');
    expect(skeletons.length).toBeGreaterThanOrEqual(3);
  });

  test('TournamentCardSkeleton renders correctly', () => {
    const { container } = render(<TournamentCardSkeleton />);
    expect(container.firstChild).toBeInTheDocument();
  });

  test('CommentSkeleton renders correctly', () => {
    const { container } = render(<CommentSkeleton />);
    expect(container.firstChild).toBeInTheDocument();
  });

  test('TableSkeleton renders correctly', () => {
    const { container } = render(<TableSkeleton rows={5} columns={4} />);
    expect(container.firstChild).toBeInTheDocument();
  });
});

