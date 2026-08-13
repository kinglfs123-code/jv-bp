# BP Financeiro Pessoal

App de planejamento financeiro. Tudo é editável dentro do próprio app — não precisa mexer no código.

## O que dá para fazer

- **Pagar / Receber** — adicionar, editar e excluir lançamentos; tocar no status para marcar como pago ou recebido
- **Fluxo** — digitar entradas e saídas de cada mês direto na tabela
- **Investir** — ajustar aporte mensal e taxa; todas as projeções recalculam
- **Metas** — criar metas e atualizar o quanto já foi guardado

Tudo recalcula em tempo real e é salvo automaticamente no aparelho.

## Arquivos

| Arquivo | Função |
|---|---|
| `index.html` | o app inteiro |
| `manifest.json` | nome, ícone e cor de instalação |
| `sw.js` | funciona offline |
| `icon-192.png` / `icon-512.png` | ícone |
| `vercel.json` | cabeçalhos de deploy |

## Publicar

**Vercel** — suba a pasta no GitHub → vercel.com → Add New → Project → preset **Other**, sem build → Deploy
**Netlify** — arraste a pasta em app.netlify.com/drop
**GitHub Pages** — Settings → Pages → branch `main`, pasta `/root`

## Instalar no celular

- **iPhone:** Safari → Compartilhar → Adicionar à Tela de Início
- **Android:** Chrome → menu → Instalar app

Ao publicar versão nova, mude `bp-financeiro-v2` para `v3` no `sw.js`.

---
creative_dep.
