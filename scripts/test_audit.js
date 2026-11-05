// Automated Full-Spectrum Functionality & Security Audit for TRACE
const http = require('http');

function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, body: body ? JSON.parse(body) : null, raw: body });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, body: null, raw: body });
        }
      });
    });
    req.on('error', reject);
    if (data) {
      req.write(typeof data === 'string' ? data : JSON.stringify(data));
    }
    req.end();
  });
}

async function runAudit() {
  console.log("=== STARTING TRACE FULL FUNCTIONALITY & AUDIT SUITE ===\n");
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // 1. Audit Route Health
    console.log("--- 1. Testing Core Frontend Route Availability ---");
    const routes = ['/', '/dashboard', '/pos', '/inventory', '/reports', '/settings', '/onboarding', '/customers', '/paylater', '/subscriptions'];
    for (const r of routes) {
      const res = await request({ hostname: 'localhost', port: 3000, path: r, method: 'GET' });
      assert(res.status === 200, `GET ${r} returns HTTP 200`);
    }

    // 2. Audit RBAC Backend Permissions (Cashier Restrictions)
    console.log("\n--- 2. Testing RBAC Security & Role Verification ---");
    
    // Cashier attempting to create product -> must return 403
    const cashierCreateProd = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/products',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': 'CASHIER'
      }
    }, {
      shopId: 'shop_default',
      name: 'Unauthorized Cashier Item',
      sellingPricePaise: 5000
    });
    assert(cashierCreateProd.status === 403, `CASHIER POST /api/products returns HTTP 403 Forbidden (${cashierCreateProd.body?.error})`);

    // Cashier attempting to adjust stock -> must return 403
    const cashierAdjust = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/inventory/adjust',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': 'CASHIER'
      }
    }, {
      productId: 'prod_test',
      quantityDelta: 10
    });
    assert(cashierAdjust.status === 403, `CASHIER POST /api/inventory/adjust returns HTTP 403 Forbidden (${cashierAdjust.body?.error})`);

    // Owner creating product -> should succeed or pass permission check
    const ownerCreateProd = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/products',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': 'OWNER'
      }
    }, {
      shopId: 'shop_default',
      name: 'Audit Verified Organic Tea',
      sellingPricePaise: 12000,
      purchasePricePaise: 9000,
      currentStock: 50,
      taxRatePercent: 5
    });
    assert(ownerCreateProd.status === 200 || ownerCreateProd.status === 201, `OWNER POST /api/products authorized (Status ${ownerCreateProd.status})`);
    const createdProdId = ownerCreateProd.body?.product?.id;

    // 3. Audit POS Fast Billing & Correct GST Calculations
    console.log("\n--- 3. Testing POS Checkout, GST Engine & Idempotency ---");

    // Intra-state sale (5% tax, exact 50/50 CGST & SGST split)
    const testRequestId = `test_req_${Date.now()}`;
    const checkoutPayload = {
      shopId: 'shop_default',
      role: 'OWNER',
      items: [
        {
          productId: createdProdId || 'prod_default',
          productName: 'Audit Verified Organic Tea',
          unitPricePaise: 12000,
          quantity: 2,
          taxRatePercent: 5,
          lineTotalPaise: 24000
        }
      ],
      paymentMethod: 'UPI',
      subtotalPaise: 24000,
      discountPaise: 1000, // ₹10 discount
      taxPaise: 1150,      // 5% of (240 - 10) = ₹11.50 = 1150 paise
      totalAmountPaise: 24150, // 24000 - 1000 + 1150 = 24150 paise
      paidAmountPaise: 24150,
      balanceAmountPaise: 0,
      isInterState: false,
      requestId: testRequestId
    };

    const checkoutRes = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/pos/checkout',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': 'OWNER'
      }
    }, checkoutPayload);

    assert(checkoutRes.status === 200, `POST /api/pos/checkout returns HTTP 200`);
    assert(checkoutRes.body?.success === true, `Sale recorded successfully`);
    const inv = checkoutRes.body?.invoice;
    if (inv) {
      assert(inv.payment_status === 'PAID', `Invoice marked PAID on full settlement`);
      assert(inv.taxBreakdown?.cgstPaise === 575, `CGST is exact 50% (575 paise)`);
      assert(inv.taxBreakdown?.sgstPaise === 575, `SGST is exact 50% (575 paise)`);
      assert(inv.taxBreakdown?.igstPaise === 0, `IGST is 0 for intra-state sale`);
    }

    // 4. Test Idempotency Guard (Duplicate Submission Prevention)
    console.log("\n--- 4. Testing Payment Idempotency & Duplicate Prevention ---");
    const duplicateRes = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/pos/checkout',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': 'OWNER'
      }
    }, checkoutPayload);

    assert(duplicateRes.status === 200, `Duplicate call returns HTTP 200`);
    assert(duplicateRes.body?.duplicatePrevented === true, `Idempotency guard intercepted duplicate submission`);

    // 5. Test Inter-State GST (100% IGST, 0% CGST/SGST)
    console.log("\n--- 5. Testing Inter-State IGST Calculation ---");
    const interStatePayload = {
      shopId: 'shop_default',
      role: 'OWNER',
      items: [
        {
          productId: createdProdId || 'prod_default',
          productName: 'Inter-State Consignment',
          unitPricePaise: 50000,
          quantity: 1,
          taxRatePercent: 18,
          lineTotalPaise: 50000
        }
      ],
      paymentMethod: 'CARD',
      subtotalPaise: 50000,
      discountPaise: 0,
      taxPaise: 9000,
      totalAmountPaise: 59000,
      paidAmountPaise: 59000,
      balanceAmountPaise: 0,
      isInterState: true,
      requestId: `req_inter_${Date.now()}`
    };

    const interStateRes = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/pos/checkout',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': 'OWNER'
      }
    }, interStatePayload);

    assert(interStateRes.status === 200, `Inter-state checkout succeeded`);
    const interInv = interStateRes.body?.invoice;
    if (interInv) {
      assert(interInv.taxBreakdown?.igstPaise === 9000, `IGST is 100% of tax (9000 paise)`);
      assert(interInv.taxBreakdown?.cgstPaise === 0, `CGST is 0 for inter-state`);
      assert(interInv.taxBreakdown?.sgstPaise === 0, `SGST is 0 for inter-state`);
    }

    // 6. Test Stock Movements Audit Retrieval
    console.log("\n--- 6. Testing Stock Movements Audit History ---");
    const movementsRes = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/inventory/adjust?shopId=shop_default',
      method: 'GET'
    });
    assert(movementsRes.status === 200, `GET /api/inventory/adjust returns HTTP 200`);
    assert(Array.isArray(movementsRes.body?.movements), `Returns movements array for audit log`);

    console.log(`\n========================================`);
    console.log(`AUDIT RESULTS: ${passed} PASSED | ${failed} FAILED`);
    console.log(`========================================\n`);

    if (failed > 0) {
      process.exit(1);
    }
  } catch (e) {
    console.error("Test execution failed:", e);
    process.exit(1);
  }
}

runAudit();
