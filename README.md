# Athena Query Builder

[![npm version](https://img.shields.io/npm/v/athena-query-builder?style=flat-square)](https://www.npmjs.com/package/athena-query-builder)
[![license](https://img.shields.io/npm/l/athena-query-builder?style=flat-square)](https://www.npmjs.com/package/athena-query-builder)
[![Node.js](https://img.shields.io/node/v/athena-query-builder?style=flat-square)](https://www.npmjs.com/package/athena-query-builder)
[![build](https://img.shields.io/github/actions/workflow/status/gammarers-aws-sdk-extensions/athena-query-builder/build.yml?label=build&style=flat-square)](https://github.com/gammarers-aws-sdk-extensions/athena-query-builder/actions/workflows/build.yml)

Fluent, immutable SQL builder for **AWS Athena** (Presto/Trino-style SQL). Build single-table `SELECT`, `INSERT`, `UPDATE`, and `DELETE` statements with escaped string literals—no query execution, catalog access, or ORM.

## Features

- **Fluent chain API** — Knex/Lucid-style method chaining; each call returns a new immutable instance
- **Unified builder** — One `AthenaQueryBuilder` class for `SELECT`, `INSERT`, `UPDATE`, and `DELETE`
- **Single-table `SELECT`** — `select`, `from`, `whereEq`, `whereNe`, `whereLt`, `whereGt`, `whereLte`, `whereGte`, `whereBetween`, `whereLike`, `whereIn`, `whereNotIn`, `orderBy`, `limit`
- **Single-table `INSERT`** — `into`, `values` (single or multiple rows)
- **Single-table `UPDATE`** — `update`, `set`, and the same `WHERE` methods as `SELECT`
- **Single-table `DELETE`** — `delete` and the same `WHERE` methods as `SELECT`
- **Statement isolation** — Mixing methods for different statement kinds on the same builder throws
- **Safe literals** — String values are escaped and embedded via `QuoteString` / `FormatScalar` (no bind parameters)
- **`whereIn` empty array** — Renders `1=0` (always false) instead of invalid `IN ()`
- **`whereNotIn` empty array** — Renders `1=1` (always true) instead of invalid `NOT IN ()`
- **Identifier validation** — Unquoted names limited to alphanumeric, dot, and underscore
- **TypeScript** — Strict types for columns, sort direction, insert rows, update assignments, and scalar values
- **Utilities** — `QuoteString`, `AssertIdentifier`, and `FormatScalar` for identifiers and scalar literals

## Installation

### npm

```bash
npm install athena-query-builder
```

### yarn

```bash
yarn add athena-query-builder
```

### pnpm

```bash
pnpm add athena-query-builder
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

### UPDATE

```typescript
import { AthenaQueryBuilder } from 'athena-query-builder';

const sql = new AthenaQueryBuilder()
  .update('example_table')
  .set({ example_value: 'hello', example_count: 1 })
  .whereEq('example_id', 'ex-1')
  .toSql();

console.log(sql);
```

Example output:

```sql
UPDATE example_table
SET example_value = 'hello', example_count = 1
WHERE example_id = 'ex-1'
```

With `whereIn` and multiple `set()` calls:

```typescript
const sql = new AthenaQueryBuilder()
  .update('example_table')
  .set({ example_status: 'archived' })
  .set({ deleted_at: null })
  .whereIn('example_key', ['ex-1', 'ex-2'])
  .toSql();
```

```sql
UPDATE example_table
SET example_status = 'archived', deleted_at = NULL
WHERE example_key IN ('ex-1', 'ex-2')
```

### DELETE

```typescript
import { AthenaQueryBuilder } from 'athena-query-builder';

const sql = new AthenaQueryBuilder()
  .delete('example_table')
  .whereEq('example_id', 'ex-1')
  .toSql();

console.log(sql);
```

Example output:

```sql
DELETE FROM example_table
WHERE example_id = 'ex-1'
```

With `whereIn`:

```typescript
const sql = new AthenaQueryBuilder()
  .delete('example_table')
  .whereIn('example_key', ['ex-1', 'ex-2'])
  .toSql();
```

```sql
DELETE FROM example_table
WHERE example_key IN ('ex-1', 'ex-2')
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
| `whereNe(column, value)` | `column <> literal` or `column IS NOT NULL` when `value` is `null`. |
| `whereLt(column, value)` | `column < literal`. `null` is rejected. |
| `whereGt(column, value)` | `column > literal`. `null` is rejected. |
| `whereLte(column, value)` | `column <= literal`. `null` is rejected. |
| `whereGte(column, value)` | `column >= literal`. `null` is rejected. |
| `whereBetween(column, low, high)` | `column BETWEEN low AND high` (inclusive; bounds are not reordered). `null` bounds are rejected. |
| `whereLike(column, pattern)` | `column LIKE 'pattern'`. `pattern` is a string. `%` and `_` stay wildcards; quotes are escaped. |
| `whereIn(column, values)` | `column IN (...)`; empty `values` → `1=0`. |
| `whereNotIn(column, values)` | `column NOT IN (...)`; empty `values` → `1=1`. `null` entries are rendered as `NULL`. |
| `orderBy(column, direction)` | Append one `ORDER BY` entry (`'asc'` \| `'desc'`). Any other direction is rejected. |
| `orderBy(entries)` | Append multiple `{ column, direction }` entries. Each direction must be `'asc'` or `'desc'`. |
| `limit(n)` | `LIMIT n` (`n` must be a non-negative integer). |

`toSql()` for `SELECT` requires both `select()` and `from()` to have been called.

#### INSERT

| Method | Description |
|--------|-------------|
| `into(table)` | Target table name (validated identifier). |
| `values(row)` | Append one row (`InsertRow`). |
| `values(rows)` | Append multiple rows with the same column keys as the first row. |

`toSql()` for `INSERT` requires both `into()` and `values()` to have been called.

#### UPDATE

| Method | Description |
|--------|-------------|
| `update(table)` | Target table name (validated identifier). |
| `set(assignments)` | `SET` column assignments (`UpdateAssignments`). Multiple calls merge; later values win for the same column. `null` → `column = NULL`. |
| `whereEq` / `whereNe` / `whereLt` / `whereGt` / `whereLte` / `whereGte` / `whereBetween` / `whereLike` / `whereIn` / `whereNotIn` | Same as SELECT. |

`toSql()` for `UPDATE` requires both `update()` and `set()` to have been called. `WHERE` is optional.

#### DELETE

| Method | Description |
|--------|-------------|
| `delete(table)` | Target table name (validated identifier). |
| `whereEq` / `whereNe` / `whereLt` / `whereGt` / `whereLte` / `whereGte` / `whereBetween` / `whereLike` / `whereIn` / `whereNotIn` | Same as SELECT. |

`toSql()` for `DELETE` requires `delete()` to have been called. `WHERE` is optional.

#### Shared

| Method | Description |
|--------|-------------|
| `toSql()` | Build the final SQL string (`SELECT`, `INSERT`, `UPDATE`, or `DELETE`). |
| `build()` | Alias for `toSql()`. |

Methods for different statement kinds (`SELECT` / `INSERT` / `UPDATE` / `DELETE`) cannot be mixed on the same builder instance. WHERE methods are shared by `SELECT`, `UPDATE`, and `DELETE`.

### Types

#### `WhereScalar`

`string` \| `number` \| `boolean` \| `null`

Used in `WHERE`, `INSERT`, `UPDATE` / `SET`, `DELETE`, and `VALUES` clauses. Non-finite numbers (`NaN`, `Infinity`) are rejected by `FormatScalar`.

#### `SelectColumn`

`string` \| `{ column: string; as?: string }`

A bare column name, or an object with an optional `AS` alias.

#### `OrderDirection`

`'asc'` \| `'desc'`

#### `OrderByEntry`

`{ column: string; direction: OrderDirection }`

#### `InsertRow`

`Record<string, WhereScalar>`

Column order follows `Object.keys` insertion order of the first row passed to `values()`.

#### `UpdateAssignments`

`Record<string, WhereScalar>`

Column order follows `Object.keys` insertion order of the object passed to `set()` (merged across multiple calls).

### Errors

Check the subclass before the base class.

| Error | When |
|-------|------|
| `AthenaQueryBuilderValidateError` | Invalid input: bad identifiers, missing required calls, mixed statement kinds, non-finite numbers, a sort direction other than `'asc'` or `'desc'`, `null` in comparisons or `BETWEEN`, or a non-string `LIKE` pattern. |
| `AthenaQueryBuilderError` | Abstract base. Every error from this package is an instance of this class. |

### Out of scope (current phase)

- `JOIN`, `WITH`, subquery `FROM`, `GROUP BY`, `HAVING`, window functions
- `StartQueryExecution`, result polling, Glue catalog APIs
- Environment variable reads or query-plan optimization

## Requirements

- **Node.js** `>= 20.0.0`

## License

This project is licensed under the Apache-2.0 License.
