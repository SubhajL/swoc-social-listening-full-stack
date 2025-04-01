import { atom, useAtom } from 'jotai';

interface LocationState {
  amphure: string | null;
  province: string | null;
}

const locationAtom = atom<LocationState>({
  amphure: "แม่แตง",
  province: "เชียงใหม่"
});

export const useLocationStore = () => {
  const [location, setLocation] = useAtom(locationAtom);

  const updateLocation = (newLocation: Partial<LocationState>) => {
    setLocation(prev => ({
      ...prev,
      ...newLocation
    }));
  };

  return {
    ...location,
    updateLocation
  };
}; 