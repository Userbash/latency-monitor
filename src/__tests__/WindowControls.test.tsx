import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { WindowControls } from '../components/WindowControls';

describe('WindowControls', () => {
  test('sends correct window control commands on button click', () => {
    const windowControl = vi.fn();
    window.electronAPI = {
      windowControl,
      startNetworkTest: vi.fn(),
      openExternal: vi.fn(),
      getSystemLocale: vi.fn(),
      captureScreenshot: vi.fn(),
      onTestProgress: vi.fn(),
      onTestComplete: vi.fn(),
      onTestError: vi.fn(),
    } as unknown as Window['electronAPI'];

    render(<WindowControls />);

    fireEvent.click(screen.getByTitle('Minimize'));
    fireEvent.click(screen.getByTitle('Maximize'));
    fireEvent.click(screen.getByTitle('Close'));

    expect(windowControl).toHaveBeenNthCalledWith(1, 'minimize');
    expect(windowControl).toHaveBeenNthCalledWith(2, 'maximize');
    expect(windowControl).toHaveBeenNthCalledWith(3, 'close');
  });
});
