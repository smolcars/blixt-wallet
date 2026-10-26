import path from "path";
import { transformAsync } from "@babel/core";
import { defineConfig, loadEnv, type UserConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteStaticCopy } from "vite-plugin-static-copy";
import { nodePolyfills } from "vite-plugin-node-polyfills";

const projectRoot = __dirname;
const resolvePath = (...segments: string[]) => path.resolve(projectRoot, ...segments);
const normalizePath = (filePath: string) => filePath.replaceAll("\\", "/");
const parseEnvBoolean = (value: string | undefined, fallback: boolean) => {
  if (value == null) {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }

  return fallback;
};

const transpileDependencyPatterns = [
  /node_modules\/react-native-web\/src\//,
  /node_modules\/react-native-easy-grid\/Components\//,
  /node_modules\/react-native-animatable\//,
  /node_modules\/react-native-drawer\//,
  /node_modules\/react-native-qrcode-svg\//,
  /node_modules\/@codler\/react-native-keyboard-aware-scroll-view\//,
];

const shouldTranspileDependency = (id: string) =>
  transpileDependencyPatterns.some((pattern) => pattern.test(id));

const isEasyGridComponent = (id: string) =>
  /node_modules\/react-native-easy-grid\/Components\//.test(id);

const isAnimatableModule = (id: string) => /node_modules\/react-native-animatable\//.test(id);

const isReactNativeDrawerModule = (id: string) => /node_modules\/react-native-drawer\//.test(id);

const isReactNativeQrCodeSvgModule = (id: string) =>
  /node_modules\/react-native-qrcode-svg\//.test(id);

const isReactNativeElementDropdownModule = (id: string) =>
  /node_modules\/react-native-element-dropdown\/lib\/module\/.*\.js$/.test(id);

const isReactNativeWebWebViewIndexModule = (id: string) =>
  /node_modules\/react-native-web-webview\/(?:dist|src)\/index\.js$/.test(id);

