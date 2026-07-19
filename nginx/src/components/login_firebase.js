import React, { useEffect } from "react";
import PropTypes from "prop-types";
import Typography from "@mui/material/Typography";
import Container from "@mui/material/Container";
import CircularProgress from "@mui/material/CircularProgress";
import Box from "@mui/material/Box";

// No-auth bypass: sets a dummy token immediately so the emulator screen renders
// without requiring Firebase configuration.
export default function AutoLogin({ auth }) {
  useEffect(() => {
    auth.setToken("no-auth");
  }, [auth]);

  return (
    <Container maxWidth="xs">
      <Box mt={10} display="flex" flexDirection="column" alignItems="center">
        <CircularProgress />
        <Box mt={2}>
          <Typography variant="body1">Connecting to emulator...</Typography>
        </Box>
      </Box>
    </Container>
  );
}

AutoLogin.propTypes = {
  auth: PropTypes.object.isRequired,
};
