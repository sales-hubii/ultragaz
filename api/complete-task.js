// Vercel Serverless Function
// POST /api/complete-task
// body: { pageId: string, status: string }
//
// Atualiza o Status da task no Notion para o valor informado em `status`.
// "Status" é uma propriedade do tipo "status" (não "select") na database
// "Task List" da Ultragaz (mesmo tipo usado na Iconic), então o corpo
// precisa usar { status: { name: "..." } }.
//
// Diferente da versão da Iconic (que sempre volta para "Waiting" ao
// desmarcar), aqui o cliente informa o status-alvo explicitamente — ao
// marcar, envia "Done"; ao desmarcar, envia o status ORIGINAL que a tarefa
// tinha antes (ex: "To-Do" ou "Waiting"), preservando o valor real de cada
// tarefa em vez de um fallback fixo.
//
// Valores válidos desta database: "Backlog", "To-Do", "Waiting", "On Going",
// "Paused", "Done".

const VALID_STATUSES = ['Backlog', 'To-Do', 'Waiting', 'On Going', 'Paused', 'Done'];

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { pageId, status } = req.body || {};

  if (!pageId) {
    return res.status(400).json({ error: 'pageId é obrigatório' });
  }
  if (!status || !VALID_STATUSES.includes(status)) {
    return res.status(400).json({
      error: `status é obrigatório e precisa ser um de: ${VALID_STATUSES.join(', ')}`,
    });
  }

  const token = process.env.NOTION_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'NOTION_TOKEN não configurado no ambiente da Vercel' });
  }

  try {
    const response = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: {
          Status: { status: { name: status } },
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data });
    }

    return res.status(200).json({ success: true, status });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
