/**
 * TRACE Multi-Tenant Security & Tenant Isolation Verification Suite
 * Tests cross-tenant isolation, authorization tampering prevention, and role-based permissions.
 */

const http = require("http");
const fs = require("fs");
const path = require("path");

const BASE_URL = "http://localhost:3000";

// Test Users & Tenants
const TENANT_A = {
  userId: "usr_alice_001",
  email: "alice@retail-alpha.in",
  shopId: "shop_alpha_101",
  shopName: "Alpha Retail Mart",
  role: "OWNER",
};

const TENANT_B = {
  userId: "usr_bob_002",
  email: "bob@supermarket-beta.in",
  shopId: "shop_beta_202",
  shopName: "Beta Supermarket",
  role: "OWNER",
};

const STAFF_C = {
  userId: "usr_carol_003",
  email: "carol_cashier@retail-alpha.in",
  shopId: "shop_alpha_101",
  role: "CASHIER",
};

let testCount = 0;
let passedCount = 0;
let failedCount = 0;
const results = [];

function recordResult(testName, passed, details) {
  testCount++;
  if (passed) passedCount++;
  else failedCount++;

  results.push({ testName, passed, details });
  const symbol = passed ? "✓ PASS" : "✗ FAIL";
  console.log(`[${symbol}] ${testName}: ${details}`);
}

