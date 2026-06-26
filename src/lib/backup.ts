import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import pool from './db';

const execPromise = promisify(exec);

export interface BackupResult {
  success: boolean;
  blobName?: string;
  sizeBytes?: number;
  error?: string;
}

/**
 * Runs pg_dump and uploads the backup file to Azure Blob Storage.
 * Logs the result in the `database_backups` table.
 */
export async function runBackup(type: 'full' | 'incremental' | 'manual', matchId?: number): Promise<BackupResult> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupIdStr = matchId ? `_match_${matchId}` : '';
  const blobName = `backups/${type}/backup_${type}${backupIdStr}_${timestamp}.sql.bin`;
  
  const tempDir = path.join(process.cwd(), 'scratch');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  const tempFilePath = path.join(tempDir, `temp_backup_${timestamp}.sql.bin`);

  const host = process.env.DB_HOST || '127.0.0.1';
  const port = process.env.DB_PORT || '5432';
  const user = process.env.DB_USER || 'mundial';
  const dbName = process.env.DB_NAME || 'apuestas_mundial';
  const password = process.env.DB_PASSWORD;

  try {
    // 1. Run pg_dump
    // Incremental: only volatile tables (predictions, matches, leaderboard, users, notifications)
    const incrementalTables = [
      'users', 'matches', 'predictions', 'leaderboard',
      'notifications', 'user_companies', 'database_backups',
    ];
    const tableFlags = type === 'incremental'
      ? incrementalTables.map(t => `-t "${t}"`).join(' ')
      : '';
    const cmd = `pg_dump -h "${host}" -p "${port}" -U "${user}" -F c -b ${tableFlags} -f "${tempFilePath}" "${dbName}"`;

    await execPromise(cmd, {
      env: {
        ...process.env,
        PGPASSWORD: password
      }
    });

    if (!fs.existsSync(tempFilePath)) {
      throw new Error('pg_dump completed but temp file was not created');
    }

    const stats = fs.statSync(tempFilePath);
    const sizeBytes = stats.size;

    // 2. Upload to Azure Blob Storage
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'jet00';
    if (!connectionString) {
      throw new Error('AZURE_STORAGE_CONNECTION_STRING is not configured');
    }

    const { BlobServiceClient } = await import('@azure/storage-blob');
    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    const containerClient = blobServiceClient.getContainerClient(containerName);
    await containerClient.createIfNotExists({ access: 'blob' });
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    // Read temp file and upload
    const fileStream = fs.createReadStream(tempFilePath);
    await blockBlobClient.uploadStream(fileStream, 4 * 1024 * 1024, 20, {
      blobHTTPHeaders: { blobContentType: 'application/octet-stream' }
    });

    // 3. Log success in database
    await pool.query(
      `INSERT INTO database_backups (type, blob_name, size_bytes, status)
       VALUES ($1, $2, $3, 'success')`,
      [type, blobName, sizeBytes]
    );

    return {
      success: true,
      blobName,
      sizeBytes
    };

  } catch (err: any) {
    console.error(`[Backup Error] Failed running ${type} backup:`, err);
    
    // Log failure in database
    try {
      await pool.query(
        `INSERT INTO database_backups (type, blob_name, status, error_message)
         VALUES ($1, $2, 'failed', $3)`,
        [type, blobName, err?.message || String(err)]
      );
    } catch (dbErr) {
      console.error('[Backup Error] Failed logging failure to database:', dbErr);
    }

    return {
      success: false,
      error: err?.message || String(err)
    };
  } finally {
    // Cleanup temporary file
    if (fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
      } catch (cleanupErr) {
        console.error('[Backup Cleanup Error] Failed to delete temp file:', cleanupErr);
      }
    }
  }
}
