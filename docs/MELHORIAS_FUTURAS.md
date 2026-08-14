# Plano de Melhorias Futuras - PDV

Este documento detalha falhas lógicas e desvios dos padrões de mercado identificados na análise técnica de comissões, vendas e gestão de estoque.

---

## 1. Comissões e Lucratividade
### 1.1 Dedução de Taxas Operacionais (MDR)
- **Problema:** A comissão é calculada sobre o valor bruto (subtotal - desconto), ignorando as taxas de cartão.
- **Melhoria:** Implementar campo de "Taxa da Operadora" no cadastro de métodos de pagamento e abater esse valor da base de cálculo da comissão.

### 1.2 Comissões sobre Mão de Obra
- **Problema:** O campo `mao_de_obra` na venda é ignorado no cálculo de comissão.
- **Melhoria:** Permitir a configuração de uma taxa de comissão específica para serviços/mão de obra, separada da taxa de produtos.

### 1.3 Devoluções Parciais
- **Problema:** O sistema só permite cancelamento total da venda.
- **Melhoria:** Implementar fluxo de devolução de itens específicos com estorno proporcional da comissão do vendedor e atualização do estoque.

---

## 2. Gestão de Estoque e Custos
### 2.1 Custo Médio Ponderado (CMP)
- **Problema:** O custo do produto é apenas sobrescrito na atualização, perdendo a precisão do lucro real.
- **Melhoria:** Implementar o cálculo automático de CMP na entrada de novos produtos:
  `Novo Custo = (Estoque Atual * Custo Atual + Qtd Comprada * Custo Compra) / (Estoque Atual + Qtd Comprada)`

### 2.2 Unidades de Medida Decimais
- **Problema:** O sistema usa inteiros (`parseInt`) para estoque.
- **Melhoria:** Alterar a lógica de estoque para aceitar decimais (float), permitindo a venda de produtos por KG, Litros ou Metros.

---

## 3. Conformidade Fiscal e Financeira
### 3.1 Base de Cálculo Líquida de Impostos
- **Problema:** Pagamento de comissão sobre valores de impostos.
- **Melhoria:** Adicionar campos fiscais básicos (ICMS/PIS/COFINS sugeridos ou fixos) para extrair o valor de impostos da base de cálculo da comissão.

### 3.2 Trava de Margem Negativa
- **Problema:** O sistema permite vender ou cadastrar produtos com preço de venda abaixo do custo sem aviso.
- **Melhoria:** Implementar um alerta ou bloqueio (bypass com senha de gerente) para casos de margem de lucro negativa.

---

## 4. Próximos Passos Sugeridos
1. **Prioridade 1:** Implementar Dedução de Taxas Operacionais (MDR) para proteger a margem do lojista.
2. **Prioridade 2:** Corrigir a lógica de Mão de Obra no cálculo de comissão.
3. **Prioridade 3:** migrar para Custo Médio Ponderado.

---
*Documento gerado em 09/04/2026 como guia de evolução do sistema.*
