import ExcelJS from 'exceljs';
import pool from '@/lib/db';

export interface UserRow {
  id: number;
  nombre: string;
  email: string;
  tipo: string;
  participa: boolean;
  empresa_nombre: string;
  company_id: number | null;
  puntos_totales: number;
  exactos: number;
  posicion: number;
}

export interface MatchRow {
  id: number;
  local: string;
  visitante: string;
  fase: string;
  fecha: string;
  goles_local: number | null;
  goles_visitante: number | null;
  estado: string;
  penales_habilitados: boolean;
  stats: {
    ganador?: string;
    winner?: string;
    penaltis_local?: number;
    penaltis_visitante?: number;
  } | null;
}

export interface PredictionRow {
  user_id: number;
  match_id: number;
  pred_local: number | null;
  pred_visitante: number | null;
  puntos: number | null;
}

export interface ExportFilters {
  companyId?: string;
  role?: string;
  participa?: string;
  search?: string;
  sessionUser: {
    id: number;
    tipo: string;
  };
}

// Styling Constants
const PALETTE = {
  primaryNavy: '0F172A',
  secondaryNavy: '1E293B',
  accentGold: 'D97706',
  lightGold: 'FEF3C7',
  white: 'FFFFFF',
  textGold: 'F59E0B',
  borderGray: 'E2E8F0',
  zebraBg: 'F8FAFC',
  badge3PtsBg: 'DCFCE7',
  badge3PtsFg: '15803D',
  badge1PtBg: 'DBEAFE',
  badge1PtFg: '1E40AF',
  badge0PtsBg: 'F3F4F6',
  badge0PtsFg: '4B5563',
};

