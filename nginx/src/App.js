import React, { useState, useEffect } from "react";
import { TokenProviderService } from "./service/auth_service";
import EmulatorScreen from "./components/emulator_screen";
import LoginPage from "./components/login_firebase";
import { ThemeProvider } from "@mui/styles";
import { createTheme } from "@mui/material/styles";
import { config } from "./config";
import "./App.css";

var EMULATOR_GRPC =
  window.location.protocol + "//" + window.location.hostname + ":8080";

const theme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#6366f1" },
    background: { default: "#0c0c10", paper: "#16161e" },
    text: { primary: "#e2e2e8", secondary: "#8b8ba0" },
  },
  typography: {
    fontFamily: '"Inter", "SF Pro Display", system-ui, -apple-system, sans-serif',
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { backgroundColor: "#0c0c10", margin: 0 },
      },
    },
  },
});

const noAuth = config.auth && config.auth.type === "none";
const auth = new TokenProviderService();
if (noAuth) { auth.setToken("no-auth"); }

export default function App() {
  const [authorized, setAuthorized] = useState(noAuth);
  useEffect(() => { auth.on("authorized", (a) => setAuthorized(a)); }, []);
  return (
    <ThemeProvider theme={theme}>
      {authorized
        ? <EmulatorScreen uri={EMULATOR_GRPC} auth={auth} />
        : <LoginPage auth={auth} />}
    </ThemeProvider>
  );
}
