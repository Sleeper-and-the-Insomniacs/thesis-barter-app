/* eslint-disable react/jsx-one-expression-per-line */
import React from 'react';

import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import Chip from '@mui/material/Chip';

import { formatPostDate } from '../../utils/utils';
import type { PostData } from './ManagePosts';

import PostActionsMenu from './PostActionsMenu';

interface PostProps {
  post: PostData;
  onReport: () => void;
}

export default function Post({ post, onReport }: PostProps) {
  const postUser = post.user.name ?? post.user.email;

  return (
    <Card variant="outlined" sx={{ borderRadius: 3, borderColor: '#e0e0e0' }}>
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
            <PostActionsMenu onReport={onReport} />
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
}
