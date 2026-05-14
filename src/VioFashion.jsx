// src/VioFashion.jsx — VioFashion "ATELIER"
// Full Firebase migration: Auth · Firestore · Storage
// Upload fix: uploadBytesResumable gives REAL 0-100% progress
import { useState, useEffect, useRef, useCallback } from "react";
import { db, storage } from "./firebaseClient";
import {
  collection, doc, getDoc, getDocs, addDoc, setDoc,
  updateDoc, deleteDoc, query, where, orderBy, limit,
  onSnapshot, serverTimestamp, increment,
} from "firebase/firestore";
import { ref as sRef, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { useAuth } from "./hooks/useAuth.jsx";
import {
  submitOffer, acceptOffer, rejectOffer,
  useOffers, useCustomerOrders, useCreatorOrders, updateOrderStatus,
  useNotifications, useSearch, useCreatorAnalytics,
  startLiveStream, endLiveStream, getOrCreateConversation,
} from "./hooks/useFirestore.js";

// ── Paystack ─────────────────────────────────────────────────
function loadPaystack() {
  return new Promise((resolve) => {
    if (window.PaystackPop) { resolve(window.PaystackPop); return; }
    const s = document.createElement("script");
    s.src = "https://js.paystack.co/v1/inline.js";
    s.onload = () => resolve(window.PaystackPop);
    document.head.appendChild(s);
  });
}
const PAYSTACK_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || "pk_test_placeholder";

// ── Fonts ─────────────────────────────────────────────────────
function injectFonts() {
  if (document.getElementById("vio-main-fonts")) return;
  const l = document.createElement("link");
  l.id = "vio-main-fonts"; l.rel = "stylesheet";
  l.href = "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;0,700;1,300;1,400;1,700&family=Jost:wght@200;300;400;500;600;700&family=Bebas+Neue&display=swap";
  document.head.appendChild(l);
}

// ── CSS ───────────────────────────────────────────────────────
const CSS = `
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
  :root{
    --ink:#060409;--deep:#0D0914;--surface:#150E20;--elevated:#1E1530;
    --border:rgba(255,255,255,0.07);
    --violet:#6D28D9;--vio-mid:#8B5CF6;--vio-lite:#C4B5FD;
    --gold:#C9A84C;--gold-lt:#E8C87A;
    --white:#F8F5FF;--muted:rgba(248,245,255,0.42);
    --danger:#F87171;--green:#34D399;
    --ff-serif:'Cormorant Garamond',Georgia,serif;
    --ff-sans:'Jost',system-ui,sans-serif;
    --ff-impact:'Bebas Neue',sans-serif;
    --accent-grad:linear-gradient(135deg,var(--violet),#5B21B6);
  }
  html,body,#root{height:100%;width:100%;}
  body{background:var(--ink);color:var(--white);font-family:var(--ff-sans);overflow:hidden;-webkit-font-smoothing:antialiased;}
  ::-webkit-scrollbar{width:2px;}::-webkit-scrollbar-thumb{background:var(--violet);border-radius:2px;}
  .shell{position:relative;width:100%;max-width:430px;height:100vh;margin:0 auto;background:var(--deep);overflow:hidden;box-shadow:0 0 120px rgba(109,40,217,0.25);}
  .shell.theme-light{--ink:#F5F0FF;--deep:#FBF8FF;--surface:#FFFFFF;--elevated:#F1EAFB;--border:rgba(39,26,58,0.12);--white:#171020;--muted:rgba(23,16,32,0.55);--accent-grad:linear-gradient(135deg,#6D28D9,#C9A84C);box-shadow:0 0 120px rgba(201,168,76,0.2);}
  .shell.theme-black{--ink:#000000;--deep:#030205;--surface:#09060D;--elevated:#100A18;--border:rgba(255,255,255,0.09);--white:#FFFFFF;--muted:rgba(255,255,255,0.44);--accent-grad:linear-gradient(135deg,#111111,#6D28D9);}
  .shell.chat-gold{--accent-grad:linear-gradient(135deg,var(--gold),#A67C1B);}
  .shell.chat-mono{--accent-grad:linear-gradient(135deg,#27272A,#71717A);}
  .screen-wrap{position:absolute;inset:0;overflow:hidden;}
  .nav-pill{position:absolute;bottom:24px;left:50%;transform:translateX(-50%);z-index:200;display:flex;align-items:center;background:rgba(21,14,32,0.92);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border:1px solid rgba(109,40,217,0.3);border-radius:100px;padding:6px 8px;gap:2px;box-shadow:0 8px 40px rgba(0,0,0,0.6),0 0 0 1px rgba(255,255,255,0.04) inset;}
  .nav-item{display:flex;flex-direction:column;align-items:center;gap:3px;padding:8px 14px;border-radius:100px;cursor:pointer;border:none;background:transparent;color:var(--muted);font-family:var(--ff-sans);font-size:9px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;white-space:nowrap;transition:all 0.25s;position:relative;}
  .nav-item.active{background:linear-gradient(135deg,var(--violet),#5B21B6);color:var(--white);box-shadow:0 4px 16px rgba(109,40,217,0.5);}
  .nav-item svg{width:18px;height:18px;}
  .nav-post-btn{width:44px;height:44px;background:linear-gradient(135deg,var(--gold),#B8943A);border:none;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 4px 20px rgba(201,168,76,0.4);transition:all 0.25s;flex-shrink:0;}
  .nav-post-btn:active{transform:scale(0.94) rotate(45deg);}
  .nav-badge{position:absolute;top:4px;right:6px;width:8px;height:8px;background:#EF4444;border-radius:50%;border:1.5px solid rgba(21,14,32,0.92);}
  .nav-pill.compact{left:12px;top:50%;transform:translateY(-50%);flex-direction:column;border-radius:28px;padding:7px;gap:15px;background:rgba(21,14,32,0.86);justify-content:center;}
  .nav-pill.compact .nav-item{width:38px;height:38px;padding:0;justify-content:center;font-size:0;border-radius:17px;}
  .nav-pill.compact .nav-post-btn{width:38px;height:38px;}
  .nav-toggle-grid{width:46px;height:46px;border:none;border-radius:18px;background:rgba(255,255,255,0.07);border:1px solid var(--border);display:grid;grid-template-columns:repeat(2,8px);grid-template-rows:repeat(2,8px);gap:5px;place-content:center;cursor:pointer;color:var(--white);animation:nav-orbit 4s linear infinite;}
  .nav-toggle-grid span{width:8px;height:8px;border-radius:50%;background:var(--gold);box-shadow:0 0 10px rgba(201,168,76,0.45);}
  @keyframes nav-orbit{to{transform:rotate(360deg);}}
  .profile-float-btn{position:absolute;top:16px;right:16px;z-index:190;width:34px;height:34px;border-radius:50%;border:1.5px solid var(--gold);overflow:hidden;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;box-shadow:0 4px 14px rgba(0,0,0,0.5);transition:all 0.2s;flex-shrink:0;}
  .profile-float-btn img{width:100%;height:100%;object-fit:cover;}
  .feed-wrap{height:100%;overflow-y:scroll;scroll-snap-type:y mandatory;scrollbar-width:none;}
  .feed-wrap::-webkit-scrollbar{display:none;}
  .feed-card{position:relative;height:100vh;scroll-snap-align:start;overflow:hidden;}
  .feed-video-bg{position:absolute;inset:0;background-size:cover;background-position:center;}
  .feed-cinema{position:absolute;inset:0;background:linear-gradient(to top,rgba(6,4,9,0.97) 0%,rgba(6,4,9,0.35) 35%,transparent 65%),linear-gradient(to bottom,rgba(6,4,9,0.6) 0%,transparent 25%);}
  .feed-topbar{position:absolute;top:0;left:0;right:0;z-index:10;padding:20px 20px 0;display:flex;align-items:center;justify-content:space-between;}
  .feed-logo{font-family:var(--ff-serif);font-size:22px;font-weight:700;letter-spacing:0.06em;background:linear-gradient(135deg,var(--white),var(--gold));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
  .feed-tabs-row{display:flex;gap:18px;}
  .feed-tab{font-family:var(--ff-sans);font-size:11px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;color:var(--muted);background:none;border:none;cursor:pointer;padding:4px 0;position:relative;transition:color 0.2s;}
  .feed-tab.on{color:var(--white);}
  .feed-tab.on::after{content:'';position:absolute;bottom:-2px;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,var(--gold),transparent);}
  .feed-topbar-right{display:flex;align-items:center;gap:8px;}
  .feed-icon-btn{width:34px;height:34px;background:rgba(255,255,255,0.07);border:1px solid var(--border);border-radius:10px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--white);position:relative;}
  .feed-editorial{position:absolute;bottom:100px;left:0;right:0;padding:0 20px;z-index:10;}
  .feed-creator-giant{font-family:var(--ff-serif);font-style:italic;font-size:clamp(34px,9vw,50px);font-weight:300;line-height:0.95;color:var(--white);margin-bottom:10px;text-shadow:0 2px 30px rgba(0,0,0,0.8);}
  .feed-creator-giant span{color:var(--gold);}
  .feed-handle-row{display:flex;align-items:center;gap:10px;margin-bottom:12px;}
  .feed-handle-av{width:28px;height:28px;border-radius:50%;border:1.5px solid var(--gold);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0;overflow:hidden;}
  .feed-handle-av img{width:100%;height:100%;object-fit:cover;}
  .feed-handle-text{font-size:12px;font-weight:400;letter-spacing:0.04em;color:rgba(248,245,255,0.7);}
  .feed-follow-pill{margin-left:auto;background:transparent;border:1px solid var(--gold);color:var(--gold);font-family:var(--ff-sans);font-size:10px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;padding:4px 12px;border-radius:100px;cursor:pointer;transition:all 0.2s;}
  .feed-follow-pill.following{background:var(--gold);color:var(--ink);}
  .feed-caption{font-size:13px;font-weight:300;line-height:1.6;color:rgba(248,245,255,0.8);margin-bottom:10px;max-width:280px;}
  .feed-tags{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;}
  .feed-tag{font-size:11px;color:var(--vio-lite);letter-spacing:0.03em;}
  .feed-sound-row{display:flex;align-items:center;gap:8px;}
  .feed-vinyl{width:22px;height:22px;border-radius:50%;border:1.5px solid rgba(255,255,255,0.3);display:flex;align-items:center;justify-content:center;animation:vio-spin 3s linear infinite;flex-shrink:0;}
  .feed-vinyl::after{content:'';width:6px;height:6px;background:var(--vio-mid);border-radius:50%;}
  .feed-sound-text{font-size:11px;color:var(--muted);font-weight:300;}
  .feed-action-tray{position:absolute;right:16px;bottom:115px;z-index:10;display:flex;flex-direction:column;gap:6px;align-items:center;}
  .feed-action{display:flex;flex-direction:column;align-items:center;gap:3px;cursor:pointer;background:none;border:none;color:var(--white);}
  .feed-action-circle{width:42px;height:42px;background:rgba(21,14,32,0.7);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,0.1);border-radius:14px;display:flex;align-items:center;justify-content:center;transition:all 0.2s;}
  .feed-action-circle.lit{background:linear-gradient(135deg,var(--violet),var(--vio-mid));border-color:transparent;}
  .feed-action-num{font-size:10px;font-weight:600;color:rgba(248,245,255,0.8);}
  .edition-badge{position:absolute;top:68px;right:14px;display:flex;flex-direction:column;align-items:flex-end;z-index:10;pointer-events:none;}
  .edition-num{font-family:var(--ff-impact);font-size:60px;line-height:1;color:rgba(201,168,76,0.1);letter-spacing:-2px;}
  .edition-label{font-family:var(--ff-sans);font-size:8px;letter-spacing:0.2em;text-transform:uppercase;color:rgba(201,168,76,0.25);margin-top:-8px;}
  .profile-scroll{height:100%;overflow-y:auto;scrollbar-width:none;padding-bottom:100px;}
  .profile-scroll::-webkit-scrollbar{display:none;}
  .profile-hero{position:relative;height:270px;overflow:hidden;}
  .profile-hero-bg{position:absolute;inset:0;background-size:cover;background-position:center;}
  .profile-hero-grad{position:absolute;inset:0;background:linear-gradient(160deg,rgba(6,4,9,0) 20%,rgba(6,4,9,0.3) 50%,rgba(13,9,20,0.97) 100%);}
  .profile-hero-name{position:absolute;bottom:20px;left:20px;right:100px;font-family:var(--ff-serif);font-style:italic;font-size:38px;font-weight:300;line-height:1.05;color:var(--white);text-shadow:0 4px 20px rgba(0,0,0,0.6);z-index:2;}
  .profile-meta{padding:44px 20px 20px;}
  .profile-handle-row{display:flex;align-items:center;gap:10px;margin-bottom:8px;}
  .profile-handle{font-size:12px;font-weight:400;letter-spacing:0.06em;color:var(--muted);}
  .profile-role-chip{display:inline-flex;align-items:center;gap:5px;background:rgba(109,40,217,0.15);border:1px solid rgba(109,40,217,0.3);color:var(--vio-lite);padding:3px 10px;border-radius:100px;font-size:10px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;}
  .verified-mark{width:16px;height:16px;background:var(--gold);border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:9px;color:var(--ink);font-weight:800;}
  .profile-bio{font-size:13px;font-weight:300;line-height:1.7;color:rgba(248,245,255,0.65);margin:12px 0 20px;max-width:300px;}
  .profile-stats-row{display:flex;margin-bottom:20px;border-top:1px solid var(--border);border-bottom:1px solid var(--border);padding:14px 0;}
  .profile-stat{flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;position:relative;}
  .profile-stat+.profile-stat::before{content:'';position:absolute;left:0;top:25%;bottom:25%;width:1px;background:var(--border);}
  .profile-stat-n{font-family:var(--ff-serif);font-size:24px;font-weight:600;}
  .profile-stat-l{font-size:9px;font-weight:500;letter-spacing:0.15em;text-transform:uppercase;color:var(--muted);}
  .profile-action-row{display:flex;gap:10px;margin-bottom:20px;}
  .btn-gold{flex:1;background:linear-gradient(135deg,var(--gold),#B8943A);border:none;border-radius:12px;padding:12px;cursor:pointer;color:var(--ink);font-family:var(--ff-sans);font-size:12px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;transition:all 0.25s;box-shadow:0 4px 16px rgba(201,168,76,0.3);}
  .btn-ghost{flex:1;background:rgba(255,255,255,0.05);border:1px solid var(--border);border-radius:12px;padding:12px;cursor:pointer;color:var(--white);font-family:var(--ff-sans);font-size:12px;font-weight:500;transition:all 0.2s;}
  .btn-danger{background:rgba(248,113,113,0.1);border:1px solid rgba(248,113,113,0.3);border-radius:12px;padding:12px 14px;cursor:pointer;color:var(--danger);font-family:var(--ff-sans);font-size:12px;transition:all 0.2s;display:flex;align-items:center;justify-content:center;}
  .service-chips{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:20px;}
  .service-chip{background:rgba(21,14,32,0.8);border:1px solid rgba(109,40,217,0.25);color:var(--vio-lite);padding:5px 12px;border-radius:100px;font-size:11px;font-weight:400;display:inline-flex;align-items:center;gap:6px;}
  .service-chip-remove{background:none;border:none;color:var(--muted);cursor:pointer;font-size:12px;line-height:1;padding:0;}
  .portfolio-grid{display:grid;grid-template-columns:repeat(3,1fr);grid-auto-rows:110px;gap:3px;}
  .portfolio-grid .p-item:first-child{grid-column:1/3;grid-row:1/3;}
  .p-item{border-radius:6px;overflow:hidden;position:relative;cursor:pointer;background-size:cover;background-position:center;}
  .p-item-inner{width:100%;height:100%;display:flex;align-items:center;justify-content:center;}
  .p-overlay{position:absolute;inset:0;background:linear-gradient(to top,rgba(6,4,9,0.7) 0%,transparent 60%);display:flex;align-items:flex-end;padding:8px;opacity:0;transition:opacity 0.25s;}
  .p-item:hover .p-overlay{opacity:1;}
  .section-head{font-family:var(--ff-serif);font-size:20px;font-style:italic;font-weight:300;color:var(--white);margin-bottom:14px;display:flex;align-items:center;gap:12px;}
  .section-head::after{content:'';flex:1;height:1px;background:linear-gradient(90deg,var(--border),transparent);}
  .profile-tabs{display:flex;border-bottom:1px solid var(--border);margin:0 20px 16px;overflow-x:auto;scrollbar-width:none;}
  .profile-tabs::-webkit-scrollbar{display:none;}
  .profile-tab{flex-shrink:0;background:none;border:none;cursor:pointer;font-family:var(--ff-sans);font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;padding:10px 14px;white-space:nowrap;transition:all 0.2s;}
  .analytics-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:20px;}
  .analytics-card{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:16px;position:relative;overflow:hidden;}
  .analytics-card::before{content:'';position:absolute;inset:0;background:linear-gradient(135deg,rgba(109,40,217,0.06),transparent);pointer-events:none;}
  .analytics-card-n{font-family:var(--ff-serif);font-size:30px;font-weight:600;margin-bottom:2px;}
  .analytics-card-l{font-size:10px;font-weight:500;letter-spacing:0.15em;text-transform:uppercase;color:var(--muted);}
  .analytics-card-icon{position:absolute;top:12px;right:12px;opacity:0.25;font-size:22px;}
  .video-perf-row{display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border);}
  .video-perf-thumb{width:44px;height:44px;border-radius:8px;flex-shrink:0;background:var(--surface);overflow:hidden;}
  .video-perf-thumb img{width:100%;height:100%;object-fit:cover;}
  .video-perf-info{flex:1;min-width:0;}
  .video-perf-title{font-size:12px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:3px;}
  .video-perf-stats{display:flex;gap:10px;}
  .video-perf-stat{font-size:10px;color:var(--muted);}
  .order-card{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:16px;margin-bottom:10px;position:relative;overflow:hidden;}
  .order-card::after{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;border-radius:3px 0 0 3px;}
  .order-card.status-in_progress::after{background:linear-gradient(to bottom,var(--gold),#B8943A);}
  .order-card.status-completed::after,.order-card.status-paid::after{background:linear-gradient(to bottom,var(--green),#059669);}
  .order-card.status-pending::after{background:linear-gradient(to bottom,var(--vio-mid),var(--violet));}
  .order-status-badge{display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:100px;font-size:9px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;}
  .order-status-badge.in_progress{background:rgba(201,168,76,0.12);color:var(--gold-lt);border:1px solid rgba(201,168,76,0.25);}
  .order-status-badge.completed,.order-status-badge.paid{background:rgba(52,211,153,0.12);color:var(--green);border:1px solid rgba(52,211,153,0.25);}
  .order-status-badge.pending{background:rgba(139,92,246,0.12);color:var(--vio-lite);border:1px solid rgba(139,92,246,0.25);}
  .order-creator-row{display:flex;align-items:center;gap:8px;margin-top:10px;padding-top:10px;border-top:1px solid var(--border);}
  .order-creator-av{width:28px;height:28px;border-radius:8px;flex-shrink:0;overflow:hidden;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;}
  .order-creator-av img{width:100%;height:100%;object-fit:cover;}
  .order-complete-btn{margin-left:auto;background:rgba(52,211,153,0.12);border:1px solid rgba(52,211,153,0.25);color:var(--green);font-family:var(--ff-sans);font-size:10px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;padding:5px 12px;border-radius:100px;cursor:pointer;}
  .market-scroll{height:100%;overflow-y:auto;scrollbar-width:none;padding-bottom:100px;}
  .market-scroll::-webkit-scrollbar{display:none;}
  .market-masthead{padding:28px 20px 0;}
  .market-eyebrow{font-family:var(--ff-sans);font-size:9px;font-weight:600;letter-spacing:0.25em;text-transform:uppercase;color:var(--gold);margin-bottom:4px;}
  .market-title{font-family:var(--ff-serif);font-size:38px;font-weight:300;font-style:italic;line-height:1.05;color:var(--white);margin-bottom:20px;}
  .market-title b{font-weight:700;font-style:normal;color:var(--gold);}
  .market-search{display:flex;align-items:center;gap:10px;border-bottom:1px solid rgba(255,255,255,0.15);padding-bottom:12px;margin-bottom:20px;}
  .market-search input{flex:1;background:transparent;border:none;outline:none;color:var(--white);font-family:var(--ff-sans);font-size:14px;font-weight:300;}
  .market-search input::placeholder{color:var(--muted);}
  .market-filters{display:flex;gap:8px;overflow-x:auto;scrollbar-width:none;margin-bottom:24px;padding:0 20px 4px;}
  .market-filters::-webkit-scrollbar{display:none;}
  .mf-chip{white-space:nowrap;border:1px solid var(--border);color:var(--muted);padding:6px 16px;border-radius:100px;font-family:var(--ff-sans);font-size:11px;font-weight:500;letter-spacing:0.06em;cursor:pointer;transition:all 0.2s;background:transparent;}
  .mf-chip.on{border-color:var(--gold);color:var(--gold);background:rgba(201,168,76,0.08);}
  .post-request-card{margin:0 20px 24px;background:linear-gradient(135deg,rgba(109,40,217,0.15) 0%,rgba(201,168,76,0.08) 100%);border:1px solid rgba(109,40,217,0.25);border-radius:18px;padding:20px;position:relative;overflow:hidden;cursor:pointer;}
  .post-request-card::before{content:'ATELIER';position:absolute;right:-10px;top:8px;font-family:var(--ff-impact);font-size:64px;color:rgba(109,40,217,0.08);pointer-events:none;}
  .prc-title{font-family:var(--ff-serif);font-size:18px;font-style:italic;font-weight:400;color:var(--white);margin-bottom:4px;}
  .prc-sub{font-size:11px;font-weight:300;color:var(--muted);margin-bottom:16px;}
  .prc-input-row{display:flex;gap:10px;}
  .prc-input{flex:1;background:rgba(6,4,9,0.5);border:1px solid var(--border);border-radius:10px;padding:11px 14px;color:var(--white);font-family:var(--ff-sans);font-size:13px;font-weight:300;outline:none;}
  .prc-input::placeholder{color:var(--muted);}
  .prc-btn{background:linear-gradient(135deg,var(--violet),#5B21B6);border:none;border-radius:10px;padding:11px 20px;color:var(--white);font-family:var(--ff-sans);font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap;}
  .requests-grid{padding:0 20px;display:flex;flex-direction:column;gap:12px;}
  .req-card{background:var(--surface);border:1px solid var(--border);border-radius:18px;padding:20px;cursor:pointer;transition:all 0.25s;position:relative;overflow:hidden;}
  .req-card:hover{border-color:rgba(109,40,217,0.3);transform:translateY(-1px);}
  .req-card::after{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;background:linear-gradient(to bottom,var(--violet),var(--gold));border-radius:3px 0 0 3px;}
  .req-cat{display:inline-block;background:rgba(109,40,217,0.15);border:1px solid rgba(109,40,217,0.25);color:var(--vio-lite);padding:2px 8px;border-radius:6px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:5px;}
  .req-title{font-family:var(--ff-serif);font-size:16px;font-weight:600;line-height:1.3;color:var(--white);}
  .req-budget{background:rgba(201,168,76,0.12);border:1px solid rgba(201,168,76,0.25);color:var(--gold-lt);padding:6px 12px;border-radius:10px;font-size:13px;font-weight:700;white-space:nowrap;flex-shrink:0;}
  .req-top{display:flex;align-items:flex-start;gap:12px;margin-bottom:10px;}
  .req-desc{font-size:12px;font-weight:300;line-height:1.6;color:var(--muted);margin-bottom:14px;}
  .req-bottom{display:flex;align-items:center;justify-content:space-between;padding-top:12px;border-top:1px solid var(--border);}
  .req-meta-left{display:flex;align-items:center;gap:12px;}
  .req-meta-item{font-size:11px;color:var(--muted);}
  .req-urgent{font-size:9px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#FCA5A5;background:rgba(248,113,113,0.12);padding:2px 8px;border-radius:6px;}
  .req-offer-btn{background:transparent;border:1px solid var(--gold);color:var(--gold);font-family:var(--ff-sans);font-size:10px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;padding:6px 14px;border-radius:100px;cursor:pointer;transition:all 0.2s;}
  .req-offer-btn:hover{background:var(--gold);color:var(--ink);}
  .offer-card{background:rgba(21,14,32,0.6);border:1px solid var(--border);border-radius:14px;padding:14px;margin-bottom:10px;}
  .offer-creator-row{display:flex;align-items:center;gap:10px;margin-bottom:10px;}
  .offer-av{width:36px;height:36px;border-radius:10px;flex-shrink:0;overflow:hidden;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;}
  .offer-av img{width:100%;height:100%;object-fit:cover;}
  .offer-creator-name{font-size:13px;font-weight:600;}
  .offer-creator-role{font-size:10px;color:var(--muted);}
  .offer-price-badge{margin-left:auto;background:rgba(201,168,76,0.12);border:1px solid rgba(201,168,76,0.25);color:var(--gold-lt);padding:5px 10px;border-radius:8px;font-size:13px;font-weight:700;white-space:nowrap;}
  .offer-msg{font-size:12px;font-weight:300;line-height:1.6;color:rgba(248,245,255,0.75);margin-bottom:10px;}
  .offer-meta-row{display:flex;align-items:center;gap:12px;margin-bottom:10px;}
  .offer-meta{font-size:11px;color:var(--muted);}
  .offer-actions{display:flex;gap:8px;}
  .offer-accept{flex:1;background:linear-gradient(135deg,var(--green),#059669);border:none;border-radius:10px;padding:9px;color:#fff;font-family:var(--ff-sans);font-size:12px;font-weight:600;cursor:pointer;}
  .offer-reject{flex:1;background:rgba(248,113,113,0.1);border:1px solid rgba(248,113,113,0.25);border-radius:10px;padding:9px;color:var(--danger);font-family:var(--ff-sans);font-size:12px;cursor:pointer;}
  .offer-status-badge{padding:4px 10px;border-radius:100px;font-size:10px;font-weight:600;letter-spacing:0.08em;}
  .offer-status-accepted{background:rgba(52,211,153,0.12);color:var(--green);border:1px solid rgba(52,211,153,0.25);}
  .offer-status-rejected{background:rgba(248,113,113,0.1);color:var(--danger);border:1px solid rgba(248,113,113,0.2);}
  .offer-status-pending{background:rgba(139,92,246,0.1);color:var(--vio-lite);border:1px solid rgba(139,92,246,0.2);}
  .chat-outer{display:flex;flex-direction:column;height:100%;position:relative;}
  .chat-head{padding:28px 20px 16px;border-bottom:1px solid var(--border);flex-shrink:0;}
  .chat-head-title{font-family:var(--ff-serif);font-size:28px;font-style:italic;font-weight:300;color:var(--white);margin-bottom:14px;}
  .chat-search-bar{display:flex;align-items:center;gap:10px;background:rgba(21,14,32,0.8);border:1px solid var(--border);border-radius:12px;padding:10px 14px;}
  .chat-search-bar input{flex:1;background:transparent;border:none;outline:none;color:var(--white);font-family:var(--ff-sans);font-size:13px;font-weight:300;}
  .chat-list-area{flex:1;overflow-y:auto;scrollbar-width:none;}
  .chat-list-area::-webkit-scrollbar{display:none;}
  .chat-row{display:flex;align-items:center;gap:12px;padding:14px 20px;cursor:pointer;border-bottom:1px solid rgba(255,255,255,0.04);transition:background 0.15s;}
  .chat-row:hover{background:rgba(109,40,217,0.06);}
  .chat-av{width:48px;height:48px;border-radius:16px;overflow:hidden;flex-shrink:0;position:relative;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;}
  .chat-av img{width:100%;height:100%;object-fit:cover;}
  .chat-row-content{flex:1;min-width:0;}
  .chat-row-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:3px;}
  .chat-row-name{font-size:14px;font-weight:600;}
  .chat-row-time{font-size:10px;color:var(--muted);}
  .chat-row-preview{font-size:12px;font-weight:300;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .chat-window{position:absolute;inset:0;z-index:50;background:var(--deep);display:flex;flex-direction:column;transform:translateX(100%);transition:transform 0.3s cubic-bezier(0.4,0,0.2,1);}
  .chat-window.open{transform:translateX(0);}
  .chat-win-head{display:flex;align-items:center;gap:12px;padding:16px;border-bottom:1px solid var(--border);background:rgba(6,4,9,0.6);backdrop-filter:blur(10px);flex-shrink:0;}
  .chat-back-btn{width:34px;height:34px;background:rgba(255,255,255,0.06);border:none;border-radius:10px;cursor:pointer;color:var(--white);display:flex;align-items:center;justify-content:center;}
  .chat-win-av{width:38px;height:38px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;overflow:hidden;}
  .chat-win-av img{width:100%;height:100%;object-fit:cover;}
  .chat-win-info{flex:1;}
  .chat-win-person{display:flex;align-items:center;gap:12px;flex:1;min-width:0;background:none;border:none;color:inherit;text-align:left;cursor:pointer;padding:0;}
  .chat-win-name{font-size:15px;font-weight:600;}
  .chat-win-status{font-size:11px;color:var(--green);}
  .call-row{display:flex;gap:8px;}
  .call-ico{width:34px;height:34px;background:rgba(255,255,255,0.06);border:1px solid var(--border);border-radius:10px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--vio-lite);}
  .msgs-area{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px;scrollbar-width:none;}
  .msgs-area::-webkit-scrollbar{display:none;}
  .msg-wrap{display:flex;gap:8px;max-width:78%;}
  .msg-wrap.out{align-self:flex-end;flex-direction:row-reverse;}
  .msg-wrap.inc{align-self:flex-start;}
  .msg-bubble{padding:10px 14px;border-radius:16px;font-size:13px;font-weight:300;line-height:1.55;}
  .msg-wrap.inc .msg-bubble{background:var(--surface);border:1px solid var(--border);border-bottom-left-radius:4px;}
  .msg-wrap.out .msg-bubble{background:var(--accent-grad);border-bottom-right-radius:4px;}
  .msg-time{font-size:10px;color:var(--muted);margin-top:4px;text-align:right;}
  .chat-inp-bar{display:flex;align-items:center;gap:10px;padding:12px 16px 20px;border-top:1px solid var(--border);background:rgba(6,4,9,0.6);backdrop-filter:blur(10px);flex-shrink:0;}
  .chat-inp{flex:1;background:rgba(21,14,32,0.8);border:1px solid var(--border);border-radius:100px;padding:11px 18px;color:var(--white);font-family:var(--ff-sans);font-size:13px;font-weight:300;outline:none;}
  .chat-inp::placeholder{color:var(--muted);}
  .chat-inp:focus{border-color:rgba(109,40,217,0.4);}
  .chat-send{width:40px;height:40px;background:var(--accent-grad);border:none;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;color:var(--white);}
  .emoji-wrap{position:relative;display:inline-flex;flex-shrink:0;}
  .emoji-toggle{width:38px;height:38px;border-radius:14px;border:1px solid var(--border);background:rgba(255,255,255,0.06);color:var(--white);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:17px;}
  .emoji-pop{position:absolute;bottom:46px;left:0;display:grid;grid-template-columns:repeat(5,32px);gap:6px;padding:8px;border:1px solid var(--border);border-radius:16px;background:rgba(21,14,32,0.96);backdrop-filter:blur(16px);box-shadow:0 16px 40px rgba(0,0,0,0.45);z-index:400;}
  .emoji-pop button{width:32px;height:32px;border-radius:10px;border:1px solid var(--border);background:rgba(255,255,255,0.05);cursor:pointer;}
  .mention-wrap{position:relative;display:flex;gap:8px;align-items:flex-start;margin-bottom:12px;}
  .mention-wrap textarea{margin-bottom:0;}
  .mention-tools{display:flex;flex-direction:column;gap:8px;}
  .mini-tool-btn{width:38px;height:38px;border-radius:13px;border:1px solid var(--border);background:rgba(255,255,255,0.06);color:var(--white);cursor:pointer;font-weight:700;}
  .mention-pop{position:absolute;right:0;top:44px;width:min(260px,calc(100vw - 56px));max-height:220px;overflow:auto;border:1px solid var(--border);border-radius:16px;background:rgba(21,14,32,0.97);backdrop-filter:blur(16px);z-index:420;padding:10px;box-shadow:0 16px 40px rgba(0,0,0,0.45);}
  .mention-search{width:100%;background:rgba(6,4,9,0.5);border:1px solid var(--border);border-radius:10px;padding:9px 11px;color:var(--white);outline:none;margin-bottom:8px;}
  .mention-row{display:flex;align-items:center;gap:9px;width:100%;border:none;background:transparent;color:var(--white);padding:8px;border-radius:10px;cursor:pointer;text-align:left;}
  .mention-row:hover{background:rgba(109,40,217,0.1);}
  .mention-av{width:30px;height:30px;border-radius:10px;display:flex;align-items:center;justify-content:center;overflow:hidden;font-size:11px;font-weight:700;flex-shrink:0;}
  .mention-av img{width:100%;height:100%;object-fit:cover;}
  .live-outer{position:relative;height:100%;overflow:hidden;}
  .live-bg{position:absolute;inset:0;background-size:cover;background-position:center;filter:brightness(0.5);}
  .live-cinema{position:absolute;inset:0;background:linear-gradient(to top,rgba(6,4,9,0.98) 0%,rgba(6,4,9,0.4) 40%,rgba(6,4,9,0.55) 100%);}
  .live-top{position:absolute;top:0;left:0;right:0;padding:18px;display:flex;align-items:flex-start;justify-content:space-between;z-index:10;}
  .live-pill{display:flex;align-items:center;gap:7px;background:#DC2626;padding:5px 14px;border-radius:100px;font-family:var(--ff-sans);font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;animation:live-pulse 2s ease-in-out infinite;}
  .live-dot{width:7px;height:7px;background:var(--white);border-radius:50%;}
  @keyframes live-pulse{0%,100%{box-shadow:0 0 12px rgba(220,38,38,0.4);}50%{box-shadow:0 0 24px rgba(220,38,38,0.8);}}
  .live-viewer-badge{display:flex;align-items:center;gap:7px;background:rgba(6,4,9,0.7);backdrop-filter:blur(10px);border:1px solid var(--border);border-radius:100px;padding:5px 14px;font-size:13px;font-weight:600;}
  .live-creator-row{position:absolute;top:68px;left:18px;display:flex;align-items:center;gap:10px;z-index:10;}
  .live-cr-av{width:40px;height:40px;border-radius:50%;border:2px solid #DC2626;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;overflow:hidden;}
  .live-cr-name{font-size:14px;font-weight:600;}
  .live-cr-sub{font-size:11px;color:var(--muted);}
  .live-follow-btn{background:#DC2626;border:none;border-radius:100px;padding:5px 16px;cursor:pointer;color:var(--white);font-family:var(--ff-sans);font-size:11px;font-weight:700;}
  .live-center{position:absolute;top:50%;left:18px;right:70px;transform:translateY(-50%);z-index:10;}
  .live-center-eyebrow{font-size:9px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:var(--gold);margin-bottom:6px;}
  .live-center-name{font-family:var(--ff-serif);font-size:34px;font-style:italic;font-weight:300;line-height:1.1;color:var(--white);text-shadow:0 2px 20px rgba(0,0,0,0.8);}
  .live-center-sub{font-size:12px;font-weight:300;color:var(--muted);margin-top:6px;}
  .live-ticker{position:absolute;left:0;right:0;bottom:110px;overflow:hidden;z-index:10;padding:8px 0;background:rgba(6,4,9,0.35);backdrop-filter:blur(4px);}
  .live-ticker-inner{display:flex;gap:32px;white-space:nowrap;animation:ticker-scroll 18s linear infinite;padding:0 20px;}
  @keyframes ticker-scroll{from{transform:translateX(0);}to{transform:translateX(-50%);}}
  .live-ticker-msg{display:flex;align-items:center;gap:8px;flex-shrink:0;}
  .ticker-user{font-size:11px;font-weight:600;color:var(--vio-lite);}
  .ticker-text{font-size:11px;font-weight:300;color:rgba(248,245,255,0.8);}
  .live-actions{position:absolute;right:16px;bottom:175px;display:flex;flex-direction:column;gap:12px;align-items:center;z-index:10;}
  .live-act{width:44px;height:44px;background:rgba(21,14,32,0.7);backdrop-filter:blur(10px);border:1px solid var(--border);border-radius:14px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--white);}
  .live-bottom{position:absolute;bottom:0;left:0;right:0;padding:12px 16px 24px;display:flex;gap:10px;align-items:center;background:linear-gradient(to top,rgba(6,4,9,0.95),transparent);z-index:10;}
  .live-inp{flex:1;background:rgba(21,14,32,0.7);backdrop-filter:blur(10px);border:1px solid var(--border);border-radius:100px;padding:10px 18px;color:var(--white);font-family:var(--ff-sans);font-size:13px;outline:none;}
  .live-inp::placeholder{color:var(--muted);}
  .live-gift-btn{width:40px;height:40px;background:linear-gradient(135deg,var(--gold),#B8943A);border:none;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:18px;flex-shrink:0;}
  .live-send{width:40px;height:40px;background:var(--accent-grad);border:none;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;color:var(--white);}
  .live-golive-card{position:absolute;bottom:110px;left:18px;right:70px;z-index:10;background:rgba(21,14,32,0.85);backdrop-filter:blur(12px);border:1px solid rgba(109,40,217,0.3);border-radius:18px;padding:16px;}
  .live-golive-title{font-family:var(--ff-serif);font-size:18px;font-style:italic;color:var(--white);margin-bottom:4px;}
  .live-golive-sub{font-size:11px;color:var(--muted);margin-bottom:12px;}
  .live-golive-btn{width:100%;background:linear-gradient(135deg,#DC2626,#B91C1C);border:none;border-radius:12px;padding:12px;color:#fff;font-family:var(--ff-sans);font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;}
  .notif-scroll{height:100%;overflow-y:auto;scrollbar-width:none;padding-bottom:100px;}
  .notif-scroll::-webkit-scrollbar{display:none;}
  .notif-head{padding:28px 20px 16px;border-bottom:1px solid var(--border);}
  .notif-head-title{font-family:var(--ff-serif);font-size:28px;font-style:italic;font-weight:300;color:var(--white);}
  .notif-row{display:flex;align-items:flex-start;gap:12px;padding:14px 20px;border-bottom:1px solid rgba(255,255,255,0.04);cursor:pointer;transition:background 0.15s;}
  .notif-row:hover{background:rgba(109,40,217,0.05);}
  .notif-row.unread{background:rgba(109,40,217,0.06);}
  .notif-av{width:42px;height:42px;border-radius:13px;flex-shrink:0;overflow:hidden;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;position:relative;}
  .notif-av img{width:100%;height:100%;object-fit:cover;}
  .notif-type-icon{position:absolute;bottom:-2px;right:-2px;width:16px;height:16px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:8px;border:1.5px solid var(--deep);}
  .notif-type-like{background:#8B5CF6;}.notif-type-follow{background:var(--gold);}.notif-type-comment{background:#3B82F6;}.notif-type-offer{background:var(--green);}
  .notif-body{flex:1;min-width:0;}
  .notif-text{font-size:13px;font-weight:300;line-height:1.5;color:rgba(248,245,255,0.85);}
  .notif-text strong{font-weight:600;color:var(--white);}
  .notif-meta{font-size:11px;color:var(--muted);margin-top:3px;}
  .notif-price{font-size:12px;font-weight:700;color:var(--gold-lt);margin-top:2px;}
  .search-outer{height:100%;display:flex;flex-direction:column;}
  .search-head{padding:20px 20px 0;flex-shrink:0;}
  .search-head-title{font-family:var(--ff-serif);font-size:28px;font-style:italic;font-weight:300;color:var(--white);margin-bottom:14px;}
  .search-inp-wrap{display:flex;align-items:center;gap:10px;background:rgba(21,14,32,0.8);border:1px solid rgba(109,40,217,0.3);border-radius:14px;padding:12px 16px;margin-bottom:14px;}
  .search-inp-wrap input{flex:1;background:transparent;border:none;outline:none;color:var(--white);font-family:var(--ff-sans);font-size:15px;font-weight:300;caret-color:var(--vio-mid);}
  .search-inp-wrap input::placeholder{color:var(--muted);}
  .search-type-tabs{display:flex;gap:8px;margin-bottom:16px;overflow-x:auto;scrollbar-width:none;}
  .search-type-tabs::-webkit-scrollbar{display:none;}
  .search-type-tab{background:transparent;border:1px solid var(--border);border-radius:100px;padding:6px 16px;font-family:var(--ff-sans);font-size:11px;font-weight:500;letter-spacing:0.06em;color:var(--muted);cursor:pointer;white-space:nowrap;transition:all 0.2s;}
  .search-type-tab.on{border-color:var(--gold);color:var(--gold);background:rgba(201,168,76,0.08);}
  .search-results{flex:1;overflow-y:auto;scrollbar-width:none;padding:0 20px 100px;}
  .search-results::-webkit-scrollbar{display:none;}
  .search-creator-card{display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid rgba(255,255,255,0.05);cursor:pointer;}
  .search-creator-av{width:46px;height:46px;border-radius:14px;flex-shrink:0;overflow:hidden;display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:700;}
  .search-creator-av img{width:100%;height:100%;object-fit:cover;}
  .search-creator-info{flex:1;min-width:0;}
  .search-creator-name{font-size:14px;font-weight:600;margin-bottom:2px;}
  .search-creator-sub{font-size:11px;color:var(--muted);}
  .search-section-label{font-family:var(--ff-sans);font-size:10px;font-weight:600;letter-spacing:0.15em;text-transform:uppercase;color:var(--muted);margin:16px 0 8px;}
  .search-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px 20px;gap:12px;text-align:center;}
  .search-empty-icon{font-size:40px;opacity:0.3;}
  .search-empty-text{font-family:var(--ff-serif);font-size:20px;font-style:italic;color:var(--white);opacity:0.4;}
  .search-empty-sub{font-size:12px;color:var(--muted);max-width:220px;line-height:1.6;}
  .modal-overlay{position:fixed;inset:0;background:rgba(6,4,9,0.88);backdrop-filter:blur(14px);z-index:500;display:flex;align-items:flex-end;justify-content:center;}
  .modal-sheet{background:var(--surface);border:1px solid var(--border);border-radius:24px 24px 0 0;padding:0;width:100%;max-width:430px;animation:sheet-up 0.3s cubic-bezier(0.34,1.56,0.64,1);display:flex;flex-direction:column;max-height:92vh;}
  .sheet-handle{width:36px;height:4px;background:rgba(255,255,255,0.15);border-radius:2px;margin:12px auto 0;}
  .sheet-scroll{overflow-y:auto;scrollbar-width:none;flex:1;}
  .sheet-scroll::-webkit-scrollbar{display:none;}
  .sheet-inner{padding:20px 24px 40px;}
  @keyframes sheet-up{from{transform:translateY(100%);}to{transform:translateY(0);}}
  .sheet-title{font-family:var(--ff-serif);font-size:24px;font-style:italic;font-weight:300;color:var(--white);margin-bottom:6px;}
  .sheet-sub{font-size:12px;font-weight:300;color:var(--muted);margin-bottom:24px;}
  .modal-input{width:100%;background:rgba(6,4,9,0.5);border:1px solid var(--border);border-radius:12px;padding:12px 16px;color:var(--white);font-family:var(--ff-sans);font-size:13px;font-weight:300;outline:none;margin-bottom:12px;resize:none;}
  .modal-input::placeholder{color:var(--muted);}
  .modal-input:focus{border-color:rgba(109,40,217,0.5);}
  .modal-label{font-family:var(--ff-sans);font-size:10px;font-weight:600;letter-spacing:0.15em;text-transform:uppercase;color:var(--muted);margin-bottom:8px;display:block;}
  .modal-row{display:flex;gap:10px;margin-bottom:12px;}
  .modal-submit{width:100%;background:var(--accent-grad);border:none;border-radius:14px;padding:14px;color:var(--white);font-family:var(--ff-sans);font-size:14px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;cursor:pointer;box-shadow:0 4px 20px rgba(109,40,217,0.35);}
  .modal-submit:disabled{opacity:0.5;cursor:not-allowed;}
  .modal-cancel{width:100%;background:transparent;border:1px solid var(--border);border-radius:14px;padding:12px;color:var(--muted);font-family:var(--ff-sans);font-size:13px;cursor:pointer;margin-top:8px;}
  .upload-drop-zone{border:2px dashed rgba(109,40,217,0.35);border-radius:16px;padding:32px 20px;text-align:center;cursor:pointer;transition:all 0.25s;margin-bottom:16px;position:relative;overflow:hidden;}
  .upload-drop-zone:hover,.upload-drop-zone.drag{border-color:var(--violet);background:rgba(109,40,217,0.06);}
  .upload-drop-zone.has-file{border-color:var(--gold);border-style:solid;background:rgba(201,168,76,0.05);}
  .upload-preview{width:100%;max-height:160px;border-radius:10px;object-fit:cover;margin-bottom:8px;}
  .upload-icon{font-size:36px;margin-bottom:10px;display:block;}
  .upload-label{font-family:var(--ff-serif);font-size:18px;font-style:italic;color:var(--white);margin-bottom:4px;}
  .upload-sublabel{font-size:11px;color:var(--muted);}
  .progress-bar-wrap{height:4px;background:rgba(255,255,255,0.08);border-radius:2px;overflow:hidden;margin-bottom:16px;}
  .progress-bar-fill{height:100%;background:linear-gradient(90deg,var(--violet),var(--gold));border-radius:2px;transition:width 0.2s;}
  .upload-success-badge{display:flex;align-items:center;gap:8px;background:rgba(52,211,153,0.1);border:1px solid rgba(52,211,153,0.25);border-radius:10px;padding:10px 14px;margin-bottom:16px;font-size:13px;color:var(--green);}
  .role-grid{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:20px;}
  .role-btn{background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:10px;padding:8px 14px;display:flex;align-items:center;gap:6px;cursor:pointer;transition:all 0.2s;}
  .role-btn.sel{border-color:var(--violet);background:rgba(109,40,217,0.15);}
  .role-btn span{font-family:var(--ff-sans);font-size:12px;font-weight:500;color:var(--muted);}
  .role-btn.sel span{color:var(--vio-lite);}
  .svc-add-row{display:flex;gap:8px;margin-bottom:12px;}
  .svc-add-inp{flex:1;background:rgba(6,4,9,0.5);border:1px solid var(--border);border-radius:10px;padding:10px 14px;color:var(--white);font-family:var(--ff-sans);font-size:13px;outline:none;}
  .svc-add-inp::placeholder{color:var(--muted);}
  .svc-add-btn{background:rgba(109,40,217,0.2);border:1px solid rgba(109,40,217,0.3);border-radius:10px;padding:10px 16px;color:var(--vio-lite);font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap;}
  .comment-row{display:flex;gap:10px;margin-bottom:16px;}
  .comment-av{width:32px;height:32px;border-radius:10px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;overflow:hidden;}
  .comment-av img{width:100%;height:100%;object-fit:cover;}
  .comment-body{flex:1;}
  .comment-name{font-size:12px;font-weight:600;margin-bottom:3px;}
  .comment-text{font-size:13px;font-weight:300;line-height:1.55;color:rgba(248,245,255,0.85);}
  .comment-time{font-size:10px;color:var(--muted);margin-top:3px;}
  .comment-inp-bar{display:flex;align-items:center;gap:10px;padding:12px 16px 28px;border-top:1px solid var(--border);background:rgba(6,4,9,0.8);flex-shrink:0;}
  .comment-inp{flex:1;background:rgba(21,14,32,0.8);border:1px solid var(--border);border-radius:100px;padding:11px 18px;color:var(--white);font-family:var(--ff-sans);font-size:13px;font-weight:300;outline:none;}
  .comment-inp::placeholder{color:var(--muted);}
  .comment-send{width:38px;height:38px;background:linear-gradient(135deg,var(--violet),#5B21B6);border:none;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;}
  .empty-state{display:flex;flex-direction:column;align-items:center;justify-content:center;height:200px;gap:12px;padding:40px 20px;text-align:center;}
  .empty-icon{font-size:40px;opacity:0.4;}
  .empty-title{font-family:var(--ff-serif);font-size:20px;font-style:italic;color:var(--white);opacity:0.5;}
  .empty-sub{font-size:12px;color:var(--muted);line-height:1.6;max-width:220px;}
  .spin-wrap{display:flex;align-items:center;justify-content:center;height:120px;}
  .spin{width:28px;height:28px;border:2px solid rgba(109,40,217,0.2);border-top-color:var(--violet);border-radius:50%;animation:vio-spin 0.7s linear infinite;}
  @keyframes vio-spin{to{transform:rotate(360deg);}}
  .divider{height:1px;background:var(--border);margin:16px 0;}
  .err-box{background:rgba(248,113,113,0.1);border:1px solid rgba(248,113,113,0.25);border-radius:10px;padding:10px 14px;margin-bottom:12px;font-size:12px;color:var(--danger);}
  .cp-hero{position:relative;height:180px;overflow:hidden;flex-shrink:0;}
  .cp-hero-bg{position:absolute;inset:0;background-size:cover;background-position:center;}
  .cp-hero-grad{position:absolute;inset:0;background:linear-gradient(to top,var(--surface) 0%,transparent 60%);}
  .cp-av-wrap{position:absolute;bottom:-28px;left:20px;width:64px;height:64px;border-radius:50%;border:2px solid var(--gold);overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:700;}
  .cp-av-wrap img{width:100%;height:100%;object-fit:cover;}
  .cp-meta{padding:36px 20px 16px;}
  .cp-name{font-family:var(--ff-serif);font-size:26px;font-style:italic;font-weight:300;color:var(--white);margin-bottom:2px;}
  .cp-handle{font-size:12px;color:var(--muted);margin-bottom:8px;}
  .cp-role-chip{display:inline-flex;align-items:center;gap:4px;background:rgba(109,40,217,0.15);border:1px solid rgba(109,40,217,0.3);color:var(--vio-lite);padding:3px 10px;border-radius:100px;font-size:10px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:10px;}
  .cp-bio{font-size:13px;font-weight:300;line-height:1.65;color:rgba(248,245,255,0.65);margin-bottom:14px;}
  .cp-stats{display:flex;gap:0;border-top:1px solid var(--border);border-bottom:1px solid var(--border);padding:12px 0;margin-bottom:16px;}
  .cp-stat{flex:1;display:flex;flex-direction:column;align-items:center;gap:1px;position:relative;}
  .cp-stat+.cp-stat::before{content:'';position:absolute;left:0;top:20%;bottom:20%;width:1px;background:var(--border);}
  .cp-stat-n{font-family:var(--ff-serif);font-size:20px;font-weight:600;}
  .cp-stat-l{font-size:9px;letter-spacing:0.12em;text-transform:uppercase;color:var(--muted);}
  .cp-action-row{display:flex;gap:8px;margin-bottom:16px;}
  .cp-follow-btn{flex:1;background:linear-gradient(135deg,var(--violet),#5B21B6);border:none;border-radius:12px;padding:11px;color:var(--white);font-family:var(--ff-sans);font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;cursor:pointer;}
  .cp-follow-btn.following{background:rgba(255,255,255,0.07);border:1px solid var(--border);color:var(--muted);}
  .cp-msg-btn{flex:1;background:rgba(201,168,76,0.12);border:1px solid rgba(201,168,76,0.3);border-radius:12px;padding:11px;color:var(--gold-lt);font-family:var(--ff-sans);font-size:12px;font-weight:600;cursor:pointer;}
  .cp-mini-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:3px;}
  .cp-mini-item{aspect-ratio:1;border-radius:6px;overflow:hidden;background:var(--elevated);cursor:pointer;}
  .cp-mini-item img{width:100%;height:100%;object-fit:cover;}
  .pay-amount{font-family:var(--ff-serif);font-size:48px;font-weight:600;color:var(--gold-lt);text-align:center;margin:16px 0 4px;}
  .pay-amount-label{font-size:11px;color:var(--muted);text-align:center;letter-spacing:0.15em;text-transform:uppercase;margin-bottom:20px;}
  .pay-summary-card{background:rgba(21,14,32,0.6);border:1px solid var(--border);border-radius:14px;padding:14px;margin-bottom:16px;}
  .pay-row{display:flex;justify-content:space-between;align-items:center;padding:5px 0;}
  .pay-row-label{font-size:12px;color:var(--muted);}
  .pay-row-val{font-size:13px;font-weight:500;}
  .pay-btn{width:100%;background:linear-gradient(135deg,#059669,#047857);border:none;border-radius:14px;padding:15px;color:#fff;font-family:var(--ff-sans);font-size:14px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;cursor:pointer;box-shadow:0 4px 20px rgba(5,150,105,0.35);display:flex;align-items:center;justify-content:center;gap:10px;}
  .pay-btn:disabled{opacity:0.5;cursor:not-allowed;}
  .pay-secure{text-align:center;font-size:11px;color:var(--muted);margin-top:10px;}
  .pay-success{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:32px 20px;gap:12px;text-align:center;}
  .pay-success-icon{font-size:56px;}
  .pay-success-title{font-family:var(--ff-serif);font-size:28px;font-style:italic;color:var(--white);}
  .pay-success-sub{font-size:13px;color:var(--muted);line-height:1.6;}
  .img-preview-row{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;}
  .img-preview-thumb{width:64px;height:64px;border-radius:10px;overflow:hidden;position:relative;flex-shrink:0;border:1px solid var(--border);}
  .img-preview-thumb img{width:100%;height:100%;object-fit:cover;}
  .img-preview-remove{position:absolute;top:2px;right:2px;width:16px;height:16px;background:rgba(6,4,9,0.8);border:none;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--danger);font-size:9px;line-height:1;}
  .img-upload-add{width:64px;height:64px;border-radius:10px;border:1.5px dashed rgba(109,40,217,0.4);display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--vio-lite);font-size:22px;flex-shrink:0;transition:all 0.2s;}
  .img-upload-add:hover{border-color:var(--violet);background:rgba(109,40,217,0.08);}
`;

function injectCSS() {
  if (document.getElementById("vio-main-css")) return;
  const el = document.createElement("style");
  el.id = "vio-main-css"; el.textContent = CSS;
  document.head.appendChild(el);
}

// ── Utilities ─────────────────────────────────────────────────
const fmt = n => { if (!n) return "0"; if (n >= 1e6) return (n / 1e6).toFixed(1) + "M"; if (n >= 1e3) return (n / 1e3).toFixed(1) + "K"; return String(n); };
const timeAgo = d => { if (!d) return ""; const ts = d?.toDate ? d.toDate() : new Date(d); const s = Math.floor((Date.now() - ts) / 1000); if (s < 60) return "Just now"; if (s < 3600) return Math.floor(s / 60) + "m ago"; if (s < 86400) return Math.floor(s / 3600) + "h ago"; return Math.floor(s / 86400) + "d ago"; };
const initials = n => { if (!n) return "?"; return n.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase(); };
const PALETTES = [
  "linear-gradient(160deg,#1a0533 0%,#6D28D9 45%,#0d0018 100%)",
  "linear-gradient(160deg,#0a1a30 0%,#1D4ED8 45%,#040c1a 100%)",
  "linear-gradient(160deg,#1a0a00 0%,#C2410C 45%,#0d0500 100%)",
  "linear-gradient(160deg,#001a0a 0%,#065F46 45%,#000d05 100%)",
  "linear-gradient(160deg,#1a001a 0%,#9D174D 45%,#0d000d 100%)",
];
const ROLE_EMOJI = { tailor: "✂️", designer: "🎨", makeup_artist: "💄", shoemaker: "👟", customer: "🛍️" };
const CREATOR_ROLES = ["tailor", "designer", "makeup_artist", "shoemaker"];

// ── Icons ──────────────────────────────────────────────────────
const Ico = ({ d, s = 20, fill = "none", stroke = "currentColor", sw = 1.8 }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
);
const IcoHome     = () => <Ico d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10" />;
const IcoMarket   = () => <Ico d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z M3 6h18 M16 10a4 4 0 0 1-8 0" />;
const IcoChat     = () => <Ico d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />;
const IcoLive     = () => <Ico d="M23 7l-7 5 7 5V7z M1 5h15a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H1V5z" />;
const IcoSearch   = () => <Ico d="M21 21l-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0" />;
const IcoBell     = () => <Ico d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 0 1-3.46 0" />;
const IcoHeart    = ({ lit }) => <Ico d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" fill={lit ? "#8B5CF6" : "none"} stroke={lit ? "#8B5CF6" : "currentColor"} />;
const IcoComment  = () => <Ico d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />;
const IcoShare    = () => <Ico d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8 M16 6l-4-4-4 4 M12 2v13" />;
const IcoBookmark = () => <Ico d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />;
const IcoBack     = () => <Ico d="M19 12H5 M12 5l-7 7 7 7" />;
const IcoPhone    = () => <Ico s={16} d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.56 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />;
const IcoVid      = () => <Ico s={16} d="M23 7l-7 5 7 5V7z M1 5h15a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H1V5z" />;
const IcoSend     = () => <Ico s={17} d="M22 2L11 13 M22 2L15 22l-4-9-9-4 22-7z" />;
const IcoPlus     = () => <Ico s={20} sw={2.5} d="M12 5v14 M5 12h14" />;
const IcoEye      = () => <Ico s={16} d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 9a3 3 0 1 0 6 0 3 3 0 0 0-6 0" />;
const IcoLogout   = () => <Ico s={16} d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9" />;
const IcoCheck    = () => <Ico s={16} d="M20 6L9 17l-5-5" />;
const IcoX        = () => <Ico s={14} sw={2} d="M18 6L6 18 M6 6l12 12" />;
const IcoGear     = () => <Ico s={18} d="M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.65 1.65 0 0 0 15 19.4a1.65 1.65 0 0 0-1 .6V20a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-.6-1H4a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 .51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-.6V4a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 .51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.14.31.34.58.6 1H20a2 2 0 1 1 0 4h-.09c-.26.42-.46.69-.51 1z" />;
const IcoMusic    = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>);
const IcoX2       = () => <Ico s={16} sw={2} d="M18 6L6 18 M6 6l12 12" />;
const Spinner = () => <div className="spin-wrap"><div className="spin" /></div>;
const isDemoId = (id) => typeof id === "string" && id.startsWith("d");
const isDemoCreatorId = (id) => typeof id === "string" && id.startsWith("x");
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const MAX_UPLOAD_LABEL = "10MB";
const REACTIONS = [
  { id: "love", label: "Love", icon: "❤️", countField: "likes_count" },
  { id: "happy", label: "Happy", icon: "😊", countField: "happy_count" },
  { id: "wow", label: "Wow", icon: "🔥", countField: "wow_count" },
  { id: "sad", label: "Sad", icon: "😢", countField: "sad_count" },
  { id: "angry", label: "Angry", icon: "😡", countField: "angry_count" },
];
const reactionById = (id) => REACTIONS.find(r => r.id === id) || REACTIONS[0];
const QUICK_EMOJIS = ["❤️", "🔥", "👏", "😍", "😂", "😊", "😮", "🙏", "✨", "💯"];

