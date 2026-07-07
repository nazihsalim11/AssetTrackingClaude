import { Router } from 'express';
import path from 'path';
import { pool } from '../db/pool';
import { requireAuth, requireRole } from '../middleware/auth';
import { createSignedUploadUrl } from '../utils/storage';

const router = Router();
router.use(requireAuth);

const RELATED_TYPES = ['asset', 'amc', 'invoice', 'vendor'] as const;
const DOCUMENT_MANAGER_ROLES = ['super_admin', 'it_admin', 'facility_admin', 'finance'] as const;

router.get('/', async (req, res) => {
  const { relatedType, relatedId } = req.query;
  const conditions: string[] = [];
  const params: any[] = [];
  if (relatedType) {
    params.push(relatedType);
    conditions.push(`related_type = $${params.length}`);
  }
  if (relatedId) {
    params.push(relatedId);
    conditions.push(`related_id = $${params.length}`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await pool.query(
    `SELECT d.*, u.name AS uploaded_by_name FROM documents d
     LEFT JOIN users u ON u.id = d.uploaded_by
     ${where} ORDER BY d.uploaded_at DESC`,
    params
  );
  res.json(result.rows);
});

// Step 1: the browser asks for a one-time signed URL, then uploads the file
// bytes straight to Supabase Storage (bypassing the API entirely) so large
// documents aren't limited by Vercel's 4.5MB serverless request body cap.
router.post('/upload-url', requireRole(...DOCUMENT_MANAGER_ROLES), async (req, res) => {
  const { fileName } = req.body;
  if (!fileName || typeof fileName !== 'string') {
    return res.status(400).json({ error: 'fileName is required' });
  }
  const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(fileName)}`;
  const { signedUrl, token, publicUrl } = await createSignedUploadUrl('documents', uniqueName);
  res.json({ signedUrl, token, path: uniqueName, publicUrl });
});

// Step 2: once the upload above succeeds, record it against the asset/AMC/
// invoice/vendor it belongs to.
router.post('/', requireRole(...DOCUMENT_MANAGER_ROLES), async (req, res) => {
  const { relatedType, relatedId, docType, fileUrl } = req.body;
  if (!fileUrl) return res.status(400).json({ error: 'fileUrl is required' });
  if (!RELATED_TYPES.includes(relatedType)) {
    return res.status(400).json({ error: `relatedType must be one of ${RELATED_TYPES.join(', ')}` });
  }
  if (!relatedId || !docType) {
    return res.status(400).json({ error: 'relatedId and docType are required' });
  }

  const result = await pool.query(
    `INSERT INTO documents (related_type, related_id, doc_type, file_url, uploaded_by)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [relatedType, Number(relatedId), docType, fileUrl, req.user!.id]
  );
  res.status(201).json(result.rows[0]);
});

router.delete('/:id', requireRole('super_admin', 'it_admin', 'facility_admin'), async (req, res) => {
  const result = await pool.query(`DELETE FROM documents WHERE id = $1 RETURNING id`, [req.params.id]);
  if (!result.rows[0]) return res.status(404).json({ error: 'Document not found' });
  res.status(204).send();
});

export default router;
