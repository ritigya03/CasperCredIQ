"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Activity, 
  RefreshCw, 
  Search, 
  Clock, 
  Shield, 
  FileText, 
  AlertCircle,
  CheckCircle,
  XCircle,
  User,
  Key,
  Filter,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface AuditEvent {
  index: number;
  eventName: string;
  eventType: string;
  data: {
    credential_id?: number;
    action?: string;
    actor?: string;
    timestamp?: number;
    timestamp_formatted?: string;
    audit_count?: number;
    holder?: string;
    issuer?: string;
    issuer_did?: string;
    holder_did?: string;
    ai_confidence?: number;
    ipfs_hash?: string;
    revoked_by?: string;
    reason?: string;
    verifier?: string;
    is_valid?: boolean;
    user?: string;
    old_level?: number;
    new_level?: number;
    changed_by?: string;
    severity?: number;
  };
  error?: string;
}

interface EventStats {
  totalEvents: number;
  byType: Record<string, number>;
  auditLogs: {
    total: number;
    byAction: Record<string, number>;
  };
  credentials: {
    issued: number;
    revoked: number;
    verified: number;
  };
}

const AuditLogs = () => {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [stats, setStats] = useState<EventStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [searchCredentialId, setSearchCredentialId] = useState('');
  const [expandedEvents, setExpandedEvents] = useState<Set<number>>(new Set());

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  // Fetch all events on mount
  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    setLoading(true);
    setError('');

    try {
      console.log('📡 Fetching audit events from:', `${API_URL}/api/audit/events`);
      
      const response = await fetch(`${API_URL}/api/audit/events`);
      const data = await response.json();

      if (data.success) {
        setEvents(data.events);
        console.log(`✅ Fetched ${data.count} events`);
      } else {
        setError(data.error || 'Failed to fetch events');
      }

      // Also fetch stats
      const statsResponse = await fetch(`${API_URL}/api/audit/stats`);
      const statsData = await statsResponse.json();
      if (statsData.success) {
        setStats(statsData.stats);
      }

    } catch (err: any) {
      console.error('Error fetching events:', err);
      setError(err.message || 'Failed to fetch audit events');
    } finally {
      setLoading(false);
    }
  };

  const fetchCredentialAudit = async () => {
    if (!searchCredentialId.trim()) {
      setError('Please enter a credential ID');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/api/audit/credential/${searchCredentialId.trim()}`);
      const data = await response.json();

      if (data.success) {
        // Transform the timeline to events format
        const credentialEvents = data.timeline.map((event: any, index: number) => ({
          index,
          eventName: event.eventType,
          eventType: `event_${event.eventType}`,
          data: event.details
        }));
        setEvents(credentialEvents);
        setFilterType('all');
      } else {
        setError(data.error || 'No events found for this credential');
      }

    } catch (err: any) {
      console.error('Error fetching credential audit:', err);
      setError(err.message || 'Failed to fetch credential audit trail');
    } finally {
      setLoading(false);
    }
  };

  const toggleEventExpand = (index: number) => {
    const newExpanded = new Set(expandedEvents);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedEvents(newExpanded);
  };

  const getEventIcon = (eventName: string) => {
    switch (eventName) {
      case 'AuditLogCreated':
        return <FileText className="w-5 h-5 text-blue-600" />;
      case 'CredentialIssued':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'CredentialRevoked':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'CredentialVerified':
        return <Shield className="w-5 h-5 text-indigo-600" />;
      case 'AccessLevelChanged':
        return <Key className="w-5 h-5 text-orange-600" />;
      case 'SuspiciousActivity':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Activity className="w-5 h-5 text-gray-600" />;
    }
  };

  const getEventColor = (eventName: string) => {
    switch (eventName) {
      case 'AuditLogCreated':
        return 'bg-blue-50 border-blue-200';
      case 'CredentialIssued':
        return 'bg-green-50 border-green-200';
      case 'CredentialRevoked':
        return 'bg-red-50 border-red-200';
      case 'CredentialVerified':
        return 'bg-indigo-50 border-indigo-200';
      case 'AccessLevelChanged':
        return 'bg-orange-50 border-orange-200';
      case 'SuspiciousActivity':
        return 'bg-red-100 border-red-300';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const formatTimestamp = (timestamp: number | undefined) => {
    if (!timestamp) return 'Unknown';
    return new Date(timestamp).toLocaleString();
  };

  const shortenAddress = (address: string | undefined) => {
    if (!address) return 'Unknown';
    if (address.length > 20) {
      return `${address.slice(0, 10)}...${address.slice(-8)}`;
    }
    return address;
  };

  const filteredEvents = events.filter(event => {
    if (filterType === 'all') return true;
    if (filterType === 'audit') return event.eventName === 'AuditLogCreated';
    if (filterType === 'credentials') return ['CredentialIssued', 'CredentialRevoked', 'CredentialVerified'].includes(event.eventName);
    if (filterType === 'security') return ['AccessLevelChanged', 'SuspiciousActivity'].includes(event.eventName);
    return event.eventName === filterType;
  });

  const eventTypes = [
    { value: 'all', label: 'All Events' },
    { value: 'audit', label: 'Audit Logs' },
    { value: 'credentials', label: 'Credential Events' },
    { value: 'security', label: 'Security Events' },
    { value: 'AuditLogCreated', label: 'AuditLogCreated' },
    { value: 'CredentialIssued', label: 'CredentialIssued' },
    { value: 'CredentialRevoked', label: 'CredentialRevoked' },
    { value: 'CredentialVerified', label: 'CredentialVerified' },
    { value: 'AccessLevelChanged', label: 'AccessLevelChanged' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="h-screen flex flex-col">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600 hover:text-gray-900"
                title="Back to Dashboard"
              >
                <ArrowLeft className="w-6 h-6" />
              </Link>
              <div className="flex items-center gap-3">
                <Activity className="w-8 h-8 text-indigo-600" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-800">
                    Audit Logs
                  </h1>
                  <p className="text-sm text-gray-600">
                    On-chain activity trail from Casper blockchain
                  </p>
                </div>
              </div>
              <button
                onClick={fetchEvents}
                disabled={loading}
                className="ml-auto flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full grid grid-cols-1 lg:grid-cols-4 gap-0">
            {/* Left Sidebar - Stats & Filters */}
            <div className="bg-white border-r overflow-y-auto p-6">
              {/* Stats Cards */}
              {stats && (
                <div className="space-y-4 mb-6">
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Statistics</h3>
                  
                  <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl p-4 border border-indigo-200">
                    <div className="text-3xl font-bold text-indigo-900">{stats.totalEvents}</div>
                    <div className="text-sm text-gray-600">Total Events</div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-green-50 rounded-lg p-3 text-center border border-green-200">
                      <div className="text-xl font-bold text-green-700">{stats.credentials.issued}</div>
                      <div className="text-xs text-gray-600">Issued</div>
                    </div>
                    <div className="bg-red-50 rounded-lg p-3 text-center border border-red-200">
                      <div className="text-xl font-bold text-red-700">{stats.credentials.revoked}</div>
                      <div className="text-xs text-gray-600">Revoked</div>
                    </div>
                    <div className="bg-indigo-50 rounded-lg p-3 text-center border border-indigo-200">
                      <div className="text-xl font-bold text-indigo-700">{stats.credentials.verified}</div>
                      <div className="text-xs text-gray-600">Verified</div>
                    </div>
                  </div>

                  {/* Event Type Breakdown */}
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Event Types</h4>
                    <div className="space-y-2">
                      {Object.entries(stats.byType).map(([type, count]) => (
                        <div key={type} className="flex justify-between text-sm">
                          <span className="text-gray-600">{type}</span>
                          <span className="text-gray-900 font-medium">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Filters */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Filters</h3>
                
                {/* Search by Credential ID */}
                <div className="space-y-2">
                  <label className="text-sm text-gray-600">Search by Credential ID</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={searchCredentialId}
                      onChange={(e) => setSearchCredentialId(e.target.value)}
                      placeholder="e.g., 0"
                      className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      onClick={fetchCredentialAudit}
                      className="p-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
                    >
                      <Search className="w-4 h-4 text-white" />
                    </button>
                  </div>
                </div>

                {/* Event Type Filter */}
                <div className="space-y-2">
                  <label className="text-sm text-gray-600">Event Type</label>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {eventTypes.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Info */}
                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mt-6">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-800 font-medium">On-Chain Data</p>
                      <p className="text-xs text-gray-600 mt-1">
                        Events are fetched directly from the Casper blockchain's __events dictionary.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Content - Events List */}
            <div className="lg:col-span-3 bg-gradient-to-br from-blue-50 to-indigo-100 overflow-y-auto p-6">
              {/* Error Display */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="text-red-800">{error}</div>
                </div>
              )}

              {/* Loading State */}
              {loading && (
                <div className="flex items-center justify-center py-20">
                  <div className="text-center">
                    <RefreshCw className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-4" />
                    <p className="text-gray-600">Fetching events from blockchain...</p>
                  </div>
                </div>
              )}

              {/* Events List */}
              {!loading && filteredEvents.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-800">
                      {filteredEvents.length} Events
                    </h2>
                    <span className="text-sm text-gray-500">
                      Showing {filterType === 'all' ? 'all events' : filterType}
                    </span>
                  </div>

                  {filteredEvents.map((event, idx) => (
                    <div
                      key={event.index}
                      className={`${getEventColor(event.eventName)} border rounded-xl overflow-hidden transition-all`}
                    >
                      {/* Event Header */}
                      <div
                        className="flex items-center gap-4 p-4 cursor-pointer hover:bg-black/5"
                        onClick={() => toggleEventExpand(event.index)}
                      >
                        <div className="flex-shrink-0">
                          {getEventIcon(event.eventName)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-800">{event.eventName}</span>
                            {event.data?.credential_id !== undefined && (
                              <span className="px-2 py-0.5 bg-gray-200 rounded text-xs font-mono">
                                Credential #{event.data.credential_id}
                              </span>
                            )}
                            {event.data?.action && (
                              <span className="px-2 py-0.5 bg-blue-200 rounded text-xs font-medium">
                                {event.data.action}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatTimestamp(event.data?.timestamp)}
                            </span>
                            {event.data?.actor && (
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {shortenAddress(event.data.actor)}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          {expandedEvents.has(event.index) ? (
                            <ChevronUp className="w-5 h-5 text-gray-500" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-gray-500" />
                          )}
                        </div>
                      </div>

                      {/* Event Details (Expanded) */}
                      {expandedEvents.has(event.index) && (
                        <div className="border-t border-gray-200 bg-white/50 p-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            {event.data && Object.entries(event.data).map(([key, value]) => (
                              <div key={key} className="flex flex-col">
                                <span className="text-gray-500 capitalize">{key.replace(/_/g, ' ')}</span>
                                <span className="font-mono text-gray-800 break-all">
                                  {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                </span>
                              </div>
                            ))}
                          </div>
                          {event.error && (
                            <div className="mt-3 p-3 bg-red-100 rounded-lg text-red-700 text-sm">
                              Error: {event.error}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Empty State */}
              {!loading && filteredEvents.length === 0 && !error && (
                <div className="flex items-center justify-center py-20">
                  <div className="text-center">
                    <Activity className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-700 mb-2">No Events Found</h3>
                    <p className="text-gray-500 max-w-md">
                      {filterType !== 'all' 
                        ? `No ${filterType} events found. Try changing the filter.`
                        : 'No events have been recorded on-chain yet.'}
                    </p>
                    <button
                      onClick={fetchEvents}
                      className="mt-6 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                    >
                      Refresh Events
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default AuditLogs;
