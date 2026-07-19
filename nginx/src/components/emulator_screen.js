import React from "react";
import PropTypes from "prop-types";
import withStyles from "@mui/styles/withStyles";
import { Emulator } from "android-emulator-webrtc/emulator";
import LogcatView from "./logcat_view";
import OndemandVideoIcon from "@mui/icons-material/OndemandVideo";
import ImageIcon from "@mui/icons-material/Image";
import LogoutIcon from "@mui/icons-material/Logout";
import TerminalIcon from "@mui/icons-material/Terminal";
import Tooltip from "@mui/material/Tooltip";
import Copyright from "./copyright";

const EMU_WIDTH = 390;
const EMU_HEIGHT = 720;
const LOGCAT_HEIGHT = 280;

// Phone frame bezels — screen is pinned absolutely inside the frame
const BEZEL_TOP = 48;    // top bezel (notch area)
const BEZEL_BOTTOM = 22; // bottom bezel (home indicator)
const BEZEL_SIDE = 12;   // left/right bezel
const FRAME_WIDTH = EMU_WIDTH + BEZEL_SIDE * 2;
const FRAME_HEIGHT = BEZEL_TOP + EMU_HEIGHT + BEZEL_BOTTOM;

const styles = () => ({
  root: {
    minHeight: "100vh",
    background: "#f4f4f8",
    fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
    display: "flex",
    flexDirection: "column",
  },

  // ── topbar ─────────────────────────────────────────────────────────────────
  topbar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 24px",
    height: 56,
    background: "rgba(255,255,255,0.85)",
    backdropFilter: "blur(16px)",
    borderBottom: "1px solid rgba(0,0,0,0.07)",
    position: "sticky",
    top: 0,
    zIndex: 100,
  },
  brand: { display: "flex", alignItems: "center", gap: 10 },
  brandDot: {
    width: 8, height: 8, borderRadius: "50%",
    background: "#6366f1", boxShadow: "0 0 8px rgba(99,102,241,0.5)", flexShrink: 0,
  },
  brandName: { fontSize: 15, fontWeight: 600, color: "#1a1a24", letterSpacing: "-0.01em" },

  statusPill: {
    display: "flex", alignItems: "center", gap: 7,
    padding: "4px 12px", borderRadius: 20,
    background: "rgba(0,0,0,0.04)",
    border: "1px solid rgba(0,0,0,0.08)",
    fontSize: 12, fontWeight: 500, color: "#6b6b80", letterSpacing: "0.01em",
  },
  statusDot: { width: 6, height: 6, borderRadius: "50%", flexShrink: 0 },

  toolbar: { display: "flex", alignItems: "center", gap: 4 },
  iconBtn: {
    width: 34, height: 34,
    display: "flex", alignItems: "center", justifyContent: "center",
    borderRadius: 8, border: "none",
    background: "transparent", color: "#6b6b80",
    cursor: "pointer", transition: "background 0.15s, color 0.15s",
    "&:hover": { background: "rgba(0,0,0,0.06)", color: "#1a1a24" },
  },
  iconBtnActive: {
    background: "rgba(99,102,241,0.1)", color: "#6366f1",
    "&:hover": { background: "rgba(99,102,241,0.15)", color: "#6366f1" },
  },
  divider: { width: 1, height: 20, background: "rgba(0,0,0,0.1)", margin: "0 4px" },

  // ── main content ───────────────────────────────────────────────────────────
  content: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "32px 24px",
    gap: 20,
  },

  // ── device frame ───────────────────────────────────────────────────────────
  // The screen (emuWrapper) is absolutely positioned inside the frame so
  // bezel decoration and video content are always perfectly aligned.
  deviceFrame: {
    position: "relative",
    width: FRAME_WIDTH,
    height: FRAME_HEIGHT,
    borderRadius: 44,
    background: "linear-gradient(160deg, #2a2a35 0%, #1a1a22 100%)",
    boxShadow: [
      "0 0 0 1px rgba(255,255,255,0.06)",
      "0 4px 12px rgba(0,0,0,0.2)",
      "0 16px 48px rgba(0,0,0,0.25)",
      "0 32px 80px rgba(0,0,0,0.15)",
    ].join(", "),
    flexShrink: 0,
  },
  deviceNotch: {
    position: "absolute",
    top: 18,
    left: "50%",
    transform: "translateX(-50%)",
    width: 100, height: 6, borderRadius: 3,
    background: "rgba(255,255,255,0.12)",
  },
  // The screen area — pinned to exact pixel coordinates within the frame
  emuWrapper: {
    position: "absolute",
    top: BEZEL_TOP,
    left: BEZEL_SIDE,
    width: EMU_WIDTH,
    height: EMU_HEIGHT,
    borderRadius: 20,
    overflow: "hidden",
    background: "#000",
  },
  emuContainer: {
    width: "100%", height: "100%",
    "& > div": { width: "100% !important", height: "100% !important" },
    "& video": { width: "100% !important", height: "100% !important" },
    "& canvas": { width: "100% !important", height: "100% !important" },
  },
  deviceHome: {
    position: "absolute",
    bottom: 8,
    left: "50%",
    transform: "translateX(-50%)",
    width: 44, height: 4, borderRadius: 2,
    background: "rgba(255,255,255,0.18)",
  },

  // ── drag overlay ───────────────────────────────────────────────────────────
  dropOverlay: {
    position: "absolute", inset: 0,
    display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center",
    background: "rgba(10,10,16,0.72)", backdropFilter: "blur(8px)",
    borderRadius: 28, gap: 10, zIndex: 10, pointerEvents: "none",
  },
  dropIcon: { fontSize: 44, lineHeight: 1 },
  dropLabel: { fontSize: 15, fontWeight: 600, color: "#fff", letterSpacing: "-0.01em" },
  dropSub: { fontSize: 12, color: "rgba(255,255,255,0.55)", marginTop: -4 },
  toastBar: {
    position: "absolute", bottom: 14, left: "50%", transform: "translateX(-50%)",
    whiteSpace: "nowrap", padding: "7px 16px", borderRadius: 20,
    fontSize: 12, fontWeight: 500, color: "#fff", zIndex: 20,
    pointerEvents: "none", backdropFilter: "blur(12px)",
    border: "1px solid rgba(255,255,255,0.15)",
  },

  // ── logcat panel ───────────────────────────────────────────────────────────
  logcatPanel: {
    width: FRAME_WIDTH,
    height: LOGCAT_HEIGHT,
    background: "#fff",
    borderRadius: 16,
    border: "1px solid rgba(0,0,0,0.08)",
    boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  logcatHeader: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "10px 14px",
    borderBottom: "1px solid rgba(0,0,0,0.06)",
    flexShrink: 0,
  },
  logcatTitle: {
    display: "flex", alignItems: "center", gap: 7,
    fontSize: 11, fontWeight: 600, color: "#6b6b80",
    letterSpacing: "0.07em", textTransform: "uppercase",
  },
  logcatLiveDot: {
    width: 6, height: 6, borderRadius: "50%",
    background: "#22c55e", boxShadow: "0 0 5px #22c55e",
  },
  logcatClear: {
    fontSize: 11, fontWeight: 500, color: "#9090a8",
    background: "none", border: "none", cursor: "pointer", padding: "2px 6px",
    borderRadius: 4, "&:hover": { color: "#6366f1", background: "rgba(99,102,241,0.08)" },
  },
  logcatBody: { flex: 1, overflow: "hidden" },

  footer: {
    padding: "16px 24px",
    borderTop: "1px solid rgba(0,0,0,0.06)",
    fontSize: 11, color: "#b0b0c0", textAlign: "center",
  },
});

