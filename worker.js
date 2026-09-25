const ETRACKING_URL = "http://etracking.eprofessionalti.com/controller/etracking/cliente/search_container";
const ALLOWED_ORIGIN = "https://guilherme7226.github.io";
const CLIENT_CNPJ = "08.473.312/0001-24";

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin === ALLOWED_ORIGIN ? ALLOWED_ORIGIN : "null",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin"
  };
}

function json(data, status, origin) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...corsHeaders(origin)
    }
  });
}

function validContainer(value) {
  return /^[A-Z]{4}[0-9]{7}$/.test(value);
}

export default {
  async fetch(request) {
    const origin = request.headers.get("Origin") || "";

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (origin !== ALLOWED_ORIGIN) {
      return json({ success: false, msg: "Origem não autorizada." }, 403, origin);
    }

    if (request.method !== "POST") {
      return json({ success: false, msg: "Use POST." }, 405, origin);
    }

    try {
      const body = await request.json();
      const container = String(body.container || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

      if (!validContainer(container)) {
        return json({ success: false, msg: "Número de container inválido." }, 400, origin);
      }

      const form = new FormData();
      form.append("cnpj", CLIENT_CNPJ);
      form.append("container", container);

      const upstream = await fetch(ETRACKING_URL, {
        method: "POST",
        body: form,
        headers: {
          "User-Agent": "COSTALOG eTracking Proxy"
        }
      });

      const text = await upstream.text();

      let data;
      try {
        data = JSON.parse(text);
      } catch {
        return json({
          success: false,
          msg: "O eTracking não retornou JSON.",
          upstreamStatus: upstream.status
        }, 502, origin);
      }

      return json(data, upstream.ok ? 200 : 502, origin);
    } catch (error) {
      return json({
        success: false,
        msg: "Erro ao consultar o eTracking."
      }, 502, origin);
    }
  }
};
