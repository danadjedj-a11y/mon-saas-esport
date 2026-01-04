import { toast } from '../toast';

describe('Toast Utility', () => {
  beforeEach(() => {
    // Nettoyer le DOM avant chaque test
    document.body.innerHTML = '';
  });

  test('toast object has all required methods', () => {
    expect(toast).toHaveProperty('success');
    expect(toast).toHaveProperty('error');
    expect(toast).toHaveProperty('info');
    expect(toast).toHaveProperty('warning');
    expect(toast).toHaveProperty('show');
    expect(typeof toast.success).toBe('function');
    expect(typeof toast.error).toBe('function');
    expect(typeof toast.info).toBe('function');
    expect(typeof toast.warning).toBe('function');
  });

  test('toast.success can be called without errors', () => {
    expect(() => toast.success('Success message')).not.toThrow();
  });

  test('toast.error can be called without errors', () => {
    expect(() => toast.error('Error message')).not.toThrow();
  });

  test('toast.info can be called without errors', () => {
    expect(() => toast.info('Info message')).not.toThrow();
  });

  test('toast.warning can be called without errors', () => {
    expect(() => toast.warning('Warning message')).not.toThrow();
  });
});

