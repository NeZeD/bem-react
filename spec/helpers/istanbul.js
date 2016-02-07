var path = require('path');
var fs = require('fs');
var mkdirp = require('mkdirp');
var minimatch = require('minimatch');

require('babel-istanbul/lib/register-plugins');

var Reporter = require('babel-istanbul/lib/reporter');
var Collector = require('babel-istanbul/lib/collector');
var Instrumenter = require('babel-istanbul/lib/instrumenter');
var configuration = require('babel-istanbul/lib/config');

var config = configuration.loadFile(null, {}),
    reportingDir = path.resolve(config.reporting.dir());

mkdirp.sync(reportingDir);

var instrumenter = new Instrumenter({coverageVariable: '__coverage__' , preserveComments: false}),
    reporter = new Reporter(config),
    collector = new Collector();

reporter.addAll(config.reporting.reports());

config.instrumentation.config.extensions.forEach(function(ext) {
    var old = require.extensions[ext];
    require.extensions[ext] = function(m, filename) {
        var excludes = config.instrumentation.config.excludes || [];

        if(excludes.length && excludes.some(function(mask) {
            return minimatch(filename, mask);
        })) {
            return old(m, filename);
        }

        return m._compile(
            instrumenter.instrumentSync(fs.readFileSync(filename).toString('utf-8'), filename)
        );
    };
});

afterAll(function(done) {
    /* eslint-disable no-console */
    console.error('\nWriting coverage reports at [' + reportingDir + ']');
    collector.add(global.__coverage__);
    reporter.write(collector, true, done);
});
