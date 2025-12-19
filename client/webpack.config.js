import CopyPlugin from "copy-webpack-plugin";
import { readdir, writeFile, mkdir, stat } from "fs/promises";
import { nanoid } from "nanoid";
import { resolve as pathRes } from "path";
import { rimraf } from "rimraf";
import TerserPlugin from "terser-webpack-plugin";

const PUBLIC_DIR = pathRes("../public");
const META_DIR = pathRes(PUBLIC_DIR, "meta");
const EMIT_DIR = pathRes(PUBLIC_DIR, "dist");

class VersionGenPlugin {
    async writeHeaders(version) {
        const date = new Date();
        const dateString = date.getMonth().toString().padStart(2, "0") + "/" + date.getDate().toString().padStart(2, "0") + "/" + date.getFullYear() + " at " + date.getHours().toString().padStart(2, "0") + ":" + date.getMinutes().toString().padStart(2, "0") + ":" + date.getSeconds().toString().padStart(2, "0");

        await writeFile(pathRes(PUBLIC_DIR, "_headers"), `# DO NOT EDIT! Auto generated on ${dateString} by VersionGenPlugin\n\n/*\n\tX-Mlv: ${version}\n/meta/*\n\t! X-Mlv\n\tCache-Control: no-store\n/attrib.html\n\t! X-Mlv\n/dist/*\n\tService-Worker-Allowed: /`);
    }

    async writeVersion(version) {
        await writeFile(pathRes(META_DIR, "version"), version);
    }

    async run() {
        const version = nanoid();
        await rimraf(META_DIR);
        await mkdir(META_DIR);
        await Promise.all([this.writeHeaders(version), this.writeVersion(version)]);
    }

    apply(compiler) {
        compiler.hooks.emit.tapAsync(VersionGenPlugin.name, (_, done) => {
            this.run().then(() => done()).catch(done);
        });
    }
}

export default (env, argv) => {
    const config = {
        entry: {
            "app": "./app.ts",
            "map": "./map.ts",
            "sw": "./sw.ts"
        },
        devtool: 'source-map',
        module: {
            rules: [
                {
                    test: /\.css$/,
                    use: [
                        'style-loader',
                        'css-loader'
                    ]
                },
                {
                    test: /\.tsx?$/,
                    use: 'ts-loader',
                    exclude: /node_modules/,
                },
                {
                    test: /\.png$/,
                    use: 'file-loader'
                }
            ],
        },
        resolve: {
            extensions: ['.ts', '.js'],
        },
        output: {
            filename: '[name].js',
            path: EMIT_DIR,
        },
        plugins: [
            new CopyPlugin({
                "patterns": [
                    "styles.css",
                    {
                        from: "fonts/**/*",
                        to: "[name][ext]"
                    },
                    {
                        from: "icons/**/*",
                        to: "[name][ext]"
                    }
                ]
            }),
            new VersionGenPlugin()
        ]
    };

    if (argv.mode === "production") {
        config.mode = "production";
        config.devtool = "source-map";
        config.optimization = {
            minimize: true,
            minimizer: [new TerserPlugin()]
        };
    } else {
        config.mode = "development";
        config.devtool = "inline-source-map";
    }

    if (env.WEBPACK_WATCH === true) {
        config.stats = "errors-only";
        config.infrastructureLogging = {
            level: 'error'
        };
    }

    return config;
}