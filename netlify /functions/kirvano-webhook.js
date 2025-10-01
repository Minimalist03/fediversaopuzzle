import { createClient } from '@supabase/supabase-js';

// Inicializar Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function handler(event, context) {
  // Log para debug - ver o que chegou
  console.log('=== WEBHOOK RECEBIDO ===');
  console.log('Método:', event.httpMethod);
  console.log('Headers:', event.headers);
  console.log('Body:', event.body);

  // Apenas aceitar POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Método não permitido. Use POST.' })
    };
  }

  try {
    // Parsear dados recebidos
    const dados = JSON.parse(event.body);
    console.log('Dados parseados:', JSON.stringify(dados, null, 2));

    // ===== ADAPTAÇÃO GENÉRICA =====
    // Tenta encontrar email do cliente em vários formatos possíveis
    const clienteEmail = 
      dados.email || 
      dados.customer_email || 
      dados.client_email ||
      dados.buyer_email ||
      dados.Customer?.email ||
      dados.customer?.email ||
      dados.user?.email ||
      dados.purchaser_email;

    // Tenta encontrar nome do cliente
    const clienteNome = 
      dados.name || 
      dados.customer_name ||
      dados.client_name ||
      dados.full_name ||
      dados.Customer?.name ||
      dados.Customer?.full_name ||
      dados.customer?.name ||
      dados.user?.name;

    // Tenta encontrar status do pagamento
    const status = 
      dados.status || 
      dados.payment_status ||
      dados.order_status ||
      dados.transaction_status ||
      dados.estado ||
      '';

    const statusLower = status.toLowerCase();

    // Tenta encontrar valor pago
    const valorPago = 
      dados.amount || 
      dados.value ||
      dados.price ||
      dados.total ||
      dados.order_amount ||
      dados.valor ||
      0;

    // Tenta encontrar ID do pedido
    const pedidoId = 
      dados.id ||
      dados.order_id ||
      dados.transaction_id ||
      dados.payment_id ||
      dados.purchase_id ||
      '';

    // Tenta encontrar ID do produto
    const produtoId = 
      dados.product_id ||
      dados.item_id ||
      dados.product?.id ||
      dados.produto_id ||
      '';

    console.log('=== DADOS EXTRAÍDOS ===');
    console.log('Email:', clienteEmail);
    console.log('Nome:', clienteNome);
    console.log('Status:', status);
    console.log('Valor:', valorPago);
    console.log('Pedido ID:', pedidoId);

    // Validar se conseguimos o email (obrigatório)
    if (!clienteEmail) {
      console.error('❌ Email não encontrado no webhook!');
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          error: 'Email do cliente não encontrado',
          dadosRecebidos: dados 
        })
      };
    }

    // ===== PROCESSAR PAGAMENTO APROVADO =====
    const statusAprovados = [
      'paid', 'approved', 'completed', 'success', 
      'pago', 'aprovado', 'concluido', 'confirmado',
      'active', 'ativo'
    ];

    if (statusAprovados.some(s => statusLower.includes(s))) {
      console.log('✅ Pagamento APROVADO - Ativando premium');

      // Inserir ou atualizar no Supabase
      const { data: usuario, error } = await supabase
        .from('usuarios_premium')
        .upsert([
          {
            email: clienteEmail,
            nome: clienteNome || 'Não informado',
            produto_id: produtoId,
            valor_pago: parseFloat(valorPago) || 0,
            pedido_id: pedidoId,
            data_pagamento: new Date().toISOString(),
            status: 'ativo',
            webhook_data: dados // Salva dados completos para debug
          }
        ], {
          onConflict: 'email' // Se já existir, atualiza
        })
        .select();

      if (error) {
        console.error('❌ Erro ao salvar no Supabase:', error);
        return {
          statusCode: 500,
          body: JSON.stringify({ 
            error: 'Erro ao processar pagamento',
            detalhe: error.message 
          })
        };
      }

      console.log('✅ Usuário premium ativado:', usuario);

      return {
        statusCode: 200,
        body: JSON.stringify({ 
          success: true,
          message: 'Pagamento processado com sucesso',
          email: clienteEmail,
          status: 'premium_ativado'
        })
      };
    }

    // ===== PROCESSAR CANCELAMENTO/REEMBOLSO =====
    const statusCancelados = [
      'refunded', 'cancelled', 'canceled', 'chargeback',
      'reembolsado', 'cancelado', 'estornado'
    ];

    if (statusCancelados.some(s => statusLower.includes(s))) {
      console.log('⚠️ Pagamento CANCELADO - Desativando premium');

      const { error } = await supabase
        .from('usuarios_premium')
        .update({ 
          status: 'cancelado',
          data_cancelamento: new Date().toISOString()
        })
        .eq('email', clienteEmail);

      if (error) {
        console.error('❌ Erro ao cancelar:', error);
      }

      return {
        statusCode: 200,
        body: JSON.stringify({ 
          success: true,
          message: 'Acesso premium cancelado',
          email: clienteEmail,
          status: 'premium_cancelado'
        })
      };
    }

    // ===== OUTROS STATUS =====
    console.log('ℹ️ Status não processado:', status);
    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true,
        message: 'Webhook recebido',
        status: status,
        observacao: 'Status não requer ação'
      })
    };

  } catch (error) {
    console.error('❌ ERRO CRÍTICO:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Erro ao processar webhook',
        detalhe: error.message,
        stack: error.stack
      })
    };
  }
}
