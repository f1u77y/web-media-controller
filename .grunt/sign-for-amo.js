module.exports = (grunt) => {
    grunt.registerTask('sign-amo', 'Sign extension for AMO', function () {
        const done = this.async();
        const amoToken = grunt.file.readJSON('amo.json');
        const webExt = require('web-ext').default;
        webExt.cmd.sign({
            sourceDir: './build/firefox',
            artifactsDir: './web-ext-artifacts',
            apiKey: amoToken.apiKey,
            apiSecret: amoToken.apiSecret,
        }, {shouldExitProgram: false}).then(() => {
            grunt.log.ok('Signed successfully');
            done();
        }).catch(err => {
            done(err);
        });
    });
};
