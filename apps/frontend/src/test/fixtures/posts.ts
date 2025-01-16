export const mockPost = {
  processed_post_id: '123',
  category_name: 'Test Category',
  sub1_category_name: 'Test Sub Category',
  location: {
    latitude: 13.7563,
    longitude: 100.5018,
    source: 'coordinates' as const
  },
  status: 'unprocessed' as const,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
}; 