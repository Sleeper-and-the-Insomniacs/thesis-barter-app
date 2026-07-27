import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Chip from '@mui/material/Chip';
import { useToast } from '../../context/ToastContext';

type Status = 'PENDING' | 'APPROVED' | 'REMOVED' | 'ALL';

interface ReportRow {
  id: number;
  targetType: 'POST' | 'USER' | 'MESSAGE';
  reason: string;
  details: string | null;
  aiScore: number | null;
  aiCategories: string[];
  aiRationale: string | null;
  status: 'PENDING' | 'APPROVED' | 'REMOVED';
  resolution: string | null;
  resolverId: number | null;
  createdAt: string;
  reporter: { id: number; name: string | null };
  post: { id: number; message: string; isRemoved: boolean } | null;
  targetUser: { id: number; name: string | null } | null;
  message: { id: number; text: string; isRemoved: boolean } | null;
  resolver: { id: number; name: string | null } | null;
}

const tabs: Status[] = ['PENDING', 'APPROVED', 'REMOVED', 'ALL'];

export default function ModQueue() {
  const { showToast } = useToast();
  const [status, setStatus] = useState<Status>('PENDING');
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [resolvingId, setResolvingId] = useState<number | null>(null);

  useEffect(() => {
    async function loadReports() {
      try {
        const query = status === 'ALL' ? '' : `?status=${status}`;
        const res = await fetch(`/reports${query}`, { credentials: 'include' });
        if (!res.ok) throw new Error('Failed to load reports');
        setReports(await res.json());
      } catch {
        showToast("Couldn't load reports", 'error');
      }
    }
    loadReports();
  }, [status, showToast]);

  const handleResolve = async (id: number, action: 'approve' | 'remove') => {
    setResolvingId(id);
    try {
      await axios.patch(`/reports/${id}`, { action }, { withCredentials: true });
      showToast(action === 'remove' ? 'Content removed' : 'Report approved', 'success');
      setReports((prev) => prev.filter((r) => r.id !== id));
    } catch {
      showToast("Couldn't resolve report - check your connection and try again.", 'error');
    } finally {
      setResolvingId(null);
    }
  };

  const targetSnippet = (report: ReportRow) => {
    if (report.targetType === 'POST') return report.post?.message ?? '(post not found)';
    if (report.targetType === 'MESSAGE') return report.message?.text ?? '(message not found)';
    return `User: ${report.targetUser?.name ?? 'user not found)'}`;
  };

  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
        Moderation Queue
      </Typography>

      <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
        {tabs.map((t) => (
          <Button
            key={t}
            variant={status === t ? 'contained' : 'outlined'}
            size="small"
            onClick={() => setStatus(t)}
            sx={{ textTransform: 'none' }}
          >
            {t === 'ALL' ? 'ALL' : t.charAt(0) + t.slice(1).toLowerCase()}
          </Button>
        ))}
      </Box>

      {reports.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          No reports in this view.
        </Typography>
      )}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {reports.map((report) => (
          <Card key={report.id} variant="outlined" sx={{ borderRadius: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  {report.targetType}
                  {' '}
                  *
                  {report.reason.replace(/_/g, ' ')}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {new Date(report.createdAt).toLocaleString()}
                </Typography>
              </Box>

              <Typography variant="body2" sx={{ mb: 1 }}>
                {targetSnippet(report)}
              </Typography>

              {report.details && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontStyle: 'italic' }}>
                  Reporter note:
                  {' '}
                  {report.details}
                </Typography>
              )}

              <Typography variant="caption" color="text.secondary">
                Reported by
                {' '}
                {report.reporter.name ?? `User #${report.reporter.id}`}
              </Typography>

              <Divider sx={{ my: 1.5 }} />

              {report.aiScore !== null ? (
                <Box sx={{ mb: 1.5 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    Gemini score:
                    {' '}
                    {report.aiScore.toFixed(2)}
                  </Typography>
                  {report.aiCategories.length > 0 && (
                    <Box sx={{
                      display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5,
                    }}
                    >
                      {report.aiCategories.map((c) => (
                        <Chip key={c} label={c} size="small" />
                      ))}
                    </Box>
                  )}
                  {report.aiRationale && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    {report.aiRationale}
                  </Typography>
                  )}
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, fontStyle: 'italic' }}>
                  No AI screening for this report.
                </Typography>
              )}

              {report.status !== 'PENDING' && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                {report.status === 'REMOVED' ? 'Removed' : 'Approved'}
                by
                {' '}
                {report.resolverId === null ? 'Auto (Gemini)' : (report.resolver?.name ?? `Moderator #${report.resolverId}`)}
                {report.resolution ? ` - ${report.resolution}` : ''}
              </Typography>
              )}

              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  size="small"
                  variant="outlined"
                  disabled={resolvingId === report.id}
                  onClick={() => handleResolve(report.id, 'approve')}
                >
                  Approve
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  color="error"
                  disabled={resolvingId === report.id}
                  onClick={() => handleResolve(report.id, 'remove')}
                >
                  Remove
                </Button>
              </Box>
            </CardContent>
          </Card>
        ))}
      </Box>
    </Box>
  );
}
