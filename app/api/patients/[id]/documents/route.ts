import { NextRequest, NextResponse } from 'next/server'
import { requireAuthAndRole } from '@/lib/api-helpers'
import prisma from '@/lib/prisma'
import { randomUUID } from 'crypto'
import { buildStorageKey, getStorage } from '@/lib/storage'
import { extensionForMime, validateDocumentSignature } from '@/lib/file-security'
import { DocumentType } from '@prisma/client'
import { z } from 'zod'

// GET /api/patients/[id]/documents - Get all documents for a patient
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, hospitalId } = await requireAuthAndRole()

  if (error || !hospitalId) {
    return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params

    // Verify patient exists and belongs to this hospital
    const patient = await prisma.patient.findFirst({
      where: { id, hospitalId },
    })

    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 })
    }

    const { searchParams } = new URL(req.url)
    const documentType = searchParams.get('type')
    const treatmentId = searchParams.get('treatmentId')

    const where: any = {
      patientId: id,
      hospitalId,
      isArchived: false,
    }

    if (documentType) {
      where.documentType = documentType
    }

    if (treatmentId) {
      where.treatmentId = treatmentId
    }

    const documents = await prisma.document.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        treatment: {
          select: {
            id: true,
            procedureNotes: true,
            procedure: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      documents,
    })
  } catch (error: any) {
    console.error('Error fetching documents:', error)
    return NextResponse.json({ error: 'Impossible de charger les documents' }, { status: 500 })
  }
}

// POST /api/patients/[id]/documents - Upload a document
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, hospitalId, user } = await requireAuthAndRole()

  if (error || !hospitalId) {
    return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params

    // Verify patient exists and belongs to this hospital
    const patient = await prisma.patient.findFirst({
      where: { id, hospitalId },
    })

    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const meta = z.object({
      documentType: z.enum(['XRAY', 'CT_SCAN', 'PHOTO', 'CONSENT_FORM', 'PRESCRIPTION', 'LAB_REPORT', 'INSURANCE', 'ID_PROOF', 'OTHER']),
      description: z.string().trim().max(4000).nullable().optional(),
      treatmentId: z.string().min(1).nullable().optional(),
    }).safeParse({
      documentType: formData.get('documentType'),
      description: formData.get('description'),
      treatmentId: formData.get('treatmentId'),
    })

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!meta.success) {
      return NextResponse.json({ error: 'Métadonnées du document invalides' }, { status: 400 })
    }
    const { documentType, description, treatmentId } = meta.data

    // Validate file type
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ]

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'File type not allowed. Allowed types: JPEG, PNG, GIF, WebP, PDF, DOC, DOCX' },
        { status: 400 }
      )
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File size exceeds 10MB limit' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    if (!validateDocumentSignature(buffer, file.type)) {
      return NextResponse.json({ error: 'Le contenu du fichier ne correspond pas au format déclaré' }, { status: 400 })
    }

    const ext = extensionForMime(file.type)
    if (!ext) {
      return NextResponse.json({ error: 'Format de fichier non pris en charge' }, { status: 400 })
    }

    if (treatmentId) {
      const treatment = await prisma.treatment.findFirst({
        where: { id: treatmentId, hospitalId, patientId: id },
        select: { id: true },
      })
      if (!treatment) {
        return NextResponse.json({ error: 'Traitement associé invalide' }, { status: 400 })
      }
    }

    const fileName = `${randomUUID()}${ext}`
    const key = buildStorageKey(hospitalId, 'documents', id, fileName)
    await getStorage().put(key, buffer, { contentType: file.type })

    // Create document record. If this fails the bytes are already stored, so
    // drop them again — otherwise the file survives with no row pointing at
    // it: invisible in the UI, impossible to delete through it, and still
    // occupying storage. An invalid documentType is enough to trigger it.
    let document
    try {
      document = await prisma.document.create({
        data: {
          patientId: id,
          hospitalId,
          treatmentId: treatmentId || null,
          fileName,
          originalName: file.name,
          fileType: file.type,
          fileSize: file.size,
          filePath: key,
          documentType: documentType as DocumentType,
          description: description || null,
          uploadedBy: user?.id,
        },
      })
    } catch (err) {
      // Swallow a failure here: the original error is what the caller needs.
      await getStorage()
        .delete(key)
        .catch(() => {})
      throw err
    }

    return NextResponse.json({
      success: true,
      document,
    })
  } catch (error: any) {
    console.error('Error uploading document:', error)
    return NextResponse.json({ error: 'Impossible d’envoyer le document' }, { status: 500 })
  }
}
