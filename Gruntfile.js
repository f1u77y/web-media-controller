'use strict';

/* eslint-env node */

const path = require('path');
const fs = require('fs');

let WEB_EXT_API_SECRET = null;
let WEB_EXT_API_KEY = null;

if (fs.existsSync('./.amo.json')) {
    const amoConfig = require('./.amo.json');
    WEB_EXT_API_KEY = amoConfig.apiKey;
    WEB_EXT_API_SECRET = amoConfig.apiSecret;
} else if (process.env.WEB_EXT_API_SECRET && process.env.WEB_EXT_API_KEY) {
    WEB_EXT_API_SECRET = process.env.WEB_EXT_API_SECRET;
    WEB_EXT_API_KEY = process.env.WEB_EXT_API_KEY;
}

function generateWebpackConfig({ name, dir }) {
    return {
        entry: `${dir}/${name}`,
        mode: 'development',
        output: {
            filename: `${name}.js`,
            path: path.resolve(__dirname, 'build', 'common', dir),
        },
        resolve: {
            modules: [
                path.resolve(__dirname, 'src'),
                'node_modules',
            ],
        },
        devtool: 'inline-source-map',
    };
}

function getGeneratedFilesMap() {
    let result = new Map([
        ['options', ['main']],
        ['background', ['main']],
    ]);
    for (let dir of ['connectors', 'inject']) {
        result.set(dir, []);
        for (let entry of fs.readdirSync(path.resolve('src', dir), { withFileTypes: true })) {
            if (!entry.isFile() || !entry.name.endsWith('.js')) {
                continue;
            }
            result.get(dir).push(entry.name.slice(0, -3));
        }
    }
    return result;
}

function generateWebpackConfigs() {
    const generatedFilesMap = getGeneratedFilesMap();
    let webpackConfigs = {};
    for (let [dir, files] of generatedFilesMap.entries()) {
        for (let name of files) {
            webpackConfigs[`${dir}-${name}`] = generateWebpackConfig({ dir, name });
        }
    }
    return webpackConfigs;
}

const supportedBrowsers = ['chrome', 'firefox'];

function logBrowserNotSupported(grunt, browser) {
    grunt.fail.fatal(`You browser '${browser}' is currently not supported for packaging extension. We only support 'chrome' and 'firefox'`);
}

function generateOptionsView() {
    const connectors = require('./src/background/connectors');
    const simpleOptions = Object.keys(require('./src/common/defaults')).map(optionName => { return {optionName}; });
    return {simpleOptions, connectors};
}

module.exports = (grunt) => {
    require('load-grunt-tasks')(grunt);

    const resources = ['_locales/**', 'options/match-input.mustache', '**/*.css', 'manifest.json'];
    const webpackConfigs = generateWebpackConfigs();
    const optionsView = generateOptionsView();

    // Supported browser argument values for all tasks that take it are 'chrome' and 'firefox'
    grunt.registerTask('build', 'Build extension directory for a browser', function (browser) {
        if (!supportedBrowsers.includes(browser)) {
            logBrowserNotSupported(grunt, browser);
            return;
        }
        grunt.task.run(`clean:common`,
                       `clean:${browser}`,
                       `copy:resources`,
                       `copy:icons`,
                       `copy:optionsCSS`,
                       `copy:optionsFonts`,
                       `mustache_render:options_page`,
                       `webpack`,
                       `copy:${browser}`,
                       `replace_json:${browser}`,
                      );
    });

    grunt.initConfig({
        webpack: webpackConfigs,
        webext_builder: {
            chrome: {
                privateKey: "./.cws.private.pem",
                targets: [
                  "chrome-crx"
                ],
                files: {
                  "dist/":["build/chrome"]
                }
            },
            firefox: {
                jwtIssuer: WEB_EXT_API_KEY,
                jwtSecret: WEB_EXT_API_SECRET,
                targets: [
                    "firefox-xpi"
                ],
                files: {
                    "dist/":["build/firefox"]
                }
            }
        },
        clean: {
            firefox: 'build/firefox',
            chrome: 'build/chrome',
            common: 'build/common',
            build: 'build',
        },
        copy: {
            resources: {
                expand: true,
                cwd: 'src/',
                src: resources,
                dest: 'build/common/',
            },
            icons: {
                expand: true,
                src: 'icons/**',
                dest: 'build/common',
            },
            firefox: {
                expand: true,
                cwd: 'build/common/',
                src: '**',
                dest: 'build/firefox/',
            },
            chrome: {
                expand: true,
                cwd: 'build/common/',
                src: '**',
                dest: 'build/chrome/',
            },
            optionsCSS: {
                expand: true,
                cwd: 'node_modules/',
                src: ['bootstrap/dist/css/bootstrap.min.css', 'font-awesome/css/font-awesome.min.css'],
                dest: 'build/common/options/css',
                flatten: true,
            },
            optionsFonts: {
                expand: true,
                cwd: 'node_modules/',
                src: 'font-awesome/fonts/**',
                dest: 'build/common/options/fonts',
                flatten: true,
            },
        },
        watch: {
            firefox: {
                files: 'src/**',
                tasks: [ 'build:firefox' ],
                options: {
                    atBegin: true,
                },
            },
            chrome: {
                files: 'src/**',
                tasks: [ 'build:chrome' ],
                options: {
                    atBegin: true,
                },
            },
        },
        bump: {
            options: {
                files: ['src/manifest.json'],
                commit: true,
                commitMessage: 'Version v%VERSION%',
                commitFiles: ['src/manifest.json'],
                createTag: true,
                tagName: 'v%VERSION%',
                tagMessage: 'Version v%VERSION%',
                push: true,
                pushTo: 'origin',
            }
        },
        replace_json: {
            firefox: {
                src: 'build/firefox/manifest.json',
                changes: grunt.file.readJSON('src/firefox_manifest.json'),
            },
            chrome: {
                src: 'build/chrome/manifest.json',
                changes: grunt.file.readJSON('src/chrome_manifest.json'),
            }
        },
        mustache_render: {
            options_page: {
                files: [{
                    data: optionsView,
                    template: 'src/options/options.mustache',
                    dest: 'build/common/options/options.html',
                }],
            },
        },
        gitrevParse: {
            HEAD: {
                options: {
                    short: 6,
                    treeIsh: 'HEAD',
                },
            },
        },
        eslint: {
            options: {
                configFile: '.eslintrc.yaml',
            },
            target: 'src/**/*.js',
        },
    });
};
