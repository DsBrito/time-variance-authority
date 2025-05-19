import { readFile } from "fs/promises";

const API_KEY = process.env.X_API_KEY;

// Função principal para processar a consulta do interno
const handleConsultaInterno = async (req: Request): Promise<Response> => {
  const url = new URL(req.url);
  const prisonerId = url.searchParams.get("variant_id");

  // Valida o ID do preso
  const erroResponse = validatePrisonerId(prisonerId);
  if (erroResponse) {
    return erroResponse;
  }

  // Se a validação passar, busca os dados
  return await fetchPrisonerData(Number(prisonerId));
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

// Função para buscar dados do preso no arquivo JSON
const fetchPrisonerData = async (prisonerId: number): Promise<Response> => {
  try {
    const data = await readFile("data/mock-data.json", "utf-8");
    const prisoners = JSON.parse(data) as Array<Record<string, unknown>>;

    const prisoner = prisoners.find(
      (prisoner) => prisoner.id === prisonerId
    );

    if (!prisoner) {
      return createErrorResponse("Registro não encontrado", 404);
    }

    return new Response(JSON.stringify(prisoner), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    console.error("Erro ao ler o arquivo JSON:", err);
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

// Função para verificar a autenticação API
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

      return handleConsultaInterno(req);

    }
  }
});
