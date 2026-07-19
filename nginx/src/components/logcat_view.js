import React, { Component, createRef } from "react";
import PropTypes from "prop-types";
import { Logcat } from "android-emulator-webrtc/emulator";

/**
 * On-demand logcat viewer. Starts streaming when mounted, stops when unmounted.
 * Mount/unmount this component to control when streaming is active.
 */
export default class LogcatView extends Component {
  state = { lines: [] };

  static propTypes = {
    uri: PropTypes.string,
    auth: PropTypes.object,
    maxLines: PropTypes.number,
  };

  static defaultProps = { maxLines: 500 };

  constructor(props) {
    super(props);
    this.buffer = "";
    this.logcat = new Logcat(props.uri, props.auth);
    this.bottomRef = createRef();
  }

  componentDidMount() {
    this.logcat.start(this.onLogcat, 1000);
  }

  componentWillUnmount() {
    this.logcat.stop();
  }

  onLogcat = (chunk) => {
    const { maxLines } = this.props;
    this.buffer += chunk;
    let lines = this.buffer.split("\n");
    if (lines.length > maxLines) {
      lines = lines.slice(lines.length - maxLines);
      this.buffer = lines.join("\n");
    }
    this.setState({ lines }, () => {
      this.bottomRef.current?.scrollIntoView({ behavior: "auto" });
    });
  };

  render() {
    const { lines } = this.state;
    return (
      <div style={{
        height: "100%",
        overflowY: "auto",
        padding: "8px 12px",
        fontFamily: '"JetBrains Mono", "Fira Code", "Menlo", "Courier New", monospace',
        fontSize: 11,
        lineHeight: 1.65,
        color: "#1a1a24",
      }}>
        {lines.length === 0 && (
          <div style={{ color: "#9090a8", padding: "8px 0" }}>Waiting for logcat…</div>
        )}
        {lines.map((line, i) => (
          <div key={i} style={{ whiteSpace: "pre-wrap", wordBreak: "break-all" }}>{line}</div>
        ))}
        <div ref={this.bottomRef} />
      </div>
    );
  }
}
