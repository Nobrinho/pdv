# Serviços — descrição de conteúdo e fluxo (mobile, online)

> Versão de **conteúdo/design** (não técnica). Foco no modo **online**.

## Em uma frase

É onde ficam registrados os serviços/mão de obra prestados (com o técnico
responsável e o valor), para acompanhar quanto de serviço foi feito e por quem.

## Como a pessoa chega aqui

- Toca em **Serviços** na navegação.
- Serviços também nascem dentro de uma **venda** (mão de obra + técnico).

## Esboço da tela (celular)

```
┌───────────────────────────┐
│ Serviços     [+ Registrar] │
│ Período: Mês ▾             │
├───────────────────────────┤
│ ┌──────────┐ ┌──────────┐  │
│ │ Qtd Serv.│ │Total Pago│  │  ← indicadores do período
│ │    18    │ │ R$ 2.340 │  │
│ └──────────┘ └──────────┘  │
├───────────────────────────┤
│ Lista                      │
│ • Troca de óleo  · João    │
│   R$ 60 · 12/08            │
│ • Revisão freios · Maria   │
│   R$ 180 · 11/08           │
└───────────────────────────┘
```

## Blocos de conteúdo (o que aparece)

1. **Cabeçalho** — título, **Registrar serviço** e **período**.
2. **Indicadores** — **Qtd. de serviços** e **Total pago (saída)** no período.
3. **Lista de serviços** — descrição, **técnico** responsável, **valor** e data.
4. **Registro (modal/formulário)** — descrição do serviço, técnico e valor.

## O que a pessoa pode fazer

- **Registrar** um serviço avulso.
- **Ver o total** de serviços do período e quem executou.
- **Filtrar por período**.

## Fluxos

**Registrar serviço**
1. **Registrar** → descreve o serviço, escolhe o **técnico** e o **valor** →
   salva.
2. Entra na lista e soma nos indicadores (e na comissão do técnico, quando aplica).

## Estados visuais

- **Carregando**: esqueleto de indicadores/lista.
- **Sem serviços no período**: mensagem neutra com atalho para **Registrar**.
- **Salvando**: botão em carregamento.

## Diretrizes para o redesenho mobile

- **Indicadores no topo**, lista em cartões abaixo.
- **Técnico e valor** bem visíveis em cada item (é o que interessa para comissão).
- **Período sempre à mão**.
- Coerência com **Vendas**: o mesmo conceito de "mão de obra + técnico" aparece
  aqui e lá.
