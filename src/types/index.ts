export interface Product {
    id?: number;
    codigo: string;
    descricao: string;
    preco_venda: number;
    custo: number;
    estoque_atual: number;
    ativo: boolean;
    tipo: 'novo' | 'usado';
}

export interface ProductHistory {
    id: number;
    produto_id: number;
    preco_antigo: number;
    preco_novo: number;
    estoque_antigo: number;
    estoque_novo: number;
    tipo_alteracao: 'atualizacao' | 'cadastro_inicial';
    data_alteracao: number;
    descricao?: string;
    codigo?: string;
}

export interface User {
    id: number;
    nome: string;
    username: string;
    cargo: 'admin' | 'caixa';
    ativo?: boolean;
}

export interface SaleItem {
    id: number;
    venda_id: number;
    produto_id: number;
    quantidade: number;
    preco_unitario: number;
    custo_unitario: number;
    descricao?: string;
    codigo?: string;
    tipo?: 'novo' | 'usado';
}

export interface SalePayment {
    id?: number;
    venda_id?: number;
    metodo: string;
    valor: number;
    detalhes?: string;
}

export interface Sale {
    id?: number;
    vendedor_id: number;
    trocador_id?: number | null;
    cliente_id?: number | null;
    vendedor_nome?: string;
    trocador_nome?: string;
    cliente_nome?: string;
    subtotal: number;
    acrescimo_valor: number;
    desconto_valor: number;
    desconto_tipo: 'fixed' | 'percent';
    mao_de_obra: number;
    total_final: number;
    forma_pagamento?: string;
    data_venda: number;
    cancelada?: boolean;
    motivo_cancelamento?: string;
    data_cancelamento?: number;
    lista_pagamentos?: SalePayment[];
    comissao_real?: number;
}

export interface Client {
    id?: number;
    nome: string;
    documento?: string;
    telefone?: string;
    email?: string;
    endereco?: string;
    ativo?: boolean;
    saldo_devedor?: number;
}

export interface Debt {
    id: number;
    cliente_id: number;
    venda_id?: number;
    descricao: string;
    valor_total: number;
    valor_pago: number;
    status: 'PENDENTE' | 'PARCIAL' | 'PAGO';
    data_lancamento: number;
}

export interface Role {
    id: number;
    nome: string;
}

export interface Person {
    id?: number;
    nome: string;
    cargo_id?: number;
    cargo_nome?: string;
    comissao_fixa?: number;
}

export interface CompanyInfo {
    empresa_nome: string;
    empresa_endereco: string;
    empresa_telefone: string;
    empresa_cnpj: string;
    empresa_logo: string;
    empresa_logo_url?: string;
}

export interface Printer {
    name: string;
}

export interface DashboardStats {
    faturamento: number;
    lucro: number;
    vendasCount: number;
    maoDeObra: number;
    comissoes: number;
}

export interface InventoryStats {
    custoTotal: number;
    vendaPotencial: number;
    lucroProjetado: number;
    qtdZerados: number;
    qtdBaixoEstoque: number;
    totalItensFisicos: number;
}

export interface WeeklySales {
    labels: string[];
    data: number[];
}
