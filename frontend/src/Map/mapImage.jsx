import React, { useEffect, useState, useRef } from "react";
import "./mapImage.css";
import { GoogleMap, LoadScript, Marker, InfoWindow, Circle } from "@react-google-maps/api";

const apiKey = "AIzaSyB7Zae46biejYBCoiiTiFkBlt47JPqve4o";

const DEFAULT_COORDS = { lat: 37.4221, lng: -122.0841, address: "Default location (approx)" };

export default function MapImage() {
  const [hotels, setHotels] = useState([]); // array of normalized hotel objects
  const [selected, setSelected] = useState(null); // { type: "hotel"|"restaurant", hotelId?, lat, lng, ... }
  const lastSelectRef = useRef(0);

  // NEW: ref to hold the Google Map instance so we can pan/zoom programmatically
  const mapRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [localError, setLocalError] = useState(null);
  const [center, setCenter] = useState(DEFAULT_COORDS);

  // NEW: circle radius state (meters)
  const [circleRadius, setCircleRadius] = useState(1000);

  // parse restaurants JSON stored as strings in the backend payload
  const parseRestaurants = (raw) => {
    if (!raw) return [];
    try {
      if (typeof raw === "string") return JSON.parse(raw);
      if (Array.isArray(raw)) return raw;
      return [];
    } catch (e) {
      console.warn("Failed to parse restaurants JSON:", e);
      return [];
    }
  };

  useEffect(() => {
    let cancelled = false;
    const fetchResults = async () => {
      setLoading(true);
      setLocalError(null);
      try {
        const res = await fetch("http://localhost:8000/results/");
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const json = await res.json();
        if (cancelled) return;

        if (json.status === "no_data") {
          setLocalError("No survey results yet. Submit the survey to populate the map.");
          setHotels([]);
          setCenter(DEFAULT_COORDS);
          setLoading(false);
          return;
        }

        const recs = json.recommendations?.top_hotels;
        if (!recs) {
          setLocalError("No recommendations found in results.");
          setHotels([]);
          setCenter(DEFAULT_COORDS);
          setLoading(false);
          return;
        }

        const hotelIds = Object.keys(recs.hotel_name ?? {});
        const normalized = hotelIds.map((id) => {
          const lat = Number(recs.lat?.[id]);
          const lon = Number(recs.lon?.[id]);
          return {
            id,
            name: recs.hotel_name?.[id] ?? "Unnamed",
            score: recs.score?.[id],
            brand: recs.brand?.[id],
            neighborhood: recs.neighborhood?.[id],
            address: recs.address?.[id],
            lat: Number.isFinite(lat) ? lat : DEFAULT_COORDS.lat,
            lng: Number.isFinite(lon) ? lon : DEFAULT_COORDS.lng,
            restaurants: parseRestaurants(recs.top_restaurants?.[id]),
          };
        });

        setHotels(normalized);
        if (normalized.length) {
          const first = { lat: normalized[0].lat, lng: normalized[0].lng };
          setCenter(first);

          // keep panTo for immediate center update if mapRef.current loaded
          if (mapRef.current && typeof mapRef.current.panTo === "function") {
            mapRef.current.panTo(first);
            try { mapRef.current.setZoom && mapRef.current.setZoom(14); } catch (e) { /* ignore */ }
          }
        } else {
          setCenter(DEFAULT_COORDS);
        }
      } catch (err) {
        console.error("Failed to fetch /results/:", err);
        setLocalError(err.message || String(err));
        setHotels([]);
        setCenter(DEFAULT_COORDS);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchResults();
    return () => {
      cancelled = true;
    };
  }, []);

  // NEW: fit the map bounds to include all hotels but keep the first hotel as the center
  const fitMapToHotels = (mapInstance = mapRef.current, hotelList = hotels) => {
    if (!mapInstance || !hotelList || hotelList.length === 0) return;
    if (!window.google || !window.google.maps) return;

    try {
      const first = hotelList[0];
      if (!first || typeof first.lat !== "number" || typeof first.lng !== "number") {
        // fallback to simple bounds if first hotel invalid
        const bounds = new window.google.maps.LatLngBounds();
        hotelList.forEach((h) => {
          if (typeof h.lat === "number" && typeof h.lng === "number") {
            bounds.extend({ lat: h.lat, lng: h.lng });
          }
        });
        mapInstance.fitBounds(bounds);
        window.google.maps.event.addListenerOnce(mapInstance, "idle", () => {
          const currentZoom = mapInstance.getZoom && mapInstance.getZoom();
          const MAX_ZOOM = 16;
          if (typeof currentZoom === "number" && currentZoom > MAX_ZOOM) {
            mapInstance.setZoom(MAX_ZOOM);
          }
        });
        return;
      }

      // If geometry library is available, build symmetric bounds around the first hotel.
      if (window.google.maps.geometry && window.google.maps.geometry.spherical) {
        const centerLatLng = new window.google.maps.LatLng(first.lat, first.lng);
        let maxDist = 0;
        hotelList.forEach((h) => {
          if (typeof h.lat === "number" && typeof h.lng === "number") {
            const ll = new window.google.maps.LatLng(h.lat, h.lng);
            const d = window.google.maps.geometry.spherical.computeDistanceBetween(centerLatLng, ll);
            if (d > maxDist) maxDist = d;
          }
        });

        // Ensure a minimum radius so map doesn't zoom too far in when single point
        const radius = Math.max(maxDist, 200); // meters

        // Create four offset points (N, E, S, W) so the bounds are symmetric around the first hotel
        const bearings = [0, 90, 180, 270];
        const bounds = new window.google.maps.LatLngBounds();
        bounds.extend(centerLatLng); // include center itself
        bearings.forEach((b) => {
          const pt = window.google.maps.geometry.spherical.computeOffset(centerLatLng, radius, b);
          bounds.extend(pt);
        });

        mapInstance.fitBounds(bounds);

        // After fitBounds, clamp zoom to a max so it doesn't zoom in too far
        window.google.maps.event.addListenerOnce(mapInstance, "idle", () => {
          const currentZoom = mapInstance.getZoom && mapInstance.getZoom();
          const MAX_ZOOM = 16;
          if (typeof currentZoom === "number" && currentZoom > MAX_ZOOM) {
            mapInstance.setZoom(MAX_ZOOM);
          }
          // Re-center explicitly on the first hotel (fitBounds above keeps zoom to include offsets,
          // but fitBounds may slightly shift center — enforce exact center on the first hotel).
          try { mapInstance.panTo({ lat: first.lat, lng: first.lng }); } catch (e) { /* ignore */ }
        });
      } else {
        // Fallback: simple extend bounds over all hotels (previous behavior)
        const bounds = new window.google.maps.LatLngBounds();
        hotelList.forEach((h) => {
          if (typeof h.lat === "number" && typeof h.lng === "number") {
            bounds.extend({ lat: h.lat, lng: h.lng });
          }
        });
        mapInstance.fitBounds(bounds);
        window.google.maps.event.addListenerOnce(mapInstance, "idle", () => {
          const currentZoom = mapInstance.getZoom && mapInstance.getZoom();
          const MAX_ZOOM = 16;
          if (typeof currentZoom === "number" && currentZoom > MAX_ZOOM) {
            mapInstance.setZoom(MAX_ZOOM);
          }
        });
      }
    } catch (err) {
      console.warn("Failed to fit map to hotels:", err);
    }
  };

  // NEW: when hotels change and map is ready, fit bounds so all hotels are visible
  useEffect(() => {
    if (hotels.length && mapRef.current) {
      fitMapToHotels();
    }
  }, [hotels]);

  // NEW: infer a radius in meters from a hotel object (tries common field names)
  const getRadiusFromEntity = (h) => {
    if (!h || typeof h !== "object") return 1000;
    const tryNum = (v) => {
      if (v == null) return null;
      const n = Number(v);
      return Number.isFinite(n) && n > 0 ? n : null;
    };

    // Prefer explicit meter fields
    const meterKeys = ["preferred_distance_m", "preferred_distanceMeters", "distance_m", "distanceMeters", "radius_m", "radiusMeters"];
    for (const k of meterKeys) {
      const v = tryNum(h[k]);
      if (v) return v;
    }

    // Try km fields
    const kmKeys = ["preferred_distance_km", "distance_km", "radius_km", "preferred_km"];
    for (const k of kmKeys) {
      const v = tryNum(h[k]);
      if (v) return v * 1000;
    }

    // Generic fallbacks: plain "preferred_distance", "distance", "radius"
    const general = ["preferred_distance", "distance", "radius"];
    for (const k of general) {
      const v = tryNum(h[k]);
      if (v) {
        // Heuristic: if small (< 50) treat as km, else meters
        return v <= 50 ? v * 1000 : v;
      }
    }

    // Try scanning keys for "km" or "m" substrings
    for (const k of Object.keys(h)) {
      const val = tryNum(h[k]);
      if (!val) continue;
      const lk = k.toLowerCase();
      if (lk.includes("km")) return val * 1000;
      if (lk.includes("m") && !lk.includes("mm")) return val;
    }

    return 1000;
  };

  // NEW: zoom the map to include a circle of radiusMeters around centerObj
  const zoomToRadius = (mapInstance, centerObj, radiusMeters) => {
    if (!mapInstance || !centerObj) return;
    try {
      if (window.google && window.google.maps && window.google.maps.geometry && window.google.maps.geometry.spherical) {
        const centerLatLng = new window.google.maps.LatLng(centerObj.lat, centerObj.lng);
        const bearings = [0, 90, 180, 270];
        const bounds = new window.google.maps.LatLngBounds();
        bounds.extend(centerLatLng);
        bearings.forEach((b) => {
          const pt = window.google.maps.geometry.spherical.computeOffset(centerLatLng, radiusMeters, b);
          bounds.extend(pt);
        });
        mapInstance.fitBounds(bounds);
        window.google.maps.event.addListenerOnce(mapInstance, "idle", () => {
          const currentZoom = mapInstance.getZoom && mapInstance.getZoom();
          const MAX_ZOOM = 19;
          if (typeof currentZoom === "number" && currentZoom > MAX_ZOOM) {
            mapInstance.setZoom(MAX_ZOOM);
          }
          try { mapInstance.panTo({ lat: centerObj.lat, lng: centerObj.lng }); } catch (e) { /* ignore */ }
        });
      } else {
        // Fallback: estimate zoom from radius (rough heuristic)
        // Larger radius -> smaller zoom. This formula is a simple heuristic.
        const zoom = Math.max(5, Math.min(19, Math.round(15 - Math.log2(Math.max(1, radiusMeters) / 1000))));
        try {
          mapInstance.panTo({ lat: centerObj.lat, lng: centerObj.lng });
          mapInstance.setZoom && mapInstance.setZoom(zoom);
        } catch (e) { /* ignore */ }
      }
    } catch (err) {
      console.warn("zoomToRadius failed:", err);
    }
  };

  // select entity helper (hotel or restaurant)
  const selectEntity = (entity) => {
    lastSelectRef.current = Date.now();
    // when selecting a hotel, update center, circle radius and zoom accordingly
    if (entity && entity.type === "hotel") {
      const newCenter = { lat: entity.lat, lng: entity.lng };
      setCenter(newCenter);
      const radius = getRadiusFromEntity(entity);
      setCircleRadius(radius);
      // apply immediate pan/zoom if map is ready
      if (mapRef.current) {
        try {
          zoomToRadius(mapRef.current, newCenter, radius);
        } catch (e) { /* ignore */ }
      }
    }
    setSelected(entity);
  };

  // close popup when clicking outside; ignore immediate clicks after marker selection
  useEffect(() => {
    const onDocClick = (e) => {
      if (e.target && e.target.closest && e.target.closest(".info-window")) return;
      if (Date.now() - lastSelectRef.current < 250) return;
      if (selected) setSelected(null);
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [selected]);

  if (loading) {
    return (
      <div className="map-wrapper">
        <div className="loading-message">
          <p>Loading map and recommendations…</p>
          {localError && <p className="error">{localError}</p>}
          <button
            onClick={() => {
              setCenter(DEFAULT_COORDS);
              setHotels([]);
              setLoading(false);
            }}
          >
            Use default location
          </button>
        </div>
      </div>
    );
  }

  return (
    <LoadScript googleMapsApiKey={apiKey} libraries={["geometry"]}>
      <div className="map-wrapper">
        <GoogleMap
          // NEW: capture the map instance when it loads and fit bounds if hotels already exist
          onLoad={(map) => {
            mapRef.current = map;
            // ensure map recenters if center was set before load
            if (center && map && typeof map.panTo === "function") {
              map.panTo(center);
              try { map.setZoom && map.setZoom(14); } catch (e) { /* ignore */ }
            }
            if (hotels.length) {
              // fit all hotels into view on initial load
              fitMapToHotels(map, hotels);
            }
          }}
          mapContainerStyle={{ width: "100%", height: "100%" }}
          center={center}
          zoom={14}
          onClick={() => {
            if (Date.now() - lastSelectRef.current < 250) return;
            setSelected(null);
          }}
        >
          {/* Hotel markers */}
          {hotels.map((h) => (
            <Marker
              key={h.id}
              position={{ lat: h.lat, lng: h.lng }}
              onClick={() =>
                selectEntity({
                  type: "hotel",
                  hotelId: h.id,
                  lat: h.lat,
                  lng: h.lng,
                  ...h,
                })
              }
              label={{ text: "🏨", fontSize: "14px" }}
            />
          ))}

          {/* If a hotel is selected, show its restaurants as markers */}
          {selected && selected.type === "hotel" && (selected.restaurants || []).map((r, idx) => {
            const rLat = Number(r.lat ?? r.latitude ?? r.latitude) || null;
            const rLng = Number(r.lon ?? r.lng ?? r.longitude) || null;
            // if restaurant lacks coords, skip marker
            if (rLat == null || rLng == null) return null;
            return (
              <Marker
                key={`r-${selected.hotelId}-${idx}`}
                position={{ lat: rLat, lng: rLng }}
                onClick={() =>
                  selectEntity({
                    type: "restaurant",
                    hotelId: selected.hotelId,
                    lat: rLat,
                    lng: rLng,
                    ...r,
                  })
                }
                label={{ text: "🍴", fontSize: "12px" }}
              />
            );
          })}

          {/* Circle around center (optional) */}
          <Circle
            center={center}
            radius={circleRadius}
            options={{ fillColor: "blue", fillOpacity: 0.001, strokeColor: "blue" }}
          />

          {/* InfoWindow */}
          {selected && (
            <InfoWindow
              position={{ lat: selected.lat, lng: selected.lng }}
              onCloseClick={() => setSelected(null)}
            >
              <div className="info-window" style={{ maxWidth: 280 }}>
                {selected.type === "hotel" ? (
                  <>
                    <h4>🏨 {selected.name}</h4>
                    <div style={{ fontSize: 13, color: "#444" }}>
                      {selected.brand ? <div>{selected.brand}</div> : null}
                      {selected.neighborhood ? <div>{selected.neighborhood}</div> : null}
                      {selected.address ? <div style={{ marginTop: 6 }}>{selected.address}</div> : null}
                      {typeof selected.score !== "undefined" ? (
                        <div style={{ marginTop: 6 }}>Score: {Number(selected.score).toFixed(3)}</div>
                      ) : null}
                      <div style={{ marginTop: 8 }}>
                        <button
                          className="btn btn-outline"
                          onClick={() =>
                            setSelected((s) =>
                              s && s.type === "hotel" ? { ...s } : s
                            )
                          }
                        >
                          Show {selected.restaurants?.length ?? 0} restaurants
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <h4>🍴 {selected.name}</h4>
                    <div style={{ fontSize: 13, color: "#444" }}>
                      {selected.rating ? <div>Rating: {selected.rating}★</div> : null}
                      {selected.price ? <div>Price: {selected.price}</div> : null}
                      {selected.distance_m ? <div>Distance: {Math.round(selected.distance_m)} m</div> : null}
                      {selected.cuisines ? <div>{Array.isArray(selected.cuisines) ? selected.cuisines.join(", ") : selected.cuisines}</div> : null}
                      {selected.url ? (
                        <div style={{ marginTop: 6 }}>
                          <a href={selected.url} target="_blank" rel="noreferrer">View on Yelp</a>
                        </div>
                      ) : null}
                    </div>
                  </>
                )}
              </div>
            </InfoWindow>
          )}
        </GoogleMap>
      </div>
    </LoadScript>
  );
}
