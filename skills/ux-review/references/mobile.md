# Mobile Surface

Drivers and hazards for reviewing an iOS or Android app on a simulator,
emulator, or device. Check the project's notes for newer hazards; tool behavior
changes between versions.

## Drivers

- **T3 Code devices.** Inside T3 Code, `device_list` and `device_open` boot a
  simulator or emulator and show it in the user's Device panel. `device_open`
  returns an `agent-device` CLI invocation pinned to that device; drive the
  device with it, and capture screens with `device_screenshot` or the CLI. When
  a reviewer cannot call the T3 tools, the parent opens the device and puts the
  CLI invocation in the brief.
- **Project UI test tooling** when the project has it, such as Maestro flows,
  XCUITest, or Espresso. Use it for repeatable steps, not as the review itself.
- **Platform CLIs** for setup and state:
  - iOS: `xcrun simctl` boots, installs, launches, and captures screenshots
    (`io <device> screenshot`). `ui <device> appearance`, `content_size`, and
    `increase_contrast` change display settings. `privacy <device> grant`,
    `revoke`, or `reset` sets permissions. `status_bar <device> override` gives
    stable screenshots. `simctl` cannot tap; pair it with one of the drivers
    above.
  - Android: record the review device's serial and pass
    `adb -s "$REVIEW_SERIAL"` on every command; stop if that device is
    unavailable rather than falling back to the default device.
    `adb exec-out screencap -p` captures the screen, `adb shell input tap`,
    `swipe`, `text`, and `keyevent` drive it, and `adb shell uiautomator dump`
    reads the view tree. `adb shell cmd uimode night yes` switches to dark mode,
    `adb shell settings put system font_scale` changes text size, and
    `adb shell pm revoke` withdraws a permission.

Run `xcrun simctl help` or `adb help` for current options rather than guessing.

## Platform checks

- **Accessibility:** every control has a label and role in the view tree
  (`uiautomator dump`, or the Xcode Accessibility Inspector), and the main path
  works with VoiceOver or TalkBack when accessibility is in scope.
- **Touch:** targets meet the platform minimum, about 44 by 44 points on iOS and
  48 by 48 dp on Android, and gestures have a visible alternative.
- **Text and display:** layouts hold at the largest text size, in dark mode,
  with increased contrast, and with reduced motion.
- **Input:** fields raise the fitting keyboard type, offer autofill where it
  helps, and stay visible above the keyboard.
- **Locale:** dates, numbers, and currency follow the device locale, and a
  right-to-left language mirrors the layout when supported.

Source-only rules come from the project's own guidelines, if it has any.

## Hazards

- **Use a dedicated simulator, emulator, or test device.** Never review on the
  user's personal device or with their accounts. Create one for the review when
  none is named for it, for example with `xcrun simctl create` or
  `avdmanager create avd`, and erase or reset only such a device. Afterwards,
  shut it down, with `device_close` and `shutdown: true` inside T3 Code, and
  delete a device you created.
- **A simulator is not a device.** Performance, camera, haptics, push,
  biometrics, and sensors are approximate or missing. Label findings that depend
  on them as low confidence, or list them as not checked.
- **The software keyboard may not appear.** An iOS simulator with a connected
  hardware keyboard hides the on-screen keyboard, so inputs covered by the
  keyboard never show. Turn the hardware keyboard off for text entry checks.
- **Permission prompts show once per install.** Reset privacy or reinstall to
  see first-run prompts, and test the denied path as well as the granted one.
- **Screenshot pixels are not tap points.** Screens are captured at device
  scale; convert to points before tapping, and confirm a tap by its effect.
- **Transitions take time.** Wait for a positive signal of the next screen
  before capturing or acting, not a fixed delay.
- **One device size hides layout problems.** Cover a small phone, a large phone
  with a notch or cutout, both orientations when supported, a tablet when
  supported, and the largest text size.
- **Platform navigation differs.** Check the Android back button and gesture,
  the iOS swipe-back gesture, and state after the app is backgrounded, killed,
  and relaunched.
