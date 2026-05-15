// src/hooks/useFirestore.js
// Replaces useSupabase.js — all data hooks & helpers via Firestore + Firebase Storage

import { useState, useEffect, useCallback, useRef } from "react";
import {
  collection, doc, getDoc, getDocs, addDoc, setDoc,
  updateDoc, query, where, orderBy, limit,
  onSnapshot, serverTimestamp, increment, writeBatch, arrayUnion,
} from "firebase/firestore";
import { db } from "../firebaseClient";

// ── shorthand helpers ─────────────────────────────────────────
const col  = (n)     => collection(db, n);
const dref = (n, id) => doc(db, n, id);

// ── normalise Firestore doc → plain obj ───────────────────────
const snap2obj = (d) => (d.exists() ? { id: d.id, ...d.data() } : null);
const snaps    = (s) => s.docs.map(d => ({ id: d.id, ...d.data() }));

// attach creator profile to a video/offer/etc
async function withCreator(obj, idField = "creator_id") {
  if (obj[idField]) {
    const ps = await getDoc(dref("profiles", obj[idField]));
    obj.creator = snap2obj(ps);
  }
  return obj;
}

// ════════════════════════════════════════════════════════════
//  VIDEO FEED
// ════════════════════════════════════════════════════════════

export function useVideoFeed(lmt = 20) {
  const [videos, setVideos]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(col("videos"), where("is_published", "==", true),
      orderBy("created_at", "desc"), limit(lmt));
    const unsub = onSnapshot(q, async (snap) => {
      const results = await Promise.all(
        snap.docs.map(async (d) => withCreator({ id: d.id, ...d.data() }))
      );
      setVideos(results);
      setLoading(false);
    });
    return unsub;
  }, [lmt]);

  return { videos, loading };
}

// ════════════════════════════════════════════════════════════
//  CREATOR ANALYTICS
// ════════════════════════════════════════════════════════════

export function useCreatorAnalytics(userId) {
  const [analytics, setAnalytics] = useState(null);
  const [videos, setVideos]       = useState([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const [pSnap, vSnap] = await Promise.all([
        getDoc(dref("profiles", userId)),
        getDocs(query(col("videos"), where("creator_id", "==", userId),
          where("is_published", "==", true), orderBy("likes_count", "desc"), limit(20))),
      ]);
      const vids = snaps(vSnap);
      const p    = pSnap.exists() ? pSnap.data() : {};
      setVideos(vids);
      setAnalytics({
        totalViews:    vids.reduce((s, v) => s + (v.views_count    || 0), 0),
        totalLikes:    vids.reduce((s, v) => s + (v.likes_count    || 0), 0),
        totalComments: vids.reduce((s, v) => s + (v.comments_count || 0), 0),
        totalPosts:    vids.length,
        followers:     p.followers_count || 0,
        rating:        p.rating || null,
      });
      setLoading(false);
    })();
  }, [userId]);

  return { analytics, videos, loading };
}

// ════════════════════════════════════════════════════════════
//  OFFERS
// ════════════════════════════════════════════════════════════

export function useOffers(requestId) {
  const [offers, setOffers]   = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!requestId) return;
    const snap = await getDocs(
      query(col("offers"), where("request_id", "==", requestId),
        orderBy("created_at", "desc"))
    );
    const results = await Promise.all(snaps(snap).map(o => withCreator(o)));
    setOffers(results);
    setLoading(false);
  }, [requestId]);

  useEffect(() => { reload(); }, [reload]);
  return { offers, loading, reload };
}

export async function submitOffer({ requestId, creatorId, message, price, deliveryDays }) {
  const existing = await getDocs(
    query(col("offers"), where("request_id", "==", requestId), where("creator_id", "==", creatorId))
  );
  if (!existing.empty) throw new Error("You have already submitted an offer for this request.");

  await addDoc(col("offers"), {
    request_id:    requestId,
    creator_id:    creatorId,
    message,
    price,
    delivery_days: deliveryDays,
    status:        "pending",
    created_at:    serverTimestamp(),
  });
  await updateDoc(dref("requests", requestId), { bids_count: increment(1) });
}

