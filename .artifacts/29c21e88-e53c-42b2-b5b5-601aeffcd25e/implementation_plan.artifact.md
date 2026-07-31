# Generate Local APK Build Plan

The goal is to generate a local `.apk` file for the `dh-pulse` project using EAS Build.

## Proposed Changes

No code changes are required. The process involves running build commands.

### Build Process

1.  **Dependency Check**: Ensure all packages are installed using `pnpm install`.
2.  **EAS Local Build**: Execute `eas build --platform android --profile preview --local` to generate the APK locally.
    *   This will handle the `npx expo prebuild` step automatically.
    *   The `preview` profile in `eas.json` is already configured for `buildType: apk`.

## Verification Plan

### Manual Verification
- Verify that the `.apk` file is generated in the project root or the specified output directory.
- Provide the path to the generated APK to the user.
