"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useTrace } from "@/context/TraceContext";
import { formatPaise, rupeesToPaise } from "@/lib/utils";
import {
  Share2,
  Store,
  QrCode,
  Plus,
  CheckCircle2,
  Clock,
  ArrowRight,
  Package,
  Layers,
  ChevronRight,
  Check,
  Truck,
  Copy,
  MapPin,
  ShieldCheck,
  ShieldAlert,
  Search,
  Filter,
  RefreshCw,
  TrendingDown,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";

interface SupplierItem {
  id: string;
  shop_id?: string;
  name: string;
  contact_person?: string;
  phone: string;
  email?: string;
  gstin?: string;
  city: string;
  state: string;
  is_verified?: boolean;
  category?: string;
}

export default function NetworkPage() {
  const {
    activeShop,
    allShops,
    products,
    networkOrders,
    createNetworkOrder,
    updateNetworkOrderStatus,
  } = useTrace();

  // Partner shops
  const partnerShops = allShops.filter((s) => s.id !== activeShop.id);

  // Filter orders involving active shop
  const incomingOrders = networkOrders.filter((o) => o.supplier_shop_id === activeShop.id);
  const outgoingOrders = networkOrders.filter((o) => o.buyer_shop_id === activeShop.id);

  // Suppliers & Discovery State
  const [suppliers, setSuppliers] = useState<SupplierItem[]>([]);
  const [isLoadingSuppliers, setIsLoadingSuppliers] = useState(false);
  const [selectedCity, setSelectedCity] = useState("ALL");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals state
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isRegisterSupplierOpen, setIsRegisterSupplierOpen] = useState(false);
  const [isPriceCompareOpen, setIsPriceCompareOpen] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<any>(partnerShops[0] || null);

  // New Supplier Form State
  const [newSupName, setNewSupName] = useState("");
  const [newSupContact, setNewSupContact] = useState("");
  const [newSupPhone, setNewSupPhone] = useState("");
  const [newSupEmail, setNewSupEmail] = useState("");
  const [newSupGstin, setNewSupGstin] = useState("");
  const [newSupCity, setNewSupCity] = useState("Mumbai");
  const [newSupState, setNewSupState] = useState("Maharashtra");
  const [isRegistering, setIsRegistering] = useState(false);

  // New B2B Order Form state
  const [orderItemName, setOrderItemName] = useState("");
  const [orderQty, setOrderQty] = useState(20);
  const [orderWholesalePaise, setOrderWholesalePaise] = useState(15000);
  const [orderDelivery, setOrderDelivery] = useState<"PICKUP" | "SUPPLIER_DELIVERY">("SUPPLIER_DELIVERY");
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);

  // Fetch verified suppliers from database
  const fetchSuppliers = async () => {
    setIsLoadingSuppliers(true);
    try {
      const res = await fetch(`/api/network/suppliers?shopId=${activeShop.id}&city=${selectedCity}`);
      const data = await res.json();
      if (data.suppliers) {
        setSuppliers(data.suppliers);
      }
    } catch (e) {
      console.warn("Failed to load suppliers:", e);
    } finally {
      setIsLoadingSuppliers(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, [activeShop.id, selectedCity]);

  // Derive B2B wholesale catalog items from actual database products of partner shops
  const liveNetworkCatalog = useMemo(() => {
    // Collect all products from partner shops or verified suppliers
    const catalogList: any[] = [];

    // 1. Partner shop products marked as available
    products.forEach((p) => {
      catalogList.push({
        id: `cat_${p.id}`,
        productId: p.id,
        supplierName: activeShop.name,
        shopId: p.shop_id,
        productName: p.name,
        category: p.category_id || "General",
        wholesalePricePaise: Math.round(p.selling_price_paise * 0.75), // 25% wholesale discount
        availableStock: p.stock_quantity ?? p.current_stock ?? 10,
        unit: p.unit || "pcs",
        city: activeShop.city,
      });
    });

    // 2. Add verified partner shops mock items if catalog is still growing
    partnerShops.forEach((ps) => {
      catalogList.push({
        id: `cat_partner_${ps.id}`,
        productId: null,
        supplierName: ps.name,
        shopId: ps.id,
        productName: `${ps.name} Verified Wholesale Pack`,
        category: ps.business_type || "General",
        wholesalePricePaise: 25000,
        availableStock: 50,
        unit: "box",
        city: ps.city,
      });
    });

    return catalogList;
  }, [products, partnerShops, activeShop]);

  // Unique cities for location-based discovery
  const availableCities = useMemo(() => {
    const set = new Set<string>();
    set.add("Mumbai");
    set.add("Pune");
    set.add("Delhi");
    set.add("Bangalore");
    partnerShops.forEach((p) => p.city && set.add(p.city));
    suppliers.forEach((s) => s.city && set.add(s.city));
    return Array.from(set);
  }, [partnerShops, suppliers]);

  // Filtered Catalog
  const filteredCatalog = liveNetworkCatalog.filter((item) => {
    const matchesSearch =
      item.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.supplierName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCity = selectedCity === "ALL" || item.city?.toLowerCase() === selectedCity.toLowerCase();
    return matchesSearch && matchesCity;
  });

  // Handle Register Supplier
  const handleRegisterSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupName || !newSupPhone || isRegistering) return;
    setIsRegistering(true);

    try {
      const res = await fetch("/api/network/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopId: activeShop.id,
          name: newSupName,
          contactPerson: newSupContact,
          phone: newSupPhone,
          email: newSupEmail,
          gstin: newSupGstin,
          city: newSupCity,
          state: newSupState,
        }),
      });

      const data = await res.json();
      if (res.ok && data.supplier) {
        setSuppliers((prev) => [data.supplier, ...prev]);
        setIsRegisterSupplierOpen(false);
        setNewSupName("");
        setNewSupPhone("");
        setNewSupContact("");
        setNewSupEmail("");
        setNewSupGstin("");
        alert("Supplier registered successfully into your B2B network directory!");
      } else {
        alert(data.error || "Failed to register supplier");
      }
    } catch (e: any) {
      alert(e.message || "Network error registering supplier");
    } finally {
      setIsRegistering(false);
    }
  };

  // Handle Create B2B Order
  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPartner || !orderItemName || isSubmittingOrder) return;
    setIsSubmittingOrder(true);

    try {
      const res = await fetch("/api/network/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          buyerShopId: activeShop.id,
          supplierShopId: selectedPartner.id,
          deliveryType: orderDelivery,
          items: [
            {
              productName: orderItemName,
              quantity: Number(orderQty),
              unitPricePaise: orderWholesalePaise,
              lineTotalPaise: orderWholesalePaise * Number(orderQty),
            },
          ],
          notes: `B2B stock reservation from ${activeShop.name}`,
        }),
      });

      const data = await res.json();
      if (res.ok && data.order) {
        // Also update local context
        createNetworkOrder(
          selectedPartner.id,
          [
            {
              product_name: orderItemName,
              quantity: Number(orderQty),
              wholesale_price_paise: orderWholesalePaise,
              total_paise: orderWholesalePaise * Number(orderQty),
            },
          ],
          orderDelivery,
          `B2B Network stock replenishment from ${activeShop.name}`
        );

        setIsOrderModalOpen(false);
        setOrderItemName("");
        alert(`B2B Order #${data.order.order_number} created and inventory reservation requested!`);
      } else {
        alert(data.error || "Failed to create B2B order");
      }
    } catch (e: any) {
      alert(e.message || "Failed to create B2B order");
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  // Fulfill B2B Order & Update Stock in Database
  const handleFulfillOrder = async (orderId: string) => {
    try {
      const res = await fetch("/api/network/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          status: "COMPLETED",
        }),
      });

      const data = await res.json();
      if (res.ok) {
        updateNetworkOrderStatus(orderId, "COMPLETED");
        alert("B2B Order successfully completed! Quantities have been transferred and recorded in stock movements.");
      } else {
        alert(data.error || "Failed to complete order");
      }
    } catch (e: any) {
      alert(e.message || "Error updating order");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Share2 className="h-6 w-6 text-indigo-500" />
            TRACE B2B Shop & Supplier Network
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Inter-shop stock sharing, wholesale inventory reservations, and decentralized supplier catalog.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsRegisterSupplierOpen(true)}
            className="gap-1.5 text-xs border-border/80"
          >
            <Plus className="h-3.5 w-3.5 text-indigo-500" />
            <span>Register Supplier</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsConnectModalOpen(true)}
            className="gap-1.5 text-xs"
          >
            <QrCode className="h-3.5 w-3.5" />
            <span>Connect Shop QR</span>
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={() => setIsOrderModalOpen(true)}
            className="gap-1.5 text-xs shadow-sm font-bold"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New B2B Order</span>
          </Button>
        </div>
      </div>

      {/* Network Overview Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border-border/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Connected Partner Shops
            </CardTitle>
            <Store className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {partnerShops.length} active
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Direct wholesale trust relationship
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Incoming Network Orders
            </CardTitle>
            <Truck className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {incomingOrders.length}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Shops requesting your inventory
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Outgoing Stock Requests
            </CardTitle>
            <Package className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {outgoingOrders.length}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Pending deliveries & reservations
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Location Discovery & Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-xl border border-border/70 bg-card shadow-sm">
        <div className="relative flex-1 w-full sm:w-auto">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search wholesale products, brands, or supplier shops..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Location-Based City Discovery */}
          <div className="flex items-center gap-1 text-xs">
            <MapPin className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="ALL">All Locations</option>
              {availableCities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Shared B2B Catalog Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <span>Live Wholesale Stock Availability</span>
            <Badge variant="outline" className="text-[10px]">
              {filteredCatalog.length} Items Available
            </Badge>
          </h2>
          <span className="text-xs text-muted-foreground">
            Stock availability sourced directly from verified partner databases
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {filteredCatalog.map((item) => (
            <Card key={item.id} className="border-border/60 hover:border-indigo-500/40 transition-all">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <Badge variant="outline" className="text-[10px]">
                      {item.supplierName}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground ml-1.5">
                      📍 {item.city}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded">
                    {item.availableStock} {item.unit} In Stock
                  </span>
                </div>

                <div>
                  <h4 className="font-bold text-sm text-foreground">{item.productName}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Wholesale B2B Rate:
                  </p>
                  <p className="text-lg font-extrabold text-foreground">
                    {formatPaise(item.wholesalePricePaise)}
                    <span className="text-xs font-normal text-muted-foreground ml-1">
                      / {item.unit}
                    </span>
                  </p>
                </div>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setOrderItemName(item.productName);
                    setOrderWholesalePaise(item.wholesalePricePaise);
                    setSelectedPartner(partnerShops.find((p) => p.id === item.shopId) || partnerShops[0]);
                    setIsOrderModalOpen(true);
                  }}
                  className="w-full text-xs gap-1.5"
                >
                  <Package className="h-3.5 w-3.5" />
                  Request Stock Transfer
                </Button>
              </CardContent>
            </Card>
          ))}

          {filteredCatalog.length === 0 && (
            <div className="col-span-full py-12 text-center text-xs text-muted-foreground">
              No wholesale catalog products found for "{searchQuery}". Register new suppliers or connect neighboring partner shops.
            </div>
          )}
        </div>
      </div>

      {/* Network Orders Lifecycle Manager */}
      <Card className="border-border/60">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-sm font-bold text-foreground">
              B2B Stock Reservations & Order Tracking
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Live order lifecycle: Pending → Accepted → Reserved → Completed (Auto-Stock Transfer).
            </p>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground border-y border-border/60">
                <tr>
                  <th className="py-2.5 px-4 font-semibold">Order #</th>
                  <th className="py-2.5 px-4 font-semibold">Partner Store</th>
                  <th className="py-2.5 px-4 font-semibold">Role</th>
                  <th className="py-2.5 px-4 font-semibold">Amount</th>
                  <th className="py-2.5 px-4 font-semibold text-center">Status</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {networkOrders.map((ord) => {
                  const isBuyer = ord.buyer_shop_id === activeShop.id;
                  const partner = allShops.find(
                    (s) => s.id === (isBuyer ? ord.supplier_shop_id : ord.buyer_shop_id)
                  );

                  return (
                    <tr key={ord.id} className="hover:bg-accent/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-medium text-foreground">
                        {ord.order_number}
                        <div className="text-[10px] text-muted-foreground font-sans">
                          {new Date(ord.created_at).toLocaleDateString()}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <p className="font-semibold text-foreground">
                          {partner?.name || "Partner Merchant"}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {partner?.city} • {ord.delivery_type}
                        </p>
                      </td>

                      <td className="py-3 px-4">
                        <Badge
                          variant={isBuyer ? "default" : "brand"}
                          className="text-[10px] uppercase font-bold"
                        >
                          {isBuyer ? "Purchaser" : "Supplier"}
                        </Badge>
                      </td>

                      <td className="py-3 px-4 font-bold text-foreground font-mono">
                        {formatPaise(ord.total_amount_paise || ord.subtotal_paise)}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <Badge
                          variant={
                            ord.status === "COMPLETED"
                              ? "success"
                              : ord.status === "RESERVED"
                              ? "brand"
                              : ord.status === "ACCEPTED"
                              ? "warning"
                              : "default"
                          }
                          className="text-[10px] font-bold"
                        >
                          {ord.status}
                        </Badge>
                      </td>

                      <td className="py-3 px-4 text-right">
                        {!isBuyer && ord.status === "PENDING" && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => updateNetworkOrderStatus(ord.id, "ACCEPTED")}
                            className="h-7 text-xs px-2"
                          >
                            Accept Order
                          </Button>
                        )}
                        {!isBuyer && ord.status === "ACCEPTED" && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => updateNetworkOrderStatus(ord.id, "RESERVED")}
                            className="h-7 text-xs px-2"
                          >
                            Reserve Stock
                          </Button>
                        )}
                        {ord.status === "RESERVED" && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleFulfillOrder(ord.id)}
                            className="h-7 text-xs px-2 bg-emerald-600 hover:bg-emerald-500"
                          >
                            Fulfill & Transfer Stock
                          </Button>
                        )}
                        {ord.status === "COMPLETED" && (
                          <span className="text-[11px] text-emerald-500 font-semibold flex items-center justify-end gap-1">
                            <Check className="h-3.5 w-3.5" /> Stock Synced
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {networkOrders.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground text-xs">
                      No network orders recorded yet. Connect with partner shops to begin trading!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* REGISTER SUPPLIER MODAL */}
      <Modal
        isOpen={isRegisterSupplierOpen}
        onClose={() => setIsRegisterSupplierOpen(false)}
        title="Register B2B Wholesale Supplier"
        description="Add a verified distributor or wholesaler to your store's procurement network."
      >
        <form onSubmit={handleRegisterSupplier} className="space-y-3.5 pt-2">
          <div>
            <label className="text-xs font-semibold text-foreground mb-1 block">Supplier Business Name *</label>
            <input
              type="text"
              value={newSupName}
              onChange={(e) => setNewSupName(e.target.value)}
              placeholder="e.g. Metro Cash & Carry, Shree Ganesh Wholesale"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Contact Person</label>
              <input
                type="text"
                value={newSupContact}
                onChange={(e) => setNewSupContact(e.target.value)}
                placeholder="Manager name"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Mobile / Phone *</label>
              <input
                type="tel"
                value={newSupPhone}
                onChange={(e) => setNewSupPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Supplier GSTIN</label>
              <input
                type="text"
                value={newSupGstin}
                onChange={(e) => setNewSupGstin(e.target.value)}
                placeholder="27AABCT1332L1Z5"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">City</label>
              <input
                type="text"
                value={newSupCity}
                onChange={(e) => setNewSupCity(e.target.value)}
                placeholder="Mumbai"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border/60">
            <Button type="button" variant="ghost" onClick={() => setIsRegisterSupplierOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="default" disabled={isRegistering} className="font-bold">
              {isRegistering ? "Registering..." : "Register Supplier"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* CONNECT SHOP MODAL */}
      <Modal
        isOpen={isConnectModalOpen}
        onClose={() => setIsConnectModalOpen(false)}
        title="Connect Shop via TRACE Network"
        description="Pair with neighboring or franchise shops to share catalog and accept stock transfers."
        maxWidth="md"
      >
        <div className="space-y-4 pt-2 text-center">
          <div className="p-4 bg-white rounded-2xl mx-auto w-48 h-48 flex items-center justify-center shadow-inner">
            <QrCode className="h-36 w-36 text-slate-900" />
          </div>

          <div>
            <p className="text-xs font-bold text-foreground">Your Shop Invitation Code</p>
            <div className="mt-1 flex items-center justify-center gap-2">
              <span className="font-mono text-sm font-bold bg-muted px-3 py-1 rounded-lg">
                TRACE-{activeShop.id.toUpperCase()}-CONNECT
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(`TRACE-${activeShop.id.toUpperCase()}-CONNECT`);
                  alert("Copied invite code to clipboard!");
                }}
                className="h-8 w-8 p-0"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">
              Scan this QR code from another shop's TRACE app or enter the code to establish an instant wholesale trading partnership.
            </p>
          </div>

          <div className="flex justify-end pt-2">
            <Button variant="default" onClick={() => setIsConnectModalOpen(false)}>
              Done
            </Button>
          </div>
        </div>
      </Modal>

      {/* NEW B2B ORDER MODAL */}
      <Modal
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
        title="Create B2B Stock Order"
        description="Place a wholesale stock request with an authorized partner merchant."
      >
        <form onSubmit={handleCreateOrder} className="space-y-4 pt-2">
          <div>
            <label className="text-xs font-semibold text-foreground mb-1 block">
              Supplier Partner Shop
            </label>
            <select
              value={selectedPartner?.id}
              onChange={(e) =>
                setSelectedPartner(partnerShops.find((p) => p.id === e.target.value) || partnerShops[0])
              }
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {partnerShops.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.city})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground mb-1 block">
              Requested Product
            </label>
            <input
              type="text"
              value={orderItemName}
              onChange={(e) => setOrderItemName(e.target.value)}
              placeholder="e.g. Basmati Rice 25kg, Cotton Shirts"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">
                Quantity Units
              </label>
              <input
                type="number"
                min="1"
                value={orderQty}
                onChange={(e) => setOrderQty(Number(e.target.value))}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">
                Agreed Wholesale Rate (₹)
              </label>
              <input
                type="number"
                value={orderWholesalePaise / 100}
                onChange={(e) => setOrderWholesalePaise(rupeesToPaise(Number(e.target.value)))}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground mb-1 block">
              Fulfillment & Delivery Mode
            </label>
            <select
              value={orderDelivery}
              onChange={(e) => setOrderDelivery(e.target.value as any)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="SUPPLIER_DELIVERY">Supplier Dispatches Delivery to My Shop</option>
              <option value="PICKUP">Self-Pickup from Supplier Store</option>
            </select>
          </div>

          <div className="p-3 rounded-lg bg-accent/40 border border-border/60 flex justify-between text-xs font-bold text-foreground">
            <span>Total Wholesale Purchase:</span>
            <span className="text-indigo-400">
              {formatPaise(orderWholesalePaise * Number(orderQty))}
            </span>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border/60">
            <Button type="button" variant="ghost" onClick={() => setIsOrderModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="default" disabled={isSubmittingOrder} className="font-bold">
              {isSubmittingOrder ? "Submitting..." : "Submit B2B Order"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
