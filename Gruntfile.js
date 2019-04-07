'use strict';

/* eslint-env node */

const path = require('path');

function generateWebpackBackgroundConfig() {
    return {
        entry: 'background/main',
        mode: 'development',
        output: {
            filename: 'background.js',
            path: path.resolve(__dirname, 'build', 'common'),
        },
        resolve: {
            modules: [
                __dirname,
                'node_modules',
            ],
        },
    };
}

function generateWebpackContentConfig({ name, dir }) {
    return {
        entry: `${dir}/${name}`,
        mode: 'development',
        output: {
            filename: `${name}.js`,
            path: path.resolve(__dirname, 'build', 'common', dir),
        },
        resolve: {
            modules: [
                __dirname,
                'node_modules',
            ],
        },
    };
}

const directoryContents = new Map([
    ['connectors', [
        'vk',
        'pandora',
        'deezer',
        'listen.moe',
        'youtube',
        'invidious',
        'googlemusic',
        'spotify',
        'yandex-music',
    ]],
    ['inject', [
        'vk',
        'deezer',
        'yandex-music',
    ]],
    ['options', ['main']],
]);

function generateWebpackConfigs() {
    let webpackConfigs = {};
    for (let [dir, files] of directoryContents.entries()) {
        for (let name of files) {
            webpackConfigs[`${dir}-${name}`] = generateWebpackContentConfig({ dir, name });
        }
    }
    webpackConfigs['background'] = generateWebpackBackgroundConfig();
    return webpackConfigs;
}

const supportedBrowsers = ['chrome', 'firefox'];

function logBrowserNotSupported(grunt, browser) {
    grunt.fail.fatal(`You browser '${browser}' is currently not supported for packaging extension. We only support 'chrome' and 'firefox'`);
}


module.exports = (grunt) => {
    require('load-grunt-tasks')(grunt);
    grunt.loadTasks('.grunt');

    const resources = [
        'icons/**',
        'manifest.json',
        'options/**.html',
        'options/**.css',
        '_locales/**',
    ];
    const watchFiles = resources.concat(['*/**.js']);

    const webpackConfigs = generateWebpackConfigs();
    grunt.registerTask('webpack-all', Object.keys(webpackConfigs).map(name => `webpack:${name}`));

    // Supported browser argument values for all tasks that take it are 'chrome' and 'firefox'
    grunt.registerTask('build', 'Build extension directory for a browser', function (browser) {
        if (!supportedBrowsers.includes(browser)) {
            logBrowserNotSupported(grunt, browser);
            return;
        }
        grunt.task.run(`clean:common`,
                       `clean:${browser}`,
                       `copy:resources`,
                       `webpack-all`,
                       `copy:${browser}`,
                       `replace_json:${browser}`,
                      );
    });

    grunt.registerTask('pack', 'Pack extension for a browser', function (browser) {
        switch (browser) {
        case 'firefox':
            grunt.task.run('build:firefox', 'sign-amo');
            break;
        case 'chrome':
            grunt.task.run('build:chrome', 'crx:dev');
            break;
        default:
            logBrowserNotSupported(grunt, browser);
        }
    });

    grunt.initConfig({
        manifest: grunt.file.readJSON('manifest.json'),
        webpack: webpackConfigs,
        clean: {
            firefox: 'build/firefox',
            chrome: 'build/chrome',
            common: 'build/common',
            build: 'build',
        },
        copy: {
            resources: {
                expand: true,
                src: resources,
                dest: 'build/common/',
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
            }
        },
        watch: {
            firefox: {
                files: watchFiles,
                tasks: [ 'build:firefox' ],
                options: {
                    atBegin: true,
                },
            },
            chrome: {
                files: watchFiles,
                tasks: [ 'build:chrome' ],
                options: {
                    atBegin: true,
                },
            },
        },
        bump: {
            options: {
                files: ["manifest.json"],
                commit: true,
                commitMessage: 'Version v%VERSION%',
                commitFiles: ["manifest.json"],
                createTag: true,
                tagName: 'v%VERSION%',
                tagMessage: 'Version v%VERSION%',
                push: true,
                pushTo: 'origin',
            }
        },
        crx: {
            dev: {
                src: 'build/**/*',
                dest: 'dist/wmc-<%= manifest.version %>-dev.crx',
            }
        },
        replace_json: {
            firefox: {
                src: 'build/firefox/manifest.json',
                changes: grunt.file.readJSON('firefox_manifest.json'),
            },
            chrome: {
                src: 'build/chrome/manifest.json',
                changes: grunt.file.readJSON('chrome_manifest.json'),
            }
        },
    });
};
