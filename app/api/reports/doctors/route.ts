import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireAuthAndRole } from '@/lib/api-helpers'

export async function GET(req: NextRequest) {
  const { error, hospitalId } = await requireAuthAndRole(['ADMIN', 'ACCOUNTANT', 'DOCTOR'])
  if (error || !hospitalId) return error || NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const url = new URL(req.url)
  const month = url.searchParams.get('month') || new Date().toISOString().slice(0, 7)
  const start = new Date(`${month}-01T00:00:00`)
  const end = new Date(start)
  end.setMonth(end.getMonth() + 1)

  const rows = await prisma.$queryRawUnsafe<any[]>(`
    SELECT
      s.id doctorId,
      CONCAT(s.firstName,' ',s.lastName) doctorName,
      COUNT(DISTINCT a.id) appointments,
      COUNT(DISTINCT CASE WHEN a.status='COMPLETED' THEN a.id END) completedAppointments,
      COUNT(DISTINCT CASE WHEN a.status='NO_SHOW' THEN a.id END) noShows,
      COUNT(DISTINCT t.patientId) patientsSeen,
      COUNT(DISTINCT CASE WHEN p.createdAt >= ? AND p.createdAt < ? THEN p.id END) newPatients,
      CAST(COALESCE(SUM(t.cost),0) AS DECIMAL(12,2)) generatedRevenue,
      CAST(COALESCE(SUM(rc.amountPaid),0) AS DECIMAL(12,2)) collectedRevenue,
      CAST(COALESCE(SUM(rc.amount - rc.amountPaid - rc.discount),0) AS DECIMAL(12,2)) outstanding,
      CAST(COALESCE(AVG(TIMESTAMPDIFF(MINUTE,t.startTime,t.endTime)),0) AS DECIMAL(10,2)) avgTreatmentMinutes
    FROM Staff s
    LEFT JOIN Appointment a ON a.doctorId=s.id AND a.scheduledDate >= ? AND a.scheduledDate < ?
    LEFT JOIN Treatment t ON t.doctorId=s.id AND t.createdAt >= ? AND t.createdAt < ?
    LEFT JOIN Patient p ON p.id=t.patientId
    LEFT JOIN ReceptionCharge rc ON rc.doctorId=s.id AND rc.sentAt >= ? AND rc.sentAt < ?
    WHERE s.hospitalId=? AND s.isActive=1
    GROUP BY s.id,s.firstName,s.lastName
    ORDER BY generatedRevenue DESC
  `, start, end, start, end, start, end, start, end, hospitalId)

  return NextResponse.json({ success: true, month, currency: 'MAD', data: rows })
}