export async function acceptOffer(offerId, requestId) {
  const offerSnap = await getDoc(dref("offers", offerId));
  const acceptedCreatorId = offerSnap.exists() ? offerSnap.data().creator_id || null : null;
  const batch = writeBatch(db);
  batch.update(dref("offers",   offerId),   { status: "accepted" });
  batch.update(dref("requests", requestId), {
    status: "in_progress",
    accepted_creator_id: acceptedCreatorId,
    updated_at: serverTimestamp(),
  });
  await batch.commit();

  // reject remaining pending offers
  const pending = await getDocs(
    query(col("offers"), where("request_id", "==", requestId), where("status", "==", "pending"))
  );
  if (!pending.empty) {
    const b2 = writeBatch(db);
    pending.docs.forEach(d => { if (d.id !== offerId) b2.update(d.ref, { status: "rejected" }); });
    await b2.commit();
  }
}

export async function rejectOffer(offerId) {
  await updateDoc(dref("offers", offerId), { status: "rejected" });
}

// ════════════════════════════════════════════════════════════
//  ORDERS
// ════════════════════════════════════════════════════════════

export function useCustomerOrders(userId) {
  const [orders, setOrders]   = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    setLoading(true);
    const snap = await getDocs(
      query(col("requests"), where("customer_id", "==", userId),
        where("status", "in", ["in_progress", "completed", "paid"]),
        orderBy("updated_at", "desc"))
    );
    const results = await Promise.all(snaps(snap).map(async (r) => {
      const oSnap = await getDocs(
        query(col("offers"), where("request_id", "==", r.id), where("status", "==", "accepted"))
      );
      const accepted = await Promise.all(snaps(oSnap).map(o => withCreator(o)));
      return { ...r, accepted_offer: accepted };
    }));
    setOrders(results);
    setLoading(false);
  }, [userId]);

  useEffect(() => { reload(); }, [reload]);
  return { orders, loading, reload };
}

export function useCreatorOrders(userId) {
  const [orders, setOrders]   = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    setLoading(true);
    const snap = await getDocs(
      query(col("offers"), where("creator_id", "==", userId),
        where("status", "==", "accepted"), orderBy("created_at", "desc"))
    );
    const results = await Promise.all(snaps(snap).map(async (o) => {
      if (o.request_id) {
        const rSnap = await getDoc(dref("requests", o.request_id));
        if (rSnap.exists()) {
          const r = { id: rSnap.id, ...rSnap.data() };
          if (r.customer_id) {
            const pSnap = await getDoc(dref("profiles", r.customer_id));
            r.customer = snap2obj(pSnap);
          }
          o.request = r;
        }
      }
      return o;
    }));
    setOrders(results);
    setLoading(false);
  }, [userId]);

  useEffect(() => { reload(); }, [reload]);
  return { orders, loading, reload };
}

export async function updateOrderStatus(requestId, status) {
  await updateDoc(dref("requests", requestId), { status, updated_at: serverTimestamp() });
}

// ════════════════════════════════════════════════════════════
//  NOTIFICATIONS
// ════════════════════════════════════════════════════════════

export function useNotifications(userId) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [unreadCount, setUnreadCount]     = useState(0);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    const q = query(
      col("notifications"),
      where("user_id", "==", userId),
      orderBy("created_at", "desc"),
      limit(60),
    );
    const unsub = onSnapshot(q, async (snap) => {
      const notifs = await Promise.all(
        snaps(snap).map(async (n) => {
          if (n.actor_id) {
            const ps = await getDoc(dref("profiles", n.actor_id));
            n.actor = snap2obj(ps);
          }
          return n;
        })
      );
      setNotifications(notifs);
      setUnreadCount(notifs.filter(n => !n.read).length);
      setLoading(false);
    }, (error) => {
      console.error("Failed to load notifications", error);
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
    });
    return unsub;
  }, [userId]);

  return { notifications, loading, unreadCount };
}