const REACT_NATIVE_WEB_WEBVIEW_POSTMOCK_VIRTUAL_ID = "\0react-native-web-webview-postmock-html";

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const isProduction = mode === "production";
  const isAppDev = parseEnvBoolean(env.BLIXT_DEV ?? env.VITE_BLIXT_DEV, !isProduction);
  const disableHmrForProductionNodeEnv =
    command === "serve" && process.env.NODE_ENV === "production";
  const flavor = (env.FLAVOR ?? env.VITE_FLAVOR ?? "fakelnd").toLowerCase();
  const isElectrobunTarget = (env.VITE_IS_ELECTROBUN ?? "false").toLowerCase() === "true";
  const platformExtensions = isElectrobunTarget
    ? [".electrobun.tsx", ".electrobun.ts", ".electrobun.jsx", ".electrobun.js"]
    : [];
  const turboLndModuleReplacement =
    flavor === "normal" ? "react-native-turbo-lnd/electrobun/view" : "react-native-turbo-lnd/mock";

  return {
    root: resolvePath("web"),

    plugins: [
      {
        name: "react-native-web-webview-postmock-resolver",
        enforce: "pre",
        resolveId(source, importer) {
          if (!importer) {
            return null;
          }

          const cleanImporter = normalizePath(importer.split("?")[0]);
          if (source === "./postMock.html" && isReactNativeWebWebViewIndexModule(cleanImporter)) {
            return REACT_NATIVE_WEB_WEBVIEW_POSTMOCK_VIRTUAL_ID;
          }

          return null;
        },
        load(id) {
          if (id === REACT_NATIVE_WEB_WEBVIEW_POSTMOCK_VIRTUAL_ID) {
            return "export default '/postMock.html';";
          }
          return null;
        },
      },

      {
        name: "react-native-deps-babel",
        enforce: "pre",
        async transform(code, id) {
          const cleanId = normalizePath(id.split("?")[0]);
          if (!cleanId.endsWith(".js")) {
            return null;
          }
          if (!cleanId.includes("/node_modules/")) {
            return null;
          }

          if (isReactNativeElementDropdownModule(cleanId)) {
            const patchedCode = code.replace(
              /const\s+([A-Za-z_$][\w$]*)\s*=\s*require\((['"])([^'"]+\.(?:png|jpe?g|gif|webp|svg))\2\);/g,
              "import $1 from '$3';",
            );

            if (patchedCode !== code) {
              return {
                code: patchedCode,
                map: null,
              };
            }
          }

          if (!shouldTranspileDependency(cleanId)) {
            if (!isReactNativeWebWebViewIndexModule(cleanId)) {
              return null;
            }
          }

          if (isReactNativeWebWebViewIndexModule(cleanId)) {
            const patchedCode = code.replace(
              /require\((['"])\\.\/postMock\.html\1\)/g,
              '"/postMock.html"',
            );
            return {
              code: patchedCode,
              map: null,
            };
          }

          const presets =
            isEasyGridComponent(cleanId) ||
            isAnimatableModule(cleanId) ||
            isReactNativeDrawerModule(cleanId) ||
            isReactNativeQrCodeSvgModule(cleanId)
              ? ["@babel/preset-react"]
              : [["module:@react-native/babel-preset", { disableImportExportTransform: true }]];

          const result = await transformAsync(code, {
            filename: cleanId,
            babelrc: false,
            configFile: false,
            presets,
            sourceMaps: true,
          });

          if (!result?.code) {
            return null;
          }

          return {
            code: result.code,
            map: result.map ?? null,
          };
        },
      },

      react(),

      nodePolyfills({
        protocolImports: true,
      }),

      viteStaticCopy({
        targets: [
          ...(isElectrobunTarget
            ? []
            : [
                {
                  src: normalizePath(resolvePath("node_modules/sql.js/dist/sql-wasm.wasm")),
                  dest: ".",
                },
                {
                  src: normalizePath(resolvePath("node_modules/sql.js/dist/sql-wasm-browser.wasm")),
                  dest: ".",
                },
              ]),
          {
            src: normalizePath(
              resolvePath("node_modules/react-native-web-webview/dist/postMock.html"),
            ),
            dest: ".",
          },
        ],
      }),
    ],

    // Essential runtime replacements for web/Electrobun live in three layers:
    // 1. Explicit package aliases in `resolve.alias`.
    //    - `react-native-turbo-lnd`
    //      - `flavor=normal`: upstream `react-native-turbo-lnd/electrobun/view`
    //      - those helpers are imported separately from
    //        `react-native-turbo-lnd/electrobun/custom-rpc` by
    //        `electrobun/src/shared/rpc-client.web.ts`
    //      - `flavor!=normal`: `react-native-turbo-lnd/mock`
    //    - `react-native-turbo-sqlite`
    //      - plain web: upstream package browser export; no alias needed
    //      - Electrobun: `electrobun/src/shims/react-native-turbo-sqlite.ts`, which forwards
    //        DB open/query/close calls over Electrobun RPC to the Bun-side SQLite implementation
    //    - `@react-native-async-storage/async-storage`
    //      - Electrobun only: `electrobun/src/shims/async-storage.js`, which forwards the
    //        AsyncStorage API over Electrobun RPC to the Bun-side KV store
    // 2. Platform file resolution via `.electrobun.*` / `.web.*` because those extensions come
    //    first in `extensions`.
    //    - For the Electrobun renderer we prefer `.electrobun.*`, so files like
    //      `src/turbomodules/NativeBlixtTools.electrobun.ts` can stay Electrobun-specific without
    //      polluting the plain browser `*.web.*` implementations.
    //    - `src/storage/keystore.web.ts`: localStorage-backed replacement for `src/storage/keystore.ts`,
    //      so the native `react-native-keychain` dependency never enters the web/Electrobun bundle
    //    - `src/storage/database/sqlite.web.ts`: web DB entrypoint that imports
    //      `react-native-turbo-sqlite`; on plain web that resolves to the package browser backend,
    //      on Electrobun it resolves to the RPC-backed SQLite shim above
    //    - `src/turbomodules/NativeBlixtTools.web.ts`: plain browser fallback for native build/file
    //      helpers
    //    - `src/turbomodules/NativeBlixtTools.electrobun.ts`: Electrobun-specific NativeBlixtTools
    //      implementation that delegates into `electrobun/src/shims/native-blixt-tools.ts`
    //    - `src/turbomodules/NativeLndmobileTools.web.ts`,
    //      `src/turbomodules/NativeScheduledSyncTurbo.web.ts`, and
    //      `src/turbomodules/NativeSpeedloader.web.ts`: minimal web stand-ins for native TurboModules
    // 3. Runtime globals outside aliasing.
    //    - `define.global = "globalThis"` here, plus `globalThis.global = globalThis` in
    //      `web/main.ts`, keeps React Native code that expects a Node-style `global` working
    //    - `web/main.ts` assigns `FLAVOR`, `CHAIN`, `APPLICATION_ID`, `VERSION_NAME`,
    //      `VERSION_CODE`, `BUILD_TYPE`, `DEBUG`, `__DEV__`, `BLIXT_WEB_DEMO`, and `IS_ELECTROBUN`
    //      before loading `index.web.js`; `NativeBlixtTools.web.ts` reads several of those directly
    //
    // The `src/shims/**` alias block below is a separate category: compatibility patches for
    // React Native libraries. If a missing dependency is core app runtime surface area, document it in
    // the inventory above; if it is just a broken RN package import path, keep it with the patch aliases.
    resolve: {
      extensions: [
        ...platformExtensions,
        ".web.tsx",
        ".web.ts",
        ".tsx",
        ".ts",
        ".web.jsx",
        ".web.js",
        ".jsx",
        ".js",
        ".json",
      ],
      alias: [
        {
          find: /^react-native$/,
          replacement: resolvePath("src/shims/web/react-native-web-compat.js"),
        },
        {
          find: /^sql\.js$/,
          replacement: resolvePath("node_modules/sql.js/dist/sql-wasm.js"),
        },
        {
          find: /^react-native\/Libraries\/Utilities\/codegenNativeComponent$/,
          replacement: resolvePath(
            "src/shims/web/react-native-libraries/codegenNativeComponent.js",
          ),
        },
        {
          find: /^react-native\/Libraries\/Utilities\/codegenNativeCommands$/,
          replacement: resolvePath("src/shims/web/react-native-libraries/codegenNativeCommands.js"),
        },
        {
          find: /^react-native\/Libraries\/Image\/resolveAssetSource$/,
          replacement: resolvePath("src/shims/web/react-native-libraries/resolveAssetSource.js"),
        },
        {
          find: /^react-native\/Libraries\/StyleSheet\/processColor$/,
          replacement: resolvePath("src/shims/web/react-native-libraries/processColor.js"),
        },
        {
          find: /^react-native\/Libraries\/StyleSheet\/processColorArray$/,
          replacement: resolvePath("src/shims/web/react-native-libraries/processColorArray.js"),
        },
        {
          find: /^react-native\/Libraries\/NativeComponent\/NativeComponentRegistry$/,
          replacement: resolvePath(
            "src/shims/web/react-native-libraries/NativeComponentRegistry.js",
          ),
        },
        {
          find: /^react-native\/Libraries\/NativeComponent\/ViewConfigIgnore$/,
          replacement: resolvePath("src/shims/web/react-native-libraries/ViewConfigIgnore.js"),
        },
        {
          find: /^react-native\/Libraries\/ReactNative\/AppContainer$/,
          replacement: resolvePath("src/shims/web/react-native-libraries/AppContainer.js"),
        },
        {
          find: /^react-native\/Libraries\/ReactNative\/RendererProxy$/,
          replacement: resolvePath("src/shims/web/react-native-libraries/RendererProxy.js"),
        },
        {
          find: "react-native-linear-gradient",
          replacement: "react-native-web-linear-gradient",
        },
        {
          find: /^react-native-vector-icons$/,
          replacement: resolvePath("node_modules/react-native-vector-icons/dist/index.js"),
        },
        {
          find: /^react-native-vector-icons\/(.+)$/,
          replacement: resolvePath("node_modules/react-native-vector-icons/dist/$1.js"),
        },
        {
          find: /^react-native-element-dropdown$/,
          replacement: resolvePath("src/shims/web/react-native-element-dropdown.js"),
        },
        {
          find: /^native-base-shoutem-theme$/,
          replacement: resolvePath("node_modules/native-base-shoutem-theme/dist/index.js"),
        },
        {
          find: /^@react-native-picker\/picker$/,
          replacement: resolvePath("src/shims/web/react-native-picker.js"),
        },
        {
          find: /^@react-native-documents\/picker$/,
          replacement: resolvePath("src/shims/react-native-documents-picker.js"),
        },
        {
          find: "react-native-maps",
          replacement: resolvePath("src/shims/react-native-maps.js"),
        },
        {
          find: "react-native-svg",
          replacement: "react-native-svg-web",
        },
        {
          find: "react-native-webview",
          replacement: "react-native-web-webview",
        },
        {
          find: /^react-native-keyboard-controller$/,
          replacement: resolvePath("src/shims/react-native-keyboard-controller.js"),
        },
        {
          find: /^react-native-turbo-lnd$/,
          replacement: turboLndModuleReplacement,
        },
        {
          find: "react-native-permissions",
          replacement: resolvePath("src/shims/react-native-permissions.js"),
        },
        {
          find: "react-native-dialogs",
          replacement: resolvePath("src/shims/web/react-native-dialogs.js"),
        },
        {
          find: "react-native-fs",
          replacement: resolvePath("src/shims/web/react-native-fs.js"),
        },
        {
          find: "react-native-icloudstore",
          replacement: resolvePath("src/shims/react-native-icloudstore.js"),
        },
        {
          find: "react-native-nitro-tor",
          replacement: resolvePath("src/shims/react-native-nitro-tor.js"),
        },
        ...(isElectrobunTarget
          ? [
              {
                find: /^react-native-turbo-sqlite$/,
                replacement: resolvePath("electrobun/src/shims/react-native-turbo-sqlite.ts"),
              },
              {
                find: /^react-native-turbo-sqlite\/mocks$/,
                replacement: resolvePath("electrobun/src/shims/react-native-turbo-sqlite-mocks.ts"),
              },
              {
                find: /^@react-native-async-storage\/async-storage$/,
                replacement: resolvePath("electrobun/src/shims/async-storage.js"),
              },
            ]
          : []),
        {
          find: "@notifee/react-native",
          replacement: resolvePath("src/shims/notifee-react-native.js"),
        },
      ],
    },

    define: {
      global: "globalThis",
      __DEV__: JSON.stringify(isAppDev),
      "process.env.NODE_ENV": JSON.stringify(isProduction ? "production" : "development"),
      "process.env.JEST_WORKER_ID": "null",
      "process.env.ELECTROBUN_SAFE_STARTUP": JSON.stringify(
        env.ELECTROBUN_SAFE_STARTUP ?? env.VITE_ELECTROBUN_SAFE_STARTUP ?? "",
      ),
    },

    optimizeDeps: {
      entries: ["index.html"],
      include: ["prop-types", "react-native-drawer", "qrcode"],
      exclude: [
        "react-native-easy-grid",
        "react-native-animatable",
        "react-native-qrcode-svg",
        "@codler/react-native-keyboard-aware-scroll-view",
        "react-native-web-webview",
      ],
      rolldownOptions: {
        resolve: {
          extensions: [
            ...platformExtensions,
            ".web.tsx",
            ".web.ts",
            ".tsx",
            ".ts",
            ".web.jsx",
            ".web.js",
            ".jsx",
            ".js",
            ".css",
            ".json",
          ],
        },
        transform: {
          define: {
            global: "globalThis",
          },
        },
        moduleTypes: {
          ".html": "text",
        },
        plugins: [],
      },
    },

    server: {
      port: 8080,
      hmr: disableHmrForProductionNodeEnv ? false : undefined,
      fs: {
        allow: [resolvePath(".")],
      },
      headers: {
        // For react-native-turbo-sqlite web (uses OPFS):
        "Cross-Origin-Opener-Policy": "same-origin",
        "Cross-Origin-Embedder-Policy": "require-corp",
      },
    },

    build: {
      outDir: resolvePath("web/dist"),
      emptyOutDir: true,
      sourcemap: true,
      target: "es2020",
      rollupOptions: {
        output: {
          entryFileNames: "assets/[name].js",
          chunkFileNames: "assets/[name].js",
          assetFileNames: "assets/[name][extname]",
        },
      },
    },

    envPrefix: ["VITE_", "CHAIN", "FLAVOR", "APPLICATION_ID", "BLIXT_WEB_DEMO", "BLIXT_DEV"],

    css: {
      devSourcemap: true,
    },
  } satisfies UserConfig;
});
