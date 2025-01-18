import { useEffect, useState, useRef } from 'react';
import { apiClient } from '@/lib/api-client';
import { useRealTime } from '@/contexts/RealTimeContext';
import type { ProcessedPost } from '@/types/processed-post';
import mapboxgl from 'mapbox-gl';
import "mapbox-gl/dist/mapbox-gl.css";
import { useNavigate } from "react-router-dom";
import MapError from "./map/MapError";
import MapMarker from "./map/MapMarker";
import { sampleComplaints } from "@/models/complaint";
import { IrrigationOfficeFilter } from "./filters/IrrigationOfficeFilter";

interface MapProps {
  token: string;  // Mapbox token
  selectedCategories: string[];
  selectedProvince: string | null;
  selectedOffice: string | null;
}

export function Map({ token, selectedCategories, selectedProvince, selectedOffice }: MapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const navigate = useNavigate();
  const { latestPost } = useRealTime();
  const [apiPosts, setApiPosts] = useState<ProcessedPost[]>([]);

  // Load initial posts from API
  useEffect(() => {
    const loadPosts = async () => {
      try {
        const posts = await apiClient.getUnprocessedPosts();
        setApiPosts(posts);
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
        const index = current.findIndex(p => p.processed_post_id === latestPost.processed_post_id);
        if (index >= 0) {
          const updated = [...current];
          updated[index] = latestPost;
          return updated;
        }
        return [...current, latestPost];
      });
    }
  }, [latestPost]);

  useEffect(() => {
    console.log('Map effect starting', { token, mapContainer: !!mapContainer.current });
    console.log('Available sample complaints:', sampleComplaints);
    
    if (!mapContainer.current) {
      console.error('Map container not found');
      return;
    }
    
    if (!token) {
      console.error('No token provided');
      setError("Please provide a valid Mapbox access token");
      return;
    }

    try {
      console.log('Initializing map with token:', token.substring(0, 10) + '...');
      mapboxgl.accessToken = token;

      console.log('Creating map instance');
      const map = new mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/satellite-streets-v12",
        center: [101.0, 15.0],
        zoom: 5.5,
        language: 'th',
        localIdeographFontFamily: "'Noto Sans Thai', 'Noto Sans', sans-serif"
      });

      map.addControl(new mapboxgl.NavigationControl(), "top-right");

      // Clear existing markers
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];

      // Only show markers if at least one category is selected
      if (selectedCategories.length > 0) {
        console.log('Adding markers for categories:', selectedCategories);
        const filteredPosts = apiPosts.filter(post => {
          const categoryMatch = selectedCategories.includes(post.category_name);
          const provinceMatch = !selectedProvince || 
            (post.location.province && post.location.province === selectedProvince);
          const officeMatch = !selectedOffice ||
            (post.location.irrigation_office && post.location.irrigation_office === selectedOffice);
          return categoryMatch && provinceMatch && officeMatch;
        });

        console.log('Filtered posts:', filteredPosts);

        markersRef.current = filteredPosts.map(post => {
          const complaintData = sampleComplaints.find(complaint => 
            String(complaint.id) === post.processed_post_id
          );

          return MapMarker({ 
            post: {
              id: parseInt(post.processed_post_id, 10),
              category: post.category_name,
              location: {
                latitude: post.location.latitude,
                longitude: post.location.longitude
              },
              province: post.location.province || ''
            },
            map, 
            onClick: () => {
              if (complaintData) {
                navigate('/complaint-form', { 
                  state: { ...complaintData }
                });
              } else {
                navigate('/complaint-form');
              }
            } 
          });
        });
      }

      map.on('error', (e) => {
        console.error('Mapbox error:', e);
        setError("Error loading map. Please check your Mapbox token.");
      });

      return () => {
        console.log('Cleaning up map');
        map.remove();
      };
    } catch (err) {
      console.error('Map initialization error:', err);
      setError("Error initializing map. Please check your Mapbox token.");
    }
  }, [token, selectedCategories, selectedProvince, selectedOffice, navigate, apiPosts]);

  if (error) {
    return <MapError error={error} />;
  }

  return (
    <div className="w-full h-full">
      <div ref={mapContainer} className="w-full h-full rounded-lg" />
    </div>
  );
}

export default Map;
