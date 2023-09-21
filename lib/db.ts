import duckdb from 'duckdb';
import { Expense, fromDBExpenses } from './expenses';

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

  async loadExpenses(): Promise<Expense[]> {
    const rows = await this.query(`SELECT * FROM read_csv_auto('expenses.csv', header=True)`);
    return fromDBExpenses(rows);
  }

  async loadSchema(): Promise<duckdb.RowData[]> {
    return this.query(`DESCRIBE SELECT * FROM read_csv_auto('expenses.csv', header=True)`);
  }

  async upsertExpenses(expenses: Expense[]): Promise<void> {
    void expenses;
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
