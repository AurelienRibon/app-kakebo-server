import duckdb from 'duckdb';
import { Expense, ExpenseDB, fromDBExpenses } from './expenses';

const FILE = 'expenses.csv';
const FILE_DEV = 'expenses-dev.csv';

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
    this.from = `read_csv_auto('${this.file}', header=True, nullstr='<never>')`;
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
    if (expenses.length === 0) {
      return;
    }

    const rand = Math.floor(Math.random() * 1000);
    const tableId = `expenses_${Date.now()}_${rand}`;
    const columns = generateColumns();

    const insertLines = expenses.map((it) => {
      const values = generateExpenseValues(it);
      return `INSERT OR REPLACE INTO ${tableId} VALUES (${values})`;
    });

    const sql = `
      CREATE TABLE ${tableId} (${columns});
      ${insertLines.join('\n')}
      COPY ${tableId} TO '${this.file}' (HEADER);`;

    await this.exec(sql);
  }

  // Low-level DuckDB Access
  // ---------------------------------------------------------------------------

  async query(sql: string): Promise<duckdb.RowData[]> {
    return new Promise((resolve, reject) => {
      this.db.all(sql, (err, res) => {
        if (err) {
          err.message = `DuckDB query failed. ${err.message}`;
          err.stack += `\n\n...with SQL:\n\n${sql.slice(0, 1000)}`;
          reject(err);
        } else {
          resolve(res);
        }
      });
    });
  }

  async exec(sql: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.exec(sql, (err, res) => {
        if (err) {
          err.message = `DuckDB exec failed. ${err.message}`;
          err.stack += `\n\n...with SQL:\n\n${sql.slice(0, 1000)}`;
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

function generateColumns(): string {
  const columns = [
    '_id VARCHAR PRIMARY KEY',
    'date TIMESTAMP',
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
  const values = [
    `'${expense._id}'`,
    `epoch_ms(${expense.date.getTime()})`,
    `${expense.amount}`,
    `'${expense.category}'`,
    `'${expense.label}'`,
    `'${expense.periodicity}'`,
    `${expense.checked}`,
    `${expense.deleted}`,
    `epoch_ms(${expense.updatedAt.getTime()})`,
  ];

  return values.join(', ');
}
