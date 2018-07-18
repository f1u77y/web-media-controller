'use strict';

/* eslint-env node */

const path = require('path');

const webpackBackgroundConfig = {
    entry: 'background/main',
    mode: 'development',
    output: {
        filename: 'background.js',
        path: path.resolve(__dirname, 'build'),
    },
    resolve: {
        modules: [
            __dirname,
            'node_modules',
        ],
    },
};

const wpContent = env => {
    return {
        entry: `${env.dir}/${env.name}`,
        mode: 'development',
        output: {
            filename: `${env.name}.js`,
            path: path.resolve(__dirname, 'build', env.dir),
        },
        resolve: {
            modules: [
                __dirname,
                'node_modules',
            ],
        },
    };
};

const connectors = [
    'vk',
    'pandora',
    'deezer',
    'listen.moe',
    'youtube',
    'googlemusic',
    'spotify',
    'yandex-music',
];

const injected = [
    'vk',
    'deezer',
    'yandex-music',
];

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

    let webpackTasks = [];
    let webpackConfigs = {};
    for (let name of connectors) {
        webpackTasks.push(`webpack:conn-${name}`);
        webpackConfigs[`conn-${name}`] = wpContent({name, dir: 'connectors'});
    }
    for (let name of injected) {
        webpackTasks.push(`webpack:inj-${name}`);
        webpackConfigs[`inj-${name}`] = wpContent({name, dir: 'inject'});
    }
    webpackTasks.push('webpack:opt-main');
    webpackConfigs['opt-main'] = wpContent({name: 'main', dir: 'options'});
    webpackTasks.push('webpack:background');
    webpackConfigs['background'] = webpackBackgroundConfig;

    grunt.registerTask('webpack-all', webpackTasks);

    grunt.registerTask('build', [
        'clean:build',
        'copy:build',
        'webpack-all',
    ]);

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
            console.log(err.stack);
            done(err);
        });
    });

    grunt.registerTask('pack', 'Pack extension for a browser', function (browser) {
        switch (browser) {
        case 'firefox':
            grunt.task.run('build', 'sign-amo');
            break;
        case 'chrome':
            grunt.task.run('build', 'crx:dev');
            break;
        default:
            grunt.fail.fatal(`You browser '${browser}' is currently not supported for packaging extension`);
        }
    });

    grunt.initConfig({
        webpack: webpackConfigs,
        clean: {
            build: 'build',
        },
        copy: {
            build: {
                expand: true,
                src: sources,
                dest: 'build',
            },
        },
        watch: {
            build: {
                files: watchFiles,
                tasks: [ 'build' ],
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
                src: [ 'build/**/*' ],
                dest: [ 'dist/<%= pkg.name =%>-<%= manifest.version %=>-dev.crx' ],
            }
        },
    });
};
