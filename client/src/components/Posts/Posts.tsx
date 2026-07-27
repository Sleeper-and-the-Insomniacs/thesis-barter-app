/* eslint-disable react/jsx-one-expression-per-line */
import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';

import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import InputBase from '@mui/material/InputBase';
import Paper from '@mui/material/Paper';
import Chip from '@mui/material/Chip';

import NewPost, { type PostFormData } from './NewPost';
import { formatPostDate } from '../../utils/utils';
import ManagePosts, { type PostData, type PostUpdateData } from './ManagePosts';
import { useAuth } from '../../context/AuthContext';

import PostActionsMenu from './PostActionsMenu';
import ReportDialog from './ReportDialog';

// type definitions
type Category = {
  id: number;
  name: string;
  type: 'PRODUCT' | 'SERVICE';
};

// dummy categories data
const categoryList: Category[] = [
  { id: 1, name: 'Books', type: 'PRODUCT' },
  { id: 2, name: 'Clothing, Shoes, Accessories', type: 'PRODUCT' },
  { id: 3, name: 'Collectibles', type: 'PRODUCT' },
  { id: 4, name: 'Electronics', type: 'PRODUCT' },
  { id: 5, name: 'Food and Perishables', type: 'PRODUCT' },
  { id: 6, name: 'Free/Giving Away', type: 'PRODUCT' },
  { id: 7, name: 'Handmade', type: 'PRODUCT' },
  { id: 8, name: 'Household', type: 'PRODUCT' },
  { id: 9, name: 'Movies, Music, Games', type: 'PRODUCT' },
  { id: 10, name: 'Refurbished', type: 'PRODUCT' },
  { id: 11, name: 'Services', type: 'SERVICE' },
  { id: 12, name: 'Sports & Outdoors', type: 'PRODUCT' },
  { id: 13, name: 'Pet Supplies', type: 'PRODUCT' },
];

