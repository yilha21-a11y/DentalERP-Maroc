import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { requireAuthAndRole } from '@/lib/api-helpers'
import { hasPermission } from '@/lib/permissions'

const createConversationSchema = z.object({
  action: z.literal('createConversation'),
  participantIds: z.array(z.string().min(1)).max(100).default([]),
  isBroadcast: z.boolean().optional().default(false),
  name: z.string().trim().max(120).nullable().optional(),
})

const sendMessageSchema = z.object({
  conversationId: z.string().min(1),
  message: z.string().trim().min(1).max(10000),
  attachmentUrl: z
    .string()
    .max(2048)
    .refine((value) => value.startsWith('/api/uploads/'), 'Pièce jointe invalide')
    .nullable()
    .optional(),
  isUrgent: z.boolean().optional().default(false),
})

export async function GET(req: NextRequest) {
  const { error, hospitalId, user } = await requireAuthAndRole()
  const userId = user?.id
  if (error || !hospitalId || !userId) {
    return error || NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const conversationId = new URL(req.url).searchParams.get('conversationId')

  if (!conversationId) {
    const memberships = await prisma.internalConversationMember.findMany({
      where: {
        userId,
        conversation: { hospitalId },
      },
      include: {
        conversation: {
          include: {
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: { body: true, createdAt: true },
            },
            members: {
              include: {
                user: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    })

    const data = await Promise.all(
      memberships.map(async (membership) => {
        const conversation = membership.conversation
        const unreadCount = await prisma.internalMessage.count({
          where: {
            conversationId: conversation.id,
            senderId: { not: userId },
            ...(membership.lastReadAt
              ? { createdAt: { gt: membership.lastReadAt } }
              : {}),
          },
        })
        const last = conversation.messages[0]
        return {
          id: conversation.id,
          name: conversation.name,
          isGroup: conversation.isGroup,
          isBroadcast: conversation.isBroadcast,
          updatedAt: conversation.updatedAt,
          lastMessage: last?.body || '',
          lastMessageAt: last?.createdAt || conversation.createdAt,
          unreadCount,
          memberNames: conversation.members
            .filter((member) => member.user.id !== userId)
            .map((member) => member.user.name)
            .sort((a, b) => a.localeCompare(b, 'fr'))
            .join(', '),
        }
      })
    )

    data.sort(
      (a, b) =>
        new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
    )
    return NextResponse.json({ success: true, data })
  }

  const membership = await prisma.internalConversationMember.findFirst({
    where: {
      conversationId,
      userId,
      conversation: { hospitalId },
    },
    select: { id: true },
  })
  if (!membership) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const rows = await prisma.internalMessage.findMany({
    where: {
      conversationId,
      conversation: { hospitalId },
    },
    include: {
      sender: { select: { name: true } },
    },
    orderBy: { createdAt: 'asc' },
    take: 500,
  })

  await prisma.internalConversationMember.update({
    where: { id: membership.id },
    data: { lastReadAt: new Date() },
  })

  return NextResponse.json({
    success: true,
    data: rows.map((message) => ({
      id: message.id,
      body: message.body,
      attachmentUrl: message.attachmentUrl,
      isUrgent: message.isUrgent,
      createdAt: message.createdAt,
      senderId: message.senderId,
      senderName: message.sender.name,
    })),
  })
}

export async function POST(req: NextRequest) {
  const { error, hospitalId, user } = await requireAuthAndRole()
  const userId = user?.id
  if (error || !hospitalId || !userId) {
    return error || NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const body = await req.json()

  if (body?.action === 'createConversation') {
    const parsed = createConversationSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Données de conversation invalides' }, { status: 400 })
    }

    const { isBroadcast, name } = parsed.data
    let participantIds = [...new Set(parsed.data.participantIds)]

    if (isBroadcast) {
      const allowed = await hasPermission({
        hospitalId,
        role: user.role,
        permission: 'messages.broadcast',
      })
      if (!allowed) {
        return NextResponse.json({ error: 'Diffusion générale non autorisée' }, { status: 403 })
      }

      const users = await prisma.user.findMany({
        where: { hospitalId, isActive: true },
        select: { id: true },
      })
      participantIds = users.map((entry) => entry.id)
    } else {
      const validUsers = await prisma.user.findMany({
        where: {
          id: { in: participantIds },
          hospitalId,
          isActive: true,
        },
        select: { id: true },
      })
      participantIds = validUsers.map((entry) => entry.id)
    }

    if (!isBroadcast && participantIds.length === 0) {
      return NextResponse.json(
        { error: 'Sélectionnez au moins un destinataire' },
        { status: 400 }
      )
    }

    const allMembers = [...new Set([userId, ...participantIds])]
    const conversation = await prisma.internalConversation.create({
      data: {
        hospitalId,
        name: name || null,
        isGroup: allMembers.length > 2,
        isBroadcast,
        createdById: userId,
        members: {
          create: allMembers.map((memberId) => ({ userId: memberId })),
        },
      },
      select: { id: true },
    })

    return NextResponse.json({ success: true, conversationId: conversation.id })
  }

  const parsed = sendMessageSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Message invalide' }, { status: 400 })
  }

  const membership = await prisma.internalConversationMember.findFirst({
    where: {
      conversationId: parsed.data.conversationId,
      userId,
      conversation: { hospitalId },
    },
    select: { id: true },
  })
  if (!membership) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  await prisma.$transaction([
    prisma.internalMessage.create({
      data: {
        conversationId: parsed.data.conversationId,
        senderId: userId,
        body: parsed.data.message,
        attachmentUrl: parsed.data.attachmentUrl || null,
        isUrgent: parsed.data.isUrgent,
      },
    }),
    prisma.internalConversation.update({
      where: { id: parsed.data.conversationId },
      data: { updatedAt: new Date() },
    }),
  ])

  return NextResponse.json({ success: true })
}
