"use client"

import { useState, useEffect } from 'react'

export interface BluetoothPrinterSettings {
  nama_toko: string;
  alamat_toko: string;
  no_telepon: string;
  teks_struk: string;
}

export function useBluetoothPrinter() {
  const [device, setDevice] = useState<any>(null);
  const [deviceName, setDeviceName] = useState<string>('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const PRINT_SERVICES = [
    '000018f0-0000-1000-8000-00805f9b34fb', // Standard BLE Thermal
    '49535343-fe7d-4ae5-8fa9-9fafd205e455', // ISSC
    'e7e1a121-481d-11e5-8a0a-0800200c9a66', // Generic BLE Print
  ];

  // Try to load any previously authorized devices on mount
  useEffect(() => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined' || !navigator.bluetooth) return;

    // Check if we can list authorized devices
    if ((navigator.bluetooth as any).getDevices) {
      (navigator.bluetooth as any).getDevices()
        .then((devices: any[]) => {
          if (devices.length > 0) {
            setDeviceName(devices[0].name || 'Printer Terdaftar');
            // We don't auto-connect to save battery, but we show that a printer is remembered
          }
        })
        .catch((err: any) => console.warn('Error fetching paired devices:', err));
    }
  }, []);

  const connectPrinter = async (): Promise<any> => {
    setError(null);
    setIsConnecting(true);
    try {
      if (typeof navigator === 'undefined' || !navigator.bluetooth) {
        throw new Error('Bluetooth tidak didukung di browser ini. Gunakan Google Chrome atau Edge.');
      }

      // Check if we already have a device and it's connected
      if (device && device.gatt?.connected) {
        setIsConnected(true);
        setIsConnecting(false);
        return device;
      }

      // Request Bluetooth device
      const selectedDevice = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: PRINT_SERVICES
      });

      setDevice(selectedDevice);
      setDeviceName(selectedDevice.name || 'Printer Bluetooth');

      // Add disconnect event listener
      selectedDevice.addEventListener('gattserverdisconnected', () => {
        setIsConnected(false);
      });

      setIsConnected(true);
      setIsConnecting(false);
      return selectedDevice;
    } catch (err: any) {
      setIsConnecting(false);
      if (err.name === 'NotFoundError') {
        // User cancelled the pairing dialog, no error message needed
        return null;
      }
      setError(err.message || 'Gagal menghubungkan printer.');
      return null;
    }
  };

  const printReceipt = async (
    settings: BluetoothPrinterSettings,
    type: 'payment' | 'credit',
    data: any
  ): Promise<boolean> => {
    setError(null);
    try {
      let activeDevice = device;
      
      // If not connected, try to connect first
      if (!activeDevice || !activeDevice.gatt?.connected) {
        activeDevice = await connectPrinter();
      }

      if (!activeDevice) return false;

      setIsConnecting(true);

      // Connect to GATT Server
      const server = await activeDevice.gatt?.connect();
      if (!server) throw new Error('Gagal terhubung ke GATT server printer.');

      // Find write characteristic
      let writeCharacteristic: any = null;
      for (const serviceUuid of PRINT_SERVICES) {
        try {
          const service = await server.getPrimaryService(serviceUuid);
          const characteristics = await service.getCharacteristics();
          for (const char of characteristics) {
            if (char.properties.write || char.properties.writeWithoutResponse) {
              writeCharacteristic = char;
              break;
            }
          }
        } catch (e) {
          // Try next service
        }
        if (writeCharacteristic) break;
      }

      if (!writeCharacteristic) {
        throw new Error('Tidak menemukan karakteristik cetak pada printer ini. Pastikan printer menyala dan mendukung Bluetooth Low Energy (BLE).');
      }

      // Build ESC/POS bytes
      const bytes = buildEscPosBytes(settings, type, data);

      // Send to printer in chunks (usually max MTU is 20-512 bytes, 20 is safest fallback)
      const chunkSize = 20;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.slice(i, i + chunkSize);
        await writeCharacteristic.writeValue(chunk);
        // Small delay to prevent printer buffer overflow
        await new Promise(resolve => setTimeout(resolve, 15));
      }

      setIsConnected(true);
      setIsConnecting(false);
      return true;
    } catch (err: any) {
      setIsConnecting(false);
      setError(err.message || 'Terjadi kesalahan saat mencetak.');
      return false;
    }
  };

  const disconnectPrinter = () => {
    if (device && device.gatt?.connected) {
      device.gatt.disconnect();
    }
    setDevice(null);
    setDeviceName('');
    setIsConnected(false);
  };

  return {
    connectPrinter,
    disconnectPrinter,
    printReceipt,
    deviceName,
    isConnecting,
    isConnected,
    error,
    isBluetoothSupported: typeof navigator !== 'undefined' && !!navigator.bluetooth
  };
}

