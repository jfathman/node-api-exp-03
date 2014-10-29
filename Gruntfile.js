// Gruntfile.js
  
'use strict';
  
module.exports = function(grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    jshint: {
      file: ['Gruntfile.js', 'app.js', 'test/*.js'],
      options: {
        jshintrc: true
      }
    },
    /* jshint camelcase: false */
    express: {
      dev: {
        options: {
          script: 'app.js',
          background: false,
          node_env: 'development'
        }
      },
      test: {
        options: {
          script: 'app.js',
          output: 'server started',
          node_env: 'test'
        }
      },
      prod: {
        options: {
          script: 'app.js',
          background: false,
          node_env: 'production'
        }
      }
    },
    /* jshint camelcase: true */
    mochaTest: {
      test: {
        options: {
          reporter: 'spec'
        },
        src: ['test/*.js']
      }
    },
    shell: {
      shrinkwrap: {
        command: 'npm shrinkwrap --dev'
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-express-server');
  grunt.loadNpmTasks('grunt-mocha-test');
  grunt.loadNpmTasks('grunt-shell');

  grunt.registerTask('default', 'Run jshint.', ['jshint']);
  grunt.registerTask('dev',  'Run app in development mode.', ['express:dev']);
  grunt.registerTask('test', 'Run jshint, app, and mochaTest.', ['jshint', 'express:test', 'mochaTest']);
  grunt.registerTask('prod', 'Run app in production mode.', ['express:prod']);
  grunt.registerTask('shrinkwrap', 'Create npm-shrinkwrap.json file.', ['shell:shrinkwrap']);
};
