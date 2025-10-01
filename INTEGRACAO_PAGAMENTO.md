# Como Integrar com Meios de Pagamento

Este guia mostra como integrar o webhook com diferentes meios de pagamento brasileiros.

## 🎯 Versão Simplificada (APENAS EMAIL)

Agora você precisa enviar **APENAS O EMAIL** do comprador! O sistema cria automaticamente:
- Nome do usuário baseado no email
- Acesso vitalício (lifetime) por padrão
- Conta e senha automáticas

### Exemplo Mínimo

```bash
curl -X POST https://zjjrpqhhehvgezgjhcgd.supabase.co/functions/v1/payment-webhook \
  -H "Content-Type: application/json" \
  -d '{"user_email": "guilherme@gmail.com"}'
```

**Pronto!** Guilherme recebe email para definir senha e já pode acessar.

---

## 📦 Opções Completas (Opcional)

Se quiser enviar mais dados:

```json
{
  "user_email": "guilherme@gmail.com",
  "user_name": "Guilherme Silva",
  "plan_type": "lifetime",
  "amount": 29.90
}
```

---

## 🔌 Integração com Meios de Pagamento

### 1️⃣ Hotmart (Mais Popular)

Hotmart tem webhook automático. Configure assim:

**Passo 1:** Acesse Hotmart > Produto > Configurações > Integração

**Passo 2:** Adicione URL do Webhook:
```
https://zjjrpqhhehvgezgjhcgd.supabase.co/functions/v1/payment-webhook
```

**Passo 3:** No código do webhook da Hotmart, adicione:

```javascript
// Webhook da Hotmart recebe dados assim
const hotmartData = req.body;

// Se for aprovação de compra
if (hotmartData.event === 'PURCHASE_APPROVED') {

  // Enviar para nosso webhook
  await fetch('https://zjjrpqhhehvgezgjhcgd.supabase.co/functions/v1/payment-webhook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_email: hotmartData.data.buyer.email,
      user_name: hotmartData.data.buyer.name,
      amount: hotmartData.data.purchase.price.value,
      plan_type: 'lifetime',
      payment_provider: 'hotmart',
      provider_transaction_id: hotmartData.data.purchase.transaction,
      metadata: {
        hotmart_transaction: hotmartData.data.purchase.transaction
      }
    })
  });
}
```

---

### 2️⃣ MercadoPago

**Opção A: Via Zapier/Make (Sem Código)**

1. Crie conta no Zapier/Make
2. Conecte MercadoPago (gatilho: novo pagamento aprovado)
3. Adicione ação: Webhook POST
4. URL: `https://zjjrpqhhehvgezgjhcgd.supabase.co/functions/v1/payment-webhook`
5. Body:
```json
{
  "user_email": "{{email_do_comprador}}"
}
```

**Opção B: Código Próprio**

```javascript
// No webhook do MercadoPago
const mercadopagoWebhook = async (req, res) => {
  const payment = req.body;

  // Verificar se pagamento foi aprovado
  if (payment.type === 'payment' && payment.data.status === 'approved') {

    // Buscar detalhes do pagamento
    const paymentDetails = await mercadopago.payment.get(payment.data.id);

    // Liberar acesso
    await fetch('https://zjjrpqhhehvgezgjhcgd.supabase.co/functions/v1/payment-webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_email: paymentDetails.payer.email,
        user_name: paymentDetails.payer.first_name + ' ' + paymentDetails.payer.last_name,
        amount: paymentDetails.transaction_amount,
        payment_method: paymentDetails.payment_method_id === 'pix' ? 'pix' : 'credit_card',
        payment_provider: 'mercadopago',
        provider_transaction_id: paymentDetails.id.toString()
      })
    });
  }

  res.status(200).send('OK');
};
```

---

### 3️⃣ Stripe

```javascript
// Webhook do Stripe (use Stripe CLI ou dashboard para configurar)
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

app.post('/webhook/stripe', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Pagamento aprovado
  if (event.type === 'checkout.session.completed' ||
      event.type === 'payment_intent.succeeded') {

    const session = event.data.object;

    // Liberar acesso
    await fetch('https://zjjrpqhhehvgezgjhcgd.supabase.co/functions/v1/payment-webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_email: session.customer_email || session.customer_details?.email,
        user_name: session.customer_details?.name,
        amount: session.amount_total / 100,
        currency: session.currency,
        payment_provider: 'stripe',
        provider_transaction_id: session.id
      })
    });
  }

  res.json({ received: true });
});
```

---

### 4️⃣ PagSeguro

```javascript
// Webhook do PagSeguro
const pagseguro = require('pagseguro');

app.post('/webhook/pagseguro', async (req, res) => {
  const notificationCode = req.body.notificationCode;

  // Buscar detalhes da transação
  const transaction = await pagseguro.transactions.get(notificationCode);

  // Se pagamento aprovado (status 3 = pago, 4 = disponível)
  if (transaction.status === 3 || transaction.status === 4) {

    await fetch('https://zjjrpqhhehvgezgjhcgd.supabase.co/functions/v1/payment-webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_email: transaction.sender.email,
        user_name: transaction.sender.name,
        amount: parseFloat(transaction.grossAmount),
        payment_method: transaction.paymentMethod.type == 1 ? 'credit_card' : 'boleto',
        payment_provider: 'pagseguro',
        provider_transaction_id: transaction.code
      })
    });
  }

  res.status(200).send('OK');
});
```

