import React from "react";
import PropTypes from "prop-types";
import withStyles from "@mui/styles/withStyles";
import { Emulator } from "android-emulator-webrtc/emulator";
import LogcatView from "./logcat_view";
import OndemandVideoIcon from "@mui/icons-material/OndemandVideo";
import ImageIcon from "@mui/icons-material/Image";
import LogoutIcon from "@mui/icons-material/Logout";
import Tooltip from "@mui/material/Tooltip";
import Copyright from "./copyright";

const EMU_WIDTH = 390;
const EMU_HEIGHT = 720;

const styles = () => ({
  "@global": {
    "*, *::before, *::after": { boxSizing: "border-box" },
    body: { margin: 0, background: "#0c0c10" },
    "@import": "url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap')",
  },

  root: {
    minHeight: "100vh",
    background: "#0c0c10",
    fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
    display: "flex",
    flexDirection: "column",
  },

  // ── top bar ────────────────────────────────────────────────────────────────
  topbar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 24px",
    height: 56,
    background: "rgba(22,22,30,0.85)",
    backdropFilter: "blur(16px)",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    position: "sticky",
    top: 0,
    zIndex: 100,
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  brandDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "#6366f1",
    boxShadow: "0 0 8px #6366f1",
    flexShrink: 0,
  },
  brandName: {
    fontSize: 15,
    fontWeight: 600,
    color: "#e2e2e8",
    letterSpacing: "-0.01em",
  },

  statusPill: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    padding: "4px 12px",
    borderRadius: 20,
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.08)",
    fontSize: 12,
    fontWeight: 500,
    color: "#8b8ba0",
    letterSpacing: "0.01em",
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: "50%",
    flexShrink: 0,
  },

  toolbar: {
    display: "flex",
    alignItems: "center",
    gap: 4,
  },
  iconBtn: {
    width: 34,
    height: 34,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    border: "none",
    background: "transparent",
    color: "#8b8ba0",
    cursor: "pointer",
    transition: "background 0.15s, color 0.15s",
    "&:hover": {
      background: "rgba(255,255,255,0.08)",
      color: "#e2e2e8",
    },
  },
  iconBtnActive: {
    background: "rgba(99,102,241,0.15)",
    color: "#818cf8",
    "&:hover": {
      background: "rgba(99,102,241,0.22)",
      color: "#818cf8",
    },
  },
  divider: {
    width: 1,
    height: 20,
    background: "rgba(255,255,255,0.08)",
    margin: "0 4px",
  },

  // ── main content ───────────────────────────────────────────────────────────
  content: {
    flex: 1,
    display: "flex",
    gap: 20,
    padding: 24,
    alignItems: "flex-start",
  },

  // ── device panel ──────────────────────────────────────────────────────────
  devicePanel: {
    flexShrink: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 16,
  },
  deviceFrame: {
    position: "relative",
    width: EMU_WIDTH + 24,
    borderRadius: 40,
    background: "linear-gradient(145deg, #1e1e2a 0%, #16161e 100%)",
    boxShadow: "0 0 0 1px rgba(255,255,255,0.08), 0 24px 64px rgba(0,0,0,0.6), 0 4px 16px rgba(0,0,0,0.4)",
    padding: "24px 12px 20px",
  },
  deviceNotch: {
    width: 120,
    height: 6,
    borderRadius: 3,
    background: "rgba(255,255,255,0.12)",
    margin: "0 auto 16px",
  },
  emuWrapper: {
    position: "relative",
    width: EMU_WIDTH,
    height: EMU_HEIGHT,
    borderRadius: 28,
    overflow: "hidden",
    background: "#000",
  },
  emuContainer: {
    width: "100%",
    height: "100%",
    "& > div": { width: "100% !important", height: "100% !important" },
    "& video": { width: "100% !important", height: "100% !important" },
    "& canvas": { width: "100% !important", height: "100% !important" },
  },
  deviceHome: {
    width: 48,
    height: 4,
    borderRadius: 2,
    background: "rgba(255,255,255,0.15)",
    margin: "14px auto 0",
  },

  // ── drag overlay ──────────────────────────────────────────────────────────
  dropOverlay: {
    position: "absolute",
    inset: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(10,10,16,0.75)",
    backdropFilter: "blur(8px)",
    borderRadius: 28,
    gap: 12,
    zIndex: 10,
    pointerEvents: "none",
  },
  dropIcon: {
    fontSize: 48,
    lineHeight: 1,
  },
  dropLabel: {
    fontSize: 15,
    fontWeight: 600,
    color: "#e2e2e8",
    letterSpacing: "-0.01em",
  },
  dropSub: {
    fontSize: 12,
    color: "#8b8ba0",
    marginTop: -6,
  },
  toastBar: {
    position: "absolute",
    bottom: 16,
    left: "50%",
    transform: "translateX(-50%)",
    whiteSpace: "nowrap",
    padding: "8px 16px",
    borderRadius: 20,
    fontSize: 13,
    fontWeight: 500,
    color: "#e2e2e8",
    zIndex: 20,
    pointerEvents: "none",
    backdropFilter: "blur(12px)",
    border: "1px solid rgba(255,255,255,0.08)",
  },

  // ── logcat panel ──────────────────────────────────────────────────────────
  logcatPanel: {
    flex: 1,
    minWidth: 280,
    maxWidth: 520,
    height: EMU_HEIGHT + 48 + 60, // match device frame height
    display: "flex",
    flexDirection: "column",
    background: "#16161e",
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.06)",
    overflow: "hidden",
  },
  logcatHeader: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "12px 16px",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    fontSize: 12,
    fontWeight: 600,
    color: "#8b8ba0",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    flexShrink: 0,
  },
  logcatDot: {
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: "#22c55e",
    boxShadow: "0 0 6px #22c55e",
    flexShrink: 0,
  },
  logcatBody: {
    flex: 1,
    overflow: "hidden",
    "& > *": { height: "100% !important" },
  },

  footer: {
    padding: "16px 24px",
    borderTop: "1px solid rgba(255,255,255,0.05)",
    fontSize: 11,
    color: "#4a4a5a",
    textAlign: "center",
  },
});

