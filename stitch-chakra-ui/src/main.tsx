import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ChakraProvider, ColorModeScript } from "@chakra-ui/react";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import SmartTenderApp from "./SmartTenderApp";
import stitchTheme from "./theme/stitchTheme";

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ChakraProvider theme={stitchTheme}>
      <ColorModeScript initialColorMode={stitchTheme.config.initialColorMode} />
      <BrowserRouter>
        <SmartTenderApp />
      </BrowserRouter>
    </ChakraProvider>
  </StrictMode>,
)
