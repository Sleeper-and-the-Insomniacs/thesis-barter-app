import React, {
  useMemo, useRef, useState,
} from 'react';
import axios from 'axios';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import Collapse from '@mui/material/Collapse';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';

import {
  hasCompletedLocationSetup,
  requestLocationSetup,
  useAuth,
} from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { useRouter } from '../../../context/RouterContext';
import UserAvatar from '../../common/UserAvatar';
import ConfirmDialog from '../../common/ConfirmDialog';
import CommentItem from './CommentItem';
import type { CommentData } from './types';

interface CommentsSectionProps {
  postId: number;
  comments: CommentData[];
  defaultExpanded?: boolean;
}

const TOP_LEVEL_PREVIEW = 4;
const REPLIES_PREVIEW = 2;

export default function CommentsSection({
  postId, comments, defaultExpanded = true,
}: CommentsSectionProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { navigate } = useRouter();

  const [expanded, setExpanded] = useState(defaultExpanded);
  const [commentDraft, setCommentDraft] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [replyTarget, setReplyTarget] = useState<CommentData | null>(null);
  const [visibleTopLevelCount, setVisibleTopLevelCount] = useState(TOP_LEVEL_PREVIEW);
  const [expandedReplyThreads, setExpandedReplyThreads] = useState<Set<number>>(new Set());
  // The composer rests as a quiet "Add a comment..." prompt (no field, no button) and
  // only opens into the real input once you click it, focus it, or start a reply.
  const [composerOpened, setComposerOpened] = useState(false);

  const composerInputRef = useRef<HTMLInputElement>(null);

  const isComposerOpen = composerOpened || commentDraft.length > 0 || replyTarget !== null;

  const childrenByParentId = useMemo(() => {
    const byParent = new Map<number | null, CommentData[]>();
    comments.forEach((comment) => {
      const forParent = byParent.get(comment.parentId) ?? [];
      forParent.push(comment);
      byParent.set(comment.parentId, forParent);
    });
    return byParent;
  }, [comments]);

  const topLevelComments = childrenByParentId.get(null) ?? [];

  const handleAddComment = async () => {
    if (!hasCompletedLocationSetup(user)) {
      requestLocationSetup();
      return;
    }

    const text = commentDraft.trim();
    if (!text) return;
    setSubmittingComment(true);
    try {
      await axios.post('/comments', {
        postId, text, parentId: replyTarget?.id,
      }, { withCredentials: true });
      setCommentDraft('');
      setReplyTarget(null);
    } catch (err) {
      const message = axios.isAxiosError(err) && err.response?.data?.error
        ? err.response.data.error
        : 'Could not add comment - try again.';
      showToast(message, 'error');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (confirmDeleteId === null) return;
    const commentId = confirmDeleteId;
    setDeletingCommentId(commentId);
    try {
      await axios.delete(`/comments/${commentId}`, { withCredentials: true });
    } catch {
      showToast('Could not delete comment - try again.', 'error');
    } finally {
      setDeletingCommentId(null);
      setConfirmDeleteId(null);
    }
  };

  // Shared by "click the quiet prompt" and "click Reply on a comment" - both need the
  // composer open and focused, just from different starting points.
  const openComposer = () => {
    if (!hasCompletedLocationSetup(user)) {
      requestLocationSetup();
      return;
    }

    setComposerOpened(true);
    requestAnimationFrame(() => {
      composerInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      composerInputRef.current?.focus();
    });
  };

  const startReply = (comment: CommentData) => {
    if (!hasCompletedLocationSetup(user)) {
      requestLocationSetup();
      return;
    }

    setReplyTarget(comment);
    openComposer();
  };

  const toggleRepliesExpanded = (parentId: number) => {
    setExpandedReplyThreads((prev) => {
      const next = new Set(prev);
      if (next.has(parentId)) next.delete(parentId); else next.add(parentId);
      return next;
    });
  };

  const renderComment = (comment: CommentData, depth: number) => {
    const children = childrenByParentId.get(comment.id) ?? [];
    const childrenExpanded = expandedReplyThreads.has(comment.id)
      || children.length <= REPLIES_PREVIEW;
    const visibleChildren = childrenExpanded ? children : children.slice(0, REPLIES_PREVIEW);
    const hiddenChildCount = children.length - visibleChildren.length;

    return (
      <React.Fragment key={comment.id}>
        <CommentItem
          comment={comment}
          isReply={depth > 0}
          canDelete={comment.userId === user?.id}
          deleting={deletingCommentId === comment.id}
          onNavigateToProfile={(userId) => navigate(`/profile/${userId}`)}
          onRequestDelete={setConfirmDeleteId}
          onReply={user ? startReply : undefined}
        />

        {children.length > 0 && (
          <Box sx={{
            pl: 2.5, borderLeft: '2px solid', borderColor: 'divider', ml: 1,
          }}
          >
            {visibleChildren.map((child) => renderComment(child, depth + 1))}
            {hiddenChildCount > 0 && (
              <Typography
                variant="caption"
                onClick={() => toggleRepliesExpanded(comment.id)}
                sx={{
                  display: 'block', color: 'primary.main', cursor: 'pointer', fontWeight: 600, py: 0.5, '&:hover': { textDecoration: 'underline' },
                }}
              >
                {`View ${hiddenChildCount} more ${hiddenChildCount === 1 ? 'reply' : 'replies'}`}
              </Typography>
            )}
          </Box>
        )}
      </React.Fragment>
    );
  };

  const remainingTopLevel = topLevelComments.length - visibleTopLevelCount;

  return (
    <Box sx={{ mt: 3 }}>
      <Box
        onClick={() => setExpanded((prev) => !prev)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setExpanded((prev) => !prev);
          }
        }}
        role="button"
        tabIndex={0}
        aria-label={expanded ? 'Collapse comments' : 'Expand comments'}
        sx={{
          display: 'flex', alignItems: 'center', gap: 0.25, cursor: 'pointer', mb: expanded ? 1 : 0, userSelect: 'none', width: 'fit-content',
        }}
      >
        <ExpandMoreIcon
          fontSize="small"
          sx={{
            color: 'text.secondary',
            transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)',
            transition: 'transform 0.15s ease',
          }}
        />
        <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
          {`Comments${comments.length > 0 ? ` (${comments.length})` : ''}`}
        </Typography>
      </Box>

      {expanded && (
        <>
          {topLevelComments.length > 0 ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', mb: 1.5 }}>
              {topLevelComments.slice(0, visibleTopLevelCount).map((comment) => (
                <Box
                  key={comment.id}
                  sx={{
                    borderTop: '1px solid', borderColor: 'divider', pt: 0.75, '&:first-of-type': { borderTop: 'none', pt: 0 },
                  }}
                >
                  {renderComment(comment, 0)}
                </Box>
              ))}
            </Box>
          ) : (
            <Typography variant="body2" color="text.disabled" sx={{ mb: 2, fontStyle: 'italic' }}>
              No comments...
            </Typography>
          )}

          {remainingTopLevel > 0 && (
            <Typography
              variant="body2"
              onClick={() => setVisibleTopLevelCount((prev) => prev + TOP_LEVEL_PREVIEW)}
              sx={{
                color: 'primary.main', cursor: 'pointer', fontWeight: 600, mb: 1.5, '&:hover': { textDecoration: 'underline' },
              }}
            >
              {`Show ${remainingTopLevel} more ${remainingTopLevel === 1 ? 'comment' : 'comments'}`}
            </Typography>
          )}

          {user && (
            <Box>
              <Collapse in={!isComposerOpen} timeout={120} unmountOnExit>
                <Box
                  onClick={openComposer}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      openComposer();
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label="Add a comment"
                  sx={{
                    display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer',
                  }}
                >
                  <UserAvatar user={user} size={22} />
                  <Typography variant="body2" sx={{ color: 'text.disabled' }}>
                    Add a comment...
                  </Typography>
                </Box>
              </Collapse>

              <Collapse in={isComposerOpen} timeout={120} unmountOnExit>
                <Box>
                  {replyTarget && (
                    <Box sx={{
                      display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5,
                    }}
                    >
                      <Typography variant="caption" color="text.secondary">
                        {`Replying to ${replyTarget.user.name ?? replyTarget.user.email}`}
                      </Typography>
                      <IconButton size="small" aria-label="Cancel reply" onClick={() => setReplyTarget(null)}>
                        <CloseIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    </Box>
                  )}
                  <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1 }}>
                    <TextField
                      size="small"
                      fullWidth
                      autoFocus
                      inputRef={composerInputRef}
                      placeholder={replyTarget ? `Reply to ${replyTarget.user.name ?? replyTarget.user.email}...` : 'Add a comment...'}
                      variant="standard"
                      value={commentDraft}
                      disabled={submittingComment}
                      onChange={(e) => setCommentDraft(e.target.value)}
                      onBlur={() => {
                        if (!commentDraft.length && !replyTarget) setComposerOpened(false);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleAddComment();
                        } else if (e.key === 'Escape') {
                          if (replyTarget) setReplyTarget(null);
                          else if (!commentDraft.length) setComposerOpened(false);
                        }
                      }}
                    />
                    <IconButton
                      size="small"
                      aria-label="Post comment"
                      disabled={submittingComment || !commentDraft.trim()}
                      onClick={handleAddComment}
                      sx={{
                        width: 30,
                        height: 30,
                        bgcolor: commentDraft.trim() ? 'primary.main' : 'action.disabledBackground',
                        color: commentDraft.trim() ? 'primary.contrastText' : 'text.disabled',
                        '&:hover': {
                          bgcolor: commentDraft.trim() ? 'primary.dark' : 'action.disabledBackground',
                        },
                      }}
                    >
                      {submittingComment
                        ? <CircularProgress size={16} color="inherit" />
                        : <SendIcon sx={{ fontSize: 15 }} />}
                    </IconButton>
                  </Box>
                </Box>
              </Collapse>
            </Box>
          )}
        </>
      )}

      <ConfirmDialog
        open={confirmDeleteId !== null}
        title="Delete comment?"
        message="This will permanently delete your comment. This can't be undone."
        confirmLabel="Delete"
        loading={deletingCommentId !== null}
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </Box>
  );
}
