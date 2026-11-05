const url = "https://hdoospbknnqelddgzeky.supabase.co/rest/v1";
const key = "sb_publishable_gKFOegFDsLtuYoxOYlULcQ_KZ38U4ZH";
const headers = {
  apikey: key,
  Authorization: `Bearer ${key}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
};

async function seed() {
  console.log("Seeding Supabase database...");

  // 1. Seed Profiles
  const profiles = [
    {
      id: "00000000-0000-0000-0000-000000000001",
      full_name: "Store Owner",
      email: "owner@business.com",
      phone: "+919999999999",
      preferred_language: "en",
      is_super_admin: false,
    },
    {
      id: "00000000-0000-0000-0000-000000000002",
      full_name: "Anita Sharma (Manager)",
      email: "manager@business.com",
      phone: "+919876543211",
      preferred_language: "en",
      is_super_admin: false,
    },
    {
      id: "00000000-0000-0000-0000-000000000003",
      full_name: "Rahul Verma (Cashier)",
      email: "cashier@business.com",
      phone: "+919876543212",
      preferred_language: "en",
      is_super_admin: false,
    },
  ];

  const pRes = await fetch(`${url}/profiles`, {
    method: "POST",
    headers,
    body: JSON.stringify(profiles),
  });
  console.log("Profiles seed status:", pRes.status, await pRes.text());

  // 2. Seed Shops
  const shops = [
    {
      id: "shop_default",
      name: "TRACE Retail Store",
      slug: "trace-retail-store",
      business_type: "retail",
      owner_id: "00000000-0000-0000-0000-000000000001",
      phone: "+919999999999",
      email: "owner@business.com",
      address_line1: "Shop No. 1, Main Market Road",
      city: "Mumbai",
      state: "Maharashtra",
      pincode: "400001",
      currency: "INR",
      currency_symbol: "₹",
      gstin: "",
      is_verified: true,
      access_status: "ACTIVE",
      invite_code: "TRACE01",
    },
    {
      id: "11111111-1111-1111-1111-111111111111",
      name: "Apna Supermarket & General Store",
      slug: "apna-supermarket",
      business_type: "grocery",
      owner_id: "00000000-0000-0000-0000-000000000001",
      phone: "+919876543210",
      email: "orders@apnagroceries.in",
      address_line1: "Shop No. 4, MG Road Market Complex",
      city: "Pune",
      state: "Maharashtra",
      pincode: "411001",
      currency: "INR",
      currency_symbol: "₹",
      gstin: "27AABCU9603R1ZM",
      is_verified: true,
      access_status: "ACTIVE",
      invite_code: "APNA01",
    },
  ];

  const sRes = await fetch(`${url}/shops`, {
    method: "POST",
    headers,
    body: JSON.stringify(shops),
  });
  console.log("Shops seed status:", sRes.status, await sRes.text());
}

seed();
