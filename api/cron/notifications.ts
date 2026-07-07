import { generateNotifications } from '../../server/src/utils/notifications';

export default async function handler(req: any, res: any) {
  const authHeader = req.headers['authorization'];
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const count = await generateNotifications();
    res.status(200).json({ generated: count });
  } catch (err) {
    console.error('Notification generation failed:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
