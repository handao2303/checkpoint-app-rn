import React, { useRef, useState, useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Modal, SafeAreaView } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { colors } from "../theme/tokens";

interface CameraSheetProps {
  visible: boolean;
  onClose: () => void;
  onCapture: (uri: string) => void;
  maxCount?: number;
}

export function CameraSheet({ visible, onClose, onCapture, maxCount = 3 }: CameraSheetProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [facing, setFacing] = useState<"front" | "back">("back");
  const [flash, setFlash] = useState<"off" | "on">("off");
  const [captured, setCaptured] = useState<string[]>([]);
  const [previewUri, setPreviewUri] = useState<string | null>(null);

  const takePicture = async () => {
    if (!cameraRef.current) return;
    const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
    if (!photo) return;

    if (maxCount === 1) {
      // Single shot mode — return immediately
      onCapture(photo.uri);
      onClose();
    } else {
      // Multi shot mode — preview, then continue/capture more
      setCaptured((prev) => [...prev, photo.uri]);
      setPreviewUri(photo.uri);
    }
  };

  const confirmPreview = () => {
    if (previewUri) {
      onCapture(previewUri);
    }
    setPreviewUri(null);
    if (captured.length >= maxCount) {
      onClose();
    }
  };

  const retakePreview = () => {
    setPreviewUri(null);
    setCaptured((prev) => prev.slice(0, -1));
  };

  if (!permission) {
    return (
      <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
        <SafeAreaView style={styles.container}>
          <Text style={{ textAlign: "center", padding: 40 }}>Requesting camera permission...</Text>
        </SafeAreaView>
      </Modal>
    );
  }

  if (!permission.granted) {
    return (
      <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
        <SafeAreaView style={styles.container}>
          <View style={{ alignItems: "center", justifyContent: "center", flex: 1, padding: 40 }}>
            <Text style={{ fontSize: 18, marginBottom: 16 }}>Camera permission required</Text>
            <TouchableOpacity style={styles.permitBtn} onPress={requestPermission}>
              <Text style={{ color: "#fff", fontWeight: "600" }}>Grant Permission</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ marginTop: 16 }} onPress={onClose}>
              <Text style={{ color: colors.neutral[500] }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        {previewUri ? (
          // Preview after shot
          <View style={{ flex: 1 }}>
            <View style={[styles.preview, { flex: 1 }]}>
              <Text style={styles.previewLabel}>Preview</Text>
            </View>
            <View style={styles.previewActions}>
              <TouchableOpacity style={styles.previewBtn} onPress={retakePreview}>
                <Text style={styles.previewBtnText}>Retake</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.previewBtn, styles.previewBtnPrimary]} onPress={confirmPreview}>
                <Text style={[styles.previewBtnText, { color: "#fff" }]}>Use Photo</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          // Viewfinder
          <CameraView
            ref={cameraRef}
            style={{ flex: 1 }}
            facing={facing}
            flash={flash}
          >
            <View style={styles.cameraOverlay}>
              {/* Top bar */}
              <View style={styles.topBar}>
                <TouchableOpacity onPress={onClose}>
                  <Text style={{ color: "#fff", fontSize: 16 }}>✕ Close</Text>
                </TouchableOpacity>
                <Text style={{ color: "#fff" }}>
                  {captured.length}/{maxCount}
                </Text>
                <TouchableOpacity onPress={() => setFlash(flash === "off" ? "on" : "off")}>
                  <Text style={{ color: "#fff", fontSize: 16 }}>
                    {flash === "off" ? "⚡ Off" : "⚡ On"}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Bottom bar */}
              <View style={styles.bottomBar}>
                <TouchableOpacity onPress={() => setFacing(facing === "back" ? "front" : "back")}>
                  <Text style={{ color: "#fff", fontSize: 16 }}>🔄 Flip</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.shutterBtn} onPress={takePicture}>
                  <View style={styles.shutterInner} />
                </TouchableOpacity>
                <View style={{ width: 60 }} />
              </View>
            </View>
          </CameraView>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  cameraOverlay: { flex: 1, justifyContent: "space-between" },
  topBar: {
    flexDirection: "row", justifyContent: "space-between",
    paddingHorizontal: 20, paddingTop: 16,
  },
  bottomBar: {
    flexDirection: "row", justifyContent: "space-around", alignItems: "center",
    paddingHorizontal: 20, paddingBottom: 40,
  },
  shutterBtn: {
    width: 72, height: 72, borderRadius: 36,
    borderWidth: 4, borderColor: "#fff",
    alignItems: "center", justifyContent: "center",
  },
  shutterInner: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: "#fff",
  },
  preview: {
    alignItems: "center", justifyContent: "center",
    backgroundColor: colors.neutral[800],
  },
  previewLabel: { color: "#fff", fontSize: 18 },
  previewActions: {
    flexDirection: "row", justifyContent: "space-around",
    padding: 20, gap: 16,
  },
  previewBtn: {
    flex: 1, alignItems: "center", paddingVertical: 14,
    borderRadius: 12, backgroundColor: colors.neutral[100],
  },
  previewBtnPrimary: { backgroundColor: colors.primary[500] },
  previewBtnText: { fontSize: 16, fontWeight: "600" },
  permitBtn: {
    backgroundColor: colors.primary[500], paddingHorizontal: 24,
    paddingVertical: 12, borderRadius: 999,
  },
});
