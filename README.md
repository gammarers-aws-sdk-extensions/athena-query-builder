# Athena Query Builder

[![npm version](https://img.shields.io/npm/v/athena-query-builder/latest.svg)](https://www.npmjs.com/package/athena-query-builder)
[![license](https://img.shields.io/github/license/gammarers-aws-sdk-extensions/athena-query-builder.svg)](https://github.com/gammarers-aws-sdk-extensions/athena-query-builder/blob/main/LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20.0.0-339933?logo=node.js&logoColor=white)](https://nodejs.org/)

Fluent, immutable SQL builder for **AWS Athena** (Presto/Trino-style SQL). Build single-table `SELECT` and `INSERT` statements with escaped string literals—no query execution, catalog access, or ORM.

## Features

- **Fluent chain API** — Knex/Lucid-style method chaining; each call returns a new immutable instance
- **Unified builder** — One `AthenaQueryBuilder` class for `SELECT` and `INSERT`
- **Single-table `SELECT`** — `select`, `from`, `whereEq`, `whereIn`, `orderBy`, `limit`
- **Single-table `INSERT`** — `into`, `values` (single or multiple rows)
- **Statement isolation** — Mixing `SELECT` and `INSERT` methods on the same builder throws
- **Safe literals** — String values are escaped and embedded via `QuoteString` / `FormatScalar` (no bind parameters)
- **`whereIn` empty array** — Renders `1=0` (always false) instead of invalid `IN ()`
- **Identifier validation** — Unquoted names limited to alphanumeric, dot, and underscore (Phase 1)
- **TypeScript** — Strict types for columns, sort direction, insert rows, and scalar values
- **Utilities** — `QuoteString`, `AssertIdentifier`, and `FormatScalar` classes under `utils/` for reuse

## Installation

**npm**

```bash
npm install athena-query-builder
```

**yarn**

```bash
yarn add athena-query-builder
```

## Usage

### SELECT

```typescript
import { AthenaQueryBuilder } from 'athena-query-builder';

const exampleKeys = ['ex-1', 'ex-2'];

const sql = new AthenaQueryBuilder()
  .select(['example_id', { column: 'example_value', as: 'v' }])
  .from('example_table')
  .whereIn('example_key', exampleKeys)
  .whereEq('example_status', 'active')
  .orderBy('example_id', 'asc')
  .limit(1000)
  .toSql();

console.log(sql);
```

Example output:

```sql
SELECT example_id, example_value AS v
FROM example_table
WHERE example_key IN ('ex-1', 'ex-2') AND example_status = 'active'
ORDER BY example_id ASC
LIMIT 1000
```

### INSERT

```typescript
import { AthenaQueryBuilder } from 'athena-query-builder';

const sql = new AthenaQueryBuilder()
  .into('example_table')
  .values({ example_id: 'ex-1', example_value: 'hello' })
  .toSql();

console.log(sql);
```

Example output:

```sql
INSERT INTO example_table (example_id, example_value)
VALUES ('ex-1', 'hello')
```

Multiple rows:

```typescript
const sql = new AthenaQueryBuilder()
  .into('example_table')
  .values([
    { example_id: 'ex-1', example_value: 'a' },
    { example_id: 'ex-2', example_value: 'b' },
  ])
  .toSql();
```

```sql
INSERT INTO example_table (example_id, example_value)
VALUES ('ex-1', 'a'), ('ex-2', 'b')
```

### Immutable branching

Reuse a base builder and branch without side effects:

```typescript
const base = new AthenaQueryBuilder()
  .select(['example_id'])
  .from('example_table');

const forKeyA = base.whereIn('example_key', ['ex-a']);
const forKeyB = base.whereIn('example_key', ['ex-b']);
```

### SQL formatting utilities

```typescript
import { QuoteString, AssertIdentifier, FormatScalar } from 'athena-query-builder';

new QuoteString().execute("it's");              // "'it''s'"
new AssertIdentifier().execute('example_table'); // 'example_table'
new FormatScalar().execute(42);                  // '42'
```

## Options

### `AthenaQueryBuilder`

#### SELECT

| Method | Description |
|--------|-------------|
| `select(columns)` | `SELECT` list. Each entry is a column name or `{ column, as? }`. |
| `from(table)` | Single table name (validated identifier). |
| `whereEq(column, value)` | `column = literal` or `column IS NULL` when `value` is `null`. |
| `whereIn(column, values)` | `column IN (...)`; empty `values` → `1=0`. |
| `orderBy(column, direction)` | Append one `ORDER BY` entry (`'asc'` \| `'desc'`). |
| `orderBy(entries)` | Append multiple `{ column, direction }` entries. |
| `limit(n)` | `LIMIT n` (`n` must be a non-negative integer). |

`toSql()` for `SELECT` requires both `select()` and `from()` to have been called.

#### INSERT

| Method | Description |
|--------|-------------|
| `into(table)` | Target table name (validated identifier). |
| `values(row)` | Append one row (`InsertRow`). |
| `values(rows)` | Append multiple rows with the same column keys as the first row. |

`toSql()` for `INSERT` requires both `into()` and `values()` to have been called.

#### Shared

| Method | Description |
|--------|-------------|
| `toSql()` | Build the final SQL string (`SELECT` or `INSERT`). |
| `build()` | Alias for `toSql()`. |

`SELECT` and `INSERT` methods cannot be mixed on the same builder instance.

### Types

#### `WhereScalar`

`string` \| `number` \| `boolean` \| `null`

Used in `WHERE`, `INSERT`, and future `UPDATE` / `SET` clauses.

#### `InsertRow`

`Record<string, WhereScalar>`

Column order follows `Object.keys` insertion order of the first row passed to `values()`.

### Out of scope (current phase)

- `UPDATE`, `DELETE`
- `JOIN`, `WITH`, subquery `FROM`, `GROUP BY`, `HAVING`, window functions
- `StartQueryExecution`, result polling, Glue catalog APIs
- Environment variable reads or query-plan optimization

## Requirements

- **Node.js** `>= 20.0.0`

## License

This project is licensed under the Apache-2.0 License.
