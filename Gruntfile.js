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

module.exports = (grunt) => {
    require('load-grunt-tasks')(grunt);

    const sources = [
        'icons/**',
        'manifest.json',
        'options/**.html',
        'options/**.css',
        '_locales/**',
    ];
    const watchFiles = sources.concat(['*/**.js']);

    const webpackConfigs = generateWebpackConfigs();
    grunt.registerTask('webpack-all', Object.keys(webpackConfigs).map(name => `webpack:${name}`));

    grunt.registerTask('build-common', [
        'clean:build',
        'copy:build',
        'webpack-all',
    ]);

    grunt.registerTask('build', 'Make browser-specific steps', function (browser) {
        grunt.task.run(`copy:${browser}`,
                       `replace_json:${browser}`,
                      );
    });

    grunt.registerTask('build-full', 'Full build for browser', function (browser) {
        grunt.task.run('build-common', `build:${browser}`);
    });

    grunt.registerTask('sign-amo', 'Sign extension for AMO', function () {
        const done = this.async();
        const amo = grunt.file.readJSON('amo.json');
        const webExt = require('web-ext').default;
        webExt.cmd.sign({
            sourceDir: './build',
            artifactsDir: './web-ext-artifacts',
            apiKey: amo.apiKey,
            apiSecret: amo.apiSecret,
        }, {shouldExitProgram: false}).then(() => {
            grunt.log.ok('Signed successfully');
            done();
        }).catch(err => {
            done(err);
        });
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
            grunt.fail.fatal(`You browser '${browser}' is currently not supported for packaging extension`);
        }
    });

    grunt.initConfig({
        manifest: grunt.file.readJSON('manifest.json'),
        webpack: webpackConfigs,
        clean: {
            build: 'build',
        },
        copy: {
            build: {
                expand: true,
                src: sources,
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
            build: {
                files: watchFiles,
                tasks: [ 'build-common' ],
                options: {
                    atBegin: true,
                },
            },
            firefox: {
                files: watchFiles,
                tasks: [ 'build-full:firefox' ],
                options: {
                    atBegin: true,
                },
            },
            chrome: {
                files: watchFiles,
                tasks: [ 'build-full:chrome' ],
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
