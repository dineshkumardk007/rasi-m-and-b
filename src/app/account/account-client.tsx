"use client";

import { useState, useEffect } from "react";
import { myOrdersAction, myAddressesAction, myBabyDobAction } from "@/app/customer-actions";
import { Btn } from "@/components/ui";
import { endCustomerSession } from "@/lib/customer-session";
import type { CustomerAddress, Order } from "@/lib/types";
import { inr } from "@/lib/constants";

export function AccountDashboard({
  initialName,
  identifier,
  isEmail,
}: {
  initialName: string;
  identifier: string;
  isEmail: boolean;
}) {
  const [activeTab, setActiveTab] = useState<"orders" | "addresses" | "settings">("orders");
  const [orders, setOrders] = useState<Order[]>([]);
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [babyDob, setBabyDob] = useState<string | null>(null);
  const [loyaltyPoints, setLoyaltyPoints] = useState(0);

  useEffect(() => {
    myOrdersAction().then(setOrders).catch(console.error);
    myAddressesAction().then(setAddresses).catch(console.error);
    myBabyDobAction().then(setBabyDob).catch(console.error);
    import("@/app/customer-actions").then(m => m.getCustomerPointsAction().then(setLoyaltyPoints).catch(console.error));
  }, []);

  const handleSignOut = async () => {
    await endCustomerSession();
    window.location.href = "/";
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6 pb-4 border-b-2.5 border-ink/10">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border-3 border-ink bg-[#FFE1A8] text-[28px] shadow-hard-3">
            👤
          </div>
          <div>
            <h1 className="font-display text-[28px] font-extrabold text-ink leading-tight">
              {initialName}
            </h1>
            <p className="font-body text-[14px] text-mute font-bold">
              {isEmail ? `📧 ${identifier}` : `📱 +91 ${identifier}`}
              <span className="mx-2">•</span>
              <span className="text-[#7CB342]">🌟 {loyaltyPoints} Points</span>
            </p>
          </div>
        </div>
        <Btn small onClick={handleSignOut} className="bg-paper hover:bg-[#FFCBD9]">
          Sign Out
        </Btn>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar Nav */}
        <div className="w-full md:w-64 shrink-0 flex md:flex-col gap-2 overflow-x-auto pb-2 sticker-scrollbar">
          {(["orders", "addresses", "settings"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 md:flex-none text-left px-4 py-3 rounded-tile border-2.5 border-ink font-display text-[15px] font-extrabold transition-all min-w-[120px] ${
                activeTab === tab
                  ? "bg-[#C7E9FF] shadow-hard-2 translate-y-[-2px]"
                  : "bg-paper text-mute hover:text-ink hover:bg-[#F2F8FF]"
              }`}
            >
              {tab === "orders" && "📦 Order History"}
              {tab === "addresses" && "📍 Saved Addresses"}
              {tab === "settings" && "⚙️ Settings"}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 min-w-0">
          {activeTab === "orders" && (
            <div className="space-y-4">
              <h2 className="font-display text-[22px] font-extrabold text-ink mb-4">Your Orders</h2>
              {orders.length === 0 ? (
                <div className="rounded-tile border-2.5 border-ink border-dashed p-8 text-center bg-white">
                  <div className="text-[32px] mb-2">🛍️</div>
                  <p className="font-body font-bold text-mute">No orders yet.</p>
                </div>
              ) : (
                orders.map((o) => (
                  <div key={o.id} className="rounded-tile border-2.5 border-ink bg-white p-4 shadow-hard-2">
                    <div className="flex justify-between items-center border-b-2 border-ink/10 pb-3 mb-3">
                      <div>
                        <div className="font-display text-[16px] font-extrabold">{o.order_no}</div>
                        <div className="text-[12px] text-mute">{new Date(o.placed_at).toLocaleDateString()}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-display text-[16px] font-extrabold text-brand">{inr(o.total)}</div>
                        <div className="text-[12px] uppercase font-bold text-mute tracking-wider">{o.status}</div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {o.items.map((i, idx) => (
                        <div key={idx} className="flex justify-between text-[13px] font-medium">
                          <span>{i.qty}x {i.name_snapshot}</span>
                          <span className="text-mute">{inr(i.price_snapshot)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === "addresses" && (
            <div className="space-y-4">
              <h2 className="font-display text-[22px] font-extrabold text-ink mb-4">Saved Addresses</h2>
              {addresses.length === 0 ? (
                <div className="rounded-tile border-2.5 border-ink border-dashed p-8 text-center bg-white">
                  <div className="text-[32px] mb-2">🏠</div>
                  <p className="font-body font-bold text-mute">No saved addresses.</p>
                </div>
              ) : (
                addresses.map((a) => (
                  <div key={a.id} className="rounded-tile border-2.5 border-ink bg-white p-4 shadow-hard-2 relative">
                    {a.is_default && (
                      <span className="absolute top-4 right-4 text-[10px] font-extrabold bg-[#B9EBDD] px-2 py-1 rounded-pill border-2 border-ink uppercase">
                        Default
                      </span>
                    )}
                    <div className="font-display text-[16px] font-extrabold">{a.name}</div>
                    <div className="font-body text-[13px] text-mute mt-1">{a.phone}</div>
                    <div className="font-body text-[13px] text-ink mt-2">
                      {a.line}, {a.city}, {a.pin}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === "settings" && (
            <div className="space-y-4">
              <h2 className="font-display text-[22px] font-extrabold text-ink mb-4">Account Settings</h2>
              
              <div className="rounded-tile border-2.5 border-ink bg-white p-5 shadow-hard-2">
                <h3 className="font-display text-[16px] font-extrabold mb-1">Baby Birthday Club</h3>
                <p className="text-[13px] text-mute mb-4">Add your baby&apos;s birthday to receive age-appropriate recommendations.</p>
                <div className="flex items-center gap-3">
                  <input 
                    type="date" 
                    className="rounded-pill border-2.5 border-ink px-4 py-2 text-[14px] font-bold outline-none focus:border-brand"
                    value={babyDob || ""}
                    readOnly
                  />
                  <Btn small>Update</Btn>
                </div>
              </div>

              <div className="rounded-tile border-2.5 border-ink bg-white p-5 shadow-hard-2">
                <h3 className="font-display text-[16px] font-extrabold mb-1">Password</h3>
                <p className="text-[13px] text-mute mb-4">Change your account password securely.</p>
                <Btn small className="bg-paper hover:bg-[#FFF6ED]">Change Password</Btn>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