export async function generateExecutiveMatrixWorkbook(filters: ExportFilters): Promise<Buffer> {
  const { companyId, role, participa, search, sessionUser } = filters;

  // 1. Build Query for Matches
  let matchQuery = `
    SELECT id, local, visitante, fase, fecha, goles_local, goles_visitante, estado, penales_habilitados, stats
    FROM matches
  `;
  const matchQueryParams: any[] = [];
  if (search) {
    matchQuery += ` WHERE (LOWER(local) LIKE $1 OR LOWER(visitante) LIKE $1 OR LOWER(fase) LIKE $1)`;
    matchQueryParams.push(`%${search.toLowerCase()}%`);
  }
  matchQuery += ` ORDER BY fecha ASC, id ASC`;

  // 2. Build Query for Users with Filters
  let userQuery = `
    SELECT 
      u.id,
      u.nombre,
      u.email,
      u.tipo,
      u.participa,
      uc.company_id,
      COALESCE(c.nombre, 'Sin Empresa') as empresa_nombre,
      COALESCE(l.puntos_totales, 0) as puntos_totales,
      COALESCE(l.exactos, 0) as exactos,
      COALESCE(l.posicion, 9999) as posicion
    FROM users u
    LEFT JOIN user_companies uc ON uc.user_id = u.id
    LEFT JOIN companies c ON c.id = uc.company_id
    LEFT JOIN leaderboard l ON u.id = l.user_id
    WHERE u.activo = true
  `;
  const userQueryParams: any[] = [];

  // Superadmin vs Admin restriction
  if (sessionUser.tipo !== 'superadmin') {
    userQueryParams.push(sessionUser.id);
    userQuery += ` AND uc.company_id IN (SELECT company_id FROM user_companies WHERE user_id = $${userQueryParams.length})`;
  }

  // Filter Company
  if (companyId && companyId !== 'all') {
    if (companyId === 'none' || companyId === 'sin_empresa') {
      userQuery += ` AND uc.company_id IS NULL`;
    } else {
      userQueryParams.push(parseInt(companyId, 10));
      userQuery += ` AND uc.company_id = $${userQueryParams.length}`;
    }
  }

  // Filter Role
  if (role && role !== 'all') {
    userQueryParams.push(role);
    userQuery += ` AND u.tipo = $${userQueryParams.length}`;
  }

  // Filter Participa
  if (participa && participa !== 'all') {
    if (participa === 'participante') {
      userQuery += ` AND u.participa IS NOT FALSE`;
    } else if (participa === 'visor') {
      userQuery += ` AND u.participa IS FALSE`;
    }
  }

  userQuery += ` ORDER BY COALESCE(l.posicion, 9999) ASC, u.nombre ASC`;

  // 3. Fetch Matches and Users
  const [matchesRes, usersRes] = await Promise.all([
    pool.query(matchQuery, matchQueryParams),
    pool.query(userQuery, userQueryParams),
  ]);

  const matches: MatchRow[] = matchesRes.rows;
  const users: UserRow[] = usersRes.rows;

  // 4. Fetch Predictions for retrieved users & matches
  let preds: PredictionRow[] = [];
  if (users.length > 0 && matches.length > 0) {
    const userIds = users.map(u => u.id);
    const matchIds = matches.map(m => m.id);

    const predsRes = await pool.query(
      `SELECT user_id, match_id, pred_local, pred_visitante, puntos
       FROM predictions
       WHERE user_id = ANY($1::int[]) AND match_id = ANY($2::int[])`,
      [userIds, matchIds]
    );
    preds = predsRes.rows;
  }

  // Build Prediction Lookup Map: `${user_id}_${match_id}` -> PredictionRow
  const predMap = new Map<string, PredictionRow>();
  for (const p of preds) {
    predMap.set(`${p.user_id}_${p.match_id}`, p);
  }

  // Create Excel Workbook
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'ElitePass Mundial Engine';
  workbook.lastModifiedBy = 'ElitePass Export Engine';
  workbook.created = new Date();

  // ==========================================
  // TAB 1: RESUMEN EJECUTIVO (KPIs)
  // ==========================================
  const summarySheet = workbook.addWorksheet('Resumen Ejecutivo', {
    views: [{ showGridLines: true }],
  });

  // Title Banner
  summarySheet.mergeCells('A1:F2');
  const titleCell = summarySheet.getCell('A1');
  titleCell.value = 'ELITEPASS MUNDIAL 2026 — INFORME EJECUTIVO DE PRONÓSTICOS';
  titleCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: PALETTE.white } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.primaryNavy } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

  // Subtitle Timestamp
  summarySheet.mergeCells('A3:F3');
  const subTitleCell = summarySheet.getCell('A3');
  subTitleCell.value = `Reporte generado el ${new Date().toLocaleString('es-BO')} | Total usuarios: ${users.length} | Total partidos: ${matches.length}`;
  subTitleCell.font = { name: 'Calibri', size: 9, italic: true, color: { argb: '64748B' } };
  subTitleCell.alignment = { horizontal: 'center' };

  // KPI Metrics Calculation
  const totalPredictions = preds.filter(p => p.pred_local !== null).length;
  const avgPoints = users.length > 0 ? (users.reduce((acc, u) => acc + Number(u.puntos_totales), 0) / users.length).toFixed(1) : '0.0';
  const topPredictor = users.length > 0 ? users[0] : null;
  const totalExactScores = users.reduce((acc, u) => acc + Number(u.exactos), 0);

  // KPI Cards Block (Rows 5-6)
  const kpis = [
    { label: 'Total Participantes', val: users.length },
    { label: 'Pronósticos Registrados', val: totalPredictions },
    { label: 'Promedio Pts / Usuario', val: avgPoints },
    { label: 'Líder del Torneo', val: topPredictor ? `${topPredictor.nombre} (${topPredictor.puntos_totales} pts)` : 'N/A' },
    { label: 'Marcadores Exactos (3 pts)', val: totalExactScores },
  ];

  kpis.forEach((kpi, idx) => {
    const colIdx = idx + 1; // Cols A to E
    const labelCell = summarySheet.getCell(5, colIdx);
    const valueCell = summarySheet.getCell(6, colIdx);

    labelCell.value = kpi.label.toUpperCase();
    labelCell.font = { name: 'Calibri', size: 8, bold: true, color: { argb: '475569' } };
    labelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.lightGold } };
    labelCell.alignment = { horizontal: 'center', vertical: 'middle' };

    valueCell.value = kpi.val;
    valueCell.font = { name: 'Calibri', size: 12, bold: true, color: { argb: PALETTE.primaryNavy } };
    valueCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFBEB' } };
    valueCell.alignment = { horizontal: 'center', vertical: 'middle' };
    valueCell.border = {
      bottom: { style: 'medium', color: { argb: PALETTE.accentGold } },
      left: { style: 'thin', color: { argb: PALETTE.borderGray } },
      right: { style: 'thin', color: { argb: PALETTE.borderGray } },
    };
  });

  // Top 10 Table Header (Row 9)
  summarySheet.mergeCells('A8:F8');
  const tableTitle = summarySheet.getCell('A8');
  tableTitle.value = 'TOP CLASIFICACIÓN GENERAL';
  tableTitle.font = { name: 'Calibri', size: 11, bold: true, color: { argb: PALETTE.white } };
  tableTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.secondaryNavy } };

  const topHeaders = ['Posición', 'Nombre', 'Empresa', 'Email', 'Puntos Totales', 'Marcadores Exactos'];
  topHeaders.forEach((h, i) => {
    const cell = summarySheet.getCell(9, i + 1);
    cell.value = h;
    cell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: PALETTE.textGold } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.primaryNavy } };
    cell.alignment = { horizontal: i === 0 || i >= 4 ? 'center' : 'left' };
  });

  // Top Rows Data
  const topList = users.slice(0, 15);
  topList.forEach((u, rIdx) => {
    const rowNum = 10 + rIdx;
    const rowData = [u.posicion, u.nombre, u.empresa_nombre, u.email, Number(u.puntos_totales), Number(u.exactos)];
    rowData.forEach((val, cIdx) => {
      const cell = summarySheet.getCell(rowNum, cIdx + 1);
      cell.value = val;
      cell.font = { name: 'Calibri', size: 9.5 };
      cell.alignment = { horizontal: cIdx === 0 || cIdx >= 4 ? 'center' : 'left' };
      cell.border = { bottom: { style: 'thin', color: { argb: PALETTE.borderGray } } };
      if (rIdx % 2 === 1) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.zebraBg } };
      }
    });
  });

  summarySheet.columns = [
    { width: 12 }, { width: 26 }, { width: 24 }, { width: 28 }, { width: 16 }, { width: 20 }
  ];

  // ==========================================
  // TAB 2: MATRIZ DE PRONÓSTICOS
  // ==========================================
  const matrixSheet = workbook.addWorksheet('Matriz de Pronósticos', {
    views: [
      {
        state: 'frozen',
        xSplit: 8, // Freeze left 8 user columns
        ySplit: 2, // Freeze top 2 header rows
        activeCell: 'I3',
        showGridLines: true,
      },
    ],
  });

  // Static Left User Headers (Row 1 & 2)
  matrixSheet.mergeCells('A1:H1');
  const userGroupHeader = matrixSheet.getCell('A1');
  userGroupHeader.value = 'DATOS DEL PARTICIPANTE';
  userGroupHeader.font = { name: 'Calibri', size: 10, bold: true, color: { argb: PALETTE.textGold } };
  userGroupHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.primaryNavy } };
  userGroupHeader.alignment = { horizontal: 'center', vertical: 'middle' };

  const userSubHeaders = [
    'Posición',
    'Empresa',
    'Nombre',
    'Email',
    'Rol',
    'Tipo',
    'Puntos Totales',
    'Marcadores Exactos',
  ];

  userSubHeaders.forEach((sh, colIdx) => {
    const cell = matrixSheet.getCell(2, colIdx + 1);
    cell.value = sh;
    cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: PALETTE.white } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.secondaryNavy } };
    cell.alignment = { horizontal: colIdx === 0 || colIdx >= 6 ? 'center' : 'left', vertical: 'middle' };
    cell.border = { right: { style: 'thin', color: { argb: PALETTE.accentGold } } };
  });

  // Match Group Headers & Subheaders (Row 1 & 2)
  matches.forEach((match, mIdx) => {
    const startCol = 9 + mIdx * 4; // Col I, M, Q...
    const endCol = startCol + 3;

    // Row 1: Merged Match Header
    matrixSheet.mergeCells(1, startCol, 1, endCol);
    const matchHeader = matrixSheet.getCell(1, startCol);
    const dateStr = match.fecha ? new Date(match.fecha).toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit' }) : '';
    
    let realScoreHeaderStr = '';
    if (match.goles_local !== null && match.goles_visitante !== null && match.estado === 'finished') {
      realScoreHeaderStr = ` [Score: ${match.goles_local}-${match.goles_visitante}]`;
    }

    matchHeader.value = `${match.local} vs ${match.visitante}${realScoreHeaderStr} — ${match.fase} (${dateStr})`;
    matchHeader.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: PALETTE.white } };
    matchHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.primaryNavy } };
    matchHeader.alignment = { horizontal: 'center', vertical: 'middle' };

    // Row 2: Subheaders per Match
    const matchSubHeaders = ['Score Real', 'Pronóstico', 'Penales', 'Puntos'];
    matchSubHeaders.forEach((sub, subIdx) => {
      const cell = matrixSheet.getCell(2, startCol + subIdx);
      cell.value = sub;
      cell.font = { name: 'Calibri', size: 8.5, bold: true, color: { argb: PALETTE.textGold } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.secondaryNavy } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        right: { style: subIdx === 3 ? 'medium' : 'thin', color: { argb: subIdx === 3 ? PALETTE.primaryNavy : PALETTE.borderGray } },
      };
    });
  });

  // Populate Matrix User Rows (Row 3 onwards)
  users.forEach((u, uIdx) => {
    const rowNum = 3 + uIdx;
    const isZebra = uIdx % 2 === 1;

    // User Left Data
    const userVals = [
      u.posicion,
      u.empresa_nombre,
      u.nombre,
      u.email,
      u.tipo,
      u.participa !== false ? 'Participante' : 'Visor',
      Number(u.puntos_totales),
      Number(u.exactos),
    ];

    userVals.forEach((val, cIdx) => {
      const cell = matrixSheet.getCell(rowNum, cIdx + 1);
      cell.value = val;
      cell.font = { name: 'Calibri', size: 9.5, bold: cIdx === 2 || cIdx === 6 };
      cell.alignment = { horizontal: cIdx === 0 || cIdx >= 6 ? 'center' : 'left', vertical: 'middle' };
      cell.border = {
        bottom: { style: 'thin', color: { argb: PALETTE.borderGray } },
        right: cIdx === 7 ? { style: 'medium', color: { argb: PALETTE.accentGold } } : { style: 'thin', color: { argb: PALETTE.borderGray } },
      };
      if (isZebra) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.zebraBg } };
      }
    });

    // Per-Match Prediction Columns
    matches.forEach((match, mIdx) => {
      const startCol = 9 + mIdx * 4;
      const pred = predMap.get(`${u.id}_${match.id}`);

      // 1. Score Real
      let realScoreStr = '-';
      if (match.goles_local !== null && match.goles_visitante !== null && match.estado === 'finished') {
        realScoreStr = `${match.goles_local} - ${match.goles_visitante}`;
        if (match.stats?.penaltis_local !== undefined && match.stats?.penaltis_visitante !== undefined) {
          realScoreStr += ` (${match.stats.penaltis_local}-${match.stats.penaltis_visitante} P)`;
        }
      }

      // 2. Pronóstico Usuario
      let predStr = '-';
      if (pred && pred.pred_local !== null && pred.pred_visitante !== null) {
        predStr = `${pred.pred_local} - ${pred.pred_visitante}`;
      }

      // 3. Penales Column
      let penalesStr = 'N/A';
      const isKnockoutDraw = match.fase !== 'Fase de Grupos' && match.goles_local === match.goles_visitante;
      const penaltyWinnerReal = match.stats?.ganador || match.stats?.winner;

      if ((match.penales_habilitados || isKnockoutDraw) && penaltyWinnerReal) {
        let userPredictedWinner = '-';
        if (pred && pred.pred_local !== null && pred.pred_visitante !== null) {
          if (pred.pred_local > pred.pred_visitante) userPredictedWinner = match.local;
          else if (pred.pred_local < pred.pred_visitante) userPredictedWinner = match.visitante;
        }

        const isExactPenaltyWinner = userPredictedWinner === penaltyWinnerReal;
        penalesStr = `${penaltyWinnerReal} / ${userPredictedWinner} ${isExactPenaltyWinner ? '✓' : '✗'}`;
      }

      // 4. Puntos
      const puntos = pred ? pred.puntos : null;

      // Assign Values & Styling
      const cellReal = matrixSheet.getCell(rowNum, startCol);
      const cellPred = matrixSheet.getCell(rowNum, startCol + 1);
      const cellPenales = matrixSheet.getCell(rowNum, startCol + 2);
      const cellPuntos = matrixSheet.getCell(rowNum, startCol + 3);

      cellReal.value = realScoreStr;
      cellPred.value = predStr;
      cellPenales.value = penalesStr;
      cellPuntos.value = puntos !== null ? puntos : '-';

      [cellReal, cellPred, cellPenales].forEach(c => {
        c.font = { name: 'Calibri', size: 9 };
        c.alignment = { horizontal: 'center', vertical: 'middle' };
        c.border = { bottom: { style: 'thin', color: { argb: PALETTE.borderGray } } };
        if (isZebra) c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.zebraBg } };
      });

      // Puntos Badge Formatting (Conditional Formatting)
      cellPuntos.alignment = { horizontal: 'center', vertical: 'middle' };
      cellPuntos.border = {
        bottom: { style: 'thin', color: { argb: PALETTE.borderGray } },
        right: { style: 'medium', color: { argb: PALETTE.primaryNavy } },
      };

      if (puntos === 3) {
        cellPuntos.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: PALETTE.badge3PtsFg } };
        cellPuntos.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.badge3PtsBg } };
      } else if (puntos === 1) {
        cellPuntos.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: PALETTE.badge1PtFg } };
        cellPuntos.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.badge1PtBg } };
      } else if (puntos === 0) {
        cellPuntos.font = { name: 'Calibri', size: 9, color: { argb: PALETTE.badge0PtsFg } };
        cellPuntos.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.badge0PtsBg } };
      } else {
        cellPuntos.font = { name: 'Calibri', size: 9, color: { argb: '9CA3AF' } };
      }
    });
  });

  // Enable Auto-Filter on User Columns
  if (users.length > 0) {
    matrixSheet.autoFilter = {
      from: 'A2',
      to: `H${users.length + 2}`,
    };
  }

  // Adjust Column Widths Dynamically
  matrixSheet.getColumn(1).width = 10; // Posición
  matrixSheet.getColumn(2).width = 20; // Empresa
  matrixSheet.getColumn(3).width = 24; // Nombre
  matrixSheet.getColumn(4).width = 28; // Email
  matrixSheet.getColumn(5).width = 12; // Rol
  matrixSheet.getColumn(6).width = 14; // Tipo
  matrixSheet.getColumn(7).width = 16; // Puntos Totales
  matrixSheet.getColumn(8).width = 18; // Marcadores Exactos

  matches.forEach((_, mIdx) => {
    const startCol = 9 + mIdx * 4;
    matrixSheet.getColumn(startCol).width = 15;     // Score Real
    matrixSheet.getColumn(startCol + 1).width = 13; // Pronóstico
    matrixSheet.getColumn(startCol + 2).width = 18; // Penales
    matrixSheet.getColumn(startCol + 3).width = 10; // Puntos
  });

  // Export to Buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