// ════════════════════════════════════════════════════════════
//  SEARCH  (client-side filter — works without Algolia)
// ════════════════════════════════════════════════════════════

export function useSearch(queryStr, type = "all") {
  const [results, setResults] = useState({ creators: [], requests: [] });
  const [loading, setLoading] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      const q = queryStr.trim().toLowerCase();
      const hasQuery = q.length >= 2;

      const [pSnap, rSnap] = await Promise.all([
        type !== "requests"
          ? getDocs(query(col("profiles"), limit(150)))
          : { docs: [] },
        type !== "creators"
          ? getDocs(query(col("requests"), where("status", "==", "open"),
              orderBy("created_at", "desc"), limit(80)))
          : { docs: [] },
      ]);

      const creators = snaps(pSnap)
        .filter(p => !hasQuery ||
          (p.username || "").toLowerCase().includes(q) ||
          (p.full_name || "").toLowerCase().includes(q) ||
          (p.role || "").toLowerCase().includes(q) ||
          (p.location || "").toLowerCase().includes(q) ||
          (p.services || []).some(s => String(s).toLowerCase().includes(q))
        )
        .slice(0, hasQuery ? 24 : 30);

      const requests = snaps(rSnap)
        .filter(r => !hasQuery ||
          (r.title || "").toLowerCase().includes(q) ||
          (r.description || "").toLowerCase().includes(q) ||
          (r.category || "").toLowerCase().includes(q)
        )
        .slice(0, hasQuery ? 16 : 12);

      setResults({ creators, requests });
      setLoading(false);
    }, queryStr.trim().length ? 260 : 80);

    return () => clearTimeout(timerRef.current);
  }, [queryStr, type]);

  return { results, loading };
}

// ════════════════════════════════════════════════════════════
//  CHAT
// ════════════════════════════════════════════════════════════

export async function getOrCreateConversation(uid1, uid2) {
  if (!uid1 || !uid2) throw new Error("Both users are required to start a conversation.");
  if (uid1 === uid2) throw new Error("You cannot start a conversation with yourself.");

  const [p1, p2] = [uid1, uid2].sort();
  const conversationId = `${p1}_${p2}`;
  const existing = await getDocs(
    query(
      col("conversations"),
      where("participants", "array-contains", uid1),
      limit(50),
    )
  );
  const match = existing.docs.find((d) => {
    const participants = d.data().participants || [];
    return participants.includes(uid1) && participants.includes(uid2);
  });
  if (match) return { id: match.id, ...match.data() };

  const data = {
    participant1:    p1,
    participant2:    p2,
    participants:    [p1, p2],
    last_message:    null,
    last_message_at: serverTimestamp(),
    created_at:      serverTimestamp(),
  };
  await setDoc(dref("conversations", conversationId), data);
  return { id: conversationId, ...data };
}

// ════════════════════════════════════════════════════════════
//  LIVE STREAMS
// ════════════════════════════════════════════════════════════

export async function startLiveStream({ creatorId, title, category }) {
  const ref = await addDoc(col("livestreams"), {
    creator_id:   creatorId,
    title,
    category,
    is_active:    true,
    viewer_count: 0,
    created_at:   serverTimestamp(),
  });
  return { id: ref.id, creator_id: creatorId, title, category, is_active: true };
}

export async function endLiveStream(streamId) {
  await updateDoc(dref("livestreams", streamId), {
    is_active:  false,
    ended_at:   serverTimestamp(),
  });
}

// ════════════════════════════════════════════════════════════════════
//  MEASUREMENT PROFILES
// ════════════════════════════════════════════════════════════════════

export async function getMeasurementProfile(userId) {
  if (!userId) return null;
  const snap = await getDoc(dref("measurement_profiles", userId));
  return snap2obj(snap);
}

