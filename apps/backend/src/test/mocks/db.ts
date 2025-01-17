import { Pool } from 'pg';

export const mockPool = {
  query: jest.fn(),
  connect: jest.fn(),
  end: jest.fn(),
} as unknown as Pool; 