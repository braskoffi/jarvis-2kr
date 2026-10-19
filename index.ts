import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('APP_ORIGIN') || '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json; charset=utf-8',
};
const FREE_PROVIDER = 'openrouter';
const FREE_MODEL = 'openrouter/free';
type ChatMessage = { role: 'user' | 'assistant'; content: string };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: corsHeaders });
function cleanMessages(value: unknown): ChatMessage[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 20) throw new Error('messages doit contenir entre 1 et 20 messages.');
  const result: ChatMessage[] = [];
  for (const item of value) {
    if (!item || !['user','assistant'].includes(item.role) || typeof item.content !== 'string') throw new Error('Format de message invalide.');
    const content = item.content.trim();
    if (!content || content.length > 12000) throw new Error('Chaque message doit contenir entre 1 et 12000 caractères.');
    result.push({ role: item.role, content });
  }
  if (result[result.length - 1].role !== 'user') throw new Error('Le dernier message doit être un message utilisateur.');
  return result;
}
async function callFreeRouter(key: string, messages: ChatMessage[]) {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': Deno.env.get('APP_ORIGIN') || 'https://jarvis-2kr.vercel.app',
      'X-Title': 'JARVIS 2KR',
    },
    // Important: fixed server-side model prevents client from requesting a paid model.
    body: JSON.stringify({
      model: FREE_MODEL,
      messages: [{ role: 'system', content: 'Tu es JARVIS 2KR, un assistant utile, précis et transparent. Réponds en français sauf demande contraire.' }, ...messages],
      temperature: 0.6,
      max_tokens: 1800,
    }),
  });
  const data = await response.json();
  if (!response.ok) {
    const detail = data?.error?.message || `OpenRouter a répondu ${response.status}.`;
    throw new Error(`${detail} Le routeur gratuit peut être soumis à des quotas ou indisponible temporairement.`);
  }
  return { content: data.choices?.[0]?.message?.content || '', model: data.model || FREE_MODEL };
}
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Méthode non autorisée.' }, 405);
  try {
    const url = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_PUBLISHABLE_KEY');
    if (!url || !anonKey) return json({ error: 'Configuration Supabase incomplète.' }, 500);
    const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '').trim();
    if (!token) return json({ error: 'Authentification requise.' }, 401);
    const supabase = createClient(url, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false, autoRefreshToken: false } });
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return json({ error: 'Session invalide ou expirée.' }, 401);
    const body = await req.json();
    if (body?.action === 'providers') {
      return json({ providers: Deno.env.get('OPENROUTER_API_KEY') ? [FREE_PROVIDER] : [] });
    }
    if (body?.action !== 'chat') return json({ error: 'Action inconnue.' }, 400);
    // Deliberately reject all other providers and ignore any client-supplied model.
    if (body.provider !== FREE_PROVIDER) return json({ error: 'Seul le fournisseur gratuit OpenRouter est autorisé.' }, 400);
    const apiKey = Deno.env.get('OPENROUTER_API_KEY');
    if (!apiKey) return json({ error: 'Configure OPENROUTER_API_KEY dans les secrets Supabase.' }, 503);
    const messages = cleanMessages(body.messages);
    if (body.conversation_id) {
      if (typeof body.conversation_id !== 'string' || body.conversation_id.length > 80) return json({ error: 'Identifiant de conversation invalide.' }, 400);
      const { data: conversation, error } = await supabase.from('conversations').select('id').eq('id', body.conversation_id).eq('user_id', user.id).maybeSingle();
      if (error || !conversation) return json({ error: 'Conversation introuvable ou accès refusé.' }, 403);
    }
    const result = await callFreeRouter(apiKey, messages);
    if (!result.content) return json({ error: 'Le fournisseur a renvoyé une réponse vide.' }, 502);
    return json({ content: result.content.slice(0, 50000), provider: FREE_PROVIDER, model: result.model });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur interne.';
    console.error('jarvis-chat:', message);
    return json({ error: message }, 400);
  }
});
