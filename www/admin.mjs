const $queryGPT = document.getElementById('queryGPT');
const $querySQL = document.getElementById('querySQL');
const $btnExecute = document.getElementById('btnExecute');
const $btnTranslate = document.getElementById('btnTranslate');
const $result = document.getElementById('result');

$btnExecute.addEventListener('click', async () => {
  try {
    await executeQuery($querySQL.value);
  } catch (err) {
    $result.innerHTML = err.message;
  }
});

$btnTranslate.addEventListener('click', async () => {
  try {
    await translateQuery($queryGPT.value);
  } catch (err) {
    $result.innerHTML = err.message;
  }
});

// -----------------------------------------------------------------------------
// GPT
// -----------------------------------------------------------------------------

async function translateQuery(query) {
  const key = localStorage.getItem('openaiKey');
  if (!key) {
    throw new Error('Add OpenAI key to `localStorage.openaiKey`.');
  }

  const json = await post('https://api.openai.com/v1/chat/completions', {
    headers: { Authorization: `Bearer ${key}` },
    data: {
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: getPrompt() },
        { role: 'user', content: query },
      ],
      temperature: 0.2,
    },
  });

  const answer = json?.choices?.[0]?.message?.content;
  $querySQL.value = answer ?? JSON.stringify(json, null, 2);
}

function getPrompt() {
  return `You are an SQL expert, knowing every details of DuckDB databases.
The user will ask you a question about the database, and you have to generate an SQL query to answer it.
Only respond with the SQL query, do not add any other text nor markdown tags.

The database has no table, it reads its data from CSV files directly when needed.
There is a single CSV file, named "expenses.csv". To load it, just use the placeholder %expenses%, which will be
replaced by the right 'read_csv()' command at runtime.

The CSV file has the following columns:
  - _id (VARCHAR) PRIMARY KEY
  - date (DATE) : the date of the expense
  - amount (DOUBLE) : the amount of the expense, negative for expenses, positive for incomes
  - category (VARCHAR) : 'courses', 'animaux', 'banque', 'bien-être', 'cadeaux', 'chess', 'culture', 'divers', 'dons', 'école', 'essence', 'impots', 'maison', 'restos', 'salaires', 'santé', 'soulac', 'sport', 'vêtements', 'voiture', 'voyages'
  - label (VARCHAR) : any text
  - periodicity (VARCHAR) : can be 'monthly' or 'one-time'. Monthly expenses are automated recurrent ones, like rent or internet. One-time expenses are daily ones, like groceries.
  - checked (BOOLEAN) : if the expense has been validated on the bank account
  - deleted (BOOLEAN) : if the expense has been deleted
  - exception (BOOLEAN) : if the expense is exceptional and not counted in the budget
  - updatedAt (TIMESTAMP) : the last time the expense entry has been updated

Unless requested otherwise, never include deleted expenses in the results.
Unless user mentions income, an expense is always a negative amount.

Example: Select the latest 10 expenses
  SELECT * FROM %expenses% WHERE deleted = False ORDER BY date DESC LIMIT 10

Example: What is my biggest expense?
  SELECT * FROM %expenses% WHERE deleted = False AND amount < 0 ORDER BY amount ASC LIMIT 1

Example: What is my biggest income?
  SELECT * FROM %expenses% WHERE deleted = False AND amount > 0 ORDER BY amount DESC LIMIT 1
  `;
}

// -----------------------------------------------------------------------------
// DUCKDB
// -----------------------------------------------------------------------------

async function executeQuery(query) {
  const json = await post('/expenses/query', { data: { query } });
  renderTable(json);
}

function renderTable(rows) {
  $result.innerHTML = '<table><thead></thead><tbody></tbody></table>';

  const thead = $result.querySelector('thead');
  const tbody = $result.querySelector('tbody');

  const header = document.createElement('tr');
  thead.appendChild(header);

  for (const key of Object.keys(rows[0])) {
    const th = document.createElement('th');
    th.textContent = key;
    header.appendChild(th);
  }

  for (const row of rows) {
    const tr = document.createElement('tr');
    tbody.appendChild(tr);

    for (const val of Object.values(row)) {
      const td = document.createElement('td');
      td.textContent = val;
      tr.appendChild(td);
    }
  }
}

// -----------------------------------------------------------------------------
// HELPERS
// -----------------------------------------------------------------------------

async function post(url, { data, headers }) {
  headers = { 'Content-Type': 'application/json', ...headers };

  const body = JSON.stringify(data);
  const res = await fetch(url, { method: 'POST', headers, body });

  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`Request failed (${res.status}). ${msg}`);
  }

  const json = await res.json();
  return json;
}
