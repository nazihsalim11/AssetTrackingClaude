import { Router } from 'express';
import { pool } from '../db/pool';
import { requireAuth, requireRole } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = Router();
router.use(requireAuth);

const RELATED_TYPES = ['asset', 'amc', 'invoice', 'vendor'] as const;

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

router.post(
  '/',
  requireRole('super_admin', 'it_admin', 'facility_admin', 'finance'),
  upload.single('file'),
  async (req, res) => {
    const { relatedType, relatedId, docType } = req.body;
    if (!req.file) return res.status(400).json({ error: 'file is required' });
    if (!RELATED_TYPES.includes(relatedType)) {
      return res.status(400).json({ error: `relatedType must be one of ${RELATED_TYPES.join(', ')}` });
    }
    if (!relatedId || !docType) {
      return res.status(400).json({ error: 'relatedId and docType are required' });
    }

    const fileUrl = `/uploads/documents/${req.file.filename}`;
    const result = await pool.query(
      `INSERT INTO documents (related_type, related_id, doc_type, file_url, uploaded_by)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [relatedType, Number(relatedId), docType, fileUrl, req.user!.id]
    );
    res.status(201).json(result.rows[0]);
  }
);

router.delete('/:id', requireRole('super_admin', 'it_admin', 'facility_admin'), async (req, res) => {
  const result = await pool.query(`DELETE FROM documents WHERE id = $1 RETURNING id`, [req.params.id]);
  if (!result.rows[0]) return res.status(404).json({ error: 'Document not found' });
  res.status(204).send();
});

export default router;
