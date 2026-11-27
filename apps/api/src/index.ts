import './lib/env.js';
import { createApp } from './app.js';

const port = Number(process.env.PORT ?? 8000);
const app = createApp();

app.listen(port, () => {
  console.log(`[DagangAI API] Running on http://localhost:${port}/api/v1`);
});
