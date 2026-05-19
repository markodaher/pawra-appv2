import { useEffect, useRef, useState } from 'react';
import {
  Animated, KeyboardAvoidingView, Platform, Pressable,
  ScrollView, Text, TextInput, View,
} from 'react-native';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { FONT } from '../constants/theme';
import { useApp } from '../lib/AppContext';
import * as db from '../lib/db';
import { supabase } from '../lib/supabase';
import { useEnterAnim } from '../lib/transitions';
import type { ChatTarget, Message, Theme } from '../types';
import { Avatar } from './primitives';
import { Icon } from './Icon';

// ─── Message bubble ───────────────────────────────────────────────────────────

function Bubble({ m, isMe, T, showName }: {
  m: Message; isMe: boolean; T: Theme; showName: boolean;
}) {
  const time = new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return (
    <View style={{
      alignItems: isMe ? 'flex-end' : 'flex-start',
      marginBottom: 2, paddingHorizontal: 16,
    }}>
      {showName && !isMe ? (
        <Text style={{ fontSize: 11, fontWeight: '600', color: T.inkMuted, marginBottom: 4, marginLeft: 2 }}>
          {m.senderName}
        </Text>
      ) : null}
      <View style={{
        maxWidth: '75%',
        backgroundColor: isMe ? T.brand : T.surface,
        borderRadius: 18,
        borderBottomRightRadius: isMe ? 4 : 18,
        borderBottomLeftRadius:  isMe ? 18 : 4,
        paddingHorizontal: 14, paddingVertical: 10,
        borderWidth: isMe ? 0 : 1, borderColor: T.hairline,
      }}>
        <Text style={{ fontSize: 15, color: isMe ? '#fff' : T.ink, lineHeight: 21 }}>
          {m.body}
        </Text>
      </View>
      <Text style={{ fontSize: 10.5, color: T.inkMuted, marginTop: 3, marginHorizontal: 4 }}>
        {time}
      </Text>
    </View>
  );
}

// ─── Date separator ──────────────────────────────────────────────────────────

function DateSep({ ts, T }: { ts: number; T: Theme }) {
  const d = new Date(ts);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const msgDay = new Date(ts); msgDay.setHours(0, 0, 0, 0);
  const label = msgDay.getTime() === today.getTime()
    ? 'Today'
    : d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' });
  return (
    <View style={{ alignItems: 'center', marginVertical: 12 }}>
      <View style={{
        paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999,
        backgroundColor: T.surfaceAlt,
      }}>
        <Text style={{ fontSize: 11.5, color: T.inkMuted, fontWeight: '600' }}>{label}</Text>
      </View>
    </View>
  );
}

// ─── Main sheet ───────────────────────────────────────────────────────────────

