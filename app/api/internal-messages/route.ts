import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import prisma from '@/lib/prisma'
import { requireAuthAndRole } from '@/lib/api-helpers'
import { hasPermission } from '@/lib/permissions'

export async function GET(req: NextRequest) {
  const { error, hospitalId, user } = await requireAuthAndRole()
  const userId = user?.id
  if (error || !hospitalId || !userId) return error || NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const conversationId = new URL(req.url).searchParams.get('conversationId')

  if (!conversationId) {
    const conversations = await prisma.$queryRawUnsafe<any[]>(`
      SELECT c.id,c.name,c.isGroup,c.isBroadcast,c.updatedAt,
        COALESCE((SELECT m.body FROM InternalMessage m WHERE m.conversationId=c.id ORDER BY m.createdAt DESC LIMIT 1),'') lastMessage,
        COALESCE((SELECT m.createdAt FROM InternalMessage m WHERE m.conversationId=c.id ORDER BY m.createdAt DESC LIMIT 1),c.createdAt) lastMessageAt,
        (SELECT COUNT(*) FROM InternalMessage m WHERE m.conversationId=c.id AND m.senderId<>? AND (cm.lastReadAt IS NULL OR m.createdAt>cm.lastReadAt)) unreadCount,
        GROUP_CONCAT(DISTINCT u.name ORDER BY u.name SEPARATOR ', ') memberNames
      FROM InternalConversation c
      JOIN InternalConversationMember cm ON cm.conversationId=c.id AND cm.userId=?
      LEFT JOIN InternalConversationMember allm ON allm.conversationId=c.id
      LEFT JOIN User u ON u.id=allm.userId AND u.id<>?
      WHERE c.hospitalId=?
      GROUP BY c.id,c.name,c.isGroup,c.isBroadcast,c.updatedAt,cm.lastReadAt,c.createdAt
      ORDER BY lastMessageAt DESC
    `, userId, userId, userId, hospitalId)
    return NextResponse.json({ success: true, data: conversations })
  }

  const members = await prisma.$queryRawUnsafe<any[]>(`SELECT id FROM InternalConversationMember WHERE conversationId=? AND userId=? LIMIT 1`, conversationId, userId)
  if (!members.length) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const rows = await prisma.$queryRawUnsafe<any[]>(`
    SELECT m.id,m.body,m.attachmentUrl,m.isUrgent,m.createdAt,m.senderId,u.name senderName
    FROM InternalMessage m JOIN User u ON u.id=m.senderId
    JOIN InternalConversation c ON c.id=m.conversationId
    WHERE m.conversationId=? AND c.hospitalId=? ORDER BY m.createdAt ASC LIMIT 500
  `, conversationId, hospitalId)

  await prisma.$executeRawUnsafe(`UPDATE InternalConversationMember SET lastReadAt=NOW(3) WHERE conversationId=? AND userId=?`, conversationId, userId)
  return NextResponse.json({ success: true, data: rows })
}

export async function POST(req: NextRequest) {
  const { error, hospitalId, user } = await requireAuthAndRole()
  const userId = user?.id
  if (error || !hospitalId || !userId) return error || NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const body = await req.json()

  if (body.action === 'createConversation') {
    const requestedIds = Array.isArray(body.participantIds) ? body.participantIds.map(String) : []
    const isBroadcast = Boolean(body.isBroadcast)

    if (isBroadcast) {
      const allowed = await hasPermission({ hospitalId, role: user.role, permission: 'messages.broadcast' })
      if (!allowed) return NextResponse.json({ error: 'Diffusion générale non autorisée' }, { status: 403 })
    }

    let participantIds = requestedIds
    if (isBroadcast) {
      const users = await prisma.user.findMany({
        where: { hospitalId, isActive: true },
        select: { id: true },
      })
      participantIds = users.map((u) => u.id)
    } else if (participantIds.length) {
      const validUsers = await prisma.user.findMany({
        where: { id: { in: participantIds }, hospitalId, isActive: true },
        select: { id: true },
      })
      participantIds = validUsers.map((u) => u.id)
    }

    if (!isBroadcast && participantIds.length === 0) {
      return NextResponse.json({ error: 'Sélectionnez au moins un destinataire' }, { status: 400 })
    }

    const conversationId = randomUUID()
    await prisma.$executeRawUnsafe(
      `INSERT INTO InternalConversation (id,hospitalId,name,isGroup,isBroadcast,createdById,createdAt,updatedAt) VALUES (?,?,?,?,?,?,NOW(3),NOW(3))`,
      conversationId, hospitalId, body.name || null, participantIds.length > 1, isBroadcast, userId
    )
    const allMembers = Array.from(new Set([userId, ...participantIds]))
    for (const memberId of allMembers) {
      await prisma.$executeRawUnsafe(`INSERT IGNORE INTO InternalConversationMember (id,conversationId,userId,joinedAt) VALUES (?,?,?,NOW(3))`, randomUUID(), conversationId, memberId)
    }
    return NextResponse.json({ success: true, conversationId })
  }

  const conversationId = String(body.conversationId || '')
  const message = String(body.message || '').trim()
  if (!conversationId || !message) return NextResponse.json({ error: 'Message requis' }, { status: 400 })

  const member = await prisma.$queryRawUnsafe<any[]>(`SELECT id FROM InternalConversationMember WHERE conversationId=? AND userId=? LIMIT 1`, conversationId, userId)
  if (!member.length) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  await prisma.$executeRawUnsafe(
    `INSERT INTO InternalMessage (id,conversationId,senderId,body,attachmentUrl,isUrgent,createdAt) VALUES (?,?,?,?,?,?,NOW(3))`,
    randomUUID(), conversationId, userId, message, body.attachmentUrl || null, Boolean(body.isUrgent)
  )
  await prisma.$executeRawUnsafe(`UPDATE InternalConversation SET updatedAt=NOW(3) WHERE id=? AND hospitalId=?`, conversationId, hospitalId)
  return NextResponse.json({ success: true })
}
