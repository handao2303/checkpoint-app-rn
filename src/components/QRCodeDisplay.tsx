import React from 'react';
import QRCode from 'react-native-qrcode-svg';
import { API_URL } from '../lib/api';

interface QRCodeDisplayProps {
  id: string;
  type?: 'checkpoint' | 'place' | 'journey';
}

export function QRCodeDisplay({ id, type = 'checkpoint' }: QRCodeDisplayProps) {
  const urls = {
    checkpoint: `${API_URL}/share/checkpoint/${id}`,
    place: `${API_URL}/share/place/${id}`,
    journey: `${API_URL}/share/journey/${id}`,
  };
  return <QRCode value={urls[type]} size={160} />;
}
