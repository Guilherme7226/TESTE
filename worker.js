const ETRACKING_URL = "http://etracking.eprofessionalti.com/controller/etracking/cliente/search_container";
const CONSULTA_DANFE_URL = "https://consultadanfe.com/api/v1/consulta";
const ALLOWED_ORIGIN = "https://guilherme7226.github.io";
const CLIENT_CNPJ = "08.473.312/0001-24";

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin === ALLOWED_ORIGIN ? ALLOWED_ORIGIN : "null",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Expose-Headers": "X-Error-Code, X-RateLimit-Limit, X-RateLimit-Remaining, Retry-After",
    "Vary": "Origin"
  };
}

function json(data, status, origin, extraHeaders={}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...corsHeaders(origin),
      ...extraHeaders
    }
  });
}

function validContainer(value) {
  return /^[A-Z]{4}[0-9]{7}$/.test(value);
}

async function handleContainer(request, origin){
  const body = await request.json();
  const container = String(body.container || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!validContainer(container)) return json({ success:false, msg:"Número de container inválido." },400,origin);

  const form = new FormData();
  form.append("cnpj", CLIENT_CNPJ);
  form.append("container", container);

  const upstream = await fetch(ETRACKING_URL, {
    method:"POST",
    body:form,
    headers:{ "User-Agent":"COSTALOG eTracking Proxy" }
  });

  const text = await upstream.text();
  try {
    return json(JSON.parse(text), upstream.ok ? 200 : 502, origin);
  } catch {
    return json({ success:false, msg:"O eTracking não retornou JSON.", upstreamStatus:upstream.status },502,origin);
  }
}

async function handleNfe(request, origin){
  const body = await request.json();
  const chave = String(body.chave || "").replace(/\D/g,"").slice(0,44);
  if(chave.length !== 44) return json({error:"chave_invalida",message:"A chave precisa ter 44 dígitos."},400,origin);

  const upstream = await fetch(CONSULTA_DANFE_URL,{
    method:"POST",
    headers:{
      "Content-Type":"application/json",
      "Accept":"application/json",
      "User-Agent":"COSTALOG NF-e Proxy"
    },
    body:JSON.stringify({chave,format:"json"})
  });

  const text = await upstream.text();
  const forward = {};
  for(const h of ["X-Error-Code","X-RateLimit-Limit","X-RateLimit-Remaining","Retry-After"]){
    const v=upstream.headers.get(h); if(v) forward[h]=v;
  }
  return new Response(text,{
    status:upstream.status,
    headers:{
      "Content-Type":upstream.headers.get("Content-Type") || "application/json; charset=utf-8",
      ...corsHeaders(origin),
      ...forward
    }
  });
}

export default {
  async fetch(request) {
    const origin = request.headers.get("Origin") || "";
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status:204, headers:corsHeaders(origin) });
    }
    if (origin !== ALLOWED_ORIGIN) {
      return json({ success:false, msg:"Origem não autorizada." },403,origin);
    }
    if (request.method !== "POST") {
      return json({ success:false, msg:"Use POST." },405,origin);
    }

    try {
      if(url.pathname === "/nfe" || url.pathname.endsWith("/nfe")) return await handleNfe(request,origin);
      if(url.pathname === "/container" || url.pathname.endsWith("/container")) return await handleContainer(request,origin);
      return json({success:false,msg:"Rota não encontrada."},404,origin);
    } catch(error) {
      return json({success:false,msg:"Erro interno no proxy."},502,origin);
    }
  }
};
