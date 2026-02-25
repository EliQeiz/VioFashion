// src/hooks/useSupabase.js
// ─────────────────────────────────────────────────────────────
//  Data hooks for: Videos, Marketplace, Chat
//  Each hook handles fetching, mutations, and realtime where needed.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabaseClient'

// ════════════════════════════════════════════════════════════
//  VIDEO FEED HOOKS
// ════════════════════════════════════════════════════════════

/**
 * Fetch the "For You" video feed (latest videos + creator profile)
 * Usage: const { videos, loading, error } = useVideoFeed()
 */
export function useVideoFeed(limit = 20) {
  const [videos, setVideos]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => {
    const fetch = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('videos')
        .select(`
          *,
          creator:profiles(
            id, username, full_name, avatar_url, role, is_verified, followers_count
          )
        `)
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) setError(error.message)
      else setVideos(data)
      setLoading(false)
    }
    fetch()
  }, [limit])

  return { videos, loading, error }
}

/**
 * Toggle a like on a video
 * Usage: const { toggleLike, isLiked } = useVideoLike(videoId, userId)
 */
export function useVideoLike(videoId, userId) {
  const [isLiked, setIsLiked] = useState(false)

  // Check initial like state
  useEffect(() => {
    if (!userId || !videoId) return
    supabase
      .from('video_likes')
      .select('video_id')
      .eq('video_id', videoId)
      .eq('user_id', userId)
      .single()
      .then(({ data }) => setIsLiked(!!data))
  }, [videoId, userId])

  const toggleLike = async () => {
    if (!userId) return // must be logged in

    if (isLiked) {
      await supabase
        .from('video_likes')
        .delete()
        .eq('video_id', videoId)
        .eq('user_id', userId)
      setIsLiked(false)
    } else {
      await supabase
        .from('video_likes')
        .insert({ video_id: videoId, user_id: userId })
      setIsLiked(true)
    }
  }

  return { isLiked, toggleLike }
}

/**
 * Toggle follow/unfollow a user
 * Usage: const { isFollowing, toggleFollow } = useFollow(targetId, currentUserId)
 */
export function useFollow(targetId, currentUserId) {
  const [isFollowing, setIsFollowing] = useState(false)

  useEffect(() => {
    if (!currentUserId || !targetId) return
    supabase
      .from('follows')
      .select('follower_id')
      .eq('follower_id', currentUserId)
      .eq('following_id', targetId)
      .single()
      .then(({ data }) => setIsFollowing(!!data))
  }, [targetId, currentUserId])

  const toggleFollow = async () => {
    if (!currentUserId) return

    if (isFollowing) {
      await supabase
        .from('follows')
        .delete()
        .eq('follower_id', currentUserId)
        .eq('following_id', targetId)
      setIsFollowing(false)
    } else {
      await supabase
        .from('follows')
        .insert({ follower_id: currentUserId, following_id: targetId })
      setIsFollowing(true)
    }
  }

  return { isFollowing, toggleFollow }
}

/**
 * Upload a video file to Supabase Storage and save metadata to DB
 */
export async function uploadVideo({ file, caption, tags, soundName, creatorId }) {
  // 1. Upload file to storage
  const fileExt = file.name.split('.').pop()
  const filePath = `${creatorId}/${Date.now()}.${fileExt}`

  const { data: storageData, error: storageError } = await supabase.storage
    .from('videos')
    .upload(filePath, file, { contentType: file.type })

  if (storageError) throw storageError

  const { data: urlData } = supabase.storage.from('videos').getPublicUrl(filePath)

  // 2. Insert video record
  const { data, error } = await supabase
    .from('videos')
    .insert({
      creator_id: creatorId,
      video_url: urlData.publicUrl,
      caption,
      tags,
      sound_name: soundName,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

// ════════════════════════════════════════════════════════════
//  PROFILE HOOKS
// ════════════════════════════════════════════════════════════

/**
 * Fetch a single profile by username
 * Usage: const { profile, videos, loading } = useProfile(username)
 */
export function useProfile(username) {
  const [profile, setProfile] = useState(null)
  const [videos, setVideos]   = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!username) return
    const fetch = async () => {
      setLoading(true)

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*, profile_services(service)')
        .eq('username', username)
        .single()

      if (profileData) {
        setProfile(profileData)

        const { data: videosData } = await supabase
          .from('videos')
          .select('id, thumbnail_url, likes_count, views_count')
          .eq('creator_id', profileData.id)
          .eq('is_published', true)
          .order('created_at', { ascending: false })

        setVideos(videosData || [])
      }
      setLoading(false)
    }
    fetch()
  }, [username])

  return { profile, videos, loading }
}

/**
 * Upload avatar image to Supabase Storage
 */