function request(options, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (e) {
          json = { raw: data };
        }
        resolve({ status: res.statusCode, headers: res.headers, body: json });
      });
    });

    req.on("error", (err) => reject(err));
    if (body) {
      req.write(typeof body === "string" ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function runSecurityTestSuite() {
  console.log("==================================================================");
  console.log("TRACE SAAS — MULTI-TENANT ARCHITECTURE & SECURITY TEST SUITE");
  console.log("==================================================================\n");

  // Seed test tenant records in memory/Supabase via mock setup
  console.log("1. Setting up Tenant A (Alpha Retail) and Tenant B (Beta Supermarket)...");

  // -------------------------------------------------------------
  // TEST SUITE 1: CROSS-TENANT PRODUCT ACCESS & MODIFICATION
  // -------------------------------------------------------------
  console.log("\n--- TEST SUITE 1: Product Isolation & Cross-Tenant Tampering ---");

  // 1.1 User A adds Product in Shop A
  try {
    const res = await request(
      {
        hostname: "localhost",
        port: 3000,
        path: "/api/products",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-trace-user-id": TENANT_A.userId,
          "x-user-role": "OWNER",
          "x-authorized-shop": TENANT_A.shopId,
        },
      },
      {
        shopId: TENANT_A.shopId,
        name: "Shop A Basmati Rice 5kg",
        sellingPricePaise: 45000,
        currentStock: 50,
      }
    );
    recordResult(
      "Tenant A adds product in Shop A",
      res.status === 200,
      `Status ${res.status} (Product created in Shop A)`
    );
  } catch (e) {
    recordResult("Tenant A adds product in Shop A", false, e.message);
  }

  // 1.2 User A attempts to ADD a product into Shop B (TAMPERING ATTEMPT)
  try {
    const res = await request(
      {
        hostname: "localhost",
        port: 3000,
        path: "/api/products",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-trace-user-id": TENANT_A.userId,
          "x-user-role": "OWNER",
          "x-authorized-shop": TENANT_A.shopId, // User A is NOT authorized for Shop B
        },
      },
      {
        shopId: TENANT_B.shopId, // Tampered target
        name: "Malicious Cross-Tenant Product",
        sellingPricePaise: 10000,
      }
    );
    recordResult(
      "Prevent User A from injecting products into User B's Shop",
      res.status === 403,
      `Status ${res.status} — Rejected with: ${res.body?.error || "Forbidden"}`
    );
  } catch (e) {
    recordResult("Prevent User A from injecting products into User B's Shop", false, e.message);
  }

  // 1.3 User A attempts to READ Shop B's catalog (CROSS-TENANT SNOOPING)
  try {
    const res = await request(
      {
        hostname: "localhost",
        port: 3000,
        path: `/api/products?shopId=${TENANT_B.shopId}`,
        method: "GET",
        headers: {
          "x-trace-user-id": TENANT_A.userId,
          "x-user-role": "OWNER",
          "x-authorized-shop": TENANT_A.shopId,
        },
      }
    );
    recordResult(
      "Prevent User A from reading User B's catalog",
      res.status === 403,
      `Status ${res.status} — Access Denied successfully`
    );
  } catch (e) {
    recordResult("Prevent User A from reading User B's catalog", false, e.message);
  }

  // -------------------------------------------------------------
  // TEST SUITE 2: CUSTOMER INFORMATION & KHATA CREDIT ISOLATION
  // -------------------------------------------------------------
  console.log("\n--- TEST SUITE 2: Customer Data & Financial Privacy ---");

  // 2.1 User A attempts to query Shop B's customer list (PII SNOOPING)
  try {
    const res = await request(
      {
        hostname: "localhost",
        port: 3000,
        path: `/api/customers?shopId=${TENANT_B.shopId}`,
        method: "GET",
        headers: {
          "x-trace-user-id": TENANT_A.userId,
          "x-user-role": "OWNER",
          "x-authorized-shop": TENANT_A.shopId,
        },
      }
    );
    recordResult(
      "Prevent User A from reading User B's customers & phone numbers",
      res.status === 403,
      `Status ${res.status} — Protected customer records from unauthorized tenant`
    );
  } catch (e) {
    recordResult("Prevent User A from reading User B's customers", false, e.message);
  }

  // 2.2 User A attempts to create a customer inside Shop B
  try {
    const res = await request(
      {
        hostname: "localhost",
        port: 3000,
        path: "/api/customers",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-trace-user-id": TENANT_A.userId,
          "x-user-role": "OWNER",
          "x-authorized-shop": TENANT_A.shopId,
        },
      },
      {
        shopId: TENANT_B.shopId,
        fullName: "Unauthorized Injected Customer",
        phone: "9999900000",
      }
    );
    recordResult(
      "Prevent User A from creating customer records in Shop B",
      res.status === 403,
      `Status ${res.status} — Rejected cross-tenant customer creation`
    );
  } catch (e) {
    recordResult("Prevent User A from creating customer in Shop B", false, e.message);
  }

  // -------------------------------------------------------------
  // TEST SUITE 3: POS CHECKOUT & INVENTORY TAMPERING
  // -------------------------------------------------------------
  console.log("\n--- TEST SUITE 3: POS Checkout & Inventory Tampering ---");

  // 3.1 User A attempts to trigger POS checkout in Shop B
  try {
    const res = await request(
      {
        hostname: "localhost",
        port: 3000,
        path: "/api/pos/checkout",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-trace-user-id": TENANT_A.userId,
          "x-user-role": "OWNER",
          "x-authorized-shop": TENANT_A.shopId,
        },
      },
      {
        shopId: TENANT_B.shopId,
        items: [{ productId: "p1", quantity: 1, unitPricePaise: 1000 }],
        totalAmountPaise: 1000,
        paidAmountPaise: 1000,
      }
    );
    recordResult(
      "Prevent User A from billing invoices to Shop B",
      res.status === 403,
      `Status ${res.status} — Checkout blocked on foreign shop`
    );
  } catch (e) {
    recordResult("Prevent User A from billing invoices to Shop B", false, e.message);
  }

  // 3.2 User A attempts to adjust stock of a product in Shop B
  try {
    const res = await request(
      {
        hostname: "localhost",
        port: 3000,
        path: "/api/inventory/adjust",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-trace-user-id": TENANT_A.userId,
          "x-user-role": "OWNER",
          "x-authorized-shop": TENANT_A.shopId,
        },
      },
      {
        shopId: TENANT_B.shopId,
        productId: "prod_beta_nonexistent",
        quantityDelta: 100,
      }
    );
    recordResult(
      "Prevent User A from modifying Shop B inventory levels",
      res.status === 403 || res.status === 404,
      `Status ${res.status} — Stock tampering prevented`
    );
  } catch (e) {
    recordResult("Prevent User A from modifying Shop B inventory", false, e.message);
  }

  // -------------------------------------------------------------
  // TEST SUITE 4: ROLE-BASED ACCESS CONTROL (STAFF WITHIN SHOP A)
  // -------------------------------------------------------------
  console.log("\n--- TEST SUITE 4: Role-Based Permissions within Shop A ---");

  // 4.1 Cashier can operate POS counter in Shop A
  try {
    const res = await request(
      {
        hostname: "localhost",
        port: 3000,
        path: "/api/pos/checkout",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-trace-user-id": STAFF_C.userId,
          "x-user-role": "CASHIER",
          "x-authorized-shop": TENANT_A.shopId,
        },
      },
      {
        shopId: TENANT_A.shopId,
        items: [{ productId: "p1", quantity: 1, unitPricePaise: 2000 }],
        subtotalPaise: 2000,
        taxPaise: 100,
        totalAmountPaise: 2100,
        paidAmountPaise: 2100,
      }
    );
    recordResult(
      "Cashier can process counter sales in their authorized shop",
      res.status === 200,
      `Status ${res.status} — Permitted for cashier role`
    );
  } catch (e) {
    recordResult("Cashier can process counter sales", false, e.message);
  }

  // 4.2 Cashier is PREVENTED from editing/creating catalog inventory
  try {
    const res = await request(
      {
        hostname: "localhost",
        port: 3000,
        path: "/api/products",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-trace-user-id": STAFF_C.userId,
          "x-user-role": "CASHIER",
          "x-authorized-shop": TENANT_A.shopId,
        },
      },
      {
        shopId: TENANT_A.shopId,
        name: "Unauthorized Cashier Product",
        sellingPricePaise: 5000,
      }
    );
    recordResult(
      "Cashier cannot edit/create product catalog pricing",
      res.status === 403,
      `Status ${res.status} — Rejected: ${res.body?.error || "Role permission denied"}`
    );
  } catch (e) {
    recordResult("Cashier cannot edit catalog pricing", false, e.message);
  }

  // 4.3 Cashier is PREVENTED from processing refunds
  try {
    const res = await request(
      {
        hostname: "localhost",
        port: 3000,
        path: "/api/pos/refund",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-trace-user-id": STAFF_C.userId,
          "x-user-role": "CASHIER",
          "x-authorized-shop": TENANT_A.shopId,
        },
      },
      {
        shopId: TENANT_A.shopId,
        invoiceId: "inv_test_123",
        reason: "Customer dissatisfaction",
      }
    );
    recordResult(
      "Cashier cannot issue refunds without manager/owner approval",
      res.status === 403,
      `Status ${res.status} — Refund action blocked for cashier`
    );
  } catch (e) {
    recordResult("Cashier cannot issue refunds", false, e.message);
  }

  // 4.4 Cashier is PREVENTED from deleting products permanently
  try {
    const res = await request(
      {
        hostname: "localhost",
        port: 3000,
        path: "/api/products?id=prod_sample_123",
        method: "DELETE",
        headers: {
          "x-trace-user-id": STAFF_C.userId,
          "x-user-role": "CASHIER",
          "x-authorized-shop": TENANT_A.shopId,
        },
      }
    );
    recordResult(
      "Cashier cannot permanently delete products",
      res.status === 403,
      `Status ${res.status} — Only Shop Owner can delete items`
    );
  } catch (e) {
    recordResult("Cashier cannot permanently delete products", false, e.message);
  }

  // -------------------------------------------------------------
  // TEST SUITE 5: AI CHATBOT DATA ISOLATION
  // -------------------------------------------------------------
  console.log("\n--- TEST SUITE 5: AI Assistant Cross-Tenant Guard ---");

  // 5.1 User A attempts to query AI about Shop B
  try {
    const res = await request(
      {
        hostname: "localhost",
        port: 3000,
        path: "/api/ai/chat",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-trace-user-id": TENANT_A.userId,
          "x-user-role": "OWNER",
          "x-authorized-shop": TENANT_A.shopId,
        },
      },
      {
        shopId: TENANT_B.shopId,
        message: "What is the total sales and revenue today?",
      }
    );
    recordResult(
      "Prevent AI assistant from leaking foreign shop metrics to User A",
      res.status === 403,
      `Status ${res.status} — AI query blocked for unauthorized shop`
    );
  } catch (e) {
    recordResult("Prevent AI from leaking foreign metrics", false, e.message);
  }

  // -------------------------------------------------------------
  // TEST SUITE 6: RLS POLICIES VERIFICATION (SQL MIGRATION AUDIT)
  // -------------------------------------------------------------
  console.log("\n--- TEST SUITE 6: PostgreSQL RLS Policies Audit ---");

  const rlsMigrationPath = path.join(__dirname, "../supabase/migrations/004_multi_tenant_rls_security.sql");
  const rlsContent = fs.readFileSync(rlsMigrationPath, "utf8");

  const requiredTables = [
    "shops",
    "memberships",
    "products",
    "categories",
    "customers",
    "invoices",
    "invoice_items",
    "stock_movements",
    "expenses",
    "ai_conversations",
  ];

  for (const table of requiredTables) {
    const hasRLS = rlsContent.includes(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`);
    const hasPolicy = rlsContent.includes(`ON ${table}`);
    recordResult(
      `Table "${table}" has RLS enabled and tenant policy defined`,
      hasRLS && hasPolicy,
      `RLS Enabled: ${hasRLS}, Tenant Policy Configured: ${hasPolicy}`
    );
  }

  // Summary
  console.log("\n==================================================================");
  console.log(`TEST SUMMARY: ${passedCount}/${testCount} Passed (${Math.round((passedCount / testCount) * 100)}%)`);
  if (failedCount === 0) {
    console.log("ALL MULTI-TENANT SECURITY & ISOLATION TESTS PASSED PERFECTLY!");
  } else {
    console.log(`WARNING: ${failedCount} tests failed.`);
  }
  console.log("==================================================================");
}

runSecurityTestSuite();
