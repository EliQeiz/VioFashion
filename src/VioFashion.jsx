// src/VioFashion.jsx — VioFashion "ATELIER" — Fully wired to Supabase
import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabaseClient";
import { useAuth } from "./hooks/useAuth.jsx";

function injectFonts() {
  if (document.getElementById("vio-main-fonts")) return;
  const l = document.createElement("link");
  l.id = "vio-main-fonts"; l.rel = "stylesheet";
  l.href = "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;0,700;1,300;1,400;1,700&family=Jost:wght@200;300;400;500;600;700&family=Bebas+Neue&display=swap";
  document.head.appendChild(l);
}

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
  }
  html,body,#root{height:100%;width:100%;}
  body{background:var(--ink);color:var(--white);font-family:var(--ff-sans);overflow:hidden;-webkit-font-smoothing:antialiased;}
  ::-webkit-scrollbar{width:2px;}::-webkit-scrollbar-thumb{background:var(--violet);border-radius:2px;}
  .shell{position:relative;width:100%;max-width:430px;height:100vh;margin:0 auto;background:var(--deep);overflow:hidden;box-shadow:0 0 120px rgba(109,40,217,0.25);}
  .screen-wrap{position:absolute;inset:0;overflow:hidden;}
  .nav-pill{position:absolute;bottom:24px;left:50%;transform:translateX(-50%);z-index:200;display:flex;align-items:center;background:rgba(21,14,32,0.92);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border:1px solid rgba(109,40,217,0.3);border-radius:100px;padding:6px 8px;gap:2px;box-shadow:0 8px 40px rgba(0,0,0,0.6),0 0 0 1px rgba(255,255,255,0.04) inset;}
  .nav-item{display:flex;flex-direction:column;align-items:center;gap:3px;padding:8px 14px;border-radius:100px;cursor:pointer;border:none;background:transparent;color:var(--muted);font-family:var(--ff-sans);font-size:9px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;white-space:nowrap;transition:all 0.25s;}
  .nav-item.active{background:linear-gradient(135deg,var(--violet),#5B21B6);color:var(--white);box-shadow:0 4px 16px rgba(109,40,217,0.5);}
  .nav-item svg{width:18px;height:18px;}
  .nav-post-btn{width:44px;height:44px;background:linear-gradient(135deg,var(--gold),#B8943A);border:none;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 4px 20px rgba(201,168,76,0.4);transition:all 0.25s;flex-shrink:0;}
  .nav-post-btn:hover{transform:scale(1.08) rotate(90deg);}
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
  .feed-search-btn{width:34px;height:34px;background:rgba(255,255,255,0.07);border:1px solid var(--border);border-radius:10px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--white);}
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
  .profile-av-float{position:absolute;bottom:-30px;right:20px;z-index:10;width:72px;height:72px;border-radius:50%;border:2px solid var(--gold);overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:700;cursor:pointer;}
  .profile-av-float img{width:100%;height:100%;object-fit:cover;}
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
  .service-chip{background:rgba(21,14,32,0.8);border:1px solid rgba(109,40,217,0.25);color:var(--vio-lite);padding:5px 12px;border-radius:100px;font-size:11px;font-weight:400;}
  .portfolio-grid{display:grid;grid-template-columns:repeat(3,1fr);grid-auto-rows:110px;gap:3px;}
  .portfolio-grid .p-item:first-child{grid-column:1/3;grid-row:1/3;}
  .p-item{border-radius:6px;overflow:hidden;position:relative;cursor:pointer;background-size:cover;background-position:center;}
  .p-item-inner{width:100%;height:100%;display:flex;align-items:center;justify-content:center;}
  .p-overlay{position:absolute;inset:0;background:linear-gradient(to top,rgba(6,4,9,0.7) 0%,transparent 60%);display:flex;align-items:flex-end;padding:8px;opacity:0;transition:opacity 0.25s;}
  .p-item:hover .p-overlay{opacity:1;}
  .section-head{font-family:var(--ff-serif);font-size:20px;font-style:italic;font-weight:300;color:var(--white);margin-bottom:14px;display:flex;align-items:center;gap:12px;}
  .section-head::after{content:'';flex:1;height:1px;background:linear-gradient(90deg,var(--border),transparent);}
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
  .prc-input:focus{border-color:rgba(109,40,217,0.5);}
  .prc-btn{background:linear-gradient(135deg,var(--violet),#5B21B6);border:none;border-radius:10px;padding:11px 20px;color:var(--white);font-family:var(--ff-sans);font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap;box-shadow:0 4px 14px rgba(109,40,217,0.35);}
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
  .chat-outer{display:flex;flex-direction:column;height:100%;position:relative;}
  .chat-head{padding:28px 20px 16px;border-bottom:1px solid var(--border);flex-shrink:0;}
  .chat-head-title{font-family:var(--ff-serif);font-size:28px;font-style:italic;font-weight:300;color:var(--white);margin-bottom:14px;}
  .chat-search-bar{display:flex;align-items:center;gap:10px;background:rgba(21,14,32,0.8);border:1px solid var(--border);border-radius:12px;padding:10px 14px;}
  .chat-search-bar input{flex:1;background:transparent;border:none;outline:none;color:var(--white);font-family:var(--ff-sans);font-size:13px;font-weight:300;}
  .chat-search-bar input::placeholder{color:var(--muted);}
  .chat-list-area{flex:1;overflow-y:auto;scrollbar-width:none;}
  .chat-list-area::-webkit-scrollbar{display:none;}
  .chat-row{display:flex;align-items:center;gap:12px;padding:14px 20px;cursor:pointer;border-bottom:1px solid rgba(255,255,255,0.04);transition:background 0.15s;}
  .chat-row:hover{background:rgba(109,40,217,0.06);}
  .chat-av{width:48px;height:48px;border-radius:16px;overflow:hidden;flex-shrink:0;position:relative;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;}
  .chat-av img{width:100%;height:100%;object-fit:cover;}
  .online-ring{position:absolute;bottom:-2px;right:-2px;width:13px;height:13px;background:var(--green);border-radius:50%;border:2px solid var(--deep);}
  .chat-row-content{flex:1;min-width:0;}
  .chat-row-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:3px;}
  .chat-row-name{font-size:14px;font-weight:600;}
  .chat-row-time{font-size:10px;color:var(--muted);}
  .chat-row-preview{font-size:12px;font-weight:300;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .chat-unread{width:20px;height:20px;border-radius:50%;background:var(--violet);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;flex-shrink:0;}
  .chat-window{position:absolute;inset:0;z-index:50;background:var(--deep);display:flex;flex-direction:column;transform:translateX(100%);transition:transform 0.3s cubic-bezier(0.4,0,0.2,1);}
  .chat-window.open{transform:translateX(0);}
  .chat-win-head{display:flex;align-items:center;gap:12px;padding:16px;border-bottom:1px solid var(--border);background:rgba(6,4,9,0.6);backdrop-filter:blur(10px);flex-shrink:0;}
  .chat-back-btn{width:34px;height:34px;background:rgba(255,255,255,0.06);border:none;border-radius:10px;cursor:pointer;color:var(--white);display:flex;align-items:center;justify-content:center;}
  .chat-win-av{width:38px;height:38px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;overflow:hidden;}
  .chat-win-av img{width:100%;height:100%;object-fit:cover;}
  .chat-win-info{flex:1;}
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
  .msg-wrap.out .msg-bubble{background:linear-gradient(135deg,var(--violet),#5B21B6);border-bottom-right-radius:4px;}
  .msg-time{font-size:10px;color:var(--muted);margin-top:4px;text-align:right;}
  .chat-inp-bar{display:flex;align-items:center;gap:10px;padding:12px 16px 20px;border-top:1px solid var(--border);background:rgba(6,4,9,0.6);backdrop-filter:blur(10px);flex-shrink:0;}
  .chat-inp{flex:1;background:rgba(21,14,32,0.8);border:1px solid var(--border);border-radius:100px;padding:11px 18px;color:var(--white);font-family:var(--ff-sans);font-size:13px;font-weight:300;outline:none;}
  .chat-inp::placeholder{color:var(--muted);}
  .chat-inp:focus{border-color:rgba(109,40,217,0.4);}
  .chat-send{width:40px;height:40px;background:linear-gradient(135deg,var(--violet),#5B21B6);border:none;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;}
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
  .live-cr-av img{width:100%;height:100%;object-fit:cover;}
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
  .live-send{width:40px;height:40px;background:linear-gradient(135deg,var(--violet),#5B21B6);border:none;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;}
  .modal-overlay{position:fixed;inset:0;background:rgba(6,4,9,0.88);backdrop-filter:blur(14px);z-index:500;display:flex;align-items:flex-end;justify-content:center;}
  .modal-sheet{background:var(--surface);border:1px solid var(--border);border-radius:24px 24px 0 0;padding:28px 24px 40px;width:100%;max-width:430px;animation:sheet-up 0.3s cubic-bezier(0.34,1.56,0.64,1);}
  @keyframes sheet-up{from{transform:translateY(100%);}to{transform:translateY(0);}}
  .modal-title{font-family:var(--ff-serif);font-size:24px;font-style:italic;font-weight:300;color:var(--white);margin-bottom:20px;}
  .modal-input{width:100%;background:rgba(6,4,9,0.5);border:1px solid var(--border);border-radius:12px;padding:12px 16px;color:var(--white);font-family:var(--ff-sans);font-size:13px;font-weight:300;outline:none;margin-bottom:12px;resize:none;}
  .modal-input::placeholder{color:var(--muted);}
  .modal-input:focus{border-color:rgba(109,40,217,0.5);}
  .modal-row{display:flex;gap:10px;margin-bottom:12px;}
  .modal-submit{width:100%;background:linear-gradient(135deg,var(--violet),#5B21B6);border:none;border-radius:14px;padding:14px;color:var(--white);font-family:var(--ff-sans);font-size:14px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;cursor:pointer;box-shadow:0 4px 20px rgba(109,40,217,0.35);}
  .modal-cancel{width:100%;background:transparent;border:1px solid var(--border);border-radius:14px;padding:12px;color:var(--muted);font-family:var(--ff-sans);font-size:13px;cursor:pointer;margin-top:8px;}
  .empty-state{display:flex;flex-direction:column;align-items:center;justify-content:center;height:200px;gap:12px;padding:40px 20px;text-align:center;}
  .empty-icon{font-size:40px;opacity:0.4;}
  .empty-title{font-family:var(--ff-serif);font-size:20px;font-style:italic;color:var(--white);opacity:0.5;}
  .empty-sub{font-size:12px;color:var(--muted);line-height:1.6;max-width:220px;}
  .spin-wrap{display:flex;align-items:center;justify-content:center;height:120px;}
  .spin{width:28px;height:28px;border:2px solid rgba(109,40,217,0.2);border-top-color:var(--violet);border-radius:50%;animation:vio-spin 0.7s linear infinite;}
  @keyframes vio-spin{to{transform:rotate(360deg);}}
`;

function injectCSS() {
  if (document.getElementById("vio-main-css")) return;
  const el = document.createElement("style");
  el.id = "vio-main-css"; el.textContent = CSS;
  document.head.appendChild(el);
}

// ── Utilities ────────────────────────────────────────────────
const fmt = n => { if(!n)return"0"; if(n>=1e6)return(n/1e6).toFixed(1)+"M"; if(n>=1e3)return(n/1e3).toFixed(1)+"K"; return String(n); };
const timeAgo = d => { if(!d)return""; const s=Math.floor((Date.now()-new Date(d))/1000); if(s<60)return"Just now"; if(s<3600)return Math.floor(s/60)+"m ago"; if(s<86400)return Math.floor(s/3600)+"h ago"; return Math.floor(s/86400)+"d ago"; };
const initials = n => { if(!n)return"?"; return n.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase(); };
const PALETTES = [
  "linear-gradient(160deg,#1a0533 0%,#6D28D9 45%,#0d0018 100%)",
  "linear-gradient(160deg,#0a1a30 0%,#1D4ED8 45%,#040c1a 100%)",
  "linear-gradient(160deg,#1a0a00 0%,#C2410C 45%,#0d0500 100%)",
  "linear-gradient(160deg,#001a0a 0%,#065F46 45%,#000d05 100%)",
  "linear-gradient(160deg,#1a001a 0%,#9D174D 45%,#0d000d 100%)",
];

// ── Icons ────────────────────────────────────────────────────
const Ico = ({d,s=20,fill="none",stroke="currentColor",sw=1.8}) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"><path d={d}/></svg>
);
const IcoHome     = () => <Ico d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10"/>;
const IcoMarket   = () => <Ico d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z M3 6h18 M16 10a4 4 0 0 1-8 0"/>;
const IcoChat     = () => <Ico d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>;
const IcoLive     = () => <Ico d="M23 7l-7 5 7 5V7z M1 5h15a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H1V5z"/>;
const IcoSearch   = () => <Ico d="M21 21l-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0"/>;
const IcoHeart    = ({lit}) => <Ico d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" fill={lit?"#8B5CF6":"none"} stroke={lit?"#8B5CF6":"currentColor"}/>;
const IcoComment  = () => <Ico d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>;
const IcoShare    = () => <Ico d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8 M16 6l-4-4-4 4 M12 2v13"/>;
const IcoBookmark = () => <Ico d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>;
const IcoBack     = () => <Ico d="M19 12H5 M12 5l-7 7 7 7"/>;
const IcoPhone    = () => <Ico s={16} d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.56 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>;
const IcoVid      = () => <Ico s={16} d="M23 7l-7 5 7 5V7z M1 5h15a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H1V5z"/>;
const IcoSend     = () => <Ico s={17} d="M22 2L11 13 M22 2L15 22l-4-9-9-4 22-7z"/>;
const IcoPlus     = () => <Ico s={20} sw={2.5} d="M12 5v14 M5 12h14"/>;
const IcoEye      = () => <Ico s={16} d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 9a3 3 0 1 0 6 0 3 3 0 0 0-6 0"/>;
const IcoLogout   = () => <Ico s={16} d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9"/>;
const IcoMusic    = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
  </svg>
);
const Spinner = () => <div className="spin-wrap"><div className="spin"/></div>;

// ── DEMO data (shown before real data exists) ────────────────
const DEMO_VIDEOS = [
  {id:"d1",creator:{id:"x1",username:"amara.creates",full_name:"Amara Osei"},caption:"Custom kente agbada — every thread tells a story.",tags:["#KenteFashion","#BespokeTailor","#GhanaFashion"],sound_name:"Afrobeats Gold Vol. 3",likes_count:18400,comments_count:892,shares_count:3100,saves_count:1200,pal:0},
  {id:"d2",creator:{id:"x2",username:"nanadesigns",full_name:"Nana Kwame"},caption:"Behind the cut. A bespoke three-piece from raw cloth to runway.",tags:["#SuitMaking","#BespokeTailor","#AccraStyle"],sound_name:"Studio Ambience",likes_count:11200,comments_count:445,shares_count:1800,saves_count:890,pal:1},
  {id:"d3",creator:{id:"x3",username:"yaa_style",full_name:"Yaa Boateng"},caption:"New collection. Luxury African ready-to-wear dropping Friday.",tags:["#NewCollection","#LuxuryAfrican","#RTW"],sound_name:"Fashion Week Collective",likes_count:34100,comments_count:2100,shares_count:7800,saves_count:4200,pal:2},
];
const DEMO_TICKERS = [
  {user:"Kwesi M.",msg:"This collection is 🔥🔥"},{user:"Abena S.",msg:"Where can I order?!"},
  {user:"Kofi D.",msg:"The kente trim is everything"},{user:"Yaa B.",msg:"Sending a gift 🎁"},
  {user:"Samuel A.",msg:"Designer of the decade 🏆"},{user:"Prince K.",msg:"Ghana fashion on the world stage!"},
];

// ═══════════════════════════════════════════════════════════
//  FEED
// ═══════════════════════════════════════════════════════════
function FeedScreen({user}) {
  const [tab,setTab] = useState("discover");
  const [videos,setVideos] = useState([]);
  const [liked,setLiked] = useState({});
  const [saved,setSaved] = useState({});
  const [followed,setFollowed] = useState({});

  useEffect(()=>{
    supabase.from("videos")
      .select("*,creator:profiles(id,username,full_name,avatar_url)")
      .eq("is_published",true).order("created_at",{ascending:false}).limit(20)
      .then(({data})=>{ if(data?.length>0) setVideos(data); });
  },[]);

  const display = videos.length>0 ? videos : DEMO_VIDEOS;

  const toggleLike = async(id)=>{
    const isLiked=liked[id];
    setLiked(p=>({...p,[id]:!isLiked}));
    if(!user) return;
    if(isLiked) await supabase.from("video_likes").delete().eq("video_id",id).eq("user_id",user.id);
    else await supabase.from("video_likes").insert({video_id:id,user_id:user.id});
  };
  const toggleFollow=async(cid)=>{
    if(!user||cid===user.id) return;
    const isF=followed[cid];
    setFollowed(p=>({...p,[cid]:!isF}));
    if(isF) await supabase.from("follows").delete().eq("follower_id",user.id).eq("following_id",cid);
    else await supabase.from("follows").insert({follower_id:user.id,following_id:cid});
  };

  return (
    <div style={{height:"100%"}}>
      <div className="feed-wrap">
        {display.map((v,i)=>{
          const name=v.creator?.full_name||v.creator?.username||"Creator";
          const [first,...rest]=name.split(" ");
          const last=rest.join(" ");
          const pal=v.pal??(i%PALETTES.length);
          return (
            <div key={v.id} className="feed-card">
              <div className="feed-video-bg" style={{background:v.thumbnail_url?`url(${v.thumbnail_url}) center/cover`:PALETTES[pal]}}>
                {!v.thumbnail_url&&<>
                  <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",opacity:0.18}}>
                    <svg width="160" height="280" viewBox="0 0 160 280" fill="none">
                      <ellipse cx="80" cy="45" rx="30" ry="38" fill="rgba(255,255,255,0.7)"/>
                      <path d="M50 83 Q28 120 22 200 Q65 192 80 185 Q95 192 138 200 Q132 120 110 83 Q96 108 80 108 Q64 108 50 83Z" fill="rgba(255,255,255,0.5)"/>
                      <path d="M22 200 Q14 255 24 280 L55 265 L65 205 Q72 195 80 195 Q88 195 95 205 L105 265 L136 280 Q146 255 138 200Z" fill="rgba(255,255,255,0.4)"/>
                    </svg>
                  </div>
                  <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",opacity:0.06}}>
                    <span style={{fontFamily:"var(--ff-impact)",fontSize:180,color:"#fff",letterSpacing:-6}}>VIO</span>
                  </div>
                </>}
              </div>
              <div className="feed-cinema"/>
              <div className="edition-badge">
                <div className="edition-num">{String(i+1).padStart(2,"0")}</div>
                <div className="edition-label">Edition</div>
              </div>
              <div className="feed-topbar">
                <div className="feed-logo">Atelier</div>
                <div className="feed-tabs-row">
                  {[["discover","Discover"],["following","Following"],["trending","Trending"]].map(([k,l])=>(
                    <button key={k} className={`feed-tab ${tab===k?"on":""}`} onClick={()=>setTab(k)}>{l}</button>
                  ))}
                </div>
                <button className="feed-search-btn"><IcoSearch/></button>
              </div>
              <div className="feed-action-tray">
                <button className="feed-action" onClick={()=>toggleLike(v.id)}>
                  <div className={`feed-action-circle ${liked[v.id]?"lit":""}`}><IcoHeart lit={liked[v.id]}/></div>
                  <span className="feed-action-num">{fmt(v.likes_count)}</span>
                </button>
                <button className="feed-action">
                  <div className="feed-action-circle"><IcoComment/></div>
                  <span className="feed-action-num">{fmt(v.comments_count)}</span>
                </button>
                <button className="feed-action" onClick={()=>setSaved(p=>({...p,[v.id]:!p[v.id]}))}>
                  <div className={`feed-action-circle ${saved[v.id]?"lit":""}`}><IcoBookmark/></div>
                  <span className="feed-action-num">{fmt(v.saves_count||0)}</span>
                </button>
                <button className="feed-action">
                  <div className="feed-action-circle"><IcoShare/></div>
                  <span className="feed-action-num">{fmt(v.shares_count||0)}</span>
                </button>
              </div>
              <div className="feed-editorial">
                <div className="feed-creator-giant">{first} <span>{last}</span></div>
                <div className="feed-handle-row">
                  <div className="feed-handle-av" style={{background:PALETTES[pal]}}>
                    {v.creator?.avatar_url?<img src={v.creator.avatar_url} alt={name}/>:initials(name)}
                  </div>
                  <span className="feed-handle-text">@{v.creator?.username||"creator"}</span>
                  {user?.id!==v.creator?.id&&(
                    <button className={`feed-follow-pill ${followed[v.creator?.id]?"following":""}`} onClick={()=>toggleFollow(v.creator?.id)}>
                      {followed[v.creator?.id]?"Following":"+ Follow"}
                    </button>
                  )}
                </div>
                {v.caption&&<p className="feed-caption">{v.caption}</p>}
                {v.tags?.length>0&&<div className="feed-tags">{v.tags.map(t=><span key={t} className="feed-tag">{t.startsWith("#")?t:`#${t}`}</span>)}</div>}
                {v.sound_name&&<div className="feed-sound-row"><div className="feed-vinyl"/><IcoMusic/><span className="feed-sound-text">{v.sound_name}</span></div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  PROFILE
// ═══════════════════════════════════════════════════════════
function ProfileScreen({user,profile,onSignOut}) {
  const [tab,setTab] = useState("portfolio");
  const [videos,setVideos] = useState([]);
  const fileRef = useRef();
  const dp = profile||{};
  const fullName = dp.full_name||user?.email?.split("@")[0]||"My Profile";
  const [first,...rest] = fullName.split(" ");
  const last = rest.join(" ");
  const ROLE_EMOJI = {tailor:"✂️",designer:"🎨",makeup_artist:"💄",shoemaker:"👟",customer:"🛍️"};
  const portPals = ["linear-gradient(135deg,#1a0533,#6D28D9)","linear-gradient(135deg,#0a1a30,#1D4ED8)","linear-gradient(135deg,#1a0a00,#C2410C)","linear-gradient(135deg,#1a1a00,#CA8A04)","linear-gradient(135deg,#001a0a,#065F46)","linear-gradient(135deg,#1a001a,#9D174D)","linear-gradient(135deg,#0d1a33,#1E3A8A)","linear-gradient(135deg,#1a0d00,#92400E)","linear-gradient(135deg,#001a1a,#0F766E)"];

  useEffect(()=>{
    if(!user) return;
    supabase.from("videos").select("id,thumbnail_url,likes_count,views_count,created_at")
      .eq("creator_id",user.id).eq("is_published",true).order("created_at",{ascending:false})
      .then(({data})=>setVideos(data||[]));
  },[user]);

  const uploadAvatar = async(e)=>{
    const file=e.target.files[0];
    if(!file||!user) return;
    const ext=file.name.split(".").pop();
    const path=`${user.id}/avatar.${ext}`;
    const {error}=await supabase.storage.from("avatars").upload(path,file,{upsert:true});
    if(!error){
      const {data}=supabase.storage.from("avatars").getPublicUrl(path);
      await supabase.from("profiles").update({avatar_url:data.publicUrl}).eq("id",user.id);
      window.location.reload();
    }
  };

  return (
    <div className="profile-scroll">
      <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={uploadAvatar}/>
      <div className="profile-hero">
        <div className="profile-hero-bg" style={{background:dp.banner_url?`url(${dp.banner_url}) center/cover`:PALETTES[0]}}>
          <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",opacity:0.1}}>
            <span style={{fontFamily:"var(--ff-impact)",fontSize:160,color:"#fff",letterSpacing:-6}}>ATELIER</span>
          </div>
        </div>
        <div className="profile-hero-grad"/>
        <div className="profile-hero-name">{first}<br/>{last}</div>
        <div className="profile-av-float" style={{background:PALETTES[0],position:"relative"}} onClick={()=>fileRef.current?.click()}>
          {dp.avatar_url?<img src={dp.avatar_url} alt={fullName}/>:initials(fullName)}
          <div style={{position:"absolute",bottom:0,right:0,width:20,height:20,background:"var(--violet)",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",border:"2px solid var(--deep)",fontSize:10}}>✎</div>
        </div>
      </div>
      <div className="profile-meta">
        <div className="profile-handle-row">
          <span className="profile-handle">@{dp.username||user?.email?.split("@")[0]}{dp.location&&` · ${dp.location}`}</span>
          {dp.is_verified&&<span className="verified-mark">✓</span>}
        </div>
        <div className="profile-role-chip">{ROLE_EMOJI[dp.role]||"🛍️"} {(dp.role||"customer").replace("_"," ")}</div>
        <p className="profile-bio" style={!dp.bio?{opacity:0.4,fontStyle:"italic"}:{}}>{dp.bio||"Tap Edit Profile to add your bio…"}</p>
        <div className="profile-stats-row">
          {[[fmt(dp.followers_count||0),"Followers"],[fmt(dp.following_count||0),"Following"],[fmt(dp.orders_count||0),"Orders"],[dp.rating?`${dp.rating} ★`:"—","Rating"]].map(([n,l])=>(
            <div key={l} className="profile-stat"><span className="profile-stat-n">{n}</span><span className="profile-stat-l">{l}</span></div>
          ))}
        </div>
        <div className="profile-action-row">
          <button className="btn-gold">Edit Profile</button>
          <button className="btn-ghost">Share</button>
          <button className="btn-danger" onClick={onSignOut} title="Sign out"><IcoLogout/></button>
        </div>
        {dp.profile_services?.length>0&&(
          <div className="service-chips">{dp.profile_services.map(s=><span key={s.service} className="service-chip">{s.service}</span>)}</div>
        )}
      </div>
      <div style={{display:"flex",borderBottom:"1px solid var(--border)",margin:"0 20px 16px"}}>
        {["portfolio","videos","reviews"].map(t=>(
          <button key={t} onClick={()=>setTab(t)} style={{flex:1,background:"none",border:"none",cursor:"pointer",fontFamily:"var(--ff-sans)",fontSize:11,fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase",color:tab===t?"var(--white)":"var(--muted)",padding:"10px 0",borderBottom:`1.5px solid ${tab===t?"var(--gold)":"transparent"}`,transition:"all 0.2s"}}>{t}</button>
        ))}
      </div>
      {tab==="portfolio"&&(
        <div style={{padding:"0 20px"}}>
          <div className="section-head">Works</div>
          {videos.length>0?(
            <div className="portfolio-grid">
              {videos.map((v,i)=>(
                <div key={v.id} className="p-item" style={{background:v.thumbnail_url?`url(${v.thumbnail_url}) center/cover`:portPals[i%portPals.length]}}>
                  {!v.thumbnail_url&&<div className="p-item-inner"><span style={{fontFamily:"var(--ff-serif)",fontSize:i===0?36:22,fontStyle:"italic",color:"rgba(255,255,255,0.2)"}}>#{i+1}</span></div>}
                  <div className="p-overlay"><span style={{fontSize:10,color:"rgba(255,255,255,0.8)"}}>❤ {fmt(v.likes_count)}</span></div>
                </div>
              ))}
            </div>
          ):(
            <div className="empty-state"><div className="empty-icon">🎬</div><div className="empty-title">No posts yet</div><div className="empty-sub">Tap + to share your first fashion video</div></div>
          )}
          <div style={{height:100}}/>
        </div>
      )}
      {tab==="reviews"&&(
        <div style={{padding:"0 20px 100px"}}>
          <div className="section-head">Reviews</div>
          <div className="empty-state"><div className="empty-icon">⭐</div><div className="empty-title">No reviews yet</div><div className="empty-sub">Reviews from clients appear here after completed orders</div></div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  MARKET
// ═══════════════════════════════════════════════════════════
function MarketScreen({user}) {
  const [filter,setFilter] = useState("All");
  const [requests,setRequests] = useState([]);
  const [loading,setLoading] = useState(true);
  const [modal,setModal] = useState(false);
  const [form,setForm] = useState({title:"",description:"",category:"Tailoring",budget:""});
  const [posting,setPosting] = useState(false);
  const set = k => e => setForm(p=>({...p,[k]:e.target.value}));
  const CATS = ["All","Tailoring","Shoemaking","Makeup","Design","Styling"];

  const load = async()=>{
    setLoading(true);
    let q = supabase.from("requests").select("*,customer:profiles(id,username,full_name,avatar_url)").eq("status","open").order("created_at",{ascending:false});
    if(filter!=="All") q=q.eq("category",filter);
    const {data}=await q;
    setRequests(data||[]);
    setLoading(false);
  };
  useEffect(()=>{ load(); },[filter]);

  const post = async()=>{
    if(!form.title||!user) return;
    setPosting(true);
    await supabase.from("requests").insert({customer_id:user.id,category:form.category,title:form.title,description:form.description,budget:form.budget?parseFloat(form.budget):null,currency:"GHS"});
    setForm({title:"",description:"",category:"Tailoring",budget:""});
    setModal(false); load();
    setPosting(false);
  };

  return (
    <>
      <div className="market-scroll">
        <div className="market-masthead">
          <div className="market-eyebrow">Fashion Atelier</div>
          <div className="market-title">The<br/><b>Marketplace</b></div>
          <div className="market-search"><IcoSearch/><input placeholder="Search designers, tailors, requests…"/></div>
        </div>
        <div className="market-filters">{CATS.map(f=><button key={f} className={`mf-chip ${filter===f?"on":""}`} onClick={()=>setFilter(f)}>{f}</button>)}</div>
        <div className="post-request-card" onClick={()=>setModal(true)}>
          <div className="prc-title">Commission a Creator</div>
          <div className="prc-sub">Post your custom fashion request · Receive bids within hours</div>
          <div className="prc-input-row"><input className="prc-input" placeholder="Describe your vision…" readOnly/><button className="prc-btn">Post ✦</button></div>
        </div>
        <div style={{padding:"0 20px 8px"}}><div className="section-head">Open Commissions</div></div>
        {loading?<Spinner/>:(
          <div className="requests-grid">
            {requests.length===0&&<div className="empty-state"><div className="empty-icon">🧵</div><div className="empty-title">No requests yet</div><div className="empty-sub">Be the first to post a commission</div></div>}
            {requests.map(r=>(
              <div key={r.id} className="req-card">
                <div className="req-top">
                  <div style={{flex:1}}><span className="req-cat">{r.category}</span><div className="req-title">{r.title}</div></div>
                  {r.budget&&<div className="req-budget">GH₵ {Number(r.budget).toLocaleString()}</div>}
                </div>
                {r.description&&<p className="req-desc">{r.description}</p>}
                <div className="req-bottom">
                  <div className="req-meta-left">
                    <span className="req-meta-item">{timeAgo(r.created_at)}</span>
                    <span className="req-meta-item">{r.bids_count||0} bids</span>
                    {r.is_urgent&&<span className="req-urgent">Urgent</span>}
                  </div>
                  <button className="req-offer-btn">Make Offer</button>
                </div>
              </div>
            ))}
          </div>
        )}
        <div style={{height:100}}/>
      </div>
      {modal&&(
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setModal(false)}>
          <div className="modal-sheet">
            <div className="modal-title">Post a Commission</div>
            <input className="modal-input" placeholder="Title — e.g. Custom Kente Wedding Gown" value={form.title} onChange={set("title")}/>
            <textarea className="modal-input" placeholder="Describe your vision in detail…" rows={3} value={form.description} onChange={set("description")}/>
            <div className="modal-row">
              <select className="modal-input" value={form.category} onChange={set("category")} style={{flex:1}}>
                {["Tailoring","Shoemaking","Makeup","Design","Styling"].map(c=><option key={c} value={c} style={{background:"#150E20"}}>{c}</option>)}
              </select>
              <input className="modal-input" placeholder="Budget (GH₵)" type="number" value={form.budget} onChange={set("budget")} style={{flex:1}}/>
            </div>
            <button className="modal-submit" onClick={post} disabled={posting}>{posting?"Posting…":"Post Commission ✦"}</button>
            <button className="modal-cancel" onClick={()=>setModal(false)}>Cancel</button>
          </div>
        </div>
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════
//  CHAT
// ═══════════════════════════════════════════════════════════
function ChatScreen({user}) {
  const [convs,setConvs] = useState([]);
  const [open,setOpen] = useState(null);
  const [messages,setMessages] = useState([]);
  const [msg,setMsg] = useState("");
  const [loading,setLoading] = useState(true);
  const endRef = useRef();

  const loadConvs = async()=>{
    if(!user) return;
    setLoading(true);
    const {data}=await supabase.from("conversations")
      .select("*,p1:profiles!conversations_participant1_fkey(id,username,full_name,avatar_url),p2:profiles!conversations_participant2_fkey(id,username,full_name,avatar_url)")
      .or(`participant1.eq.${user.id},participant2.eq.${user.id}`)
      .order("last_message_at",{ascending:false});
    setConvs(data||[]);
    setLoading(false);
  };

  useEffect(()=>{
    loadConvs();
    if(!user) return;
    const ch=supabase.channel(`convs:${user.id}`).on("postgres_changes",{event:"*",schema:"public",table:"conversations"},loadConvs).subscribe();
    return()=>supabase.removeChannel(ch);
  },[user]);

  useEffect(()=>{
    if(!open) return;
    supabase.from("messages").select("*,sender:profiles(id,username,full_name,avatar_url)").eq("conversation_id",open.id).order("created_at",{ascending:true})
      .then(({data})=>{ setMessages(data||[]); setTimeout(()=>endRef.current?.scrollIntoView(),100); });
    const ch=supabase.channel(`msgs:${open.id}`).on("postgres_changes",{event:"INSERT",schema:"public",table:"messages",filter:`conversation_id=eq.${open.id}`},
      ({new:m})=>{ setMessages(p=>[...p,m]); setTimeout(()=>endRef.current?.scrollIntoView({behavior:"smooth"}),50); }).subscribe();
    return()=>supabase.removeChannel(ch);
  },[open]);

  const send=async()=>{
    if(!msg.trim()||!open||!user) return;
    const c=msg; setMsg("");
    await supabase.from("messages").insert({conversation_id:open.id,sender_id:user.id,content:c});
    await supabase.from("conversations").update({last_message:c,last_message_at:new Date().toISOString()}).eq("id",open.id);
  };

  const other=conv=>conv?.participant1===user?.id?conv?.p2:conv?.p1;

  return (
    <div className="chat-outer">
      <div className="chat-head">
        <div className="chat-head-title">Messages</div>
        <div className="chat-search-bar"><IcoSearch/><input placeholder="Search conversations…"/></div>
      </div>
      <div className="chat-list-area">
        {loading&&<Spinner/>}
        {!loading&&convs.length===0&&<div className="empty-state"><div className="empty-icon">💬</div><div className="empty-title">No messages yet</div><div className="empty-sub">Start a conversation from a creator's profile</div></div>}
        {convs.map((c,i)=>{
          const o=other(c); if(!o) return null;
          return (
            <div key={c.id} className={`chat-row ${open?.id===c.id?"sel":""}`} onClick={()=>setOpen(c)}>
              <div className="chat-av" style={{background:PALETTES[i%PALETTES.length]}}>
                {o.avatar_url?<img src={o.avatar_url} alt={o.full_name}/>:initials(o.full_name||o.username)}
              </div>
              <div className="chat-row-content">
                <div className="chat-row-top"><span className="chat-row-name">{o.full_name||o.username}</span><span className="chat-row-time">{timeAgo(c.last_message_at)}</span></div>
                <div className="chat-row-preview">{c.last_message||"Start a conversation"}</div>
              </div>
            </div>
          );
        })}
      </div>
      {open&&(()=>{
        const o=other(open);
        const pal=convs.findIndex(c=>c.id===open.id)%PALETTES.length;
        return (
          <div className="chat-window open">
            <div className="chat-win-head">
              <button className="chat-back-btn" onClick={()=>setOpen(null)}><IcoBack/></button>
              <div className="chat-win-av" style={{background:PALETTES[pal]}}>{o?.avatar_url?<img src={o.avatar_url} alt={o.full_name}/>:initials(o?.full_name||o?.username)}</div>
              <div className="chat-win-info"><div className="chat-win-name">{o?.full_name||o?.username}</div><div className="chat-win-status">● Active</div></div>
              <div className="call-row"><div className="call-ico"><IcoPhone/></div><div className="call-ico"><IcoVid/></div></div>
            </div>
            <div className="msgs-area">
              {messages.map(m=>{
                const isOut=m.sender_id===user?.id;
                return (
                  <div key={m.id} className={`msg-wrap ${isOut?"out":"inc"}`}>
                    {!isOut&&<div style={{width:26,height:26,borderRadius:8,flexShrink:0,alignSelf:"flex-end",background:PALETTES[pal],display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700}}>{initials(o?.full_name||o?.username)}</div>}
                    <div><div className="msg-bubble">{m.content}</div><div className="msg-time">{timeAgo(m.created_at)}</div></div>
                  </div>
                );
              })}
              <div ref={endRef}/>
            </div>
            <div className="chat-inp-bar">
              <input className="chat-inp" placeholder="Write a message…" value={msg} onChange={e=>setMsg(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()}/>
              <button className="chat-send" onClick={send}><IcoSend/></button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  LIVE
// ═══════════════════════════════════════════════════════════
function LiveScreen() {
  const [viewers,setViewers] = useState(3847);
  const [liked,setLiked] = useState(false);
  useEffect(()=>{ const t=setInterval(()=>setViewers(v=>v+Math.floor(Math.random()*8-2)),2200); return()=>clearInterval(t); },[]);
  const doubled=[...DEMO_TICKERS,...DEMO_TICKERS];
  return (
    <div className="live-outer">
      <div className="live-bg" style={{background:PALETTES[2]}}>
        <div style={{position:"absolute",inset:0,opacity:0.13,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <span style={{fontFamily:"var(--ff-impact)",fontSize:220,color:"#fff",letterSpacing:-10}}>LIVE</span>
        </div>
      </div>
      <div className="live-cinema"/>
      <div className="live-top">
        <div className="live-pill"><div className="live-dot"/>Live</div>
        <div className="live-viewer-badge"><IcoEye/>{viewers.toLocaleString()}</div>
      </div>
      <div className="live-creator-row">
        <div className="live-cr-av" style={{background:PALETTES[2]}}>AO</div>
        <div><div className="live-cr-name">Amara Osei</div><div className="live-cr-sub">✂️ Atelier · Accra</div></div>
        <button className="live-follow-btn">+ Follow</button>
      </div>
      <div className="live-center">
        <div className="live-center-eyebrow">Season Premiere · 2025</div>
        <div className="live-center-name">Kente Luxe<br/>Collection</div>
        <div className="live-center-sub">Fashion show · Live from Accra, Ghana</div>
      </div>
      <div className="live-actions">
        <div className="live-act" onClick={()=>setLiked(p=>!p)}><IcoHeart lit={liked}/></div>
        <div className="live-act"><IcoComment/></div>
        <div className="live-act"><IcoShare/></div>
        <div className="live-act"><IcoBookmark/></div>
      </div>
      <div className="live-ticker">
        <div className="live-ticker-inner">{doubled.map((m,i)=><div key={i} className="live-ticker-msg"><span className="ticker-user">{m.user}</span><span className="ticker-text">{m.msg}</span><span style={{color:"rgba(248,245,255,0.2)",fontSize:10}}>·</span></div>)}</div>
      </div>
      <div className="live-bottom">
        <input className="live-inp" placeholder="Say something to the designer…"/>
        <button className="live-gift-btn">🎁</button>
        <button className="live-send"><IcoSend/></button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  ROOT
// ═══════════════════════════════════════════════════════════
const NAV = [
  {id:"feed",   label:"Discover",icon:<IcoHome/>},
  {id:"market", label:"Atelier", icon:<IcoMarket/>},
  {id:"post",   label:null,      icon:null},
  {id:"chat",   label:"Inbox",   icon:<IcoChat/>},
  {id:"live",   label:"Runway",  icon:<IcoLive/>},
];

export default function VioFashion() {
  const {user,profile,signOut} = useAuth();
  const [screen,setScreen] = useState("feed");
  useEffect(()=>{ injectFonts(); injectCSS(); },[]);
  const render=()=>{
    switch(screen){
      case "feed":    return <FeedScreen user={user}/>;
      case "profile": return <ProfileScreen user={user} profile={profile} onSignOut={signOut}/>;
      case "market":  return <MarketScreen user={user}/>;
      case "chat":    return <ChatScreen user={user}/>;
      case "live":    return <LiveScreen/>;
      default:        return <FeedScreen user={user}/>;
    }
  };
  return (
    <div className="shell">
      <div className="screen-wrap">{render()}</div>
      <div className="nav-pill">
        {NAV.map(item=>{
          if(item.id==="post") return <button key="post" className="nav-post-btn" onClick={()=>setScreen("profile")}><IcoPlus/></button>;
          return <button key={item.id} className={`nav-item ${screen===item.id?"active":""}`} onClick={()=>setScreen(item.id)}>{item.icon}{item.label}</button>;
        })}
      </div>
    </div>
  );
}