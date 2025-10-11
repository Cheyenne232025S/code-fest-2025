import React, { useEffect, useState, useRef } from "react";
import "./mapImage.css";
import { GoogleMap, LoadScript, Marker, InfoWindow, Circle } from "@react-google-maps/api";

const apiKey = "AIzaSyB7Zae46biejYBCoiiTiFkBlt47JPqve4o"; 

// Fallback coordinates (Googleplex) used when geocoding times out or fails
const DEFAULT_COORDS = { lat: 37.4221, lng: -122.0841, address: "Default location (approx)" };

// simple fetch with timeout helper
const fetchWithTimeout = (url, options = {}, timeout = 8000) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Fetch timeout")), timeout);
    fetch(url, options)
      .then((res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });

//Customize data later
export default function MapImage() {
  const [hotelLocation, setHotelLocation] = useState(null);
  const [restaurants, setRestaurants] = useState([]);
  const [selected, setSelected] = useState(null);
  const lastSelectRef = useRef(0); // timestamp of last selection to avoid immediate close by document click

  const hotelAddress = "1600 Amphitheatre Parkway, Mountain View, CA";
  const radius = 1000; // meters
  const restaurantAddresses = [
    { address: "1 Infinite Loop, Cupertino, CA", customRating: 4.5, menu: "Italian" },
    { address: "500 Terry Francois Blvd, San Francisco, CA", customRating: 4.2, menu: "Seafood" }
  ];

  // Helper to geocode an address
  const geocodeAddress = async (address) => {
    try {
      const res = await fetchWithTimeout(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`,
        {},
        8000
      );
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        const { lat, lng } = data.results[0].geometry.location;
        return { lat, lng, address };
      }
      // no results — fall back
      console.warn("Geocode returned no results for", address);
      return { lat: DEFAULT_COORDS.lat, lng: DEFAULT_COORDS.lng, address: `${address} (approx)` };
    } catch (err) {
      console.error("Geocode failed for", address, err);
      // return fallback so UI can proceed
      return { lat: DEFAULT_COORDS.lat, lng: DEFAULT_COORDS.lng, address: `${address} (approx)` };
    }
  };

  useEffect(() => {
    const fetchLocations = async () => {
      const hotelGeo = await geocodeAddress(hotelAddress);
      setHotelLocation(hotelGeo || DEFAULT_COORDS);

      const restGeo = await Promise.all(restaurantAddresses.map(r => geocodeAddress(r.address)));
      setRestaurants(restGeo.filter(Boolean).map((r, i) => ({ ...r, ...restaurantAddresses[i] })));
    };
    fetchLocations();
  }, []);

  // helper to select an entity (marker) and record selection time so the global click handler can ignore the immediate click
  const selectEntity = (entity) => {
    lastSelectRef.current = Date.now();
    setSelected(entity);
  };

  // close popup when clicking outside the popup; ignore clicks that occur immediately after selecting a marker
  useEffect(() => {
    const onDocClick = (e) => {
      // if click is inside the InfoWindow content, don't close
      if (e.target && e.target.closest && e.target.closest(".info-window")) return;
      if (Date.now() - lastSelectRef.current < 250) return; // ignore immediate click after selection
      if (selected) setSelected(null);
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [selected]);

  // show a more helpful loading UI with option to use default coordinates if geocoding stalls
  const [localError, setLocalError] = React.useState(null);

  if (!hotelLocation) {
    return (
      <div className="map-wrapper">
        <div className="loading-message">
          <p>Loading map... (geocoding addresses)</p>
          {localError && <p className="error">{localError}</p>}
          <button
            onClick={() => {
              setHotelLocation(DEFAULT_COORDS);
              setRestaurants([]);
            }}
          >
            Use default location
          </button>
        </div>
      </div>
    );
  }

  return (
    <LoadScript googleMapsApiKey={apiKey}>
      {/* wrapper positioned to fill the viewport area not used by header/sidebar */}
      <div className="map-wrapper">
        <GoogleMap
          mapContainerStyle={{ width: "100%", height: "100%" }}
          center={hotelLocation}
          zoom={14}
          onClick={() => {
            if (Date.now() - lastSelectRef.current < 250) return;
            setSelected(null);
          }}
        >
          {/* Hotel marker */}
          <Marker
            position={hotelLocation}
            onClick={() => selectEntity({ ...hotelLocation, type: "hotel" })}
            label="🏨"
          />

          {/* Circle around hotel */}
          <Circle
            center={hotelLocation}
            radius={radius}
            options={{ fillColor: "blue", fillOpacity: 0.1, strokeColor: "blue" }}
          />

          {/* Restaurant markers */}
          {restaurants.map((loc, idx) => (
            <Marker
              key={idx}
              position={{ lat: loc.lat, lng: loc.lng }}
              onClick={() => selectEntity({ ...loc, type: "restaurant" })}
              label="🍴"
            />
          ))}

          {/* InfoWindow */}
          {selected && (
            <InfoWindow
              position={{ lat: selected.lat, lng: selected.lng }}
              onCloseClick={() => setSelected(null)}
            >
              <div className="info-window">
                {selected.type === "hotel" ? (
                  <>
                    <h4>🏨 Hotel</h4>
                    <p>{selected.address}</p>
                  </>
                ) : (
                  <>
                    <h4>🍴 Restaurant</h4>
                    {selected.customRating && <p><strong>Rating:</strong> {selected.customRating}</p>}
                    {selected.menu && <p><strong>Menu:</strong> {selected.menu}</p>}
                    <p>{selected.address}</p>
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
