import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  INSTALL_DISMISS_KEY,
  isStandaloneDisplay,
  detectInstallPlatform,
  shouldShowInstallCoach,
  installCoachCopy,
  readInstallDismissed,
  writeInstallDismissed,
  parseAppView,
} from "../js/install.js";

function mm(map) {
  return (query) => ({ matches: !!map[query] });
}

describe("isStandaloneDisplay", () => {
  it("is true for display-mode: standalone", () => {
    assert.equal(
      isStandaloneDisplay({
        matchMedia: mm({ "(display-mode: standalone)": true }),
        navigator: {},
      }),
      true
    );
  });

  it("is true for iOS navigator.standalone", () => {
    assert.equal(
      isStandaloneDisplay({
        matchMedia: mm({}),
        navigator: { standalone: true },
      }),
      true
    );
  });

  it("is false in a normal browser tab", () => {
    assert.equal(
      isStandaloneDisplay({
        matchMedia: mm({ "(display-mode: standalone)": false }),
        navigator: { standalone: false },
      }),
      false
    );
  });

  it("is true for Android TWA referrer", () => {
    assert.equal(
      isStandaloneDisplay({
        matchMedia: mm({}),
        navigator: {},
        referrer: "android-app://com.ironledger.app/",
      }),
      true
    );
  });
});

describe("detectInstallPlatform", () => {
  it("detects iPhone", () => {
    assert.equal(
      detectInstallPlatform("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)"),
      "ios"
    );
  });

  it("detects Android", () => {
    assert.equal(
      detectInstallPlatform("Mozilla/5.0 (Linux; Android 14; Pixel 8) Chrome/126.0.0.0"),
      "android"
    );
  });

  it("detects desktop as other", () => {
    assert.equal(
      detectInstallPlatform("Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0.0.0"),
      "other"
    );
  });
});

describe("shouldShowInstallCoach", () => {
  it("hides when already installed", () => {
    assert.equal(shouldShowInstallCoach({ standalone: true, dismissed: false, platform: "ios" }), false);
  });

  it("hides after dismiss", () => {
    assert.equal(shouldShowInstallCoach({ standalone: false, dismissed: true, platform: "android" }), false);
  });

  it("shows on iOS Safari tab", () => {
    assert.equal(shouldShowInstallCoach({ standalone: false, dismissed: false, platform: "ios" }), true);
  });

  it("shows on Android Chrome tab", () => {
    assert.equal(shouldShowInstallCoach({ standalone: false, dismissed: false, platform: "android" }), true);
  });

  it("does not nag desktop", () => {
    assert.equal(shouldShowInstallCoach({ standalone: false, dismissed: false, platform: "other" }), false);
  });
});

describe("installCoachCopy", () => {
  it("teaches iOS Add to Home Screen", () => {
    const copy = installCoachCopy("ios");
    assert.match(copy.title, /home screen/i);
    assert.match(copy.body, /Share/i);
    assert.equal(copy.action, "dismiss");
  });

  it("offers Android install", () => {
    const copy = installCoachCopy("android");
    assert.match(copy.title, /install/i);
    assert.equal(copy.action, "install");
  });
});

describe("parseAppView", () => {
  it("reads a valid shortcut view", () => {
    assert.equal(parseAppView("?view=plan"), "plan");
    assert.equal(parseAppView("view=supps"), "supps");
  });

  it("ignores unknown views", () => {
    assert.equal(parseAppView("?view=admin"), null);
    assert.equal(parseAppView(""), null);
  });
});

describe("install dismiss storage", () => {
  it("round-trips dismissed flag", () => {
    const mem = {};
    const storage = {
      getItem: (k) => (k in mem ? mem[k] : null),
      setItem: (k, v) => {
        mem[k] = String(v);
      },
    };
    assert.equal(readInstallDismissed(storage), false);
    writeInstallDismissed(storage);
    assert.equal(readInstallDismissed(storage), true);
    assert.equal(mem[INSTALL_DISMISS_KEY], "1");
  });
});
