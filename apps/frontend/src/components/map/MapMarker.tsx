import mapboxgl from "mapbox-gl";
import { getCategoryColor } from "./utils";

interface MapMarkerProps {
  post: {
    id: number;
    category: string;
    province: string;
    location: {
      latitude: number;
      longitude: number;
    };
  };
  map: mapboxgl.Map;
  onClick: () => void;
}

const MapMarker = ({ post, map, onClick }: MapMarkerProps) => {
  // Create marker element
  const el = document.createElement('div');
  el.className = 'marker';
  el.style.width = '24px';
  el.style.height = '24px';
  el.style.borderRadius = '50%';
  el.style.backgroundColor = getCategoryColor(post.category);
  el.style.display = 'flex';
  el.style.alignItems = 'center';
  el.style.justifyContent = 'center';
  el.style.color = 'white';
  el.style.cursor = 'pointer';

  // Add click handler
  if (onClick) {
    el.addEventListener('click', onClick);
  }

  // Convert location to LngLatLike format [longitude, latitude]
  const coordinates: [number, number] = [post.location.longitude, post.location.latitude];

  // Add marker to map
  const marker = new mapboxgl.Marker(el)
    .setLngLat(coordinates)
    .setPopup(
      new mapboxgl.Popup({ offset: 25 })
        .setHTML(`<h3>${post.category}</h3><p>${post.province}</p>`)
    )
    .addTo(map);

  return marker;
};

export default MapMarker;
