import express from 'express';
import compression from 'compression';
import { DB } from './lib/db.js';
import { Logger } from './lib/logger.js';
import { diffExpenses, fromDBExpenses, fromUserExpenses, generateNewMonthlyExpenses } from './lib/expenses.js';

const db = new DB();
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
    next();
  }
});

app.get('/', (req, res) => {
  res.send('Hello!');
});

app.get('/schema', async (req, res) => {
  const logger = new Logger('/schema');
  const dev = !!req.query.dev;

  logger.log('Retrieving schema...');
  const rows = await db.loadSchema({ dev });

  logger.log('Sending response...');
  res.json(rows);

  logger.log('Done.');
});

app.get('/expenses', async (req, res) => {
  const logger = new Logger('/expenses');
  const dev = !!req.query.dev;

  logger.log('Retrieving expenses...');
  const rows = await db.loadExpenses({ dev });

  logger.log('Sending response...');
  res.json(rows);

  logger.log('Done.');
});

app.post('/expenses/sync', async (req, res) => {
  const logger = new Logger('/expenses/sync');
  const dev = !!req.query.dev;

  logger.log('Loading expenses...');
  const userExpenses = fromUserExpenses(req.body.expenses);
  const knownExpenses = fromDBExpenses(await db.loadExpenses({ dev }));

  logger.log('Computing diff...');
  const expensesToUpsertForServer = diffExpenses(userExpenses, knownExpenses);
  const expensesToUpsertForUser = diffExpenses(knownExpenses, userExpenses);

  logger.log('Computing new monthly expenses...');
  const monthlyExpensesToInsert = generateNewMonthlyExpenses(knownExpenses);

  const nbNewForServer = expensesToUpsertForServer.length;
  const nbNewForUser = expensesToUpsertForUser.length;
  const nbNewMonthly = monthlyExpensesToInsert.length;
  logger.log(`nbNewForServer=${nbNewForServer}, nbNewForUser=${nbNewForUser}, nbNewMonthly=${nbNewMonthly}`);

  const expensesToUpsert = [...expensesToUpsertForServer, ...monthlyExpensesToInsert];
  await db.upsertExpenses(expensesToUpsert, { dev });

  logger.log('Sending response...');
  res.json({ expenses: [...expensesToUpsertForUser, ...monthlyExpensesToInsert] });

  logger.log('Done.');
});
