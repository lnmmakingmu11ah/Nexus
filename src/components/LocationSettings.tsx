import React, { useState } from 'react';
import { ExternalLink, LocateFixed, MapPin, Navigation, ShieldCheck, X } from 'lucide-react';
import { UserConfig } from '../types';

interface LocationSettingsProps {
  userConfig: UserConfig;
  onUpdateUserConfig: (updated: UserConfig) => void;
}

const ACTIVITY_SEARCHES = [
  { label: 'Quiet place to read', query: 'quiet cafe library bookstore' },
  { label: 'Walk reset', query: 'park walking trail' },
  { label: 'Gym nearby', query: 'gym fitness center' },
  { label: 'Calm spot', query: 'meditation garden peaceful place' },
  { label: 'Something fun today', query: 'things to do today' },
];

function mapsSearchUrl(query: string, label?: string, coordinates?: UserConfig['coordinates']): string {
  const near = label?.trim() || (coordinates ? `${coordinates.latitude},${coordinates.longitude}` : '');
  const fullQuery = near ? `${query} near ${near}` : query;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullQuery)}`;
}

export const LocationSettings: React.FC<LocationSettingsProps> = ({ userConfig, onUpdateUserConfig }) => {
  const [label, setLabel] = useState(userConfig.locationLabel || '');
  const [status, setStatus] = useState<string>('');

  const saveManualLocation = () => {
    const cleanLabel = label.trim();
    onUpdateUserConfig({
      ...userConfig,
      locationOptIn: !!cleanLabel || !!userConfig.coordinates,
      locationLabel: cleanLabel || undefined,
    });
    setStatus(cleanLabel ? 'Saved. NEXUS can use this as local context now.' : 'Location label cleared.');
  };

  const useDeviceLocation = () => {
    if (!navigator.geolocation) {
      setStatus('This browser does not support device location.');
      return;
    }

    setStatus('Asking browser for location permission...');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        onUpdateUserConfig({
          ...userConfig,
          locationOptIn: true,
          locationLabel: label.trim() || userConfig.locationLabel,
          coordinates: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          },
        });
        setStatus('Device location saved. Use a city label too if you want NEXUS to sound more local.');
      },
      () => {
        setStatus('Location permission was blocked or unavailable. Manual city still works.');
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 1000 * 60 * 30 }
    );
  };

  const clearLocation = () => {
    setLabel('');
    onUpdateUserConfig({
      ...userConfig,
      locationOptIn: false,
      locationLabel: undefined,
      countryCode: undefined,
      coordinates: undefined,
    });
    setStatus('Local context turned off.');
  };

  const hasLocation = !!userConfig.locationOptIn && (!!userConfig.locationLabel || !!userConfig.coordinates);

  return (
    <div className="rounded-2xl border border-cyan-500/25 bg-zinc-950/85 p-4 space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 flex items-center justify-center shrink-0">
          <MapPin className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-white">Local NEXUS & Maps</h3>
          <p className="text-xs text-zinc-400 mt-1">
            Optional location context lets NEXUS suggest nearby activities and open Google Maps searches.
          </p>
        </div>
        {hasLocation && (
          <span className="text-[10px] font-mono uppercase text-emerald-300 bg-emerald-500/10 border border-emerald-500/25 rounded-lg px-2 py-1">
            On
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="City, country e.g. Nairobi, Kenya"
          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500/60"
        />
        <button
          type="button"
          onClick={saveManualLocation}
          className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold"
        >
          <ShieldCheck className="w-4 h-4" />
          Save
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={useDeviceLocation}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 hover:text-white hover:border-cyan-500/40"
        >
          <LocateFixed className="w-4 h-4 text-cyan-300" />
          Use Device Location
        </button>
        <a
          href={mapsSearchUrl('things to do today', userConfig.locationLabel, userConfig.coordinates)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 hover:text-white hover:border-cyan-500/40"
        >
          <Navigation className="w-4 h-4 text-emerald-300" />
          Open Maps
        </a>
        {hasLocation && (
          <button
            type="button"
            onClick={clearLocation}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/25 text-xs text-red-200 hover:text-white"
          >
            <X className="w-4 h-4" />
            Turn Off
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {ACTIVITY_SEARCHES.map((activity) => (
          <a
            key={activity.label}
            href={mapsSearchUrl(activity.query, userConfig.locationLabel, userConfig.coordinates)}
            target="_blank"
            rel="noreferrer"
            className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-3 hover:border-cyan-500/35 transition-colors group"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-zinc-200 group-hover:text-white">{activity.label}</span>
              <ExternalLink className="w-3.5 h-3.5 text-zinc-500 group-hover:text-cyan-300" />
            </div>
            <p className="text-[11px] text-zinc-500 mt-1">Searches Google Maps near your saved location.</p>
          </a>
        ))}
      </div>

      {status && <p className="text-[11px] text-cyan-200/85">{status}</p>}
    </div>
  );
};
