import { CreatePostForm } from "@/components/content/create-post-form";
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Create New Post',
  description: 'Write a new article or market analysis.',
};

export default function NewPostPage() {
  return <CreatePostForm />;
}
