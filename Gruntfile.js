"use strict";
// require("babel-register");

module.exports = function(grunt){

    grunt.initConfig({
        mocha_istanbul: {
            coverage: {
                src: ['test/**/*.test.es6'],
                options: {
                    mochaOptions: ['--compilers','es6:babel-register'],
                    scriptPath: require.resolve('./node_modules/isparta/bin/isparta'),
                    root: 'src', // define where the cover task should consider the root of libraries that are covered by tests
                    reportFormats: ['cobertura','lcov']
                }
            },
            coveralls: {
                src: ['test/**/*.test.es6'], // multiple folders also works
                options: {
                    scriptPath: require.resolve('./node_modules/isparta/bin/isparta'),
                    coverage:true, // this will make the grunt.event.on('coverage') event listener to be triggered
                    root: './src', // define where the cover task should consider the root of libraries that are covered by tests
                    reportFormats: ['cobertura','lcovonly']
                }
            }
        },
        istanbul_check_coverage: {
            default: {
                options: {
                    coverageFolder: 'coverage*', // will check both coverage folders and merge the coverage results
                    check: {
                        lines: 80,
                        statements: 80
                    }
                }
            }
        }

    });

    grunt.event.on('coverage', function(lcovFileContents, done){
        // Check below on the section "The coverage event"
        done();
    });

    grunt.loadNpmTasks('grunt-mocha-istanbul');

    grunt.registerTask('coveralls', ['mocha_istanbul:coveralls']);
    grunt.registerTask('coverage', ['mocha_istanbul:coverage']);
};