function EmojiPicker({ onPick, align = "left" }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="emoji-wrap">
      <button type="button" className="emoji-toggle" onClick={() => setOpen(p => !p)} title="Emoji">☺</button>
      {open && (
        <div className="emoji-pop" style={align === "right" ? { left: "auto", right: 0 } : null}>
          {QUICK_EMOJIS.map(e => (
            <button key={e} type="button" onClick={() => { onPick(e); setOpen(false); }}>{e}</button>
          ))}
        </div>
      )}
    </div>
  );
}

function UserMentionPicker({ currentUid, onPick }) {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const [users, setUsers] = useState([]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(async () => {
      const needle = term.trim().toLowerCase();
      const snap = await getDocs(query(collection(db, "profiles"), limit(100)));
      setUsers(snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(p => p.id !== currentUid)
        .filter(p => !needle || (p.username || "").toLowerCase().includes(needle) || (p.full_name || "").toLowerCase().includes(needle))
        .slice(0, 8));
    }, term.trim() ? 180 : 40);
    return () => window.clearTimeout(t);
  }, [open, term, currentUid]);

  return (
    <div className="emoji-wrap">
      <button type="button" className="mini-tool-btn" onClick={() => setOpen(p => !p)} title="Tag user">@</button>
      {open && (
        <div className="mention-pop">
          <input className="mention-search" placeholder="Search users..." value={term} onChange={e => setTerm(e.target.value)} />
          {users.map((p, i) => (
            <button key={p.id} type="button" className="mention-row" onClick={() => { onPick(`@${p.username || p.full_name || p.id} `); setOpen(false); setTerm(""); }}>
              <span className="mention-av" style={{ background: PALETTES[i % PALETTES.length] }}>{p.avatar_url ? <img src={p.avatar_url} alt="" /> : initials(p.full_name || p.username)}</span>
              <span><strong>{p.full_name || p.username}</strong><br /><small>@{p.username || "user"}</small></span>
            </button>
          ))}
          {users.length === 0 && <div style={{ padding: 10, color: "var(--muted)", fontSize: 12 }}>No users found</div>}
        </div>
      )}
    </div>
  );
}

