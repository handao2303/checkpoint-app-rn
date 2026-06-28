// Firestore-backed 1-1 and group chat. Rooms are stored at the top-level
// collection "rooms" with a "messages" subcollection. 1-1 room IDs are
// deterministic (sorted member UIDs) to prevent duplicates. Group room IDs
// use uuid v4. Notifications use the existing
// users/{uid}/notifications pattern.
//
// Ported from web/src/lib/chat.ts — uses @react-native-firebase/firestore
// namespaced API instead of the modular firebase/firestore SDK.

import { v4 as uuidv4 } from 'uuid';
import firestore from '@react-native-firebase/firestore';
import { db } from './firebase';
import { getUsersByIDs } from './api';
import { trackError, trackEvent } from './observability';

const PRESENCE_STALE_MS = 6 * 60_000;
const PRESENCE_REFRESH_MS = 4 * 60_000;
const PRESENCE_QUERY_CHUNK = 30;

// ── Types ────────────────────────────────────────────────────────

export interface Room {
  id: string;
  type: 'dm' | 'group';
  name?: string;
  avatar_url?: string;
  members: string[];
  member_names: Record<string, string>;
  created_by: string;
  created_at: Date;
  last_message?: {
    text: string;
    sender_id: string;
    sender_name: string;
    has_image: boolean;
    sent_at: Date;
  };
  /** Derived: true if last_message was sent after the user's last read. */
  unread?: boolean;
}

export interface Message {
  id: string;
  room_id: string;
  sender_id: string;
  sender_name: string;
  sender_avatar?: string;
  text?: string;
  image_url?: string;
  image_thumb_url?: string;
  created_at: Date;
}

export interface PresenceStatus {
  online: boolean;
  updated_at: Date;
}

type Unsubscribe = () => void;

// ── Room helpers ─────────────────────────────────────────────────

/** Build a deterministic 1-1 room ID from two user IDs. */
export function dmRoomId(uidA: string, uidB: string): string {
  const ids = [uidA, uidB].sort();
  return `dm_${ids[0]}_${ids[1]}`;
}

/** Build a random group room ID. */
export function groupRoomId(): string {
  return `group_${uuidv4()}`;
}

/** Get or create a 1-1 DM room between the current user and partner.
 *  Returns the existing room ID if it already exists. */
export async function getOrCreateDMRoom(
  myUid: string,
  myName: string,
  partnerUid: string,
): Promise<string> {
  const roomId = dmRoomId(myUid, partnerUid);
  const ref = db.collection('rooms').doc(roomId);
  const snap = await ref.get();

  if (!snap.exists) {
    const users = await getUsersByIDs([myUid, partnerUid]);
    const names: Record<string, string> = {};
    for (const u of users) {
      names[u.id] = u.display_name || u.username;
    }
    // Fallback for self if not in getUsersByIDs response.
    if (!names[myUid]) names[myUid] = myName;

    await ref.set({
      type: 'dm',
      members: [myUid, partnerUid].sort(),
      member_names: names,
      created_by: myUid,
      created_at: firestore.FieldValue.serverTimestamp(),
    });
    trackEvent('chat_room_created', { type: 'dm', room_id: roomId });
  }

  return roomId;
}

/** Create a group room. Returns the new room ID. */
export async function createGroupRoom(
  myUid: string,
  name: string,
  memberIds: string[],
  avatarUrl?: string,
): Promise<string> {
  const roomId = groupRoomId();
  const users = await getUsersByIDs(memberIds);
  const names: Record<string, string> = {};
  for (const u of users) {
    names[u.id] = u.display_name || u.username;
  }

  await db.collection('rooms').doc(roomId).set({
    type: 'group',
    name,
    avatar_url: avatarUrl || null,
    members: memberIds.sort(),
    member_names: names,
    created_by: myUid,
    created_at: firestore.FieldValue.serverTimestamp(),
  });
  trackEvent('chat_room_created', { type: 'group', room_id: roomId, member_count: memberIds.length });

  return roomId;
}

