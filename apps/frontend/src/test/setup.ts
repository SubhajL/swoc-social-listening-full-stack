/// <reference types="vitest" />
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import { server } from '../mocks/server';

// Setup MSW
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Mock mapbox-gl since it requires a real browser environment
vi.mock('mapbox-gl', () => ({
  default: {
    Map: vi.fn(() => ({
      addControl: vi.fn(),
      on: vi.fn(),
      remove: vi.fn()
    })),
    NavigationControl: vi.fn(),
    Marker: vi.fn(() => ({
      setLngLat: vi.fn().mockReturnThis(),
      setPopup: vi.fn().mockReturnThis(),
      addTo: vi.fn().mockReturnThis(),
      remove: vi.fn()
    })),
    Popup: vi.fn(() => ({
      setHTML: vi.fn().mockReturnThis()
    }))
  }
})); 