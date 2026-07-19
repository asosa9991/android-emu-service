// Minimal config for no-auth mode (no Firebase required).
// The upstream project generates this file via config_gen.py + firebase_config.json;
// we provide it directly since we bypass Firebase authentication.
export const config = {
  auth: {
    type: "none"
  }
};
