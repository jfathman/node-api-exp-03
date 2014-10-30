// test-api.js

'use strict';

var should   = require('chai').should();
var request  = require('supertest');
var loadtest = require('loadtest');

// suppress jshint: 'should' is defined but never used
/* exported should */

var host = 'localhost';
var port = '8085';

var apiVersion   = 'v1';
var testUsername = 'jmf';
var testPassword = '1234';

var testInvalidUsername = 'xxx';
var testInvalidPassword = '9999';

describe('Test API REST API', function() {
  it('Create base URI', function(done) {
    var apiUriBase = 'http://' + host + ':' + port + '/api/' + apiVersion;
    request = request(apiUriBase);
    console.log('      ' + apiUriBase);
    done();
  });

  // test cases:

  it('POST /abc/123, expect 200 OK', function(done) {
    request.post('/abc/123').auth(testUsername, testPassword)
      .expect(200, done);
  });

  it('GET /abc/123, expect 200 OK', function(done) {
    request.get('/abc/123').auth(testUsername, testPassword)
      .expect(200, done);
  });

  it('DELETE /abc/123, expect 200 OK', function(done) {
    request.delete('/abc/123').auth(testUsername, testPassword)
      .expect(200, done);
  });

  it('GET /abc/123, expect 400 Bad Request', function(done) {
    request.get('/abc/123').auth(testUsername, testPassword)
      .expect(400, done);
  });

  it('PUT /abc/123, expect 200 OK', function(done) {
    request.put('/abc/123').auth(testUsername, testPassword)
      .expect(200, done);
  });

  it('GET /abc/123, expect 200 OK', function(done) {
    request.get('/abc/123').auth(testUsername, testPassword)
      .expect(200, done);
  });

  it('GET /abc/123, invalid auth user, expect 401 Unauthorized', function(done) {
    request.get('/abc/123').auth(testInvalidUsername, testPassword)
      .expect(401, done);
  });

  it('GET /abc/123, invalid auth password, expect 401 Unauthorized', function(done) {
    request.get('/abc/123').auth(testUsername, testInvalidPassword)
      .expect(401, done);
  });

  it('GET /noroute, invalid URI, expect 404 Not Found', function(done) {
    request.get('/noroute').auth(testUsername, testPassword)
      .expect(404, done);
  });

  // load test:

  it('GET /abc/123, load test 5000 requests, expect < 30 sec', function(done) {
    this.timeout(30000);
    var options = {
      url: 'http://' + testUsername + ':' + testPassword + '@' + host + ':' + port + '/api/' + apiVersion + '/abc/123',
      concurrency: 10,
      maxRequests: 5000
    };
    loadtest.loadTest(options, function(err, result) {
      should.not.exist(err);
      (result.totalTimeSeconds < 30).should.equal(true);
      done();
    });
  });

  // clean up:

  it('DELETE /abc/123, expect 200 OK', function(done) {
    request.delete('/abc/123').auth(testUsername, testPassword)
      .expect(200, done);
  });

  it('GET /abc/123, expect 400 Bad Request', function(done) {
    request.get('/abc/123').auth(testUsername, testPassword)
      .expect(400, done);
  });
});