/** Update a group room's name, avatar, and/or members. */
export async function updateGroupRoom(
  roomId: string,
  updates: {
    name?: string;
    avatar_url?: string | null;
    addMembers?: string[];
    removeMembers?: string[];
  },
): Promise<void> {
  const ref = db.collection('rooms').doc(roomId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error('Room not found');
  const room = snap.data() as Record<string, any>;
  if (room.type !== 'group') throw new Error('Not a group room');

  const data: Record<string, any> = {};

  if (updates.name !== undefined) data.name = updates.name;
  if (updates.avatar_url !== undefined) data.avatar_url = updates.avatar_url;

  // Merge members
  if (updates.addMembers?.length || updates.removeMembers?.length) {
    let members: string[] = room.members as string[];
    if (updates.addMembers) {
      members = [...new Set([...members, ...updates.addMembers])];
    }
    if (updates.removeMembers) {
      const removeSet = new Set(updates.removeMembers);
      members = members.filter((id) => !removeSet.has(id));
    }
    data.members = members.sort();

    // Resolve new member names
    const newIds = updates.addMembers?.filter((id) => !(room.member_names as Record<string, string>)[id]) ?? [];
    if (newIds.length > 0) {
      const users = await getUsersByIDs(newIds);
      const names: Record<string, string> = { ...(room.member_names as Record<string, string>) };
      for (const u of users) {
        names[u.id] = u.display_name || u.username;
      }
      data.member_names = names;
    }
  }

  if (Object.keys(data).length > 0) {
    await ref.update(data);
    trackEvent('chat_group_updated', { room_id: roomId, fields: Object.keys(data).join(',') });
  }
}

/** List all rooms the user is a member of, sorted by last_message time desc. */
export function subscribeRooms(
  uid: string,
  cb: (rooms: Room[]) => void,
): Unsubscribe {
  const q = db.collection('rooms').where('members', 'array-contains', uid);
  return q.onSnapshot(
    (snap) => {
      const rooms = snap.docs
        .map((d) => {
          const data = d.data();
          const lastMsg = data.last_message;
          const lastSent = lastMsg?.sent_at?.toDate?.()?.getTime?.() ?? 0;
          const readMap = data.read as Record<string, any> | undefined;
          const readAt = readMap?.[uid]?.toDate?.()?.getTime?.() ?? getRoomReadAtLocal(d.id);
          return {
            id: d.id,
            ...data,
            created_at: data.created_at?.toDate?.() ?? new Date(),
            last_message: lastMsg
              ? { ...lastMsg, sent_at: lastMsg.sent_at?.toDate?.() ?? new Date() }
              : undefined,
            unread: lastMsg?.sender_id !== uid && lastSent > readAt,
          } as Room;
        })
        .sort((a, b) => {
          const aTime = a.last_message?.sent_at?.getTime() ?? a.created_at.getTime();
          const bTime = b.last_message?.sent_at?.getTime() ?? b.created_at.getTime();
          return bTime - aTime; // newest first
        }) as Room[];
      cb(rooms);
    },
    (error) => {
      cb([]);
      trackError(error, { feature: 'chat', action: 'subscribe_rooms' });
    },
  );
}

/** Get display name for a room (group name, or the other member's name for DM). */
export function roomDisplayName(room: Room, myUid: string): string {
  if (room.type === 'group') return room.name || 'Nhóm';
  const other = room.members.find((id) => id !== myUid);
  return other ? (room.member_names[other] || 'Người dùng') : 'DM';
}

/** Mark a room as read for a user. Writes to the room doc so subscribers re-fire. */
export async function markRoomRead(roomId: string, userId: string): Promise<void> {
  await db.collection('rooms').doc(roomId).update({
    [`read.${userId}`]: firestore.FieldValue.serverTimestamp(),
  });
  // Note: localStorage is not available on mobile — read state is Firestore-only.
  trackEvent('chat_room_read', { room_id: roomId });
}

/** Get the local cached read time for a room. Returns 0 — use Firestore read field instead. */
export function getRoomReadAtLocal(_roomId: string): number {
  // localStorage is not available on React Native.
  // The caller falls back to 0 when Firestore read field is absent.
  return 0;
}

/** Get avatar URL for a room (group avatar, or nothing for DM — client renders
 *  the other member's avatar separately). */
export function roomAvatarUrl(room: Room): string | undefined {
  return room.type === 'group' ? room.avatar_url : undefined;
}

function normalizePresence(data: Record<string, any> | undefined): PresenceStatus {
  const updatedAt = data?.updated_at?.toDate?.() ?? new Date(0);
  return {
    online: data?.online === true && Date.now() - updatedAt.getTime() <= PRESENCE_STALE_MS,
    updated_at: updatedAt,
  };
}

/** Keep the current user's presence fresh while the app is active.
 *  On mobile, the heartbeat runs on an interval; app foreground/background
 *  state should be driven by AppState from the call site. */
export function startUserPresence(uid: string): Unsubscribe {
  let stopped = false;
  let lastOnline: boolean | null = null;
  const ref = db.collection('presence').doc(uid);

  const writePresence = (online: boolean, force = false) => {
    if (stopped) return;
    if (!force && lastOnline === online) return;
    lastOnline = online;
    ref.set({ online, updated_at: firestore.FieldValue.serverTimestamp() }, { merge: true }).catch((error) => {
      trackError(error, { feature: 'chat', action: 'presence_write' });
    });
  };

  writePresence(true);
  const interval = setInterval(() => {
    if (!stopped) writePresence(true, true);
  }, PRESENCE_REFRESH_MS);

  return () => {
    stopped = true;
    clearInterval(interval);
    ref.set({ online: false, updated_at: firestore.FieldValue.serverTimestamp() }, { merge: true }).catch(() => {
      /* best-effort */
    });
  };
}

/** Subscribe to presence rows for a bounded set of users. */
export function subscribePresence(
  userIds: string[],
  cb: (presence: Record<string, PresenceStatus>) => void,
): Unsubscribe {
  const ids = [...new Set(userIds)].filter(Boolean);
  if (ids.length === 0) {
    cb({});
    return () => {};
  }

  const presence: Record<string, PresenceStatus> = {};
  for (const uid of ids) presence[uid] = normalizePresence(undefined);

  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += PRESENCE_QUERY_CHUNK) {
    chunks.push(ids.slice(i, i + PRESENCE_QUERY_CHUNK));
  }

  const unsubs = chunks.map((chunk) =>
    db
      .collection('presence')
      .where(firestore.FieldPath.documentId(), 'in', chunk)
      .onSnapshot(
        (snap) => {
          for (const uid of chunk) presence[uid] = normalizePresence(undefined);
          for (const docSnap of snap.docs) {
            presence[docSnap.id] = normalizePresence(docSnap.data());
          }
          cb({ ...presence });
        },
        (error) => {
          trackError(error, { feature: 'chat', action: 'presence_subscribe' });
        },
      ),
  );

  return () => {
    for (const unsub of unsubs) unsub();
  };
}