export async function saveMeasurementProfile({ userId, payload }) {
  if (!userId) throw new Error("User is required");
  const clean = {
    height: payload.height || "",
    chest: payload.chest || "",
    waist: payload.waist || "",
    hips: payload.hips || "",
    inseam: payload.inseam || "",
    shoulder: payload.shoulder || "",
    generated_fit: payload.generated_fit || null,
    updated_at: Date.now(),
    updated_at_server: serverTimestamp(),
  };
  await setDoc(dref("measurement_profiles", userId), clean, { merge: true });
  await setDoc(dref("profiles", userId), { measurement_profile: clean, updated_at: serverTimestamp() }, { merge: true });
  return clean;
}

// ════════════════════════════════════════════════════════════════════
//  COMMUNITY
// ════════════════════════════════════════════════════════════════════

export function useCommunityPosts(limitCount = 40) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const q = query(col("community_posts"), orderBy("created_at", "desc"), limit(limitCount));
    const unsub = onSnapshot(q, async (snap) => {
      const rows = await Promise.all(snaps(snap).map(async (row) => {
        if (row.author_id) {
          const ps = await getDoc(dref("profiles", row.author_id));
          row.author = snap2obj(ps);
        }
        return row;
      }));
      setPosts(rows);
      setLoading(false);
      setError("");
    }, (err) => {
      console.error("Failed to load community posts", err);
      setPosts([]);
      setLoading(false);
      setError(err.message || "Unable to load community posts.");
    });
    return unsub;
  }, [limitCount]);

  return { posts, loading, error };
}

export async function createCommunityPost({ authorId, content }) {
  const text = String(content || "").trim();
  if (!authorId) throw new Error("Author is required");
  if (text.length < 2) throw new Error("Post is too short.");
  if (text.length > 600) throw new Error("Post must be 600 characters or fewer.");
  return addDoc(col("community_posts"), {
    author_id: authorId,
    content: text,
    mentions: [...new Set((text.match(/@\w+/g) || []).map(m => m.toLowerCase()))],
    created_at: serverTimestamp(),
  });
}

export async function getArtisanDirectory({ needle = "", limitCount = 40 } = {}) {
  const q = String(needle || "").trim().toLowerCase();
  const snap = await getDocs(query(col("profiles"), limit(Math.max(limitCount, 40))));
  return snaps(snap)
    .filter(p => ["tailor", "designer", "makeup_artist", "shoemaker", "admin", "owner"].includes(p.role))
    .filter(p => !q
      || (p.username || "").toLowerCase().includes(q)
      || (p.full_name || "").toLowerCase().includes(q)
      || (p.role || "").toLowerCase().includes(q)
      || (p.location || "").toLowerCase().includes(q)
      || (p.services || []).some(s => String(s).toLowerCase().includes(q)))
    .slice(0, limitCount);
}

// ════════════════════════════════════════════════════════════════════
//  SUBSCRIPTIONS
// ════════════════════════════════════════════════════════════════════

const VALID_TIERS = ["free", "pro", "elite"];

export async function setSubscriptionTier({ userId, tier }) {
  if (!userId) throw new Error("User is required");
  if (!VALID_TIERS.includes(tier)) throw new Error("Invalid subscription tier.");
  const at = serverTimestamp();
  await setDoc(dref("profiles", userId), { subscription_tier: tier, updated_at: at }, { merge: true });
  await addDoc(col("subscription_events"), {
    user_id: userId,
    tier,
    action: "set_tier",
    created_at: at,
  });
}

export function useSubscriptionEvents(userId, limitCount = 20) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!userId) { setEvents([]); setLoading(false); return; }
    const q = query(col("subscription_events"), where("user_id", "==", userId), orderBy("created_at", "desc"), limit(limitCount));
    const unsub = onSnapshot(q, (snap) => {
      setEvents(snaps(snap));
      setLoading(false);
      setError("");
    }, (err) => {
      console.error("Failed to load subscription events", err);
      setEvents([]);
      setLoading(false);
      setError(err.message || "Unable to load subscription events.");
    });
    return unsub;
  }, [userId, limitCount]);

  return { events, loading, error };
}

