'use client';

import { useEffect, useState } from 'react';

interface QRCodeWrapperProps {
  value: string;
  size?: number;
}

export function QRCodeWrapper({ value, size = 200 }: QRCodeWrapperProps) {
  const [QRComponent, setQRComponent] = useState<any>(null);

  useEffect(() => {
    import('qrcode.react').then((module) => {
      setQRComponent(() => module.QRCodeSVG);
    });
  }, []);

  if (!QRComponent) {
    return (
      <div 
        className="bg-gray-100 animate-pulse" 
        style={{ width: size, height: size }}
      />
    );
  }

  return <QRComponent value={value} size={size} />;
}
