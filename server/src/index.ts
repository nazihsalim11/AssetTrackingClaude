import app from './app';
import { generateNotifications } from './utils/notifications';

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`Asset Tracking API listening on port ${port}`);
  generateNotifications().catch((err) => console.error('Notification generation failed:', err));
  setInterval(() => {
    generateNotifications().catch((err) => console.error('Notification generation failed:', err));
  }, 60 * 60 * 1000);
});
