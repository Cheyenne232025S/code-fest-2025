import React, { useEffect, useState, useRef } from "react";
import "./mapImage.css";
import { GoogleMap, LoadScript, Marker, InfoWindow } from "@react-google-maps/api";

const apiKey = "AIzaSyB7Zae46biejYBCoiiTiFkBlt47JPqve4o";
const DEFAULT_COORDS = { lat: 37.4221, lng: -122.0841, address: "Default location (approx)" };

export default function MapImage() {
  const [hotels, setHotels] = useState([]);
  const [selected, setSelected] = useState(null);
  const [activeHotelId, setActiveHotelId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [localError, setLocalError] = useState(null);
  const [center, setCenter] = useState(DEFAULT_COORDS);
  const [circleRadius, setCircleRadius] = useState(null);

  const mapRef = useRef(null);
  const lastSelectRef = useRef(0);
  const circleRef = useRef(null); // ✅ new ref to manage one circle

  const parseRestaurants = (raw) => {
    if (!raw) return [];
    try {
      if (typeof raw === "string") return JSON.parse(raw);
      if (Array.isArray(raw)) return raw;
      return [];
    } catch {
      return [];
    }
  };

  useEffect(() => {
    let cancelled = false;
    const fetchResults = async () => {
      setLoading(true);
      try {
        const res = await fetch("http://localhost:8000/results/");
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const json = await res.json();
        if (cancelled) return;

        const recs = json.recommendations?.top_hotels;
        if (!recs) {
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
          if (mapRef.current?.panTo) {
            mapRef.current.panTo(first);
            mapRef.current.setZoom?.(14);
          }
        }
      } catch (err) {
        console.error(err);
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

  const getRadiusFromEntity = (h) => {
    if (!h) return 1000;
    const v = Number(h.preferred_radius_m || h.radius_m || h.distance_m);
    return Number.isFinite(v) && v > 0 ? v : 1000;
  };

  const zoomToRadius = (mapInstance, centerObj, radiusMeters) => {
    if (!mapInstance || !centerObj) return;
    try {
      if (window.google?.maps?.geometry?.spherical) {
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
          const currentZoom = mapInstance.getZoom?.();
          if (currentZoom > 19) mapInstance.setZoom(19);
          mapInstance.panTo(centerObj);
        });
      }
    } catch (err) {
      console.warn("zoomToRadius failed:", err);
    }
  };

  // ✅ Handle selecting hotels/restaurants
  const selectEntity = (entity) => {
    lastSelectRef.current = Date.now();

    if (entity?.type === "hotel") {
      setActiveHotelId(entity.hotelId);
      const newCenter = { lat: entity.lat, lng: entity.lng };
      setCenter(newCenter);
      const radius = getRadiusFromEntity(entity);
      setCircleRadius(null);
      setCircleRadius(radius);
      mapRef.current && zoomToRadius(mapRef.current, newCenter, radius);
    }

    setSelected(entity);
  };

  // ✅ Clear info window when clicking outside
  useEffect(() => {
    const onDocClick = (e) => {
      if (e.target.closest(".info-window")) return;
      if (Date.now() - lastSelectRef.current < 250) return;
      if (selected) setSelected(null);
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [selected]);

  // ✅ Always exactly one circle on the map
  useEffect(() => {
    if (!mapRef.current) return;

    // Remove old circle
    if (circleRef.current) {
      circleRef.current.setMap(null);
      circleRef.current = null;
    }

    // Add new one for active hotel
    if (activeHotelId) {
      const activeHotel = hotels.find((h) => h.id === activeHotelId);
      if (activeHotel && circleRadius) {
        circleRef.current = new window.google.maps.Circle({
          map: mapRef.current,
          center: { lat: activeHotel.lat, lng: activeHotel.lng },
          radius: circleRadius,
          fillColor: "#0000FF",
          fillOpacity: 0, // Changed from 0.05 to 0 to make the inner part transparent
          strokeColor: "#0000FF",
          strokeOpacity: 0.7,
          strokeWeight: 1.5,
        });
      }
    }
  }, [activeHotelId, circleRadius, hotels]);

  if (loading) {
    return (
      <div className="map-wrapper">
        <div className="loading-message">
          <p>Loading map…</p>
          {localError && <p className="error">{localError}</p>}
        </div>
      </div>
    );
  }

  const activeHotel = hotels.find((h) => h.id === activeHotelId);

  return (
    <LoadScript googleMapsApiKey={apiKey} libraries={["geometry"]}>
      <div className="map-wrapper">
        <GoogleMap
          onLoad={(map) => {
            mapRef.current = map;
            if (center && map.panTo) {
              map.panTo(center);
              map.setZoom?.(14);
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
          {/* 🏨 Hotel markers */}
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
              label={{ text: "🏨", fontSize: "14px", color: "black" }}
            />
          ))}

          {/* 🍴 Restaurants for active hotel */}
          {activeHotel?.restaurants?.map((r, idx) => {
            const rLat = Number(r.lat ?? r.latitude);
            const rLng = Number(r.lng ?? r.lon ?? r.longitude);
            if (!Number.isFinite(rLat) || !Number.isFinite(rLng)) return null;
            return (
              <Marker
                key={`r-${activeHotel.id}-${idx}`}
                position={{ lat: rLat, lng: rLng }}
                onClick={() =>
                  selectEntity({
                    type: "restaurant",
                    hotelId: activeHotel.id,
                    lat: rLat,
                    lng: rLng,
                    ...r,
                  })
                }
                label={{ text: "🍴", fontSize: "12px", color: "black" }}
              />
            );
          })}

          {/* ℹ️ Info Window */}
          {selected && (
            <InfoWindow
              position={{ lat: selected.lat, lng: selected.lng }}
              onCloseClick={() => setSelected(null)}
            >
              <div className="info-window" style={{ maxWidth: 280 }}>
                {selected.type === "hotel" ? (
                  <>
                    <h4>🏨 {selected.name}</h4>
                    {selected.address && <div>{selected.address}</div>}
                    {selected.score && <div>Score: {Number(selected.score).toFixed(3)}</div>}
                    <div style={{ marginTop: 8 }}>
                      <button className="btn btn-outline">
                        Show {selected.restaurants?.length ?? 0} restaurants
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <h4>🍴 {selected.name}</h4>
                    {selected.rating && <div>Rating: {selected.rating}★</div>}
                    {selected.price && <div>Price: {selected.price}</div>}
                    {selected.distance_m && <div>Distance: {Math.round(selected.distance_m)} m</div>}
                    {selected.cuisines && (
                      <div>
                        {Array.isArray(selected.cuisines)
                          ? selected.cuisines.join(", ")
                          : selected.cuisines}
                      </div>
                    )}
                    {selected.url && (
                      <div style={{ marginTop: 6 }}>
                        <a href={selected.url} target="_blank" rel="noreferrer">
                          View on Yelp
                        </a>
                      </div>
                    )}
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
