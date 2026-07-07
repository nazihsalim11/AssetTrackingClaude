import serverless from 'serverless-http';
import app from '../server/src/app';

export default serverless(app);
