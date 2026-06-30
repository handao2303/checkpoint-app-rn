import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import BottomSheet, {
  BottomSheetView,
  BottomSheetScrollView,
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  snapPoints?: (string | number)[];
  /** Render content in a BottomSheetScrollView for long, scrollable detail. */
  scrollable?: boolean;
}

export function Sheet({
  open,
  onClose,
  children,
  snapPoints = ['50%', '90%'],
  scrollable = false,
}: SheetProps) {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPointsMemo = useMemo(() => snapPoints, [snapPoints]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
      />
    ),
    [],
  );

  useEffect(() => {
    if (open) {
      // Open at the FIRST (smallest) snap point — not expand(), which jumps to
      // the tallest. Content scrolls inside and the user can drag up for more.
      bottomSheetRef.current?.snapToIndex(0);
    } else {
      bottomSheetRef.current?.close();
    }
  }, [open]);

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={snapPointsMemo}
      enableDynamicSizing={false}
      enablePanDownToClose
      onClose={onClose}
      backdropComponent={renderBackdrop}
      handleIndicatorStyle={{ backgroundColor: '#D1C5BE', width: 36 }}
      backgroundStyle={{
        backgroundColor: '#FFF8F1',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
      }}
    >
      {scrollable ? (
        <BottomSheetScrollView showsVerticalScrollIndicator={false}>
          {children}
        </BottomSheetScrollView>
      ) : (
        <BottomSheetView>{children}</BottomSheetView>
      )}
    </BottomSheet>
  );
}
