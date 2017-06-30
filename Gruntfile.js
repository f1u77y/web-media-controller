'use strict';

/* eslint-env node */

const jp = require('jsonpath');

module.exports = (grunt) => {
    require('load-grunt-tasks')(grunt);

    const sources = [
        'background/**',
        'background.js',
        'common/**',
        'connectors/**',
        'content/**',
        'icons/**',
        'inject/**',
        'manifest.json',
        'options/**',
        '_locales/**',
    ];

    grunt.registerMultiTask('manifest', '', function() {
        const srcFile = this.data.src;
        let content = grunt.file.readJSON(srcFile);

        jp.apply(content, '$.content_scripts[*].js', (scripts) => [
            'vendor/underscore.js',
            'content/utils.js',
            'content/base-connector.js',
            ...scripts,
        ]);

        grunt.file.write(srcFile, JSON.stringify(content, null, 4));

        return true;
    });

    grunt.registerTask('build', [
        'clean:build',
        'copy:build',
        'manifest:build',
        'bowercopy:build',
    ]);

    grunt.initConfig({
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
        manifest: {
            build: {
                src: 'build/manifest.json',
            },
        },
        bowercopy: {
            build: {
                options: {
                    destPrefix: 'build/vendor',
                },
                files: {
                    'require.js': 'requirejs/require.js',
                    'underscore.js': 'underscore/underscore-min.js',
                },
            },
        },
    });
};
