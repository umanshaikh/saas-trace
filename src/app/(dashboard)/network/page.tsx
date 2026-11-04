"use client";

import React, { useState } from "react";
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
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";

export default function NetworkPage() {
  const {
    activeShop,
    allShops,
    networkOrders,
    createNetworkOrder,
    updateNetworkOrderStatus,
  } = useTrace();

  // Partner shops (other shops in the platform)
  const partnerShops = allShops.filter((s) => s.id !== activeShop.id);

  // Filter orders involving active shop (either as buyer or supplier)
  const incomingOrders = networkOrders.filter((o) => o.supplier_shop_id === activeShop.id);
  const outgoingOrders = networkOrders.filter((o) => o.buyer_shop_id === activeShop.id);

  // Modals state
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<any>(partnerShops[0] || null);

  // New B2B Order Form state
  const [orderItemName, setOrderItemName] = useState("Aashirvaad Atta 5kg");
  const [orderQty, setOrderQty] = useState(25);
  const [orderWholesalePaise, setOrderWholesalePaise] = useState(19500); // ₹195
  const [orderDelivery, setOrderDelivery] = useState<"PICKUP" | "SUPPLIER_DELIVERY">("SUPPLIER_DELIVERY");

  // Mock catalog shared by partner shops
  const sharedCatalog = [
    {
      id: "sc_01",
      shopId: partnerShops[0]?.id || "shop_02",
      shopName: partnerShops[0]?.name || "Trends Apparel Hub",
      productName: "Cotton Crew Neck T-Shirt (Bulk Box of 50)",
      wholesalePricePaise: 18000,
      availableStock: 120,
      unit: "PACK",
    },
    {
      id: "sc_02",
      shopId: partnerShops[1]?.id || "shop_03",
      shopName: partnerShops[1]?.name || "Sanjeevani Medicos",
      productName: "Dettol Antiseptic Liquid 500ml (Carton of 24)",
      wholesalePricePaise: 29000,
      availableStock: 45,
      unit: "BOX",
    },
    {
      id: "sc_03",
      shopId: partnerShops[0]?.id || "shop_02",
      shopName: partnerShops[0]?.name || "Trends Apparel Hub",
      productName: "Denim Jeans Classic Fit (Assorted Sizes)",
      wholesalePricePaise: 55000,
      availableStock: 80,
      unit: "PIECE",
    },
  ];

  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPartner) return;

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
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Share2 className="h-6 w-6 text-indigo-500" />
            TRACE B2B Shop Network
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Inter-shop stock sharing, wholesale inventory reservations, and decentralized supplier catalog.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setIsConnectModalOpen(true)}
            className="gap-2 text-xs"
          >
            <QrCode className="h-4 w-4" />
            <span>Connect Shop via QR</span>
          </Button>
          <Button
            variant="default"
            onClick={() => setIsOrderModalOpen(true)}
            className="gap-2 text-xs shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>New B2B Stock Order</span>
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

      {/* Shared B2B Catalog Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-foreground">
            Shared Partner Wholesale Catalog
          </h2>
          <span className="text-xs text-muted-foreground">
            Pre-negotiated wholesale rates for instant fulfillment
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {sharedCatalog.map((item) => (
            <Card key={item.id} className="border-border/60 hover:border-indigo-500/40 transition-all">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <Badge variant="outline" className="text-[10px]">
                    {item.shopName}
                  </Badge>
                  <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded">
                    {item.availableStock} {item.unit} Available
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
        </div>
      </div>

      {/* Network Orders Lifecycle Manager */}
      <Card className="border-border/60">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-sm font-bold text-foreground">
              B2B Network Orders & Stock Reservations
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Track multi-shop orders through Pending, Accepted, Reserved, and Completed phases.
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
                            onClick={() => updateNetworkOrderStatus(ord.id, "COMPLETED")}
                            className="h-7 text-xs px-2 bg-emerald-600 hover:bg-emerald-500"
                          >
                            Fulfill & Close
                          </Button>
                        )}
                        {ord.status === "COMPLETED" && (
                          <span className="text-[11px] text-emerald-500 font-semibold flex items-center justify-end gap-1">
                            <Check className="h-3.5 w-3.5" /> Settled
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {networkOrders.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground text-xs">
                      No network orders recorded yet. Connect with neighboring shops to begin trading!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

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
              Scan this QR code from another shop's TRACE mobile app or enter the code to establish an instant wholesale trading partnership.
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
            <Button type="submit" variant="default">
              Submit B2B Order
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
