module.exports = (grunt) => {
    const webExt = require('web-ext').default;

    grunt.registerTask('sign-for-amo', 'Sign extension for AMO', function (confName) {
        const done = this.async();
        const currentConfig = grunt.config.get(['sign-for-amo', confName]);
        const globalConfig = grunt.config.get(['sign-for-amo', 'options']);

        webExt.cmd.sign(
            Object.assign({}, globalConfig, currentConfig),
            {shouldExitProgram: false}).then(() => {
                grunt.log.ok('Signed successfully');
                done();
            }).catch(err => {
                done(err);
            });
    });
};
