import withStyles from "@mui/styles/withStyles";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Copyright from "./copyright";
import { Emulator } from "android-emulator-webrtc/emulator";
import LogcatView from "./logcat_view";
import ExitToApp from "@mui/icons-material/ExitToApp";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import ImageIcon from "@mui/icons-material/Image";
import OndemandVideoIcon from "@mui/icons-material/OndemandVideo";
import PropTypes from "prop-types";
import React from "react";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";

const EMU_WIDTH = 400;
const EMU_HEIGHT = 700;

const styles = (theme) => ({
  root: { flexGrow: 1 },
  title: { flexGrow: 1 },
  emuContainer: {
    width: EMU_WIDTH,
    height: EMU_HEIGHT,
    // Force all child divs, video, and canvas to fill the container.
    // Needed because android-emulator-webrtc's event_handler renders a wrapper
    // div with display:inline-block and no explicit height.
    "& > div": { width: "100% !important", height: "100% !important" },
    "& video": { width: "100% !important", height: "100% !important" },
    "& canvas": { width: "100% !important", height: "100% !important" },
  },
});

class EmulatorScreen extends React.Component {
  state = {
    view: "webrtc",
    emuState: "connecting",
    muted: true,
    gps: { latitude: 37.4221, longitude: -122.0841 },
  };

  static propTypes = {
    uri: PropTypes.string,
    auth: PropTypes.object,
  };

  stateChange = (s) => this.setState({ emuState: s });
  onError = (err) => console.error("gRPC error:", err);

  render() {
    const { uri, auth, classes } = this.props;
    const { view, emuState, muted, gps } = this.state;

    return (
      <div className={classes.root}>
        <AppBar position="static">
          <Toolbar>
            <Typography variant="h6" className={classes.title}>
              Android Emulator — {view} — {emuState}
            </Typography>
            <IconButton
              color="inherit"
              onClick={() => this.setState({ view: "webrtc" })}
              size="large"
              title="WebRTC view"
            >
              <OndemandVideoIcon />
            </IconButton>
            <IconButton
              color="inherit"
              onClick={() => this.setState({ view: "png" })}
              size="large"
              title="PNG view"
            >
              <ImageIcon />
            </IconButton>
            <IconButton
              color="inherit"
              onClick={() => auth.logout()}
              size="large"
              title="Logout"
            >
              <ExitToApp />
            </IconButton>
          </Toolbar>
        </AppBar>

        <Box p={2} display="flex" gap={2}>
          <div className={classes.emuContainer}>
            <Emulator
              uri={uri}
              auth={auth}
              view={view}
              onStateChange={this.stateChange}
              onError={this.onError}
              muted={muted}
              volume={0}
              gps={gps}
              width={EMU_WIDTH}
              height={EMU_HEIGHT}
            />
          </div>

          <Box flex={1} minWidth={300} maxWidth={500}>
            <LogcatView uri={uri} auth={auth} />
          </Box>
        </Box>

        <Box mt={4}>
          <Copyright />
        </Box>
      </div>
    );
  }
}

export default withStyles(styles)(EmulatorScreen);
