export default async function handler(req) {
  if (req.method === 'GET') {
    return Response.json({
      ok: true,
      message: 'Endpoint de leads da Cevora online. Use POST para salvar leads.'
    });
  }

  if (req.method !== 'POST') {
    return Response.json(
      { ok: false, error: 'method_not_allowed' },
      { status: 405 }
    );
  }

  try {
    const supabaseUrl = getEnv('SUPABASE_URL').replace(/\/$/, '');
    const supabaseKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');

    const payload = await req.json();

    const whatsNormalizado = normalizePhone(payload.whats || payload.whatsapp || '');

    if (!whatsNormalizado) {
      return Response.json(
        { ok: false, error: 'missing_whatsapp' },
        { status: 400 }
      );
    }

    const eventId = clean(payload.event_id) || crypto.randomUUID();

    const lead = {
      nome: clean(payload.nome),
      whats: clean(payload.whats || payload.whatsapp),
      whats_normalizado: whatsNormalizado,
      email: clean(payload.email),

      especialidade: clean(payload.especialidade),
      cidade: clean(payload.cidade),

      resultado: clean(payload.resultado),
      dor: clean(payload.dor),
      desejo: clean(payload.desejo),
      gargalo: clean(payload.gargalo),
      resposta_final: clean(payload.respostaFinal || payload.resposta_final),

      origem: clean(payload.origem) || 'Diagnóstico Cevora',
      pagina: clean(payload.pagina || payload.page_url),
      referrer: clean(payload.referrer),
      user_agent: clean(payload.user_agent || req.headers.get('user-agent')),

      utm_source: clean(payload.utm_source),
      utm_medium: clean(payload.utm_medium),
      utm_campaign: clean(payload.utm_campaign),
      utm_content: clean(payload.utm_content),
      utm_term: clean(payload.utm_term),

      fbclid: clean(payload.fbclid),
      fbp: clean(payload.fbp),
      fbc: clean(payload.fbc),

      event_id: eventId,
      status: 'novo',

      respostas: makeJson(payload.respostas),
      raw_payload: payload
    };

    const savedLead = await insertLead({
      supabaseUrl,
      supabaseKey,
      lead
    });

    return Response.json({
      ok: true,
      lead_id: savedLead.id,
      event_id: eventId
    });

  } catch (error) {
    console.error('LEAD_ERROR', error);

    return Response.json(
      {
        ok: false,
        error: 'internal_error',
        details: error.message
      },
      { status: 500 }
    );
  }
}

export const config = {
  path: '/api/leads'
};

async function insertLead({ supabaseUrl, supabaseKey, lead }) {
  const response = await fetch(`${supabaseUrl}/rest/v1/leads`, {
    method: 'POST',
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation'
    },
    body: JSON.stringify(lead)
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(`Supabase insert failed: ${response.status} ${text}`);
  }

  const data = JSON.parse(text);
  return data[0];
}

function clean(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function normalizePhone(value) {
  const digits = String(value || '').replace(/\D/g, '');

  if (!digits) return '';

  if (digits.length === 11) {
    return `55${digits}`;
  }

  return digits;
}

function makeJson(value) {
  if (!value) return null;

  if (typeof value === 'object') {
    return value;
  }

  return { value: String(value) };
}

function getEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`missing_env_${name}`);
  }

  return value;
}
