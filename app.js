// app.js

'use strict';

var async        = require('async');
var express      = require('express');
var basicAuth    = require('basic-auth');
var bodyParser   = require('body-parser');
var cookieParser = require('cookie-parser');
var mongoose     = require('mongoose');
var redis        = require('redis');

var redisHost   = process.env.REDIS_PORT_6379_TCP_ADDR || 'localhost';
var redisPort   = process.env.REDIS_PORT_6379_TCP_PORT || 6379;
var mongoDbHost = process.env.MONGODB_PORT_27017_TCP_ADDR || 'localhost';
var mongoDbPort = process.env.MONGODB_PORT_27017_TCP_PORT || 27017;
var expressPort = process.env.HTTP_PORT || 8085;

var testMode    = process.env.NODE_ENV === 'test';

var db          = null;
var redisClient = null;

var collection = 'api_users';

var userSchema = new mongoose.Schema({
  user:   String,
  domain: String,
  count:   { type: Number, default: 1 },
  created: { type: Date, default: Date.now },
  updated: { type: Date, default: Date.now },
});

var User = mongoose.model('User', userSchema);

console.log(Date(), 'app mode:', process.env.NODE_ENV);

async.series(
  [
    function(callback) {
      startRedis(callback);
    },
    function(callback) {
      startMongoDb(callback);
    },
    function(callback) {
      startExpress(callback);
    }
  ]
);

function startRedis(callback) {
  console.log(Date(), 'redis server:', redisHost + ':' + redisPort);

  redisClient = redis.createClient(redisPort, redisHost);

  redisClient.on('error', function(err) {
    console.log(Date(), 'redis error:', err);
    if (testMode) {
      // Continue so grunt-express-server reports Mocha test error.
      redisClient.end();
      callback(null);
    } else {
      process.exit(1);
    }
  });

  redisClient.on('ready', function() {
    console.log(Date(), 'redis ready');
    callback(null);
  });
}

function startMongoDb(callback) {
  console.log(Date(), 'mongo server:', mongoDbHost + ':' + mongoDbPort);

  var dbUri = 'mongodb://' + mongoDbHost + ':' + mongoDbPort + '/' + collection;

  db = mongoose.connect(dbUri);

  db.connection.on('error', function(err) {
    console.log(Date(), 'db error:', err);
    if (testMode) {
      // Continue so grunt-express-server reports Mocha test error.
      callback(null);
    } else {
      process.exit(1);
    }
  });

  db.connection.on('connected', function() {
    console.log(Date(), 'db: connected:', dbUri);
  });

  db.connection.on('open', function() {
    console.log(Date(), 'db: open');
    callback(null);
  });

  db.connection.on('close', function() {
    console.log(Date(), 'db: closed');
  });
}

function startExpress(callback) {
  var app = express();

  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(cookieParser());

  app.use(function(req, res, next) {
    if (!testMode) {
      console.log(Date(), req.method, req.url);
    }
    var user = basicAuth(req);
    if (typeof user === 'undefined' || typeof user.name === 'undefined' || typeof user.pass === 'undefined') {
      if (!testMode) {
        console.log(Date(), 'auth rejected:', 'missing credentials');
      }
      res.sendStatus(401);
    } else if (user.name !== 'jmf' || user.pass !== '1234') {
      if (!testMode) {
        console.log(Date(), 'auth rejected:', user.name, user.pass);
      }
      res.sendStatus(401);
    } else {
      if (!testMode) {
        console.log(Date(), 'auth accepted:', user.name, user.pass);
      }
      next();
    }
  });

  var apiVersion = 'v1';

  var apiUrl = '/api/' + apiVersion;

  // routes

  app.get(apiUrl + '/:domain/:user', function(req, res) {
    userGet(req, res);
  });

  app.put(apiUrl + '/:domain/:user', function(req, res) {
    userUpdate(req, res);
  });

  app.post(apiUrl + '/:domain/:user', function(req, res) {
    userUpdate(req, res);
  });

  app.delete(apiUrl + '/:domain/:user', function(req, res) {
    userDelete(req, res);
  });

  // catch-all handler for invalid routes

  app.use(function(req, res) {
    if (!testMode) {
      console.log(Date(), 'invalid:', req.method, req.url);
    }
    res.sendStatus(404);
  });

  // start server

  app.listen(expressPort, function() {
    // grunt-express-server waits for 'server started' to begin mock test
    console.log(Date(), 'server started port:', expressPort);
    callback(null);
  });
}

