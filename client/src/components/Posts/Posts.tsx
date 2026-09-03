import React, {
  useCallback, useEffect, useRef, useState,
} from 'react';
import axios from 'axios';

import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

import { type PostData, type PostUpdateData } from './ManagePosts';
import type { TradeRequestData } from '../Trades/RequestTradeButton';
import { useAuth } from '../../context/AuthContext';
import { useParams } from '../../context/RouterContext';
import Post from './Post';
import ReportDialog from './ReportDialog';
import SearchPosts from './SearchPosts';
import SearchPostsAdvanced, {
  EMPTY_ADVANCED_SEARCH,
  type AdvancedSearchFilters,
} from './SearchPostsAdvanced';
import { useSocket } from '../../context/SocketContext';
import { useToast } from '../../context/ToastContext';

const POSTS_PER_PAGE = 10;

interface MyArtTradeOffer {
  id: number;
  postId: number;
  status: string;
}

export default function Posts() {
  const { user, blockedUserIds } = useAuth();
  const socket = useSocket();
  const { showToast } = useToast();
  const { postId: highlightPostIdParam } = useParams();
  const highlightPostId = highlightPostIdParam ? Number(highlightPostIdParam) : undefined;

  const [posts, setPosts] = useState<PostData[]>([]);
  const [myTradeRequests, setMyTradeRequests] = useState<TradeRequestData[]>([]);
  const [myArtTradeOffers, setMyArtTradeOffers] = useState<MyArtTradeOffer[]>([]);

  const [search, setSearch] = useState('');
  const [advancedSearch, setAdvancedSearch] = useState<AdvancedSearchFilters>(
    EMPTY_ADVANCED_SEARCH,
  );
  const [advancedSearchOpen, setAdvancedSearchOpen] = useState(false);
  const [advancedSearchActive, setAdvancedSearchActive] = useState(false);
  const [error, setError] = useState('');
  const [reportDialogPostId, setReportDialogPostId] = useState<number | null>(null);
  const [hasMorePosts, setHasMorePosts] = useState(false);
  const loadMorePostsRef = useRef<HTMLDivElement | null>(null);
  const loadingMorePostsRef = useRef(false);

  // get posts and optionally send the search value (this is a general search)
  const loadPosts = useCallback(async (
    searchValue = '',
    filters: AdvancedSearchFilters = EMPTY_ADVANCED_SEARCH,
    isAdvancedSearch = false,
    offset = 0,
    append = false,
  ) => {
    if (append && loadingMorePostsRef.current) return;

    if (append) loadingMorePostsRef.current = true;

    try {
      setError('');
      const response = await axios.get<PostData[]>('/posts', {
        params: {
          q: isAdvancedSearch ? filters.searchText : searchValue,
          listingType: filters.listingType || undefined,
          condition: filters.condition || undefined,
          hasImages: filters.hasImages || undefined,
          includeCompleted: filters.includeCompleted || undefined,
          excludeInactive: filters.excludeInactive || undefined,
          includeOwn: filters.includeOwn || undefined,
          advancedSearch: isAdvancedSearch || undefined,
          dateMode: filters.dateMode || undefined,
          dateStart: filters.dateStart || undefined,
          dateEnd: filters.dateMode === 'between'
            ? filters.dateEnd || undefined
            : undefined,
          category: filters.category || undefined,
          distanceRange: filters.distanceRange || undefined,
          distancePostalCode: filters.distancePostalCode || undefined,
          offset,
          limit: POSTS_PER_PAGE,
        },
      });
      const loadedPosts = Array.isArray(response.data) ? response.data : [];
      setPosts((currentPosts) => (append ? [...currentPosts, ...loadedPosts] : loadedPosts));
      setHasMorePosts(loadedPosts.length === POSTS_PER_PAGE);
    } catch (requestError) {
      console.error('Failed to get posts:', requestError);
      if (!append) setPosts([]);
      const message = axios.isAxiosError(requestError) && requestError.response?.data?.error
        ? requestError.response.data.error
        : 'Failed to get posts';
      setError(message);
    } finally {
      if (append) loadingMorePostsRef.current = false;
    }
  }, []);

  useEffect(() => {
    loadPosts(search, advancedSearch, advancedSearchActive);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadPosts, blockedUserIds]);

  const loadMyTradeRequests = useCallback(async () => {
    if (!user) { setMyTradeRequests([]); return; }
    try {
      const response = await axios.get<TradeRequestData[]>('/trade-requests/mine');
      setMyTradeRequests(Array.isArray(response.data) ? response.data : []);
    } catch (requestError) {
      console.error('Failed to get your trade requests:', requestError);
    }
  }, [user]);

  const loadMyArtTradeOffers = useCallback(async () => {
    if (!user) { setMyArtTradeOffers([]); return; }
    try {
      const response = await axios.get<MyArtTradeOffer[]>('/artTradeOffers/sent', {
        withCredentials: true,
      });
      setMyArtTradeOffers(Array.isArray(response.data) ? response.data : []);
    } catch (requestError) {
      console.error('Failed to get your art trade offers:', requestError);
    }
  }, [user]);

  useEffect(() => {
    loadMyTradeRequests().catch((requestError) => {
      console.error('Failed to load trade requests', requestError);
    });
  }, [loadMyTradeRequests]);

  useEffect(() => {
    loadMyArtTradeOffers().catch((requestError) => {
      console.error('Failed to load art trade offers', requestError);
    });
  }, [loadMyArtTradeOffers]);

  const handleTradeActivity = async () => {
    await Promise.all([
      loadPosts(search, advancedSearch, advancedSearchActive),
      loadMyTradeRequests(),
      loadMyArtTradeOffers(),
    ]);
  };

  useEffect(() => {
    if (!socket) return undefined;
    const handleChange = () => {
      loadPosts(search, advancedSearch, advancedSearchActive);
    };
    socket.on('posts:changed', handleChange);
    return () => {
      socket.off('posts:changed', handleChange);
    };
  }, [socket, search, advancedSearch, advancedSearchActive, loadPosts]);

  // Comment screening only ever emits into the author's own socket room, so
  // this is always about a comment the current user just posted.
  useEffect(() => {
    if (!socket || !user) return undefined;
    const handleCommentScreened = (payload: {
      targetType: string; targetId: number; ok: boolean; rationale?: string;
    }) => {
      if (payload.targetType !== 'COMMENT' || payload.ok) return;
      showToast(
        `Your comment was removed for violating our community guidelines${payload.rationale ? `: ${payload.rationale}` : '.'}`,
        'error',
      );
    };
    socket.on('content:screened', handleCommentScreened);
    return () => { socket.off('content:screened', handleCommentScreened); };
  }, [socket, user, showToast]);
  useEffect(() => {
    if (!highlightPostId) return;
    document.getElementById(`post-${highlightPostId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [highlightPostId, posts]);

  useEffect(() => {
    const loadMoreTarget = loadMorePostsRef.current;

    if (!loadMoreTarget || !hasMorePosts) return undefined;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) {
        loadPosts(search, advancedSearch, advancedSearchActive, posts.length, true);
      }
    }, { rootMargin: '300px 0px' });

    observer.observe(loadMoreTarget);

    return () => observer.disconnect();
  }, [hasMorePosts, loadPosts, search, advancedSearch, advancedSearchActive, posts.length]);

  // search posts
  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAdvancedSearch(EMPTY_ADVANCED_SEARCH);
    setAdvancedSearchActive(false);
    loadPosts(search, EMPTY_ADVANCED_SEARCH);
  };

  const handleAdvancedSearch = (filters: AdvancedSearchFilters) => {
    setSearch('');
    setAdvancedSearch(filters);
    setAdvancedSearchActive(true);
    setAdvancedSearchOpen(false);
    loadPosts('', filters, true);
  };

  const handleAdvancedSearchCancel = () => {
    setSearch('');
    setAdvancedSearch(EMPTY_ADVANCED_SEARCH);
    setAdvancedSearchActive(false);
    setAdvancedSearchOpen(false);
    loadPosts('', EMPTY_ADVANCED_SEARCH);
  };

  // update a post
  const handleUpdatePost = async (
    postId: number,
    postData: PostUpdateData,
  ) => {
    try {
      setError('');
      await axios.patch(`/posts/${postId}`, postData);
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
    } catch (requestError) {
      console.error('Failed to delete post:', requestError);
      setError('Failed to delete post');
    }
  };

  return (
    <Box sx={{ width: '100%', mt: -4 }}>

      {/* Search Bar */}
      <SearchPosts
        search={search}
        onSearchChange={setSearch}
        onSubmit={handleSearch}
        onAdvancedSearchClick={() => setAdvancedSearchOpen(true)}
      />

      <SearchPostsAdvanced
        open={advancedSearchOpen}
        onClose={handleAdvancedSearchCancel}
        filters={advancedSearch}
        onApply={handleAdvancedSearch}
      />

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
            myTradeRequests={
              myTradeRequests.find(
                (r) => r.postId === post.id && r.status === 'PENDING',
              ) ?? null
            }
            myArtTradeOffer={
              myArtTradeOffers.find(
                (offer) => offer.postId === post.id && offer.status === 'PENDING',
              ) ?? null
            }
            onTradeActivity={handleTradeActivity}
            onOfferSubmitted={handleTradeActivity}
            onUpdate={handleUpdatePost}
            onDelete={handleDeletePost}
            highlight={post.id === highlightPostId}
          />
        ))}

        {hasMorePosts && <Box ref={loadMorePostsRef} sx={{ height: 1 }} />}
      </Box>

      <ReportDialog
        open={reportDialogPostId !== null}
        onClose={() => setReportDialogPostId(null)}
        targetType="POST"
        targetId={reportDialogPostId ?? 0}
      />
    </Box>
  );
}
