import duckdb from 'duckdb';
import { Expense, fromDBExpenses } from './expenses';

type DBOptions = {
  dev: boolean;
}

export class DB {
  db: duckdb.Database;

  constructor() {
    this.db = new duckdb.Database(':memory:');
  }

  async query(sql: string): Promise<duckdb.RowData[]> {
    return new Promise((resolve, reject) => {
      this.db.all(sql, (err, res) => {
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
      this.db.exec(sql, (err, res) => {
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

  async loadExpenses(options?: DBOptions): Promise<Expense[]> {
    const sql = options?.dev
      ? `SELECT * FROM read_csv_auto('expenses-dev.csv', header=True)`
      : `SELECT * FROM read_csv_auto('expenses.csv', header=True)`;
    const rows = await this.query(sql);
    return fromDBExpenses(rows);
  }

  async loadSchema(options?: DBOptions): Promise<duckdb.RowData[]> {
    const sql = options?.dev
      ? `DESCRIBE SELECT * FROM read_csv_auto('expenses-dev.csv', header=True)`
      : `DESCRIBE SELECT * FROM read_csv_auto('expenses.csv', header=True)`;
    return this.query(sql);
  }

  async upsertExpenses(expenses: Expense[], options?: DBOptions): Promise<void> {
    void expenses;
    void options;
    console.log('TODO upsertExpenses');
  }
}

// CREATE TABLE Expenses(
//   _id         VARCHAR,
//   date        TIMESTAMP,
//   amount      DOUBLE,
//   category    VARCHAR,
//   label       VARCHAR,
//   periodicity VARCHAR,
//   checked     BOOLEAN,
//   deleted     BOOLEAN,
//   updatedAt   TIMESTAMP,
// );
