import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useNavigate } from "react-router-dom";
import MapError from "./map/MapError";
import MapMarker from "./map/MapMarker";
import { socialPosts } from "./map/utils";
import { sampleComplaints } from "@/models/complaint";

interface MapProps {
  token: string;
  selectedCategories: string[];
  selectedProvince: string | null;
}

const Map = ({ token, selectedCategories, selectedProvince }: MapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const navigate = useNavigate();

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
        // Add filtered markers
        const filteredPosts = socialPosts.filter(post => {
          const categoryMatch = selectedCategories.includes(post.category);
          const provinceMatch = !selectedProvince || post.province === selectedProvince;
          return categoryMatch && provinceMatch;
        });

        console.log('Filtered posts:', filteredPosts);

        markersRef.current = filteredPosts.map(post => {
          const complaintData = sampleComplaints.find(complaint => {
            console.log('Comparing:', { 
              postId: post.id, 
              complaintId: complaint.id,
              match: complaint.id === post.id
            });
            return complaint.id === post.id;
          });

          console.log('Found complaint data for post:', { 
            postId: post.id, 
            complaintData: complaintData || 'No matching complaint found'
          });

          return MapMarker({ 
            post, 
            map, 
            onClick: () => {
              if (complaintData) {
                console.log('Navigating to complaint form with data:', complaintData);
                navigate('/complaint-form', { 
                  state: { ...complaintData }  // Spread operator to ensure we pass a new object
                });
              } else {
                console.log('No matching complaint data found for post:', post);
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
  }, [token, selectedCategories, selectedProvince, navigate]);

  if (error) {
    return <MapError error={error} />;
  }

  return (
    <div className="w-full h-full">
      <div ref={mapContainer} className="w-full h-full rounded-lg" />
    </div>
  );
};

export default Map;