// Helper: status dot color
function dotColor(state) {
  if (state === "connected") return "#22c55e";
  if (state === "disconnected" || state === "error") return "#ef4444";
  return "#f59e0b"; // connecting / transitioning
}

class EmulatorScreen extends React.Component {
  state = {
    view: "webrtc",
    emuState: "connecting",
    muted: true,
    gps: { latitude: 37.4221, longitude: -122.0841 },
    dragDepth: 0,
    dragIsApk: false,
    uploadStatus: null,
  };

  static propTypes = {
    uri: PropTypes.string,
    auth: PropTypes.object,
  };

  stateChange = (s) => this.setState({ emuState: s });
  onError = (err) => console.error("gRPC error:", err);

  onDragEnter = (e) => {
    e.preventDefault();
    const isApk = [...(e.dataTransfer.items || [])].some(
      (item) => item.kind === "file" && item.type === "application/vnd.android.package-archive"
    );
    this.setState((prev) => ({ dragDepth: prev.dragDepth + 1, dragIsApk: isApk }));
  };
  onDragOver = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; };
  onDragLeave = (e) => {
    e.preventDefault();
    this.setState((prev) => ({ dragDepth: Math.max(0, prev.dragDepth - 1) }));
  };
  onDrop = (e) => {
    e.preventDefault();
    this.setState({ dragDepth: 0 });
    const file = e.dataTransfer.files[0];
    if (!file) return;
    this._upload(file, file.name.toLowerCase().endsWith(".apk") ? "/api/install" : "/api/upload");
  };

  _upload(file, endpoint) {
    const isInstall = endpoint === "/api/install";
    this.setState({
      uploadStatus: {
        type: "progress",
        message: isInstall ? `Installing ${file.name}…` : `Uploading ${file.name}…`,
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

  render() {
    const { uri, auth, classes } = this.props;
    const { view, emuState, muted, gps, dragDepth, dragIsApk, uploadStatus } = this.state;
    const isDragging = dragDepth > 0;

    const toastBg =
      uploadStatus?.type === "success" ? "rgba(20,83,45,0.9)" :
      uploadStatus?.type === "error"   ? "rgba(127,29,29,0.9)" :
                                          "rgba(22,22,30,0.92)";

    return (
      <div className={classes.root}>
        {/* ── top bar ─────────────────────────────────────────────────────── */}
        <header className={classes.topbar}>
          <div className={classes.brand}>
            <div className={classes.brandDot} />
            <span className={classes.brandName}>Android Emulator</span>
          </div>

          <div className={classes.statusPill}>
            <div className={classes.statusDot} style={{ background: dotColor(emuState), boxShadow: `0 0 6px ${dotColor(emuState)}` }} />
            {emuState}
          </div>

          <div className={classes.toolbar}>
            <Tooltip title="WebRTC view" placement="bottom">
              <button
                className={`${classes.iconBtn} ${view === "webrtc" ? classes.iconBtnActive : ""}`}
                onClick={() => this.setState({ view: "webrtc" })}
              >
                <OndemandVideoIcon style={{ fontSize: 18 }} />
              </button>
            </Tooltip>
            <Tooltip title="Screenshot view" placement="bottom">
              <button
                className={`${classes.iconBtn} ${view === "png" ? classes.iconBtnActive : ""}`}
                onClick={() => this.setState({ view: "png" })}
              >
                <ImageIcon style={{ fontSize: 18 }} />
              </button>
            </Tooltip>
            <div className={classes.divider} />
            <Tooltip title="Sign out" placement="bottom">
              <button className={classes.iconBtn} onClick={() => auth.logout()}>
                <LogoutIcon style={{ fontSize: 18 }} />
              </button>
            </Tooltip>
          </div>
        </header>

        {/* ── main content ─────────────────────────────────────────────────── */}
        <div className={classes.content}>
          {/* Device */}
          <div className={classes.devicePanel}>
            <div className={classes.deviceFrame}>
              <div className={classes.deviceNotch} />
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
                        <div className={classes.dropLabel}>
                          {dragIsApk ? "Drop to install APK" : "Drop to upload file"}
                        </div>
                        <div className={classes.dropSub}>
                          {dragIsApk ? "adb install -r" : "→ /sdcard/Download/"}
                        </div>
                      </>
                    ) : (
                      <div
                        className={classes.toastBar}
                        style={{ backgroundColor: toastBg }}
                      >
                        {uploadStatus.type === "progress" && "⏳  "}
                        {uploadStatus.type === "success"  && "✓  "}
                        {uploadStatus.type === "error"    && "✗  "}
                        {uploadStatus.message}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className={classes.deviceHome} />
            </div>
          </div>

          {/* Logcat */}
          <div className={classes.logcatPanel}>
            <div className={classes.logcatHeader}>
              <div className={classes.logcatDot} />
              Logcat
            </div>
            <div className={classes.logcatBody}>
              <LogcatView uri={uri} auth={auth} />
            </div>
          </div>
        </div>

        <div className={classes.footer}>
          <Copyright />
        </div>
      </div>
    );
  }
}

export default withStyles(styles)(EmulatorScreen);
