import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { UpdateNotice } from "./components/Updates";
import "./styles.css";

createRoot(document.getElementById("root")!).render(<StrictMode><App /><UpdateNotice /></StrictMode>);
