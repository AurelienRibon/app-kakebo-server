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

export type ExpenseUser = Record<string, unknown>;

export type ExpenseDB = {
  _id: string;
  date: string;
  amount: number;
  category: string;
  label: string;
  periodicity: string;
  checked: boolean;
  deleted: boolean;
  updatedAt: string;
};

// -----------------------------------------------------------------------------
// API: CONVERSIONS
// -----------------------------------------------------------------------------

export function fromUserExpenses(expensesUser: ExpenseUser[]): Expense[] {
  return expensesUser.filter(isExpenseUserValid).map(fromDBExpense);
}

export function fromDBExpenses(expensesDB: ExpenseDB[]): Expense[] {
  return expensesDB.map(fromDBExpense);
}

export function fromDBExpense(expenseDB: ExpenseDB): Expense {
  return {
    ...expenseDB,
    date: new Date(expenseDB.date),
    updatedAt: new Date(expenseDB.updatedAt),
  };
}

function isExpenseUserValid(expenseStr: ExpenseUser): expenseStr is ExpenseDB {
  const it = expenseStr;
  return (
    isNonEmptyString(it._id) &&
    isDateString(it.date) &&
    isNumber(it.amount) &&
    isNonEmptyString(it.category) &&
    isString(it.label) &&
    isPeriodicity(it.periodicity) &&
    isBoolean(it.checked) &&
    isBoolean(it.deleted) &&
    isTimestampString(it.updatedAt)
  );
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function isDateString(value: unknown): value is string {
  return isString(value) && value.match(/^\d{4}-\d{2}-\d{2}$/) !== null;
}

function isTimestampString(value: unknown): value is string {
  return !isNaN(new Date(String(value)).getTime());
}

function isPeriodicity(value: unknown): value is 'one-time' | 'monthly' {
  return value === 'one-time' || value === 'monthly';
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
