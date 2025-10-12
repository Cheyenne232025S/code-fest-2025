import { Routes, Route } from "react-router-dom";
import "./App.css";
import Questionaire from "./Questionaire/Questionaire";
import Map from "./Map/Map";
import About from "./About/About";

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Questionaire />} />
        <Route path="/map" element={<Map />} />
        <Route path="/about" element={<About />} />
      </Routes>
    </>
  );
}

export default App;