import compression from 'compression';
import express from 'express';
import { DB } from './lib/db.js';
import { diffExpenses, fromUserExpenses, generateNewMonthlyExpenses } from './lib/expenses.js';
import { Logger } from './lib/logger.js';

const app = express();

app.listen(3000, () => console.log('Started!'));
app.set('json spaces', 2);

app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    res.send();
  } else {
    res.locals.date = new Date();
    next();
  }
});

app.use(compression());
app.use(express.json({ limit: '2MB' }));
app.use(express.static('www'));

app.get('/', (req, res) => {
  const logger = new Logger('/');
  logger.log('Got request');
  res.send('Hello!');
});

app.get('/schema', async (req, res) => {
  const logger = new Logger('/schema');
  const dev = !!req.query.dev;

  try {
    logger.log('Retrieving schema...');
    const db = new DB({ dev });
    const rows = await db.loadSchema();

    logger.log('Done');
    res.json(rows);
  } catch (err: any) {
    logger.error(err);
    res.status(500).send(err.message);
  }
});

app.get('/expenses', async (req, res) => {
  const logger = new Logger('/expenses');
  const dev = !!req.query.dev;

  try {
    logger.log('Retrieving expenses...');
    const db = new DB({ dev });
    const rows = await db.loadExpenses();

    logger.log('Done');
    res.json(rows);
  } catch (err: any) {
    logger.error(err);
    res.status(500).send(err.message);
  }
});

app.post('/expenses/query', async (req, res) => {
  const logger = new Logger('/expenses/query');
  const dev = !!req.query.dev;
  const query = req.body.query;

  try {
    logger.log(`Querying expenses...`);
    logger.raw([query]);
    const db = new DB({ dev });
    const rows = await db.queryExpenses(query);

    logger.log('Done');
    res.json(rows);
  } catch (err: any) {
    logger.error(err);
    res.status(500).send(err.message);
  }
});

app.post('/expenses/mutate', async (req, res) => {
  const logger = new Logger('/expenses/mutate');
  const dev = !!req.query.dev;
  const statements = req.body.statements;

  try {
    logger.log(`Mutating expenses...`);
    logger.raw(statements);
    const db = new DB({ dev });
    await db.mutateExpenses(statements);

    logger.log('Done');
    res.end();
  } catch (err: any) {
    logger.error(err);
    res.status(500).send(err.message);
  }
});

app.post('/expenses/sync', async (req, res) => {
  const logger = new Logger('/expenses/sync');
  const dev = !!req.query.dev;
  const expenses = req.body.expenses;

  try {
    logger.log('Loading expenses...');
    const db = new DB({ dev });
    const userExpenses = fromUserExpenses(expenses);
    const knownExpenses = await db.loadExpenses();
    logger.log(`user:${userExpenses.length}, server: ${knownExpenses.length}.`);

    logger.log('Computing diff for server...');
    const expensesToUpsertForServer = diffExpenses(userExpenses, knownExpenses);
    logger.log(`${expensesToUpsertForServer.length} new expenses`);

    logger.log('Computing diff for user...');
    const expensesToUpsertForUser = diffExpenses(knownExpenses, userExpenses);
    logger.log(`${expensesToUpsertForUser.length} new expenses`);

    logger.log('Computing new monthly expenses...');
    const monthlyExpensesToInsert = generateNewMonthlyExpenses(knownExpenses);
    logger.log(`${monthlyExpensesToInsert.length} new expenses`);

    if (expensesToUpsertForServer.length > 0 || monthlyExpensesToInsert.length > 0) {
      logger.log('Starting upsert...');
      const expensesToUpsert = [...expensesToUpsertForServer, ...monthlyExpensesToInsert];
      await db.upsertExpenses(expensesToUpsert);
    }

    logger.log('Done');
    res.json({ expenses: [...expensesToUpsertForUser, ...monthlyExpensesToInsert] });
  } catch (err: any) {
    logger.error(err);
    res.status(500).send(err.message);
  }
});
