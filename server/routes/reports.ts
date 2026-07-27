import { Router } from 'express';
import { prisma } from '../db/index.js';
import { screenContent, decideAutoAction } from '../services/moderation.js';
import requireAuth from '../middleware/requireAuth.js';
import requireModerator from '../middleware/requireModerator.js';
import { TargetType, ReportReason, ReportStatus } from '../db/generated/enums.js';

const reports = Router();

// File a report (any logged-in user)
reports.post('/', requireAuth, async (req, res) => {
  try {
    const {
      targetType, targetId, reason, details,
    } = req.body;

    if (!(targetType in TargetType) || !(reason in ReportReason)) {
      res.status(400).json({ error: 'Invalid targetType or reason' });
      return;
    }

    // Find the reported content's text so Gemini has something to read
    let text: string | null = null;
    if (targetType === TargetType.POST) {
      const post = await prisma.post.findUnique({ where: { id: targetId } });
      if (!post) {
        res.status(404).json({ error: 'Post not found' });
        return;
      }
      text = post.message;
    } else if (targetType === TargetType.MESSAGE) {
      const message = await prisma.message.findUnique({ where: { id: targetId } });
      if (!message) {
        res.status(404).json({ error: 'Message not found' });
        return;
      }
      text = message.text;
    } else {
      const target = await prisma.user.findUnique({ where: { id: targetId } });
      if (!target) {
        res.status(404).json({ error: 'User not found' });
        return;
      }
    }

    // Create report first and then screen. If Gemini fails, the report will still exist
    const report = await prisma.report.create({
      data: {
        reporterId: req.user!.id,
        targetType,
        postId: targetType === TargetType.POST ? targetId : null,
        messageId: targetType === TargetType.MESSAGE ? targetId : null,
        targetUserId: targetType === TargetType.USER ? targetId : null,
        reason,
        details: details || null,
      },
    });

    const screening = text ? await screenContent(text) : null;
    const autoAction = screening ? decideAutoAction(screening) : null;

    const reportUpdate = prisma.report.update({
      where: { id: report.id },
      data: {
        aiScore: screening?.score ?? null,
        aiCategories: screening?.categories ?? [],
        aiRationale: screening?.rationale ?? null,
        ...(autoAction ? {
          status: autoAction.status,
          resolution: autoAction.resolution,
          resolvedAt: new Date(),
        } : {}),
      },
    });

    const extraUpdates = [];
    if (autoAction?.status === ReportStatus.REMOVED && report.postId) {
      extraUpdates.push(prisma.post.update({
        where: { id: report.postId },
        data: { isRemoved: true },
      }));
    }

    if (autoAction?.status === ReportStatus.REMOVED && report.messageId) {
      extraUpdates.push(prisma.message.update({
        where: { id: report.messageId },
        data: { isRemoved: true },
      }));
    }
    const [scored] = await prisma.$transaction([reportUpdate, ...extraUpdates]);

    res.status(201).json(scored);
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});

// Moderator queue
reports.get('/', requireModerator, async (req, res) => {
  try {
    const status = typeof req.query.status === 'string' && req.query.status in ReportStatus
      ? req.query.status as ReportStatus
      : undefined;

    const queue = await prisma.report.findMany({
      where: status ? { status } : undefined,
      include: {
        reporter: { select: { id: true, name: true } },
        post: true,
        targetUser: { select: { id: true, name: true } },
        resolver: { select: { id: true, name: true } },
        message: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(queue);
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});

// Resolve a report
reports.patch('/:id', requireModerator, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { action } = req.body;

    if (action !== 'approve' && action !== 'remove') {
      res.status(400).json({ error: 'action must be "approve" or "remove"' });
      return;
    }

    const report = await prisma.report.findUnique({ where: { id } });
    if (!report) {
      res.status(404).json({ error: 'Report not found' });
      return;
    }

    const isRemove = action === 'remove';
    const reportUpdate = prisma.report.update({
      where: { id },
      data: {
        status: isRemove ? ReportStatus.REMOVED : ReportStatus.APPROVED,
        resolution: isRemove ? 'Removed by moderator' : 'Approved: no action needed',
        resolverId: req.user!.id,
        resolvedAt: new Date(),
      },
    });

    const extraUpdates = [];
    if (report.postId) {
      extraUpdates.push(prisma.post.update({
        where: { id: report.postId },
        data: { isRemoved: isRemove },
      }));
    }
    if (report.messageId) {
      extraUpdates.push(prisma.message.update({
        where: { id: report.messageId },
        data: { isRemoved: isRemove },
      }));
    }
    const [resolved] = await prisma.$transaction([reportUpdate, ...extraUpdates]);

    res.json(resolved);
  } catch (err) {
    console.error('PATCH /reports/:id failed:', err);
    res.sendStatus(500);
  }
});

export default reports;
