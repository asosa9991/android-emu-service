import withStyles from "@mui/styles/withStyles";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Copyright from "./copyright";
import { Emulator } from "android-emulator-webrtc/emulator";
import LogcatView from "./logcat_view";
import ExitToApp from "@mui/icons-material/ExitToApp";
import IconButton from "@mui/material/IconButton";
import ImageIcon from "@mui/icons-material/Image";
import OndemandVideoIcon from "@mui/icons-material/OndemandVideo";
import PropTypes from "prop-types";
import React from "react";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";

const EMU_WIDTH = 400;
const EMU_HEIGHT = 700;

const styles = () => ({
  root: { flexGrow: 1 },
  title: { flexGrow: 1 },
  emuWrapper: {
    position: "relative",
    width: EMU_WIDTH,
    height: EMU_HEIGHT,
    flexShrink: 0,
  },
  emuContainer: {
    width: "100%",
    height: "100%",
    "& > div": { width: "100% !important", height: "100% !important" },
    "& video": { width: "100% !important", height: "100% !important" },
    "& canvas": { width: "100% !important", height: "100% !important" },
  },
  dropOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.65)",
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    borderRadius: 4,
    gap: 12,
    zIndex: 10,
    // allow drag events to fall through to the wrapper beneath
    pointerEvents: "none",
  },
  dropIcon: { fontSize: 56, lineHeight: 1 },
  statusBar: {
    padding: "6px 14px",
    borderRadius: 4,
    fontSize: 13,
    fontWeight: "normal",
    maxWidth: EMU_WIDTH - 32,
    wordBreak: "break-all",
    textAlign: "center",
  },
});

class EmulatorScreen extends React.Component {
  state = {
    view: "webrtc",
    emuState: "connecting",
    muted: true,
    gps: { latitude: 37.4221, longitude: -122.0841 },
    // drag-and-drop
    dragDepth: 0,       // counter to handle enter/leave on children without flicker
    dragIsApk: false,
    uploadStatus: null, // null | { type: "progress"|"success"|"error", message }
  };

  static propTypes = {
    uri: PropTypes.string,
    auth: PropTypes.object,
  };

  stateChange = (s) => this.setState({ emuState: s });
  onError = (err) => console.error("gRPC error:", err);

  // ── drag handlers ────────────────────────────────────────────────────────────

  onDragEnter = (e) => {
    e.preventDefault();
    const isApk = [...(e.dataTransfer.items || [])].some(
      (item) =>
        item.kind === "file" &&
        item.type === "application/vnd.android.package-archive"
    );
    this.setState((prev) => ({ dragDepth: prev.dragDepth + 1, dragIsApk: isApk }));
  };

  onDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  onDragLeave = (e) => {
    e.preventDefault();
    this.setState((prev) => ({ dragDepth: Math.max(0, prev.dragDepth - 1) }));
  };

  onDrop = (e) => {
    e.preventDefault();
    this.setState({ dragDepth: 0 });
    const file = e.dataTransfer.files[0];
    if (!file) return;
    const isApk = file.name.toLowerCase().endsWith(".apk");
    this._upload(file, isApk ? "/api/install" : "/api/upload");
  };

  _upload(file, endpoint) {
    const isInstall = endpoint === "/api/install";
    this.setState({
      uploadStatus: {
        type: "progress",
        message: isInstall
          ? `Installing ${file.name}…`
          : `Uploading ${file.name} to /sdcard/Download/…`,
      },
    });

    const form = new FormData();
    form.append("file", file);

    fetch(endpoint, { method: "POST", body: form })
      .then((r) => r.json())
      .then((data) => {
        if (!data.ok) throw new Error(data.error || "Unknown error");
        this.setState({
          uploadStatus: {
            type: "success",
            message: isInstall ? `Installed ${file.name}` : `Saved to ${data.path}`,
          },
        });
      })
      .catch((err) => {
        this.setState({ uploadStatus: { type: "error", message: err.message } });
      })
      .finally(() => {
        setTimeout(() => this.setState({ uploadStatus: null }), 5000);
      });
  }

  // ── render ───────────────────────────────────────────────────────────────────

  render() {
    const { uri, auth, classes } = this.props;
    const { view, emuState, muted, gps, dragDepth, dragIsApk, uploadStatus } = this.state;

    const isDragging = dragDepth > 0;
    const statusBg =
      uploadStatus?.type === "success" ? "rgba(46,125,50,0.9)" :
      uploadStatus?.type === "error"   ? "rgba(183,28,28,0.9)" :
                                          "rgba(30,30,30,0.85)";

    return (
      <div className={classes.root}>
        <AppBar position="static">
          <Toolbar>
            <Typography variant="h6" className={classes.title}>
              Android Emulator — {view} — {emuState}
            </Typography>
            <IconButton color="inherit" onClick={() => this.setState({ view: "webrtc" })} size="large" title="WebRTC view">
              <OndemandVideoIcon />
            </IconButton>
            <IconButton color="inherit" onClick={() => this.setState({ view: "png" })} size="large" title="PNG view">
              <ImageIcon />
            </IconButton>
            <IconButton color="inherit" onClick={() => auth.logout()} size="large" title="Logout">
              <ExitToApp />
            </IconButton>
          </Toolbar>
        </AppBar>

        <Box p={2} display="flex" gap={2}>
          {/* Outer wrapper owns the drag events and anchors the overlay */}
          <div
            className={classes.emuWrapper}
            onDragEnter={this.onDragEnter}
            onDragOver={this.onDragOver}
            onDragLeave={this.onDragLeave}
            onDrop={this.onDrop}
          >
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

            {(isDragging || uploadStatus) && (
              <div className={classes.dropOverlay}>
                {isDragging ? (
                  <>
                    <div className={classes.dropIcon}>{dragIsApk ? "📦" : "📁"}</div>
                    <div>{dragIsApk ? "Drop to Install APK" : "Drop to Upload to /sdcard/Download/"}</div>
                  </>
                ) : (
                  <div className={classes.statusBar} style={{ backgroundColor: statusBg }}>
                    {uploadStatus.type === "progress" && "⏳ "}
                    {uploadStatus.type === "success"  && "✓ "}
                    {uploadStatus.type === "error"    && "✗ "}
                    {uploadStatus.message}
                  </div>
                )}
              </div>
            )}
          </div>

          <Box flex={1} minWidth={300} maxWidth={500}>
            <LogcatView uri={uri} auth={auth} />
          </Box>
        </Box>

        <Box mt={4}><Copyright /></Box>
      </div>
    );
  }
}

export default withStyles(styles)(EmulatorScreen);
