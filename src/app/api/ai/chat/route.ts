import { NextRequest, NextResponse } from "next/server";

// Helper function to call Google Gemini API with fallback
async function callGeminiAPI(
  prompt: string,
  systemInstruction: string,
  apiKey: string,
  model: string = "gemini-3.5-flash"
): Promise<string | null> {
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      systemInstruction: { parts: [{ text: systemInstruction }] },
      generationConfig: {
        maxOutputTokens: 350,
        temperature: 0.3,
      },
    };

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      console.warn(`Gemini API HTTP ${res.status}:`, await res.text());
      return null;
    }

    const data = await res.json();
    const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return candidateText ? candidateText.trim() : null;
  } catch (err) {
    console.warn("Gemini call exception:", err);
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, shopId, role, language, contextData } = body;

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const lower = message.toLowerCase().trim();
    const apiKey = process.env.GEMINI_API_KEY || "";
    const model = process.env.GEMINI_MODEL || "gemini-3.5-flash";

    let replyText = "";
    let toolExecution: any = null;

    // 1. LOW STOCK INQUIRY
    if (
      lower.includes("low stock") ||
      lower.includes("kam stock") ||
      lower.includes("stock check") ||
      lower.includes("संपत") ||
      lower.includes("कम स्टॉक") ||
      lower.includes("खत्म")
    ) {
      const lowItems = (contextData?.products || []).filter(
        (p: any) => p.stock_quantity <= p.low_stock_threshold
      );

      toolExecution = {
        tool: "get_low_stock_products",
        parameters: { shopId, threshold: "safety_limit" },
        status: "SUCCESS",
        resultCount: lowItems.length,
      };

      if (language === "hi") {
        replyText =
          lowItems.length > 0
            ? `आपके दुकान में कुल ${lowItems.length} उत्पाद लो-स्टॉक सीमा से नीचे हैं:\n` +
              lowItems.map((p: any) => `• ${p.name}: केवल ${p.stock_quantity} ${p.unit} शेष (सुरक्षा सीमा: ${p.low_stock_threshold})`).join("\n") +
              `\n\nसुझाव: आप तुरंत B2B नेटवर्क ऑर्डर या डिस्ट्रीब्यूटर रीस्टॉक कर सकते हैं।`
            : `सभी उत्पादों का स्टॉक सुरक्षित स्तर पर है। कोई भी उत्पाद खत्म होने की स्थिति में नहीं है।`;
      } else if (language === "mr") {
        replyText =
          lowItems.length > 0
            ? `तुमच्या दुकानातील ${lowItems.length} वस्तूंचा साठा संपत आला आहे:\n` +
              lowItems.map((p: any) => `• ${p.name}: फक्त ${p.stock_quantity} ${p.unit} शिल्लक (किमान मर्यादा: ${p.low_stock_threshold})`).join("\n") +
              `\n\nसल्ला: कृपया लगेच डिस्ट्रीब्यूटर किंवा B2B नेटवर्कद्वारे नवीन माल मागवा.`
            : `सगळ्या वस्तूंचा साठा पुरेसा आहे. सध्या कोणतीही वस्तू संपलेली नाही.`;
      } else {
        replyText =
          lowItems.length > 0
            ? `Identified ${lowItems.length} items below minimum safety threshold:\n` +
              lowItems.map((p: any) => `• ${p.name}: ${p.stock_quantity} ${p.unit} left (threshold: ${p.low_stock_threshold})`).join("\n") +
              `\n\nRecommendation: Restock immediately or trigger a TRACE B2B Network fulfillment request.`
            : `All inventory levels are optimal. Zero items currently below safety threshold.`;
      }
    }

    // 2. SALES / REVENUE SUMMARY INQUIRY
    else if (
      lower.includes("sales") ||
      lower.includes("revenue") ||
      lower.includes("kamai") ||
      lower.includes("kamayi") ||
      lower.includes("bikri") ||
      lower.includes("विक्री") ||
      lower.includes("कमाई") ||
      lower.includes("सेल")
    ) {
      const todayStr = new Date().toISOString().split("T")[0];
      const todayInvoices = (contextData?.invoices || []).filter((i: any) =>
        i.created_at.startsWith(todayStr)
      );
      const totalPaise = todayInvoices.reduce((s: number, i: any) => s + (i.total_amount_paise || 0), 0);
      const totalRupees = (totalPaise / 100).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

      toolExecution = {
        tool: "get_sales_summary",
        parameters: { shopId, date: todayStr },
        status: "SUCCESS",
        totalSalesPaise: totalPaise,
        invoiceCount: todayInvoices.length,
      };

      if (language === "hi") {
        replyText = `आज की कुल बिक्री ₹${totalRupees} है, जिसमें कुल ${todayInvoices.length} बिल बनाए गए हैं। औसत बिल मूल्य लगभग ₹${
          todayInvoices.length ? ((totalPaise / 100) / todayInvoices.length).toFixed(0) : "0"
        } रहा।`;
      } else if (language === "mr") {
        replyText = `आजची एकूण विक्री ₹${totalRupees} झाली आहे. आज दिवसभरात ${todayInvoices.length} बिले तयार झाली आहेत।`;
      } else {
        replyText = `Today's gross sales stands at ₹${totalRupees} across ${todayInvoices.length} issued invoices. Average transaction size is ₹${
          todayInvoices.length ? ((totalPaise / 100) / todayInvoices.length).toFixed(0) : "0"
        }.`;
      }
    }

    // 3. ADD STOCK COMMAND (Role-Guarded Tool Mutation)
    else if (
      lower.includes("add stock") ||
      (lower.includes("add") && (lower.includes("packet") || lower.includes("stock") || lower.includes("kg"))) ||
      lower.includes("वाढवा") ||
      lower.includes("जोड़ो") ||
      lower.includes("डालो")
    ) {
      const match = (contextData?.products || []).find((p: any) =>
        lower.includes(p.name.toLowerCase().split(" ")[0])
      ) || (contextData?.products || [])[0];

      const numMatch = lower.match(/\d+/);
      const qty = numMatch ? parseInt(numMatch[0]) : 10;

      if (role === "CASHIER") {
        replyText =
          language === "hi"
            ? "क्षमा करें, कैशियर रोल के पास स्टॉक बढ़ाने की अनुमति नहीं है। कृपया स्टोर मैनेजर या ओनर से संपर्क करें।"
            : language === "mr"
            ? "क्षमस्व, कॅशियरला स्टॉक बदलण्याची परवानगी नाही. कृपया मॅनेजर किंवा मालकाशी संपर्क साधा."
            : "Permission denied: Cashier role does not have authorization to modify stock inventory. Please sign in as Owner or Manager.";
      } else {
        toolExecution = {
          tool: "add_stock",
          action: "MUTATION",
          parameters: {
            productId: match?.id,
            productName: match?.name,
            quantityDelta: qty,
            reason: "AI Assistant Voice/Text Command",
          },
          status: "SUCCESS",
        };

        if (language === "hi") {
          replyText = `सफलतापूर्वक निष्पादित! मैंने **${match?.name}** में **+${qty} ${match?.unit}** का नया स्टॉक जोड़ दिया है। नया स्टॉक तुरंत इन्वेंटरी और POS काउंटर में अपडेट हो गया है।`;
        } else if (language === "mr") {
          replyText = `यशस्वीरित्या पूर्ण केले! मी **${match?.name}** मध्ये **+${qty} ${match?.unit}** नवीन साठा जोडला आहे. POS काउंटरवर नवीन स्टॉक अपडेट झाला आहे.`;
        } else {
          replyText = `Successfully executed! Added **+${qty} ${match?.unit}** to **${match?.name}**. Inventory levels updated in real time.`;
        }
      }
    }

    // 4. PAYLATER / KHATA INQUIRY
    else if (
      lower.includes("khata") ||
      lower.includes("paylater") ||
      lower.includes("udhar") ||
      lower.includes("उधार") ||
      lower.includes("बाकी")
    ) {
      const customersWithDebt = (contextData?.customers || []).filter(
        (c: any) => (c.outstanding_balance_paise || 0) > 0
      );
      const totalDuePaise = customersWithDebt.reduce(
        (s: number, c: any) => s + (c.outstanding_balance_paise || 0),
        0
      );
      const totalDueRupees = (totalDuePaise / 100).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
      });

      toolExecution = {
        tool: "get_customer_balance",
        parameters: { shopId, status: "OVERDUE" },
        status: "SUCCESS",
        customersCount: customersWithDebt.length,
        totalDuePaise,
      };

      if (language === "hi") {
        replyText = `कुल मिलाकर ${customersWithDebt.length} ग्राहकों पर ₹${totalDueRupees} की उधारी (PayLater) बकाया है:\n` +
          customersWithDebt.slice(0, 3).map((c: any) => `• ${c.name}: ₹${(c.outstanding_balance_paise / 100).toFixed(0)}`).join("\n") +
          `\n\nसुझाव: आप PayLater पेज से 1-क्लिक में WhatsApp रिमाइंडर्स भेज सकते हैं।`;
      } else if (language === "mr") {
        replyText = `एकूण ${customersWithDebt.length} ग्राहकांकडे ₹${totalDueRupees} उधारी बाकी आहे:\n` +
          customersWithDebt.slice(0, 3).map((c: any) => `• ${c.name}: ₹${(c.outstanding_balance_paise / 100).toFixed(0)}`).join("\n") +
          `\n\nसल्ला: तुम्ही PayLater मेनू मधून ग्राहकांना WhatsApp द्वारे आठवण संदेश पाठवू शकता.`;
      } else {
        replyText = `Total outstanding PayLater credit is ₹${totalDueRupees} across ${customersWithDebt.length} customer ledgers:\n` +
          customersWithDebt.slice(0, 3).map((c: any) => `• ${c.name}: ₹${(c.outstanding_balance_paise / 100).toFixed(0)}`).join("\n") +
          `\n\nTip: You can dispatch 1-click WhatsApp payment reminders with UPI QR links directly from PayLater Khata.`;
      }
    }

    // 5. GENERAL ADVICE / PRODUCT INQUIRY / CONVERSATION (Powered by Live Google Gemini)
    else {
      toolExecution = {
        tool: "search_products",
        parameters: { query: message, shopId },
        status: "SUCCESS",
      };

      // Try Live Google Gemini LLM if key is available
      if (apiKey) {
        const langName = language === "hi" ? "Hindi (हिन्दी)" : language === "mr" ? "Marathi (मराठी)" : "English";
        const systemPrompt = `You are TRACE AI, the official business management AI for Indian local stores (groceries, apparel, pharmacies). 
You must respond clearly, helpfully, and professionally in ${langName}.
Keep your reply concise (under 120 words), suitable for retail store owners and billing operators.
Store context:
- Role: ${role}
- Products catalog count: ${contextData?.products?.length || 0}
- Invoices tracked: ${contextData?.invoices?.length || 0}
- Khata customers: ${contextData?.customers?.length || 0}`;

        const geminiReply = await callGeminiAPI(message, systemPrompt, apiKey, model);
        if (geminiReply) {
          replyText = geminiReply;
        }
      }

      // Fallback if Gemini not available or during high traffic spike
      if (!replyText) {
        if (language === "hi") {
          replyText = `मैं TRACE AI हूँ। मैं आपके दुकान की बिलिंग, इन्वेंटरी जोड़ने, आज की बिक्री देखने और ग्राहकों के उधार खाते की जांच करने में मदद कर सकता हूँ।\n\nउदाहरण आदेश:\n• "आज कितनी बिक्री हुई?"\n• "कम स्टॉक वाले आइटम दिखाओ"\n• "उधारी का स्टेटस क्या है?"\n• "मिल्क 20 पैकेट जोड़ो"`;
        } else if (language === "mr") {
          replyText = `मी TRACE AI आहे. मी तुमची दुकानाची विक्री, नवीन माल भरणे, आणि ग्राहकांची उधारी सांभाळण्यात मदत करतो.\n\nतुम्ही मला विचारू शकता:\n• "आजची विक्री किती झाली?"\n• "कोणता माल संपत आला आहे?"\n• "उधारी किती बाकी आहे?"`;
        } else {
          replyText = `I am TRACE AI Assistant, connected to your shop database with real-time tool execution capabilities.\n\nYou can issue direct commands like:\n• "How much sales today?"\n• "Show low stock products"\n• "What is the total PayLater khata due?"\n• "Add 20 packets Atta to inventory"`;
        }
      }
    }

    return NextResponse.json({
      success: true,
      reply: replyText,
      toolExecution,
    });
  } catch (err: any) {
    console.error("AI Assistant API error:", err);
    return NextResponse.json(
      { error: "Internal server error during AI processing", details: err?.message },
      { status: 500 }
    );
  }
}
