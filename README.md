# BP Financeiro Pessoal

App de planejamento financeiro. Editável dentro do próprio app, funciona offline e instala na tela de início.

## Onde ficam os dados

Tudo é salvo no **localStorage do navegador**, só neste aparelho. Não vai para servidor nenhum.

No painel há um bloco de **Backup**: exporte um `.json` de tempos em tempos. Limpar os dados do site no navegador apaga tudo — o arquivo exportado é a única forma de recuperar (botão Importar).

## O que dá para fazer

- **Pagar / Receber** — adicionar, editar e excluir lançamentos; tocar no status para marcar
- **Fluxo** — digitar entradas e saídas de cada mês direto na tabela
- **Investir** — ajustar aporte e taxa; todas as projeções recalculam
- **Metas** — criar metas e atualizar o quanto já foi guardado
- **Tema claro / escuro** — botão no topo. Na primeira abertura segue o tema do sistema

## Publicar na Vercel

1. Suba esta pasta inteira num repositório no GitHub
2. vercel.com → Add New → Project → importe o repositório
3. Framework Preset: **Other**. Não preencha build nem output
4. Deploy

**Importante:** não ative `cleanUrls` nas configurações. Ele cria um redirect de `/index.html` para `/`, e o Safari recusa resposta redirecionada vinda do service worker — foi o que causava o erro *"Response served by service worker has redirections"*.

## Instalar no celular

- **iPhone:** Safari → Compartilhar → Adicionar à Tela de Início
- **Android:** Chrome → menu → Instalar app

## Se der erro depois de atualizar

O iOS guarda o service worker antigo. Para forçar:

1. Remova o app da tela de início
2. Ajustes → Safari → Avançado → Dados de sites → apague o domínio
3. Abra o link de novo no Safari e adicione à tela de início

Ao publicar versão nova, mude `bp-financeiro-v5` para `v5` no `sw.js`.

## Arquivos

| Arquivo | Função |
|---|---|
| `index.html` | o app inteiro |
| `manifest.json` | nome, ícone e cor de instalação |
| `sw.js` | cache offline, sem redirect |
| `icon-192/512.png` | ícone padrão |
| `icon-maskable.png` | recorte do Android |
| `icon-dark.png` | variante escura (opcional) |
| `favicon.png` | aba do navegador |
| `vercel.json` | cabeçalhos de deploy |

---
creative_dep.
