import React from 'react';
import { ProcessedPost } from '../types/processed-post';
import { formatDateString } from '../utils/date-helpers';

export const PostItem: React.FC<{ post: ProcessedPost }> = ({ post }) => {
  return (
    <div>
      <p>Created: {formatDateString(post.created_at)}</p>
      <p>Updated: {formatDateString(post.updated_at)}</p>
    </div>
  );
}; 