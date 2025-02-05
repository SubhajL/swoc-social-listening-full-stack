import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import type { ProcessedPost } from '@/types/processed-post';

interface MapState {
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;
}

interface UseMapOptions {
  center?: [number, number];
  zoom?: number;
  onPointClick?: (postId: string, location: { lat: number; lng: number }) => void;
}

interface MapFeatureProperties {
  id: string;
  text: string;
  category_name: string;
}

export function useMap(containerRef: React.RefObject<HTMLDivElement>, options: UseMapOptions = {}) {
  const {
    center = [121.0437, 14.5489], // Manila coordinates
    zoom = 10,
    onPointClick
  } = options;

  const map = useRef<mapboxgl.Map | null>(null);
  const [state, setState] = useState<MapState>({
    isLoading: true,
    error: null,
    isInitialized: false
  });

  const setError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, error, isLoading: false }));
  }, []);

  const setLoading = useCallback((isLoading: boolean) => {
    setState(prev => ({ ...prev, isLoading }));
  }, []);

  const setInitialized = useCallback((isInitialized: boolean) => {
    setState(prev => ({ ...prev, isInitialized }));
  }, []);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || map.current) return;

    try {
      map.current = new mapboxgl.Map({
        container: containerRef.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center,
        zoom
      });

      map.current.on('load', () => {
        try {
          if (!map.current) return;

          map.current.addSource('posts', {
            type: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: []
            },
            cluster: true,
            clusterMaxZoom: 14,
            clusterRadius: 50
          });

          map.current.addLayer({
            id: 'clusters',
            type: 'circle',
            source: 'posts',
            filter: ['has', 'point_count'],
            paint: {
              'circle-color': [
                'step',
                ['get', 'point_count'],
                '#51bbd6',
                100,
                '#f1f075',
                750,
                '#f28cb1'
              ],
              'circle-radius': [
                'step',
                ['get', 'point_count'],
                20,
                100,
                30,
                750,
                40
              ]
            }
          });

          map.current.addLayer({
            id: 'cluster-count',
            type: 'symbol',
            source: 'posts',
            filter: ['has', 'point_count'],
            layout: {
              'text-field': '{point_count_abbreviated}',
              'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
              'text-size': 12
            }
          });

          map.current.addLayer({
            id: 'unclustered-point',
            type: 'circle',
            source: 'posts',
            filter: ['!', ['has', 'point_count']],
            paint: {
              'circle-color': '#11b4da',
              'circle-radius': 8,
              'circle-stroke-width': 1,
              'circle-stroke-color': '#fff'
            }
          });

          setupMapInteractions();
          setInitialized(true);
          setLoading(false);
        } catch (err) {
          console.error('Error setting up map layers:', err);
          setError('Failed to initialize map layers. Please try again later.');
        }
      });

      map.current.on('error', (e) => {
        console.error('Map error:', e);
        setError('An error occurred with the map. Please try again later.');
      });
    } catch (err) {
      console.error('Error initializing map:', err);
      setError('Failed to initialize map. Please try again later.');
    }

    return () => {
      map.current?.remove();
    };
  }, [center, zoom, setError, setInitialized, setLoading]);

  const setupMapInteractions = useCallback(() => {
    if (!map.current) return;

    // Handle clicks on individual points
    map.current.on('click', 'unclustered-point', (e) => {
      if (!e.features?.[0] || !onPointClick) return;
      
      const coordinates = (e.features[0].geometry as any).coordinates.slice();
      const properties = e.features[0].properties as MapFeatureProperties | null;
      
      if (!properties) return;

      onPointClick(properties.id, {
        lat: coordinates[1],
        lng: coordinates[0]
      });
    });

    // Handle clicks on clusters
    map.current.on('click', 'clusters', (e) => {
      if (!e.features?.[0] || !map.current) return;

      const features = map.current.queryRenderedFeatures(e.point, {
        layers: ['clusters']
      });

      const clusterId = features[0].properties?.cluster_id;
      if (typeof clusterId !== 'number') return;

      const source = map.current.getSource('posts') as mapboxgl.GeoJSONSource;
      source.getClusterExpansionZoom(clusterId, (err, expansionZoom) => {
        if (err || !map.current || !e.features?.[0]) return;

        const coordinates = (e.features[0].geometry as any).coordinates;
        map.current.easeTo({
          center: coordinates,
          zoom: expansionZoom || map.current.getZoom()
        });
      });
    });

    // Change cursor on hover
    map.current.on('mouseenter', 'clusters', () => {
      if (map.current) map.current.getCanvas().style.cursor = 'pointer';
    });

    map.current.on('mouseleave', 'clusters', () => {
      if (map.current) map.current.getCanvas().style.cursor = '';
    });

    map.current.on('mouseenter', 'unclustered-point', () => {
      if (map.current) map.current.getCanvas().style.cursor = 'pointer';
    });

    map.current.on('mouseleave', 'unclustered-point', () => {
      if (map.current) map.current.getCanvas().style.cursor = '';
    });
  }, [onPointClick]);

  const updatePosts = useCallback((posts: ProcessedPost[]) => {
    if (!map.current || !state.isInitialized) return;

    try {
      const source = map.current.getSource('posts') as mapboxgl.GeoJSONSource;
      if (!source) return;

      const features = posts.map(post => ({
        type: 'Feature' as const,
        properties: {
          id: post.processed_post_id.toString(),
          text: post.text,
          category_name: post.category_name
        },
        geometry: {
          type: 'Point' as const,
          coordinates: [post.longitude, post.latitude]
        }
      }));

      source.setData({
        type: 'FeatureCollection',
        features
      });
    } catch (err) {
      console.error('Error updating map data:', err);
      setError('Failed to update map data. Please try refreshing the page.');
    }
  }, [state.isInitialized, setError]);

  return {
    map: map.current,
    state,
    setError,
    setLoading,
    updatePosts
  };
} 