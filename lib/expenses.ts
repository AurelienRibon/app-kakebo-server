import { RowData } from 'duckdb';
import { addOneMonth, isSameMonth } from './dates';
import { guid } from './utils';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export type Expense = {
  _id: string;
  date: Date;
  amount: number;
  category: string;
  label: string;
  periodicity: string;
  checked: boolean;
  deleted: boolean;
  updatedAt: Date;
};

export type ExpenseStr = Record<string, string | number | boolean>;
export type ExpenseDB = RowData;

// -----------------------------------------------------------------------------
// API: CONVERSIONS
// -----------------------------------------------------------------------------

export function fromUserExpenses(expenses: ExpenseStr[]): Expense[] {
  return expenses.map((it) => ({
    _id: String(it._id),
    date: new Date(String(it.date)),
    amount: Number(it.amount),
    category: String(it.category),
    label: String(it.label),
    periodicity: String(it.periodicity),
    checked: Boolean(it.checked),
    deleted: Boolean(it.deleted),
    updatedAt: new Date(String(it.updatedAt)),
  }));
}

export function fromDBExpenses(expenses: ExpenseDB[]): Expense[] {
  return expenses.map((it) => ({
    _id: String(it._id),
    date: new Date(String(it.date)),
    amount: Number(it.amount),
    category: String(it.category),
    label: String(it.label),
    periodicity: String(it.periodicity),
    checked: Boolean(it.checked),
    deleted: Boolean(it.deleted),
    updatedAt: new Date(String(it.updatedAt)),
  }));
}

// -----------------------------------------------------------------------------
// API: MANIPULATIONS
// -----------------------------------------------------------------------------

export function diffExpenses(newExpenses: Expense[], oldExpenses: Expense[]) {
  const oldExpensesById = new Map(oldExpenses.map((it) => [it._id, it]));
  const expensesToUpsert = [];

  for (const newExpense of newExpenses) {
    const oldExpense = oldExpensesById.get(newExpense._id);

    if (!oldExpense || newExpense.updatedAt > oldExpense.updatedAt) {
      expensesToUpsert.push(newExpense);
    }
  }

  return expensesToUpsert;
}

// -----------------------------------------------------------------------------
// API: MONTHLY EXPENSES
// -----------------------------------------------------------------------------

export function generateNewMonthlyExpenses(expenses: Expense[]): Expense[] {
  const expensesToDuplicate = findRecurringExpensesToDuplicate(expenses);
  return expensesToDuplicate.map((it) => ({
    ...it,
    _id: guid(),
    date: addOneMonth(it.date),
    checked: false,
    updatedAt: new Date(),
  }));
}

function findRecurringExpensesToDuplicate(expenses: Expense[]): Expense[] {
  const today = new Date();
  const lastMonthlyExpense = expenses
    .filter((it) => it.periodicity === 'monthly' && it.date <= today)
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .at(-1);

  if (!lastMonthlyExpense) {
    return [];
  }

  if (isSameMonth(lastMonthlyExpense.date, today)) {
    return [];
  }

  const lastMonthlyExpenseYear = lastMonthlyExpense.date.getFullYear();
  const lastMonthlyExpenseMonth = lastMonthlyExpense.date.getMonth();

  return expenses.filter(
    (it) =>
      it.date.getFullYear() === lastMonthlyExpenseYear &&
      it.date.getMonth() === lastMonthlyExpenseMonth &&
      it.periodicity === 'monthly' &&
      !it.deleted,
  );
}