async function shareItem({ title = "VioFashion", text = "Check this out on VioFashion", url = window.location.href } = {}) {
  if (navigator.share) {
    await navigator.share({ title, text, url });
    return "Shared successfully.";
  }
  await navigator.clipboard?.writeText(url);
  return "Link copied to clipboard.";
}

async function createNotification({ userId, actorId, type, meta = null, videoId = null, requestId = null, conversationId = null }) {
  if (!userId || !actorId) return null;
  try {
    return await addDoc(collection(db, "notifications"), {
      user_id: userId,
      actor_id: actorId,
      type,
      meta,
      video_id: videoId,
      request_id: requestId,
      conversation_id: conversationId,
      read: false,
      created_at: serverTimestamp(),
    });
  } catch (error) {
    console.error("Failed to create notification", error);
    return null;
  }
}

async function notifyCreators({ actorId, type, meta, requestId }) {
  const snap = await getDocs(query(collection(db, "profiles"), limit(150)));
  const creatorRoles = new Set(CREATOR_ROLES);
  const recipients = snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(p => p.id !== actorId && creatorRoles.has(p.role))
    .slice(0, 40);
  await Promise.all(recipients.map(p => createNotification({ userId: p.id, actorId, type, meta, requestId })));
}

function storageErrorMessage(error) {
  const code = error?.code || "";
  if (code === "storage/unauthorized") return "Upload blocked by Firebase Storage rules. Publish the latest storage.rules and make sure you are signed in.";
  if (code === "storage/canceled") return "Upload cancelled.";
  if (code === "storage/quota-exceeded") return "Firebase Storage quota has been exceeded.";
  if (code === "storage/retry-limit-exceeded") return "Network upload timed out. Please try again on a stronger connection.";
  if (code === "storage/invalid-checksum") return "The upload was corrupted in transit. Please try again.";
  return error?.message || "Upload failed.";
}

function cleanFileExt(file) {
  const fromName = file?.name?.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (fromName) return fromName.slice(0, 12);
  if (file?.type?.includes("/")) return file.type.split("/").pop().replace(/[^a-z0-9]/g, "") || "bin";
  return "bin";
}

async function findMentionedProfiles(text, currentUid) {
  const handles = [...new Set((text.match(/@([a-zA-Z0-9_.-]{2,30})/g) || []).map(v => v.slice(1).toLowerCase()))];
  if (!handles.length) return [];
  const snap = await getDocs(query(collection(db, "profiles"), limit(200)));
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(p => p.id !== currentUid && handles.includes(String(p.username || "").toLowerCase()));
}

const DEMO_VIDEOS = [
  { id: "d1", creator: { id: "x1", username: "amara.creates", full_name: "Amara Osei" }, caption: "Custom kente agbada — every thread tells a story.", tags: ["#KenteFashion", "#BespokeTailor", "#GhanaFashion"], sound_name: "Afrobeats Gold Vol. 3", likes_count: 18400, comments_count: 892, shares_count: 3100, saves_count: 1200, pal: 0 },
  { id: "d2", creator: { id: "x2", username: "nanadesigns", full_name: "Nana Kwame" }, caption: "Behind the cut. A bespoke three-piece from raw cloth to runway.", tags: ["#SuitMaking", "#BespokeTailor", "#AccraStyle"], sound_name: "Studio Ambience", likes_count: 11200, comments_count: 445, shares_count: 1800, saves_count: 890, pal: 1 },
  { id: "d3", creator: { id: "x3", username: "yaa_style", full_name: "Yaa Boateng" }, caption: "New collection. Luxury African ready-to-wear dropping Friday.", tags: ["#NewCollection", "#LuxuryAfrican", "#RTW"], sound_name: "Fashion Week Collective", likes_count: 34100, comments_count: 2100, shares_count: 7800, saves_count: 4200, pal: 2 },
];
const DEMO_CREATORS = Object.fromEntries(DEMO_VIDEOS.map((v) => [v.creator.id, {
  ...v.creator,
  role: v.creator.id === "x2" ? "designer" : "tailor",
  bio: v.caption,
  location: "Accra, Ghana",
  followers_count: v.likes_count,
  following_count: 120,
  orders_count: 0,
  services: ["Bespoke Fashion", "Styling"],
  rating: "4.9",
  pal: v.pal,
}]));
const DEMO_TICKERS = [
  { user: "Kwesi M.", msg: "This collection is 🔥🔥" }, { user: "Abena S.", msg: "Where can I order?!" },
  { user: "Kofi D.", msg: "The kente trim is everything" }, { user: "Yaa B.", msg: "Sending a gift 🎁" },
  { user: "Samuel A.", msg: "Designer of the decade 🏆" }, { user: "Prince K.", msg: "Ghana fashion on the world stage!" },
];
const ROLES = [
  { value: "customer", emoji: "🛍️", label: "Customer" },
  { value: "tailor", emoji: "✂️", label: "Tailor" },
  { value: "designer", emoji: "🎨", label: "Designer" },
  { value: "makeup_artist", emoji: "💄", label: "MUA" },
  { value: "shoemaker", emoji: "👟", label: "Cobbler" },
];

