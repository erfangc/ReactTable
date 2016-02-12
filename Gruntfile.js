// modify this file if a library / css dependency changes in the source
module.exports = function (grunt) {
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        concat: {
            options: {separator: ";"},
            build: {
                src: ['build/*.js'],
                dest: 'dist/<%= pkg.name %>.js'
            }
        },
        uglify: {
            options: {
                banner: '/*! <%= pkg.name %> <%= grunt.template.today("dd-mm-yyyy") %> Author: Erfang Chen */\n',
                mangle: true
            },
            build: {
                files: {
                    'dist/<%= pkg.name %>.min.js': ['dist/<%= pkg.name %>.js']
                }
            }
        },
        copy: {
            build: {
                files: {
                    'dist/<%= pkg.name %>.css': ['src/scss/ReactTable.css'],
                    'dist/light-blue/<%= pkg.name %>.css': ['src/scss/light-blue/ReactTable.css']
                }
            }
        }
    })
    grunt.registerTask('build', ['concat:build', 'uglify:build', 'copy:build']);
    grunt.registerTask('default', 'build');
}
