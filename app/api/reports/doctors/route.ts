import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireAuthAndRole } from '@/lib/api-helpers'

export async function GET(req: NextRequest) {
  const { error, hospitalId, user } = await requireAuthAndRole(['ADMIN', 'ACCOUNTANT', 'DOCTOR'])
  if (error || !hospitalId || !user) return error || NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const url = new URL(req.url)
  const month = url.searchParams.get('month') || new Date().toISOString().slice(0, 7)
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: 'Mois invalide. Format attendu: YYYY-MM' }, { status: 400 })
  }

  const start = new Date(`${month}-01T00:00:00`)
  const end = new Date(start)
  end.setMonth(end.getMonth() + 1)

  const staffFilter = user.role === 'DOCTOR' ? ' AND s.userId = ?' : ''
  const params: unknown[] = [
    start, end,      // appointments
    start, end,      // new patients inside treatment aggregate
    start, end,      // treatments
    start, end,      // reception charges
    hospitalId,
  ]
  if (user.role === 'DOCTOR') params.push(user.id)

  const rows = await prisma.$queryRawUnsafe<any[]>(`
    SELECT
      s.id AS doctorId,
      CONCAT(s.firstName,' ',s.lastName) AS doctorName,
      COALESCE(a.appointments,0) AS appointments,
      COALESCE(a.completedAppointments,0) AS completedAppointments,
      COALESCE(a.noShows,0) AS noShows,
      COALESCE(t.patientsSeen,0) AS patientsSeen,
      COALESCE(t.newPatients,0) AS newPatients,
      COALESCE(t.generatedRevenue,0) AS generatedRevenue,
      COALESCE(rc.collectedRevenue,0) AS collectedRevenue,
      COALESCE(rc.outstanding,0) AS outstanding,
      COALESCE(t.avgTreatmentMinutes,0) AS avgTreatmentMinutes,
      COALESCE(t.treatmentCount,0) AS treatmentCount,
      CASE WHEN COALESCE(t.patientsSeen,0) > 0
        THEN ROUND(COALESCE(t.generatedRevenue,0) / t.patientsSeen, 2)
        ELSE 0 END AS avgRevenuePerPatient,
      CASE WHEN COALESCE(a.appointments,0) > 0
        THEN ROUND((COALESCE(a.noShows,0) / a.appointments) * 100, 1)
        ELSE 0 END AS noShowRate
    FROM Staff s
    LEFT JOIN (
      SELECT doctorId,
        COUNT(*) AS appointments,
        SUM(status='COMPLETED') AS completedAppointments,
        SUM(status='NO_SHOW') AS noShows
      FROM Appointment
      WHERE scheduledDate >= ? AND scheduledDate < ?
      GROUP BY doctorId
    ) a ON a.doctorId=s.id
    LEFT JOIN (
      SELECT t.doctorId,
        COUNT(*) AS treatmentCount,
        COUNT(DISTINCT t.patientId) AS patientsSeen,
        COUNT(DISTINCT CASE WHEN p.createdAt >= ? AND p.createdAt < ? THEN p.id END) AS newPatients,
        CAST(COALESCE(SUM(t.cost),0) AS DECIMAL(12,2)) AS generatedRevenue,
        CAST(COALESCE(AVG(CASE WHEN t.startTime IS NOT NULL AND t.endTime IS NOT NULL THEN TIMESTAMPDIFF(MINUTE,t.startTime,t.endTime) END),0) AS DECIMAL(10,2)) AS avgTreatmentMinutes
      FROM Treatment t
      JOIN Patient p ON p.id=t.patientId
      WHERE t.createdAt >= ? AND t.createdAt < ?
      GROUP BY t.doctorId
    ) t ON t.doctorId=s.id
    LEFT JOIN (
      SELECT doctorId,
        CAST(COALESCE(SUM(amountPaid),0) AS DECIMAL(12,2)) AS collectedRevenue,
        CAST(COALESCE(SUM(GREATEST(amount - amountPaid - discount,0)),0) AS DECIMAL(12,2)) AS outstanding
      FROM ReceptionCharge
      WHERE sentAt >= ? AND sentAt < ?
      GROUP BY doctorId
    ) rc ON rc.doctorId=s.id
    WHERE s.hospitalId=? AND s.isActive=1 ${staffFilter}
    ORDER BY generatedRevenue DESC
  `, ...params)

  return NextResponse.json({ success: true, month, currency: 'MAD', scope: user.role === 'DOCTOR' ? 'own' : 'all', data: rows })
}
