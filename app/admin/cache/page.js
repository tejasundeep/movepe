'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import AdminLayout from '../../components/AdminLayout';

export default function CacheManagementPage() {
  const [cacheStats, setCacheStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCacheType, setSelectedCacheType] = useState('');
  const [selectedKey, setSelectedKey] = useState('');

  // Fetch cache statistics
  const fetchCacheStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/pricing/cache');
      
      if (!response.ok) {
        throw new Error('Failed to fetch cache statistics');
      }
      
      const data = await response.json();
      setCacheStats(data.cacheStats);
    } catch (error) {
      console.error('Error fetching cache stats:', error);
      toast.error('Failed to fetch cache statistics');
    } finally {
      setLoading(false);
    }
  };

  // Clear cache
  const clearCache = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/pricing/cache', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cacheType: selectedCacheType || undefined,
          key: selectedKey || undefined,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to clear cache');
      }
      
      const data = await response.json();
      toast.success(data.message || 'Cache cleared successfully');
      
      // Refresh cache statistics
      fetchCacheStats();
    } catch (error) {
      console.error('Error clearing cache:', error);
      toast.error('Failed to clear cache');
    } finally {
      setLoading(false);
    }
  };

  // Handle cache type change
  const handleCacheTypeChange = (e) => {
    setSelectedCacheType(e.target.value);
    setSelectedKey(''); // Reset selected key when cache type changes
  };

  // Load cache statistics on component mount
  useEffect(() => {
    fetchCacheStats();
  }, []);

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Pricing Service Cache Management</h1>
        
        {loading ? (
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <>
            <div className="bg-white shadow rounded-lg p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">Cache Statistics</h2>
              
              {cacheStats ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {Object.entries(cacheStats).map(([type, stats]) => (
                    <div key={type} className="border rounded-lg p-4">
                      <h3 className="font-medium text-lg capitalize">{type} Cache</h3>
                      <p className="text-gray-600">Items: {stats.size}</p>
                      <div className="mt-2">
                        <details>
                          <summary className="cursor-pointer text-blue-500">View Keys</summary>
                          <ul className="mt-2 text-sm text-gray-600 max-h-40 overflow-y-auto">
                            {stats.keys.map((key) => (
                              <li key={key} className="truncate">{key}</li>
                            ))}
                          </ul>
                        </details>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600">No cache statistics available</p>
              )}
            </div>
            
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Clear Cache</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cache Type
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    value={selectedCacheType}
                    onChange={handleCacheTypeChange}
                  >
                    <option value="">All Caches</option>
                    {cacheStats && Object.keys(cacheStats).map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                
                {selectedCacheType && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cache Key
                    </label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      value={selectedKey}
                      onChange={(e) => setSelectedKey(e.target.value)}
                    >
                      <option value="">All Keys</option>
                      {cacheStats && cacheStats[selectedCacheType]?.keys.map((key) => (
                        <option key={key} value={key}>{key}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              
              <button
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                onClick={clearCache}
                disabled={loading}
              >
                {loading ? 'Clearing...' : 'Clear Cache'}
              </button>
            </div>
            
            <div className="mt-4">
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                onClick={fetchCacheStats}
                disabled={loading}
              >
                Refresh Statistics
              </button>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
} 