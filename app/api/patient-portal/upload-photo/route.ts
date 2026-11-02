import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePatientAuth } from '@/lib/patient-auth'
import { randomUUID } from 'crypto'
import { buildStorageKey, getStorage } from '@/lib/storage'
import { extensionForMime, validateImageSignature } from '@/lib/file-security'
import { z } from 'zod'

/**
 * POST /api/patient-portal/upload-photo
 * Patient uploads an intraoral/dental photo for triage.
 * Stores as a Document of type PHOTO, notifies doctor.
 */
export async function POST(req: NextRequest) {
  const { error, patient } = await requirePatientAuth(req)
  if (error) return error

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const meta = z.object({
      description: z.string().trim().max(2000).nullable().optional(),
      category: z.enum(['pain', 'swelling', 'bleeding', 'other']).nullable().optional(),
    }).safeParse({
      description: formData.get('description'),
      category: formData.get('category'),
    })
    if (!meta.success) {
      return NextResponse.json({ error: 'Métadonnées invalides' }, { status: 400 })
    }
    const { description, category } = meta.data

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate image type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Only JPEG, PNG, and WebP images are accepted' },
        { status: 400 }
      )
    }

    // Max 10MB
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size must be under 10MB' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    if (!validateImageSignature(buffer, file.type)) {
      return NextResponse.json({ error: 'Le contenu du fichier image est invalide' }, { status: 400 })
    }

    const ext = extensionForMime(file.type)
    if (!ext) {
      return NextResponse.json({ error: 'Format d’image non pris en charge' }, { status: 400 })
    }

    const fileName = `${randomUUID()}${ext}`
    const key = buildStorageKey(patient!.hospitalId, 'patients', patient!.id, 'triage', fileName)

    await getStorage().put(key, buffer, { contentType: file.type })

    // Create Document record
    const fullDescription = [category ? `Triage category: ${category}` : null, description]
      .filter(Boolean)
      .join(' — ')

    // On failure, drop the bytes again rather than leaving a file with no row
    // pointing at it — see the same guard in the staff upload route.
    let document
    try {
      document = await prisma.document.create({
        data: {
          hospitalId: patient!.hospitalId,
          patientId: patient!.id,
          fileName,
          originalName: file.name,
          fileType: file.type,
          fileSize: file.size,
          filePath: key,
          documentType: 'PHOTO',
          description: fullDescription || 'Photo envoyée par le patient pour triage',
          uploadedBy: `patient:${patient!.id}`,
        },
      })
    } catch (err) {
      await getStorage()
        .delete(key)
        .catch(() => {})
      throw err
    }

    // Notify doctor(s) — find any active doctor for the hospital
    const doctors = await prisma.user.findMany({
      where: {
        hospitalId: patient!.hospitalId,
        role: 'DOCTOR' as any,
        isActive: true,
      },
      select: { id: true },
      take: 3,
    })

    if (doctors.length > 0) {
      await prisma.notification.createMany({
        data: doctors.map((doc) => ({
          hospitalId: patient!.hospitalId,
          userId: doc.id,
          title: 'Nouvelle photo patient à examiner',
          message: `${patient!.firstName} ${patient!.lastName} a envoyé une photo${category ? ` (${category})` : ''}. ${description || 'À examiner.'}`,
          type: 'GENERAL' as any,
          entityType: 'Document',
          entityId: document.id,
        })),
      })
    }

    return NextResponse.json(
      {
        success: true,
        document: {
          id: document.id,
          fileName: document.originalName,
          description: document.description,
        },
      },
      { status: 201 }
    )
  } catch (err: any) {
    console.error('Photo upload error:', err)
    return NextResponse.json({ error: 'Impossible d’envoyer la photo' }, { status: 500 })
  }
}