function buildEscPosBytes(
  settings: BluetoothPrinterSettings,
  type: 'payment' | 'credit',
  data: any
): Uint8Array {
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];

  const add = (bytes: number[] | Uint8Array) => {
    chunks.push(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes));
  };

  const addText = (text: string) => {
    add(encoder.encode(text));
  };

  // Helper to align text
  const alignLeft = [0x1B, 0x61, 0x00];
  const alignCenter = [0x1B, 0x61, 0x01];

  // Helper for font styles
  const fontNormal = [0x1D, 0x21, 0x00];
  const fontBoldOn = [0x1B, 0x45, 0x01];
  const fontBoldOff = [0x1B, 0x45, 0x00];
  const fontDoubleSize = [0x1D, 0x21, 0x11]; // 2x width, 2x height
  
  // Format row with 32 char width
  const formatRow = (label: string, value: string): string => {
    const spacesNeeded = 32 - (label.length + value.length);
    if (spacesNeeded <= 0) {
      return `${label} ${value}\n`;
    }
    return `${label}${' '.repeat(spacesNeeded)}${value}\n`;
  };

  // Initialize printer
  add([0x1B, 0x40]);

  // Store Name (Centered, Double Size)
  add(alignCenter);
  add(fontDoubleSize);
  addText(`${settings.nama_toko}\n`);
  
  // Store Meta (Address & Phone)
  add(fontNormal);
  if (settings.alamat_toko) addText(`${settings.alamat_toko}\n`);
  if (settings.no_telepon) addText(`Telp: ${settings.no_telepon}\n`);
  
  // Divider
  addText('--------------------------------\n');

  // Title
  add(fontBoldOn);
  if (type === 'payment') {
    addText('BUKTI PEMBAYARAN CICILAN\n');
  } else {
    addText('BUKTI KREDIT BARANG\n');
  }
  add(fontBoldOff);

  // Date
  const dateStr = data.tanggal_formatted || new Date().toLocaleString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  addText(`${dateStr}\n`);
  addText('--------------------------------\n');

  // Body
  add(alignLeft);
  if (type === 'payment') {
    // Payment receipt fields
    addText(formatRow('Pelanggan', data.customer_nama));
    if (data.sebelum !== undefined) {
      addText(formatRow('Sebelum', data.sebelum));
    }
    addText(formatRow('Bayar', data.bayar));
    
    // Callout box for Remaining Balance
    add(alignCenter);
    add(fontBoldOn);
    addText('\n================================\n');
    addText(`Sisa : ${data.sisa}\n`);
    addText('================================\n\n');
    add(fontBoldOff);
    add(alignCenter);
    if (data.sisa_detail) {
      addText(`${data.sisa_detail}\n`);
    }
  } else {
    // Credit/Transaction receipt fields
    addText(formatRow('Pelanggan', data.customer_nama));
    addText('Rincian Barang:\n');
    
    // Items
    for (const item of (data.items || [])) {
      addText(`${item.nama_barang}\n`);
      const qtyPrice = `  ${item.qty} x ${item.harga_satuan}`;
      addText(formatRow(qtyPrice, item.subtotal));
    }
    
    addText('--------------------------------\n');
    add(fontBoldOn);
    addText(formatRow('Total Tagihan', data.grand_total));
    add(fontBoldOff);
    
    add(alignCenter);
    addText('\nHarap simpan struk ini sebagai\nbukti pengambilan barang.\n');
  }

  // Footer Message
  add(alignCenter);
  addText('--------------------------------\n');
  addText(`${settings.teks_struk || 'Terima kasih!'}\n`);
  
  // Feed paper 4 lines
  add([0x0A, 0x0A, 0x0A, 0x0A]);
  
  // Cut paper (GS V 65 0)
  add([0x1D, 0x56, 0x41, 0x00]);

  // Combine chunks into single Uint8Array
  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  
  return result;
}
