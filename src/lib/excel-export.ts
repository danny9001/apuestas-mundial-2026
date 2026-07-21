import ExcelJS from 'exceljs';
import pool from '@/lib/db';

export interface UserRow {
  id: number;
  nombre: string;
  email: string;
  tipo: string;
  participa: boolean;
  tincaso: string | null;
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

// Styling Constants (Executive Navy & Gold Palette + Graphic Design Badges)
const PALETTE = {
  primaryNavy: '0F172A',
  secondaryNavy: '1E293B',
  accentGold: 'D97706',
  lightGold: 'FEF3C7',
  white: 'FFFFFF',
  textGold: 'F59E0B',
  borderGray: 'CBD5E1',
  zebraBg: 'F8FAFC',
  // Badges
  badge3PtsBg: 'DCFCE7',
  badge3PtsFg: '15803D',
  badge1PtBg: 'DBEAFE',
  badge1PtFg: '1E40AF',
  badge0PtsBg: 'F3F4F6',
  badge0PtsFg: '4B5563',
  badgePendingBg: 'FEF9C3',
  badgePendingFg: '854D0E',
  // Podium Colors
  goldBg: 'FEF3C7',
  goldBorder: 'D97706',
  goldFg: '92400E',
  silverBg: 'F1F5F9',
  silverBorder: '94A3B8',
  silverFg: '334155',
  bronzeBg: 'FFEDD5',
  bronzeBorder: 'F97316',
  bronzeFg: '9A3412',
};

// SuperAdmins to strictly exclude from all report sheets
const EXCLUDED_EMAILS = ['dlandivar@genial-it.net', 'danny9001@gmail.com'];

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

  // 2. Build Query for Users with Filters & Explicit SuperAdmin Exclusion
  let userQuery = `
    SELECT 
      u.id,
      u.nombre,
      u.email,
      u.tipo,
      COALESCE(u.participa, true) as participa,
      u.tincaso,
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
      AND LOWER(u.email) NOT IN (${EXCLUDED_EMAILS.map((_, i) => `$${i + 1}`).join(', ')})
  `;
  const userQueryParams: any[] = [...EXCLUDED_EMAILS];

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
  const allUsers: UserRow[] = usersRes.rows;

  // Separate Participantes and Visores
  const participantes = allUsers.filter(u => u.participa !== false);
  const visores = allUsers.filter(u => u.participa === false);

