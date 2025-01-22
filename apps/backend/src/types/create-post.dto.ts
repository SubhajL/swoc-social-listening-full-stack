export interface CreatePostDTO {
  category_name: string;
  sub1_category_name: string;
  location: {
    latitude: number;
    longitude: number;
    source: 'coordinates';
    tumbon?: string;
    amphure?: string;
    province?: string;
  };
} 