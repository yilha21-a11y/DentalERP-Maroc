import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import prisma from '@/lib/prisma'
import { requireAuthAndRole } from '@/lib/api-helpers'

type DoctorReportRow = {
  doctorId: string
  doctorName: string
  appointments: bigint | number
  completedAppointments: bigint | number
  noShows: bigint | number
  patientsSeen: bigint | number
  newPatients: bigint | number
  generatedRevenue: Prisma.Decimal | number
  collectedRevenue: Prisma.Decimal | number
  outstanding: Prisma.Decimal | number
  avgTreatmentMinutes: Prisma.Decimal | number
  treatmentCount: bigint | number
  avgRevenuePerPatient: Prisma.Decimal | number
  noShowRate: Prisma.Decimal | number
}

export async function GET(req: NextRequest) {
  const { error, hospitalId, user } = await requireAuthAndRole([
    'ADMIN',
    'ACCOUNTANT',
    'DOCTOR',
  ])
  if (error || !hospitalId || !user) {
    return error || NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const month = new URL(req.url).searchParams.get('month') || new Date().toISOString().slice(0, 7)
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json(
      { error: 'Mois invalide. Format attendu : YYYY-MM' },
      { status: 400 }
    )
  }

  const start = new Date(`${month}-01T00:00:00`)
  const end = new Date(start)
  end.setMonth(end.getMonth() + 1)

  const doctorFilter =
    user.role === 'DOCTOR' ? Prisma.sql`AND s.userId = ${user.id}` : Prisma.empty

  const rows = await prisma.$queryRaw<DoctorReportRow[]>(Prisma.sql`
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
      WHERE hospitalId = ${hospitalId}
        AND scheduledDate >= ${start}
        AND scheduledDate < ${end}
      GROUP BY doctorId
    ) a ON a.doctorId=s.id
    LEFT JOIN (
      SELECT t.doctorId,
        COUNT(*) AS treatmentCount,
        COUNT(DISTINCT t.patientId) AS patientsSeen,
        COUNT(DISTINCT CASE WHEN p.createdAt >= ${start} AND p.createdAt < ${end} THEN p.id END) AS newPatients,
        CAST(COALESCE(SUM(t.cost),0) AS DECIMAL(12,2)) AS generatedRevenue,
        CAST(COALESCE(AVG(CASE WHEN t.startTime IS NOT NULL AND t.endTime IS NOT NULL
          THEN TIMESTAMPDIFF(MINUTE,t.startTime,t.endTime) END),0) AS DECIMAL(10,2)) AS avgTreatmentMinutes
      FROM Treatment t
      JOIN Patient p ON p.id=t.patientId
      WHERE t.hospitalId = ${hospitalId}
        AND t.createdAt >= ${start}
        AND t.createdAt < ${end}
      GROUP BY t.doctorId
    ) t ON t.doctorId=s.id
    LEFT JOIN (
      SELECT doctorId,
        CAST(COALESCE(SUM(amountPaid),0) AS DECIMAL(12,2)) AS collectedRevenue,
        CAST(COALESCE(SUM(GREATEST(amount - amountPaid - discount,0)),0) AS DECIMAL(12,2)) AS outstanding
      FROM ReceptionCharge
      WHERE hospitalId = ${hospitalId}
        AND sentAt >= ${start}
        AND sentAt < ${end}
      GROUP BY doctorId
    ) rc ON rc.doctorId=s.id
    WHERE s.hospitalId = ${hospitalId}
      AND s.isActive=1
      ${doctorFilter}
    ORDER BY generatedRevenue DESC
  `)

  const data = rows.map((row) => ({
    ...row,
    appointments: Number(row.appointments),
    completedAppointments: Number(row.completedAppointments),
    noShows: Number(row.noShows),
    patientsSeen: Number(row.patientsSeen),
    newPatients: Number(row.newPatients),
    treatmentCount: Number(row.treatmentCount),
  }))

  return NextResponse.json({
    success: true,
    month,
    currency: 'MAD',
    scope: user.role === 'DOCTOR' ? 'own' : 'all',
    data,
  })
}
