/* eslint-disable react/jsx-one-expression-per-line */
import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';

import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import AddIcon from '@mui/icons-material/Add';

import NewPost, { type PostFormData } from './NewPost';
import ManagePosts, { type PostData, type PostUpdateData } from './ManagePosts';
import { useAuth } from '../../context/AuthContext';
import Post from './Post';
import ReportDialog from './ReportDialog';
import SearchPosts from './SearchPosts';

export default function Posts() {
  const { user } = useAuth();

  const [modalOpen, setModalOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [completedOpen, setCompletedOpen] = useState(false);

  const [posts, setPosts] = useState<PostData[]>([]);
  const [ownedPosts, setOwnedPosts] = useState<PostData[]>([]);

  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [reportDialogPostId, setReportDialogPostId] = useState<number | null>(null);

  // get posts and optionally send the search value (this is a general search)
  const loadPosts = useCallback(async (searchValue = '') => {
    try {
      setError('');
      const response = await axios.get<PostData[]>('/posts', {
        params: {
          q: searchValue,
        },
      });
      setPosts(Array.isArray(response.data) ? response.data : []);
    } catch (requestError) {
      console.error('Failed to get posts:', requestError);
      setPosts([]);
      setError('Failed to get posts');
    }
  }, []);

  // get all posts belonging to the logged-in user (this is a specific search)
  const loadOwnedPosts = useCallback(async () => {
    if (!user) {
      setOwnedPosts([]);
      return;
    }
    try {
      const response = await axios.get<PostData[]>('/posts');
      const currentUserPosts = response.data.filter(
        (post) => post.userId === user.id,
      );
      setOwnedPosts(currentUserPosts);
    } catch (requestError) {
      console.error('Failed to get user posts:', requestError);
      setError('Failed to get your posts');
    }
  }, [user]);

  useEffect(() => {
    loadPosts().catch((requestError) => {
      console.error('Failed to load posts:', requestError);
    });
  }, [loadPosts]);

  // search posts
  const handleSearch = (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    loadPosts(search).catch((requestError) => {
      console.error('Failed to search posts:', requestError);
    });
  };

  // create a post
  const handleCreatePost = async (formData: PostFormData) => {
    try {
      setError('');

      await axios.post('/posts', {
        title: formData.title,
        name: formData.name,
        offerType: formData.offerType,
        category: formData.category,
        message: formData.description,
        condition: formData.condition,
        images: formData.images ?? [],
        isLocal: formData.isLocal,
        zipCode: formData.zipCode,
        radiusMiles: formData.radiusMiles,
      });

      await Promise.all([
        loadPosts(search),
        loadOwnedPosts(),
      ]);
    } catch (requestError) {
      console.error('Failed to create post:', requestError);
      setError('Failed to create post');
      throw requestError;
    }
  };

  // update a post
  const handleUpdatePost = async (
    postId: number,
    postData: PostUpdateData,
  ) => {
    try {
      setError('');

      await axios.patch(`/posts/${postId}`, postData);

      await Promise.all([
        loadPosts(search),
        loadOwnedPosts(),
      ]);
    } catch (requestError) {
      console.error('Failed to update post:', requestError);
      setError('Failed to update post');
    }
  };

  // delete a post
  const handleDeletePost = async (postId: number) => {
    try {
      setError('');

      await axios.delete(`/posts/${postId}`);

      await Promise.all([
        loadPosts(search),
        loadOwnedPosts(),
      ]);
    } catch (requestError) {
      console.error('Failed to delete post:', requestError);
      setError('Failed to delete post');
    }
  };

  // mark a trade as complete
  const handleCompleteTrade = async (postId: number) => {
    try {
      setError('');

      await axios.patch(`/posts/${postId}/complete`);

      await Promise.all([
        loadPosts(search),
        loadOwnedPosts(),
      ]);
    } catch (requestError) {
      console.error('Failed to complete trade:', requestError);
      setError('Failed to complete trade');
    }
  };

  const handleOpenManagePosts = async () => {
    await loadOwnedPosts();
    setManageOpen(true);
  };

  const handleOpenCompletedTrades = async () => {
    await loadOwnedPosts();
    setCompletedOpen(true);
  };

  const manageablePosts = ownedPosts.filter(
    (post) => !post.isComplete,
  );

  const completedPosts = ownedPosts.filter(
    (post) => post.isComplete,
  );

  return (
    <Box sx={{ width: '100%', mt: -4 }}>

      {/* Search Bar */}
      <SearchPosts
        search={search}
        onSearchChange={setSearch}
        onSubmit={handleSearch}
      />

      {/* all of the Buttons underneath Search and their lovely formatting */}
      <Box
        sx={{
          display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'minmax(0, 1fr) minmax(0, 1fr) auto' }, alignItems: 'center', gap: { xs: 1, sm: 1.5 }, mb: 3, px: { xs: 2, md: 0 },
        }}
      >
        {/* Completed Trades button */}
        <Button
          variant="contained"
          disabled={!user}
          onClick={() => handleOpenCompletedTrades()}
          sx={{
            width: '100%', borderRadius: 8, textTransform: 'none', fontWeight: 'bold', px: 3,
          }}
        >
          Completed Trades
        </Button>

        {/* Manage Posts button */}
        <Button
          variant="contained"
          disabled={!user}
          onClick={() => handleOpenManagePosts()}
          sx={{
            width: '100%', borderRadius: 8, textTransform: 'none', fontWeight: 'bold', px: 3,
          }}
        >
          Manage Posts
        </Button>

        {/* New Post Button */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            disabled={!user}
            onClick={() => setModalOpen(true)}
            sx={{
              width: { xs: '100%', sm: 'auto' }, borderRadius: 8, textTransform: 'none', fontWeight: 'bold', whiteSpace: 'nowrap', px: 3,
            }}
          >
            New Post
          </Button>
        </Box>
      </Box>

      {error && (
        <Typography
          color="error"
          sx={{
            mb: 2,
            px: { xs: 2, md: 0 },
          }}
        >
          {error}
        </Typography>
      )}

      {/* User Posts */}
      <Box sx={{
        display: 'flex', flexDirection: 'column', gap: 3, px: { xs: 2, md: 0 },
      }}
      >
        {posts.length === 0 && (
          <Typography color="text.secondary">
            No posts found.
          </Typography>
        )}

        {posts.map((post) => (
          <Post
            key={post.id}
            post={post}
            onReport={() => setReportDialogPostId(post.id)}
          />
        ))}
      </Box>

      {/* NewPost Modal */}
      <NewPost
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleCreatePost}
      />

      {/* Manage Posts Modal */}
      <ManagePosts
        open={manageOpen}
        onClose={() => setManageOpen(false)}
        posts={manageablePosts}
        onUpdate={handleUpdatePost}
        onDelete={handleDeletePost}
        onComplete={handleCompleteTrade}
      />

      {/* Completed Trades Modal */}
      <ManagePosts
        open={completedOpen}
        onClose={() => setCompletedOpen(false)}
        posts={completedPosts}
        title="Completed Trades"
        readOnly
      />

      <ReportDialog
        open={reportDialogPostId !== null}
        onClose={() => setReportDialogPostId(null)}
        targetType="POST"
        targetId={reportDialogPostId ?? 0}
      />
    </Box>
  );
}