// ════════════════════════════════════════════════════════════════════
//  ESCROW EVENTS
// ════════════════════════════════════════════════════════════════════

export async function releaseEscrowForRequest({ requestId, actorId }) {
  if (!requestId || !actorId) throw new Error("Request and actor are required.");
  const reqSnap = await getDoc(dref("requests", requestId));
  if (!reqSnap.exists()) throw new Error("Request not found.");
  const request = reqSnap.data();
  const acceptedFromRequest = request.accepted_creator_id || null;
  const offersSnap = await getDocs(query(col("offers"), where("request_id", "==", requestId), where("status", "==", "accepted"), limit(1)));
  const accepted = offersSnap.docs[0]?.data() || null;
  const participants = [...new Set([request.customer_id, acceptedFromRequest, accepted?.creator_id, actorId].filter(Boolean))];
  await updateDoc(dref("requests", requestId), { status: "paid", updated_at: serverTimestamp() });
  await addDoc(col("escrow_events"), {
    request_id: requestId,
    actor_id: actorId,
    type: "release",
    status_after: "paid",
    participants,
    created_at: serverTimestamp(),
  });
}

export function useEscrowEvents(requestId, limitCount = 20) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!requestId) { setEvents([]); setLoading(false); return; }
    const q = query(col("escrow_events"), where("request_id", "==", requestId), orderBy("created_at", "desc"), limit(limitCount));
    const unsub = onSnapshot(q, (snap) => {
      setEvents(snaps(snap));
      setLoading(false);
      setError("");
    }, (err) => {
      console.error("Failed to load escrow events", err);
      setEvents([]);
      setLoading(false);
      setError(err.message || "Unable to load escrow events.");
    });
    return unsub;
  }, [requestId, limitCount]);

  return { events, loading, error };
}

export async function appendEscrowMilestone({ requestId, actorId, participants, label, stage }) {
  if (!requestId || !actorId) throw new Error("Request and actor are required.");
  const stageValue = typeof stage === "number" ? stage : null;
  const participantList = [...new Set([...(participants || []), actorId].filter(Boolean))];
  await addDoc(col("escrow_events"), {
    request_id: requestId,
    actor_id: actorId,
    type: "milestone",
    label: label || "Milestone update",
    stage: stageValue,
    participants: participantList,
    created_at: serverTimestamp(),
  });
  if (requestId) {
    const requestPatch = {
      milestone_stage: stageValue,
      milestone_log: arrayUnion({ label: label || "Milestone update", by: actorId, at: Date.now() }),
      updated_at: serverTimestamp(),
    };
    if (typeof stageValue === "number" && stageValue >= 3) requestPatch.status = "completed";
    else if (typeof stageValue === "number" && stageValue >= 1) requestPatch.status = "in_progress";
    await setDoc(dref("requests", requestId), requestPatch, { merge: true });
  }
}

export async function backfillAcceptedCreators(limitCount = 250) {
  const reqSnap = await getDocs(
    query(
      col("requests"),
      where("status", "in", ["in_progress", "completed", "paid"]),
      limit(limitCount),
    )
  );
  let fixed = 0;
  for (const docSnap of reqSnap.docs) {
    const request = docSnap.data();
    if (request.accepted_creator_id) continue;
    const acceptedSnap = await getDocs(
      query(
        col("offers"),
        where("request_id", "==", docSnap.id),
        where("status", "==", "accepted"),
        limit(1),
      )
    );
    const creatorId = acceptedSnap.docs[0]?.data()?.creator_id || null;
    if (!creatorId) continue;
    await updateDoc(dref("requests", docSnap.id), {
      accepted_creator_id: creatorId,
      updated_at: serverTimestamp(),
    });
    fixed += 1;
  }
  return fixed;
}