---

### 5️⃣ Kiwify

```javascript
// Webhook da Kiwify
app.post('/webhook/kiwify', async (req, res) => {
  const data = req.body;

  // Verificar assinatura do webhook
  // (adicione validação de segurança aqui)

  if (data.order_status === 'paid') {

    await fetch('https://zjjrpqhhehvgezgjhcgd.supabase.co/functions/v1/payment-webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_email: data.Customer.email,
        user_name: data.Customer.full_name,
        amount: data.order_amount,
        payment_provider: 'kiwify',
        provider_transaction_id: data.order_id
      })
    });
  }

  res.status(200).send('OK');
});
```

---

### 6️⃣ Eduzz

```javascript
// Webhook da Eduzz
app.post('/webhook/eduzz', async (req, res) => {
  const data = req.body;

  // Status 6 = Finalizada (pago)
  if (data.sale_status_enum === 6) {

    await fetch('https://zjjrpqhhehvgezgjhcgd.supabase.co/functions/v1/payment-webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_email: data.customer_email,
        user_name: data.customer_name,
        amount: data.sale_value,
        payment_provider: 'eduzz',
        provider_transaction_id: data.sale_id.toString()
      })
    });
  }

  res.status(200).send('OK');
});
```

---

### 7️⃣ Braip

```javascript
// Webhook da Braip
app.post('/webhook/braip', async (req, res) => {
  const data = req.body;

  // Status 1 = Aprovado
  if (data.trans_status === '1') {

    await fetch('https://zjjrpqhhehvgezgjhcgd.supabase.co/functions/v1/payment-webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_email: data.client_email,
        user_name: data.client_name,
        amount: parseFloat(data.trans_value),
        payment_provider: 'braip',
        provider_transaction_id: data.trans_code
      })
    });
  }

  res.status(200).send('OK');
});
```

---

## 🚀 Método Manual (Sem Integração)

Se não quiser integrar automaticamente, você pode liberar acesso manualmente:

### Opção 1: Via cURL (Terminal)

```bash
curl -X POST https://zjjrpqhhehvgezgjhcgd.supabase.co/functions/v1/payment-webhook \
  -H "Content-Type: application/json" \
  -d '{"user_email": "cliente@email.com"}'
```

### Opção 2: Via Postman/Insomnia

1. Método: POST
2. URL: `https://zjjrpqhhehvgezgjhcgd.supabase.co/functions/v1/payment-webhook`
3. Headers: `Content-Type: application/json`
4. Body (JSON):
```json
{
  "user_email": "cliente@email.com"
}
```

### Opção 3: Via Google Sheets + Apps Script

```javascript
function liberarAcesso() {
  const email = "cliente@email.com";

  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({
      user_email: email
    })
  };

  UrlFetchApp.fetch(
    'https://zjjrpqhhehvgezgjhcgd.supabase.co/functions/v1/payment-webhook',
    options
  );
}
```

---

## ✅ Como Testar

Teste se está funcionando:

```bash
curl -X POST https://zjjrpqhhehvgezgjhcgd.supabase.co/functions/v1/payment-webhook \
  -H "Content-Type: application/json" \
  -d '{"user_email": "teste@seudominio.com"}'
```

**Você deve receber:**
```json
{
  "success": true,
  "message": "Acesso liberado com sucesso!",
  "data": {
    "user_id": "...",
    "email": "teste@seudominio.com",
    "plan_type": "lifetime"
  }
}
```

E o email `teste@seudominio.com` receberá um email para definir a senha!

---

## 🔐 Segurança

**IMPORTANTE:** Para produção, adicione validação de segurança:

```javascript
// No seu servidor intermediário
const validarOrigem = (req) => {
  const secret = process.env.WEBHOOK_SECRET;
  const signature = req.headers['x-webhook-signature'];

  // Validar assinatura
  return signature === secret;
};

app.post('/webhook', async (req, res) => {
  if (!validarOrigem(req)) {
    return res.status(401).send('Não autorizado');
  }

  // Continuar com processamento...
});
```

---

## 📞 Suporte

Dúvidas? Entre em contato:
- Email: contato@feediversao.com.br
- WhatsApp: Configure o link apropriado

---

## 🎓 Resumo Rápido

1. **Configure webhook** no seu meio de pagamento
2. **Quando pagamento aprovado** → chame nosso webhook
3. **Envie apenas** o email do comprador (mínimo)
4. **Cliente recebe email** automaticamente
5. **Acesso liberado** imediatamente!

**URL do Webhook:**
```
https://zjjrpqhhehvgezgjhcgd.supabase.co/functions/v1/payment-webhook
```

**JSON Mínimo:**
```json
{"user_email": "email@cliente.com"}
```

Simples assim! 🎉