function userGet(req, res) {
  redisClient.get(req.params.user, function(err, domain) {
    if (err) {
      console.log(Date(), 'redis error:', err);
      res.status(503).end(); // Service Unavailable
    } else {
      if (domain === null) {
        if (!testMode) {
          console.log(Date(), 'redis not found:', req.params.user);
        }
        res.status(400).end(); // Bad Request
      } else {
        if (!testMode) {
          console.log(Date(), 'redis get:', req.params.user, domain);
        }
        User.findOne({ user: req.params.user }, function(err, doc) {
          if (err) {
            console.log(Date(), 'db error:', err);
            res.status(503).end(); // Service Unavailable
          } else {
            if (!doc) {
              if (!testMode) {
                console.log(Date(), 'db not found:', req.params.user);
              }
              res.status(400).end(); // Bad Request
            } else {
              if (!testMode) {
                console.log(Date(), 'db found:', doc.user, doc.domain, doc.count);
              }
              res.send(req.method + ': ' + doc.user + ' ' + doc.domain + ' ' + doc.count + '\n');
            }
          }
        });
      }
    }
  });
}

function userUpdate(req, res) {
  redisClient.set(req.params.user, req.params.domain, function(err) {
    if (err) {
      console.log(Date(), 'redis error:', err);
      res.status(503).end(); // Service Unavailable
    } else {
      if (!testMode) {
        console.log(Date(), 'redis set:', req.params.user, req.params.domain);
      }
      User.findOne({ user: req.params.user }, function(err, doc) {
        if (err) {
          console.log(Date(), 'db error:', err);
          res.status(503).end(); // Service Unavailable
        } else {
          if (!doc) {
            doc = new User();
            doc.user = req.params.user;
            doc.domain = req.params.domain;
          } else {
            doc.count += 1;
            doc.updated = Date.now();
          }
          doc.save(function(err) {
            if (err) {
              console.log(Date(), 'db error:', err);
              res.status(503).end(); // Service Unavailable
            } else {
              if (!testMode) {
                console.log(Date(), 'db saved:', doc.user, doc.domain, doc.count);
              }
              res.send(req.method + ': ' + doc.user + ' ' + doc.domain + ' ' + doc.count + '\n');
            }
          });
        }
      });
    }
  });
}

function userDelete(req, res) {
  redisClient.del(req.params.user, function(err, count) {
    if (err) {
      console.log(Date(), 'redis error:', err);
      res.status(503).end(); // Service Unavailable
    } else {
      if (count < 1) {
        console.log(Date(), 'redis not found:', req.params.user);
        res.status(400).end(); // Bad Request
      } else {
        if (!testMode) {
          console.log(Date(), 'redis del:', req.params.user, count);
        }

        User.remove({ user: req.params.user }, function(err) {
          if (err) {
            console.log(Date(), 'db error:', err);
            res.status(503).end(); // Service Unavailable
          } else {
            if (!testMode) {
              console.log(Date(), 'db removed:', req.params.user, req.params.domain);
            }
            res.send(req.method + ': ' + req.params.user + ' ' + req.params.domain + ' ' + '\n');
          }
        });
      }
    }
  });
}

['SIGHUP',  'SIGINT',  'SIGQUIT', 'SIGTRAP',
 'SIGABRT', 'SIGBUS',  'SIGFPE',  'SIGUSR1',
 'SIGSEGV', 'SIGUSR2', 'SIGTERM'
].forEach(function(signal) {
  process.on(signal, function() {
    console.log();
    console.log(Date(), 'server received signal', signal);
    process.exit(signal === 'SIGTERM' ? 0 : 1);
  });
});

process.on('exit', function() {
  console.log(Date(), 'server stopped');
});
