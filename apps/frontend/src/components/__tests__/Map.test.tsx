import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { Map } from '../Map';
import { useMapContainer } from '@/hooks/useMapContainer';
import { useRealTime } from '@/contexts/RealTimeContext';
import { apiClient } from '@/lib/api-client';
import { CategoryName } from '@/types/processed-post';
import type { ProcessedPost } from '@/types/processed-post';
import mapboxgl, { GeoJSONSource, Map as MapboxMap } from 'mapbox-gl';
import { MemoryRouter } from 'react-router-dom';
import type { Map as MapComponent } from '@/components/Map';
type MapProps = React.ComponentProps<typeof MapComponent>;

// Mock dependencies
vi.mock('@/hooks/useMapContainer');
vi.mock('@/contexts/RealTimeContext');
vi.mock('@/lib/api-client');

// Mock GeoJSONSource with proper typing
const mockSetData = vi.fn();
const mockGeoJSONSource = {
  type: 'geojson' as const,
  setData: mockSetData,
  _data: { type: 'FeatureCollection', features: [] }
} as unknown as GeoJSONSource;

// Create a properly typed mock map instance
const mockMapInstance = {
  addControl: vi.fn(),
  on: vi.fn(),
  addSource: vi.fn(),
  addLayer: vi.fn(),
  addImage: vi.fn(),
  getSource: vi.fn((id: string) => {
    if (id === 'posts') return mockGeoJSONSource;
    return undefined;
  }),
  remove: vi.fn(),
  setFilter: vi.fn(),
} as unknown as MapboxMap;

// Mock mapbox-gl
vi.mock('mapbox-gl', () => ({
  default: {
    Map: vi.fn(() => mockMapInstance),
    NavigationControl: vi.fn()
  }
}));

// Mock data
const mockPosts: ProcessedPost[] = [
  {
    processed_post_id: 1,
    text: 'Test post 1',
    category_name: CategoryName.REPORT_INCIDENT,
    sub1_category_name: '',
    profile_name: 'Test User 1',
    post_date: new Date(),
    post_url: 'https://example.com/1',
    latitude: 13.7563,
    longitude: 100.5018,
    tumbon: ['Phra Borom Maha Ratchawang'],
    amphure: ['Phra Nakhon'],
    province: ['Bangkok'],
    created_at: new Date().toISOString(),
    status: 'unprocessed'
  },
  {
    processed_post_id: 2,
    text: 'Test post 2',
    category_name: CategoryName.REQUEST_SUPPORT,
    sub1_category_name: '',
    profile_name: 'Test User 2',
    post_date: new Date(),
    post_url: 'https://example.com/2',
    latitude: 13.7500,
    longitude: 100.4833,
    tumbon: ['Siri Rat'],
    amphure: ['Bangkok Noi'],
    province: ['Bangkok'],
    created_at: new Date().toISOString(),
    status: 'unprocessed'
  }
];

describe('Map Component', () => {
  const defaultProps: MapProps = {
    token: 'test-token',
    selectedCategories: [] as CategoryName[],
    selectedProvince: null,
    selectedAmphure: null,
    selectedTumbon: null,
    selectedOffice: null,
  };

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Mock useMapContainer hook
    vi.mocked(useMapContainer).mockReturnValue({
      containerRef: { current: document.createElement('div') },
      containerState: {
        retries: 0,
        dimensions: { width: 800, height: 600 },
        ready: true,
        error: null
      },
      isReady: true,
      hasError: false,
      error: null
    });

    // Mock useRealTime hook
    vi.mocked(useRealTime).mockReturnValue({
      latestPost: undefined,
      batchProgress: undefined
    });

    // Mock API client
    vi.mocked(apiClient.getUnprocessedPosts).mockResolvedValue(mockPosts);

    // Reset mockSetData
    mockSetData.mockClear();
  });

  it('should render map container when ready', () => {
    render(
      <MemoryRouter>
        <Map {...defaultProps} />
      </MemoryRouter>
    );
    expect(screen.getByTestId('map-container')).toBeInTheDocument();
  });

  it('should initialize Mapbox with correct configuration', async () => {
    render(
      <MemoryRouter>
        <Map {...defaultProps} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(mapboxgl.Map).toHaveBeenCalledWith({
        container: expect.any(HTMLDivElement),
        style: expect.any(String),
        center: [101.0, 15.0],
        zoom: 5.5,
        language: 'th',
        localIdeographFontFamily: "'Noto Sans Thai', 'Noto Sans', sans-serif"
      });
    });
  });

  it('should filter posts based on selected categories', async () => {
    render(
      <MemoryRouter>
        <Map {...defaultProps} selectedCategories={[CategoryName.REPORT_INCIDENT]} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(mockSetData).toHaveBeenCalledWith(expect.objectContaining({
        type: 'FeatureCollection',
        features: expect.arrayContaining([
          expect.objectContaining({
            properties: expect.objectContaining({
              id: 1,
              category: CategoryName.REPORT_INCIDENT
            })
          })
        ])
      }));
    });
  });

  it('should filter posts based on administrative area', async () => {
    render(
      <MemoryRouter>
        <Map {...defaultProps} selectedProvince="Bangkok" selectedAmphure="Bangkok Noi" />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(mockSetData).toHaveBeenCalledWith(expect.objectContaining({
        type: 'FeatureCollection',
        features: expect.arrayContaining([
          expect.objectContaining({
            properties: expect.objectContaining({
              id: 2
            })
          })
        ])
      }));
    });
  });
}); 