export async function uploadAvatar(file, userId) {
  const fileExt = file.name.split('.').pop()
  const filePath = `${userId}/avatar.${fileExt}`

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(filePath, file, { upsert: true })

  if (uploadError) throw uploadError

  const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)

  await supabase
    .from('profiles')
    .update({ avatar_url: data.publicUrl })
    .eq('id', userId)

  return data.publicUrl
}

// ════════════════════════════════════════════════════════════
//  MARKETPLACE HOOKS
// ════════════════════════════════════════════════════════════

/**
 * Fetch all open marketplace requests
 * Usage: const { requests, loading } = useRequests(category)
 */
export function useRequests(category = null) {
  const [requests, setRequests] = useState([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    const fetch = async () => {
      setLoading(true)
      let query = supabase
        .from('requests')
        .select(`
          *,
          customer:profiles(id, username, avatar_url)
        `)
        .eq('status', 'open')
        .order('created_at', { ascending: false })

      if (category) query = query.eq('category', category)

      const { data, error } = await query
      if (!error) setRequests(data)
      setLoading(false)
    }
    fetch()
  }, [category])

  return { requests, loading }
}

/**
 * Post a new marketplace request
 */
export async function postRequest({ customerId, category, title, description, budget, isUrgent, images = [], deadline }) {
  const { data, error } = await supabase
    .from('requests')
    .insert({
      customer_id: customerId,
      category,
      title,
      description,
      budget,
      is_urgent: isUrgent,
      images,
      deadline,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Submit an offer on a request
 */
export async function submitOffer({ requestId, creatorId, message, price, deliveryDays }) {
  const { data, error } = await supabase
    .from('offers')
    .insert({
      request_id: requestId,
      creator_id: creatorId,
      message,
      price,
      delivery_days: deliveryDays,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Fetch all offers for a request
 */
export function useOffers(requestId) {
  const [offers, setOffers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!requestId) return
    supabase
      .from('offers')
      .select(`*, creator:profiles(id, username, full_name, avatar_url, rating, role)`)
      .eq('request_id', requestId)
      .order('created_at', { ascending: false })
      .then(({ data }) => { setOffers(data || []); setLoading(false) })
  }, [requestId])

  return { offers, loading }
}

// ════════════════════════════════════════════════════════════
//  CHAT / MESSAGING HOOKS
// ════════════════════════════════════════════════════════════

/**
 * Fetch all conversations for the current user
 * Usage: const { conversations, loading } = useConversations(userId)
 */
export function useConversations(userId) {
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return

    const fetch = async () => {
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          participant1_profile:profiles!conversations_participant1_fkey(id, username, full_name, avatar_url),
          participant2_profile:profiles!conversations_participant2_fkey(id, username, full_name, avatar_url)
        `)
        .or(`participant1.eq.${userId},participant2.eq.${userId}`)
        .order('last_message_at', { ascending: false })

      if (!error) setConversations(data)
      setLoading(false)
    }
    fetch()

    // Realtime updates when new messages arrive
    const channel = supabase
      .channel(`conversations:${userId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'conversations',
        filter: `participant1=eq.${userId}`,
      }, () => fetch())
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'conversations',
        filter: `participant2=eq.${userId}`,
      }, () => fetch())
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [userId])

  return { conversations, loading }
}

/**
 * Fetch messages for a conversation + subscribe to new ones in realtime
 * Usage: const { messages, loading, sendMessage } = useMessages(conversationId, userId)
 */
export function useMessages(conversationId, senderId) {
  const [messages, setMessages] = useState([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    if (!conversationId) return

    // Initial fetch
    supabase
      .from('messages')
      .select(`*, sender:profiles(id, username, avatar_url)`)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .then(({ data }) => { setMessages(data || []); setLoading(false) })

    // Realtime subscription
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload) => {
        setMessages(prev => [...prev, payload.new])
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [conversationId])

  const sendMessage = useCallback(async (content, imageUrl = null) => {
    if (!content && !imageUrl) return

    // Insert message
    const { error } = await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: senderId,
      content,
      image_url: imageUrl,
    })
    if (error) throw error

    // Update conversation last_message
    await supabase
      .from('conversations')
      .update({ last_message: content || '📷 Image', last_message_at: new Date().toISOString() })
      .eq('id', conversationId)
  }, [conversationId, senderId])

  return { messages, loading, sendMessage }
}

/**
 * Get or create a conversation between two users
 */
export async function getOrCreateConversation(userId1, userId2) {
  // Normalize order so (A,B) and (B,A) map to the same row
  const [p1, p2] = [userId1, userId2].sort()

  let { data } = await supabase
    .from('conversations')
    .select('id')
    .eq('participant1', p1)
    .eq('participant2', p2)
    .single()

  if (!data) {
    const { data: newConv, error } = await supabase
      .from('conversations')
      .insert({ participant1: p1, participant2: p2 })
      .select()
      .single()
    if (error) throw error
    data = newConv
  }

  return data
}
