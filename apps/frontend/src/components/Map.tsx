import { useEffect, useState, useRef } from 'react';
import { apiClient } from '@/lib/api-client';
import { useRealTime } from '@/contexts/RealTimeContext';
import type { ProcessedPost } from '@/types/processed-post';
import mapboxgl from 'mapbox-gl';
import "mapbox-gl/dist/mapbox-gl.css";
import { useNavigate } from "react-router-dom";
import MapError from "./map/MapError";
import { clusterConfig, mapStyle } from './map/styles';
import { getClusterColor, getClusterSize } from './map/utils';

interface MapProps {
  token: string;  // Mapbox token
  selectedCategories: string[];
  selectedProvince: string | null;
  selectedOffice: string | null;
}

export function Map({ token, selectedCategories, selectedProvince, selectedOffice }: MapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { latestPost } = useRealTime();
  const [apiPosts, setApiPosts] = useState<ProcessedPost[]>([]);

  // Load initial posts from API
  useEffect(() => {
    const loadPosts = async () => {
      try {
        const posts = await apiClient.getUnprocessedPosts();
        if (posts && posts.length > 0) {
          const latest20 = posts
            .sort((a, b) => new Date(b.post_date).getTime() - new Date(a.post_date).getTime())
            .slice(0, 20);
          setApiPosts(latest20);
        } else {
          setApiPosts([]);
        }
      } catch (error) {
        console.error('Failed to load posts:', error);
        setError("Failed to load posts from API");
      }
    };

    loadPosts();
  }, []);

  // Handle real-time updates
  useEffect(() => {
    if (latestPost) {
      setApiPosts(current => {
        const updated = [...current];
        const index = updated.findIndex(p => p.processed_post_id === latestPost.processed_post_id);
        
        if (index >= 0) {
          updated[index] = latestPost;
        } else {
          updated.unshift(latestPost);
          if (updated.length > 20) {
            updated.pop();
          }
        }
        
        return updated;
      });
    }
  }, [latestPost]);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || !token) {
      setError(!token ? "Please provide a valid Mapbox access token" : "Map container not found");
      return;
    }

    try {
      mapboxgl.accessToken = token;

      const map = new mapboxgl.Map({
        container: mapContainer.current,
        style: mapStyle.default,
        center: [101.0, 15.0], // Thailand center
        zoom: 5.5,
        language: 'th',
        localIdeographFontFamily: "'Noto Sans Thai', 'Noto Sans', sans-serif"
      });

      map.addControl(new mapboxgl.NavigationControl(), "top-right");

      // Add clustering source
      map.on('load', () => {
        map.addSource('posts', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: []
          },
          cluster: true,
          clusterMaxZoom: clusterConfig.maxZoom,
          clusterRadius: clusterConfig.radius
        });

        // Add cluster layer
        map.addLayer({
          id: 'clusters',
          type: 'circle',
          source: 'posts',
          filter: ['has', 'point_count'],
          paint: {
            'circle-color': [
              'step',
              ['get', 'point_count'],
              clusterConfig.colors.small,
              50,
              clusterConfig.colors.medium,
              100,
              clusterConfig.colors.large
            ],
            'circle-radius': [
              'step',
              ['get', 'point_count'],
              clusterConfig.sizes.small,
              50,
              clusterConfig.sizes.medium,
              100,
              clusterConfig.sizes.large
            ]
          }
        });

        // Add cluster count layer
        map.addLayer({
          id: 'cluster-count',
          type: 'symbol',
          source: 'posts',
          filter: ['has', 'point_count'],
          layout: {
            'text-field': '{point_count_abbreviated}',
            'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
            'text-size': 12
          },
          paint: {
            'text-color': '#ffffff'
          }
        });
      });

      // Handle cluster click
      map.on('click', 'clusters', (e) => {
        const features = map.queryRenderedFeatures(e.point, { layers: ['clusters'] });
        if (!features.length) return;
        
        const clusterId = features[0].properties?.cluster_id;
        if (!clusterId) return;

        const source = map.getSource('posts');
        if (!source || !('getClusterExpansionZoom' in source)) return;

        (source as mapboxgl.GeoJSONSource).getClusterExpansionZoom(clusterId, (err, zoom) => {
          if (err || typeof zoom !== 'number') return;
          const point = features[0].geometry as GeoJSON.Point;
          const coordinates: [number, number] = [
            point.coordinates[0] as number,
            point.coordinates[1] as number
          ];
          map.easeTo({
            center: coordinates,
            zoom
          });
        });
      });

      mapRef.current = map;

      return () => {
        map.remove();
        mapRef.current = null;
      };
    } catch (error) {
      console.error('Mapbox error:', error);
      setError("Error loading map. Please check your Mapbox token.");
    }
  }, [token]);

  // Update markers when posts or filters change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const source = map.getSource('posts');
    if (!source || !('setData' in source)) return;

    const filteredPosts = apiPosts.filter(post => {
      const categoryMatch = selectedCategories.includes(post.category_name);
      const provinceMatch = !selectedProvince || post.province === selectedProvince;
      const officeMatch = !selectedOffice; // Office filtering removed as it's not in the schema
      return categoryMatch && provinceMatch && officeMatch;
    });

    const features = filteredPosts.map(post => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: [
          post.longitude ?? 0,
          post.latitude ?? 0
        ] as [number, number]
      },
      properties: {
        id: post.processed_post_id,
        category: post.category_name,
        province: post.province || '',
        created_at: post.post_date,
        sub_category: post.sub1_category_name,
        text: post.text
      }
    }));

    (source as mapboxgl.GeoJSONSource).setData({
      type: 'FeatureCollection',
      features
    });
  }, [apiPosts, selectedCategories, selectedProvince, selectedOffice]);

  if (error) {
    return <MapError error={error} />;
  }

  return (
    <div ref={mapContainer} className="w-full h-full min-h-[400px]" />
  );
}

export default Map;
