// src/VioFashion.jsx — VioFashion "ATELIER"
// Full Firebase migration: Auth · Firestore · Storage
// Upload fix: uploadBytesResumable gives REAL 0-100% progress
import { useState, useEffect, useRef, useCallback } from "react";
import { db, storage } from "./firebaseClient";
import {
  collection, doc, getDoc, getDocs, addDoc, setDoc,
  updateDoc, deleteDoc, query, where, orderBy, limit,
  onSnapshot, serverTimestamp, increment, arrayUnion,
} from "firebase/firestore";
import { ref as sRef, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { useAuth } from "./hooks/useAuth.jsx";
import {
  submitOffer, acceptOffer, rejectOffer,
  useOffers, useCustomerOrders, useCreatorOrders, updateOrderStatus,
  useNotifications, useSearch, useCreatorAnalytics,
  startLiveStream, endLiveStream, getOrCreateConversation,
  getMeasurementProfile, saveMeasurementProfile,
  useCommunityPosts, createCommunityPost, getArtisanDirectory,
  setSubscriptionTier, useSubscriptionEvents,
  releaseEscrowForRequest, useEscrowEvents, appendEscrowMilestone, backfillAcceptedCreators,
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
    --ink:#08120D;--deep:#0F1D15;--surface:#18281E;--elevated:#223429;
    --border:rgba(232,219,181,0.16);
    --violet:#6D28D9;--vio-mid:#8B5CF6;--vio-lite:#C4B5FD;
    --gold:#C9A84C;--gold-lt:#E8C87A;
    --white:#F8F5EF;--muted:rgba(248,245,239,0.62);
    --paper:#F4F1E8;--paper-elev:#FFFFFF;--paper-line:rgba(40,32,19,0.16);--paper-muted:rgba(53,43,25,0.62);
    --kente-forest:#1B3B2C;
    --danger:#F87171;--green:#34D399;
    --kente-black:#121212;--kente-red:#C92A3F;--kente-yellow:#EDC437;--kente-green:#1E7A42;--kente-blue:#2D4AA8;
    --kente-ribbon:repeating-linear-gradient(90deg,var(--kente-black) 0 12px,var(--kente-yellow) 12px 28px,var(--kente-green) 28px 38px,var(--kente-red) 38px 54px,var(--kente-blue) 54px 66px,var(--kente-black) 66px 78px);
    --ff-serif:'Cormorant Garamond',Georgia,serif;
    --ff-sans:'Jost',system-ui,sans-serif;
    --ff-impact:'Bebas Neue',sans-serif;
    --accent-grad:linear-gradient(135deg,#1E7A42,#0F5A31);
  }
  html,body,#root{height:100%;width:100%;overflow:hidden;overscroll-behavior:none;}
  body{background:var(--ink);color:var(--white);font-family:var(--ff-sans);overflow:hidden;-webkit-font-smoothing:antialiased;-webkit-text-size-adjust:100%;}
  body[data-vio-theme="adaptive"]{background:linear-gradient(160deg,#0B1912,#102118 40%,#08120D 100%);}
  body[data-vio-theme="light"]{background:linear-gradient(160deg,#F7F3E9,#ECE5D3 100%);}
  body[data-vio-theme="black"]{background:linear-gradient(160deg,#020103,#06040A 100%);}
  ::-webkit-scrollbar{width:2px;}::-webkit-scrollbar-thumb{background:var(--violet);border-radius:2px;}
  .shell{position:relative;width:100%;max-width:430px;height:100dvh;min-height:100dvh;margin:0 auto;background:var(--deep);overflow:hidden;box-shadow:0 22px 90px rgba(16,26,19,0.35);touch-action:pan-y;}
  .shell::before{content:'';position:absolute;top:0;left:0;right:0;height:16px;background:var(--kente-ribbon);z-index:210;pointer-events:none;}
  .shell.theme-adaptive{--ink:#08120D;--deep:#0F1D15;--surface:#18281E;--elevated:#223429;--border:rgba(232,219,181,0.16);--white:#F8F5EF;--muted:rgba(248,245,239,0.62);--paper:#F4F1E8;--paper-elev:#FFFFFF;--paper-line:rgba(40,32,19,0.18);--paper-muted:rgba(53,43,25,0.62);--accent-grad:linear-gradient(135deg,#1E7A42,#0F5A31);}
  .shell.theme-light{--ink:#F4F1E8;--deep:#F4F1E8;--surface:#FFFFFF;--elevated:#EEE7D5;--border:rgba(39,26,58,0.12);--white:#171020;--muted:rgba(23,16,32,0.55);--paper:#FCFAF4;--paper-elev:#FFFFFF;--paper-line:rgba(39,26,58,0.14);--paper-muted:rgba(23,16,32,0.54);--accent-grad:linear-gradient(135deg,#6D28D9,#C9A84C);box-shadow:0 0 72px rgba(90,70,30,0.18);}
  .shell.theme-black{--ink:#000000;--deep:#030205;--surface:#09060D;--elevated:#100A18;--border:rgba(255,255,255,0.09);--white:#FFFFFF;--muted:rgba(255,255,255,0.44);--paper:#09060D;--paper-elev:#120C1B;--paper-line:rgba(255,255,255,0.11);--paper-muted:rgba(255,255,255,0.54);--accent-grad:linear-gradient(135deg,#111111,#6D28D9);}
  .shell.chat-gold{--accent-grad:linear-gradient(135deg,var(--gold),#A67C1B);}
  .shell.chat-mono{--accent-grad:linear-gradient(135deg,#27272A,#71717A);}
  .screen-wrap{position:absolute;inset:0;overflow:hidden;overflow-x:hidden;}
  .shell.theme-adaptive.screen-chat,.shell.theme-adaptive.screen-settings,.shell.theme-adaptive.screen-search,.shell.theme-adaptive.screen-notifications,.shell.theme-adaptive.screen-market{
    --ink:#F4F1E8;--deep:#F4F1E8;--surface:#FFFFFF;--elevated:#EEE7D5;
    --border:rgba(40,32,19,0.18);--white:#1C170F;--muted:rgba(53,43,25,0.62);
    --paper:#F4F1E8;--paper-elev:#FFFFFF;--paper-line:rgba(40,32,19,0.18);--paper-muted:rgba(53,43,25,0.62);
    --accent-grad:linear-gradient(135deg,#7856CC,#6543BA);
    box-shadow:0 18px 54px rgba(30,23,14,0.22);
  }
  .shell.theme-adaptive.screen-profile,.shell.theme-adaptive.screen-feed,.shell.theme-adaptive.screen-live{
    --ink:#09140F;--deep:#102118;--surface:#182A1E;--elevated:#22372B;
    --border:rgba(232,219,181,0.16);--white:#F8F5EF;--muted:rgba(248,245,239,0.64);
    --accent-grad:linear-gradient(135deg,#1E7A42,#0F5A31);
  }
  .nav-pill{position:absolute;bottom:24px;left:50%;transform:translateX(-50%);z-index:200;display:flex;align-items:center;background:rgba(21,14,32,0.92);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border:1px solid rgba(109,40,217,0.3);border-radius:100px;padding:6px 8px;gap:2px;box-shadow:0 8px 40px rgba(0,0,0,0.6),0 0 0 1px rgba(255,255,255,0.04) inset;}
  .nav-item{display:flex;flex-direction:column;align-items:center;gap:3px;padding:8px 14px;border-radius:100px;cursor:pointer;border:none;background:transparent;color:var(--muted);font-family:var(--ff-sans);font-size:9px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;white-space:nowrap;transition:all 0.25s;position:relative;}
  .nav-item.active{background:linear-gradient(135deg,var(--violet),#5B21B6);color:var(--white);box-shadow:0 4px 16px rgba(109,40,217,0.5);}
  .nav-item svg{width:18px;height:18px;}
  .nav-post-btn{width:44px;height:44px;background:linear-gradient(135deg,var(--gold),#B8943A);border:none;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 4px 20px rgba(201,168,76,0.4);transition:all 0.25s;flex-shrink:0;}
  .nav-post-btn:active{transform:scale(0.94) rotate(45deg);}
  .nav-badge{position:absolute;top:4px;right:6px;width:8px;height:8px;background:#EF4444;border-radius:50%;border:1.5px solid rgba(21,14,32,0.92);}
  .nav-pill.compact{left:38px;top:50%;bottom:auto;transform:translate(-50%,-50%);border-radius:24px;padding:0;gap:0;background:transparent;border:none;box-shadow:none;justify-content:center;pointer-events:none;touch-action:none;}
  .nav-pill.compact.open{background:transparent !important;border:none !important;box-shadow:none !important;gap:7px;}
  .nav-pill.compact.open.vertical{height:min(68vh,500px);width:42px;flex-direction:column;align-items:center;justify-content:center;}
  .nav-pill.compact.open.horizontal{width:min(92vw,380px);height:42px;flex-direction:row;align-items:center;justify-content:center;}
  .nav-roll{display:flex;align-items:center;justify-content:center;gap:6px;flex:0 0 auto;min-height:0;min-width:0;pointer-events:none;}
  .nav-pill.vertical .nav-roll{flex-direction:column;width:100%;}
  .nav-pill.horizontal .nav-roll{flex-direction:row;height:100%;}
  .nav-roll.upper{padding:0;}
  .nav-roll.lower{padding:0;}
  .nav-pill.horizontal .nav-roll.upper{padding:0;}
  .nav-pill.horizontal .nav-roll.lower{padding:0;}
  .nav-pill.compact .nav-item{width:32px;height:32px;padding:0;justify-content:center;font-size:0;border-radius:13px;border:1.8px solid rgba(248,245,255,0.42);background:rgba(21,14,32,0.18);backdrop-filter:blur(8px);pointer-events:auto;}
  .nav-pill.compact .nav-item svg{width:15px;height:15px;}
  .nav-pill.compact .nav-item.active{border-color:var(--gold);box-shadow:0 0 0 1px rgba(201,168,76,0.25),0 8px 18px rgba(109,40,217,0.3);}
  .nav-pill.compact .nav-post-btn{width:34px;height:34px;border:2px solid rgba(248,245,255,0.46);pointer-events:auto;}
  .nav-pill.compact .nav-post-btn svg{width:16px;height:16px;}
  .nav-toggle-grid{width:38px;height:38px;border-radius:16px;background:rgba(21,14,32,0.16);border:2px solid rgba(248,245,255,0.75);display:grid;grid-template-columns:repeat(2,6px);grid-template-rows:repeat(2,6px);gap:5px;place-content:center;cursor:grab;color:var(--white);animation:nav-orbit 4s linear infinite;box-shadow:0 8px 22px rgba(0,0,0,0.4);pointer-events:auto;backdrop-filter:blur(8px);}
  .nav-toggle-grid:active{cursor:grabbing;}
  .nav-toggle-grid span{width:6px;height:6px;border-radius:50%;background:var(--gold);box-shadow:0 0 8px rgba(201,168,76,0.45);}
  @keyframes nav-orbit{to{transform:rotate(360deg);}}
  .shell.theme-adaptive.screen-chat .nav-pill.compact .nav-item,
  .shell.theme-adaptive.screen-settings .nav-pill.compact .nav-item,
  .shell.theme-adaptive.screen-search .nav-pill.compact .nav-item,
  .shell.theme-adaptive.screen-notifications .nav-pill.compact .nav-item,
  .shell.theme-adaptive.screen-market .nav-pill.compact .nav-item,
  .shell.theme-light .nav-pill.compact .nav-item{
    border-color:rgba(40,32,19,0.35);
    background:rgba(255,255,255,0.72);
  }
  .shell.theme-adaptive.screen-chat .nav-toggle-grid,
  .shell.theme-adaptive.screen-settings .nav-toggle-grid,
  .shell.theme-adaptive.screen-search .nav-toggle-grid,
  .shell.theme-adaptive.screen-notifications .nav-toggle-grid,
  .shell.theme-adaptive.screen-market .nav-toggle-grid,
  .shell.theme-light .nav-toggle-grid{
    border-color:rgba(40,32,19,0.58);
    background:rgba(255,255,255,0.78);
  }
  .profile-float-btn{position:absolute;top:16px;right:16px;z-index:190;width:34px;height:34px;border-radius:50%;border:1.5px solid var(--gold);overflow:hidden;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;box-shadow:0 4px 14px rgba(0,0,0,0.5);transition:all 0.2s;flex-shrink:0;}
  .profile-float-btn img{width:100%;height:100%;object-fit:cover;}
  .feed-wrap{height:100%;overflow-y:scroll;overflow-x:hidden;scroll-snap-type:y mandatory;scrollbar-width:none;}
  .feed-wrap::-webkit-scrollbar{display:none;}
  .feed-card{position:relative;height:100dvh;min-height:100dvh;scroll-snap-align:start;overflow:hidden;}
  .feed-video-bg{position:absolute;inset:0;background-size:cover;background-position:center;}
  .feed-cinema{position:absolute;inset:0;background:linear-gradient(to top,rgba(6,4,9,0.97) 0%,rgba(6,4,9,0.35) 35%,transparent 65%),linear-gradient(to bottom,rgba(6,4,9,0.6) 0%,transparent 25%);}
  .feed-topbar{position:absolute;top:0;left:0;right:0;z-index:10;padding:24px 20px 0;display:flex;align-items:center;justify-content:space-between;background:linear-gradient(to bottom,rgba(7,14,10,0.68),transparent);}
  .feed-tabs-row{display:flex;gap:18px;}
  .feed-tab{font-family:var(--ff-sans);font-size:11px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;color:var(--muted);background:none;border:none;cursor:pointer;padding:4px 0;position:relative;transition:color 0.2s;}
  .feed-tab.on{color:var(--white);}
  .feed-tab.on::after{content:'';position:absolute;bottom:-2px;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,var(--gold),transparent);}
  .feed-topbar-right{display:flex;align-items:center;gap:8px;}
  .feed-icon-btn{width:34px;height:34px;background:rgba(255,255,255,0.07);border:1px solid var(--border);border-radius:10px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--white);position:relative;}
  .feed-topbar::before{content:'';position:absolute;top:0;left:20px;right:20px;height:5px;border-radius:0 0 8px 8px;background:var(--kente-ribbon);opacity:0.88;}
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
  .story-rail{position:absolute;top:78px;left:0;right:0;z-index:12;display:flex;gap:12px;overflow-x:auto;scrollbar-width:none;padding:0 18px 10px;pointer-events:auto;}
  .story-rail::-webkit-scrollbar{display:none;}
  .story-chip{width:60px;flex:0 0 auto;background:none;border:none;color:var(--white);cursor:pointer;text-align:center;}
  .story-ring{width:58px;height:58px;border-radius:50%;padding:2px;background:conic-gradient(var(--gold),var(--vio-mid),#EC4899,var(--gold));box-shadow:0 8px 20px rgba(0,0,0,0.28);}
  .story-ring.mine{background:conic-gradient(var(--gold),var(--gold-lt),var(--vio-mid),var(--gold));}
  .story-avatar{width:100%;height:100%;border-radius:50%;border:2px solid var(--deep);background:var(--surface);display:flex;align-items:center;justify-content:center;overflow:hidden;font-size:15px;font-weight:800;position:relative;}
  .story-avatar img{width:100%;height:100%;object-fit:cover;}
  .story-plus{position:absolute;right:-1px;bottom:-1px;width:19px;height:19px;border-radius:50%;background:var(--violet);border:2px solid var(--deep);display:flex;align-items:center;justify-content:center;font-size:14px;line-height:1;}
  .story-label{display:block;margin-top:5px;font-size:10px;color:rgba(248,245,255,0.82);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .edition-badge{position:absolute;top:68px;right:14px;display:flex;flex-direction:column;align-items:flex-end;z-index:10;pointer-events:none;}
  .edition-num{font-family:var(--ff-impact);font-size:60px;line-height:1;color:rgba(201,168,76,0.1);letter-spacing:-2px;}
  .edition-label{font-family:var(--ff-sans);font-size:8px;letter-spacing:0.2em;text-transform:uppercase;color:rgba(201,168,76,0.25);margin-top:-8px;}
  .profile-scroll{height:100%;overflow-y:auto;overflow-x:hidden;scrollbar-width:none;padding-bottom:100px;}
  .profile-scroll::-webkit-scrollbar{display:none;}
  .profile-hero{position:relative;height:270px;overflow:hidden;}
  .profile-hero-bg{position:absolute;inset:0;background-size:cover;background-position:center;}
  .profile-hero-grad{position:absolute;inset:0;background:linear-gradient(160deg,rgba(7,20,13,0) 20%,rgba(7,20,13,0.28) 50%,rgba(16,33,24,0.97) 100%);}
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
  .post-view-media{width:100%;max-height:62vh;border-radius:14px;object-fit:contain;background:#000;margin-bottom:12px;}
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
  .market-masthead{padding:28px 20px 0;position:relative;}
  .market-masthead::before{content:'';position:absolute;top:0;left:20px;right:20px;height:8px;border-radius:0 0 8px 8px;background:var(--kente-ribbon);}
  .market-eyebrow{font-family:var(--ff-sans);font-size:9px;font-weight:600;letter-spacing:0.25em;text-transform:uppercase;color:var(--gold);margin-bottom:8px;}
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
  .post-request-card::before{content:'MARKET';position:absolute;right:-10px;top:8px;font-family:var(--ff-impact);font-size:64px;color:rgba(109,40,217,0.08);pointer-events:none;}
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
  .chat-outer{display:flex;flex-direction:column;height:100%;position:relative;background:var(--deep);}
  .chat-head{padding:28px 20px 16px;border-bottom:1px solid var(--border);flex-shrink:0;background:rgba(255,255,255,0.84);position:relative;}
  .chat-head::before{content:'';position:absolute;top:0;left:16px;right:16px;height:8px;border-radius:0 0 8px 8px;background:var(--kente-ribbon);}
  .chat-head-title{font-family:var(--ff-serif);font-size:28px;font-style:italic;font-weight:300;color:var(--white);margin-bottom:14px;}
  .chat-search-bar{display:flex;align-items:center;gap:10px;background:#FFFFFF;border:1px solid var(--border);border-radius:12px;padding:10px 14px;}
  .chat-search-bar input{flex:1;background:transparent;border:none;outline:none;color:var(--white);font-family:var(--ff-sans);font-size:13px;font-weight:300;}
  .inbox-story-strip{display:flex;gap:12px;overflow-x:auto;scrollbar-width:none;padding:14px 16px 12px;border-bottom:1px solid rgba(20,16,10,0.1);background:rgba(255,255,255,0.66);}
  .inbox-story-strip::-webkit-scrollbar{display:none;}
  .inbox-story-item{width:64px;flex:0 0 auto;background:none;border:none;color:var(--white);cursor:pointer;text-align:center;}
  .inbox-story-ring{width:62px;height:62px;border-radius:50%;padding:2px;background:conic-gradient(#00E5FF,#22D3EE,#3B82F6,#00E5FF);box-shadow:0 8px 20px rgba(0,0,0,0.25);display:block;}
  .inbox-story-ring.mine{background:conic-gradient(var(--gold),var(--gold-lt),var(--vio-mid),var(--gold));}
  .inbox-story-avatar{width:100%;height:100%;border-radius:50%;border:2px solid var(--deep);background:var(--surface);display:flex;align-items:center;justify-content:center;overflow:hidden;font-size:15px;font-weight:800;position:relative;}
  .inbox-story-avatar img{width:100%;height:100%;object-fit:cover;}
  .inbox-story-plus{position:absolute;right:0;bottom:0;width:20px;height:20px;border-radius:50%;background:#0EA5E9;border:2px solid var(--deep);display:flex;align-items:center;justify-content:center;font-size:13px;line-height:1;}
  .inbox-story-label{display:block;margin-top:6px;font-size:11px;color:rgba(248,245,255,0.86);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .chat-list-area{flex:1;overflow-y:auto;overflow-x:hidden;scrollbar-width:none;}
  .chat-list-area::-webkit-scrollbar{display:none;}
  .chat-row{display:flex;align-items:center;gap:12px;padding:14px 20px;cursor:pointer;border-bottom:1px solid rgba(20,16,10,0.08);transition:background 0.15s;}
  .chat-row:hover{background:rgba(30,122,66,0.08);}
  .chat-av{width:48px;height:48px;border-radius:16px;overflow:hidden;flex-shrink:0;position:relative;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;}
  .chat-av img{width:100%;height:100%;object-fit:cover;}
  .chat-row-content{flex:1;min-width:0;}
  .chat-row-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:3px;}
  .chat-row-name{font-size:14px;font-weight:600;}
  .chat-row-time{font-size:10px;color:var(--muted);}
  .chat-row-preview{font-size:12px;font-weight:300;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .chat-window{position:absolute;inset:0;z-index:50;background:var(--deep);display:flex;flex-direction:column;transform:translateX(100%);transition:transform 0.3s cubic-bezier(0.4,0,0.2,1);}
  .chat-window.open{transform:translateX(0);}
  .chat-win-head{display:flex;align-items:center;gap:12px;padding:16px;border-bottom:1px solid var(--border);background:rgba(255,255,255,0.94);backdrop-filter:blur(10px);flex-shrink:0;}
  .chat-back-btn{width:34px;height:34px;background:rgba(255,255,255,0.9);border:1px solid var(--border);border-radius:10px;cursor:pointer;color:var(--white);display:flex;align-items:center;justify-content:center;}
  .chat-win-av{width:38px;height:38px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;overflow:hidden;}
  .chat-win-av img{width:100%;height:100%;object-fit:cover;}
  .chat-win-info{flex:1;}
  .chat-win-person{display:flex;align-items:center;gap:12px;flex:1;min-width:0;background:none;border:none;color:inherit;text-align:left;cursor:pointer;padding:0;}
  .chat-win-name{font-size:15px;font-weight:600;}
  .chat-win-status{font-size:11px;color:var(--green);}
  .call-row{display:flex;gap:8px;}
  .call-ico{width:34px;height:34px;background:rgba(255,255,255,0.9);border:1px solid var(--border);border-radius:10px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--violet);}
  .msgs-area{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px;scrollbar-width:none;}
  .msgs-area::-webkit-scrollbar{display:none;}
  .msg-wrap{display:flex;gap:8px;max-width:78%;}
  .msg-wrap.out{align-self:flex-end;flex-direction:row-reverse;}
  .msg-wrap.inc{align-self:flex-start;}
  .msg-bubble{padding:10px 14px;border-radius:16px;font-size:13px;font-weight:300;line-height:1.55;}
  .msg-wrap.inc .msg-bubble{background:#FFFFFF;border:1px solid var(--border);border-bottom-left-radius:4px;}
  .msg-wrap.out .msg-bubble{background:var(--accent-grad);border-bottom-right-radius:4px;}
  .msg-time{font-size:10px;color:var(--muted);margin-top:4px;text-align:right;}
  .msg-tools{display:flex;align-items:center;justify-content:flex-end;gap:6px;position:relative;}
  .msg-more{width:20px;height:20px;border:none;border-radius:7px;background:rgba(255,255,255,0.8);color:var(--muted);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:13px;}
  .msg-menu{position:absolute;right:0;bottom:24px;z-index:60;width:160px;background:rgba(255,255,255,0.98);border:1px solid var(--border);border-radius:13px;padding:6px;box-shadow:0 12px 30px rgba(0,0,0,0.2);}
  .msg-menu button{width:100%;background:transparent;border:none;color:var(--white);font-size:12px;text-align:left;padding:9px 10px;border-radius:9px;cursor:pointer;}
  .msg-menu button:hover{background:rgba(109,40,217,0.12);}
  .msg-menu .danger{color:var(--danger);}
  .chat-inp-bar{display:flex;align-items:center;gap:10px;padding:12px 16px 20px;border-top:1px solid var(--border);background:rgba(255,255,255,0.96);backdrop-filter:blur(10px);flex-shrink:0;}
  .chat-inp{flex:1;background:#FFFFFF;border:1px solid var(--border);border-radius:100px;padding:11px 18px;color:var(--white);font-family:var(--ff-sans);font-size:13px;font-weight:300;outline:none;}
  .chat-inp::placeholder{color:var(--muted);}
  .chat-inp:focus{border-color:rgba(109,40,217,0.4);}
  .chat-send{width:40px;height:40px;background:var(--accent-grad);border:none;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;color:var(--white);}
  .emoji-wrap{position:relative;display:inline-flex;flex-shrink:0;}
  .emoji-toggle{width:38px;height:38px;border-radius:14px;border:1px solid var(--border);background:#FFFFFF;color:var(--white);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:17px;}
  .emoji-pop{position:absolute;bottom:46px;left:0;display:grid;grid-template-columns:repeat(5,32px);gap:6px;padding:8px;border:1px solid var(--border);border-radius:16px;background:#FFFFFF;backdrop-filter:blur(16px);box-shadow:0 16px 40px rgba(0,0,0,0.2);z-index:400;}
  .emoji-pop button{width:32px;height:32px;border-radius:10px;border:1px solid var(--border);background:#FFFFFF;cursor:pointer;}
  .mention-wrap{position:relative;display:flex;gap:8px;align-items:flex-start;margin-bottom:12px;}
  .mention-wrap textarea{margin-bottom:0;}
  .mention-tools{display:flex;flex-direction:column;gap:8px;}
  .mini-tool-btn{width:38px;height:38px;border-radius:13px;border:1px solid var(--border);background:#FFFFFF;color:var(--white);cursor:pointer;font-weight:700;}
  .mention-pop{position:absolute;right:0;top:44px;width:min(260px,calc(100vw - 56px));max-height:220px;overflow:auto;border:1px solid var(--border);border-radius:16px;background:#FFFFFF;backdrop-filter:blur(16px);z-index:420;padding:10px;box-shadow:0 16px 40px rgba(0,0,0,0.2);}
  .mention-search{width:100%;background:#FFFFFF;border:1px solid var(--border);border-radius:10px;padding:9px 11px;color:var(--white);outline:none;margin-bottom:8px;}
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
  .notif-head{padding:28px 20px 16px;border-bottom:1px solid var(--border);background:rgba(255,255,255,0.9);position:relative;}
  .notif-head::before{content:'';position:absolute;top:0;left:16px;right:16px;height:8px;border-radius:0 0 8px 8px;background:var(--kente-ribbon);}
  .notif-head-title{font-family:var(--ff-serif);font-size:28px;font-style:italic;font-weight:300;color:var(--white);}
  .notif-row{display:flex;align-items:flex-start;gap:12px;padding:14px 20px;border-bottom:1px solid rgba(20,16,10,0.08);cursor:pointer;transition:background 0.15s;}
  .notif-row:hover{background:rgba(30,122,66,0.06);}
  .notif-row.unread{background:rgba(120,86,204,0.09);}
  .notif-av{width:42px;height:42px;border-radius:13px;flex-shrink:0;overflow:hidden;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;position:relative;}
  .notif-av img{width:100%;height:100%;object-fit:cover;}
  .notif-type-icon{position:absolute;bottom:-2px;right:-2px;width:16px;height:16px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:8px;border:1.5px solid var(--deep);}
  .notif-type-like{background:#8B5CF6;}.notif-type-follow{background:var(--gold);}.notif-type-comment{background:#3B82F6;}.notif-type-offer{background:var(--green);}
  .notif-body{flex:1;min-width:0;}
  .notif-text{font-size:13px;font-weight:300;line-height:1.5;color:color-mix(in srgb, var(--white) 84%, transparent);}
  .notif-text strong{font-weight:600;color:var(--white);}
  .notif-meta{font-size:11px;color:var(--muted);margin-top:3px;}
  .notif-price{font-size:12px;font-weight:700;color:var(--gold-lt);margin-top:2px;}
  .search-outer{height:100%;display:flex;flex-direction:column;}
  .search-head{padding:20px 20px 0;flex-shrink:0;}
  .search-head-title{font-family:var(--ff-serif);font-size:28px;font-style:italic;font-weight:300;color:var(--white);margin-bottom:14px;}
  .search-inp-wrap{display:flex;align-items:center;gap:10px;background:#FFFFFF;border:1px solid var(--border);border-radius:14px;padding:12px 16px;margin-bottom:14px;}
  .search-inp-wrap input{flex:1;background:transparent;border:none;outline:none;color:var(--white);font-family:var(--ff-sans);font-size:15px;font-weight:300;caret-color:var(--vio-mid);}
  .search-inp-wrap input::placeholder{color:var(--muted);}
  .search-type-tabs{display:flex;gap:8px;margin-bottom:16px;overflow-x:auto;scrollbar-width:none;}
  .search-type-tabs::-webkit-scrollbar{display:none;}
  .search-type-tab{background:transparent;border:1px solid var(--border);border-radius:100px;padding:6px 16px;font-family:var(--ff-sans);font-size:11px;font-weight:500;letter-spacing:0.06em;color:var(--muted);cursor:pointer;white-space:nowrap;transition:all 0.2s;}
  .search-type-tab.on{border-color:var(--gold);color:var(--gold);background:rgba(201,168,76,0.08);}
  .search-results{flex:1;overflow-y:auto;scrollbar-width:none;padding:0 20px 100px;}
  .search-results::-webkit-scrollbar{display:none;}
  .search-creator-card{display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid rgba(20,16,10,0.08);cursor:pointer;}
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
  .shell.screen-chat .chat-outer,
  .shell.screen-settings .settings-root,
  .shell.screen-search .search-outer,
  .shell.screen-notifications .notif-scroll{background:var(--paper);}
  .shell.screen-chat .chat-head,
  .shell.screen-notifications .notif-head{background:color-mix(in srgb, var(--paper-elev) 88%, transparent);}
  .shell.screen-chat .chat-head::before,
  .shell.screen-notifications .notif-head::before{left:0;right:0;height:11px;border-radius:0;background:var(--kente-ribbon);}
  .shell.screen-chat .chat-search-bar,
  .shell.screen-search .search-inp-wrap{background:var(--paper-elev);border-color:var(--paper-line);}
  .shell.screen-chat .chat-search-bar input,
  .shell.screen-search .search-inp-wrap input{color:var(--white);}
  .shell.screen-chat .inbox-story-strip{background:color-mix(in srgb, var(--paper) 80%, transparent);border-bottom:1px solid var(--paper-line);}
  .shell.screen-chat .chat-row,
  .shell.screen-search .search-creator-card,
  .shell.screen-notifications .notif-row{border-bottom:1px solid color-mix(in srgb, var(--paper-line) 65%, transparent);}
  .shell.screen-chat .chat-row:hover,
  .shell.screen-search .search-creator-card:hover{background:color-mix(in srgb, var(--gold) 8%, transparent);}
  .shell.screen-chat .chat-win-head,
  .shell.screen-chat .chat-inp-bar{background:color-mix(in srgb, var(--paper-elev) 95%, transparent);border-color:var(--paper-line);}
  .shell.screen-chat .chat-back-btn,
  .shell.screen-chat .call-ico,
  .shell.screen-chat .emoji-toggle,
  .shell.screen-chat .mini-tool-btn{background:var(--paper-elev);border-color:var(--paper-line);}
  .shell.screen-chat .chat-inp,
  .shell.screen-chat .mention-search{background:var(--paper-elev);border-color:var(--paper-line);}
  .shell.screen-chat .msg-wrap.inc .msg-bubble,
  .shell.screen-chat .msg-menu,
  .shell.screen-chat .emoji-pop,
  .shell.screen-chat .emoji-pop button,
  .shell.screen-chat .mention-pop{background:var(--paper-elev);border-color:var(--paper-line);}
  .shell.screen-chat .msg-more{background:color-mix(in srgb, var(--paper-elev) 82%, transparent);}
  .shell.screen-chat .inbox-story-ring{background:conic-gradient(#20C5F8,#21D9D1,#4F46E5,#20C5F8);}
  .shell.screen-chat .inbox-story-label{color:var(--white);}
  .shell.screen-chat .search-section-label{color:var(--paper-muted);}
  .shell.screen-settings .settings-root{
    height:100%;
    overflow-y:auto;
    padding:0 0 100px;
    scrollbar-width:none;
  }
  .shell.screen-settings .settings-root::-webkit-scrollbar{display:none;}
  .shell.screen-settings .settings-head{
    position:sticky;top:0;z-index:3;
    display:flex;align-items:flex-start;justify-content:space-between;
    padding:28px 20px 18px;
    background:var(--paper-elev);
    border-bottom:1px solid var(--paper-line);
  }
  .shell.screen-settings .settings-head::before{
    content:'';position:absolute;left:0;right:0;top:0;height:11px;background:var(--kente-ribbon);
  }
  .shell.screen-settings .settings-title{font-family:var(--ff-serif);font-size:32px;font-style:italic;color:var(--white);line-height:1;}
  .shell.screen-settings .settings-sub{font-size:12px;color:var(--paper-muted);margin-top:4px;}
  .shell.screen-settings .settings-close{
    width:36px;height:36px;border-radius:12px;border:1px solid var(--paper-line);
    background:var(--paper-elev);color:var(--white);display:flex;align-items:center;justify-content:center;cursor:pointer;
  }
  .shell.screen-settings .settings-grid{
    display:grid;grid-template-columns:1fr 1fr;gap:14px;padding:18px 20px 0;
  }
  .shell.screen-settings .settings-col{display:flex;flex-direction:column;gap:10px;}
  .shell.screen-settings .settings-label{
    font-family:var(--ff-serif);font-size:26px;font-style:italic;color:var(--white);margin-bottom:2px;
  }
  .shell.screen-settings .settings-choice{
    width:100%;text-align:left;border:1px solid var(--paper-line);background:var(--paper-elev);color:var(--white);
    border-radius:12px;padding:12px 13px;cursor:pointer;transition:all .18s;
  }
  .shell.screen-settings .settings-choice.on{
    border-color:var(--gold);
    box-shadow:0 0 0 1px rgba(201,168,76,0.22) inset;
    background:color-mix(in srgb, var(--gold) 10%, var(--paper-elev));
  }
  .shell.screen-settings .settings-choice small{display:block;color:var(--paper-muted);font-size:12px;margin-top:3px;}
  .shell.screen-settings .settings-foot{padding:18px 20px 0;}
  .shell.screen-settings .settings-foot .btn-gold{width:100%;}
  .shell.screen-profile .profile-scroll{
    background:
      radial-gradient(circle at 14% 16%,rgba(255,255,255,0.07),transparent 30%),
      repeating-linear-gradient(90deg,rgba(255,255,255,0.03) 0 2px,transparent 2px 14px),
      linear-gradient(140deg,#102118,#1B3B2C 45%,#0F1D15 100%);
  }
  .shell.screen-profile .profile-meta{
    margin:-18px 14px 0;
    border:1px solid rgba(248,245,239,0.15);
    border-radius:24px;
    background:color-mix(in srgb, var(--deep) 76%, transparent);
    box-shadow:0 18px 38px rgba(6,4,9,0.38);
    backdrop-filter:blur(9px);
  }
  .shell.screen-profile .profile-tabs{
    margin:16px 14px 14px;
    border-radius:18px;
    padding:4px 8px;
    background:color-mix(in srgb, var(--deep) 86%, transparent);
  }
  .shell.theme-light.screen-profile .profile-scroll{
    background:
      radial-gradient(circle at 16% 18%,rgba(39,26,58,0.05),transparent 28%),
      repeating-linear-gradient(90deg,rgba(39,26,58,0.04) 0 2px,transparent 2px 14px),
      linear-gradient(140deg,#F4F1E8,#EEE7D5 55%,#E9E2CE 100%);
  }
  .shell.theme-light.screen-profile .profile-meta{
    background:rgba(255,255,255,0.9);
    border-color:var(--paper-line);
    box-shadow:0 14px 30px rgba(39,26,58,0.12);
  }
  .shell.theme-light.screen-profile .service-chip{
    background:rgba(109,40,217,0.08);
    color:#4D28A5;
  }
  .shell.screen-feed .feed-topbar::before{height:9px;left:0;right:0;border-radius:0;}
  .shell.screen-feed .feed-tabs-row{gap:14px;}
  .shell.screen-feed .feed-action-tray{right:14px;padding-right:12px;}
  .shell.screen-feed .feed-action-tray::before{
    content:'';position:absolute;top:-14px;bottom:-16px;right:0;width:8px;border-radius:5px;
    background:linear-gradient(180deg,var(--gold),var(--kente-green),var(--kente-red),var(--kente-blue));
    opacity:0.85;
  }
  .shell.screen-feed .feed-editorial{
    border-radius:18px 18px 0 0;
    background:linear-gradient(180deg,transparent 0%,rgba(8,8,14,0.42) 18%,rgba(8,8,14,0.7) 100%);
    padding-top:18px;
  }
  .shell.theme-light.screen-feed .feed-editorial{
    background:linear-gradient(180deg,transparent 0%,rgba(244,241,232,0.46) 20%,rgba(244,241,232,0.74) 100%);
  }
  .shell.theme-light.screen-feed .feed-action-circle{
    background:rgba(255,255,255,0.84);
    border-color:var(--paper-line);
    color:#171020;
  }
  .shell.theme-black.screen-chat .chat-outer,
  .shell.theme-black.screen-settings .settings-root,
  .shell.theme-black.screen-search .search-outer,
  .shell.theme-black.screen-notifications .notif-scroll{
    background:#050309;
  }
  .shell.theme-black.screen-chat .chat-head,
  .shell.theme-black.screen-chat .chat-win-head,
  .shell.theme-black.screen-chat .chat-inp-bar,
  .shell.theme-black.screen-notifications .notif-head,
  .shell.theme-black.screen-settings .settings-head{
    background:rgba(11,8,18,0.96);
  }
  .shell.theme-black.screen-settings .settings-choice,
  .shell.theme-black.screen-chat .chat-search-bar,
  .shell.theme-black.screen-chat .chat-inp,
  .shell.theme-black.screen-search .search-inp-wrap{
    background:#120C1B;
    border-color:rgba(255,255,255,0.14);
  }
  .feature-root{
    height:100%;
    overflow-y:auto;
    background:var(--paper);
    padding:0 0 110px;
    scrollbar-width:none;
  }
  .feature-root::-webkit-scrollbar{display:none;}
  .feature-head{
    position:sticky;
    top:0;
    z-index:3;
    display:flex;
    align-items:flex-start;
    justify-content:space-between;
    gap:10px;
    padding:28px 20px 16px;
    background:color-mix(in srgb,var(--paper-elev) 92%,transparent);
    border-bottom:1px solid var(--paper-line);
  }
  .feature-head::before{
    content:'';
    position:absolute;
    top:0;
    left:0;
    right:0;
    height:10px;
    background:var(--kente-ribbon);
  }
  .feature-title{
    font-family:var(--ff-serif);
    font-size:31px;
    font-style:italic;
    color:var(--white);
    line-height:1;
  }
  .feature-sub{
    margin-top:4px;
    font-size:12px;
    color:var(--paper-muted);
  }
  .feature-back{
    width:36px;
    height:36px;
    flex-shrink:0;
    border-radius:12px;
    border:1px solid var(--paper-line);
    background:var(--paper-elev);
    color:var(--white);
    display:flex;
    align-items:center;
    justify-content:center;
    cursor:pointer;
  }
  .feature-section{padding:16px 20px 0;}
  .feature-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
  .kente-card{
    border:1px solid var(--paper-line);
    border-radius:15px;
    background:var(--paper-elev);
    overflow:hidden;
  }
  .kente-card-head{
    height:7px;
    background:var(--kente-ribbon);
  }
  .kente-card-body{padding:12px 12px 13px;}
  .kente-card-title{
    font-family:var(--ff-serif);
    font-size:20px;
    color:var(--white);
    margin-bottom:4px;
  }
  .kente-card-sub{
    font-size:12px;
    color:var(--paper-muted);
    line-height:1.45;
  }
  .gold-field{
    width:100%;
    border:1px solid var(--paper-line);
    border-radius:12px;
    background:var(--paper-elev);
    color:var(--white);
    padding:11px 13px;
    font-size:13px;
    outline:none;
  }
  .gold-field::placeholder{color:var(--paper-muted);}
  .gold-field:focus{border-color:var(--gold);}
  .kente-btn{
    border:1px solid rgba(201,168,76,0.42);
    background:linear-gradient(135deg,#D9B24D,#B98A22);
    color:#18110A;
    border-radius:12px;
    padding:11px 14px;
    font-size:12px;
    font-weight:700;
    letter-spacing:0.06em;
    text-transform:uppercase;
    cursor:pointer;
  }
  .kente-btn.alt{
    background:transparent;
    color:var(--gold);
  }
  .mini-label{
    display:block;
    margin-bottom:6px;
    font-size:10px;
    letter-spacing:0.12em;
    text-transform:uppercase;
    color:var(--paper-muted);
  }
  .m-progress{
    display:flex;
    gap:6px;
    align-items:center;
    margin-top:10px;
  }
  .m-progress-step{
    flex:1;
    height:8px;
    border-radius:100px;
    background:rgba(201,168,76,0.18);
    border:1px solid rgba(201,168,76,0.2);
  }
  .m-progress-step.on{
    background:linear-gradient(135deg,#E5BD5E,#B98A22);
    border-color:rgba(201,168,76,0.45);
  }
  .notice-pattern{
    border:1px solid var(--paper-line);
    border-radius:13px;
    background:var(--paper-elev);
    display:flex;
    gap:10px;
    align-items:flex-start;
    padding:10px 12px;
  }
  .notice-dot{
    width:28px;
    height:28px;
    flex-shrink:0;
    border-radius:10px;
    background:linear-gradient(135deg,#6D28D9,#8B5CF6);
    color:#fff;
    display:flex;
    align-items:center;
    justify-content:center;
    font-size:14px;
  }
  .pill-tabs{
    display:flex;
    gap:8px;
    overflow-x:auto;
    scrollbar-width:none;
  }
  .pill-tabs::-webkit-scrollbar{display:none;}
  .pill-tab{
    white-space:nowrap;
    border:1px solid var(--paper-line);
    border-radius:999px;
    background:var(--paper-elev);
    color:var(--paper-muted);
    padding:6px 14px;
    font-size:11px;
    cursor:pointer;
  }
  .pill-tab.on{
    border-color:var(--gold);
    color:var(--gold);
    background:rgba(201,168,76,0.1);
  }
  .shell.screen-tools .feature-root,
  .shell.screen-escrow .feature-root,
  .shell.screen-subscriptions .feature-root,
  .shell.screen-admin .feature-root,
  .shell.screen-community .feature-root{background:var(--paper);}
  .shell.theme-black.screen-tools .feature-root,
  .shell.theme-black.screen-escrow .feature-root,
  .shell.theme-black.screen-subscriptions .feature-root,
  .shell.theme-black.screen-admin .feature-root,
  .shell.theme-black.screen-community .feature-root{background:#050309;}
  .shell.theme-black .feature-head,
  .shell.theme-black .kente-card,
  .shell.theme-black .notice-pattern,
  .shell.theme-black .gold-field,
  .shell.theme-black .pill-tab,
  .shell.theme-black .feature-back{background:#120C1B;border-color:rgba(255,255,255,0.12);}
  .shell.theme-light .kente-btn{color:#19120C;}
  @media (max-width: 768px){
    .shell{max-width:100%;height:100dvh;box-shadow:none;}
    .feed-card{height:100dvh;}
    .feed-topbar{padding:calc(10px + env(safe-area-inset-top)) 12px 0;gap:8px;}
    .feed-tabs-row{gap:10px;}
    .feed-tab{font-size:10px;letter-spacing:0.06em;}
    .feed-editorial{bottom:calc(98px + env(safe-area-inset-bottom));padding:0 14px;}
    .feed-creator-giant{font-size:clamp(28px,10vw,40px);}
    .feed-caption{max-width:72vw;font-size:12px;line-height:1.45;}
    .feed-action-tray{right:10px;bottom:calc(120px + env(safe-area-inset-bottom));gap:4px;}
    .feed-action-circle{width:38px;height:38px;border-radius:12px;}
    .feed-action-num{font-size:9px;}
    .profile-float-btn{top:calc(12px + env(safe-area-inset-top));right:12px;}
    .chat-head{padding:calc(14px + env(safe-area-inset-top)) 12px 12px;}
    .chat-head-title{font-size:24px;margin-bottom:10px;}
    .chat-search-bar{padding:9px 12px;}
    .inbox-story-strip{padding:12px 10px 10px;gap:10px;}
    .inbox-story-item{width:58px;}
    .inbox-story-ring{width:56px;height:56px;}
    .inbox-story-label{font-size:10px;}
    .chat-row{padding:12px 14px;}
    .chat-av{width:44px;height:44px;border-radius:14px;}
    .chat-win-head{padding:12px;}
    .msgs-area{padding:12px;}
    .msg-wrap{max-width:86%;}
    .chat-inp-bar{padding:10px 10px calc(10px + env(safe-area-inset-bottom));gap:8px;}
    .chat-inp{padding:10px 14px;font-size:12px;}
    .chat-send,.emoji-toggle{width:36px;height:36px;}
    .feature-head{padding:calc(14px + env(safe-area-inset-top)) 12px 12px;}
    .feature-title{font-size:25px;}
    .feature-section{padding:12px 12px 0;}
    .feature-grid{grid-template-columns:1fr;}
    .settings-grid{grid-template-columns:1fr !important;gap:10px !important;padding:14px 12px 0 !important;}
    .settings-head{padding:calc(14px + env(safe-area-inset-top)) 12px 12px !important;}
    .settings-title{font-size:26px !important;}
    .settings-label{font-size:22px !important;}
    .settings-foot{padding:14px 12px 0 !important;}
    .live-top{padding:calc(12px + env(safe-area-inset-top)) 12px 0;}
    .live-actions{right:10px;bottom:calc(168px + env(safe-area-inset-bottom));gap:9px;}
    .live-act{width:40px;height:40px;}
    .live-bottom{padding:10px 12px calc(12px + env(safe-area-inset-bottom));}
    .nav-pill.compact .nav-item{width:30px;height:30px;border-radius:12px;}
    .nav-pill.compact .nav-post-btn{width:32px;height:32px;}
    .nav-toggle-grid{width:34px;height:34px;border-radius:14px;}
    .profile-action-row{flex-wrap:wrap;gap:8px;}
    .btn-gold,.btn-ghost{min-width:calc(50% - 4px);}
  }
`;

function injectCSS() {
  let el = document.getElementById("vio-main-css");
  if (!el) {
    el = document.createElement("style");
    el.id = "vio-main-css";
    document.head.appendChild(el);
  }
  if (el.textContent !== CSS) el.textContent = CSS;
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
const IcoUser     = () => <Ico d="M20 21a8 8 0 0 0-16 0 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />;
const IcoUsers    = () => <Ico d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75" />;
const IcoSpark    = () => <Ico d="M12 2l2.2 5.6L20 10l-5.8 2.4L12 18l-2.2-5.6L4 10l5.8-2.4z" />;
const IcoCrown    = () => <Ico d="M3 18l2-11 5 5 4-7 4 7 5-5 2 11H3z M3 18h20v3H3z" />;
const IcoShield   = () => <Ico d="M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5l8-3z" />;
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

function storyExpiry() {
  return Date.now() + 24 * 60 * 60 * 1000;
}

function StoryModal({ user, profile, onClose, onPosted }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [caption, setCaption] = useState("");
  const [error, setError] = useState("");
  const [posting, setPosting] = useState(false);
  const fileRef = useRef();

  const pickFile = (f) => {
    if (!f) return;
    if (!f.type.startsWith("image/") && !f.type.startsWith("video/")) { setError("Choose an image or video for your story."); return; }
    if (f.size > MAX_UPLOAD_BYTES) { setError(`Story media must be ${MAX_UPLOAD_LABEL} or smaller.`); return; }
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setError("");
  };

  const post = async () => {
    if (!file || !user) { setError("Choose media first."); return; }
    setPosting(true); setError("");
    const refDoc = doc(collection(db, "stories"));
    const ext = cleanFileExt(file);
    const isVideo = file.type.startsWith("video/");
    const path = `stories/${user.uid}/${refDoc.id}.${ext}`;
    const task = uploadBytesResumable(sRef(storage, path), file, { contentType: file.type || (isVideo ? "video/mp4" : "image/jpeg") });
    task.on("state_changed", null, (err) => { setError(storageErrorMessage(err)); setPosting(false); }, async () => {
      const url = await getDownloadURL(task.snapshot.ref);
      await setDoc(refDoc, {
        author_id: user.uid,
        media_url: url,
        media_type: isVideo ? "video" : "image",
        caption: caption.trim() || null,
        storage_path: path,
        created_at: serverTimestamp(),
        expires_at: storyExpiry(),
      });
      setPosting(false);
      onPosted?.();
      onClose();
    });
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && !posting && onClose()}>
      <div className="modal-sheet"><div className="sheet-handle" />
        <div className="sheet-inner">
          <div className="sheet-title">Create Story</div>
          <div className="sheet-sub">Share a 24-hour atelier moment</div>
          {error && <div className="err-box">{error}</div>}
          <input ref={fileRef} type="file" accept="image/*,video/*" style={{ display: "none" }} onChange={e => pickFile(e.target.files?.[0])} />
          <div className={`upload-drop-zone ${file ? "has-file" : ""}`} onClick={() => fileRef.current?.click()}>
            {preview ? (file?.type.startsWith("video/") ? <video src={preview} className="upload-preview" muted playsInline /> : <img src={preview} className="upload-preview" alt="" />) : <><span className="upload-icon">＋</span><div className="upload-label">Add story media</div><div className="upload-sublabel">Image or video · max {MAX_UPLOAD_LABEL}</div></>}
          </div>
          <textarea className="modal-input" placeholder={`What are you showing, ${profile?.full_name?.split(" ")[0] || "creator"}?`} rows={2} value={caption} onChange={e => setCaption(e.target.value)} />
          <button className="modal-submit" disabled={posting || !file} onClick={post}>{posting ? "Posting..." : "Post Story ✦"}</button>
          <button className="modal-cancel" disabled={posting} onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

function StoryViewer({ story, onClose }) {
  const author = story?.author || {};
  if (!story) return null;
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-sheet" style={{ height: "88vh", padding: 0, overflow: "hidden" }}>
        <div style={{ position: "absolute", top: 12, left: 14, right: 14, zIndex: 4, display: "flex", alignItems: "center", gap: 10 }}>
          <div className="story-avatar" style={{ width: 34, height: 34, borderColor: "rgba(255,255,255,0.35)" }}>{author.avatar_url ? <img src={author.avatar_url} alt="" /> : initials(author.full_name || author.username)}</div>
          <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 700 }}>{author.full_name || author.username || "Story"}</div><div style={{ fontSize: 10, color: "rgba(255,255,255,0.58)" }}>{timeAgo(story.created_at)}</div></div>
          <button className="chat-back-btn" onClick={onClose}><IcoX /></button>
        </div>
        {story.media_type === "video" ? <video src={story.media_url} autoPlay controls playsInline style={{ width: "100%", height: "100%", objectFit: "cover", background: "#000" }} /> : <img src={story.media_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", background: "#000" }} />}
        {story.caption && <div style={{ position: "absolute", left: 16, right: 16, bottom: 18, zIndex: 4, background: "rgba(6,4,9,0.5)", border: "1px solid rgba(255,255,255,0.16)", borderRadius: 14, padding: "11px 13px", fontSize: 13 }}>{story.caption}</div>}
      </div>
    </div>
  );
}

function PostViewerModal({ video, onClose, onComment }) {
  if (!video) return null;
  const mediaUrl = video.video_url || video.media_url || video.thumbnail_url;
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-sheet" style={{ maxHeight: "92vh" }}>
        <div className="sheet-handle" />
        <div className="sheet-inner">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div><div className="sheet-title" style={{ marginBottom: 0 }}>Post</div><div className="sheet-sub" style={{ marginBottom: 0 }}>{timeAgo(video.created_at)}</div></div>
            <button className="chat-back-btn" onClick={onClose}><IcoX /></button>
          </div>
          {video.video_url ? <video className="post-view-media" src={video.video_url} controls autoPlay playsInline /> : <img className="post-view-media" src={mediaUrl} alt="" />}
          {video.caption && <p className="profile-bio" style={{ margin: "0 0 12px", maxWidth: "none" }}>{video.caption}</p>}
          <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
            <button className="btn-ghost">❤️ {fmt(video.likes_count || 0)}</button>
            <button className="btn-ghost" onClick={() => onComment?.(video)}>💬 {fmt(video.comments_count || 0)}</button>
            <button className="btn-ghost">🔖 {fmt(video.saves_count || 0)}</button>
          </div>
          <button className="modal-submit" onClick={async () => { await shareItem({ title: "VioFashion post", text: video.caption || "View my VioFashion post" }); }}>Share Post</button>
        </div>
      </div>
    </div>
  );
}

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
  const [followed, setFollowed] = useState({});
  const [notice, setNotice]     = useState("");
  const [commentVideo, setCommentVideo] = useState(null);
  const [shareVideoItem, setShareVideoItem] = useState(null);
  const [quickActions, setQuickActions] = useState(null);
  const [viewCreator, setViewCreator]   = useState(null);
  const pressTimer = useRef(null);
  const tapTracker = useRef({});
  const videoRefs = useRef({});

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

  useEffect(() => () => {
    window.clearTimeout(pressTimer.current);
    Object.values(tapTracker.current).forEach((tap) => {
      if (tap?.timer) window.clearTimeout(tap.timer);
    });
  }, []);

  const showNotice = (msg) => {
    setNotice(msg);
    window.clearTimeout(showNotice.t);
    showNotice.t = window.setTimeout(() => setNotice(""), 2200);
  };

  const allVideos = videos.length > 0 ? videos : DEMO_VIDEOS;
  const followedVideos = allVideos.filter(v => followed[v.creator?.id || v.creator_id]);
  const reactionCount = (v) => (v.likes_count || 0) + (v.happy_count || 0) + (v.wow_count || 0) + (v.sad_count || 0) + (v.angry_count || 0);
  const trendingScore = (v) => reactionCount(v) + (v.comments_count || 0) + (v.shares_count || 0) + (v.saves_count || 0);
  const display = tab === "following"
    ? followedVideos
    : tab === "trending"
      ? [...allVideos].sort((a, b) => trendingScore(b) - trendingScore(a))
      : allVideos;
  const emptyState = tab === "following"
    ? { title: "No follower posts available", sub: "No posts from followers available." }
    : tab === "trending"
      ? { title: "No trending posts available", sub: "New posts will show up here as engagement grows." }
      : { title: "No posts here yet", sub: "Share something to light up Discover." };

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

  const getTapRegion = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    if (x < rect.width * 0.33) return "left";
    if (x > rect.width * 0.67) return "right";
    return "center";
  };

  const toggleVideoPlayback = (videoId) => {
    const media = videoRefs.current[videoId];
    if (!media) return;
    if (media.paused) {
      media.play().catch(() => {});
      return;
    }
    media.pause();
  };

  const seekVideoBy = (videoId, deltaSeconds) => {
    const media = videoRefs.current[videoId];
    if (!media || !Number.isFinite(media.duration)) return;
    media.currentTime = Math.min(media.duration, Math.max(0, media.currentTime + deltaSeconds));
  };

  const handleCardPointerDown = (video, event) => {
    if (event.target.closest("button,input,textarea,select,audio")) return;
    window.clearTimeout(pressTimer.current);
    pressTimer.current = window.setTimeout(() => setQuickActions(video), 520);
  };

  const handleCardPointerUp = (video, event) => {
    if (event.target.closest("button,input,textarea,select,audio")) return;
    window.clearTimeout(pressTimer.current);
    if (!video.video_url) return;
    const region = getTapRegion(event);
    const now = Date.now();
    const tap = tapTracker.current[video.id];
    if (tap?.timer) window.clearTimeout(tap.timer);
    if (tap && now - tap.time < 280) {
      if (region === "left") { seekVideoBy(video.id, -5); showNotice("Rewind 5s"); }
      if (region === "right") { seekVideoBy(video.id, 5); showNotice("Forward 5s"); }
      tapTracker.current[video.id] = null;
      return;
    }
    tapTracker.current[video.id] = {
      time: now,
      region,
      timer: window.setTimeout(() => {
        if (region === "center") toggleVideoPlayback(video.id);
      }, 220),
    };
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
    if (!user || !cid || cid === user.uid) return;
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
    <div style={{ height: "100%", position: "relative" }}>
      <div className="feed-wrap">
        {display.length === 0 && (
          <div className="empty-state" style={{ height: "100dvh", display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <div className="empty-title">{emptyState.title}</div>
            <div className="empty-sub">{emptyState.sub}</div>
          </div>
        )}
        {display.map((v, i) => {
          const name = v.creator?.full_name || v.creator?.username || "Creator";
          const [first, ...rest] = name.split(" ");
          const last = rest.join(" ");
          const pal = v.pal ?? (i % PALETTES.length);
          const creatorId = v.creator?.id || v.creator_id;
          return (
            <div key={v.id} className="feed-card" onPointerDown={(event) => handleCardPointerDown(v, event)} onPointerUp={(event) => handleCardPointerUp(v, event)} onPointerCancel={() => window.clearTimeout(pressTimer.current)}>
              <div className="feed-video-bg" style={{ background: v.thumbnail_url ? `url(${v.thumbnail_url}) center/cover no-repeat` : PALETTES[pal] }}>
                {v.video_url && (
                  <video
                    ref={(node) => {
                      if (node) videoRefs.current[v.id] = node;
                      else delete videoRefs.current[v.id];
                    }}
                    src={v.video_url}
                    style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
                    autoPlay
                    muted={false}
                    loop
                    playsInline
                    preload="metadata"
                    controls={false}
                    onLoadedMetadata={(event) => {
                      const media = event.currentTarget;
                      media.muted = false;
                      media.volume = 1;
                      if (media.paused) media.play().catch(() => {});
                    }}
                  />
                )}
                {!v.thumbnail_url && !v.video_url && (
                  <><div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.18 }}>
                    <svg width="160" height="280" viewBox="0 0 160 280" fill="none"><ellipse cx="80" cy="45" rx="30" ry="38" fill="rgba(255,255,255,0.7)" /><path d="M50 83 Q28 120 22 200 Q65 192 80 185 Q95 192 138 200 Q132 120 110 83 Q96 108 80 108 Q64 108 50 83Z" fill="rgba(255,255,255,0.5)" /><path d="M22 200 Q14 255 24 280 L55 265 L65 205 Q72 195 80 195 Q88 195 95 205 L105 265 L136 280 Q146 255 138 200Z" fill="rgba(255,255,255,0.4)" /></svg>
                  </div><div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.06 }}><span style={{ fontFamily: "var(--ff-impact)", fontSize: 180, color: "#fff", letterSpacing: -6 }}>VIO</span></div></>
                )}
              </div>
              <div className="feed-cinema" />
              <div className="edition-badge"><div className="edition-num">{String(i + 1).padStart(2, "0")}</div><div className="edition-label">Edition</div></div>
              <div className="feed-topbar">
                <div className="feed-tabs-row">{[["discover", "Discover"], ["following", "Following"], ["trending", "Trending"]].map(([k, l]) => (<button key={k} className={`feed-tab ${tab === k ? "on" : ""}`} onClick={(event) => { event.stopPropagation(); setTab(k); }}>{l}</button>))}</div>
                <div className="feed-topbar-right"><button className="feed-icon-btn" onClick={(event) => { event.stopPropagation(); onSearch(); }}><IcoSearch /></button><button className="feed-icon-btn" onClick={(event) => { event.stopPropagation(); onNotifications(); }}><IcoBell /></button></div>
              </div>
              <div className="feed-action-tray">
                <button className="feed-action" onClick={(event) => { event.stopPropagation(); toggleLike(v.id); }}><div className={`feed-action-circle ${reactions[v.id] ? "lit" : ""}`}>{reactions[v.id] && reactions[v.id] !== "love" ? reactionById(reactions[v.id]).icon : <IcoHeart lit={!!reactions[v.id]} />}</div><span className="feed-action-num">{fmt(reactionCount(v))}</span></button>
                <button className="feed-action" onClick={(event) => { event.stopPropagation(); setCommentVideo(v); }}><div className="feed-action-circle"><IcoComment /></div><span className="feed-action-num">{fmt(v.comments_count)}</span></button>
                <button className="feed-action" onClick={(event) => { event.stopPropagation(); toggleSave(v.id); }}><div className={`feed-action-circle ${saved[v.id] ? "lit" : ""}`}><IcoBookmark /></div><span className="feed-action-num">{fmt(v.saves_count || 0)}</span></button>
                <button className="feed-action" onClick={(event) => { event.stopPropagation(); setShareVideoItem(v); }}><div className="feed-action-circle"><IcoShare /></div><span className="feed-action-num">{fmt(v.shares_count || 0)}</span></button>
              </div>
              <div className="feed-editorial">
                <div className="feed-creator-giant">{first} <span>{last}</span></div>
                <div className="feed-handle-row">
                  <div className="feed-handle-av" style={{ background: PALETTES[pal], cursor: creatorId && user?.uid !== creatorId ? "pointer" : "default" }} onClick={(event) => { event.stopPropagation(); if (creatorId && user?.uid !== creatorId) setViewCreator(creatorId); }}>
                    {v.creator?.avatar_url ? <img src={v.creator.avatar_url} alt={name} /> : initials(name)}
                  </div>
                  <span className="feed-handle-text" style={{ cursor: creatorId && user?.uid !== creatorId ? "pointer" : "default" }} onClick={(event) => { event.stopPropagation(); if (creatorId && user?.uid !== creatorId) setViewCreator(creatorId); }}>@{v.creator?.username || "creator"}</span>
                  {user?.uid !== creatorId && <button className={`feed-follow-pill ${followed[creatorId] ? "following" : ""}`} onClick={(event) => { event.stopPropagation(); toggleFollow(creatorId); }}>{followed[creatorId] ? "Following" : "+ Follow"}</button>}
                </div>
                {v.caption && <p className="feed-caption">{v.caption}</p>}
                {v.tags?.length > 0 && <div className="feed-tags">{v.tags.map(t => <span key={t} className="feed-tag">{t.startsWith("#") ? t : `#${t}`}</span>)}</div>}
                <div className="feed-sound-row"><div className="feed-vinyl" /><IcoMusic /><span className="feed-sound-text">{v.video_url ? (v.sound_name ? `Original sound - ${v.sound_name}` : "Original sound") : (v.sound_name || "No sound")}</span></div>
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
  const [viewPost, setViewPost] = useState(null);
  const [commentPost, setCommentPost] = useState(null);
  const [avatarStatus, setAvatarStatus] = useState("");
  const [coverStatus, setCoverStatus] = useState("");
  const fileRef = useRef();
  const coverRef = useRef();
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
    if (!file.type.startsWith("image/")) {
      setAvatarStatus("Choose an image file for your profile picture.");
      e.target.value = "";
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setAvatarStatus(`Profile picture must be ${MAX_UPLOAD_LABEL} or smaller.`);
      e.target.value = "";
      return;
    }
    setAvatarStatus("Uploading profile picture...");
    const ext = cleanFileExt(file);
    const path = `avatars/${user.uid}/avatar.${ext}`;
    const task = uploadBytesResumable(sRef(storage, path), file, { contentType: file.type });
    task.on("state_changed", null, (err) => {
      setAvatarStatus(storageErrorMessage(err));
      e.target.value = "";
    }, async () => {
      const url = await getDownloadURL(task.snapshot.ref);
      await updateDoc(doc(db, "profiles", user.uid), { avatar_url: url });
      onProfileUpdated();
      setAvatarStatus("Profile picture updated.");
      e.target.value = "";
      window.setTimeout(() => setAvatarStatus(""), 2200);
    });
  };

  const shareProfile = async () => {
    try {
      await shareItem({ title: `${fullName} on VioFashion`, text: `Check out ${fullName}'s VioFashion profile.` });
    } catch (err) {
      if (err.name !== "AbortError") window.alert("Could not share this profile.");
    }
  };

  const uploadCover = async (e) => {
    const file = e.target.files[0];
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) {
      setCoverStatus("Choose an image file for your cover.");
      e.target.value = "";
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setCoverStatus(`Cover photo must be ${MAX_UPLOAD_LABEL} or smaller.`);
      e.target.value = "";
      return;
    }
    setCoverStatus("Uploading cover photo...");
    const ext = cleanFileExt(file);
    const path = `banners/${user.uid}/cover.${ext}`;
    const task = uploadBytesResumable(sRef(storage, path), file, { contentType: file.type });
    task.on("state_changed", null, (err) => {
      setCoverStatus(storageErrorMessage(err));
      e.target.value = "";
    }, async () => {
      const url = await getDownloadURL(task.snapshot.ref);
      await updateDoc(doc(db, "profiles", user.uid), { banner_url: url });
      onProfileUpdated();
      setCoverStatus("Cover photo updated.");
      e.target.value = "";
      window.setTimeout(() => setCoverStatus(""), 2200);
    });
  };

  const tabs = [{ id: "portfolio", label: "Works" }, { id: "orders", label: "Orders" }, ...(isCreator ? [{ id: "analytics", label: "Analytics" }] : []), { id: "reviews", label: "Reviews" }];

  return (
    <>
      <div className="profile-scroll">
        <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={uploadAvatar} />
        <input ref={coverRef} type="file" accept="image/*" style={{ display: "none" }} onChange={uploadCover} />
        <div className="profile-hero">
          <div className="profile-hero-bg" style={{ background: dp.banner_url ? `url(${dp.banner_url}) center/cover` : PALETTES[0] }}>
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.1 }}><span style={{ fontFamily: "var(--ff-impact)", fontSize: 150, color: "#fff", letterSpacing: -4 }}>VIOFASHION</span></div>
          </div>
          <div className="profile-hero-grad" />
          <div className="profile-hero-name">{first}<br />{last}</div>
          <div style={{ position: "absolute", top: 14, right: 14, zIndex: 11, width: 48, height: 48, borderRadius: "50%", border: "2px solid var(--gold)", overflow: "hidden", boxShadow: "0 8px 24px rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, cursor: "pointer", background: PALETTES[0], flexShrink: 0 }} onClick={() => coverRef.current?.click()}>
            {dp.banner_url ? <img src={dp.banner_url} alt="Cover" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "C"}
            <div style={{ position: "absolute", bottom: 0, right: 0, width: 20, height: 20, background: "var(--violet)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid var(--deep)", fontSize: 10 }}>C</div>
          </div>
          <div style={{ position: "absolute", bottom: -52, left: 18, zIndex: 12, width: 110, height: 110, borderRadius: "50%", border: "3px solid var(--gold)", overflow: "hidden", boxShadow: "0 12px 36px rgba(0,0,0,0.58)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 34, fontWeight: 700, cursor: "pointer", background: PALETTES[0], flexShrink: 0 }} onClick={() => fileRef.current?.click()}>
            {dp.avatar_url ? <img src={dp.avatar_url} alt={fullName} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : initials(fullName)}
            <div style={{ position: "absolute", bottom: 2, right: 2, width: 24, height: 24, background: "var(--violet)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid var(--deep)", fontSize: 10 }}>✎</div>
          </div>
        </div>
        <div className="profile-meta" style={{ paddingTop: 66 }}>
          <div className="profile-handle-row"><span className="profile-handle">@{dp.username || user?.email?.split("@")[0]}{dp.location && ` · ${dp.location}`}</span>{dp.is_verified && <span className="verified-mark">✓</span>}</div>
          <div className="profile-role-chip">{ROLE_EMOJI[dp.role] || "🛍️"} {(dp.role || "customer").replace("_", " ")}</div>
          <p className="profile-bio" style={!dp.bio ? { opacity: 0.4, fontStyle: "italic" } : {}}>{dp.bio || "Tap Edit Profile to add your bio…"}</p>
          <div className="profile-stats-row">
            {[[fmt(dp.followers_count || 0), "Followers"], [fmt(dp.following_count || 0), "Following"], [fmt(dp.orders_count || 0), "Orders"], [dp.rating ? `${dp.rating} ★` : "—", "Rating"]].map(([n, l]) => (
              <div key={l} className="profile-stat"><span className="profile-stat-n">{n}</span><span className="profile-stat-l">{l}</span></div>
            ))}
          </div>
          <div className="profile-action-row"><button className="btn-gold" onClick={() => setShowEdit(true)}>Edit Profile</button><button className="btn-ghost" onClick={() => fileRef.current?.click()}>Photo</button><button className="btn-ghost" onClick={() => coverRef.current?.click()}>Cover</button><button className="btn-ghost" onClick={shareProfile}>Share</button><button className="btn-ghost" onClick={onSettings} title="Settings"><IcoGear /></button><button className="btn-danger" onClick={onSignOut} title="Sign out"><IcoLogout /></button></div>
          {avatarStatus && <div style={{ marginTop: 10, color: "var(--gold)", fontSize: 12, fontWeight: 700 }}>{avatarStatus}</div>}
          {coverStatus && <div style={{ marginTop: 8, color: "var(--gold)", fontSize: 12, fontWeight: 700 }}>{coverStatus}</div>}
          {dp.services?.length > 0 && <div className="service-chips">{dp.services.map(s => <span key={s} className="service-chip">{s}</span>)}</div>}
        </div>
        <div className="profile-tabs">{tabs.map(t => (<button key={t.id} onClick={() => setTab(t.id)} className="profile-tab" style={{ color: tab === t.id ? "var(--white)" : "var(--muted)", borderBottom: `1.5px solid ${tab === t.id ? "var(--gold)" : "transparent"}` }}>{t.label}</button>))}</div>
        {tab === "portfolio" && (
          <div style={{ padding: "0 20px" }}>
            <div className="section-head">Works</div>
            {videos.length > 0 ? (
              <div className="portfolio-grid">{videos.map((v, i) => (
                <button key={v.id} className="p-item" onClick={() => setViewPost(v)} style={{ background: v.thumbnail_url ? `url(${v.thumbnail_url}) center/cover` : portPals[i % portPals.length], border: 0, padding: 0, cursor: "pointer", textAlign: "left" }}>
                  {!v.thumbnail_url && v.video_url && <video src={v.video_url} muted playsInline preload="metadata" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                  {!v.thumbnail_url && !v.video_url && <div className="p-item-inner"><span style={{ fontFamily: "var(--ff-serif)", fontSize: i === 0 ? 36 : 22, fontStyle: "italic", color: "rgba(255,255,255,0.2)" }}>#{i + 1}</span></div>}
                  <div className="p-overlay"><span style={{ fontSize: 10, color: "rgba(255,255,255,0.8)" }}>❤ {fmt(v.likes_count)}</span></div>
                </button>
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
      {viewPost && <PostViewerModal video={viewPost} onClose={() => setViewPost(null)} onComment={(v) => setCommentPost(v)} />}
      {commentPost && <CommentsModal video={{ ...commentPost, creator: profile }} user={user} onClose={() => setCommentPost(null)} />}
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
          <div className="market-eyebrow">Fashion Market</div>
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
function ChatScreen({ user, profile, pendingConv, onConvOpened }) {
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
  const [messageMenu, setMessageMenu] = useState(null);
  const [stories, setStories] = useState([]);
  const [showStoryCreate, setShowStoryCreate] = useState(false);
  const [activeStory, setActiveStory] = useState(null);
  const endRef = useRef();
  const recorderRef = useRef(null);
  const voiceChunksRef = useRef([]);
  const voiceActionRef = useRef("draft");

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
      setMessages(snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(m => !(m.deleted_for || []).includes(user?.uid)));
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }, (error) => {
      console.error("Failed to load messages", error);
      setMessages([]);
    });
    return unsub;
  }, [open, user?.uid]);

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

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "stories"), orderBy("created_at", "desc"), limit(80));
    const unsub = onSnapshot(q, async (snap) => {
      const now = Date.now();
      const byAuthor = new Map();
      for (const item of snap.docs) {
        const story = { id: item.id, ...item.data() };
        if (story.expires_at && story.expires_at < now) continue;
        if (story.author_id === user.uid) continue;
        if (!story.author_id || byAuthor.has(story.author_id)) continue;
        byAuthor.set(story.author_id, story);
        if (byAuthor.size >= 24) break;
      }
      const rows = await Promise.all([...byAuthor.values()].map(async (story) => {
        const ps = await getDoc(doc(db, "profiles", story.author_id));
        return { ...story, author: ps.exists() ? { id: ps.id, ...ps.data() } : null };
      }));
      setStories(rows);
    }, (error) => console.error("Failed to load inbox stories", error));
    return unsub;
  }, [user]);

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
      setRecordingBlob(null);
      setShowVoiceOptions(false);
      setVoiceUploading(false);
    });
  };

  const stopRecording = (action = "draft") => {
    if (!recording) return;
    voiceActionRef.current = action;
    recorderRef.current?.stop();
    setRecording(false);
  };

  const sendVoiceNote = async () => {
    if (recordingBlob) await uploadVoiceNote(recordingBlob);
    setShowVoiceOptions(false);
  };

  const cancelVoiceNote = () => {
    setShowVoiceOptions(false);
    setRecordingBlob(null);
  };

  const toggleRecording = async () => {
    if (recording) {
      stopRecording("draft");
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
        if (!blob.size) return;
        if (voiceActionRef.current === "send") {
          uploadVoiceNote(blob);
        } else {
          setRecordingBlob(blob);
          setShowVoiceOptions(true);
        }
        voiceActionRef.current = "draft";
      };
      voiceActionRef.current = "draft";
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

  const deleteMessageForMe = async (messageId) => {
    if (!user?.uid) return;
    await updateDoc(doc(db, "messages", messageId), { deleted_for: arrayUnion(user.uid) });
    setMessageMenu(null);
  };

  const deleteMessageForEveryone = async (message) => {
    if (!user?.uid || message.sender_id !== user.uid) return;
    await updateDoc(doc(db, "messages", message.id), {
      deleted_all: true,
      content: "This message was deleted",
      audio_url: null,
      deleted_at: serverTimestamp(),
    });
    setMessageMenu(null);
  };

  return (
    <div className="chat-outer">
      <div className="chat-head"><div className="chat-head-title">Messages</div><div className="chat-search-bar"><IcoSearch /><input placeholder="Search conversations..." value={queryStr} onChange={e => setQueryStr(e.target.value)} /></div><div className="chat-search-bar" style={{ marginTop: 10 }}><IcoPlus /><input placeholder="Find users to message..." value={userQuery} onChange={e => setUserQuery(e.target.value)} /></div></div>
      <div className="chat-list-area">
        <div className="inbox-story-strip">
          <button className="inbox-story-item" onClick={() => setShowStoryCreate(true)}>
            <span className="inbox-story-ring mine">
              <span className="inbox-story-avatar">
                {profile?.avatar_url ? <img src={profile.avatar_url} alt="" /> : initials(profile?.full_name || user?.email || "Me")}
                <span className="inbox-story-plus">+</span>
              </span>
            </span>
            <span className="inbox-story-label">Create</span>
          </button>
          {stories.map((story, i) => (
            <button key={story.id} className="inbox-story-item" onClick={() => setActiveStory(story)}>
              <span className="inbox-story-ring">
                <span className="inbox-story-avatar" style={{ background: PALETTES[i % PALETTES.length] }}>
                  {story.author?.avatar_url ? <img src={story.author.avatar_url} alt="" /> : initials(story.author?.full_name || story.author?.username || "S")}
                </span>
              </span>
              <span className="inbox-story-label">{story.author?.username || story.author?.full_name || "Story"}</span>
            </button>
          ))}
        </div>
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
                const isDeleted = !!m.deleted_all;
                return (
                  <div key={m.id} className={`msg-wrap ${isOut ? "out" : "inc"}`}>
                    {!isOut && <div style={{ width: 26, height: 26, borderRadius: 8, flexShrink: 0, alignSelf: "flex-end", background: PALETTES[pal], display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700 }}>{initials(o?.full_name || o?.username)}</div>}
                    <div>
                      <div className="msg-bubble">{!isDeleted && m.type === "voice" && m.audio_url ? <audio controls src={m.audio_url} style={{ width: 180 }} /> : <span style={isDeleted ? { opacity: 0.65, fontStyle: "italic" } : null}>{m.content}</span>}</div>
                      <div className="msg-tools">
                        <span className="msg-time">{timeAgo(m.created_at)}</span>
                        <button className="msg-more" onClick={() => setMessageMenu(p => p === m.id ? null : m.id)} title="Message options">⋯</button>
                        {messageMenu === m.id && (
                          <div className="msg-menu">
                            <button onClick={() => deleteMessageForMe(m.id)}>Delete for me</button>
                            {isOut && !isDeleted && <button className="danger" onClick={() => deleteMessageForEveryone(m)}>Delete for everyone</button>}
                          </div>
                        )}
                      </div>
                    </div>
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
                  <button className="chat-send" onClick={() => stopRecording("draft")} title="Stop recording" style={{ background: "var(--danger)" }}>■</button>
                  <button className="chat-send" onClick={() => stopRecording("send")} title="Send immediately" style={{ background: "var(--green)" }}><IcoSend /></button>
                </>
              ) : (
                <>
                  <button className="chat-send" onClick={toggleRecording} title="Voice note">🎙</button>
                  <button className="chat-send" onClick={send}><IcoSend /></button>
                </>
              )}
            </div>
            {voiceUploading && <div style={{ position: "absolute", bottom: 78, left: 16, right: 16, fontSize: 11, color: "var(--gold-lt)", textAlign: "center" }}>Uploading voice note...</div>}
            {showVoiceOptions && (
              <div className="modal-overlay" style={{ zIndex: 600 }}>
                <div className="modal-sheet" style={{ maxWidth: 300, textAlign: "center" }}>
                  <div className="sheet-handle" />
                  <div className="sheet-inner">
                    <div className="sheet-title">Voice Note</div>
                    <div className="sheet-sub">What would you like to do with your recording?</div>
                    {recordingBlob && <audio controls src={URL.createObjectURL(recordingBlob)} style={{ width: "100%", marginBottom: 12 }} />}
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
      {showStoryCreate && <StoryModal user={user} profile={profile} onClose={() => setShowStoryCreate(false)} />}
      {activeStory && <StoryViewer story={activeStory} onClose={() => setActiveStory(null)} />}
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
        <div><div className="live-cr-name">{activeStream ? (profile?.full_name || "You") : "Amara Osei"}</div><div className="live-cr-sub">✂️ Studio · Accra</div></div>
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
function MilestoneBar({ stage = 0 }) {
  const steps = [0, 1, 2, 3, 4];
  return (
    <div className="m-progress">
      {steps.map(step => <span key={step} className={`m-progress-step ${step <= stage ? "on" : ""}`} />)}
    </div>
  );
}

function ToolsScreen({ user, onBack }) {
  const [form, setForm] = useState({ height: "", chest: "", waist: "", hips: "", inseam: "", shoulder: "" });
  const [fit, setFit] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const update = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!user?.uid) {
        if (mounted) setLoading(false);
        return;
      }
      try {
        const existing = await getMeasurementProfile(user.uid);
        if (!mounted || !existing) return;
        setForm({
          height: existing.height || "",
          chest: existing.chest || "",
          waist: existing.waist || "",
          hips: existing.hips || "",
          inseam: existing.inseam || "",
          shoulder: existing.shoulder || "",
        });
        if (existing.generated_fit) setFit(existing.generated_fit);
      } catch {
        // Keep local blank state if profile has no saved measurements.
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [user?.uid]);

  const generate = () => {
    const chest = Number(form.chest || 0);
    const waist = Number(form.waist || 0);
    const hips = Number(form.hips || 0);
    const score = (chest + waist + hips) / 3;
    const size = score < 78 ? "XS" : score < 88 ? "S" : score < 98 ? "M" : score < 108 ? "L" : "XL";
    const cut = hips - waist > 18 ? "Curved Fit" : "Classic Fit";
    const advice = chest > 104 ? "Use reinforced shoulder seam and deeper armhole." : "Use relaxed armhole and light lining.";
    setFit({ size, cut, advice });
  };

  const saveProfile = async () => {
    if (!user?.uid) return;
    setSaving(true);
    try {
      await saveMeasurementProfile({
        userId: user.uid,
        payload: { ...form, generated_fit: fit || null },
      });
      setNotice("Measurement profile saved.");
    } catch (err) {
      setNotice(err.message || "Could not save measurement profile.");
    } finally {
      setSaving(false);
      window.setTimeout(() => setNotice(""), 2400);
    }
  };

  return (
    <div className="feature-root">
      <div className="feature-head">
        <div><div className="feature-title">Measure & AI</div><div className="feature-sub">Precision sizing, fit intelligence, and design prep.</div></div>
        <button className="feature-back" onClick={onBack}><IcoBack /></button>
      </div>
      <div className="feature-section">
        <div className="feature-grid">
          {loading && <div style={{ fontSize: 12, color: "var(--paper-muted)" }}>Loading saved profile...</div>}
          {[["Height (cm)", "height"], ["Chest (cm)", "chest"], ["Waist (cm)", "waist"], ["Hips (cm)", "hips"], ["Inseam (cm)", "inseam"], ["Shoulder (cm)", "shoulder"]].map(([label, key]) => (
            <div key={key}>
              <label className="mini-label">{label}</label>
              <input className="gold-field" value={form[key]} onChange={update(key)} placeholder="0" inputMode="decimal" />
            </div>
          ))}
        </div>
      </div>
      <div className="feature-section" style={{ display: "flex", gap: 10 }}>
        <button className="kente-btn" onClick={generate}>Generate Fit</button>
        <button className="kente-btn alt" onClick={saveProfile} disabled={saving}>{saving ? "Saving..." : "Save Profile"}</button>
      </div>
      <div className="feature-section">
        <div className="kente-card">
          <div className="kente-card-head" />
          <div className="kente-card-body">
            <div className="kente-card-title">Virtual Pattern Guidance</div>
            <div className="kente-card-sub">Base model adapts to your measurement profile for tailoring and drape previews.</div>
            <MilestoneBar stage={fit ? 4 : 2} />
            <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div className="notice-pattern"><span className="notice-dot"><IcoSpark /></span><div><strong>Suggested Size</strong><br /><small>{fit?.size || "Run generator"}</small></div></div>
              <div className="notice-pattern"><span className="notice-dot"><IcoUser /></span><div><strong>Body Cut</strong><br /><small>{fit?.cut || "Awaiting profile"}</small></div></div>
            </div>
            <div style={{ marginTop: 10, fontSize: 12, color: "var(--paper-muted)" }}>{fit?.advice || "Add measurements and generate fit to unlock construction guidance."}</div>
          </div>
        </div>
      </div>
      {notice && <div className="feature-section"><div className="notice-pattern"><span className="notice-dot">✓</span><div style={{ fontSize: 12 }}>{notice}</div></div></div>}
    </div>
  );
}

function EscrowEventList({ requestId }) {
  const { events, loading } = useEscrowEvents(requestId, 6);
  if (!requestId) return null;
  if (loading) return <div style={{ marginTop: 8, fontSize: 11, color: "var(--paper-muted)" }}>Loading timeline...</div>;
  if (events.length === 0) return <div style={{ marginTop: 8, fontSize: 11, color: "var(--paper-muted)" }}>No escrow events yet.</div>;
  return (
    <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
      {events.map((event) => (
        <div key={event.id} style={{ border: "1px solid var(--paper-line)", borderRadius: 10, padding: "7px 9px", background: "color-mix(in srgb, var(--paper-elev) 94%, transparent)" }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "capitalize" }}>{event.type?.replace("_", " ") || "Update"}</div>
          <div style={{ fontSize: 10, color: "var(--paper-muted)" }}>{event.label || event.status_after || "Escrow activity"}</div>
          <div style={{ fontSize: 10, color: "var(--paper-muted)", marginTop: 2 }}>{timeAgo(event.created_at)}</div>
        </div>
      ))}
    </div>
  );
}

function EscrowScreen({ user, profile, onBack }) {
  const isCreator = CREATOR_ROLES.includes(profile?.role);
  const { orders: customerOrders, loading: loadingCustomer, reload: reloadCustomer } = useCustomerOrders(!isCreator ? user?.uid : null);
  const { orders: creatorOrders, loading: loadingCreator, reload: reloadCreator } = useCreatorOrders(isCreator ? user?.uid : null);
  const [busyRequest, setBusyRequest] = useState("");
  const [notice, setNotice] = useState("");
  const orders = isCreator ? creatorOrders : customerOrders;
  const loading = isCreator ? loadingCreator : loadingCustomer;

  const releaseEscrow = async (requestId) => {
    if (!requestId || !user?.uid) return;
    setBusyRequest(requestId);
    try {
      await releaseEscrowForRequest({ requestId, actorId: user.uid });
      await (isCreator ? reloadCreator() : reloadCustomer());
      setNotice("Escrow released successfully.");
    } catch (err) {
      setNotice(err.message || "Could not release escrow.");
    }
    setBusyRequest("");
    window.setTimeout(() => setNotice(""), 2500);
  };

  const advanceMilestone = async (requestId, nextStage, label, participants) => {
    if (!requestId || !user?.uid) return;
    setBusyRequest(requestId);
    try {
      await appendEscrowMilestone({
        requestId,
        actorId: user.uid,
        participants: (participants || []).filter(Boolean),
        label,
        stage: nextStage,
      });
      await (isCreator ? reloadCreator() : reloadCustomer());
      setNotice("Milestone updated.");
    } catch (err) {
      setNotice(err.message || "Could not update milestone.");
    }
    setBusyRequest("");
    window.setTimeout(() => setNotice(""), 2200);
  };

  const normalize = (order) => {
    if (isCreator) {
      const customerId = order.request?.customer_id || null;
      return {
        id: order.id,
        requestId: order.request?.id,
        status: order.request?.status || "pending",
        milestoneStage: typeof order.request?.milestone_stage === "number" ? order.request.milestone_stage : null,
        title: order.request?.title || "Commission",
        counterparty: order.request?.customer?.full_name || order.request?.customer?.username || "Customer",
        budget: order.price || order.request?.budget || null,
        participants: [user?.uid, customerId].filter(Boolean),
      };
    }
    const creatorId = order.accepted_offer?.[0]?.creator_id || null;
    return {
      id: order.id,
      requestId: order.id,
      status: order.status || "pending",
      milestoneStage: typeof order.milestone_stage === "number" ? order.milestone_stage : null,
      title: order.title || "Commission",
      counterparty: order.accepted_offer?.[0]?.creator?.full_name || order.accepted_offer?.[0]?.creator?.username || "Creator",
      budget: order.accepted_offer?.[0]?.price || order.budget || null,
      participants: [user?.uid, creatorId].filter(Boolean),
    };
  };
  const stageFromStatus = (status) => {
    if (status === "open" || status === "pending") return 0;
    if (status === "in_progress") return 2;
    if (status === "completed") return 3;
    if (status === "paid") return 4;
    return 1;
  };

  return (
    <div className="feature-root">
      <div className="feature-head">
        <div><div className="feature-title">Escrow Hub</div><div className="feature-sub">Track milestones, logistics readiness, and secure release.</div></div>
        <button className="feature-back" onClick={onBack}><IcoBack /></button>
      </div>
      <div className="feature-section"><div className="notice-pattern"><span className="notice-dot"><IcoShield /></span><div><strong>Secure Escrow:</strong><br /><small>Funds release only when milestones are approved by both parties.</small></div></div></div>
      {loading && <Spinner />}
      {!loading && orders.length === 0 && <div className="feature-section"><div className="kente-card"><div className="kente-card-head" /><div className="kente-card-body"><div className="kente-card-title">No Active Orders</div><div className="kente-card-sub">Accepted commissions and escrow milestones will appear here.</div></div></div></div>}
      {!loading && orders.map((raw) => {
        const order = normalize(raw);
        const stage = typeof order.milestoneStage === "number" ? order.milestoneStage : stageFromStatus(order.status);
        return (
          <div className="feature-section" key={order.id}>
            <div className="kente-card">
              <div className="kente-card-head" />
              <div className="kente-card-body">
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <div><div className="kente-card-title" style={{ marginBottom: 1 }}>{order.title}</div><div className="kente-card-sub">with {order.counterparty}</div></div>
                  {order.budget && <div style={{ fontSize: 14, fontWeight: 700, color: "var(--gold)" }}>GH₵ {Number(order.budget).toLocaleString()}</div>}
                </div>
                <MilestoneBar stage={stage} />
                <div style={{ marginTop: 9, display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--paper-muted)" }}><span>Commission</span><span>Accepted</span><span>In Work</span><span>Delivered</span><span>Paid</span></div>
                <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button className="pill-tab on">{order.status.replace("_", " ")}</button>
                  {isCreator && stage < 3 && <button className="kente-btn alt" disabled={busyRequest === order.requestId} onClick={() => advanceMilestone(order.requestId, Math.min(stage + 1, 3), stage < 2 ? "Work progressed" : "Marked as delivered", order.participants)}>{busyRequest === order.requestId ? "Updating..." : "Advance Milestone"}</button>}
                  {!isCreator && (order.status === "completed" || order.status === "in_progress") && <button className="kente-btn" disabled={busyRequest === order.requestId} onClick={() => releaseEscrow(order.requestId)}>{busyRequest === order.requestId ? "Processing..." : "Release Escrow"}</button>}
                </div>
                <EscrowEventList requestId={order.requestId} />
              </div>
            </div>
          </div>
        );
      })}
      {notice && <div className="feature-section"><div className="notice-pattern"><span className="notice-dot">✓</span><div style={{ fontSize: 12 }}>{notice}</div></div></div>}
    </div>
  );
}

function CommunityScreen({ user, onBack, onStartChat }) {
  const [tab, setTab] = useState("forums");
  const [text, setText] = useState("");
  const [queryStr, setQueryStr] = useState("");
  const [people, setPeople] = useState([]);
  const [loadingPeople, setLoadingPeople] = useState(false);
  const { posts, loading: loadingPosts, error: postsError } = useCommunityPosts(50);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const t = window.setTimeout(async () => {
      setLoadingPeople(true);
      try {
        setPeople(await getArtisanDirectory({ needle: queryStr, limitCount: 24 }));
      } finally {
        setLoadingPeople(false);
      }
    }, queryStr.trim() ? 220 : 90);
    return () => window.clearTimeout(t);
  }, [queryStr]);

  const publish = async () => {
    const content = text.trim();
    if (!content || !user?.uid) return;
    try {
      await createCommunityPost({ authorId: user.uid, content });
      setText("");
      setNotice("Community post published.");
    } catch (err) {
      setNotice(err.message || "Could not publish right now.");
    }
    window.setTimeout(() => setNotice(""), 2200);
  };

  const startConversation = async (person) => {
    if (!user?.uid || !person?.id || person.id === user.uid) return;
    const conv = await getOrCreateConversation(user.uid, person.id);
    onStartChat?.({ ...conv, other: person, participants: conv.participants || [user.uid, person.id] });
  };

  return (
    <div className="feature-root">
      <div className="feature-head">
        <div><div className="feature-title">Community</div><div className="feature-sub">Forums, artisan directory, and collaboration discovery.</div></div>
        <button className="feature-back" onClick={onBack}><IcoBack /></button>
      </div>
      <div className="feature-section"><div className="pill-tabs">{[["forums", "Community Forum"], ["directory", "Artisan Directory"]].map(([id, label]) => <button key={id} className={`pill-tab ${tab === id ? "on" : ""}`} onClick={() => setTab(id)}>{label}</button>)}</div></div>
      {tab === "forums" && (
        <>
          <div className="feature-section">
            <label className="mini-label">Post to Community</label>
            <textarea className="gold-field" rows={3} value={text} maxLength={600} onChange={(e) => setText(e.target.value)} placeholder="Ask, share, or collaborate..." />
            <div style={{ marginTop: 6, fontSize: 10, color: "var(--paper-muted)", textAlign: "right" }}>{text.length}/600</div>
            <div style={{ marginTop: 8 }}><button className="kente-btn" onClick={publish} disabled={text.trim().length < 2 || text.trim().length > 600}>Publish</button></div>
          </div>
          {loadingPosts && <Spinner />}
          {postsError && <div className="feature-section"><div className="notice-pattern"><span className="notice-dot">!</span><div style={{ fontSize: 12 }}>{postsError}</div></div></div>}
          {!loadingPosts && posts.map((post, i) => (
            <div className="feature-section" key={post.id}>
              <div className="notice-pattern">
                <span className="notice-dot" style={{ background: PALETTES[i % PALETTES.length] }}>{post.author?.avatar_url ? <img src={post.author.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : initials(post.author?.full_name || post.author?.username || "A")}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 700 }}>{post.author?.full_name || post.author?.username || "Member"}</div>
                  <div style={{ fontSize: 12, color: "var(--paper-muted)", marginTop: 2, lineHeight: 1.5 }}>{post.content}</div>
                  <div style={{ fontSize: 10, color: "var(--paper-muted)", marginTop: 4 }}>{timeAgo(post.created_at)}</div>
                </div>
              </div>
            </div>
          ))}
        </>
      )}
      {tab === "directory" && (
        <>
          <div className="feature-section">
            <label className="mini-label">Search Directory</label>
            <input className="gold-field" placeholder="Find artisans, designers, tailors..." value={queryStr} onChange={(e) => setQueryStr(e.target.value)} />
          </div>
          {loadingPeople && <Spinner />}
          {!loadingPeople && people.map((person, i) => (
            <div className="feature-section" key={person.id}>
              <div className="notice-pattern">
                <span className="notice-dot" style={{ background: PALETTES[i % PALETTES.length] }}>{person.avatar_url ? <img src={person.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : initials(person.full_name || person.username || "A")}</span>
                <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 700 }}>{person.full_name || person.username}</div><div style={{ fontSize: 11, color: "var(--paper-muted)" }}>{ROLE_EMOJI[person.role] || "✦"} {String(person.role || "creator").replace("_", " ")}</div></div>
                <button className="kente-btn alt" onClick={() => startConversation(person)}>Message</button>
              </div>
            </div>
          ))}
        </>
      )}
      {notice && <div className="feature-section"><div className="notice-pattern"><span className="notice-dot">✓</span><div style={{ fontSize: 12 }}>{notice}</div></div></div>}
    </div>
  );
}

function SubscriptionsScreen({ user, profile, onBack }) {
  const plans = [
    { id: "free", name: "Starter", price: "Free", perks: "Post, follow, comment, and message" },
    { id: "pro", name: "Pro Creator", price: "GH₵29/mo", perks: "Priority placement, analytics depth, custom storefront" },
    { id: "elite", name: "Atelier Elite", price: "GH₵79/mo", perks: "Escrow perks, AI fitting suite, premium badge" },
  ];
  const [tier, setTier] = useState(profile?.subscription_tier || "free");
  const { events: subEvents, loading: loadingEvents } = useSubscriptionEvents(user?.uid, 12);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    setTier(profile?.subscription_tier || "free");
  }, [profile?.subscription_tier]);

  const choose = async (nextTier) => {
    setTier(nextTier);
    if (!user?.uid) return;
    try {
      await setSubscriptionTier({ userId: user.uid, tier: nextTier });
      setNotice(`Subscription set to ${nextTier}.`);
    } catch (err) {
      setNotice(err.message || "Could not update subscription.");
    }
    window.setTimeout(() => setNotice(""), 2200);
  };

  return (
    <div className="feature-root">
      <div className="feature-head">
        <div><div className="feature-title">Subscriptions</div><div className="feature-sub">Creator growth plans, badges, and platform rewards.</div></div>
        <button className="feature-back" onClick={onBack}><IcoBack /></button>
      </div>
      <div className="feature-section"><div className="feature-grid">{plans.map((plan) => (
        <div className="kente-card" key={plan.id}>
          <div className="kente-card-head" />
          <div className="kente-card-body">
            <div className="kente-card-title">{plan.name}</div>
            <div style={{ fontSize: 17, fontWeight: 700, color: "var(--gold)", marginBottom: 4 }}>{plan.price}</div>
            <div className="kente-card-sub">{plan.perks}</div>
            <div style={{ marginTop: 10 }}><button className={`kente-btn ${tier === plan.id ? "alt" : ""}`} onClick={() => choose(plan.id)}>{tier === plan.id ? "Active Plan" : "Select Plan"}</button></div>
          </div>
        </div>
      ))}</div></div>
      <div className="feature-section">
        <div className="kente-card">
          <div className="kente-card-head" />
          <div className="kente-card-body">
            <div className="kente-card-title">Gamification Path</div>
            <div className="kente-card-sub">Earn badges by posting consistently, responding quickly, and keeping high ratings.</div>
            <div style={{ marginTop: 11, display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
              {[["Rising", "3 posts"], ["Trusted", "10 orders"], ["Elite", "4.8+ rating"]].map(([name, need]) => (
                <div key={name} className="notice-pattern" style={{ flexDirection: "column", alignItems: "center", textAlign: "center", gap: 6 }}>
                  <span className="notice-dot"><IcoCrown /></span>
                  <strong style={{ fontSize: 12 }}>{name}</strong>
                  <small style={{ fontSize: 10, color: "var(--paper-muted)" }}>{need}</small>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="feature-section">
        <div className="kente-card">
          <div className="kente-card-head" />
          <div className="kente-card-body">
            <div className="kente-card-title">Subscription Activity</div>
            <div className="kente-card-sub">Recent account-level plan changes.</div>
            {loadingEvents && <div style={{ marginTop: 8, fontSize: 11, color: "var(--paper-muted)" }}>Loading activity...</div>}
            {!loadingEvents && subEvents.length === 0 && <div style={{ marginTop: 8, fontSize: 11, color: "var(--paper-muted)" }}>No events yet.</div>}
            {!loadingEvents && subEvents.map((event) => (
              <div key={event.id} style={{ marginTop: 8, border: "1px solid var(--paper-line)", borderRadius: 10, padding: "8px 10px" }}>
                <div style={{ fontSize: 12, fontWeight: 700 }}>{String(event.tier || "free").toUpperCase()} plan selected</div>
                <div style={{ fontSize: 10, color: "var(--paper-muted)" }}>{timeAgo(event.created_at)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {notice && <div className="feature-section"><div className="notice-pattern"><span className="notice-dot">✓</span><div style={{ fontSize: 12 }}>{notice}</div></div></div>}
    </div>
  );
}

function AdminScreen({ user, profile, onBack }) {
  const isAdminView = ["admin", "owner", "super_admin"].includes(profile?.role);
  const [metrics, setMetrics] = useState({ users: 0, creators: 0, videos: 0, requests: 0, openStreams: 0, alerts: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [repairing, setRepairing] = useState(false);
  const [repairNotice, setRepairNotice] = useState("");

  useEffect(() => {
    if (!isAdminView) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const [profilesSnap, videosSnap, requestsSnap, streamsSnap] = await Promise.all([
          getDocs(query(collection(db, "profiles"), limit(300))),
          getDocs(query(collection(db, "videos"), where("is_published", "==", true), orderBy("created_at", "desc"), limit(300))),
          getDocs(query(collection(db, "requests"), limit(300))),
          getDocs(query(collection(db, "livestreams"), where("is_active", "==", true), limit(30))),
        ]);
        const profiles = profilesSnap.docs.map((d) => d.data());
        const requests = requestsSnap.docs.map((d) => d.data());
        const creators = profiles.filter((p) => CREATOR_ROLES.includes(p.role)).length;
        const pendingEscrow = requests.filter((r) => r.status === "completed" || r.status === "in_progress").length;
        setMetrics({
          users: profiles.length,
          creators,
          videos: videosSnap.size,
          requests: requestsSnap.size,
          openStreams: streamsSnap.size,
          alerts: pendingEscrow,
        });
        setError("");
      } catch (err) {
        console.error("Failed to load admin metrics", err);
        setError(err?.message || "Unable to load admin metrics.");
      } finally {
        setLoading(false);
      }
    })();
  }, [isAdminView, user?.uid, profile?.role]);

  if (!isAdminView) {
    return (
      <div className="feature-root">
        <div className="feature-head">
          <div><div className="feature-title">Data & Admin</div><div className="feature-sub">This workspace is restricted to admin accounts.</div></div>
          <button className="feature-back" onClick={onBack}><IcoBack /></button>
        </div>
        <div className="feature-section">
          <div className="kente-card">
            <div className="kente-card-head" />
            <div className="kente-card-body">
              <div className="kente-card-title">Access Restricted</div>
              <div className="kente-card-sub">Switch to an admin profile to view platform analytics and moderation data.</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const bars = [
    { label: "Users", value: metrics.users, color: "#6D28D9" },
    { label: "Creators", value: metrics.creators, color: "#1E7A42" },
    { label: "Posts", value: metrics.videos, color: "#C9A84C" },
    { label: "Orders", value: metrics.requests, color: "#2D4AA8" },
  ];
  const max = Math.max(1, ...bars.map((b) => b.value));

  const runBackfill = async () => {
    if (repairing) return;
    setRepairing(true);
    try {
      const fixed = await backfillAcceptedCreators(400);
      setRepairNotice(fixed > 0 ? `Repaired ${fixed} request(s).` : "No requests needed repair.");
    } catch (err) {
      setRepairNotice(err?.message || "Backfill failed.");
    } finally {
      setRepairing(false);
      window.setTimeout(() => setRepairNotice(""), 2600);
    }
  };

  return (
    <div className="feature-root">
      <div className="feature-head">
        <div><div className="feature-title">Data & Admin</div><div className="feature-sub">Platform health, moderation cues, and operational insights.</div></div>
        <button className="feature-back" onClick={onBack}><IcoBack /></button>
      </div>
      {loading && <Spinner />}
      {!loading && error && <div className="feature-section"><div className="notice-pattern"><span className="notice-dot">!</span><div style={{ fontSize: 12 }}>{error}</div></div></div>}
      {!loading && (
        <>
          <div className="feature-section"><div className="feature-grid">{[["Total Users", metrics.users], ["Active Creators", metrics.creators], ["Published Posts", metrics.videos], ["Open Streams", metrics.openStreams], ["Commission Requests", metrics.requests], ["Escrow Alerts", metrics.alerts]].map(([label, value]) => (
            <div key={label} className="kente-card">
              <div className="kente-card-head" />
              <div className="kente-card-body">
                <div style={{ fontSize: 11, color: "var(--paper-muted)", letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</div>
                <div style={{ fontSize: 28, fontFamily: "var(--ff-serif)", color: "var(--white)" }}>{fmt(value)}</div>
              </div>
            </div>
          ))}</div></div>
          <div className="feature-section">
            <div className="kente-card">
              <div className="kente-card-head" />
              <div className="kente-card-body">
                <div className="kente-card-title">Trend Dashboard</div>
                <div className="kente-card-sub">Realtime growth view for the beta cohort.</div>
                <div style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "flex-end", height: 140 }}>
                  {bars.map((bar) => (
                    <div key={bar.label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                      <div style={{ width: "100%", borderRadius: 8, height: `${Math.max(10, (bar.value / max) * 100)}%`, background: `linear-gradient(180deg,${bar.color},rgba(10,10,16,0.35))` }} />
                      <span style={{ fontSize: 10, color: "var(--paper-muted)" }}>{bar.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="feature-section">
            <div className="kente-card">
              <div className="kente-card-head" />
              <div className="kente-card-body">
                <div className="kente-card-title">Production Repair Tools</div>
                <div className="kente-card-sub">Backfill accepted creator links on legacy requests so escrow/status updates stay compliant with tightened rules.</div>
                <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <button className="kente-btn alt" onClick={runBackfill} disabled={repairing}>{repairing ? "Repairing..." : "Backfill Accepted Creators"}</button>
                  {repairNotice && <span style={{ fontSize: 11, color: "var(--paper-muted)" }}>{repairNotice}</span>}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function SettingsScreen({ theme, setTheme, chatTheme, setChatTheme, onProfile, onBack, onTools, onEscrow, onCommunity, onSubscriptions, onAdmin }) {
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
  return (
    <div className="settings-root">
      <div className="settings-head">
        <div>
          <div className="settings-title">Settings</div>
          <div className="settings-sub">Themes, profile, and chat style</div>
        </div>
        <button className="settings-close" onClick={onBack}><IcoX /></button>
      </div>
      <div className="settings-grid">
        <div className="settings-col">
          <div className="settings-label">App Theme</div>
          {themeChoices.map(([id, label, sub]) => (
            <button key={id} className={`settings-choice ${theme === id ? "on" : ""}`} onClick={() => setTheme(id)}>
              <strong>{label}</strong>
              <small>{sub}</small>
            </button>
          ))}
        </div>
        <div className="settings-col">
          <div className="settings-label">Chat Theme</div>
          {chatChoices.map(([id, label, sub]) => (
            <button key={id} className={`settings-choice ${chatTheme === id ? "on" : ""}`} onClick={() => setChatTheme(id)}>
              <strong>{label}</strong>
              <small>{sub}</small>
            </button>
          ))}
        </div>
      </div>
      <div className="settings-foot">
        <button className="btn-gold" onClick={onProfile}>Edit Profile</button>
        <div style={{ marginTop: 12 }} className="settings-label">Workspace</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <button className="settings-choice" onClick={onTools}><strong>Measure & AI</strong><small>Avatar sizing and fit guidance</small></button>
          <button className="settings-choice" onClick={onEscrow}><strong>Order Escrow</strong><small>Milestones and release controls</small></button>
          <button className="settings-choice" onClick={onCommunity}><strong>Community Hub</strong><small>Forums and artisan directory</small></button>
          <button className="settings-choice" onClick={onSubscriptions}><strong>Subscriptions</strong><small>Plans, rewards, and badges</small></button>
          <button className="settings-choice" onClick={onAdmin} style={{ gridColumn: "1 / -1" }}><strong>Data & Admin</strong><small>Operations dashboard and moderation cues</small></button>
        </div>
      </div>
    </div>
  );
}

const NAV = [
  { id: "feed",   label: "Discover", icon: <IcoHome /> },
  { id: "market", label: "Market",   icon: <IcoMarket /> },
  { id: "post",   label: null,       icon: null },
  { id: "chat",   label: "Inbox",    icon: <IcoChat /> },
  { id: "live",   label: "Runway",   icon: <IcoLive /> },
];

export default function VioFashion() {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const shellRef = useRef(null);
  const [screen, setScreen]       = useState("feed");
  const [showUpload, setShowUpload] = useState(false);
  const [pendingConv, setPendingConv] = useState(null);
  const [navOpen, setNavOpen] = useState(false);
  const [shellSize, setShellSize] = useState(() => ({ width: window.innerWidth || 390, height: window.innerHeight || 720 }));
  const [navPos, setNavPos] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("vio-nav-pos") || "null");
      if (saved && Number.isFinite(saved.x) && Number.isFinite(saved.y)) return saved;
    } catch {
      // Use the centered left edge when no saved position exists.
    }
    const width = window.innerWidth || 390;
    return { x: Math.max(24, Math.min(width - 24, 38)), y: Math.round((window.innerHeight || 720) * 0.5) };
  });
  const navDragRef = useRef({ dragging: false, moved: false, startX: 0, startY: 0 });
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
  useEffect(() => {
    document.body.setAttribute("data-vio-theme", theme);
    return () => document.body.removeAttribute("data-vio-theme");
  }, [theme]);
  useEffect(() => { localStorage.setItem("vio-chat-theme", chatTheme); }, [chatTheme]);
  useEffect(() => { localStorage.setItem("vio-nav-pos", JSON.stringify(navPos)); }, [navPos]);
  useEffect(() => { setNavOpen(false); }, [screen]);
  useEffect(() => {
    const update = () => {
      const rect = shellRef.current?.getBoundingClientRect();
      setShellSize({ width: rect?.width || window.innerWidth || 390, height: rect?.height || window.innerHeight || 720 });
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  useEffect(() => {
    setNavPos((prev) => {
      const clamped = {
        x: Math.min(Math.max(prev.x, 24), shellSize.width - 24),
        y: Math.min(Math.max(prev.y, 32), shellSize.height - 32),
      };
      return clamped.x === prev.x && clamped.y === prev.y ? prev : clamped;
    });
  }, [shellSize.width, shellSize.height]);

  const handleNav = (id) => { setNavOpen(false); if (id === "post") { setShowUpload(true); return; } setScreen(id); };
  const openChat  = (conv) => { setPendingConv(conv); setScreen("chat"); };
  const clampNavPosition = useCallback((clientX, clientY) => {
    const rect = shellRef.current?.getBoundingClientRect();
    const left = rect?.left || 0;
    const top = rect?.top || 0;
    const width = rect?.width || window.innerWidth || 390;
    const height = rect?.height || window.innerHeight || 720;
    return {
      x: Math.min(Math.max(clientX - left, 24), width - 24),
      y: Math.min(Math.max(clientY - top, 32), height - 32),
    };
  }, []);
  const snapNavToEdge = useCallback((point) => {
    const width = shellSize.width || 390;
    const height = shellSize.height || 720;
    const distances = {
      left: point.x,
      right: width - point.x,
      top: point.y,
      bottom: height - point.y,
    };
    const edge = Object.entries(distances).sort((a, b) => a[1] - b[1])[0][0];
    if (edge === "left") return { x: 24, y: Math.min(Math.max(point.y, 32), height - 32) };
    if (edge === "right") return { x: width - 24, y: Math.min(Math.max(point.y, 32), height - 32) };
    if (edge === "top") return { x: Math.min(Math.max(point.x, 24), width - 24), y: 32 };
    return { x: Math.min(Math.max(point.x, 24), width - 24), y: height - 32 };
  }, [shellSize.height, shellSize.width]);
  const navPointerDown = (e) => {
    navDragRef.current = { dragging: true, moved: false, startX: e.clientX, startY: e.clientY };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const navPointerMove = (e) => {
    const drag = navDragRef.current;
    if (!drag.dragging) return;
    if (!drag.moved && Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) > 5) drag.moved = true;
    if (drag.moved) {
      setNavOpen(false);
      setNavPos(clampNavPosition(e.clientX, e.clientY));
    }
  };
  const navPointerUp = (e) => {
    const drag = navDragRef.current;
    navDragRef.current = { ...drag, dragging: false };
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    if (drag.moved) {
      setNavPos((prev) => snapNavToEdge(prev));
      return;
    }
    setNavOpen(p => !p);
  };

  const dp       = profile || {};
  const fullName = dp.full_name || user?.email?.split("@")[0] || "";

  const render = () => {
    switch (screen) {
      case "feed":          return <FeedScreen user={user} onSearch={() => setScreen("search")} onNotifications={() => setScreen("notifications")} onStartChat={openChat} />;
      case "profile":       return <ProfileScreen user={user} profile={profile} onSignOut={signOut} onProfileUpdated={refreshProfile} onSettings={() => setScreen("settings")} />;
      case "market":        return <MarketScreen user={user} profile={profile} />;
      case "chat":          return <ChatScreen user={user} profile={profile} pendingConv={pendingConv} onConvOpened={() => setPendingConv(null)} />;
      case "live":          return <LiveScreen user={user} profile={profile} />;
      case "search":        return <SearchScreen user={user} profile={profile} onStartChat={openChat} />;
      case "notifications": return <NotificationsScreen user={user} />;
      case "tools":         return <ToolsScreen user={user} onBack={() => setScreen("settings")} />;
      case "escrow":        return <EscrowScreen user={user} profile={profile} onBack={() => setScreen("settings")} />;
      case "community":     return <CommunityScreen user={user} onBack={() => setScreen("settings")} onStartChat={openChat} />;
      case "subscriptions": return <SubscriptionsScreen user={user} profile={profile} onBack={() => setScreen("settings")} />;
      case "admin":         return <AdminScreen user={user} profile={profile} onBack={() => setScreen("settings")} />;
      case "settings":      return (
        <SettingsScreen
          theme={theme}
          setTheme={setTheme}
          chatTheme={chatTheme}
          setChatTheme={setChatTheme}
          onProfile={() => setScreen("profile")}
          onBack={() => setScreen("feed")}
          onTools={() => setScreen("tools")}
          onEscrow={() => setScreen("escrow")}
          onCommunity={() => setScreen("community")}
          onSubscriptions={() => setScreen("subscriptions")}
          onAdmin={() => setScreen("admin")}
        />
      );
      default:              return <FeedScreen user={user} onSearch={() => setScreen("search")} onNotifications={() => setScreen("notifications")} onStartChat={openChat} />;
    }
  };

  const isSecondary = screen === "search" || screen === "notifications";
  const compactNav = true;
  const navDistances = {
    left: navPos.x,
    right: shellSize.width - navPos.x,
    top: navPos.y,
    bottom: shellSize.height - navPos.y,
  };
  const navEdge = Object.entries(navDistances).sort((a, b) => a[1] - b[1])[0][0];
  const navAxis = (navEdge === "top" || navEdge === "bottom") ? "horizontal" : "vertical";
  const navAnchor = navOpen
    ? (navAxis === "vertical"
      ? { x: navEdge === "left" ? 24 : shellSize.width - 24, y: shellSize.height * 0.5 }
      : { x: shellSize.width * 0.5, y: navEdge === "top" ? 32 : shellSize.height - 32 })
    : navPos;
  const navItems = compactNav
    ? [...NAV, { id: "profile", label: "Profile", icon: <IcoUser /> }, { id: "settings", label: "Settings", icon: <IcoGear /> }]
    : NAV;
  const upperNavItems = navItems.slice(0, 3);
  const lowerNavItems = navItems.slice(3);
  const renderNavItem = (item) => {
    if (item.id === "post") return <button key="post" className="nav-post-btn" onClick={() => handleNav("post")} title="Post"><IcoPlus /></button>;
    const isActive = screen === item.id;
    const hasBadge = (item.id === "chat" && unreadMsgs > 0) || (item.id === "feed" && unreadCount > 0);
    return (
      <button key={item.id} className={`nav-item ${isActive ? "active" : ""}`} onClick={() => handleNav(item.id)} title={item.label}>
        {item.icon}{!compactNav && item.label}{hasBadge && <div className="nav-badge" />}
      </button>
    );
  };

  return (
    <div ref={shellRef} className={`shell theme-${theme} chat-${chatTheme} screen-${screen}`}>
      <div className="screen-wrap">{render()}</div>
      {screen === "feed" && (
        <div className="profile-float-btn" onClick={() => setScreen("profile")} style={{ background: dp.avatar_url ? "transparent" : PALETTES[0] }}>
          {dp.avatar_url ? <img src={dp.avatar_url} alt={fullName} /> : <span style={{ fontSize: 11, fontWeight: 700 }}>{initials(fullName) || "👤"}</span>}
        </div>
      )}
      {isSecondary && (
        <button onClick={() => setScreen("feed")} style={{ position: "absolute", top: 18, right: 16, zIndex: 190, width: 34, height: 34, background: "rgba(21,14,32,0.8)", border: "1px solid var(--border)", backdropFilter: "blur(10px)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--white)" }}><IcoX /></button>
      )}
      <div className={`nav-pill ${compactNav ? "compact" : ""} ${navOpen ? "open" : ""} ${navAxis}`} style={{ left: navAnchor.x, top: navAnchor.y }}>
        {navOpen && <div className="nav-roll upper">{upperNavItems.map(renderNavItem)}</div>}
        <button className="nav-toggle-grid" onPointerDown={navPointerDown} onPointerMove={navPointerMove} onPointerUp={navPointerUp} onPointerCancel={navPointerUp} title="Drag or tap navigation"><span /><span /><span /><span /></button>
        {navOpen && <div className="nav-roll lower">{lowerNavItems.map(renderNavItem)}</div>}
      </div>
      {showUpload && <UploadModal user={user} onClose={() => setShowUpload(false)} onSuccess={() => { setShowUpload(false); setScreen("feed"); }} />}
    </div>
  );
}

