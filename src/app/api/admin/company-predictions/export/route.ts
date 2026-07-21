import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { generateExecutiveMatrixWorkbook } from '@/lib/excel-export';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || (user.tipo !== 'superadmin' && user.tipo !== 'admin')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('company_id') || 'all';
    const role = searchParams.get('role') || 'all';
    const participa = searchParams.get('participa') || 'all';
    const search = searchParams.get('search') || '';

    const excelBuffer = await generateExecutiveMatrixWorkbook({
      companyId,
      role,
      participa,
      search,
      sessionUser: {
        id: user.id,
        tipo: user.tipo,
      },
    });

    const dateStr = new Date().toISOString().slice(0, 10);
    const fileName = `matriz_pronosticos_mundial_${dateStr}.xlsx`;

    return new NextResponse(new Uint8Array(excelBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-store, max-age=0, must-revalidate',
      },
    });
  } catch (error: unknown) {
    console.error('Error generating Excel matrix export:', error);
    return NextResponse.json(
      { error: 'Error del servidor al generar matriz de pronósticos en Excel' },
      { status: 500 }
    );
  }
}
