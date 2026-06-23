import * as Sharing from "expo-sharing";
import { Platform, Share } from "react-native";

interface ShareOpts {
  title: string;
  text: string;
  url?: string;
}

export async function shareLink(opts: ShareOpts): Promise<void> {
  const message = opts.url ? `${opts.text}\n\n${opts.url}` : opts.text;

  if (Platform.OS === "web") {
    // Fallback for web
    try {
      await navigator.clipboard.writeText(message);
    } catch {
      // clipboard blocked
    }
    return;
  }

  // Native share sheet
  try {
    await Share.share({
      message,
      title: opts.title,
    });
  } catch {
    // user cancelled or error
  }
}