export function ChatSheet({ target, T, onClose }: {
  target: ChatTarget; T: Theme; onClose: () => void;
}) {
  const { user, refreshUnreadChatCount, bookings, orders } = useApp();
  const anim = useEnterAnim('right');

  // Conversation is only active while the underlying booking/order is in flight.
  // After completion/cancellation/decline, the chat is locked — prevents off-app
  // poaching once the service has ended.
  const relatedBooking = target.bookingId ? bookings.find(b => b.id === target.bookingId) : null;
  const relatedOrder   = target.orderId   ? orders.find(o => o.id === target.orderId)     : null;
  const isActive =
    (relatedBooking && (relatedBooking.status === 'confirmed' || relatedBooking.status === 'in_progress')) ||
    (relatedOrder   && (relatedOrder.status   === 'confirmed' || relatedOrder.status   === 'shipped'))     ||
    // No related record found (legacy/stale) — allow viewing but the input will hide.
    false;

  const [messages, setMessages] = useState<Message[]>([]);
  const [draft,    setDraft]    = useState('');
  const [sending,  setSending]  = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Load messages and mark as read on open
  useEffect(() => {
    let cancelled = false;
    db.loadMessages({ bookingId: target.bookingId, orderId: target.orderId })
      .then(msgs => { if (!cancelled) setMessages(msgs); });
    db.markMessagesRead(
      { bookingId: target.bookingId, orderId: target.orderId },
      user.id,
    ).then(() => refreshUnreadChatCount());

    return () => { cancelled = true; };
  }, [target.bookingId, target.orderId]);

  // Realtime subscription for this conversation
  useEffect(() => {
    const filter = target.bookingId
      ? `booking_id=eq.${target.bookingId}`
      : `order_id=eq.${target.orderId}`;

    const channel = supabase
      .channel(`chat-${target.bookingId ?? target.orderId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter,
      }, (payload) => {
        const row = payload.new as db.MessageRow;
        const msg: Message = {
          id:          row.id,
          bookingId:   row.booking_id  ?? undefined,
          orderId:     row.order_id    ?? undefined,
          senderId:    row.sender_id,
          senderName:  row.sender_name,
          body:        row.body,
          createdAt:   new Date(row.created_at).getTime(),
        };
        setMessages(prev => [...prev, msg]);
        if (row.sender_id !== user.id) {
          db.markMessagesRead(
            { bookingId: target.bookingId, orderId: target.orderId },
            user.id,
          ).then(() => refreshUnreadChatCount());
        }
      })
      .subscribe();

    channelRef.current = channel;
    return () => { channel.unsubscribe(); };
  }, [target.bookingId, target.orderId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
  }, [messages.length]);

  const onSend = async () => {
    const body = draft.trim();
    if (!body || sending) return;
    setDraft('');
    setSending(true);
    await db.sendMessage({
      bookingId:   target.bookingId,
      orderId:     target.orderId,
      senderId:    user.id,
      senderName:  user.name || user.email || 'You',
      recipientId: target.recipientId,
      body,
    });
    setSending(false);
  };

  // Group messages to show date separators
  const grouped: { sep?: string; msg?: Message }[] = [];
  let lastDay = '';
  for (const m of messages) {
    const day = new Date(m.createdAt).toDateString();
    if (day !== lastDay) {
      grouped.push({ sep: day });
      lastDay = day;
    }
    grouped.push({ msg: m });
  }

  return (
    <Animated.View style={[{
      position: 'absolute', inset: 0, zIndex: 95, backgroundColor: T.bg,
    }, anim.sheet]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <View style={{
          paddingTop: 14, paddingHorizontal: 16, paddingBottom: 12,
          flexDirection: 'row', alignItems: 'center', gap: 12,
          borderBottomWidth: 1, borderBottomColor: T.hairline,
          backgroundColor: T.bg,
        }}>
          <Pressable onPress={onClose} style={{
            width: 40, height: 40, borderRadius: 20, backgroundColor: T.surface,
            borderWidth: 1, borderColor: T.hairline,
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name="chevron-left" size={20} color={T.ink} />
          </Pressable>

          <Avatar
            name={target.otherName}
            size={40} T={T}
            imageUrl={target.otherAvatar}
          />

          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: T.ink, letterSpacing: -0.3 }}>
              {target.otherName}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 }}>
              <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: T.success }} />
              <Text style={{ fontSize: 11.5, color: T.inkMuted, fontWeight: '500' }}>Active</Text>
            </View>
          </View>

          {/* Booking/order reference badge */}
          <View style={{
            paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
            backgroundColor: T.brandSoft,
          }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: T.brandInk, letterSpacing: 0.2 }}>
              {target.bookingId ? 'Booking' : 'Order'}
            </Text>
          </View>
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ paddingVertical: 16, gap: 6 }}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="on-drag"
        >
          {messages.length === 0 ? (
            <View style={{ alignItems: 'center', padding: 40, gap: 10 }}>
              <View style={{
                width: 56, height: 56, borderRadius: 28, backgroundColor: T.brandSoft,
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon name="send" size={24} color={T.brand} />
              </View>
              <Text style={{ fontSize: 15, fontWeight: '700', color: T.ink, textAlign: 'center' }}>
                Start the conversation
              </Text>
              <Text style={{ fontSize: 13.5, color: T.inkMuted, textAlign: 'center', lineHeight: 19 }}>
                Ask about timing, special instructions or anything else.
              </Text>
            </View>
          ) : (
            grouped.map((g, i) => {
              if (g.sep) {
                return <DateSep key={`sep_${i}`} ts={new Date(g.sep).getTime()} T={T} />;
              }
              const m = g.msg!;
              const isMe = m.senderId === user.id;
              const prev = grouped[i - 1]?.msg;
              const showName = !isMe && (!prev || prev.senderId !== m.senderId);
              return (
                <Bubble key={m.id} m={m} isMe={isMe} T={T} showName={showName} />
              );
            })
          )}
        </ScrollView>

        {/* Input bar — or "conversation closed" notice when inactive */}
        {isActive ? (
          <View style={{
            flexDirection: 'row', alignItems: 'flex-end', gap: 10,
            paddingHorizontal: 16, paddingVertical: 12,
            borderTopWidth: 1, borderTopColor: T.hairline,
            backgroundColor: T.bg,
          }}>
            <View style={{
              flex: 1, minHeight: 44, maxHeight: 120,
              backgroundColor: T.surface, borderRadius: 22,
              borderWidth: 1, borderColor: T.hairline,
              paddingHorizontal: 16, paddingVertical: 10,
              justifyContent: 'center',
            }}>
              <TextInput
                value={draft}
                onChangeText={setDraft}
                placeholder="Message…"
                placeholderTextColor={T.inkMuted}
                multiline
                returnKeyType="default"
                style={{
                  fontFamily: FONT.sans, fontSize: 15, color: T.ink,
                  padding: 0, maxHeight: 100,
                }}
              />
            </View>
            <Pressable
              onPress={onSend}
              disabled={!draft.trim() || sending}
              style={({ pressed }) => ({
                width: 44, height: 44, borderRadius: 22,
                backgroundColor: draft.trim() ? T.brand : T.surfaceAlt,
                alignItems: 'center', justifyContent: 'center',
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <Icon name="send" size={18} color={draft.trim() ? '#fff' : T.inkMuted} />
            </Pressable>
          </View>
        ) : (
          <View style={{
            paddingHorizontal: 16, paddingVertical: 16,
            borderTopWidth: 1, borderTopColor: T.hairline,
            backgroundColor: T.surfaceAlt,
            flexDirection: 'row', alignItems: 'center', gap: 10,
          }}>
            <Icon name="lock" size={16} color={T.inkMuted} />
            <Text style={{ flex: 1, fontSize: 13, color: T.inkSoft, lineHeight: 18 }}>
              This conversation has ended. New messages are only allowed while a booking or order is active.
            </Text>
          </View>
        )}
      </KeyboardAvoidingView>
    </Animated.View>
  );
}
