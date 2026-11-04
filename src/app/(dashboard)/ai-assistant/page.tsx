"use client";

import React, { useState, useRef, useEffect } from "react";
import { useTrace } from "@/context/TraceContext";
import {
  Bot,
  Send,
  Sparkles,
  CheckCircle2,
  Terminal,
  ShieldAlert,
  Languages,
  Zap,
  ArrowRight,
  User,
  RotateCcw,
  Mic,
  MicOff,
  Volume2,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
  toolExecution?: {
    tool: string;
    action?: string;
    parameters: any;
    status: string;
    [key: string]: any;
  };
}

export default function AIAssistantPage() {
  const {
    activeShop,
    products,
    invoices,
    customers,
    userRole,
    language,
    setLanguage,
    adjustStock,
  } = useTrace();

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "msg_init",
      sender: "ai",
      text:
        language === "hi"
          ? `नमस्ते! मैं TRACE AI हूँ। मैं आपके स्टोर **${activeShop.name}** से जुड़ा हुआ हूँ। आप मुझसे बिक्री, इन्वेंटरी अपडेट, या उधारी के बारे में पूछ सकते हैं।`
          : language === "mr"
          ? `नमस्कार! मी TRACE AI आहे. मी तुमच्या **${activeShop.name}** दुकानासाठी साठा तपासणी आणि विक्री अहवाल तयार करू शकतो.`
          : `Hello! I am TRACE AI Assistant, connected directly to your store **${activeShop.name}** (${activeShop.city}). How can I assist your operations today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);

  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Speech Recognition Voice Input State
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [micPermissionGranted, setMicPermissionGranted] = useState(false);
  const recognitionRef = useRef<any>(null);

  const toggleListening = async () => {
    setSpeechError(null);

    // If currently listening, stop it cleanly
    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.warn("Error stopping recognition:", e);
        }
      }
      setIsListening(false);
      return;
    }

    // Step 1: Explicitly request microphone hardware permission via getUserMedia
    // This forces Chrome / Edge / Brave to show the native "Allow Microphone" prompt
    try {
      if (typeof navigator !== "undefined" && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setMicPermissionGranted(true);
        // Release the test tracks so SpeechRecognition has exclusive audio device control
        stream.getTracks().forEach((track) => track.stop());
      }
    } catch (permErr: any) {
      console.warn("Microphone permission check failed:", permErr);
      setSpeechError(
        language === "hi"
          ? "माइक्रोफ़ोन अनुमति नहीं मिली। कृपया ब्राउज़र के URL बार में 🔒 लॉक आइकन दबाकर माइक्रोफ़ोन को 'Allow' करें।"
          : language === "mr"
          ? "मायक्रोफोन परवानगी नाकारली गेली. कृपया ब्राउझरमध्ये 🔒 लॉक चिन्हावर क्लिक करून मायक्रोफोन सक्षम करा."
          : "Microphone permission required: Please click the 🔒 lock icon in your browser address bar and select 'Allow Microphone'."
      );
      setIsListening(false);
      return;
    }

    // Step 2: Initialize Web Speech API
    const SpeechRecognition =
      typeof window !== "undefined" &&
      ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

    if (!SpeechRecognition) {
      setSpeechError(
        language === "hi"
          ? "आपका ब्राउज़र स्पीच पहचान का समर्थन नहीं करता है। कृपया Google Chrome या Microsoft Edge का उपयोग करें।"
          : language === "mr"
          ? "तुमचा ब्राउझर व्हॉइस इनपुटला सपोर्ट करत नाही. कृपया Google Chrome किंवा Microsoft Edge वापरा."
          : "Web Speech API is not supported in this browser. Please use Google Chrome or Microsoft Edge."
      );
      setTimeout(() => setSpeechError(null), 6000);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;

      // Locale mapping for trilingual AI
      recognition.lang = language === "hi" ? "hi-IN" : language === "mr" ? "mr-IN" : "en-IN";
      recognition.continuous = true; // Stay listening while speaking
      recognition.interimResults = true; // Capture intermediate speech in real-time
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setSpeechError(null);
      };

      recognition.onresult = (event: any) => {
        let fullTranscript = "";
        for (let i = 0; i < event.results.length; i++) {
          fullTranscript += event.results[i][0].transcript;
        }
        if (fullTranscript.trim()) {
          setInputText(fullTranscript);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition notice:", event.error);
        if (event.error === "not-allowed" || event.error === "permission-denied") {
          setSpeechError(
            language === "hi"
              ? "माइक्रोफ़ोन अनुमति अस्वीकृत है। कृपया ब्राउज़र में 🔒 लॉक आइकन दबाकर अनुमति दें।"
              : language === "mr"
              ? "मायक्रोफोन परवानगी नाकारली गेली. कृपया ब्राउझरमध्ये परवानगी सक्षम करा."
              : "Microphone permission blocked. Please click the 🔒 lock icon in the address bar and select 'Allow'."
          );
          setIsListening(false);
        } else if (event.error === "network") {
          setSpeechError(
            "Speech service connection notice: Chrome speech recognition connects to Google servers. Please verify internet connectivity."
          );
          setIsListening(false);
        } else if (event.error !== "no-speech") {
          setSpeechError(`Voice notice: ${event.error}`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (err: any) {
      console.error("Speech recognition startup error:", err);
      setSpeechError("Could not activate microphone: " + (err?.message || "Device busy or unsupported"));
      setIsListening(false);
    }
  };

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {}
      }
    };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = textToSend || inputText;
    if (!query.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      sender: "user",
      text: query.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: query.trim(),
          shopId: activeShop.id,
          role: userRole,
          language,
          contextData: {
            products: products.filter((p) => p.shop_id === activeShop.id),
            invoices: invoices.filter((i) => i.shop_id === activeShop.id),
            customers: customers.filter((c) => c.shop_id === activeShop.id),
          },
        }),
      });

      const data = await response.json();

      if (data.success) {
        // If the AI invoked a stock adjustment tool on the server, reflect in client state
        if (
          data.toolExecution &&
          data.toolExecution.tool === "add_stock" &&
          data.toolExecution.parameters?.productId
        ) {
          adjustStock(
            data.toolExecution.parameters.productId,
            data.toolExecution.parameters.quantityDelta,
            "RESTOCK",
            `AI Assistant Command: ${query}`
          );
        }

        const aiMsg: ChatMessage = {
          id: `ai_${Date.now()}`,
          sender: "ai",
          text: data.reply,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          toolExecution: data.toolExecution,
        };
        setMessages((prev) => [...prev, aiMsg]);
      } else {
        const errorMsg: ChatMessage = {
          id: `err_${Date.now()}`,
          sender: "ai",
          text: data.error || "Sorry, I encountered an issue processing your query.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
        setMessages((prev) => [...prev, errorMsg]);
      }
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          sender: "ai",
          text: "Communication timeout with TRACE AI server. Please verify your connection.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Quick Action Prompts by Language
  const quickPrompts = {
    en: [
      { label: "Today's Sales Summary", prompt: "How much sales did we make today?" },
      { label: "Check Low Stock Items", prompt: "Show low stock products" },
      { label: "PayLater Khata Status", prompt: "What is total PayLater khata debt?" },
      { label: "Add 20 Packet Stock", prompt: "Add 20 packet stock to inventory" },
    ],
    hi: [
      { label: "आज की बिक्री रिपोर्ट", prompt: "आज कितनी बिक्री हुई?" },
      { label: "कम स्टॉक वाले सामान", prompt: "कम स्टॉक वाले आइटम दिखाओ" },
      { label: "उधारी खाता स्थिति", prompt: "उधारी का स्टेटस क्या है?" },
      { label: "20 पैकेट स्टॉक जोड़ो", prompt: "20 पैकेट स्टॉक जोड़ो" },
    ],
    mr: [
      { label: "आजची विक्री अहवाल", prompt: "आजची विक्री किती झाली?" },
      { label: "कमी साठा असलेल्या वस्तू", prompt: "कोणता माल संपत आला आहे?" },
      { label: "उधारी किती बाकी आहे?", prompt: "उधारी किती बाकी आहे?" },
      { label: "२० नग स्टॉक वाढवा", prompt: "२० नग स्टॉक वाढवा" },
    ],
  }[language];

  return (
    <div className="flex h-[calc(100vh-5.5rem)] flex-col gap-4 animate-in fade-in duration-200">
      {/* Top Header Card */}
      <div className="flex flex-col gap-2 rounded-2xl border border-border/70 bg-gradient-to-r from-card via-card to-indigo-950/20 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/30">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-foreground">
                TRACE AI Assistant
              </h1>
              <Badge variant="brand" className="text-[10px]">
                Safe Server-Side Tool Calling
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Direct natural language execution for inventory, sales insights, and khata ledger.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Language Selector in AI Header */}
          <div className="flex rounded-lg border border-border/80 bg-background p-0.5 text-xs">
            <button
              onClick={() => setLanguage("en")}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                language === "en" ? "bg-indigo-600 text-white" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              EN
            </button>
            <button
              onClick={() => setLanguage("hi")}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                language === "hi" ? "bg-indigo-600 text-white" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              हिन्दी
            </button>
            <button
              onClick={() => setLanguage("mr")}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                language === "mr" ? "bg-indigo-600 text-white" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              मराठी
            </button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMessages([])}
            className="text-xs text-muted-foreground"
            title="Reset conversation"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Chat Messages Area */}
      <div className="flex-1 overflow-y-auto rounded-2xl border border-border/70 bg-card/60 p-4 shadow-inner space-y-4">
        {messages.map((msg) => {
          const isUser = msg.sender === "user";

          return (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}
            >
              {/* Avatar */}
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${
                  isUser
                    ? "bg-muted text-foreground border border-border"
                    : "bg-indigo-600 text-white shadow-sm"
                }`}
              >
                {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
              </div>

              {/* Message Bubble */}
              <div className={`max-w-[85%] sm:max-w-[70%] space-y-2`}>
                <div
                  className={`rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed whitespace-pre-line shadow-sm ${
                    isUser
                      ? "bg-indigo-600 text-white rounded-tr-none"
                      : "bg-card border border-border text-foreground rounded-tl-none"
                  }`}
                >
                  {msg.text}
                </div>

                {/* Tool Execution Card (if triggered) */}
                {msg.toolExecution && (
                  <div className="rounded-xl border border-border/80 bg-background/90 p-3 text-xs space-y-1.5 shadow-sm font-mono">
                    <div className="flex items-center justify-between border-b border-border/50 pb-1.5">
                      <div className="flex items-center gap-1.5 text-indigo-400 font-bold">
                        <Terminal className="h-3.5 w-3.5" />
                        <span>Tool: {msg.toolExecution.tool}</span>
                      </div>
                      <Badge variant="success" className="text-[9px] py-0">
                        {msg.toolExecution.status}
                      </Badge>
                    </div>

                    <div className="text-[11px] text-muted-foreground">
                      <span>Parameters: </span>
                      <span className="text-foreground">
                        {JSON.stringify(msg.toolExecution.parameters)}
                      </span>
                    </div>

                    {msg.toolExecution.action === "MUTATION" && (
                      <div className="flex items-center gap-1 text-[11px] text-emerald-500 font-semibold pt-0.5">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>Database state mutation executed and synced.</span>
                      </div>
                    )}
                  </div>
                )}

                <div
                  className={`text-[10px] text-muted-foreground px-1 ${
                    isUser ? "text-right" : "text-left"
                  }`}
                >
                  {msg.timestamp}
                </div>
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
              <Bot className="h-4 w-4 animate-spin" />
            </div>
            <div className="rounded-2xl rounded-tl-none bg-card border border-border px-4 py-3 text-xs text-muted-foreground flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-indigo-500 animate-pulse" />
              <span>TRACE AI is analyzing shop records and executing backend tools...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompt Suggestions */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider shrink-0">
          Try:
        </span>
        {quickPrompts.map((p, i) => (
          <button
            key={i}
            onClick={() => handleSendMessage(p.prompt)}
            className="flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-border/70 bg-card px-2.5 py-1 text-xs text-foreground hover:bg-accent/60 hover:border-indigo-500/40 transition-all shadow-sm"
          >
            <span>{p.label}</span>
            <ArrowRight className="h-3 w-3 text-muted-foreground" />
          </button>
        ))}
      </div>

      {/* Listening State Banner */}
      {isListening && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3.5 py-2 text-xs text-rose-500 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
            </span>
            <span className="font-semibold">
              {language === "hi"
                ? "🎙️ सुन रहा हूँ... बोलिए (उदा. 'आज की बिक्री दिखाओ' या 'कम स्टॉक दिखाओ')"
                : language === "mr"
                ? "🎙️ ऐकत आहे... बोला (उदा. 'आजची विक्री दाखवा' किंवा 'साठा तपासा')"
                : "🎙️ Listening... Speak naturally in English (e.g. 'How much sales today?')"
              }
            </span>
          </div>
          <button
            onClick={toggleListening}
            className="text-[11px] font-bold underline hover:text-rose-400"
          >
            {language === "hi" ? "रोकें" : language === "mr" ? "थांबवा" : "Stop Recording"}
          </button>
        </div>
      )}

      {/* Speech Error Banner */}
      {speechError && (
        <div className="flex items-center justify-between rounded-xl border border-amber-500/40 bg-amber-500/10 px-3.5 py-2 text-xs text-amber-500 animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{speechError}</span>
          </div>
          <button
            onClick={() => setSpeechError(null)}
            className="text-[10px] font-bold uppercase hover:underline ml-2"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Input Box */}
      <div className="rounded-2xl border border-border/80 bg-card p-2 shadow-sm">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              isListening
                ? language === "hi"
                  ? "सुन रहा हूँ... बोलिए..."
                  : language === "mr"
                  ? "ऐकत आहे... बोला..."
                  : "Listening... Speak your command..."
                : language === "hi"
                ? "TRACE AI से पूछें या 🎙️ माइक दबाकर बोलें..."
                : language === "mr"
                ? "TRACE AI ला विचारा किंवा 🎙️ माइक दाबून बोला..."
                : "Ask TRACE AI or tap 🎙️ to speak your request..."
            }
            disabled={isLoading}
            className="flex-1 bg-transparent px-3 py-2 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />

          {/* Microphone Voice Button */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={toggleListening}
            title={
              isListening
                ? "Stop recording"
                : `Voice Input (${language.toUpperCase()})`
            }
            className={`h-9 w-9 p-0 rounded-xl transition-all duration-200 ${
              isListening
                ? "bg-rose-600 text-white hover:bg-rose-700 shadow-md shadow-rose-600/30 animate-pulse"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            }`}
          >
            {isListening ? (
              <MicOff className="h-4 w-4 text-white" />
            ) : (
              <Mic className="h-4 w-4" />
            )}
          </Button>

          <Button
            type="submit"
            disabled={!inputText.trim() || isLoading}
            variant="default"
            className="gap-1.5 px-4"
          >
            <span>Execute</span>
            <Send className="h-3.5 w-3.5" />
          </Button>
        </form>
      </div>
    </div>
  );
}
