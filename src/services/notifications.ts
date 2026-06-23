import { Platform } from "react-native";

export type NotifType = "comment" | "follow" | "reaction" | "checkpoint";

export interface NotifActor {
  id: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
}

export interface AppNotification {
  id: string;
  type: NotifType;
  actor: NotifActor;
  checkpoint_id?: string;
  checkpoint_name?: string;
  reaction?: string;
  created_at: Date;
}

let _firestore: any = null;

async function getDb(): Promise<any> {
  if (_firestore) return _firestore;

  if (Platform.OS === "web") {
    try {
      const { initializeApp } = await import("firebase/app");
      const mod = await import("firebase/firestore");
      const apiKey = process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
      const projectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
      const appId = process.env.EXPO_PUBLIC_FIREBASE_APP_ID;
      if (apiKey && projectId) {
        const app = initializeApp({ apiKey, projectId, appId }, "checkpoint-notifications");
        const db = mod.getFirestore(app);
        _firestore = { kind: "web", db, ...mod };
      }
    } catch { /* no firebase */ }
    return _firestore;
  }

  // Native: @react-native-firebase/firestore (needs google-services files)
  try {
    const pkg = require("@react-native-firebase/firestore") as any;
    _firestore = { kind: "native", db: pkg.default() };
  } catch { /* not installed */ }
  return _firestore;
}

function actorFields(actor: NotifActor) {
  return {
    actor_id: actor.id,
    actor_username: actor.username,
    actor_display_name: actor.display_name ?? null,
    actor_avatar_url: actor.avatar_url ?? null,
  };
}

export async function addCommentNotification(
  recipientId: string,
  actor: NotifActor,
  checkpointId: string,
  checkpointName: string,
): Promise<void> {
  if (recipientId === actor.id) return;
  const fs = await getDb();
  if (!fs) return;

  const { serverTimestamp } = await import("firebase/firestore");
  const data = {
    type: "comment", ...actorFields(actor),
    checkpoint_id: checkpointId, checkpoint_name: checkpointName,
    created_at: serverTimestamp(),
  };
  const { db, collection, addDoc } = fs;
  await addDoc(collection(db, "users", recipientId, "notifications"), data);
}

export async function addFollowNotification(recipientId: string, actor: NotifActor): Promise<void> {
  if (recipientId === actor.id) return;
  const fs = await getDb();
  if (!fs) return;
  const { serverTimestamp } = await import("firebase/firestore");
  const { db, collection, addDoc } = fs;
  await addDoc(collection(db, "users", recipientId, "notifications"), {
    type: "follow", ...actorFields(actor), created_at: serverTimestamp(),
  });
}

export async function addReactionNotification(
  recipientId: string, actor: NotifActor,
  checkpointId: string, checkpointName: string, reaction: string,
): Promise<void> {
  if (recipientId === actor.id) return;
  const fs = await getDb();
  if (!fs) return;
  const { serverTimestamp } = await import("firebase/firestore");
  const { db, collection, addDoc } = fs;
  await addDoc(collection(db, "users", recipientId, "notifications"), {
    type: "reaction", ...actorFields(actor),
    checkpoint_id: checkpointId, checkpoint_name: checkpointName, reaction,
    created_at: serverTimestamp(),
  });
}
