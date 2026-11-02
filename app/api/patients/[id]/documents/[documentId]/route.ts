import { NextRequest, NextResponse } from 'next/server'
import { requireAuthAndRole } from '@/lib/api-helpers'
import prisma from '@/lib/prisma'
import { getStorage, StorageNotFoundError, toStorageKey } from '@/lib/storage'
import { safeDownloadName } from '@/lib/file-security'
import { DocumentType } from '@prisma/client'
import { z } from 'zod'

// GET /api/patients/[id]/documents/[documentId] - Get/download a specific document
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; documentId: string }> }
) {
  const { error, hospitalId } = await requireAuthAndRole()

  if (error || !hospitalId) {
    return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id, documentId } = await params

    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        patientId: id,
        hospitalId,
      },
    })

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    const { searchParams } = new URL(req.url)
    const download = searchParams.get('download') === 'true'

    // If just requesting metadata, return the document info
    if (!download) {
      return NextResponse.json({
        success: true,
        document,
      })
    }

    // If download requested, serve the file.
    //
    // `filePath` exists in three historical shapes and toStorageKey accepts
    // all of them. That is what makes patient-portal triage photos downloadable
    // at all: they were written without the `/uploads` prefix that the previous
    // `path.join(process.cwd(), document.filePath)` arithmetic assumed, so this
    // endpoint answered 404 for every one of them.
    let object
    try {
      object = await getStorage().get(toStorageKey(document.filePath))
    } catch (err) {
      if (err instanceof StorageNotFoundError) {
        return NextResponse.json({ error: 'File not found in storage' }, { status: 404 })
      }
      throw err
    }

    const safeName = safeDownloadName(document.originalName)
    const encodedName = encodeURIComponent(document.originalName.replace(/[\r\n\0]/g, ''))

    return new NextResponse(new Uint8Array(object.body), {
      headers: {
        'Content-Type': document.fileType,
        'Content-Disposition': `attachment; filename="${safeName}"; filename*=UTF-8''${encodedName}`,
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'private, no-store',
        // The stored size, not the recorded one — they disagree if a file was
        // ever replaced out of band, and a wrong Content-Length truncates.
        'Content-Length': object.size.toString(),
      },
    })
  } catch (error: any) {
    console.error('Error fetching document:', error)
    return NextResponse.json({ error: 'Impossible de charger le document' }, { status: 500 })
  }
}

// PATCH /api/patients/[id]/documents/[documentId] - Update document metadata
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; documentId: string }> }
) {
  const { error, hospitalId } = await requireAuthAndRole()

  if (error || !hospitalId) {
    return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id, documentId } = await params

    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        patientId: id,
        hospitalId,
      },
    })

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    const parsed = z.object({
      description: z.string().trim().max(4000).nullable().optional(),
      documentType: z.enum(['XRAY', 'CT_SCAN', 'PHOTO', 'CONSENT_FORM', 'PRESCRIPTION', 'LAB_REPORT', 'INSURANCE', 'ID_PROOF', 'OTHER']).optional(),
      treatmentId: z.string().min(1).nullable().optional(),
    }).safeParse(await req.json())

    if (!parsed.success) {
      return NextResponse.json({ error: 'Métadonnées invalides' }, { status: 400 })
    }

    if (parsed.data.treatmentId) {
      const treatment = await prisma.treatment.findFirst({
        where: { id: parsed.data.treatmentId, patientId: id, hospitalId },
        select: { id: true },
      })
      if (!treatment) {
        return NextResponse.json({ error: 'Traitement associé invalide' }, { status: 400 })
      }
    }

    const updateData: {
      description?: string | null
      documentType?: DocumentType
      treatmentId?: string | null
    } = {}

    if (parsed.data.description !== undefined) updateData.description = parsed.data.description
    if (parsed.data.documentType) updateData.documentType = parsed.data.documentType as DocumentType
    if (parsed.data.treatmentId !== undefined) updateData.treatmentId = parsed.data.treatmentId

    const updatedDocument = await prisma.document.update({
      where: { id: documentId },
      data: updateData,
    })

    return NextResponse.json({
      success: true,
      document: updatedDocument,
    })
  } catch (error: any) {
    console.error('Error updating document:', error)
    return NextResponse.json({ error: 'Impossible de modifier le document' }, { status: 500 })
  }
}

// DELETE /api/patients/[id]/documents/[documentId] - Delete a document
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; documentId: string }> }
) {
  const { error, hospitalId } = await requireAuthAndRole()

  if (error || !hospitalId) {
    return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id, documentId } = await params

    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        patientId: id,
        hospitalId,
      },
    })

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    const { searchParams } = new URL(req.url)
    const permanent = searchParams.get('permanent') === 'true'

    if (permanent) {
      // Remove the bytes before the row. Deletes are idempotent by driver
      // contract, so a file that is already gone is not an error — which is
      // what the previous existsSync guard was really for. It also meant a
      // triage photo, whose stored path never resolved, was skipped silently
      // and left on disk after its record said it was permanently deleted.
      await getStorage().delete(toStorageKey(document.filePath))

      // Delete from database
      await prisma.document.delete({
        where: { id: documentId },
      })

      return NextResponse.json({
        success: true,
        message: 'Document permanently deleted',
      })
    } else {
      // Soft delete (archive)
      await prisma.document.update({
        where: { id: documentId },
        data: { isArchived: true },
      })

      return NextResponse.json({
        success: true,
        message: 'Document archived',
      })
    }
  } catch (error: any) {
    console.error('Error deleting document:', error)
    return NextResponse.json({ error: 'Impossible de supprimer le document' }, { status: 500 })
  }
}
