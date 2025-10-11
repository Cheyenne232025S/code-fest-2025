import { Routes, Route } from "react-router-dom";
import "./App.css";
import Questionaire from "./Questionaire/Questionaire";
import Map from "./Map/Map";

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Questionaire />} />
        <Route path="/map" element={<Map />} />
      </Routes>
    </>
  );
}

export default App;