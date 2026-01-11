'use client';

import { useEffect, useState } from 'react';
import { walletManager, checkWalletAvailability } from '../lib/wallet';

interface WalletConnectProps {
  onConnect?: () => void;  // Add this prop
}

export default function WalletConnect({ onConnect }: WalletConnectProps) {  // Accept onConnect prop
  const [loading, setLoading] = useState(false);
  const [walletAvailable, setWalletAvailable] = useState(false);
  const [walletState, setWalletState] = useState(walletManager.getState());

  useEffect(() => {
    setWalletAvailable(checkWalletAvailability());
    
    // Add subscription to wallet state changes
    const unsubscribe = walletManager.subscribe((newState) => {
      setWalletState(newState);
    });
    
    return () => unsubscribe();
  }, []);

  const connect = async () => {
    try {
      setLoading(true);
      const state = await walletManager.connect();
      setWalletState(state);
      
      // Call onConnect callback if provided
      if (onConnect) {
        onConnect();
      }
    } catch (err: any) {
      console.error('Connect error:', err);
      alert(err.message || 'Wallet connection failed');
    } finally {
      setLoading(false);
    }
  };

  const disconnect = () => {
    walletManager.disconnect();
    setWalletState(walletManager.getState());
    
    // Call onConnect callback if provided
    if (onConnect) {
      onConnect();
    }
  };

  const shortKey = (key: string) =>
    `${key.slice(0, 6)}...${key.slice(-4)}`;

  // Wallet not installed
  if (!walletAvailable) {
    return (
      <button
        className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg cursor-not-allowed"
        disabled
      >
        Wallet not installed
      </button>
    );
  }

  // Wallet connected
  if (walletState.isConnected && walletState.publicKey) {
    return (
      <div className="flex items-center gap-3">
        <span className="px-3 py-2 bg-green-100 text-green-800 rounded-lg font-mono text-sm">
          {shortKey(walletState.publicKey)}
        </span>
        <button
          onClick={disconnect}
          className="px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
        >
          Disconnect
        </button>
      </div>
    );
  }

  // Wallet not connected
  return (
    <button
      onClick={connect}
      disabled={loading}
      className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 transition-colors"
    >
      {loading ? 'Connecting...' : 'Connect Wallet'}
    </button>
  );
}