import React from 'react';
import QRCode from 'react-native-qrcode-svg';

interface QRCodeDisplayProps {
  id: string;
  type?: 'checkpoint' | 'place' | 'journey';
}

export function QRCodeDisplay({ id, type = 'checkpoint' }: QRCodeDisplayProps) {
  const urls = {
    checkpoint: `https://checkpointapp.vn/c/${id}`,
    place: `https://checkpointapp.vn/p/${id}`,
    journey: `https://checkpointapp.vn/j/${id}`,
  };
  return <QRCode value={urls[type]} size={160} />;
}