// ── Message helpers ──────────────────────────────────────────────

/** Send a message to a room. Updates last_message and notifies other members. */
export async function sendMessage(
  roomId: string,
  sender: { id: string; display_name?: string; username: string; avatar_url?: string },
  text?: string,
  image?: { url: string; thumbUrl: string },
): Promise<void> {
  const senderName = sender.display_name || sender.username;
  // Use .doc() with no arg to auto-generate an ID, then .set() (mirrors web's doc(collection(...)))
  const msgRef = db.collection('rooms').doc(roomId).collection('messages').doc();

  await msgRef.set({
    room_id: roomId,
    sender_id: sender.id,
    sender_name: senderName,
    sender_avatar: sender.avatar_url || null,
    text: text || null,
    image_url: image?.url || null,
    image_thumb_url: image?.thumbUrl || null,
    created_at: firestore.FieldValue.serverTimestamp(),
  });

  // Update room's last_message preview
  const preview = (text || '📷 Hình ảnh').slice(0, 80) + ((text && text.length > 80) ? '…' : '');
  await db.collection('rooms').doc(roomId).update({
    last_message: {
      text: preview,
      sender_id: sender.id,
      sender_name: senderName,
      has_image: !!image,
      sent_at: firestore.FieldValue.serverTimestamp(),
    },
  });
  trackEvent('chat_message_sent', { room_id: roomId, has_image: !!image });
}

/** Subscribe to the latest messages in a room, returned oldest first for display. */
export function subscribeMessages(
  roomId: string,
  maxCount: number,
  cb: (messages: Message[]) => void,
): Unsubscribe {
  const q = db
    .collection('rooms')
    .doc(roomId)
    .collection('messages')
    .orderBy('created_at', 'desc')
    .limit(maxCount);

  return q.onSnapshot(
    (snap) => {
      cb(
        snap.docs.map((d) => {
          const v = d.data();
          return {
            id: d.id,
            room_id: v.room_id,
            sender_id: v.sender_id,
            sender_name: v.sender_name,
            sender_avatar: v.sender_avatar ?? undefined,
            text: v.text ?? undefined,
            image_url: v.image_url ?? undefined,
            image_thumb_url: v.image_thumb_url ?? undefined,
            created_at: v.created_at?.toDate?.() ?? new Date(),
          };
        }).reverse() as Message[],
      );
    },
    (error) => {
      cb([]);
      trackError(error, { feature: 'chat', action: 'subscribe_messages' });
    },
  );
}