function dotColor(state) {
  if (state === "connected") return "#22c55e";
  if (state === "disconnected" || state === "error") return "#ef4444";
  return "#f59e0b";
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
    showLogcat: false,
    logcatKey: 0, // increment to reset/clear logcat
  };

  static propTypes = { uri: PropTypes.string, auth: PropTypes.object };

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
    this.setState({ uploadStatus: { type: "progress", message: isInstall ? `Installing ${file.name}…` : `Uploading ${file.name}…` } });
    const form = new FormData();
    form.append("file", file);
    fetch(endpoint, { method: "POST", body: form })
      .then((r) => r.json())
      .then((data) => {
        if (!data.ok) throw new Error(data.error || "Unknown error");
        this.setState({ uploadStatus: { type: "success", message: isInstall ? `Installed ${file.name}` : `Saved to ${data.path}` } });
      })
      .catch((err) => { this.setState({ uploadStatus: { type: "error", message: err.message } }); })
      .finally(() => { setTimeout(() => this.setState({ uploadStatus: null }), 5000); });
  }

  toggleLogcat = () => {
    this.setState((prev) => ({ showLogcat: !prev.showLogcat }));
  };

  clearLogcat = () => {
    this.setState((prev) => ({ logcatKey: prev.logcatKey + 1 }));
  };

  render() {
    const { uri, auth, classes } = this.props;
    const { view, emuState, muted, gps, dragDepth, dragIsApk, uploadStatus, showLogcat, logcatKey } = this.state;
    const isDragging = dragDepth > 0;

    const toastBg =
      uploadStatus?.type === "success" ? "rgba(20,83,45,0.88)" :
      uploadStatus?.type === "error"   ? "rgba(127,29,29,0.88)" :
                                          "rgba(30,30,40,0.88)";

    return (
      <div className={classes.root}>
        {/* topbar */}
        <header className={classes.topbar}>
          <div className={classes.brand}>
            <div className={classes.brandDot} />
            <span className={classes.brandName}>Android Emulator</span>
          </div>

          <div className={classes.statusPill}>
            <div className={classes.statusDot} style={{ background: dotColor(emuState), boxShadow: `0 0 5px ${dotColor(emuState)}` }} />
            {emuState}
          </div>

          <div className={classes.toolbar}>
            <Tooltip title="WebRTC view" placement="bottom">
              <button className={`${classes.iconBtn} ${view === "webrtc" ? classes.iconBtnActive : ""}`} onClick={() => this.setState({ view: "webrtc" })}>
                <OndemandVideoIcon style={{ fontSize: 18 }} />
              </button>
            </Tooltip>
            <Tooltip title="Screenshot view" placement="bottom">
              <button className={`${classes.iconBtn} ${view === "png" ? classes.iconBtnActive : ""}`} onClick={() => this.setState({ view: "png" })}>
                <ImageIcon style={{ fontSize: 18 }} />
              </button>
            </Tooltip>
            <Tooltip title={showLogcat ? "Hide logcat" : "Show logcat"} placement="bottom">
              <button className={`${classes.iconBtn} ${showLogcat ? classes.iconBtnActive : ""}`} onClick={this.toggleLogcat}>
                <TerminalIcon style={{ fontSize: 18 }} />
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

        {/* main */}
        <div className={classes.content}>
          {/* device */}
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
                  uri={uri} auth={auth} view={view}
                  onStateChange={this.stateChange} onError={this.onError}
                  muted={muted} volume={0} gps={gps}
                  width={EMU_WIDTH} height={EMU_HEIGHT}
                />
              </div>

              {(isDragging || uploadStatus) && (
                <div className={classes.dropOverlay}>
                  {isDragging ? (
                    <>
                      <div className={classes.dropIcon}>{dragIsApk ? "📦" : "📁"}</div>
                      <div className={classes.dropLabel}>{dragIsApk ? "Drop to install APK" : "Drop to upload file"}</div>
                      <div className={classes.dropSub}>{dragIsApk ? "adb install -r" : "→ /sdcard/Download/"}</div>
                    </>
                  ) : (
                    <div className={classes.toastBar} style={{ backgroundColor: toastBg }}>
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

          {/* logcat — only mounted when visible, so stream only runs when open */}
          {showLogcat && (
            <div className={classes.logcatPanel}>
              <div className={classes.logcatHeader}>
                <div className={classes.logcatTitle}>
                  <div className={classes.logcatLiveDot} />
                  Logcat
                </div>
                <button className={classes.logcatClear} onClick={this.clearLogcat}>
                  Clear
                </button>
              </div>
              <div className={classes.logcatBody}>
                <LogcatView key={logcatKey} uri={uri} auth={auth} />
              </div>
            </div>
          )}
        </div>

        <div className={classes.footer}><Copyright /></div>
      </div>
    );
  }
}

export default withStyles(styles)(EmulatorScreen);
