import compression from 'compression';
import express from 'express';
import { DB } from './lib/db.js';
import { diffExpenses, fromUserExpenses, generateNewMonthlyExpenses } from './lib/expenses.js';
import { Logger } from './lib/logger.js';
import { guid } from './lib/utils.js';

const app = express();

app.use(compression());
app.use(express.json({ limit: '2MB' }));
app.set('json spaces', 2);
app.listen(3000, () => console.log('Started!'));

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    res.send();
  } else {
    res.locals.sessionId = guid();
    next();
  }
});

app.get('/', (req, res) => {
  res.send('Hello!');
});

app.get('/schema', async (req, res) => {
  const logger = new Logger('/schema', res.locals.sessionId);
  const dev = !!req.query.dev;

  try {
    logger.log('Retrieving schema...');
    const db = new DB({ dev });
    const rows = await db.loadSchema();

    logger.log('Sending response...');
    res.json(rows);

    logger.log('Done.');
  } catch (err: any) {
    logger.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/expenses', async (req, res) => {
  const logger = new Logger('/expenses', res.locals.sessionId);
  const dev = !!req.query.dev;

  try {
    logger.log('Retrieving expenses...');
    const db = new DB({ dev });
    const rows = await db.loadExpenses();

    logger.log('Sending response...');
    res.json(rows);

    logger.log('Done.');
  } catch (err: any) {
    logger.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/expenses/sync', async (req, res) => {
  const logger = new Logger('/expenses/sync', res.locals.sessionId);
  const dev = !!req.query.dev;

  try {
    logger.log('Loading expenses...');
    const db = new DB({ dev });
    const userExpenses = fromUserExpenses(req.body.expenses);
    const knownExpenses = await db.loadExpenses();

    logger.log('Computing diff for server...');
    const expensesToUpsertForServer = diffExpenses(userExpenses, knownExpenses);
    logger.log(`Found ${expensesToUpsertForServer.length} new expenses.`);

    logger.log('Computing diff for user...');
    const expensesToUpsertForUser = diffExpenses(knownExpenses, userExpenses);
    logger.log(`Found ${expensesToUpsertForUser.length} new expenses.`);

    logger.log('Computing new monthly expenses...');
    const monthlyExpensesToInsert = generateNewMonthlyExpenses(knownExpenses);
    logger.log(`Found ${monthlyExpensesToInsert.length} new expenses.`);

    if (expensesToUpsertForServer.length > 0 || monthlyExpensesToInsert.length > 0) {
      logger.log('Starting upsert...');
      const expensesToUpsert = [...expensesToUpsertForServer, ...monthlyExpensesToInsert];
      await db.upsertExpenses(expensesToUpsert);
    }

    logger.log('Sending response...');
    res.json({ expenses: [...expensesToUpsertForUser, ...monthlyExpensesToInsert] });

    logger.log('Done.');
  } catch (err: any) {
    logger.error(err);
    res.status(500).json({ error: err.message });
  }
});