export default function Posts() {
  const { user } = useAuth();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [completedOpen, setCompletedOpen] = useState(false);

  const [posts, setPosts] = useState<PostData[]>([]);
  const [ownedPosts, setOwnedPosts] = useState<PostData[]>([]);

  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [reportDialogPostId, setReportDialogPostId] = useState<number | null>(null);

  const toggleDrawer = (open: boolean) => () => {
    setDrawerOpen(open);
  };

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
        message: formData.description,
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
      {/* Category Menu Bar (located under navbar) */}
      <Box
        sx={{
          width: '100vw',
          position: 'relative',
          left: '50%',
          right: '50%',
          marginLeft: '-50vw',
          marginRight: '-50vw',
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          px: { xs: 2, md: 4 },
          py: 0.5,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          overflowX: 'auto',
          whiteSpace: 'nowrap',
          mb: 3,
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
        }}
      >
        <Button
          onClick={toggleDrawer(true)}
          startIcon={<MenuIcon />}
          sx={{
            color: 'inherit',
            fontWeight: 'bold',
            textTransform: 'none',
            minWidth: 'auto',
            flexShrink: 0,
            '&:hover': { outline: '1px solid' },
          }}
        >
          All
        </Button>
        {categoryList.map((category) => (
          <Button
            key={category.id}
            sx={{
              color: 'inherit',
              textTransform: 'none',
              fontSize: '0.875rem',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              '&:hover': { outline: '1px solid' },
            }}
          >
            {category.name}
          </Button>
        ))}
      </Box>

      {/* Search Bar */}
      <Box
        component="form"
        onSubmit={handleSearch}
        sx={{
          display: 'flex', gap: 1, mb: 3, px: { xs: 2, md: 0 },
        }}
      >
        <Paper
          variant="outlined"
          sx={{
            display: 'flex', alignItems: 'center', px: 1.5, py: 0.25, flex: 1,
          }}
        >
          <InputBase
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search for listings..."
            sx={{ flex: 1, fontSize: '0.85rem' }}
          />
        </Paper>

        {/* Search Button (next to the Search Bar) */}
        <Button
          type="submit"
          variant="contained"
          sx={{ textTransform: 'none', fontWeight: 'bold' }}
        >
          Search
        </Button>
      </Box>

      {/* Side Menu (drawer that pops out similar to a modal) */}
      <Drawer anchor="left" open={drawerOpen} onClose={toggleDrawer(false)}>
        <Box sx={{ width: 300, height: '100%', bgcolor: 'background.paper' }} role="presentation">
          <Box sx={{
            p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: 'primary.main', color: 'primary.contrastText',
          }}
          >
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              Hello, {user?.name ?? user?.email ?? 'Guest'}
            </Typography>
            <IconButton onClick={toggleDrawer(false)} sx={{ color: 'inherit' }}>
              <CloseIcon />
            </IconButton>
          </Box>
          <Typography
            variant="subtitle1"
            sx={{
              fontWeight: 'bold', px: 2, pt: 2, pb: 1,
            }}
          >
            Categories
          </Typography>
          <List sx={{ pt: 0 }}>
            {categoryList.map((category) => (
              <ListItem key={category.id} disablePadding>
                <ListItemButton onClick={toggleDrawer(false)}>
                  <ListItemText
                    primary={category.name}
                    slotProps={{
                      primary: {
                        sx: { fontSize: '0.9rem' },
                      },
                    }}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>

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

        {posts.map((post) => {
          const postUser = post.user.name ?? post.user.email;

          return (
            <Card key={post.id} variant="outlined" sx={{ borderRadius: 3, borderColor: '#e0e0e0' }}>
              <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                <Box sx={{
                  display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: { xs: 'flex-start', sm: 'space-between' }, alignItems: { xs: 'stretch', sm: 'flex-start' }, mb: 2, gap: { xs: 1, sm: 2 },
                }}
                >
                  {/* title, date, "Trade Complete" chip */}
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Box sx={{
                      display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: 1.5,
                    }}
                    >

                      <Typography variant="h5" sx={{ fontWeight: 'bold', wordBreak: 'break-word' }}>
                        {post.title}
                      </Typography>

                      {post.isComplete && (
                        <Chip
                          size="small"
                          color="success"
                          label="Trade Completed"
                        />
                      )}
                    </Box>

                    <Typography variant="caption" color="text.secondary">
                      {((post.updatedAt && post.updatedAt !== post.createdAt) && `Updated on ${formatPostDate(post.updatedAt)}`) || `Posted on ${formatPostDate(post.createdAt)}`}
                    </Typography>
                  </Box>

                  {/* user avatar, name, DM button and report modal */}
                  <Box sx={{
                    display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0, flexWrap: 'wrap',
                  }}
                  >
                    <Avatar sx={{
                      bgcolor: 'primary.main', width: 32, height: 32, fontSize: '0.9rem',
                    }}
                    >
                      {postUser.charAt(0).toUpperCase()}
                    </Avatar>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      {postUser}
                    </Typography>
                    <Button size="small" variant="outlined" sx={{ borderRadius: 4, textTransform: 'none' }}>
                      Open DM
                    </Button>
                    <PostActionsMenu onReport={() => setReportDialogPostId(post.id)} />
                  </Box>
                </Box>

                <Typography variant="body1" sx={{ mb: 3, lineHeight: 1.6 }}>
                  {post.message}
                </Typography>

                <Divider sx={{ mb: 2 }} />

                <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: '600', color: 'text.secondary' }}>
                  Comments
                </Typography>

                {post.comments.length > 0 ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {post.comments.map((comment) => (
                      <Box
                        key={comment.id}
                        sx={{
                          display: 'flex', gap: 2, alignItems: 'flex-start', p: 1.5, bgcolor: '#f4f6f8', borderRadius: 2,
                        }}
                      >
                        <Typography variant="body2" sx={{ flex: 1 }}>
                          {comment.text}
                        </Typography>

                        <Button size="small" sx={{ textTransform: 'none', minWidth: 'auto' }}>DM</Button>
                      </Box>
                    ))}
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.disabled" sx={{ mb: 2, fontStyle: 'italic' }}>
                    No comments...
                  </Typography>
                )}

                <Box sx={{ display: 'flex', mt: 3, gap: 1 }}>
                  <TextField
                    size="small"
                    fullWidth
                    placeholder="Add a comment..."
                    variant="outlined"
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 8 } }}
                  />
                  <Button variant="contained" disableElevation sx={{ borderRadius: 8, textTransform: 'none' }}>
                    Send
                  </Button>
                </Box>
              </CardContent>
            </Card>
          );
        })}
      </Box>

      {/* NewPost Modal */}
      <NewPost
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleCreatePost}
        categories={categoryList}
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