  // 4. Fetch Predictions for retrieved users & matches
  let preds: PredictionRow[] = [];
  if (allUsers.length > 0 && matches.length > 0) {
    const userIds = allUsers.map(u => u.id);
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
  // PESTAÑA 1: 🏆 GANADORES Y PREMIACIÓN
  // ==========================================
  const winnersSheet = workbook.addWorksheet('🏆 Ganadores', {
    views: [{ showGridLines: true }],
  });

  // Title Banner
  winnersSheet.mergeCells('A1:F2');
  const winTitle = winnersSheet.getCell('A1');
  winTitle.value = 'ELITEPASS MUNDIAL 2026 — PODIO DE GANADORES Y PREMIACIÓN';
  winTitle.font = { name: 'Calibri', size: 14, bold: true, color: { argb: PALETTE.white } };
  winTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.primaryNavy } };
  winTitle.alignment = { vertical: 'middle', horizontal: 'center' };

  // Subtitle Timestamp
  winnersSheet.mergeCells('A3:F3');
  const winSub = winnersSheet.getCell('A3');
  winSub.value = `Informe oficial de podio generado el ${new Date().toLocaleString('es-BO')} | Clasificación basada en participantes activos`;
  winSub.font = { name: 'Calibri', size: 9, italic: true, color: { argb: '64748B' } };
  winSub.alignment = { horizontal: 'center' };

  // PODIUM CARDS (1er, 2do, 3er Lugar)
  const top1 = participantes.length > 0 ? participantes[0] : null;
  const top2 = participantes.length > 1 ? participantes[1] : null;
  const top3 = participantes.length > 2 ? participantes[2] : null;

  const podiumData = [
    { place: '🥇 1er LUGAR (CAMPEÓN)', user: top1, bg: PALETTE.goldBg, border: PALETTE.goldBorder, fg: PALETTE.goldFg, colStart: 1, colEnd: 2 },
    { place: '🥈 2do LUGAR (SUBCAMPEÓN)', user: top2, bg: PALETTE.silverBg, border: PALETTE.silverBorder, fg: PALETTE.silverFg, colStart: 3, colEnd: 4 },
    { place: '🥉 3er LUGAR (TERCER PUESTO)', user: top3, bg: PALETTE.bronzeBg, border: PALETTE.bronzeBorder, fg: PALETTE.bronzeFg, colStart: 5, colEnd: 6 },
  ];

  podiumData.forEach(p => {
    winnersSheet.mergeCells(5, p.colStart, 5, p.colEnd);
    const pHead = winnersSheet.getCell(5, p.colStart);
    pHead.value = p.place;
    pHead.font = { name: 'Calibri', size: 10, bold: true, color: { argb: p.fg } };
    pHead.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: p.bg } };
    pHead.alignment = { horizontal: 'center', vertical: 'middle' };

    winnersSheet.mergeCells(6, p.colStart, 6, p.colEnd);
    const pName = winnersSheet.getCell(6, p.colStart);
    pName.value = p.user ? p.user.nombre : 'Por definir';
    pName.font = { name: 'Calibri', size: 12, bold: true, color: { argb: PALETTE.primaryNavy } };
    pName.alignment = { horizontal: 'center', vertical: 'middle' };

    winnersSheet.mergeCells(7, p.colStart, 7, p.colEnd);
    const pCompany = winnersSheet.getCell(7, p.colStart);
    pCompany.value = p.user ? `${p.user.empresa_nombre} (${p.user.email})` : '-';
    pCompany.font = { name: 'Calibri', size: 8.5, italic: true, color: { argb: '475569' } };
    pCompany.alignment = { horizontal: 'center', vertical: 'middle' };

    winnersSheet.mergeCells(8, p.colStart, 8, p.colEnd);
    const pScore = winnersSheet.getCell(8, p.colStart);
    pScore.value = p.user ? `${p.user.puntos_totales} Pts | ${p.user.exactos} Exactos | Tincaso: ${p.user.tincaso || 'Sin Tincaso'}` : '-';
    pScore.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: p.fg } };
    pScore.alignment = { horizontal: 'center', vertical: 'middle' };

    for (let r = 5; r <= 8; r++) {
      for (let c = p.colStart; c <= p.colEnd; c++) {
        const cell = winnersSheet.getCell(r, c);
        cell.border = {
          top: r === 5 ? { style: 'medium', color: { argb: p.border } } : undefined,
          bottom: r === 8 ? { style: 'medium', color: { argb: p.border } } : undefined,
          left: c === p.colStart ? { style: 'medium', color: { argb: p.border } } : undefined,
          right: c === p.colEnd ? { style: 'medium', color: { argb: p.border } } : undefined,
        };
      }
    }
  });

  // TOP PREMIACIÓN TABLE (Row 10)
  winnersSheet.mergeCells('A10:G10');
  const topWinTitle = winnersSheet.getCell('A10');
  topWinTitle.value = 'TABLA DE PREMIACIÓN GENERAL (SOLO PARTICIPANTES)';
  topWinTitle.font = { name: 'Calibri', size: 11, bold: true, color: { argb: PALETTE.white } };
  topWinTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.secondaryNavy } };

  const winHeaders = ['Posición', 'Participante', 'Empresa', 'Email', 'Tincaso (Campeón Predicho)', 'Puntos Totales', 'Marcadores Exactos'];
  winHeaders.forEach((h, i) => {
    const colNum = i + 1;
    const cell = winnersSheet.getCell(11, colNum);
    cell.value = h;
    cell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: PALETTE.textGold } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.primaryNavy } };
    cell.alignment = { horizontal: i === 0 || i >= 5 ? 'center' : 'left' };
  });

  const top15Participantes = participantes.slice(0, 15);
  top15Participantes.forEach((u, rIdx) => {
    const rowNum = 12 + rIdx;
    const rowData = [u.posicion, u.nombre, u.empresa_nombre, u.email, u.tincaso || 'Sin Tincaso', Number(u.puntos_totales), Number(u.exactos)];
    rowData.forEach((val, cIdx) => {
      const cell = winnersSheet.getCell(rowNum, cIdx + 1);
      cell.value = val;
      cell.font = { name: 'Calibri', size: 9.5, bold: rIdx < 3 || cIdx === 5 };
      cell.alignment = { horizontal: cIdx === 0 || cIdx >= 5 ? 'center' : 'left' };
      cell.border = { bottom: { style: 'thin', color: { argb: PALETTE.borderGray } } };
      if (rIdx % 2 === 1) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.zebraBg } };
      }
    });
  });

  const winWidths = [12, 26, 24, 28, 24, 16, 20];
  winWidths.forEach((w, i) => {
    winnersSheet.getColumn(i + 1).width = w;
  });

  // ==========================================
  // PESTAÑA 2: 📊 RESUMEN EJECUTIVO (SOLO PARTICIPANTES)
  // ==========================================
  const summarySheet = workbook.addWorksheet('📊 Resumen Ejecutivo', {
    views: [{ showGridLines: true }],
  });

  // Title Banner
  summarySheet.mergeCells('A1:G2');
  const titleCell = summarySheet.getCell('A1');
  titleCell.value = 'ELITEPASS MUNDIAL 2026 — INFORME EJECUTIVO DE PARTICIPANTES';
  titleCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: PALETTE.white } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.primaryNavy } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

  // Subtitle Timestamp
  summarySheet.mergeCells('A3:G3');
  const subTitleCell = summarySheet.getCell('A3');
  subTitleCell.value = `Métricas calculadas exclusivamente sobre ${participantes.length} participantes activos | Excluye visores y administradores`;
  subTitleCell.font = { name: 'Calibri', size: 9, italic: true, color: { argb: '64748B' } };
  subTitleCell.alignment = { horizontal: 'center' };

  // KPI Metrics Calculation (100% PARTICIPANTES)
  const partUserIds = new Set(participantes.map(u => u.id));
  const partPreds = preds.filter(p => partUserIds.has(p.user_id) && p.pred_local !== null);
  const avgPointsPart = participantes.length > 0 ? (participantes.reduce((acc, u) => acc + Number(u.puntos_totales), 0) / participantes.length).toFixed(1) : '0.0';
  const topPredictorPart = participantes.length > 0 ? participantes[0] : null;
  const totalExactScoresPart = participantes.reduce((acc, u) => acc + Number(u.exactos), 0);

  // KPI Cards Block (Rows 5-6)
  const kpisPart = [
    { label: 'Total Participantes', val: participantes.length },
    { label: 'Pronósticos Registrados', val: partPreds.length },
    { label: 'Promedio Pts / Participante', val: avgPointsPart },
    { label: 'Líder del Torneo', val: topPredictorPart ? `${topPredictorPart.nombre} (${topPredictorPart.puntos_totales} pts)` : 'N/A' },
    { label: 'Marcadores Exactos (3 pts)', val: totalExactScoresPart },
  ];

  kpisPart.forEach((kpi, idx) => {
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

  // Clasificación General Header (Row 8)
  summarySheet.mergeCells('A8:G8');
  const tableTitle = summarySheet.getCell('A8');
  tableTitle.value = 'CLASIFICACIÓN GENERAL DE PARTICIPANTES';
  tableTitle.font = { name: 'Calibri', size: 11, bold: true, color: { argb: PALETTE.white } };
  tableTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.secondaryNavy } };

  const topHeaders = ['Posición', 'Nombre', 'Empresa', 'Email', 'Tincaso (Campeón)', 'Puntos Totales', 'Marcadores Exactos'];
  topHeaders.forEach((h, i) => {
    const cell = summarySheet.getCell(9, i + 1);
    cell.value = h;
    cell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: PALETTE.textGold } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.primaryNavy } };
    cell.alignment = { horizontal: i === 0 || i >= 5 ? 'center' : 'left' };
  });

  // Participantes Rows
  participantes.forEach((u, rIdx) => {
    const rowNum = 10 + rIdx;
    const rowData = [u.posicion, u.nombre, u.empresa_nombre, u.email, u.tincaso || 'Sin Tincaso', Number(u.puntos_totales), Number(u.exactos)];
    rowData.forEach((val, cIdx) => {
      const cell = summarySheet.getCell(rowNum, cIdx + 1);
      cell.value = val;
      cell.font = { name: 'Calibri', size: 9.5 };
      cell.alignment = { horizontal: cIdx === 0 || cIdx >= 5 ? 'center' : 'left' };
      cell.border = { bottom: { style: 'thin', color: { argb: PALETTE.borderGray } } };
      if (rIdx % 2 === 1) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.zebraBg } };
      }
    });
  });

  // Section Visores at bottom of Resumen Ejecutivo
  let nextRow = 12 + participantes.length;
  summarySheet.mergeCells(nextRow, 1, nextRow, 7);
  const visTitle = summarySheet.getCell(nextRow, 1);
  visTitle.value = `OTROS REGISTROS: VISORES Y NO PARTICIPANTES (${visores.length})`;
  visTitle.font = { name: 'Calibri', size: 10, bold: true, color: { argb: PALETTE.white } };
  visTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '475569' } };

  nextRow++;
  const visHeaders = ['Empresa', 'Nombre', 'Email', 'Rol', 'Tipo', 'Estado', '-'];
  visHeaders.forEach((h, i) => {
    const cell = summarySheet.getCell(nextRow, i + 1);
    cell.value = h;
    cell.font = { name: 'Calibri', size: 8.5, bold: true, color: { argb: PALETTE.white } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '64748B' } };
  });

  visores.forEach((v, vIdx) => {
    nextRow++;
    const rowData = [v.empresa_nombre, v.nombre, v.email, v.tipo, 'Visor', 'Sin Clasificación', '-'];
    rowData.forEach((val, cIdx) => {
      const cell = summarySheet.getCell(nextRow, cIdx + 1);
      cell.value = val;
      cell.font = { name: 'Calibri', size: 9, color: { argb: '64748B' } };
      cell.border = { bottom: { style: 'thin', color: { argb: PALETTE.borderGray } } };
    });
  });

  const sumWidths = [12, 26, 24, 28, 24, 16, 20];
  sumWidths.forEach((w, i) => {
    summarySheet.getColumn(i + 1).width = w;
  });

  // ==========================================
  // PESTAÑA 3: ⚽ MATRIZ DE PRONÓSTICOS
  // ==========================================
  const matrixSheet = workbook.addWorksheet('⚽ Matriz de Pronósticos', {
    views: [
      {
        state: 'frozen',
        xSplit: 9, // Freeze left 9 user columns
        ySplit: 2, // Freeze top 2 header rows
        activeCell: 'J3',
        showGridLines: true,
      },
    ],
  });

  // Static Left User Headers (Row 1 & 2)
  matrixSheet.mergeCells('A1:I1');
  const userGroupHeader = matrixSheet.getCell('A1');
  userGroupHeader.value = 'DATOS DEL USUARIO Y TINCASO';
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
    'Tincaso (Campeón)',
    'Puntos Totales',
    'Marcadores Exactos',
  ];

  userSubHeaders.forEach((sh, colIdx) => {
    const cell = matrixSheet.getCell(2, colIdx + 1);
    cell.value = sh;
    cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: PALETTE.white } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.secondaryNavy } };
    cell.alignment = { horizontal: colIdx === 0 || colIdx >= 7 ? 'center' : 'left', vertical: 'middle' };
    cell.border = { right: { style: 'thin', color: { argb: PALETTE.accentGold } } };
  });

  // Match Group Headers & Subheaders (Row 1 & 2)
  matches.forEach((match, mIdx) => {
    const startCol = 10 + mIdx * 4; // Col J, N, R...
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

  // Populate Matrix User Rows for ALL USERS (Row 3 onwards)
  allUsers.forEach((u, uIdx) => {
    const rowNum = 3 + uIdx;
    const isZebra = uIdx % 2 === 1;

    // User Left Data
    const userVals = [
      u.participa !== false ? u.posicion : '-',
      u.empresa_nombre,
      u.nombre,
      u.email,
      u.tipo,
      u.participa !== false ? 'Participante' : 'Visor',
      u.tincaso || 'Sin Tincaso',
      Number(u.puntos_totales),
      Number(u.exactos),
    ];

    userVals.forEach((val, cIdx) => {
      const cell = matrixSheet.getCell(rowNum, cIdx + 1);
      cell.value = val;
      cell.font = { name: 'Calibri', size: 9.5, bold: cIdx === 2 || cIdx === 7 };
      cell.alignment = { horizontal: cIdx === 0 || cIdx >= 7 ? 'center' : 'left', vertical: 'middle' };
      cell.border = {
        bottom: { style: 'thin', color: { argb: PALETTE.borderGray } },
        right: cIdx === 8 ? { style: 'medium', color: { argb: PALETTE.accentGold } } : { style: 'thin', color: { argb: PALETTE.borderGray } },
      };
      if (isZebra) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.zebraBg } };
      }
    });

    // Per-Match Prediction Columns
    matches.forEach((match, mIdx) => {
      const startCol = 10 + mIdx * 4;
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

      // Puntos Badge Formatting
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
  if (allUsers.length > 0) {
    matrixSheet.autoFilter = {
      from: 'A2',
      to: `I${allUsers.length + 2}`,
    };
  }

  // Adjust Column Widths Dynamically for Matrix
  matrixSheet.getColumn(1).width = 10; // Posición
  matrixSheet.getColumn(2).width = 20; // Empresa
  matrixSheet.getColumn(3).width = 24; // Nombre
  matrixSheet.getColumn(4).width = 28; // Email
  matrixSheet.getColumn(5).width = 12; // Rol
  matrixSheet.getColumn(6).width = 14; // Tipo
  matrixSheet.getColumn(7).width = 22; // Tincaso
  matrixSheet.getColumn(8).width = 16; // Puntos Totales
  matrixSheet.getColumn(9).width = 18; // Marcadores Exactos

  matches.forEach((_, mIdx) => {
    const startCol = 10 + mIdx * 4;
    matrixSheet.getColumn(startCol).width = 15;     // Score Real
    matrixSheet.getColumn(startCol + 1).width = 13; // Pronóstico
    matrixSheet.getColumn(startCol + 2).width = 18; // Penales
    matrixSheet.getColumn(startCol + 3).width = 10; // Puntos
  });

  // ==========================================
  // PESTAÑA 4: 📋 DETALLE APUESTAS (AUDITORÍA GRANULAR COMPLETA FILA POR APUESTA)
  // ==========================================
  const detailSheet = workbook.addWorksheet('📋 Detalle Apuestas', {
    views: [{ state: 'frozen', ySplit: 2, showGridLines: true }],
  });

  // Explicit Column Widths BEFORE writing rows to avoid resetting values
  const detColWidths = [22, 26, 28, 14, 22, 28, 20, 18, 26, 26, 22, 22];
  detColWidths.forEach((w, i) => {
    detailSheet.getColumn(i + 1).width = w;
  });

  // Title Banner
  detailSheet.mergeCells('A1:L1');
  const detTitle = detailSheet.getCell('A1');
  detTitle.value = 'ELITEPASS MUNDIAL 2026 — REGISTRO DETALLADO DE APUESTAS PARA AUDITORÍA';
  detTitle.font = { name: 'Calibri', size: 12, bold: true, color: { argb: PALETTE.white } };
  detTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.primaryNavy } };
  detTitle.alignment = { vertical: 'middle', horizontal: 'center' };

  // Subheaders (Row 2)
  const detHeaders = [
    'Empresa',
    'Participante / Usuario',
    'Email',
    'Tipo',
    'Tincaso (Campeón)',
    'Partido (Encuentro)',
    'Fase Torneo',
    'Fecha Partido',
    'Resultado Real',
    'Pronóstico Usuario',
    'Penales (Real / Predicho)',
    'Puntos Obtenidos',
  ];

  detHeaders.forEach((h, i) => {
    const cell = detailSheet.getCell(2, i + 1);
    cell.value = h;
    cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: PALETTE.textGold } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.secondaryNavy } };
    cell.alignment = { horizontal: i >= 7 ? 'center' : 'left', vertical: 'middle' };
  });

  // Shared styles for performance and preventing style limit corruption in ExcelJS
  const styleFontCalibri9 = { name: 'Calibri', size: 9 };
  const styleAlignLeftMiddle = { horizontal: 'left' as const, vertical: 'middle' as const };
  const styleAlignCenterMiddle = { horizontal: 'center' as const, vertical: 'middle' as const };
  const styleBorderBottomThinGray = { bottom: { style: 'thin' as const, color: { argb: PALETTE.borderGray } } };
  const styleFillZebra = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: PALETTE.zebraBg } };

  const styleFont3Pts = { name: 'Calibri', size: 9, bold: true, color: { argb: PALETTE.badge3PtsFg } };
  const styleFill3Pts = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: PALETTE.badge3PtsBg } };

  const styleFont1Pt = { name: 'Calibri', size: 9, bold: true, color: { argb: PALETTE.badge1PtFg } };
  const styleFill1Pt = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: PALETTE.badge1PtBg } };

  const styleFont0Pts = { name: 'Calibri', size: 9, color: { argb: PALETTE.badge0PtsFg } };
  const styleFill0Pts = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: PALETTE.badge0PtsBg } };

  const styleFontPending = { name: 'Calibri', size: 9, color: { argb: PALETTE.badgePendingFg } };
  const styleFillPending = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: PALETTE.badgePendingBg } };

  // Populate Row by Row (User x Match) for ALL USERS
  let detRowIndex = 3;
  allUsers.forEach(u => {
    matches.forEach(match => {
      const pred = predMap.get(`${u.id}_${match.id}`);
      const isZebra = detRowIndex % 2 === 1;

      // 1. Resultado Real
      let realScoreStr = '⏳ Pendiente';
      if (match.goles_local !== null && match.goles_visitante !== null && match.estado === 'finished') {
        realScoreStr = `${match.local} ${match.goles_local} - ${match.goles_visitante} ${match.visitante}`;
        if (match.stats?.penaltis_local !== undefined && match.stats?.penaltis_visitante !== undefined) {
          realScoreStr += ` (${match.stats.penaltis_local}-${match.stats.penaltis_visitante} Pen.)`;
        }
      }

      // 2. Pronóstico Usuario
      let predStr = '⚪ Sin Pronóstico';
      if (pred && pred.pred_local !== null && pred.pred_visitante !== null) {
        predStr = `${match.local} ${pred.pred_local} - ${pred.pred_visitante} ${match.visitante}`;
      }

      // 3. Penales
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

      // 4. Puntos con Badges Vistosos
      let puntosLabel = '⏳ Pendiente';
      const pts = pred ? pred.puntos : null;
      if (pts === 3) puntosLabel = '🎯 3 Pts (Exacto)';
      else if (pts === 1) puntosLabel = '✅ 1 Pt (Acierto Ganador)';
      else if (pts === 0) puntosLabel = '❌ 0 Pts (Sin Acierto)';

      const dateStr = match.fecha ? new Date(match.fecha).toLocaleString('es-BO', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-';

      const rowVals = [
        u.empresa_nombre,
        u.nombre,
        u.email,
        u.participa !== false ? 'Participante' : 'Visor',
        u.tincaso || 'Sin Tincaso',
        `${match.local} vs ${match.visitante}`,
        match.fase,
        dateStr,
        realScoreStr,
        predStr,
        penalesStr,
        puntosLabel,
      ];

      rowVals.forEach((val, cIdx) => {
        const cell = detailSheet.getCell(detRowIndex, cIdx + 1);
        cell.value = val;
        cell.font = styleFontCalibri9;
        cell.alignment = cIdx >= 7 ? styleAlignCenterMiddle : styleAlignLeftMiddle;
        cell.border = styleBorderBottomThinGray;

        if (isZebra) {
          cell.fill = styleFillZebra;
        }

        // Highlight Puntos Column (Col 12)
        if (cIdx === 11) {
          cell.alignment = styleAlignCenterMiddle;
          if (pts === 3) {
            cell.font = styleFont3Pts;
            cell.fill = styleFill3Pts;
          } else if (pts === 1) {
            cell.font = styleFont1Pt;
            cell.fill = styleFill1Pt;
          } else if (pts === 0) {
            cell.font = styleFont0Pts;
            cell.fill = styleFill0Pts;
          } else {
            cell.font = styleFontPending;
            cell.fill = styleFillPending;
          }
        }
      });

      detRowIndex++;
    });
  });

  // Enable Auto-Filter on Detail Sheet
  if (detRowIndex > 3) {
    detailSheet.autoFilter = {
      from: 'A2',
      to: `L${detRowIndex - 1}`,
    };
  }

  // Export to Buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
