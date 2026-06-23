import { Platform } from "react-native";

export interface Comment {
  id: string;
  text: string;
  user_id: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
  created_at: Date;
}

export interface CommentAuthor {
  id: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
}

const PAGE = 20;

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
        const app = initializeApp({ apiKey, projectId, appId }, "checkpoint-comments");
        const db = mod.getFirestore(app);
        _firestore = { kind: "web", db, ...mod };
      }
    } catch { console.warn("Firebase web not configured"); }
    return _firestore;
  }

  // Native: @react-native-firebase/firestore (needs google-services files)
  try {
    const pkg = require("@react-native-firebase/firestore") as any;
    _firestore = { kind: "native", db: pkg.default() };
  } catch { /* not installed */ }
  return _firestore;
}

export async function fetchComments(checkpointId: string, after?: any): Promise<{
  items: Comment[]; cursor?: any;
}> {
  try {
    const fs = await getDb();
    if (!fs) return { items: [] };

    const { db, collection, query, orderBy, limit, startAfter, getDocs } = fs;
    const col = collection(db, "checkpoints", checkpointId, "comments");
    const constraints = [orderBy("created_at", "desc")];
    if (after) constraints.push(startAfter(after));
    constraints.push(limit(PAGE));
    const snap = await getDocs(query(col, ...constraints));
    const items = snap.docs.map(mapComment);
    return { items, cursor: snap.docs.length === PAGE ? snap.docs[snap.docs.length - 1] : undefined };
  } catch (error) {
    console.error("fetchComments failed:", error);
    return { items: [] };
  }
}

function mapComment(d: any): Comment {
  const v = d.data();
  return { id: d.id, text: v.text, user_id: v.user_id, username: v.username || "unknown", display_name: v.display_name, avatar_url: v.avatar_url, created_at: v.created_at?.toDate() || new Date() };
}

export async function addComment(checkpointId: string, text: string, author: CommentAuthor): Promise<void> {
  const fs = await getDb();
  if (!fs) return;
  const { serverTimestamp } = await import("firebase/firestore");
  const { db, collection, addDoc } = fs;
  await addDoc(collection(db, "checkpoints", checkpointId, "comments"), {
    text: text.trim(), user_id: author.id, username: author.username,
    display_name: author.display_name || null, avatar_url: author.avatar_url || null,
    created_at: serverTimestamp(),
  });
}

export async function deleteComment(checkpointId: string, commentId: string): Promise<void> {
  const fs = await getDb();
  if (!fs) return;
  const { db, doc, deleteDoc } = fs;
  await deleteDoc(doc(db, "checkpoints", checkpointId, "comments", commentId));
}

export async function getCommentCount(checkpointId: string): Promise<number> {
  const fs = await getDb();
  if (!fs) return 0;
  try {
    const { db, collection, getCountFromServer } = fs;
    const snap = await getCountFromServer(collection(db, "checkpoints", checkpointId, "comments"));
    return snap.data().count;
  } catch { return 0; }
}
