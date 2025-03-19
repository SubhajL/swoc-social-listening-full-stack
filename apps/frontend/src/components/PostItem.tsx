import { FC } from 'react';
import { ProcessedPost } from '../types/processed-post';
import { formatDateString } from '../utils/date-helpers';

export const PostItem = ({ post }: { post: ProcessedPost }) => {
  return (
    <div>
      <p>Created: {formatDateString(post.created_at)}</p>
      <p>Post Date: {formatDateString(post.post_date.toString())}</p>
    </div>
  );
}; 