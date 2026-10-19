import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import assert from 'node:assert/strict';
const root = process.cwd();
const sql = readFileSync(join(root,'supabase/migrations/20261019000100_jarvis_schema.sql'),'utf8');
const fn = readFileSync(join(root,'supabase/functions/jarvis-chat/index.ts'),'utf8');
const app = readFileSync(join(root,'src/app.js'),'utf8');
const requiredTables = ['profiles','conversations','messages','memories','tasks','activity_events'];
for (const table of requiredTables) {
  assert.match(sql, new RegExp(`create table if not exists public\\.${table}\\b`), `Missing table ${table}`);
  assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`), `RLS missing on ${table}`);
}
assert.ok(fn.includes('openrouter/free'), 'Free-only OpenRouter model router missing');
assert.ok(fn.includes('body.provider !== FREE_PROVIDER'), 'Server must reject paid/unknown providers');
assert.ok(fn.includes('model: FREE_MODEL'), 'Model must be fixed server-side to free router');
assert.match(fn,/auth\.getUser\(token\)/,'Edge Function must validate the session');
assert.match(fn,/conversation_id/,'Conversation ownership check expected');
assert.match(app,/createClient/,'Supabase client expected');
assert.match(app,/jarvis-chat/,'Frontend must invoke Edge Function');
assert.doesNotMatch(app,/(?:OPENROUTER_API_KEY)\s*[:=]|service_role\s*[:=]/i,'Private keys must not appear in frontend');
const env = readFileSync(join(root,'.env.example'),'utf8');
assert.doesNotMatch(env,/(?:OPENROUTER_API_KEY)\s*=|service_role\s*=/i,'Private secrets must not be included in example env');
console.log(`Static architecture checks passed: ${requiredTables.length} RLS tables, free-only OpenRouter route, auth verification, no frontend provider secrets.`);
