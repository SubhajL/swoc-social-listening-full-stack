import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
config({ path: path.resolve(__dirname, '../../.env') });

// Import functions to test
import {
  normalizeThaiText,
  createSearchQueries,
  isWithinThailand,
  fetchCoordinatesWithRetry
} from './update_location_data_enhanced';

describe('Location Update Functions', () => {
  describe('normalizeThaiText', () => {
    it('should normalize Thai text correctly', () => {
      const tests = [
        {
          input: 'กรุงเทพมหานคร',
          expected: 'กรงเทพมหานคร'
        },
        {
          input: 'เชียงใหม่',
          expected: 'เชยงใหม'
        },
        {
          input: ' ภูเก็ต ',
          expected: 'ภเกต'
        }
      ];

      tests.forEach(({ input, expected }) => {
        expect(normalizeThaiText(input)).toBe(expected);
      });
    });
  });

  describe('createSearchQueries', () => {
    it('should create correct queries for Bangkok province', () => {
      const data = {
        name_th: 'กรุงเทพมหานคร',
        name_en: 'Bangkok'
      };

      const queries = createSearchQueries('province', data);
      expect(queries).toContain('ศาลาว่าการกรุงเทพมหานคร');
      expect(queries).toContain('Bangkok City Hall Thailand');
    });

    it('should create correct queries for normal province', () => {
      const data = {
        name_th: 'เชียงใหม่',
        name_en: 'Chiang Mai'
      };

      const queries = createSearchQueries('province', data);
      expect(queries).toContain('ศาลากลางจังหวัดเชยงใหม');
      expect(queries).toContain('Chiang Mai Provincial Hall Thailand');
    });

    it('should create correct queries for Bangkok district', () => {
      const data = {
        name_th: 'จตุจักร',
        name_en: 'Chatuchak',
        province_name_th: 'กรุงเทพมหานคร',
        province_name_en: 'Bangkok'
      };

      const queries = createSearchQueries('amphure', data);
      expect(queries).toContain('สำนักงานเขตจตจกร');
      expect(queries).toContain('Chatuchak District Office Bangkok');
    });

    it('should create correct queries for normal district', () => {
      const data = {
        name_th: 'เมืองเชียงใหม่',
        name_en: 'Mueang Chiang Mai',
        province_name_th: 'เชียงใหม่',
        province_name_en: 'Chiang Mai'
      };

      const queries = createSearchQueries('amphure', data);
      expect(queries).toContain('ที่ว่าการอำเภอเมองเชยงใหม');
      expect(queries).toContain('Mueang Chiang Mai District Chiang Mai Thailand');
    });
  });

  describe('isWithinThailand', () => {
    it('should return true for coordinates within Thailand', () => {
      // Bangkok coordinates
      expect(isWithinThailand(13.7563, 100.5018)).toBe(true);
      // Chiang Mai coordinates
      expect(isWithinThailand(18.7883, 98.9853)).toBe(true);
      // Phuket coordinates
      expect(isWithinThailand(7.8804, 98.3923)).toBe(true);
    });

    it('should return false for coordinates outside Thailand', () => {
      // Singapore coordinates
      expect(isWithinThailand(1.3521, 103.8198)).toBe(false);
      // Tokyo coordinates
      expect(isWithinThailand(35.6762, 139.6503)).toBe(false);
      // London coordinates
      expect(isWithinThailand(51.5074, -0.1278)).toBe(false);
    });
  });

  describe('fetchCoordinatesWithRetry', () => {
    // Skip these tests if no API key is present
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      it.skip('Skipping geocoding tests - No API key present', () => {});
      return;
    }

    it('should find coordinates for Bangkok City Hall', async () => {
      const queries = [
        'ศาลาว่าการกรุงเทพมหานคร',
        'Bangkok City Hall Thailand'
      ];
      
      const coordinates = await fetchCoordinatesWithRetry(queries);
      expect(coordinates).not.toBeNull();
      if (coordinates) {
        expect(isWithinThailand(coordinates.lat, coordinates.lng)).toBe(true);
        // Rough check for Bangkok area
        expect(coordinates.lat).toBeCloseTo(13.75, 1);
        expect(coordinates.lng).toBeCloseTo(100.50, 1);
      }
    });

    it('should find coordinates for Chiang Mai Provincial Hall', async () => {
      const queries = [
        'ศาลากลางจังหวัดเชียงใหม่',
        'Chiang Mai Provincial Hall Thailand'
      ];
      
      const coordinates = await fetchCoordinatesWithRetry(queries);
      expect(coordinates).not.toBeNull();
      if (coordinates) {
        expect(isWithinThailand(coordinates.lat, coordinates.lng)).toBe(true);
        // Rough check for Chiang Mai area
        expect(coordinates.lat).toBeCloseTo(18.79, 1);
        expect(coordinates.lng).toBeCloseTo(98.98, 1);
      }
    });

    it('should handle invalid locations gracefully', async () => {
      const queries = [
        'ไม่มีสถานที่นี้จริงๆ ประเทศไทย',
        'This place does not exist Thailand'
      ];
      
      const coordinates = await fetchCoordinatesWithRetry(queries);
      expect(coordinates).toBeNull();
    });
  });
}); 