// ════════════════════════════════════════════════════════════
//  UPLOAD MODAL — Firebase Storage with REAL progress
// ════════════════════════════════════════════════════════════
function UploadModal({ user, onClose, onSuccess }) {
  const [file, setFile]       = useState(null);
  const [preview, setPreview] = useState(null);
  const [caption, setCaption] = useState("");
  const [tags, setTags]       = useState("");
  const [soundName, setSoundName] = useState("");
  const [progress, setProgress]   = useState(0);
  const [uploading, setUploading] = useState(false);
  const [done, setDone]           = useState(false);
  const [error, setError]         = useState("");
  const [drag, setDrag]           = useState(false);
  const fileRef = useRef();

  const pickFile = (f) => {
    if (!f) return;
    if (!f.type.startsWith("video/") && !f.type.startsWith("image/")) { setError("Please select a video or image file."); return; }
    if (f.size > MAX_UPLOAD_BYTES) { setError(`File must be ${MAX_UPLOAD_LABEL} or smaller for beta.`); return; }
    setFile(f); setError("");
    setPreview(URL.createObjectURL(f));
  };

  const submit = async () => {
    if (!file || !user) { setError("Please select a file first."); return; }
    setUploading(true); setError(""); setProgress(0);

    const ext      = cleanFileExt(file);
    const isVideo  = file.type.startsWith("video/");
    const bucket   = isVideo ? "videos" : "portfolio";
    const postRef  = doc(collection(db, "videos"));
    const path     = `${bucket}/${user.uid}/${postRef.id}.${ext}`;
    const fileRef2 = sRef(storage, path);
    try {
      await user.getIdToken?.(true);
    } catch {
      // Firebase will still refresh automatically during the upload if needed.
    }
    const task     = uploadBytesResumable(fileRef2, file, {
      contentType: file.type || (isVideo ? "video/mp4" : "image/jpeg"),
      customMetadata: {
        owner: user.uid,
        postId: postRef.id,
        originalName: file.name || "upload",
      },
    });

    // ✅ Real byte-level progress — no fake timers
    task.on(
      "state_changed",
      (snap) => {
        setProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100));
      },
      (err) => {
        setError(storageErrorMessage(err));
        setProgress(0);
        setUploading(false);
      },
      async () => {
        try {
          const url      = await getDownloadURL(task.snapshot.ref);
          const tagArr   = tags.split(/[\s,]+/).filter(t => t).map(t => t.startsWith("#") ? t : `#${t}`);
          const mentioned = await findMentionedProfiles(`${caption} ${tags}`, user.uid);
          await setDoc(postRef, {
            creator_id:    user.uid,
            video_url:     isVideo ? url : null,
            thumbnail_url: !isVideo ? url : null,
            media_url:     url,
            media_type:    isVideo ? "video" : "image",
            storage_path:  path,
            caption:       caption.trim() || null,
            tags:          tagArr,
            tagged_user_ids: mentioned.map(p => p.id),
            sound_name:    soundName.trim() || null,
            is_published:  true,
            likes_count: 0, happy_count: 0, wow_count: 0, sad_count: 0, angry_count: 0,
            comments_count: 0, shares_count: 0, saves_count: 0, views_count: 0,
            created_at:    serverTimestamp(),
          });
          await Promise.all(mentioned.map(p => addDoc(collection(db, "notifications"), {
            user_id: p.id,
            actor_id: user.uid,
            type: "tag",
            video_id: postRef.id,
            meta: caption.trim().slice(0, 120) || "tagged you in a post",
            read: false,
            created_at: serverTimestamp(),
          })));
          setProgress(100); setDone(true);
          setTimeout(() => { onSuccess(); onClose(); }, 1800);
        } catch (err) {
          setError(err.message || "Upload finished, but saving the post failed.");
          setUploading(false);
        }
      }
    );
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && !uploading && onClose()}>
      <div className="modal-sheet">
        <div className="sheet-handle" />
        <div className="sheet-scroll"><div className="sheet-inner">
          <div className="sheet-title">Share Your Work</div>
          <div className="sheet-sub">Post a video or photo to your feed</div>
          {done ? (
            <div className="upload-success-badge"><IcoCheck /> Posted successfully! Appearing in feed…</div>
          ) : (
            <>
              <input ref={fileRef} type="file" accept="video/*,image/*" style={{ display: "none" }} onChange={e => pickFile(e.target.files[0])} />
              <div className={`upload-drop-zone ${drag ? "drag" : ""} ${file ? "has-file" : ""}`}
                onClick={() => !file && fileRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDrag(true); }}
                onDragLeave={() => setDrag(false)}
                onDrop={e => { e.preventDefault(); setDrag(false); pickFile(e.dataTransfer.files[0]); }}>
                {preview ? (
                  file?.type.startsWith("video/")
                    ? <video src={preview} className="upload-preview" muted playsInline />
                    : <img src={preview} className="upload-preview" alt="preview" />
                ) : (
                  <><span className="upload-icon">🎬</span><div className="upload-label">Drop your video or photo here</div><div className="upload-sublabel">MP4, MOV, JPG, PNG · Max {MAX_UPLOAD_LABEL}</div></>
                )}
                {file && <div style={{ marginTop: 8, fontSize: 11, color: "var(--gold)" }}>
                  {file.name} · {(file.size / 1024 / 1024).toFixed(1)}MB
                  <button onClick={e => { e.stopPropagation(); setFile(null); setPreview(null); }} style={{ marginLeft: 8, background: "none", border: "none", color: "var(--danger)", cursor: "pointer", fontSize: 12 }}>Remove</button>
                </div>}
              </div>
              {uploading && (
                <div>
                  <div className="progress-bar-wrap"><div className="progress-bar-fill" style={{ width: `${progress}%` }} /></div>
                  <div style={{ textAlign: "center", fontSize: 11, color: "var(--muted)", marginTop: -10, marginBottom: 12 }}>{progress}%</div>
                </div>
              )}
              {error && <div className="err-box">{error}</div>}
              <label className="modal-label">Caption</label>
              <div className="mention-wrap">
                <textarea className="modal-input" placeholder="Describe your creation... tag people with @username" rows={2} value={caption} onChange={e => setCaption(e.target.value)} />
                <div className="mention-tools">
                  <EmojiPicker onPick={e => setCaption(p => `${p}${e}`)} align="right" />
                  <UserMentionPicker currentUid={user?.uid} onPick={handle => setCaption(p => `${p}${p.endsWith(" ") || !p ? "" : " "}${handle}`)} />
                </div>
              </div>
              <label className="modal-label">Tags</label>
              <input className="modal-input" placeholder="#KenteFashion #BespokeTailor" value={tags} onChange={e => setTags(e.target.value)} />
              <label className="modal-label">Sound / Music</label>
              <input className="modal-input" placeholder="e.g. Afrobeats Gold Vol. 3" value={soundName} onChange={e => setSoundName(e.target.value)} style={{ marginBottom: 20 }} />
              <button className="modal-submit" onClick={submit} disabled={uploading || !file}>
                {uploading ? `Uploading… ${progress}%` : "Publish to Feed ✦"}
              </button>
              <button className="modal-cancel" onClick={onClose} disabled={uploading}>Cancel</button>
            </>
          )}
        </div></div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
