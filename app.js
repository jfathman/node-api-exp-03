// app.js

// $ curl --user jmf:1234 http://<ip>:<port>/api/v1/abc/123 -i -X GET
// $ curl --user jmf:1234 http://<ip>:<port>/api/v1/abc/123 -i -X PUT
// $ curl --user jmf:1234 http://<ip>:<port>/api/v1/abc/123 -i -X POST
// $ curl --user jmf:1234 http://<ip>:<port>/api/v1/abc/123 -i -X DELETE

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
  name: String,
  createdOn: { type: Date, default: Date.now },
});

var User = mongoose.model('User', userSchema);

void User; // jmf temp

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
    process.exit(1);
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
    process.exit(1);
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
          res.send(req.method + ' domain: ' + req.params.domain + ' user: ' + req.params.user + '\n');
        }
      }
    });
  });

  app.put(apiUrl + '/:domain/:user', function(req, res) {
    redisClient.set(req.params.user, req.params.domain, function(err) {
      if (err) {
        console.log(Date(), 'redis error:', err);
        res.status(503).end(); // Service Unavailable
      } else {
        if (!testMode) {
          console.log(Date(), 'redis set:', req.params.user, req.params.domain);
        }
        res.send(req.method + ' domain: ' + req.params.domain + ' user: ' + req.params.user + '\n');
      }
    });
  });

  app.post(apiUrl + '/:domain/:user', function(req, res) {
    redisClient.set(req.params.user, req.params.domain, function(err) {
      if (err) {
        console.log(Date(), 'redis error:', err);
        res.status(503).end(); // Service Unavailable
      } else {
        if (!testMode) {
          console.log(Date(), 'redis set:', req.params.user, req.params.domain);
        }
        res.send(req.method + ' domain: ' + req.params.domain + ' user: ' + req.params.user + '\n');
      }
    });
  });

  app.delete(apiUrl + '/:domain/:user', function(req, res) {
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
          res.send(req.method + ' domain: ' + req.params.domain + ' user: ' + req.params.user + '\n');
        }
      }
    });
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

['SIGHUP',  'SIGINT',  'SIGQUIT', 'SIGTRAP',
 'SIGABRT', 'SIGBUS',  'SIGFPE',  'SIGUSR1',
 'SIGSEGV', 'SIGUSR2', 'SIGTERM'
].forEach(function(signal) {
  process.on(signal, function() {
    console.log();
    console.log(Date(), 'server received signal', signal);
    process.exit(1);
  });
});

process.on('exit', function() {
  console.log(Date(), 'server stopped');
});
