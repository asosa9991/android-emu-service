import React, { useState, useEffect } from "react";
import { TokenProviderService } from "./service/auth_service";
import EmulatorScreen from "./components/emulator_screen";
import LoginPage from "./components/login_firebase";
import { ThemeProvider, makeStyles } from "@mui/styles";
import { createTheme } from "@mui/material/styles";
import { config } from "./config";

import "./App.css";

var EMULATOR_GRPC =
  window.location.protocol + "//" + window.location.hostname + ":8080";

console.log(`Connecting to grpc at ${EMULATOR_GRPC}`);

const theme = createTheme({});
const noAuth = config.auth && config.auth.type === "none";

// Pre-authorize synchronously before any React renders to avoid the race
// condition where auth.on("authorized") isn't registered yet when setToken fires.
const auth = new TokenProviderService();
if (noAuth) {
  auth.setToken("no-auth");
}

export default function App() {
  const [authorized, setAuthorized] = useState(noAuth);

  useEffect(() => {
    const handleAuthorization = (a) => setAuthorized(a);
    auth.on("authorized", handleAuthorization);
  }, []);

  return (
    <ThemeProvider theme={theme}>
      {authorized ? (
        <EmulatorScreen uri={EMULATOR_GRPC} auth={auth} />
      ) : (
        <LoginPage auth={auth} />
      )}
    </ThemeProvider>
  );
}
