import duckdb from 'duckdb';
import { stringifyDate } from './dates';
import { Expense, ExpenseDB, fromDBExpenses } from './expenses';

const FILE = 'expenses.csv';
const FILE_DEV = 'expenses-dev.csv';
const TS_FORMAT = '%Y-%m-%dT%H:%M:%S.%gZ';

type DBOptions = {
  dev: boolean;
};

export class DB {
  db: duckdb.Database;
  file: string;
  from: string;

  // Constructor
  // ---------------------------------------------------------------------------

  constructor(options?: DBOptions) {
    this.db = new duckdb.Database(':memory:');
    this.file = options?.dev ? FILE_DEV : FILE;

    const columns = generateColumnsForCSV();
    this.from = `read_csv('${this.file}', header=true, columns=${columns}, timestampformat='${TS_FORMAT}')`;
  }

  // Read
  // ---------------------------------------------------------------------------

  async loadExpenses(): Promise<Expense[]> {
    const rows = (await this.query(`SELECT * FROM ${this.from}`)) as ExpenseDB[];
    return fromDBExpenses(rows);
  }

  async loadSchema(): Promise<duckdb.RowData[]> {
    return this.query(`DESCRIBE SELECT * FROM ${this.from}`);
  }

  // Write
  // ---------------------------------------------------------------------------

  async upsertExpenses(expenses: Expense[]): Promise<void> {
    const rand = Math.floor(Math.random() * 1000);
    const tableId = `expenses_${Date.now()}_${rand}`;
    const columnsTable = generateColumnsForTable();
    const select = `SELECT * FROM ${tableId} ORDER BY date,category,label,amount,deleted`;

    const insertLines = expenses.map((it) => {
      const values = generateExpenseValues(it);
      return `INSERT OR REPLACE INTO ${tableId} VALUES (${values});`;
    });

    const sql = `
      CREATE TEMP TABLE ${tableId} (${columnsTable});
      COPY ${tableId} FROM '${this.file}' (HEADER, TIMESTAMPFORMAT '${TS_FORMAT}');
      ${insertLines.join('\n')}
      COPY (${select}) TO '${this.file}' (HEADER, TIMESTAMPFORMAT '${TS_FORMAT}');`;

    await this.exec(sql);
  }

  // Low-level DuckDB Access
  // ---------------------------------------------------------------------------

  async query(sql: string): Promise<duckdb.RowData[]> {
    return new Promise((resolve, reject) => {
      const conn = this.db.connect();
      conn.all(sql, (err, res) => {
        if (err) {
          err.message = `DuckDB query failed. ${err.message}`;
          err.stack += `\n\n...with SQL:\n\n${sql}`;
          reject(err);
        } else {
          resolve(res);
        }
      });
    });
  }

  async exec(sql: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const conn = this.db.connect();
      conn.exec(sql, (err, res) => {
        if (err) {
          err.message = `DuckDB exec failed. ${err.message}`;
          err.stack += `\n\n...with SQL:\n\n${sql}`;
          reject(err);
        } else {
          resolve(res);
        }
      });
    });
  }
}

// -----------------------------------------------------------------------------
// HELPERS
// -----------------------------------------------------------------------------

function generateColumnsForCSV(): string {
  const columns = [
    `'_id': 'VARCHAR'`,
    `'date': 'DATE'`,
    `'amount': 'DOUBLE'`,
    `'category': 'VARCHAR'`,
    `'label': 'VARCHAR'`,
    `'periodicity': 'VARCHAR'`,
    `'checked': 'BOOLEAN'`,
    `'deleted': 'BOOLEAN'`,
    `'updatedAt': 'TIMESTAMP'`,
  ];

  return '{' + columns.join(', ') + '}';
}

function generateColumnsForTable(): string {
  const columns = [
    '_id VARCHAR PRIMARY KEY',
    'date DATE',
    'amount DOUBLE',
    'category VARCHAR',
    'label VARCHAR',
    'periodicity VARCHAR',
    'checked BOOLEAN',
    'deleted BOOLEAN',
    'updatedAt TIMESTAMP',
  ];

  return columns.join(', ');
}

function generateExpenseValues(expense: Expense): string {
  const date = stringifyDate(expense.date);
  const ts = expense.updatedAt.getTime();

  const values = [
    `'${expense._id}'`,
    `DATE '${date}'`,
    `${expense.amount}`,
    `'${expense.category}'`,
    `'${expense.label}'`,
    `'${expense.periodicity}'`,
    `${expense.checked}`,
    `${expense.deleted}`,
    `epoch_ms(${ts})`,
  ];

  return values.join(', ');
}
