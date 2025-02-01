import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { Map } from '../Map';
import type { MapProps } from '../Map';
import { CategoryName } from '@/types/category';
import mapboxgl from 'mapbox-gl';

// Mock mapbox-gl
vi.mock('mapbox-gl', () => ({
  Map: vi.fn(() => ({
    on: vi.fn(),
    remove: vi.fn(),
    addSource: vi.fn(),
    addLayer: vi.fn(),
    getSource: vi.fn(),
    setFilter: vi.fn(),
  })),
}));

// Create mock map instance
const mockMapInstance = {
  on: vi.fn(),
  remove: vi.fn(),
  addSource: vi.fn(),
  addLayer: vi.fn(),
  getSource: vi.fn(),
  setFilter: vi.fn(),
};

const mockMapConstructor = vi.fn(() => mockMapInstance);

// Mock GeoJSONSource with proper typing
const mockSetData = vi.fn();
const mockGeoJSONSource = {
  type: 'geojson' as const,
  setData: mockSetData,
  _data: { type: 'FeatureCollection', features: [] }
};

// Default props for testing
const defaultProps: MapProps = {
  token: 'test-token',
  selectedCategories: [],
  selectedProvince: null,
  selectedAmphure: null,
  onPostClick: vi.fn(),
  onMapLoad: vi.fn(),
  onError: vi.fn(),
};

// Helper function to render Map with Router
const renderMap = (props: Partial<MapProps> = {}) => {
  return render(
    <Map {...defaultProps} {...props} />
  );
};

describe('Map', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMapInstance.getSource.mockReturnValue(mockGeoJSONSource);
  });

  it('should render map container when ready', () => {
    renderMap();
    expect(screen.getByTestId('map-container')).toBeInTheDocument();
  });

  it('should initialize Mapbox with correct configuration', () => {
    renderMap();
    expect(mockMapConstructor).toHaveBeenCalledWith({
      container: expect.any(Element),
      style: 'mapbox://styles/mapbox/streets-v11',
      center: [100.5018, 13.7563],
      zoom: 5,
      accessToken: 'test-token',
    });
  });

  it('should show loading state while fetching posts', () => {
    renderMap();
    expect(screen.getByTestId('map-loading')).toBeInTheDocument();
  });

  it('should filter posts based on selected categories', async () => {
    const selectedCategories = [CategoryName.REPORT_INCIDENT];
    renderMap({ selectedCategories });
    
    await waitFor(() => {
      expect(mockMapInstance.setFilter).toHaveBeenCalledWith('posts-layer', [
        'in',
        'category',
        ...selectedCategories,
      ]);
    });
  });

  it('should filter posts based on administrative area', async () => {
    const selectedProvince = 'Bangkok';
    const selectedAmphure = 'Pathum Wan';
    
    renderMap({ selectedProvince, selectedAmphure });
    
    await waitFor(() => {
      expect(mockMapInstance.setFilter).toHaveBeenCalledWith('posts-layer', [
        'all',
        ['==', 'province', selectedProvince],
        ['==', 'amphure', selectedAmphure],
      ]);
    });
  });

  it('should show error state when map initialization fails', () => {
    const onError = vi.fn();
    mockMapConstructor.mockImplementationOnce(() => {
      throw new Error('Map initialization failed');
    });
    
    renderMap({ onError });
    
    expect(screen.getByText('Retry')).toBeInTheDocument();
    expect(onError).toHaveBeenCalledWith(new Error('Map initialization failed'));
  });

  it('should update map when new post arrives in real-time', async () => {
    renderMap();
    
    const newPost = {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [100.5018, 13.7563],
      },
      properties: {
        id: '1',
        title: 'New Post',
        category: CategoryName.REPORT_INCIDENT,
      },
    };
    
    // Simulate real-time update
    await waitFor(() => {
      expect(mockSetData).toHaveBeenCalledWith({
        type: 'FeatureCollection',
        features: [newPost],
      });
    });
  });
}); 