//  EDIT PROFILE MODAL
// ════════════════════════════════════════════════════════════
function EditProfileModal({ user, profile, onClose, onSaved }) {
  const dp = profile || {};
  const [form, setForm] = useState({
    full_name: dp.full_name || "", username: dp.username || "",
    bio: dp.bio || "", location: dp.location || "", role: dp.role || "customer",
  });
  const [services, setServices] = useState(dp.services || []);
  const [newSvc, setNewSvc] = useState("");
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState("");
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const save = async () => {
    if (!form.full_name.trim()) { setError("Full name is required."); return; }
    if (!form.username.trim())  { setError("Username is required."); return; }
    setSaving(true); setError("");
    try {
      await updateDoc(doc(db, "profiles", user.uid), {
        full_name: form.full_name.trim(),
        username:  form.username.trim(),
        bio:       form.bio.trim()      || null,
        location:  form.location.trim() || null,
        role:      form.role,
        services,
      });
      onSaved(); onClose();
    } catch (err) { setError(err.message || "Save failed."); }
    finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && !saving && onClose()}>
      <div className="modal-sheet"><div className="sheet-handle" />
        <div className="sheet-scroll"><div className="sheet-inner">
          <div className="sheet-title">Edit Profile</div>
          <div className="sheet-sub">Your public VioFashion identity</div>
          {error && <div className="err-box">{error}</div>}
          <div className="modal-row">
            <div style={{ flex: 1 }}><label className="modal-label">Full Name</label><input className="modal-input" placeholder="Amara Osei" value={form.full_name} onChange={set("full_name")} style={{ marginBottom: 0 }} /></div>
            <div style={{ flex: 1 }}><label className="modal-label">Username</label><input className="modal-input" placeholder="amara.creates" value={form.username} onChange={set("username")} style={{ marginBottom: 0 }} /></div>
          </div>
          <div style={{ marginBottom: 12 }}><label className="modal-label">Bio</label><textarea className="modal-input" placeholder="Tell the world what you create…" rows={3} value={form.bio} onChange={set("bio")} style={{ marginBottom: 0 }} /></div>
          <div style={{ marginBottom: 12 }}><label className="modal-label">Location</label><input className="modal-input" placeholder="Accra, Ghana" value={form.location} onChange={set("location")} style={{ marginBottom: 0 }} /></div>
          <div style={{ marginBottom: 20 }}>
            <label className="modal-label">I am a…</label>
            <div className="role-grid">
              {ROLES.map(r => (
                <button key={r.value} className={`role-btn ${form.role === r.value ? "sel" : ""}`} onClick={() => setForm(p => ({ ...p, role: r.value }))}>
                  <span style={{ fontSize: 14 }}>{r.emoji}</span><span>{r.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: 20 }}>
            <label className="modal-label">My Services</label>
            <div className="service-chips" style={{ marginBottom: 10 }}>
              {services.map(s => <span key={s} className="service-chip">{s}<button className="service-chip-remove" onClick={() => setServices(p => p.filter(x => x !== s))}>×</button></span>)}
              {services.length === 0 && <span style={{ fontSize: 12, color: "var(--muted)", fontStyle: "italic" }}>No services added yet</span>}
            </div>
            <div className="svc-add-row">
              <input className="svc-add-inp" placeholder="e.g. Kente Tailoring, Bridal Suits…" value={newSvc} onChange={e => setNewSvc(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && newSvc.trim() && !services.includes(newSvc.trim())) { setServices(p => [...p, newSvc.trim()]); setNewSvc(""); } }} />
              <button className="svc-add-btn" onClick={() => { const s = newSvc.trim(); if (s && !services.includes(s)) { setServices(p => [...p, s]); setNewSvc(""); } }}>+ Add</button>
            </div>
          </div>
          <button className="modal-submit" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save Changes ✦"}</button>
          <button className="modal-cancel" onClick={onClose} disabled={saving}>Cancel</button>
        </div></div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
//  COMMENTS MODAL
// ════════════════════════════════════════════════════════════
function CommentsModal({ video, user, onClose }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [text, setText]         = useState("");
  const [replyTo, setReplyTo]   = useState(null);
  const [sending, setSending]   = useState(false);
  const endRef = useRef();

  useEffect(() => {
    if (!video?.id) return;
    setLoading(true);
    const q = query(collection(db, "video_comments"), where("video_id", "==", video.id), orderBy("created_at", "asc"));
    const unsub = onSnapshot(q, async (snap) => {
      const results = await Promise.all(
        snap.docs.map(async (d) => {
          const c = { id: d.id, ...d.data() };
          if (c.author_id) {
            const ps = await getDoc(doc(db, "profiles", c.author_id));
            c.author = ps.exists() ? { id: ps.id, ...ps.data() } : null;
          }
          return c;
        })
      );
      setComments(results);
      setLoading(false);
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }, (error) => {
      console.error("Failed to load comments", error);
      setComments([]);
      setLoading(false);
    });
    return unsub;
  }, [video?.id]);

  const send = async () => {
    if (!text.trim() || !user || sending) return;
    const content = text.trim(); setText(""); setSending(true);
    try {
      if (isDemoId(video.id)) {
        const snap = await getDoc(doc(db, "profiles", user.uid));
        setComments(p => [...p, {
          id: `local_${Date.now()}`,
          video_id: video.id,
          author_id: user.uid,
          author: snap.exists() ? { id: snap.id, ...snap.data() } : null,
          content,
          created_at: new Date(),
        }]);
      } else {
        await addDoc(collection(db, "video_comments"), {
          video_id:  video.id,
          author_id: user.uid,
          parent_comment_id: replyTo?.id || null,
          content,
          created_at: serverTimestamp(),
        });
        if (video.id) await updateDoc(doc(db, "videos", video.id), { comments_count: increment(1) });
        await createNotification({
          userId: replyTo?.author_id || video.creator_id,
          actorId: user.uid,
          type: replyTo?.author_id ? "reply" : "comment",
          videoId: video.id,
          meta: content.slice(0, 120),
        });
      }
      setReplyTo(null);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-sheet" style={{ maxHeight: "85vh" }}>
        <div className="sheet-handle" />
        <div style={{ padding: "16px 24px 12px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div className="sheet-title" style={{ marginBottom: 0 }}>{fmt(video?.comments_count || 0)} Comments</div>
            <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", padding: 4 }}><IcoX /></button>
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{video?.creator?.full_name || "Creator"}'s post</div>
        </div>
        <div className="sheet-scroll" style={{ flex: 1 }}>
          <div style={{ padding: "16px 24px" }}>
            {loading && <Spinner />}
            {!loading && comments.length === 0 && <div className="empty-state"><div className="empty-icon">💬</div><div className="empty-title">Be the first</div><div className="empty-sub">No comments yet.</div></div>}
            {comments.map((c, i) => (
              <div key={c.id} className="comment-row" style={c.parent_comment_id ? { marginLeft: 28 } : null}>
                <div className="comment-av" style={{ background: PALETTES[i % PALETTES.length] }}>
                  {c.author?.avatar_url ? <img src={c.author.avatar_url} alt="" /> : initials(c.author?.full_name || c.author?.username)}
                </div>
                <div className="comment-body">
                  <div className="comment-name">{c.author?.full_name || c.author?.username || "User"}</div>
                  <div className="comment-text">{c.content}</div>
                  <div className="comment-time" style={{ display: "flex", gap: 12 }}>
                    <span>{timeAgo(c.created_at)}</span>
                    <button onClick={() => setReplyTo(c)} style={{ background: "none", border: "none", color: "var(--gold)", fontSize: 10, cursor: "pointer", padding: 0 }}>Reply</button>
                  </div>
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </div>
        </div>
        {replyTo && <div style={{ padding: "8px 16px 0", fontSize: 11, color: "var(--gold-lt)" }}>Replying to {replyTo.author?.username || replyTo.author?.full_name || "comment"} <button onClick={() => setReplyTo(null)} style={{ marginLeft: 8, background: "none", border: "none", color: "var(--muted)", cursor: "pointer" }}>Cancel</button></div>}
        <div className="comment-inp-bar">
          <EmojiPicker onPick={e => setText(p => `${p}${e}`)} />
          <input className="comment-inp" placeholder={replyTo ? "Write a reply..." : "Add a comment..."} value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} />
          <button className="comment-send" onClick={send} disabled={sending}><IcoSend /></button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
//  MAKE OFFER MODAL
// ════════════════════════════════════════════════════════════
function MakeOfferModal({ request, user, onClose, onSuccess }) {
  const [form, setForm]         = useState({ price: "", deliveryDays: "", message: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]       = useState("");
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const submit = async () => {
    if (!form.price || !form.deliveryDays || !form.message.trim()) { setError("Please fill in all fields."); return; }
    if (!user) { setError("You must be signed in."); return; }
    setSubmitting(true); setError("");
    try {
      await submitOffer({ requestId: request.id, creatorId: user.uid, message: form.message.trim(), price: parseFloat(form.price), deliveryDays: parseInt(form.deliveryDays) });
      await createNotification({
        userId: request.customer_id,
        actorId: user.uid,
        type: "offer",
        requestId: request.id,
        meta: request.title,
      });
      onSuccess?.(); onClose();
    } catch (err) { setError(err.message || "Failed to submit offer."); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && !submitting && onClose()}>
      <div className="modal-sheet"><div className="sheet-handle" />
        <div className="sheet-scroll"><div className="sheet-inner">
          <div className="sheet-title">Make an Offer</div>
          <div className="sheet-sub" style={{ marginBottom: 16 }}>Bidding on: <span style={{ color: "var(--white)", fontWeight: 500 }}>"{request?.title}"</span></div>
          <div style={{ background: "rgba(21,14,32,0.6)", border: "1px solid var(--border)", borderRadius: 12, padding: 12, marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span className="req-cat">{request?.category}</span>
              {request?.budget && <span style={{ fontSize: 12, color: "var(--gold-lt)", fontWeight: 700 }}>Budget: GH₵ {Number(request.budget).toLocaleString()}</span>}
            </div>
            {request?.description && <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 8, lineHeight: 1.6 }}>{request.description}</p>}
          </div>
          {error && <div className="err-box">{error}</div>}
          <div className="modal-row">
            <div style={{ flex: 1 }}><label className="modal-label">Your Price (GH₵)</label><input className="modal-input" type="number" placeholder="e.g. 500" value={form.price} onChange={set("price")} style={{ marginBottom: 0 }} /></div>
            <div style={{ flex: 1 }}><label className="modal-label">Delivery (days)</label><input className="modal-input" type="number" placeholder="e.g. 14" value={form.deliveryDays} onChange={set("deliveryDays")} style={{ marginBottom: 0 }} /></div>
          </div>
          <div style={{ marginBottom: 20, marginTop: 12 }}>
            <label className="modal-label">Message to Client</label>
            <textarea className="modal-input" placeholder="Describe your approach, materials, experience…" rows={4} value={form.message} onChange={set("message")} style={{ marginBottom: 0 }} />
          </div>
          <button className="modal-submit" onClick={submit} disabled={submitting}>{submitting ? "Submitting…" : "Submit Offer ✦"}</button>
          <button className="modal-cancel" onClick={onClose} disabled={submitting}>Cancel</button>
        </div></div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
//  REQUEST DETAIL MODAL
// ════════════════════════════════════════════════════════════
function RequestDetailModal({ request, user, profile, onClose }) {
  const { offers, loading, reload } = useOffers(request?.id);
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [actioning, setActioning]         = useState(null);
  const [error, setError]                 = useState("");

  const isOwner    = user?.uid === request?.customer_id;
  const isCreator  = CREATOR_ROLES.includes(profile?.role);
  const hasAlreadyBid = offers.some(o => o.creator_id === user?.uid);

  const handleAccept = async (offerId) => {
    setActioning(offerId); setError("");
    try { await acceptOffer(offerId, request.id); reload(); }
    catch (err) { setError(err.message); }
    finally { setActioning(null); }
  };
  const handleReject = async (offerId) => {
    setActioning(offerId); setError("");
    try { await rejectOffer(offerId); reload(); }
    catch (err) { setError(err.message); }
    finally { setActioning(null); }
  };

  if (showOfferForm) return <MakeOfferModal request={request} user={user} onClose={() => setShowOfferForm(false)} onSuccess={() => { setShowOfferForm(false); reload(); }} />;

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-sheet" style={{ maxHeight: "90vh" }}>
        <div className="sheet-handle" />
        <div style={{ padding: "16px 24px 12px", borderBottom: "1px solid var(--border)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div><div className="sheet-title" style={{ marginBottom: 2 }}>{request?.title}</div><span className="req-cat">{request?.category}</span></div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", padding: 4 }}><IcoX /></button>
        </div>
        <div className="sheet-scroll">
          <div style={{ padding: "16px 24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              {request?.budget && <div className="req-budget">GH₵ {Number(request.budget).toLocaleString()}</div>}
              {request?.is_urgent && <span className="req-urgent">Urgent</span>}
              <span style={{ fontSize: 11, color: "var(--muted)", marginLeft: "auto" }}>{timeAgo(request?.created_at)}</span>
            </div>
            {request?.description && <div style={{ background: "rgba(21,14,32,0.5)", border: "1px solid var(--border)", borderRadius: 12, padding: 14, marginBottom: 16 }}><p style={{ fontSize: 13, fontWeight: 300, lineHeight: 1.7, color: "rgba(248,245,255,0.8)" }}>{request.description}</p></div>}
            {error && <div className="err-box">{error}</div>}
            {!isOwner && isCreator && !hasAlreadyBid && request?.status === "open" && (
              <button className="modal-submit" style={{ marginBottom: 20 }} onClick={() => setShowOfferForm(true)}>Make an Offer ✦</button>
            )}
            {hasAlreadyBid && <div style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.25)", borderRadius: 12, padding: "10px 14px", marginBottom: 16, fontSize: 12, color: "var(--vio-lite)", textAlign: "center" }}>✓ You've already submitted an offer</div>}
            <div className="section-head" style={{ marginBottom: 12 }}>{isOwner ? `${offers.length} Offer${offers.length !== 1 ? "s" : ""}` : "Bids"}</div>
            {loading && <Spinner />}
            {!loading && offers.length === 0 && <div className="empty-state" style={{ height: 120 }}><div className="empty-icon" style={{ fontSize: 28 }}>🧵</div><div className="empty-title" style={{ fontSize: 16 }}>No offers yet</div></div>}
            {offers.map((o, i) => (
              <div key={o.id} className="offer-card">
                <div className="offer-creator-row">
                  <div className="offer-av" style={{ background: PALETTES[i % PALETTES.length] }}>
                    {o.creator?.avatar_url ? <img src={o.creator.avatar_url} alt="" /> : initials(o.creator?.full_name || o.creator?.username)}
                  </div>
                  <div><div className="offer-creator-name">{o.creator?.full_name || o.creator?.username}</div><div className="offer-creator-role">{ROLE_EMOJI[o.creator?.role] || ""} {o.creator?.role?.replace("_", " ")}</div></div>
                  {o.status === "pending" ? <div className="offer-price-badge">GH₵ {Number(o.price).toLocaleString()}</div> : <span className={`offer-status-badge offer-status-${o.status}`}>{o.status}</span>}
                </div>
                <div className="offer-msg">{o.message}</div>
                <div className="offer-meta-row">
                  <span className="offer-meta">🚚 {o.delivery_days} days</span>
                  <span className="offer-meta" style={{ marginLeft: "auto" }}>{timeAgo(o.created_at)}</span>
                </div>
                {isOwner && o.status === "pending" && (
                  <div className="offer-actions">
                    <button className="offer-accept" disabled={actioning === o.id} onClick={() => handleAccept(o.id)}>{actioning === o.id ? "…" : "✓ Accept"}</button>
                    <button className="offer-reject" disabled={actioning === o.id} onClick={() => handleReject(o.id)}>Decline</button>
                  </div>
                )}
              </div>
            ))}
            <div style={{ height: 20 }} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
//  GO LIVE MODAL
// ════════════════════════════════════════════════════════════
function GoLiveModal({ user, profile, onClose, onLive }) {
  const [form, setForm] = useState({ title: "", category: "Fashion Show" });
  const [starting, setStarting] = useState(false);
  const [error, setError]       = useState("");
  const CATS = ["Fashion Show", "Behind the Scenes", "Fitting Session", "Tutorial", "Q&A", "New Collection"];

  const start = async () => {
    if (!form.title.trim()) { setError("Please add a stream title."); return; }
    if (!user) return;
    setStarting(true); setError("");
    try {
      const stream = await startLiveStream({ creatorId: user.uid, title: form.title.trim(), category: form.category });
      const followers = await getDocs(query(collection(db, "follows"), where("following_id", "==", user.uid), limit(120)));
      await Promise.all(followers.docs.map(d => createNotification({
        userId: d.data().follower_id,
        actorId: user.uid,
        type: "live",
        meta: form.title.trim(),
      })));
      onLive(stream); onClose();
    } catch (err) { setError(err.message || "Failed to start stream."); }
    finally { setStarting(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && !starting && onClose()}>
      <div className="modal-sheet"><div className="sheet-handle" />
        <div className="sheet-scroll"><div className="sheet-inner">
          <div style={{ fontSize: 36, textAlign: "center", marginBottom: 8 }}>🔴</div>
          <div className="sheet-title" style={{ textAlign: "center" }}>Go Live</div>
          <div className="sheet-sub" style={{ textAlign: "center" }}>Share your craft as {profile?.full_name || "your atelier"}</div>
          {error && <div className="err-box">{error}</div>}
          <label className="modal-label">Stream Title</label>
          <input className="modal-input" placeholder="e.g. New Kente Collection Reveal" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
          <label className="modal-label">Category</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
            {CATS.map(c => (
              <button key={c} onClick={() => setForm(p => ({ ...p, category: c }))}
                style={{ background: form.category === c ? "rgba(220,38,38,0.15)" : "rgba(255,255,255,0.04)", border: `1px solid ${form.category === c ? "rgba(220,38,38,0.4)" : "var(--border)"}`, borderRadius: 10, padding: "7px 12px", color: form.category === c ? "#FCA5A5" : "var(--muted)", fontSize: 11, fontWeight: 500, cursor: "pointer" }}>
                {c}
              </button>
            ))}
          </div>
          <button onClick={start} disabled={starting} style={{ width: "100%", background: starting ? "rgba(220,38,38,0.3)" : "linear-gradient(135deg,#DC2626,#B91C1C)", border: "none", borderRadius: 14, padding: 14, color: "#fff", fontFamily: "var(--ff-sans)", fontSize: 14, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", cursor: starting ? "not-allowed" : "pointer", boxShadow: "0 4px 20px rgba(220,38,38,0.35)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            {starting ? "Starting…" : <><div style={{ width: 8, height: 8, background: "#fff", borderRadius: "50%" }} />Go Live Now</>}
          </button>
          <button className="modal-cancel" onClick={onClose} disabled={starting}>Cancel</button>
        </div></div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
//  NOTIFICATIONS SCREEN
// ════════════════════════════════════════════════════════════
function NotificationsScreen({ user }) {
  const { notifications, loading } = useNotifications(user?.uid);
  useEffect(() => {
    if (!user?.uid || notifications.length === 0) return;
    notifications
      .filter(n => !n.read)
      .slice(0, 20)
      .forEach(n => updateDoc(doc(db, "notifications", n.id), { read: true }).catch(() => {}));
  }, [notifications, user?.uid]);
  const typeConfig = {
    like:    { icon: "❤️", cls: "notif-type-like",    text: n => <><strong>{n.actor?.full_name || n.actor?.username || "Someone"}</strong> liked your post{n.meta ? ` ${n.meta}` : ""}</> },
    follow:  { icon: "👤", cls: "notif-type-follow",  text: n => <><strong>{n.actor?.full_name || n.actor?.username || "Someone"}</strong> started following you</> },
    comment: { icon: "💬", cls: "notif-type-comment", text: n => <><strong>{n.actor?.full_name || n.actor?.username || "Someone"}</strong> commented: "{n.meta}"</> },
    reply:   { icon: "↩", cls: "notif-type-comment", text: n => <><strong>{n.actor?.full_name || n.actor?.username || "Someone"}</strong> replied: "{n.meta}"</> },
    tag:     { icon: "@", cls: "notif-type-comment", text: n => <><strong>{n.actor?.full_name || n.actor?.username || "Someone"}</strong> tagged you in a post</> },
    share:   { icon: "↗", cls: "notif-type-like", text: n => <><strong>{n.actor?.full_name || n.actor?.username || "Someone"}</strong> shared {n.meta || "your post"}</> },
    save:    { icon: "□", cls: "notif-type-like", text: n => <><strong>{n.actor?.full_name || n.actor?.username || "Someone"}</strong> saved {n.meta || "your post"}</> },
    message: { icon: "✉", cls: "notif-type-comment", text: n => <><strong>{n.actor?.full_name || n.actor?.username || "Someone"}</strong> sent you a message</> },
    live:    { icon: "●", cls: "notif-type-like", text: n => <><strong>{n.actor?.full_name || n.actor?.username || "Someone"}</strong> is live: "{n.meta}"</> },
    commission: { icon: "✦", cls: "notif-type-offer", text: n => <><strong>{n.actor?.full_name || n.actor?.username || "Someone"}</strong> posted a commission: "{n.meta}"</> },
    offer:   { icon: "🧵", cls: "notif-type-offer",   text: n => <><strong>{n.actor?.full_name || n.actor?.username || "Someone"}</strong> made an offer on "{n.meta}"</> },
  };
  return (
    <div className="notif-scroll">
      <div className="notif-head"><div className="notif-head-title">Activity</div></div>
      {loading && <Spinner />}
      {!loading && notifications.length === 0 && <div className="empty-state"><div className="empty-icon">🔔</div><div className="empty-title">All quiet</div><div className="empty-sub">Likes, follows, comments and offers will appear here</div></div>}
      {notifications.map((n, i) => {
        const cfg = typeConfig[n.type]; if (!cfg) return null;
        return (
          <div key={n.id} className={`notif-row ${!n.read ? "unread" : ""}`}>
            <div className="notif-av" style={{ background: PALETTES[i % PALETTES.length] }}>
              {n.actor?.avatar_url ? <img src={n.actor.avatar_url} alt="" /> : initials(n.actor?.full_name || n.actor?.username)}
              <div className={`notif-type-icon ${cfg.cls}`}>{cfg.icon}</div>
            </div>
            <div className="notif-body">
              <div className="notif-text">{cfg.text(n)}</div>
              {n.type === "offer" && n.price && <div className="notif-price">GH₵ {Number(n.price).toLocaleString()}</div>}
              <div className="notif-meta">{timeAgo(n.created_at)}</div>
            </div>
          </div>
        );
      })}
      <div style={{ height: 100 }} />
    </div>
  );
}

// ════════════════════════════════════════════════════════════
//  SEARCH SCREEN
// ════════════════════════════════════════════════════════════
function SearchScreen({ user, profile, onStartChat }) {
  const [queryStr, setQueryStr] = useState("");
  const [type, setType]         = useState("all");
  const [viewCreator, setViewCreator] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const { results, loading }    = useSearch(queryStr, type);
  const inputRef = useRef();
  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 100); }, []);
  const hasResults = results.creators.length > 0 || results.requests.length > 0;
  return (
    <div className="search-outer">
      <div className="search-head">
        <div className="search-head-title">Search</div>
        <div className="search-inp-wrap">
          <IcoSearch />
          <input ref={inputRef} placeholder="Creators, commissions, styles…" value={queryStr} onChange={e => setQueryStr(e.target.value)} />
          {queryStr && <button onClick={() => setQueryStr("")} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", display: "flex", alignItems: "center" }}><IcoX2 /></button>}
        </div>
        <div className="search-type-tabs">
          {[["all", "All"], ["creators", "Creators"], ["requests", "Commissions"]].map(([k, l]) => (
            <button key={k} className={`search-type-tab ${type === k ? "on" : ""}`} onClick={() => setType(k)}>{l}</button>
          ))}
        </div>
      </div>
      <div className="search-results">
        {loading && <Spinner />}
        {!queryStr && !loading && !hasResults && <div className="search-empty"><div className="search-empty-icon">🔍</div><div className="search-empty-text">Find your style</div><div className="search-empty-sub">Search for creators, tailors, designers, or open commissions</div></div>}
        {queryStr && !loading && !hasResults && <div className="search-empty"><div className="search-empty-icon">🧵</div><div className="search-empty-text">No results</div><div className="search-empty-sub">Try a different search term</div></div>}
        {results.creators.length > 0 && (<>
          <div className="search-section-label">Creators</div>
          {results.creators.map((c, i) => (
            <div key={c.id} className="search-creator-card" onClick={() => user?.uid !== c.id && setViewCreator(c.id)} style={{ cursor: user?.uid === c.id ? "default" : "pointer" }}>
              <div className="search-creator-av" style={{ background: PALETTES[i % PALETTES.length] }}>{c.avatar_url ? <img src={c.avatar_url} alt="" /> : initials(c.full_name || c.username)}</div>
              <div className="search-creator-info"><div className="search-creator-name">{c.full_name || c.username}{c.is_verified && <span style={{ marginLeft: 5, fontSize: 10, color: "var(--gold)" }}>✓</span>}</div><div className="search-creator-sub">{ROLE_EMOJI[c.role] || ""} {c.role?.replace("_", " ")} · {fmt(c.followers_count || 0)} followers</div></div>
            </div>
          ))}
        </>)}
        {results.requests.length > 0 && (<>
          <div className="search-section-label" style={{ marginTop: results.creators.length > 0 ? 20 : 0 }}>Open Commissions</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {results.requests.map(r => (
              <div key={r.id} className="req-card" onClick={() => setSelectedRequest(r)}>
                <div className="req-top"><div style={{ flex: 1 }}><span className="req-cat">{r.category}</span><div className="req-title">{r.title}</div></div>{r.budget && <div className="req-budget">GH₵ {Number(r.budget).toLocaleString()}</div>}</div>
                {r.description && <p className="req-desc">{r.description.slice(0, 120)}{r.description.length > 120 ? "…" : ""}</p>}
                <div className="req-bottom"><span className="req-meta-item">{timeAgo(r.created_at)}</span>{r.is_urgent && <span className="req-urgent">Urgent</span>}</div>
              </div>
            ))}
          </div>
        </>)}
        <div style={{ height: 100 }} />
      </div>
      {viewCreator && <CreatorProfileModal creatorId={viewCreator} currentUser={user} onClose={() => setViewCreator(null)} onStartChat={conv => { setViewCreator(null); onStartChat?.(conv); }} />}
      {selectedRequest && <RequestDetailModal request={selectedRequest} user={user} profile={profile} onClose={() => setSelectedRequest(null)} />}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
//  CREATOR PROFILE MODAL
// ════════════════════════════════════════════════════════════
function CreatorProfileModal({ creatorId, currentUser, onClose, onStartChat }) {
  const [profile, setProfile] = useState(null);
  const [videos, setVideos]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [followed, setFollowed] = useState(false);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    if (!creatorId) return;
    if (isDemoCreatorId(creatorId)) {
      const demoProfile = DEMO_CREATORS[creatorId] || null;
      setProfile(demoProfile ? { id: creatorId, ...demoProfile } : null);
      setVideos(DEMO_VIDEOS.filter(v => v.creator?.id === creatorId));
      setFollowed(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([
      getDoc(doc(db, "profiles", creatorId)),
      getDocs(query(collection(db, "videos"), where("creator_id", "==", creatorId), where("is_published", "==", true), orderBy("likes_count", "desc"), limit(9))),
      currentUser ? getDoc(doc(db, "follows", `${currentUser.uid}_${creatorId}`)) : Promise.resolve({ exists: () => false }),
    ]).then(([pSnap, vSnap, fSnap]) => {
      setProfile(pSnap.exists() ? { id: pSnap.id, ...pSnap.data() } : null);
      setVideos(vSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setFollowed(fSnap.exists());
      setLoading(false);
    });
  }, [creatorId, currentUser]);

  const toggleFollow = async () => {
    if (!currentUser || currentUser.uid === creatorId) return;
    if (isDemoCreatorId(creatorId)) {
      setFollowed(p => !p);
      setProfile(p => p ? { ...p, followers_count: Math.max(0, (p.followers_count || 0) + (followed ? -1 : 1)) } : p);
      return;
    }
    const fid = `${currentUser.uid}_${creatorId}`;
    if (followed) {
      await deleteDoc(doc(db, "follows", fid));
      await updateDoc(doc(db, "profiles", creatorId), { followers_count: increment(-1) });
      await updateDoc(doc(db, "profiles", currentUser.uid), { following_count: increment(-1) });
      setProfile(p => p ? { ...p, followers_count: Math.max(0, (p.followers_count || 0) - 1) } : p);
      setFollowed(false);
    } else {
      await setDoc(doc(db, "follows", fid), { follower_id: currentUser.uid, following_id: creatorId, created_at: serverTimestamp() });
      await updateDoc(doc(db, "profiles", creatorId), { followers_count: increment(1) });
      await updateDoc(doc(db, "profiles", currentUser.uid), { following_count: increment(1) });
      await createNotification({ userId: creatorId, actorId: currentUser.uid, type: "follow" });
      setProfile(p => p ? { ...p, followers_count: (p.followers_count || 0) + 1 } : p);
      setFollowed(true);
    }
  };

  const handleMessage = async () => {
    if (!currentUser || !creatorId) return;
    if (isDemoCreatorId(creatorId)) return;
    try {
      const conv = await getOrCreateConversation(currentUser.uid, creatorId);
      onStartChat({ ...conv, other: profile, participants: conv.participants || [currentUser.uid, creatorId] });
      onClose();
    } catch (err) {
      console.error("Failed to start profile conversation", err);
      setActionError(err?.message || "Could not start this conversation. Please try again.");
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-sheet" style={{ maxHeight: "92vh" }}>
        <div className="sheet-handle" />
        {loading ? <Spinner /> : (<>
          <div className="cp-hero">
            <div className="cp-hero-bg" style={{ background: profile?.banner_url ? `url(${profile.banner_url}) center/cover` : PALETTES[0] }} />
            <div className="cp-hero-grad" />
            <div className="cp-av-wrap" style={{ background: PALETTES[0] }}>{profile?.avatar_url ? <img src={profile.avatar_url} alt="" /> : initials(profile?.full_name || profile?.username)}</div>
            <button onClick={onClose} style={{ position: "absolute", top: 12, right: 12, background: "rgba(6,4,9,0.6)", backdropFilter: "blur(8px)", border: "none", borderRadius: 10, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--white)" }}><IcoX /></button>
          </div>
          <div className="sheet-scroll">
            <div className="cp-meta">
              <div className="cp-name">{profile?.full_name || profile?.username}</div>
              <div className="cp-handle">@{profile?.username}{profile?.location && ` · ${profile.location}`}</div>
              <div className="cp-role-chip">{ROLE_EMOJI[profile?.role] || "🛍️"} {(profile?.role || "customer").replace("_", " ")}</div>
              {profile?.bio && <p className="cp-bio">{profile.bio}</p>}
              <div className="cp-stats">
                {[[fmt(profile?.followers_count || 0), "Followers"], [fmt(profile?.following_count || 0), "Following"], [videos.length, "Posts"], [profile?.rating ? `${profile.rating}★` : "—", "Rating"]].map(([n, l]) => (
                  <div key={l} className="cp-stat"><span className="cp-stat-n">{n}</span><span className="cp-stat-l">{l}</span></div>
                ))}
              </div>
              {actionError && <div style={{ marginBottom: 12, background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)", color: "#ff8a8a", borderRadius: 12, padding: "10px 12px", fontSize: 13 }}>{actionError}</div>}
              {currentUser && currentUser.uid !== creatorId && (
                <div className="cp-action-row">
                  <button className={`cp-follow-btn ${followed ? "following" : ""}`} onClick={toggleFollow}>{followed ? "✓ Following" : "+ Follow"}</button>
                  <button className="cp-msg-btn" onClick={handleMessage}>💬 Message</button>
                </div>
              )}
              {profile?.services?.length > 0 && <div className="service-chips" style={{ marginBottom: 16 }}>{profile.services.map(s => <span key={s} className="service-chip">{s}</span>)}</div>}
              {videos.length > 0 && (<>
                <div className="section-head" style={{ marginBottom: 10 }}>Works</div>
                <div className="cp-mini-grid">
                  {videos.map((v, i) => (
                    <div key={v.id} className="cp-mini-item">{v.thumbnail_url ? <img src={v.thumbnail_url} alt="" /> : <div style={{ width: "100%", height: "100%", background: PALETTES[i % PALETTES.length] }} />}</div>
                  ))}
                </div>
              </>)}
              <div style={{ height: 20 }} />
            </div>
          </div>
        </>)}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
//  PAYMENT MODAL
// ════════════════════════════════════════════════════════════
function PaymentModal({ order, user, profile, onClose, onPaid }) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError]     = useState("");
  const isCreator     = CREATOR_ROLES.includes(profile?.role);
  const price         = isCreator ? order?.price : order?.accepted_offer?.[0]?.price;
  const title         = isCreator ? order?.request?.title : order?.title;
  const creator       = isCreator ? null : order?.accepted_offer?.[0]?.creator;
  const amountGhs     = Number(price) || 0;
  const amountPesewas = Math.round(amountGhs * 100);

  const pay = async () => {
    if (!user?.email) { setError("Email required for payment."); return; }
    setLoading(true); setError("");
    try {
      const PaystackPop = await loadPaystack();
      const handler = PaystackPop.setup({
        key: PAYSTACK_KEY, email: user.email, amount: amountPesewas, currency: "GHS",
        ref: `vio_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        callback: async (response) => {
          try {
            const requestId = isCreator ? order?.request?.id : order?.id;
            await updateDoc(doc(db, "requests", requestId), { status: "paid", payment_ref: response.reference });
            setSuccess(true);
            setTimeout(() => { onPaid?.(); onClose(); }, 2500);
          } catch { setError("Payment recorded but order update failed. Ref: " + response.reference); }
        },
        onClose: () => setLoading(false),
      });
      handler.openIframe();
    } catch (err) { setError(err.message || "Payment failed."); setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-sheet"><div className="sheet-handle" />
        <div className="sheet-scroll"><div className="sheet-inner">
          {success ? (
            <div className="pay-success"><div className="pay-success-icon">✅</div><div className="pay-success-title">Payment Sent!</div><div className="pay-success-sub">Your payment has been processed.<br />The creator will be notified.</div></div>
          ) : (
            <>
              <div className="sheet-title" style={{ textAlign: "center" }}>Complete Payment</div>
              <div className="pay-amount">GH₵ {amountGhs.toLocaleString()}</div>
              <div className="pay-amount-label">Commission Payment</div>
              <div className="pay-summary-card">
                <div className="pay-row"><span className="pay-row-label">Commission</span><span className="pay-row-val" style={{ maxWidth: 160, textAlign: "right", fontSize: 12 }}>{title}</span></div>
                {creator && <div className="pay-row"><span className="pay-row-label">Creator</span><span className="pay-row-val">{creator.full_name || creator.username}</span></div>}
                <div style={{ height: 1, background: "var(--border)", margin: "8px 0" }} />
                <div className="pay-row"><span className="pay-row-label">Amount</span><span className="pay-row-val" style={{ color: "var(--gold-lt)", fontWeight: 700 }}>GH₵ {amountGhs.toLocaleString()}</span></div>
              </div>
              {error && <div className="err-box">{error}</div>}
              <button className="pay-btn" onClick={pay} disabled={loading || !amountPesewas}>
                {loading ? <><div className="spin" style={{ width: 16, height: 16, borderTopColor: "#fff" }} />Processing…</> : <>🔒 Pay GH₵ {amountGhs.toLocaleString()}</>}
              </button>
              <div className="pay-secure">🔒 Secured by Paystack · SSL Encrypted</div>
              <button className="modal-cancel" onClick={onClose} style={{ marginTop: 8 }}>Cancel</button>
            </>
          )}
        </div></div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
//  FEED SCREEN
// ════════════════════════════════════════════════════════════
function ShareSheet({ video, user, onClose, onShared }) {
  const [queryStr, setQueryStr] = useState("");
  const [people, setPeople] = useState([]);
  const [sendingTo, setSendingTo] = useState(null);
  const mediaUrl = video?.video_url || video?.thumbnail_url || video?.media_url;
  const shareUrl = `${window.location.origin}/?post=${video?.id || ""}`;

  useEffect(() => {
    if (!user) return;
    const loadPeople = async () => {
      const snap = await getDocs(query(collection(db, "profiles"), limit(80)));
      const needle = queryStr.trim().toLowerCase();
      setPeople(snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(p => p.id !== user.uid)
        .filter(p => !needle || (p.full_name || "").toLowerCase().includes(needle) || (p.username || "").toLowerCase().includes(needle))
        .slice(0, 12));
    };
    loadPeople();
  }, [queryStr, user]);

  const nativeShare = async () => {
    const msg = await shareItem({ title: "VioFashion post", text: video?.caption || "Check out this VioFashion post", url: shareUrl });
    if (video?.id && !isDemoId(video.id)) await updateDoc(doc(db, "videos", video.id), { shares_count: increment(1) });
    if (user?.uid && video?.creator_id) await createNotification({ userId: video.creator_id, actorId: user.uid, type: "share", videoId: video.id, meta: video.caption?.slice(0, 80) || "your post" });
    onShared?.(msg);
  };
  const copyLink = async () => {
    await navigator.clipboard?.writeText(shareUrl);
    onShared?.("Post link copied.");
  };
  const downloadMedia = () => {
    if (!mediaUrl) return;
    const a = document.createElement("a");
    a.href = mediaUrl;
    a.download = `viofashion-${video?.id || Date.now()}`;
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    a.remove();
    onShared?.("Download started.");
  };
  const sendToUser = async (person) => {
    if (!user || !person?.id || !video?.id) return;
    setSendingTo(person.id);
    const conv = await getOrCreateConversation(user.uid, person.id);
    const content = `Shared a VioFashion post: ${video.caption || shareUrl}`;
    await addDoc(collection(db, "messages"), {
      conversation_id: conv.id,
      sender_id: user.uid,
      content,
      shared_video_id: video.id,
      shared_url: shareUrl,
      type: "share",
      created_at: serverTimestamp(),
    });
    await updateDoc(doc(db, "conversations", conv.id), { last_message: content, last_message_at: serverTimestamp() });
    if (!isDemoId(video.id)) await updateDoc(doc(db, "videos", video.id), { shares_count: increment(1) });
    await createNotification({ userId: person.id, actorId: user.uid, type: "message", conversationId: conv.id, meta: "shared a post with you" });
    if (video.creator_id) await createNotification({ userId: video.creator_id, actorId: user.uid, type: "share", videoId: video.id, meta: video.caption?.slice(0, 80) || "your post" });
    onShared?.(`Sent to ${person.full_name || person.username}.`);
    setSendingTo(null);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-sheet"><div className="sheet-handle" />
        <div className="sheet-scroll"><div className="sheet-inner">
          <div className="sheet-title">Share Post</div>
          <div className="sheet-sub">Send it inside VioFashion or share outside the app</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 18 }}>
            <button className="role-btn" onClick={nativeShare}>Share</button>
            <button className="role-btn" onClick={copyLink}>Copy</button>
            <button className="role-btn" onClick={downloadMedia}>Download</button>
          </div>
          <label className="modal-label">Send to user</label>
          <input className="modal-input" placeholder="Search people..." value={queryStr} onChange={e => setQueryStr(e.target.value)} />
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {people.map((p, i) => (
              <button key={p.id} onClick={() => sendToUser(p)} disabled={sendingTo === p.id} style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", borderRadius: 12, padding: 10, color: "var(--white)", cursor: "pointer" }}>
                <span className="chat-av" style={{ width: 34, height: 34, background: PALETTES[i % PALETTES.length] }}>{p.avatar_url ? <img src={p.avatar_url} alt="" /> : initials(p.full_name || p.username)}</span>
                <span style={{ textAlign: "left", flex: 1 }}><span style={{ display: "block", fontSize: 13, fontWeight: 600 }}>{p.full_name || p.username}</span><span style={{ fontSize: 11, color: "var(--muted)" }}>@{p.username}</span></span>
                <span style={{ fontSize: 11, color: "var(--gold)" }}>{sendingTo === p.id ? "Sending..." : "Send"}</span>
              </button>
            ))}
          </div>
          <button className="modal-cancel" onClick={onClose}>Close</button>
        </div></div>
      </div>
    </div>
  );
}

function FeedScreen({ user, onSearch, onNotifications, onStartChat }) {
  const [tab, setTab]           = useState("discover");
  const [videos, setVideos]     = useState([]);
  const [liked, setLiked]       = useState({});
  const [reactions, setReactions] = useState({});
  const [saved, setSaved]       = useState({});
  const [muted, setMuted]       = useState({});
  const [followed, setFollowed] = useState({});
  const [notice, setNotice]     = useState("");
  const [commentVideo, setCommentVideo] = useState(null);
  const [shareVideoItem, setShareVideoItem] = useState(null);
  const [quickActions, setQuickActions] = useState(null);
  const [viewCreator, setViewCreator]   = useState(null);
  const pressTimer = useRef(null);
  const lastTap = useRef({});

  useEffect(() => {
    const q = query(collection(db, "videos"), where("is_published", "==", true), orderBy("created_at", "desc"), limit(20));
    const unsub = onSnapshot(q, async (snap) => {
      if (snap.empty) { setVideos(DEMO_VIDEOS); return; }
      const results = await Promise.all(snap.docs.map(async (d) => {
        const v = { id: d.id, ...d.data() };
        if (v.creator_id) { const ps = await getDoc(doc(db, "profiles", v.creator_id)); v.creator = ps.exists() ? { id: ps.id, ...ps.data() } : null; }
        return v;
      }));
      setVideos(results);
    }, (error) => {
      console.error("Failed to load feed", error);
      setVideos(DEMO_VIDEOS);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      getDocs(query(collection(db, "follows"), where("follower_id", "==", user.uid), limit(200))),
      getDocs(query(collection(db, "video_saves"), where("user_id", "==", user.uid), limit(200))),
      getDocs(query(collection(db, "video_reactions"), where("user_id", "==", user.uid), limit(200))),
    ]).then(([fSnap, sSnap, rSnap]) => {
      setFollowed(Object.fromEntries(fSnap.docs.map(d => [d.data().following_id, true])));
      setSaved(Object.fromEntries(sSnap.docs.map(d => [d.data().video_id, true])));
      const reactionMap = Object.fromEntries(rSnap.docs.map(d => [d.data().video_id, d.data().reaction || "love"]));
      setReactions(reactionMap);
      setLiked(Object.fromEntries(Object.entries(reactionMap).map(([videoId, reaction]) => [videoId, reaction === "love"])));
    }).catch(error => console.error("Failed to load social state", error));
  }, [user]);

  const showNotice = (msg) => {
    setNotice(msg);
    window.clearTimeout(showNotice.t);
    showNotice.t = window.setTimeout(() => setNotice(""), 2200);
  };

  const allVideos = videos.length > 0 ? videos : DEMO_VIDEOS;
  const followedVideos = allVideos.filter(v => followed[v.creator?.id || v.creator_id] || v.creator_id === user?.uid);
  const display = tab === "following"
    ? (followedVideos.length ? followedVideos : allVideos)
    : tab === "trending"
      ? [...allVideos].sort((a, b) => ((b.likes_count || 0) + (b.happy_count || 0) + (b.wow_count || 0) + (b.comments_count || 0) + (b.shares_count || 0)) - ((a.likes_count || 0) + (a.happy_count || 0) + (a.wow_count || 0) + (a.comments_count || 0) + (a.shares_count || 0)))
      : allVideos;
  const feedModeNotice = tab === "following" && followedVideos.length === 0 && allVideos.length > 0
    ? "Follow creators to personalize this tab. Showing available posts for now."
    : "";

  const setReaction = async (id, reactionId = "love") => {
    const current = reactions[id] || (liked[id] ? "love" : null);
    const next = current === reactionId ? null : reactionId;
    const video = allVideos.find(v => v.id === id);
    const currentField = current ? reactionById(current).countField : null;
    const nextField = next ? reactionById(next).countField : null;
    setReactions(p => ({ ...p, [id]: next }));
    setLiked(p => ({ ...p, [id]: next === "love" }));
    setVideos(p => p.map(v => {
      if (v.id !== id) return v;
      const updated = { ...v };
      if (currentField) updated[currentField] = Math.max(0, (updated[currentField] || 0) - 1);
      if (nextField) updated[nextField] = (updated[nextField] || 0) + 1;
      return updated;
    }));
    if (!user || isDemoId(id)) return;
    const rid = `${user.uid}_${id}`;
    try {
      const updates = {};
      if (currentField) updates[currentField] = increment(-1);
      if (nextField) updates[nextField] = increment(1);
      if (Object.keys(updates).length) await updateDoc(doc(db, "videos", id), updates);
      if (next) {
        await setDoc(doc(db, "video_reactions", rid), { user_id: user.uid, video_id: id, reaction: next, created_at: serverTimestamp(), updated_at: serverTimestamp() });
        await createNotification({
          userId: video?.creator_id || user.uid,
          actorId: user.uid,
          type: "like",
          videoId: id,
          meta: video?.caption?.slice(0, 80) || "your post",
        });
      } else {
        await deleteDoc(doc(db, "video_reactions", rid));
      }
    } catch (err) { showNotice(err.message || "Could not update reaction."); }
  };

  const toggleLike = (id) => setReaction(id, "love");

  const handleCardPointerDown = (video) => {
    window.clearTimeout(pressTimer.current);
    pressTimer.current = window.setTimeout(() => setQuickActions(video), 520);
  };

  const handleCardPointerUp = (video) => {
    window.clearTimeout(pressTimer.current);
    const now = Date.now();
    if (now - (lastTap.current[video.id] || 0) < 320) {
      toggleLike(video.id);
      showNotice("Reacted to post.");
    }
    lastTap.current[video.id] = now;
  };

  const toggleSave = async (id) => {
    const isSaved = saved[id];
    const video = allVideos.find(v => v.id === id);
    setSaved(p => ({ ...p, [id]: !isSaved }));
    setVideos(p => p.map(v => v.id === id ? { ...v, saves_count: Math.max(0, (v.saves_count || 0) + (isSaved ? -1 : 1)) } : v));
    if (!user || isDemoId(id)) return;
    const sid = `${user.uid}_${id}`;
    try {
      if (isSaved) { await deleteDoc(doc(db, "video_saves", sid)); await updateDoc(doc(db, "videos", id), { saves_count: increment(-1) }); }
      else {
        await setDoc(doc(db, "video_saves", sid), { user_id: user.uid, video_id: id, created_at: serverTimestamp() });
        await updateDoc(doc(db, "videos", id), { saves_count: increment(1) });
        await createNotification({ userId: video?.creator_id, actorId: user.uid, type: "save", videoId: id, meta: video?.caption?.slice(0, 80) || "your post" });
      }
    } catch (err) { showNotice(err.message || "Could not update save."); }
  };

  const toggleFollow = async (cid) => {
    if (!user || cid === user.uid) return;
    const fid = `${user.uid}_${cid}`;
    const isF = followed[cid];
    setFollowed(p => ({ ...p, [cid]: !isF }));
    if (isDemoCreatorId(cid)) return;
    try {
      if (isF) {
        await deleteDoc(doc(db, "follows", fid));
        await updateDoc(doc(db, "profiles", cid), { followers_count: increment(-1) });
        await updateDoc(doc(db, "profiles", user.uid), { following_count: increment(-1) });
      } else {
        await setDoc(doc(db, "follows", fid), { follower_id: user.uid, following_id: cid, created_at: serverTimestamp() });
        await updateDoc(doc(db, "profiles", cid), { followers_count: increment(1) });
        await updateDoc(doc(db, "profiles", user.uid), { following_count: increment(1) });
        await createNotification({ userId: cid, actorId: user.uid, type: "follow" });
      }
    } catch (err) { showNotice(err.message || "Could not update follow."); }
  };

  return (
    <div style={{ height: "100%" }}>
      <div className="feed-wrap">
        {feedModeNotice && <div style={{ position: "absolute", top: 72, left: 18, right: 18, zIndex: 70, background: "rgba(21,14,32,0.88)", border: "1px solid rgba(201,168,76,0.25)", borderRadius: 14, padding: "9px 12px", color: "var(--gold-lt)", fontSize: 11, textAlign: "center" }}>{feedModeNotice}</div>}
        {display.length === 0 && <div className="empty-state" style={{ height: "100vh", display: "flex", flexDirection: "column", justifyContent: "center" }}><div className="empty-icon">✦</div><div className="empty-title">No posts here yet</div><div className="empty-sub">Follow creators or switch back to Discover</div></div>}
        {display.map((v, i) => {
          const name = v.creator?.full_name || v.creator?.username || "Creator";
          const [first, ...rest] = name.split(" "); const last = rest.join(" ");
          const pal = v.pal ?? (i % PALETTES.length);
          return (
            <div key={v.id} className="feed-card" onPointerDown={() => handleCardPointerDown(v)} onPointerUp={() => handleCardPointerUp(v)} onPointerCancel={() => window.clearTimeout(pressTimer.current)}>
              <div className="feed-video-bg" style={{ background: v.thumbnail_url ? `url(${v.thumbnail_url}) center/cover no-repeat` : PALETTES[pal] }}>
                {v.video_url && <video src={v.video_url} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} autoPlay muted={muted[v.id] !== false} loop playsInline controls={muted[v.id] === false} />}
                {!v.thumbnail_url && !v.video_url && (
                  <><div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.18 }}>
                    <svg width="160" height="280" viewBox="0 0 160 280" fill="none"><ellipse cx="80" cy="45" rx="30" ry="38" fill="rgba(255,255,255,0.7)" /><path d="M50 83 Q28 120 22 200 Q65 192 80 185 Q95 192 138 200 Q132 120 110 83 Q96 108 80 108 Q64 108 50 83Z" fill="rgba(255,255,255,0.5)" /><path d="M22 200 Q14 255 24 280 L55 265 L65 205 Q72 195 80 195 Q88 195 95 205 L105 265 L136 280 Q146 255 138 200Z" fill="rgba(255,255,255,0.4)" /></svg>
                  </div><div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.06 }}><span style={{ fontFamily: "var(--ff-impact)", fontSize: 180, color: "#fff", letterSpacing: -6 }}>VIO</span></div></>
                )}
              </div>
              <div className="feed-cinema" />
              <div className="edition-badge"><div className="edition-num">{String(i + 1).padStart(2, "0")}</div><div className="edition-label">Edition</div></div>
              <div className="feed-topbar">
                <div className="feed-logo">Atelier</div>
                <div className="feed-tabs-row">{[["discover", "Discover"], ["following", "Following"], ["trending", "Trending"]].map(([k, l]) => (<button key={k} className={`feed-tab ${tab === k ? "on" : ""}`} onClick={() => setTab(k)}>{l}</button>))}</div>
                <div className="feed-topbar-right"><button className="feed-icon-btn" onClick={onSearch}><IcoSearch /></button><button className="feed-icon-btn" onClick={onNotifications}><IcoBell /></button></div>
              </div>
              <div className="feed-action-tray">
                <button className="feed-action" onClick={() => toggleLike(v.id)}><div className={`feed-action-circle ${reactions[v.id] ? "lit" : ""}`}>{reactions[v.id] && reactions[v.id] !== "love" ? reactionById(reactions[v.id]).icon : <IcoHeart lit={!!reactions[v.id]} />}</div><span className="feed-action-num">{fmt(v.likes_count)}</span></button>
                <button className="feed-action" onClick={() => setCommentVideo(v)}><div className="feed-action-circle"><IcoComment /></div><span className="feed-action-num">{fmt(v.comments_count)}</span></button>
                <button className="feed-action" onClick={() => toggleSave(v.id)}><div className={`feed-action-circle ${saved[v.id] ? "lit" : ""}`}><IcoBookmark /></div><span className="feed-action-num">{fmt(v.saves_count || 0)}</span></button>
                <button className="feed-action" onClick={() => setShareVideoItem(v)}><div className="feed-action-circle"><IcoShare /></div><span className="feed-action-num">{fmt(v.shares_count || 0)}</span></button>
              </div>
              <div className="feed-editorial">
                <div className="feed-creator-giant">{first} <span>{last}</span></div>
                <div className="feed-handle-row">
                  <div className="feed-handle-av" style={{ background: PALETTES[pal], cursor: "pointer" }} onClick={() => v.creator?.id && user?.uid !== v.creator?.id && setViewCreator(v.creator.id)}>
                    {v.creator?.avatar_url ? <img src={v.creator.avatar_url} alt={name} /> : initials(name)}
                  </div>
                  <span className="feed-handle-text" style={{ cursor: "pointer" }} onClick={() => v.creator?.id && user?.uid !== v.creator?.id && setViewCreator(v.creator.id)}>@{v.creator?.username || "creator"}</span>
                  {user?.uid !== v.creator?.id && <button className={`feed-follow-pill ${followed[v.creator?.id] ? "following" : ""}`} onClick={() => toggleFollow(v.creator?.id)}>{followed[v.creator?.id] ? "Following" : "+ Follow"}</button>}
                </div>
                {v.caption && <p className="feed-caption">{v.caption}</p>}
                {v.tags?.length > 0 && <div className="feed-tags">{v.tags.map(t => <span key={t} className="feed-tag">{t.startsWith("#") ? t : `#${t}`}</span>)}</div>}
                <div className="feed-sound-row" onClick={() => setMuted(p => ({ ...p, [v.id]: p[v.id] === false }))} style={{ cursor: v.video_url ? "pointer" : "default" }}><div className="feed-vinyl" /><IcoMusic /><span className="feed-sound-text">{v.video_url ? (muted[v.id] === false ? "Sound on" : "Tap for sound") : (v.sound_name || "No sound")}{v.sound_name ? ` · ${v.sound_name}` : ""}</span></div>
              </div>
            </div>
          );
        })}
      </div>
      {notice && <div style={{ position: "absolute", left: 20, right: 20, bottom: 92, zIndex: 250, background: "rgba(21,14,32,0.94)", border: "1px solid rgba(201,168,76,0.25)", borderRadius: 14, padding: "11px 14px", color: "var(--gold-lt)", fontSize: 12, textAlign: "center", boxShadow: "0 10px 30px rgba(0,0,0,0.4)" }}>{notice}</div>}
      {commentVideo && <CommentsModal video={commentVideo} user={user} onClose={() => setCommentVideo(null)} />}
      {shareVideoItem && <ShareSheet video={shareVideoItem} user={user} onClose={() => setShareVideoItem(null)} onShared={msg => showNotice(msg)} />}
      {quickActions && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setQuickActions(null)}>
          <div className="modal-sheet">
            <div className="sheet-handle" />
            <div className="sheet-inner">
              <div className="sheet-title">Post Actions</div>
              <div style={{ display: "flex", gap: 8, justifyContent: "space-between", marginBottom: 18 }}>
                {REACTIONS.map(r => <button key={r.id} onClick={() => { setReaction(quickActions.id, r.id); setQuickActions(null); }} style={{ flex: 1, background: reactions[quickActions.id] === r.id ? "rgba(201,168,76,0.18)" : "rgba(255,255,255,0.05)", border: "1px solid var(--border)", borderRadius: 12, padding: "10px 6px", color: "var(--white)", cursor: "pointer" }} title={r.label}>{r.icon}</button>)}
              </div>
              <button className="modal-submit" onClick={() => { setShareVideoItem(quickActions); setQuickActions(null); }}>Share Post</button>
              <button className="modal-cancel" onClick={() => { toggleSave(quickActions.id); setQuickActions(null); }}>{saved[quickActions.id] ? "Remove Save" : "Save Post"}</button>
              <button className="modal-cancel" onClick={() => { setShareVideoItem(quickActions); setQuickActions(null); }}>Download / Send</button>
            </div>
          </div>
        </div>
      )}
      {viewCreator && <CreatorProfileModal creatorId={viewCreator} currentUser={user} onClose={() => setViewCreator(null)} onStartChat={conv => { setViewCreator(null); onStartChat?.(conv); }} />}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
//  ANALYTICS TAB
// ════════════════════════════════════════════════════════════
function AnalyticsTab({ user }) {
  const { analytics, videos, loading } = useCreatorAnalytics(user?.uid);
  if (loading) return <Spinner />;
  return (
    <div style={{ padding: "0 20px 100px" }}>
      <div className="analytics-grid">
        {[{ n: fmt(analytics?.totalViews || 0), l: "Total Views", icon: "👁" }, { n: fmt(analytics?.totalLikes || 0), l: "Total Likes", icon: "❤️" }, { n: fmt(analytics?.totalComments || 0), l: "Comments", icon: "💬" }, { n: fmt(analytics?.followers || 0), l: "Followers", icon: "👥" }].map(s => (
          <div key={s.l} className="analytics-card"><div className="analytics-card-icon">{s.icon}</div><div className="analytics-card-n">{s.n}</div><div className="analytics-card-l">{s.l}</div></div>
        ))}
      </div>
      {analytics?.rating && <div style={{ background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.2)", borderRadius: 14, padding: 14, marginBottom: 20, display: "flex", alignItems: "center", gap: 12 }}><span style={{ fontSize: 28 }}>⭐</span><div><div style={{ fontFamily: "var(--ff-serif)", fontSize: 24, fontWeight: 600, color: "var(--gold-lt)" }}>{analytics.rating}</div><div style={{ fontSize: 11, color: "var(--muted)", letterSpacing: "0.1em", textTransform: "uppercase" }}>Average Rating</div></div></div>}
      {videos.length > 0 && (<><div className="section-head">Top Posts</div>{videos.slice(0, 8).map((v, i) => (
        <div key={v.id} className="video-perf-row">
          <div className="video-perf-thumb">{v.thumbnail_url ? <img src={v.thumbnail_url} alt="" /> : <div style={{ width: "100%", height: "100%", background: PALETTES[i % PALETTES.length] }} />}</div>
          <div className="video-perf-info"><div className="video-perf-title">{v.caption || `Post #${i + 1}`}</div><div className="video-perf-stats"><span className="video-perf-stat">❤️ {fmt(v.likes_count || 0)}</span><span className="video-perf-stat">💬 {fmt(v.comments_count || 0)}</span><span className="video-perf-stat">👁 {fmt(v.views_count || 0)}</span></div></div>
          <div style={{ fontSize: 11, color: "var(--muted)", flexShrink: 0 }}>#{i + 1}</div>
        </div>
      ))}</>)}
      {videos.length === 0 && <div className="empty-state"><div className="empty-icon">📊</div><div className="empty-title">No data yet</div><div className="empty-sub">Post your first video to see analytics</div></div>}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
//  ORDERS TAB
// ════════════════════════════════════════════════════════════
function OrdersTab({ user, profile }) {
  const isCreator = CREATOR_ROLES.includes(profile?.role);
  const { orders: customerOrders, loading: lC, reload: rC } = useCustomerOrders(!isCreator ? user?.uid : null);
  const { orders: creatorOrders,  loading: lCr, reload: rCr } = useCreatorOrders(isCreator ? user?.uid : null);
  const [payOrder, setPayOrder] = useState(null);
  const orders  = isCreator ? creatorOrders  : customerOrders;
  const loading = isCreator ? lCr            : lC;

  const handleComplete = async (requestId) => {
    await updateOrderStatus(requestId, "completed");
    isCreator ? rCr() : rC();
  };

  if (loading) return <Spinner />;
  return (
    <>
      <div style={{ padding: "0 20px 100px" }}>
        {orders.length === 0 && <div className="empty-state"><div className="empty-icon">📦</div><div className="empty-title">No orders yet</div><div className="empty-sub">{isCreator ? "Accepted commissions appear here" : "Your active commissions appear here"}</div></div>}
        {orders.map(o => {
          const requestId  = isCreator ? o.request?.id    : o.id;
          const status     = isCreator ? o.request?.status : o.status;
          const title      = isCreator ? o.request?.title  : o.title;
          const category   = isCreator ? o.request?.category : o.category;
          const price      = isCreator ? o.price           : o.accepted_offer?.[0]?.price;
          const otherParty = isCreator ? o.request?.customer : o.accepted_offer?.[0]?.creator;
          const canPay     = !isCreator && status === "in_progress" && price;
          const isPaid     = status === "paid";
          return (
            <div key={o.id} className={`order-card status-${status}`}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
                <div><span className="req-cat" style={{ marginBottom: 4, display: "inline-block" }}>{category}</span><div style={{ fontFamily: "var(--ff-serif)", fontSize: 16, fontWeight: 600, lineHeight: 1.3 }}>{title}</div></div>
                {price && <div className="req-budget">GH₵ {Number(price).toLocaleString()}</div>}
              </div>
              <span className={`order-status-badge ${isPaid ? "paid" : status}`}>{isPaid ? "Paid" : status?.replace("_", " ")}</span>
              {otherParty && (
                <div className="order-creator-row">
                  <div className="order-creator-av" style={{ background: PALETTES[0] }}>{otherParty.avatar_url ? <img src={otherParty.avatar_url} alt="" /> : initials(otherParty.full_name || otherParty.username)}</div>
                  <div><div style={{ fontSize: 12, fontWeight: 500 }}>{otherParty.full_name || otherParty.username}</div><div style={{ fontSize: 10, color: "var(--muted)" }}>{isCreator ? "Customer" : "Creator"}</div></div>
                  <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                    {canPay && <button onClick={() => setPayOrder(o)} style={{ background: "linear-gradient(135deg,#059669,#047857)", border: "none", borderRadius: 100, padding: "5px 14px", color: "#fff", fontSize: 10, fontWeight: 700, cursor: "pointer", letterSpacing: "0.08em" }}>💳 Pay Now</button>}
                    {isCreator && status === "in_progress" && <button className="order-complete-btn" onClick={() => handleComplete(requestId)}>✓ Done</button>}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {payOrder && <PaymentModal order={payOrder} user={user} profile={profile} onClose={() => setPayOrder(null)} onPaid={() => { setPayOrder(null); isCreator ? rCr() : rC(); }} />}
    </>
  );
}

// ════════════════════════════════════════════════════════════
//  PROFILE SCREEN
// ════════════════════════════════════════════════════════════
function ProfileScreen({ user, profile, onSignOut, onProfileUpdated, onSettings }) {
  const isCreator = CREATOR_ROLES.includes(profile?.role);
  const [tab, setTab]     = useState("portfolio");
  const [videos, setVideos] = useState([]);
  const [showEdit, setShowEdit] = useState(false);
  const fileRef = useRef();
  const dp = profile || {};
  const fullName = dp.full_name || user?.email?.split("@")[0] || "My Profile";
  const [first, ...rest] = fullName.split(" "); const last = rest.join(" ");
  const portPals = PALETTES;

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "videos"), where("creator_id", "==", user.uid), where("is_published", "==", true), orderBy("created_at", "desc"));
    getDocs(q).then(snap => setVideos(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, [user, profile]);

  const uploadAvatar = async (e) => {
    const file = e.target.files[0];
    if (!file || !user) return;
    const ext  = file.name.split(".").pop();
    const path = `avatars/${user.uid}/avatar.${ext}`;
    const task = uploadBytesResumable(sRef(storage, path), file);
    task.on("state_changed", null, null, async () => {
      const url = await getDownloadURL(task.snapshot.ref);
      await updateDoc(doc(db, "profiles", user.uid), { avatar_url: url });
      onProfileUpdated();
    });
  };

  const shareProfile = async () => {
    try {
      await shareItem({ title: `${fullName} on VioFashion`, text: `Check out ${fullName}'s VioFashion profile.` });
    } catch (err) {
      if (err.name !== "AbortError") window.alert("Could not share this profile.");
    }
  };

  const tabs = [{ id: "portfolio", label: "Works" }, { id: "orders", label: "Orders" }, ...(isCreator ? [{ id: "analytics", label: "Analytics" }] : []), { id: "reviews", label: "Reviews" }];

  return (
    <>
      <div className="profile-scroll">
        <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={uploadAvatar} />
        <div className="profile-hero">
          <div className="profile-hero-bg" style={{ background: dp.banner_url ? `url(${dp.banner_url}) center/cover` : PALETTES[0] }}>
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.1 }}><span style={{ fontFamily: "var(--ff-impact)", fontSize: 160, color: "#fff", letterSpacing: -6 }}>ATELIER</span></div>
          </div>
          <div className="profile-hero-grad" />
          <div className="profile-hero-name">{first}<br />{last}</div>
          <div style={{ position: "absolute", bottom: -30, right: 20, zIndex: 10, width: 72, height: 72, borderRadius: "50%", border: "2px solid var(--gold)", overflow: "hidden", boxShadow: "0 8px 30px rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 700, cursor: "pointer", background: PALETTES[0], flexShrink: 0 }} onClick={() => fileRef.current?.click()}>
            {dp.avatar_url ? <img src={dp.avatar_url} alt={fullName} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : initials(fullName)}
            <div style={{ position: "absolute", bottom: 0, right: 0, width: 20, height: 20, background: "var(--violet)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid var(--deep)", fontSize: 10 }}>✎</div>
          </div>
        </div>
        <div className="profile-meta">
          <div className="profile-handle-row"><span className="profile-handle">@{dp.username || user?.email?.split("@")[0]}{dp.location && ` · ${dp.location}`}</span>{dp.is_verified && <span className="verified-mark">✓</span>}</div>
          <div className="profile-role-chip">{ROLE_EMOJI[dp.role] || "🛍️"} {(dp.role || "customer").replace("_", " ")}</div>
          <p className="profile-bio" style={!dp.bio ? { opacity: 0.4, fontStyle: "italic" } : {}}>{dp.bio || "Tap Edit Profile to add your bio…"}</p>
          <div className="profile-stats-row">
            {[[fmt(dp.followers_count || 0), "Followers"], [fmt(dp.following_count || 0), "Following"], [fmt(dp.orders_count || 0), "Orders"], [dp.rating ? `${dp.rating} ★` : "—", "Rating"]].map(([n, l]) => (
              <div key={l} className="profile-stat"><span className="profile-stat-n">{n}</span><span className="profile-stat-l">{l}</span></div>
            ))}
          </div>
          <div className="profile-action-row"><button className="btn-gold" onClick={() => setShowEdit(true)}>Edit Profile</button><button className="btn-ghost" onClick={shareProfile}>Share</button><button className="btn-ghost" onClick={onSettings} title="Settings"><IcoGear /></button><button className="btn-danger" onClick={onSignOut} title="Sign out"><IcoLogout /></button></div>
          {dp.services?.length > 0 && <div className="service-chips">{dp.services.map(s => <span key={s} className="service-chip">{s}</span>)}</div>}
        </div>
        <div className="profile-tabs">{tabs.map(t => (<button key={t.id} onClick={() => setTab(t.id)} className="profile-tab" style={{ color: tab === t.id ? "var(--white)" : "var(--muted)", borderBottom: `1.5px solid ${tab === t.id ? "var(--gold)" : "transparent"}` }}>{t.label}</button>))}</div>
        {tab === "portfolio" && (
          <div style={{ padding: "0 20px" }}>
            <div className="section-head">Works</div>
            {videos.length > 0 ? (
              <div className="portfolio-grid">{videos.map((v, i) => (
                <div key={v.id} className="p-item" style={{ background: v.thumbnail_url ? `url(${v.thumbnail_url}) center/cover` : portPals[i % portPals.length] }}>
                  {!v.thumbnail_url && <div className="p-item-inner"><span style={{ fontFamily: "var(--ff-serif)", fontSize: i === 0 ? 36 : 22, fontStyle: "italic", color: "rgba(255,255,255,0.2)" }}>#{i + 1}</span></div>}
                  <div className="p-overlay"><span style={{ fontSize: 10, color: "rgba(255,255,255,0.8)" }}>❤ {fmt(v.likes_count)}</span></div>
                </div>
              ))}</div>
            ) : <div className="empty-state"><div className="empty-icon">🎬</div><div className="empty-title">No posts yet</div><div className="empty-sub">Tap the gold + button to share your first post</div></div>}
            <div style={{ height: 100 }} />
          </div>
        )}
        {tab === "orders"    && <OrdersTab user={user} profile={profile} />}
        {tab === "analytics" && isCreator && <AnalyticsTab user={user} />}
        {tab === "reviews"   && <div style={{ padding: "0 20px 100px" }}><div className="section-head">Reviews</div><div className="empty-state"><div className="empty-icon">⭐</div><div className="empty-title">No reviews yet</div><div className="empty-sub">Reviews from clients appear after completed orders</div></div></div>}
      </div>
      {showEdit && <EditProfileModal user={user} profile={profile} onClose={() => setShowEdit(false)} onSaved={() => { onProfileUpdated(); setShowEdit(false); }} />}
    </>
  );
}

// ════════════════════════════════════════════════════════════
//  MARKET SCREEN
// ════════════════════════════════════════════════════════════
function MarketScreen({ user, profile }) {
  const [filter, setFilter]           = useState("All");
  const [search, setSearch]           = useState("");
  const [requests, setRequests]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [modal, setModal]             = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [offerRequest, setOfferRequest]       = useState(null);
  const [form, setForm] = useState({ title: "", description: "", category: "Tailoring", budget: "", isUrgent: false });
  const [reqImages, setReqImages]   = useState([]);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [posting, setPosting]       = useState(false);
  const imgRef = useRef();
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));
  const CATS = ["All", "Tailoring", "Shoemaking", "Makeup", "Design", "Styling"];

  const load = useCallback(async () => {
    setLoading(true);
    let q = query(collection(db, "requests"), where("status", "==", "open"), orderBy("created_at", "desc"));
    if (filter !== "All") q = query(collection(db, "requests"), where("status", "==", "open"), where("category", "==", filter), orderBy("created_at", "desc"));
    const snap = await getDocs(q);
    const results = await Promise.all(snap.docs.map(async (d) => {
      const r = { id: d.id, ...d.data() };
      if (r.customer_id) { const ps = await getDoc(doc(db, "profiles", r.customer_id)); r.customer = ps.exists() ? { id: ps.id, ...ps.data() } : null; }
      return r;
    }));
    const needle = search.trim().toLowerCase();
    setRequests(needle ? results.filter(r =>
      (r.title || "").toLowerCase().includes(needle) ||
      (r.description || "").toLowerCase().includes(needle) ||
      (r.category || "").toLowerCase().includes(needle)
    ) : results);
    setLoading(false);
  }, [filter, search]);

  useEffect(() => { load(); }, [load]);

  const uploadReqImage = async (file) => {
    if (!file || !user) return null;
    if (file.size > MAX_UPLOAD_BYTES) return null;
    setUploadingImg(true);
    const ext = file.name.split(".").pop();
    const path = `request-images/${user.uid}/${Date.now()}.${ext}`;
    const task = uploadBytesResumable(sRef(storage, path), file);
    return new Promise((resolve) => {
      task.on("state_changed", null, () => { setUploadingImg(false); resolve(null); }, async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        setUploadingImg(false); resolve(url);
      });
    });
  };

  const handleAddImage = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    const url = await uploadReqImage(file);
    if (url) setReqImages(p => [...p, url]);
  };

  const post = async () => {
    if (!form.title || !user) return;
    setPosting(true);
    const reqRef = await addDoc(collection(db, "requests"), {
      customer_id: user.uid, category: form.category,
      title: form.title, description: form.description,
      budget: form.budget ? parseFloat(form.budget) : null,
      currency: "GHS", is_urgent: form.isUrgent,
      images: reqImages, status: "open", bids_count: 0,
      created_at: serverTimestamp(), updated_at: serverTimestamp(),
    });
    await notifyCreators({
      actorId: user.uid,
      type: "commission",
      requestId: reqRef.id,
      meta: form.title,
    });
    setForm({ title: "", description: "", category: "Tailoring", budget: "", isUrgent: false });
    setReqImages([]); setModal(false); load(); setPosting(false);
  };

  return (
    <>
      <div className="market-scroll">
        <div className="market-masthead">
          <div className="market-eyebrow">Fashion Atelier</div>
          <div className="market-title">The<br /><b>Marketplace</b></div>
          <div className="market-search"><IcoSearch /><input placeholder="Search designers, tailors, requests…" value={search} onChange={e => setSearch(e.target.value)} /></div>
        </div>
        <div className="market-filters">{CATS.map(f => <button key={f} className={`mf-chip ${filter === f ? "on" : ""}`} onClick={() => setFilter(f)}>{f}</button>)}</div>
        <div className="post-request-card" onClick={() => setModal(true)}>
          <div className="prc-title">Commission a Creator</div>
          <div className="prc-sub">Post your custom fashion request · Receive bids within hours</div>
          <div className="prc-input-row"><input className="prc-input" placeholder="Describe your vision…" readOnly /><button className="prc-btn">Post ✦</button></div>
        </div>
        <div style={{ padding: "0 20px 8px" }}><div className="section-head">Open Commissions</div></div>
        {loading ? <Spinner /> : (
          <div className="requests-grid">
            {requests.length === 0 && <div className="empty-state"><div className="empty-icon">🧵</div><div className="empty-title">No requests yet</div><div className="empty-sub">Be the first to post a commission</div></div>}
            {requests.map(r => (
              <div key={r.id} className="req-card" onClick={() => setSelectedRequest(r)}>
                <div className="req-top"><div style={{ flex: 1 }}><span className="req-cat">{r.category}</span><div className="req-title">{r.title}</div></div>{r.budget && <div className="req-budget">GH₵ {Number(r.budget).toLocaleString()}</div>}</div>
                {r.description && <p className="req-desc">{r.description.slice(0, 100)}{r.description.length > 100 ? "…" : ""}</p>}
                <div className="req-bottom">
                  <div className="req-meta-left"><span className="req-meta-item">{timeAgo(r.created_at)}</span><span className="req-meta-item">{r.bids_count || 0} bids</span>{r.is_urgent && <span className="req-urgent">Urgent</span>}</div>
                  {user?.uid !== r.customer_id && <button className="req-offer-btn" onClick={e => { e.stopPropagation(); setOfferRequest(r); }}>Make Offer</button>}
                </div>
              </div>
            ))}
          </div>
        )}
        <div style={{ height: 100 }} />
      </div>

      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal-sheet"><div className="sheet-handle" />
            <div className="sheet-scroll"><div className="sheet-inner">
              <div className="sheet-title">Post a Commission</div>
              <div className="sheet-sub">Describe what you need — creators will bid</div>
              <input className="modal-input" placeholder="Title — e.g. Custom Kente Wedding Gown" value={form.title} onChange={set("title")} />
              <textarea className="modal-input" placeholder="Describe your vision in detail…" rows={3} value={form.description} onChange={set("description")} />
              <div className="modal-row">
                <select className="modal-input" value={form.category} onChange={set("category")} style={{ flex: 1 }}>{["Tailoring", "Shoemaking", "Makeup", "Design", "Styling"].map(c => <option key={c} value={c} style={{ background: "#150E20" }}>{c}</option>)}</select>
                <input className="modal-input" placeholder="Budget (GH₵)" type="number" value={form.budget} onChange={set("budget")} style={{ flex: 1 }} />
              </div>
              <label className="modal-label">Reference Images (optional)</label>
              <input ref={imgRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleAddImage} />
              <div className="img-preview-row">
                {reqImages.map((url, i) => (<div key={i} className="img-preview-thumb"><img src={url} alt="ref" /><button className="img-preview-remove" onClick={() => setReqImages(p => p.filter((_, j) => j !== i))}>×</button></div>))}
                {reqImages.length < 4 && <div className="img-upload-add" onClick={() => imgRef.current?.click()}>{uploadingImg ? <div className="spin" style={{ width: 18, height: 18 }} /> : "+"}</div>}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, padding: "10px 14px", background: "rgba(248,113,113,0.06)", border: `1px solid ${form.isUrgent ? "rgba(248,113,113,0.3)" : "var(--border)"}`, borderRadius: 12, cursor: "pointer" }} onClick={() => setForm(p => ({ ...p, isUrgent: !p.isUrgent }))}>
                <div style={{ width: 20, height: 20, borderRadius: 6, background: form.isUrgent ? "var(--danger)" : "rgba(255,255,255,0.08)", border: `1px solid ${form.isUrgent ? "var(--danger)" : "var(--border)"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{form.isUrgent && <IcoCheck />}</div>
                <div><div style={{ fontSize: 12, fontWeight: 600, color: form.isUrgent ? "var(--danger)" : "var(--white)" }}>Mark as Urgent</div><div style={{ fontSize: 11, color: "var(--muted)" }}>Creators will prioritise urgent commissions</div></div>
              </div>
              <button className="modal-submit" onClick={post} disabled={posting}>{posting ? "Posting…" : "Post Commission ✦"}</button>
              <button className="modal-cancel" onClick={() => setModal(false)}>Cancel</button>
            </div></div>
          </div>
        </div>
      )}
      {selectedRequest && <RequestDetailModal request={selectedRequest} user={user} profile={profile} onClose={() => { setSelectedRequest(null); load(); }} />}
      {offerRequest    && <MakeOfferModal request={offerRequest} user={user} onClose={() => setOfferRequest(null)} onSuccess={() => { setOfferRequest(null); load(); }} />}
    </>
  );
}

// ════════════════════════════════════════════════════════════
//  CHAT SCREEN
// ════════════════════════════════════════════════════════════
function ChatScreen({ user, pendingConv, onConvOpened }) {
  const [convs, setConvs]       = useState([]);
  const [open, setOpen]         = useState(null);
  const [messages, setMessages] = useState([]);
  const [msg, setMsg]           = useState("");
  const [queryStr, setQueryStr] = useState("");
  const [userQuery, setUserQuery] = useState("");
  const [userResults, setUserResults] = useState([]);
  const [callNotice, setCallNotice] = useState("");
  const [recording, setRecording] = useState(false);
  const [voiceUploading, setVoiceUploading] = useState(false);
  const [recordingBlob, setRecordingBlob] = useState(null);
  const [showVoiceOptions, setShowVoiceOptions] = useState(false);
  const [loading, setLoading]   = useState(true);
  const [viewCreator, setViewCreator] = useState(null);
  const endRef = useRef();
  const recorderRef = useRef(null);
  const voiceChunksRef = useRef([]);

  useEffect(() => {
    if (pendingConv && !loading) { setOpen(pendingConv); onConvOpened?.(); }
  }, [pendingConv, loading, onConvOpened]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "conversations"), where("participants", "array-contains", user.uid), orderBy("last_message_at", "desc"));
    const unsub = onSnapshot(q, async (snap) => {
      const results = await Promise.all(snap.docs.map(async (d) => {
        const c = { id: d.id, ...d.data() };
        const otherId = c.participant1 === user.uid ? c.participant2 : c.participant1;
        if (otherId) { const ps = await getDoc(doc(db, "profiles", otherId)); c.other = ps.exists() ? { id: ps.id, ...ps.data() } : null; }
        return c;
      }));
      setConvs(results); setLoading(false);
    }, (error) => {
      console.error("Failed to load conversations", error);
      setConvs([]);
      setLoading(false);
    });
    return unsub;
  }, [user]);

  useEffect(() => {
    if (!open) return;
    const q = query(collection(db, "messages"), where("conversation_id", "==", open.id), orderBy("created_at", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }, (error) => {
      console.error("Failed to load messages", error);
      setMessages([]);
    });
    return unsub;
  }, [open]);

  useEffect(() => {
    if (!user) return;
    const needle = userQuery.trim().toLowerCase();
    const t = window.setTimeout(async () => {
      const snap = await getDocs(query(collection(db, "profiles"), limit(120)));
      setUserResults(snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(p => p.id !== user.uid)
        .filter(p => !needle || (p.full_name || "").toLowerCase().includes(needle) || (p.username || "").toLowerCase().includes(needle))
        .slice(0, needle ? 10 : 20));
    }, needle ? 220 : 80);
    return () => window.clearTimeout(t);
  }, [userQuery, user]);

  const messageRecipientId = (conv) => conv?.participants?.find(id => id !== user?.uid) || (conv?.participant1 === user?.uid ? conv?.participant2 : conv?.participant1);

  const sendMessage = async (content, extra = {}) => {
    if (!content?.trim() || !open || !user) return;
    const clean = content.trim();
    await addDoc(collection(db, "messages"), {
      conversation_id: open.id,
      sender_id: user.uid,
      content: clean,
      type: extra.type || "text",
      audio_url: extra.audio_url || null,
      created_at: serverTimestamp(),
    });
    await updateDoc(doc(db, "conversations", open.id), { last_message: extra.type === "voice" ? "Voice note" : clean, last_message_at: serverTimestamp() });
    await createNotification({ userId: messageRecipientId(open), actorId: user.uid, type: "message", conversationId: open.id, meta: clean.slice(0, 100) });
  };

  const send = async () => {
    if (!msg.trim()) return;
    const c = msg; setMsg("");
    await sendMessage(c);
  };

  const startConversation = async (person) => {
    if (!user || !person?.id) return;
    try {
      const conv = await getOrCreateConversation(user.uid, person.id);
      setOpen({ ...conv, other: person, participants: conv.participants || [user.uid, person.id] });
      setUserQuery("");
      setUserResults([]);
      setCallNotice("");
    } catch (error) {
      console.error("Failed to start conversation", error);
      setCallNotice(error?.message || "Could not start this conversation. Please try again.");
      window.setTimeout(() => setCallNotice(""), 3600);
    }
  };

  const uploadVoiceNote = async (blob) => {
    if (!user || !open) return;
    if (blob.size > MAX_UPLOAD_BYTES) { setCallNotice(`Voice note must be ${MAX_UPLOAD_LABEL} or smaller.`); return; }
    setVoiceUploading(true);
    const path = `voice-notes/${user.uid}/${Date.now()}.webm`;
    const task = uploadBytesResumable(sRef(storage, path), blob, { contentType: blob.type || "audio/webm" });
    task.on("state_changed", null, (error) => {
      setCallNotice(storageErrorMessage(error));
      setVoiceUploading(false);
    }, async () => {
      const url = await getDownloadURL(task.snapshot.ref);
      await sendMessage("Voice note", { type: "voice", audio_url: url });
      setVoiceUploading(false);
    });
  };

  const sendVoiceNote = () => {
    if (recordingBlob) uploadVoiceNote(recordingBlob);
    setShowVoiceOptions(false);
    setRecordingBlob(null);
  };

  const cancelVoiceNote = () => {
    setShowVoiceOptions(false);
    setRecordingBlob(null);
  };

  const toggleRecording = async () => {
    if (recording) {
      recorderRef.current?.stop();
      setRecording(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      voiceChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      recorder.ondataavailable = e => e.data?.size && voiceChunksRef.current.push(e.data);
      recorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop());
        const blob = new Blob(voiceChunksRef.current, { type: "audio/webm" });
        setRecordingBlob(blob);
        setShowVoiceOptions(true);
      };
      recorder.start();
      setRecording(true);
    } catch {
      setCallNotice("Microphone permission is needed for voice notes.");
      window.setTimeout(() => setCallNotice(""), 2400);
    }
  };

  const visibleConvs = queryStr.trim()
    ? convs.filter(c => ((c.other?.full_name || c.other?.username || "") + " " + (c.last_message || "")).toLowerCase().includes(queryStr.trim().toLowerCase()))
    : convs;

  const startCall = (kind) => {
    setCallNotice(`${kind} calls are queued for beta. Chat is live now.`);
    window.setTimeout(() => setCallNotice(""), 2400);
  };

  return (
    <div className="chat-outer">
      <div className="chat-head"><div className="chat-head-title">Messages</div><div className="chat-search-bar"><IcoSearch /><input placeholder="Search conversations..." value={queryStr} onChange={e => setQueryStr(e.target.value)} /></div><div className="chat-search-bar" style={{ marginTop: 10 }}><IcoPlus /><input placeholder="Find users to message..." value={userQuery} onChange={e => setUserQuery(e.target.value)} /></div></div>
      <div className="chat-list-area">
        {userResults.length > 0 && (
          <div style={{ padding: "0 20px 12px" }}>
            <div className="search-section-label">Start Chat</div>
            {userResults.map((p, i) => (
              <div key={p.id} className="chat-row" onClick={() => startConversation(p)}>
                <div className="chat-av" style={{ background: PALETTES[i % PALETTES.length] }}>{p.avatar_url ? <img src={p.avatar_url} alt="" /> : initials(p.full_name || p.username)}</div>
                <div className="chat-row-content"><div className="chat-row-top"><span className="chat-row-name">{p.full_name || p.username}</span></div><div className="chat-row-preview">@{p.username}</div></div>
              </div>
            ))}
          </div>
        )}
        {loading && <Spinner />}
        {callNotice && !open && <div style={{ margin: "0 20px 12px", background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)", color: "#ff8a8a", borderRadius: 12, padding: "10px 12px", fontSize: 13 }}>{callNotice}</div>}
        {!loading && convs.length === 0 && <div className="empty-state"><div className="empty-icon">💬</div><div className="empty-title">No messages yet</div><div className="empty-sub">Start a conversation from a creator's profile</div></div>}
        {!loading && convs.length > 0 && visibleConvs.length === 0 && <div className="empty-state"><div className="empty-icon">🔎</div><div className="empty-title">No matches</div><div className="empty-sub">Try another conversation search</div></div>}
        {visibleConvs.map((c, i) => {
          const o = c.other; if (!o) return null;
          return (
            <div key={c.id} className="chat-row" onClick={() => setOpen(c)}>
              <div className="chat-av" style={{ background: PALETTES[i % PALETTES.length] }}>{o.avatar_url ? <img src={o.avatar_url} alt="" /> : initials(o.full_name || o.username)}</div>
              <div className="chat-row-content">
                <div className="chat-row-top"><span className="chat-row-name">{o.full_name || o.username}</span><span className="chat-row-time">{timeAgo(c.last_message_at)}</span></div>
                <div className="chat-row-preview">{c.last_message || "Start a conversation"}</div>
              </div>
            </div>
          );
        })}
      </div>
      {open && (() => {
        const o = open.other;
        const pal = Math.max(0, convs.findIndex(c => c.id === open.id)) % PALETTES.length;
        return (
          <div className="chat-window open">
            <div className="chat-win-head">
              <button className="chat-back-btn" onClick={() => setOpen(null)}><IcoBack /></button>
              <button className="chat-win-person" onClick={() => o?.id && setViewCreator(o.id)} title="View profile">
                <span className="chat-win-av" style={{ background: PALETTES[pal] }}>{o?.avatar_url ? <img src={o.avatar_url} alt="" /> : initials(o?.full_name || o?.username)}</span>
                <span className="chat-win-info"><span className="chat-win-name">{o?.full_name || o?.username}</span><span className="chat-win-status">● Active</span></span>
              </button>
              <div className="call-row"><button className="call-ico" onClick={() => startCall("Voice")}><IcoPhone /></button><button className="call-ico" onClick={() => startCall("Video")}><IcoVid /></button></div>
            </div>
            {callNotice && <div style={{ margin: "10px 16px 0", background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.25)", color: "var(--gold-lt)", borderRadius: 12, padding: "9px 12px", fontSize: 12 }}>{callNotice}</div>}
            <div className="msgs-area">
              {messages.map(m => {
                const isOut = m.sender_id === user?.uid;
                return (
                  <div key={m.id} className={`msg-wrap ${isOut ? "out" : "inc"}`}>
                    {!isOut && <div style={{ width: 26, height: 26, borderRadius: 8, flexShrink: 0, alignSelf: "flex-end", background: PALETTES[pal], display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700 }}>{initials(o?.full_name || o?.username)}</div>}
                    <div><div className="msg-bubble">{m.type === "voice" && m.audio_url ? <audio controls src={m.audio_url} style={{ width: 180 }} /> : m.content}</div><div className="msg-time">{timeAgo(m.created_at)}</div></div>
                  </div>
                );
              })}
              <div ref={endRef} />
            </div>
            <div className="chat-inp-bar">
              <EmojiPicker onPick={e => setMsg(p => `${p}${e}`)} />
              <input className="chat-inp" placeholder="Write a message…" value={msg} onChange={e => setMsg(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} />
              {recording ? (
                <>
                  <button className="chat-send" onClick={() => { recorderRef.current?.stop(); }} title="Stop recording" style={{ background: "var(--danger)" }}>■</button>
                  <button className="chat-send" onClick={() => { recorderRef.current?.stop(); setRecording(false); setRecordingBlob(new Blob(voiceChunksRef.current, { type: "audio/webm" })); uploadVoiceNote(new Blob(voiceChunksRef.current, { type: "audio/webm" })); }} title="Send immediately" style={{ background: "var(--green)" }}><IcoSend /></button>
                </>
              ) : (
                <>
                  <button className="chat-send" onClick={toggleRecording} title="Voice note">🎙</button>
                  <button className="chat-send" onClick={send}><IcoSend /></button>
                </>
              )}
            </div>
            {showVoiceOptions && (
              <div className="modal-overlay" style={{ zIndex: 600 }}>
                <div className="modal-sheet" style={{ maxWidth: 300, textAlign: "center" }}>
                  <div className="sheet-handle" />
                  <div className="sheet-inner">
                    <div className="sheet-title">Voice Note</div>
                    <div className="sheet-sub">What would you like to do with your recording?</div>
                    <div className="modal-row">
                      <button className="modal-submit" onClick={sendVoiceNote} style={{ background: "var(--green)" }}>Send ✦</button>
                      <button className="modal-cancel" onClick={cancelVoiceNote}>Delete</button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {viewCreator && <CreatorProfileModal creatorId={viewCreator} currentUser={user} onClose={() => setViewCreator(null)} onStartChat={conv => { setViewCreator(null); setOpen({ ...conv, other: o, participants: conv.participants || open.participants }); }} />}
          </div>
        );
      })()}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
//  LIVE SCREEN
// ════════════════════════════════════════════════════════════
function LiveScreen({ user, profile }) {
  const [viewers, setViewers]     = useState(3847);
  const [liked, setLiked]         = useState(false);
  const [saved, setSaved]         = useState(false);
  const [followed, setFollowed]   = useState(false);
  const [chatMsg, setChatMsg]     = useState("");
  const [ticker, setTicker]       = useState(DEMO_TICKERS);
  const [notice, setNotice]       = useState("");
  const [showGoLive, setShowGoLive] = useState(false);
  const [activeStream, setActiveStream] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const liveVideoRef = useRef(null);
  const isCreator = CREATOR_ROLES.includes(profile?.role);
  const doubled   = [...ticker, ...ticker];
  const showNotice = useCallback((msg) => { setNotice(msg); window.setTimeout(() => setNotice(""), 2200); }, []);

  useEffect(() => { const t = setInterval(() => setViewers(v => v + Math.floor(Math.random() * 8 - 2)), 2200); return () => clearInterval(t); }, []);
  useEffect(() => {
    const q = query(collection(db, "livestreams"), where("is_active", "==", true), orderBy("created_at", "desc"), limit(1));
    const unsub = onSnapshot(q, (snap) => {
      if (activeStream?.creator_id === user?.uid) return;
      const stream = snap.docs[0] ? { id: snap.docs[0].id, ...snap.docs[0].data() } : null;
      if (stream) setActiveStream(stream);
    }, (error) => console.error("Failed to load live streams", error));
    return unsub;
  }, [activeStream?.creator_id, user?.uid]);
  useEffect(() => {
    if (!activeStream?.id) return;
    const q = query(collection(db, "livestream_messages"), where("stream_id", "==", activeStream.id), orderBy("created_at", "desc"), limit(12));
    const unsub = onSnapshot(q, (snap) => {
      const rows = snap.docs.map(d => d.data()).map(m => ({ user: m.username || "Viewer", msg: m.content || "" }));
      if (rows.length) setTicker(rows);
    }, (error) => console.error("Failed to load live chat", error));
    return unsub;
  }, [activeStream?.id]);
  useEffect(() => {
    if (!activeStream || activeStream.creator_id !== user?.uid) return;
    let mounted = true;
    let currentStream = null;
    navigator.mediaDevices?.getUserMedia({ video: true, audio: true })
      .then(stream => {
        if (!mounted) return;
        currentStream = stream;
        setLocalStream(stream);
        if (liveVideoRef.current) liveVideoRef.current.srcObject = stream;
      })
      .catch(() => showNotice("Camera and microphone permission are needed to broadcast."));
    return () => {
      mounted = false;
      currentStream?.getTracks?.().forEach(track => track.stop());
    };
  }, [activeStream, user?.uid, showNotice]);

  const handleEndLive = async () => { if (!activeStream) return; localStream?.getTracks?.().forEach(track => track.stop()); setLocalStream(null); await endLiveStream(activeStream.id); setActiveStream(null); };
  const sendLiveChat = async () => {
    const content = chatMsg.trim();
    if (!content) return;
    setTicker(p => [{ user: profile?.username || profile?.full_name || "You", msg: content }, ...p].slice(0, 8));
    setChatMsg("");
    if (activeStream?.id && user?.uid) {
      await addDoc(collection(db, "livestream_messages"), {
        stream_id: activeStream.id,
        author_id: user.uid,
        username: profile?.username || profile?.full_name || user.email?.split("@")[0] || "Viewer",
        content,
        created_at: serverTimestamp(),
      });
    }
  };
  const shareLive = async () => {
    try { showNotice(await shareItem({ title: "VioFashion Runway", text: "Join this VioFashion live runway." })); }
    catch (err) { if (err.name !== "AbortError") showNotice("Sharing was cancelled."); }
  };

  return (
    <div className="live-outer">
      <div className="live-bg" style={{ background: PALETTES[2] }}><div style={{ position: "absolute", inset: 0, opacity: 0.13, display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontFamily: "var(--ff-impact)", fontSize: 220, color: "#fff", letterSpacing: -10 }}>LIVE</span></div></div>
      {activeStream?.creator_id === user?.uid && <video ref={liveVideoRef} autoPlay muted playsInline style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", zIndex: 1 }} />}
      <div className="live-cinema" />
      <div className="live-top">
        <div className="live-pill"><div className="live-dot" />{activeStream ? "You're Live" : "Live"}</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {activeStream && <button onClick={handleEndLive} style={{ background: "rgba(239,68,68,0.2)", border: "1px solid rgba(239,68,68,0.35)", borderRadius: 100, padding: "5px 14px", color: "#FCA5A5", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>End Live</button>}
          <div className="live-viewer-badge"><IcoEye />{viewers.toLocaleString()}</div>
        </div>
      </div>
      <div className="live-creator-row">
        <div className="live-cr-av" style={{ background: PALETTES[2] }}>AO</div>
        <div><div className="live-cr-name">{activeStream ? (profile?.full_name || "You") : "Amara Osei"}</div><div className="live-cr-sub">✂️ Atelier · Accra</div></div>
        {!activeStream && <button className="live-follow-btn" onClick={() => setFollowed(p => !p)}>{followed ? "Following" : "+ Follow"}</button>}
      </div>
      <div className="live-center">
        <div className="live-center-eyebrow">{activeStream ? "Your Stream · Live" : "Season Premiere · 2025"}</div>
        <div className="live-center-name">{activeStream ? activeStream.title : "Kente Luxe\nCollection"}</div>
        <div className="live-center-sub">{activeStream ? `${activeStream.category} · Live` : "Fashion show · Live from Accra, Ghana"}</div>
      </div>
      <div className="live-actions">
        <div className="live-act" onClick={() => setLiked(p => !p)}><IcoHeart lit={liked} /></div>
        <div className="live-act" onClick={() => document.querySelector(".live-inp")?.focus()}><IcoComment /></div>
        <div className="live-act" onClick={shareLive}><IcoShare /></div>
        <div className="live-act" onClick={() => setSaved(p => !p)}><IcoBookmark lit={saved} /></div>
      </div>
      {isCreator && !activeStream && (
        <div className="live-golive-card">
          <div className="live-golive-title">Go Live</div>
          <div className="live-golive-sub">Share your creative process with your followers</div>
          <button className="live-golive-btn" onClick={() => setShowGoLive(true)}><div style={{ width: 8, height: 8, background: "#fff", borderRadius: "50%" }} /> Start Streaming</button>
        </div>
      )}
      <div className="live-ticker"><div className="live-ticker-inner">{doubled.map((m, i) => (<div key={i} className="live-ticker-msg"><span className="ticker-user">{m.user}</span><span className="ticker-text">{m.msg}</span><span style={{ color: "rgba(248,245,255,0.2)", fontSize: 10 }}>·</span></div>))}</div></div>
      <div className="live-bottom"><EmojiPicker onPick={e => setChatMsg(p => `${p}${e}`)} /><input className="live-inp" placeholder="Say something to the designer..." value={chatMsg} onChange={e => setChatMsg(e.target.value)} onKeyDown={e => e.key === "Enter" && sendLiveChat()} /><button className="live-gift-btn" onClick={() => { setTicker(p => [{ user: profile?.username || "You", msg: "sent a gift" }, ...p].slice(0, 8)); showNotice("Gift sent."); }}>??</button><button className="live-send" onClick={sendLiveChat}><IcoSend /></button></div>{notice && <div style={{ position: "absolute", left: 18, right: 18, bottom: 86, zIndex: 30, background: "rgba(21,14,32,0.92)", border: "1px solid rgba(201,168,76,0.25)", color: "var(--gold-lt)", borderRadius: 14, padding: "10px 14px", fontSize: 12, textAlign: "center" }}>{notice}</div>}
      {showGoLive && <GoLiveModal user={user} profile={profile} onClose={() => setShowGoLive(false)} onLive={stream => { setActiveStream(stream); setShowGoLive(false); }} />}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
//  ROOT
// ════════════════════════════════════════════════════════════
function SettingsScreen({ theme, setTheme, chatTheme, setChatTheme, onProfile, onBack }) {
  const themeChoices = [
    ["adaptive", "Adaptive", "Keeps the current VioFashion look."],
    ["light", "White", "Bright mode for daytime use."],
    ["black", "Black", "Pure dark mode for late sessions."],
  ];
  const chatChoices = [
    ["violet", "Violet", "Default chat bubbles."],
    ["gold", "Gold", "Warmer message styling."],
    ["mono", "Mono", "Quiet neutral chat styling."],
  ];
  const choiceStyle = (active) => ({
    width: "100%", textAlign: "left", border: `1px solid ${active ? "var(--gold)" : "var(--border)"}`,
    background: active ? "rgba(201,168,76,0.12)" : "rgba(255,255,255,0.04)", color: "var(--white)",
    borderRadius: 14, padding: "13px 14px", cursor: "pointer", marginBottom: 10,
  });
  return (
    <div className="profile-scroll">
      <div className="notif-head" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div><div className="chat-head-title" style={{ marginBottom: 2 }}>Settings</div><div style={{ color: "var(--muted)", fontSize: 12 }}>Themes, profile, and chat style</div></div>
        <button className="chat-back-btn" onClick={onBack}><IcoX /></button>
      </div>
      <div style={{ padding: 20 }}>
        <div className="section-head">App Theme</div>
        {themeChoices.map(([id, label, sub]) => (
          <button key={id} style={choiceStyle(theme === id)} onClick={() => setTheme(id)}>
            <strong>{label}</strong><br /><span style={{ color: "var(--muted)", fontSize: 12 }}>{sub}</span>
          </button>
        ))}
        <div className="section-head" style={{ marginTop: 22 }}>Chat Theme</div>
        {chatChoices.map(([id, label, sub]) => (
          <button key={id} style={choiceStyle(chatTheme === id)} onClick={() => setChatTheme(id)}>
            <strong>{label}</strong><br /><span style={{ color: "var(--muted)", fontSize: 12 }}>{sub}</span>
          </button>
        ))}
        <div className="section-head" style={{ marginTop: 22 }}>Profile</div>
        <button className="btn-gold" onClick={onProfile} style={{ width: "100%" }}>Edit Profile</button>
      </div>
    </div>
  );
}

const NAV = [
  { id: "feed",   label: "Discover", icon: <IcoHome /> },
  { id: "market", label: "Atelier",  icon: <IcoMarket /> },
  { id: "post",   label: null,       icon: null },
  { id: "chat",   label: "Inbox",    icon: <IcoChat /> },
  { id: "live",   label: "Runway",   icon: <IcoLive /> },
];

export default function VioFashion() {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const [screen, setScreen]       = useState("feed");
  const [showUpload, setShowUpload] = useState(false);
  const [pendingConv, setPendingConv] = useState(null);
  const [navOpen, setNavOpen] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem("vio-theme") || "adaptive");
  const [chatTheme, setChatTheme] = useState(() => localStorage.getItem("vio-chat-theme") || "violet");
  const { unreadCount } = useNotifications(user?.uid);
  const [unreadMsgs, setUnreadMsgs] = useState(0);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "conversations"), where("participants", "array-contains", user.uid));
    const unsub = onSnapshot(q, (snap) => {
      const recent = snap.docs.filter(d => {
        const ts = d.data().last_message_at?.toDate?.() || new Date(d.data().last_message_at || 0);
        return Date.now() - ts.getTime() < 24 * 60 * 60 * 1000;
      });
      setUnreadMsgs(recent.length);
    });
    return unsub;
  }, [user, screen]);

  useEffect(() => { injectFonts(); injectCSS(); }, []);
  useEffect(() => { localStorage.setItem("vio-theme", theme); }, [theme]);
  useEffect(() => { localStorage.setItem("vio-chat-theme", chatTheme); }, [chatTheme]);

  const handleNav = (id) => { setNavOpen(false); if (id === "post") { setShowUpload(true); return; } setScreen(id); };
  const openChat  = (conv) => { setPendingConv(conv); setScreen("chat"); };

  const dp       = profile || {};
  const fullName = dp.full_name || user?.email?.split("@")[0] || "";

  const render = () => {
    switch (screen) {
      case "feed":          return <FeedScreen user={user} onSearch={() => setScreen("search")} onNotifications={() => setScreen("notifications")} onStartChat={openChat} />;
      case "profile":       return <ProfileScreen user={user} profile={profile} onSignOut={signOut} onProfileUpdated={refreshProfile} onSettings={() => setScreen("settings")} />;
      case "market":        return <MarketScreen user={user} profile={profile} />;
      case "chat":          return <ChatScreen user={user} pendingConv={pendingConv} onConvOpened={() => setPendingConv(null)} />;
      case "live":          return <LiveScreen user={user} profile={profile} />;
      case "search":        return <SearchScreen user={user} profile={profile} onStartChat={openChat} />;
      case "notifications": return <NotificationsScreen user={user} />;
      case "settings":      return <SettingsScreen theme={theme} setTheme={setTheme} chatTheme={chatTheme} setChatTheme={setChatTheme} onProfile={() => setScreen("profile")} onBack={() => setScreen("feed")} />;
      default:              return <FeedScreen user={user} onSearch={() => setScreen("search")} onNotifications={() => setScreen("notifications")} onStartChat={openChat} />;
    }
  };

  const isSecondary = screen === "search" || screen === "notifications";
  const compactNav = true;
  const navItems = compactNav
    ? [...NAV, { id: "profile", label: "Profile", icon: <span style={{ fontSize: 15, fontWeight: 800 }}>{initials(fullName) || "P"}</span> }, { id: "settings", label: "Settings", icon: <IcoGear /> }]
    : NAV;

  return (
    <div className={`shell theme-${theme} chat-${chatTheme}`}>
      <div className="screen-wrap">{render()}</div>
      {screen === "feed" && (
        <div className="profile-float-btn" onClick={() => setScreen("profile")} style={{ background: dp.avatar_url ? "transparent" : PALETTES[0] }}>
          {dp.avatar_url ? <img src={dp.avatar_url} alt={fullName} /> : <span style={{ fontSize: 11, fontWeight: 700 }}>{initials(fullName) || "👤"}</span>}
        </div>
      )}
      {isSecondary && (
        <button onClick={() => setScreen("feed")} style={{ position: "absolute", top: 18, right: 16, zIndex: 190, width: 34, height: 34, background: "rgba(21,14,32,0.8)", border: "1px solid var(--border)", backdropFilter: "blur(10px)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--white)" }}><IcoX /></button>
      )}
      <div className={`nav-pill ${compactNav ? "compact" : ""}`}>
        {compactNav && <button className="nav-toggle-grid" onClick={() => setNavOpen(p => !p)} title="Navigation"><span /><span /><span /><span /></button>}
        {(!compactNav || navOpen) && navItems.map(item => {
          if (item.id === "post") return <button key="post" className="nav-post-btn" onClick={() => handleNav("post")}><IcoPlus /></button>;
          const isActive = screen === item.id;
          const hasBadge = (item.id === "chat" && unreadMsgs > 0) || (item.id === "feed" && unreadCount > 0);
          return (
            <button key={item.id} className={`nav-item ${isActive ? "active" : ""}`} onClick={() => handleNav(item.id)} title={item.label}>
              {item.icon}{!compactNav && item.label}{hasBadge && <div className="nav-badge" />}
            </button>
          );
        })}
      </div>
      {showUpload && <UploadModal user={user} onClose={() => setShowUpload(false)} onSuccess={() => { setShowUpload(false); setScreen("feed"); }} />}
    </div>
  );
}


