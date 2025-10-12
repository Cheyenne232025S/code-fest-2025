import React, { useEffect, useState, useRef } from "react";
import "./mapImage.css";
import { GoogleMap, LoadScript, Marker, OverlayView } from "@react-google-maps/api";

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
  const [infoFading, setInfoFading] = useState(false);

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
    if (!mapInstance || !centerObj) return Promise.resolve();
    return new Promise((resolve) => {
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
          // after fitBounds finishes, smoothly pan to the exact center
          window.google.maps.event.addListenerOnce(mapInstance, "idle", () => {
            const currentZoom = mapInstance.getZoom?.();
            if (currentZoom > 19) mapInstance.setZoom(19);
            // use smooth pan (helper defined below)
            smoothPanTo(mapInstance, { lat: centerObj.lat, lng: centerObj.lng }, 1000).then(resolve).catch(resolve);
          });
          return;
        }
      } catch (err) {
        console.warn("zoomToRadius failed:", err);
      }
      // fallback: just smooth pan
      smoothPanTo(mapInstance, { lat: centerObj.lat, lng: centerObj.lng }, 700).then(resolve).catch(resolve);
    });
  };

  // Smoothly pan the map from its current center to target {lat,lng} over duration(ms).
  const smoothPanTo = (mapInstance, targetLatLng, duration = 600) => {
    if (!mapInstance || !targetLatLng) return Promise.resolve();
    const target = { lat: Number(targetLatLng.lat), lng: Number(targetLatLng.lng) };
    const startCenterObj = mapInstance.getCenter?.();
    if (!startCenterObj) {
      // immediate pan if we can't read current center
      mapInstance.panTo(target);
      return Promise.resolve();
    }
    const start = { lat: startCenterObj.lat(), lng: startCenterObj.lng() };
    const deltaLat = target.lat - start.lat;
    const deltaLng = target.lng - start.lng;
    let startTime = null;
    return new Promise((resolve) => {
      const step = (ts) => {
        if (!startTime) startTime = ts;
        const elapsed = ts - startTime;
        const t = Math.min(1, elapsed / duration);
        // easeInOutQuad
        const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
        const curLat = start.lat + deltaLat * eased;
        const curLng = start.lng + deltaLng * eased;
        try {
          mapInstance.panTo({ lat: curLat, lng: curLng });
        } catch (e) {
          // if panTo fails, resolve early
          resolve();
          return;
        }
        if (t < 1) {
          requestAnimationFrame(step);
        } else {
          resolve();
        }
      };
      requestAnimationFrame(step);
    });
  };

  // ✅ Handle selecting hotels/restaurants
  const selectEntity = (entity) => {
    lastSelectRef.current = Date.now();

    if (entity?.type === "hotel") {
      setActiveHotelId(entity.hotelId);
      const newCenter = { lat: entity.lat, lng: entity.lng };
      const radius = getRadiusFromEntity(entity);
      setCircleRadius(null);
      setCircleRadius(radius);
      // animate zoom/fit then pan, then update React center state to avoid snapping
      if (mapRef.current) {
        zoomToRadius(mapRef.current, newCenter, radius).then(() => {
          setCenter(newCenter);
        }).catch(() => {
          setCenter(newCenter);
        });
      } else {
        setCenter(newCenter);
      }
      // show hotel info
      setInfoFading(false);
      setSelected(entity);
    } else {
      // restaurants or other entities: do NOT pan or change center — just show the popup
      setInfoFading(false);
      setSelected(entity);
    }
  };

  // ✅ Clear info window when clicking outside
  useEffect(() => {
    const onDocClick = (e) => {
      // NOTE: the info window element uses the class "custom-info-window"
      if (e.target.closest(".custom-info-window")) return;
      if (Date.now() - lastSelectRef.current < 250) return;
      if (selected) setSelected(null);
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [selected]);

  // Listen for selections emitted by the sidebar
  useEffect(() => {
    const handler = (e) => {
      const payload = e?.detail;
      if (!payload) return;
      // Normalize lat/lng if possible
      const lat = Number(payload.lat ?? payload.latitude);
      const lng = Number(payload.lng ?? payload.lon ?? payload.longitude);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        selectEntity({ ...payload, lat, lng });
        return;
      }
      // If lat/lng not provided but hotelId exists, try to find it in current hotels
      if (payload.hotelId) {
        const h = hotels.find((x) => x.id === payload.hotelId);
        if (h) {
          selectEntity({ ...h, type: payload.type ?? "hotel" });
        }
      }
    };
    window.addEventListener("selectMapEntity", handler);
    return () => window.removeEventListener("selectMapEntity", handler);
  }, [hotels]);

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

          {/* Custom Info Window with OverlayView */}
          {selected && (
            <OverlayView
              // Force re-render when position changes so the overlay recalculates placement
              key={`ov-${Number(selected.lat)}-${Number(selected.lng)}-${selected.type}-${selected.hotelId ?? ""}`}
              // Use a google.maps.LatLng when available (more robust), otherwise a literal
              position={
                window.google && window.google.maps && window.google.maps.LatLng
                  ? new window.google.maps.LatLng(Number(selected.lat), Number(selected.lng))
                  : { lat: Number(selected.lat), lng: Number(selected.lng) }
              }
              mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
              // Let CSS handle centering/anchoring; avoid relying on width/height params
              getPixelPositionOffset={() => ({ x: 0, y: 0 })}
            >
              <div
                className={`custom-info-window ${infoFading ? "fade-out" : ""}`}
                style={{
                  background: "white",
                  padding: "12px",
                  borderRadius: "8px",
                  boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
                  minWidth: "200px",
                  maxWidth: "280px",
                  // Make the element's top-left be the map pixel, then translate
                  // so the bottom-center aligns to that pixel and shift up 10px:
                  position: "absolute",
                  left: 0,
                  top: 0,
                  transform: "translate(-50%, calc(-100% - 10px))",
                  color: "black",
                  willChange: "transform",
                }}
                // prevent clicks inside the window from bubbling and closing it
                onClick={(e) => e.stopPropagation()}
              >
                {/* Custom Close Button */}
                <button
                  onClick={(e) => {
                    // prevent bubbling to the document click handler
                    e.stopPropagation();
                    setSelected(null);
                  }}
                  style={{
                    position: "absolute",
                    top: "8px",
                    right: "8px",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    padding: "0",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "24px",
                    height: "24px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "18px",
                      lineHeight: 1,
                      color: "black",
                      fontWeight: "bold",
                    }}
                  >
                    ×
                  </span>
                </button>

                {/* Content */}
                <div style={{ paddingTop: "10px", paddingRight: "20px" }}>
                  {selected.type === "hotel" ? (
                    <>
                      <h4 style={{ color: "black", marginTop: 0 }}>
                        🏨 {selected.name}
                      </h4>
                      {selected.address && (
                        <div style={{ color: "black" }}>{selected.address}</div>
                      )}
                      {selected.score && (
                        <div style={{ color: "black" }}>
                          Score: {Number(selected.score).toFixed(3)}
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <h4 style={{ color: "black", marginTop: 0 }}>
                        🍴 {selected.name}
                      </h4>
                      {selected.rating && (
                        <div style={{ color: "black" }}>
                          Rating: {selected.rating}★
                        </div>
                      )}
                      {selected.price && (
                        <div style={{ color: "black" }}>Price: {selected.price}</div>
                      )}
                      {selected.distance_m && (
                        <div style={{ color: "black" }}>
                          Distance:{" "}
                          {(Number(selected.distance_m) / 1600).toFixed(2)} miles
                        </div>
                      )}
                      {selected.cuisines && (
                        <div style={{ color: "black" }}>
                          Cuisine:{" "}
                          {(() => {
                            const capitalize = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
                            if (Array.isArray(selected.cuisines)) {
                              return selected.cuisines
                                .map((c) => capitalize(String(c).replace(/_/g, "/")))
                                .join(", ");
                            }
                            return String(selected.cuisines)
                              .split(",")
                              .map((c) => c.trim().replace(/_/g, "/"))
                              .map(capitalize)
                              .join(", ");
                          })()}
                        </div>
                      )}
                      {selected.url && (
                        <div style={{ marginTop: 6 }}>
                          <a
                            href={selected.url}
                            target="_blank"
                            rel="noreferrer"
                            style={{ color: "#0066cc" }}
                          >
                            View on Yelp
                          </a>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Triangle pointer at bottom */}
                <div
                  style={{
                    position: "absolute",
                    bottom: "-10px",
                    left: "50%",
                    marginLeft: "-10px",
                    borderLeft: "10px solid transparent",
                    borderRight: "10px solid transparent",
                    borderTop: "10px solid white",
                  }}
                />
              </div>
            </OverlayView>
          )}
        </GoogleMap>
      </div>
    </LoadScript>
  );
}
