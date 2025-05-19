
const API_KEY = process.env.X_API_KEY;

const DIRECTUS_URL = process.env.DIRECTUS_URL;
const DIRECTUS_COLLECTION = process.env.DIRECTUS_COLLECTION;
const DIRECTUS_API_KEY = process.env.DIRECTUS_API_KEY;

// Função principal para processar a consulta do interno
const handleGet = async (req: Request): Promise<Response> => {
  const url = new URL(req.url);
  const prisonerId = url.searchParams.get("variant_id");

  const erroResponse = validatePrisonerId(prisonerId);
  if (erroResponse) {
    return erroResponse;
  }

  // Se a validação passar, busca os dados
  return await fetchPrisonerData(Number(prisonerId));
};


// POST: criar um novo registro
const handlePost = async (req: Request): Promise<Response> => {
  try {
    const body = await req.json();

    const res = await fetch(`${DIRECTUS_URL}/items/${DIRECTUS_COLLECTION}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${DIRECTUS_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const errorJson = await res.json();
      return createErrorResponse(`Erro ao criar registro: ${JSON.stringify(errorJson)}`, res.status);
    }

    const json = await res.json() as { data?: any };

    return new Response(JSON.stringify(json.data), {
      status: 201,
      headers: { "Content-Type": "application/json" }
    });

  } catch (err) {
    return createErrorResponse(`Erro ao criar registro: ${(err as Error).message}`, 500);
  }
};

// PUT: atualizar um registro existente pelo variant_id
const handlePut = async (req: Request): Promise<Response> => {
  const url = new URL(req.url);
  const variantId = url.searchParams.get("variant_id");
  if (!variantId) return createErrorResponse("variant_id não fornecido", 400);

  try {
    const body = await req.json();

    const res = await fetch(`${DIRECTUS_URL}/items/${DIRECTUS_COLLECTION}/${variantId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${DIRECTUS_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const errorJson = await res.json();
      return createErrorResponse(`Erro ao atualizar registro: ${JSON.stringify(errorJson)}`, res.status);
    }

    const json = await res.json() as { data?: any };

    return new Response(JSON.stringify(json.data), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (err) {
    return createErrorResponse(`Erro ao atualizar registro: ${(err as Error).message}`, 500);
  }
};

// DELETE: apagar um registro pelo variant_id
const handleDelete = async (req: Request): Promise<Response> => {
  const url = new URL(req.url);
  const variantId = url.searchParams.get("variant_id");
  if (!variantId) return createErrorResponse("variant_id não fornecido", 400);

  try {
    const res = await fetch(`${DIRECTUS_URL}/items/${DIRECTUS_COLLECTION}/${variantId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${DIRECTUS_API_KEY}`,
        "Content-Type": "application/json"
      }
    });

    if (res.status === 204) {
      return new Response(null, { status: 204 });
    }

    if (!res.ok) {
      const errorJson = await res.json();
      return createErrorResponse(`Erro ao deletar registro: ${JSON.stringify(errorJson)}`, res.status);
    }

    return new Response(null, { status: 204 });

  } catch (err) {
    return createErrorResponse(`Erro ao deletar registro: ${(err as Error).message}`, 500);
  }
};
// Função para validar o ID do preso
const validatePrisonerId = (prisonerId: string | null): Response | null => {
  if (!prisonerId) {
    return createErrorResponse("variant_id não fornecido", 400);
  }

  const prisonerIdNum = Number(prisonerId);

  if (!Number.isInteger(prisonerIdNum)) {
    return createErrorResponse("variant_id deve ser um número inteiro", 422);
  }

  if (prisonerIdNum <= 0) {
    return createErrorResponse("variant_id inválido", 422);
  }

  return null;
};

// Busca dados do Directus
const fetchPrisonerData = async (prisonerId: number): Promise<Response> => {
  console.log(`Buscando dados para variant_id: ${prisonerId}`);
  const variantId = `${String(prisonerId).padStart(3, "0")}`;

  try {
    const res = await fetch(
      `${DIRECTUS_URL}/items/${DIRECTUS_COLLECTION}?filter[id][_eq]=${variantId}`,
      {
        headers: {
          Authorization: `Bearer ${DIRECTUS_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    const json = await res.json() as { data?: any };

    console.log("Resposta do Directus:", json);
    if (!json.data || (Array.isArray(json.data) && json.data.length === 0)) {
      return createErrorResponse("Registro não encontrado", 404);
    }

    const record = Array.isArray(json.data) ? json.data[0] : json.data;

    return new Response(JSON.stringify(record), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (err) {
    console.error("Erro ao consultar Directus:", err);
    return createErrorResponse(`Erro inesperado: ${(err as Error).message}`, 500);
  }
};

// Função para criar respostas de erro padronizadas
const createErrorResponse = (message: string, status: number): Response => {
  return new Response(
    JSON.stringify({ error: message }),
    {
      status: status,
      headers: { "Content-Type": "application/json" }
    }
  );
};

// Função para verificar a autenticação da API
const validateApiKey = (clientKey: string | null): boolean => {
  return clientKey === API_KEY;
};

// Configura o servidor
Bun.serve({
  port: 3000,
  routes: {
    "/api/temporal_variants/": async (req) => {
      console.log("listening on port 3000");

      const url = new URL(req.url);
      console.log(`Recebida requisição: ${req.method} ${url.pathname}`);

      const clientKey = req.headers.get("X-API-KEY");

      if (!validateApiKey(clientKey)) {
        return createErrorResponse("Credencial inválida", 401);
      }

      switch (req.method) {
        case "GET":
          return await handleGet(req);
        case "POST":
          return await handlePost(req);
        case "PUT":
          return await handlePut(req);
        case "DELETE":
          return await handleDelete(req);
        default:
          return createErrorResponse("Método HTTP não permitido", 405);
      }
    }
  }
});
