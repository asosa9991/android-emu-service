var fs = require('fs');

// Fix 1: event_handler.js
// The wrapper div has display:inline-block with no height, causing video height=0.
// Change to display:block + height:100% so the video fills its container.
var ehFile = 'node_modules/android-emulator-webrtc/src/components/emulator/views/event_handler.js';
var eh = fs.readFileSync(ehFile, 'utf8');
var ehPatched = eh.replace('display: "inline-block",', 'display: "block", height: "100%",');
if (ehPatched === eh) { console.log('WARNING: event_handler patch not applied (pattern not found)'); }
else { fs.writeFileSync(ehFile, ehPatched); console.log('Patched event_handler.js'); }

// Fix 2: jsep_protocol_driver.js
// The emulator sends signal.start as a GUID string, not an ICE config object,
// so new RTCPeerConnection(signal.start) creates a peer connection with no ICE servers.
// We inject STUN + TURN so the browser can establish WebRTC through GCE's NAT.
// TURN host uses window.location.hostname so no IP is hardcoded in the image.
var jsepFile = 'node_modules/android-emulator-webrtc/src/components/emulator/net/jsep_protocol_driver.js';
var jsep = fs.readFileSync(jsepFile, 'utf8');
var oldLine = 'this.peerConnection = new RTCPeerConnection(signal.start);';
var newLine = [
  'var iceConfig = (signal.start && typeof signal.start === "object") ? signal.start : {};',
  '    iceConfig.iceServers = [',
  '      { urls: "stun:stun.l.google.com:19302" },',
  '      { urls: "turn:" + window.location.hostname + ":3478", username: "emulator", credential: "emulator123" }',
  '    ];',
  '    this.peerConnection = new RTCPeerConnection(iceConfig);'
].join('\n    ');
var jsepPatched = jsep.replace(oldLine, newLine);
if (jsepPatched === jsep) { console.log('WARNING: jsep patch not applied (pattern not found)'); }
else { fs.writeFileSync(jsepFile, jsepPatched); console.log('Patched jsep_protocol_driver.js'); }
