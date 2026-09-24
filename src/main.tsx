import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { Root } from "./Root.tsx";
import "./global.css";

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <Root />
    </StrictMode>,
);
