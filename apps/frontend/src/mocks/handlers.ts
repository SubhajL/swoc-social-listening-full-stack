import { http, HttpResponse } from 'msw';
import { CategoryName } from '@/types/processed-post';

export const handlers = [
  http.get('/api/posts/unprocessed', () => {
    return HttpResponse.json({
      data: [
        {
          processed_post_id: '1',
          category_name: CategoryName.REPORT_INCIDENT,
          sub1_category_name: 'น้ำท่วม',
          location: {
            latitude: 13.7563,
            longitude: 100.5018,
            source: 'coordinates',
            province: 'กรุงเทพมหานคร',
            irrigation_office: 'สำนักงานชลประทานที่ 11'
          },
          status: 'unprocessed',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ]
    });
  })
]; 