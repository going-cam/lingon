'use strict';

var path  = require('path');
var chalk = require('chalk');
var from  = require('from');

// keeping track of severe errors to return the correct exit code
var streamErrors = [];

module.exports = {
  pipesForFileExtensions: function (file, processorStore, global, context) {
    var pipes = [];
    var filename = path.basename(file);

    var extensions = filename.split('.')
        .filter(function (item) { return !!item; });

    extensions.splice(0, 1);
    extensions.reverse();

    extensions.forEach(function (ext) {
      var pipeFactories = processorStore.get(ext, file);

      if (pipeFactories) {
        pipeFactories.forEach(function (pipeFactory) {
          var pipeArray = pipeFactory.pipe(global, context);

          // factory did not return a pipe
          if (!pipeArray) { return; }

          // convert non-array return values for easier iteration
          if (!Array.isArray(pipeArray)) { pipeArray = [pipeArray]; }

          pipeArray.forEach(function (pipe) {
            if (pipe) {
              pipes.push(pipe);
            }
          });
        });
      }
    });

    return pipes;
  },

  applyPipes: function (stream, pipes) {
    var onStreamError = function (error) {
      var message;
      if (!error || !error.message) {
        message = 'An unknown error occured in the pipes';
      } else {
        message = error.message;
      }

      console.error('[ ' + chalk.red('Lingon') + ' ] ' +
          chalk.yellow('[Stream Error] ' + message));

      streamErrors.push(new Error('[Stream Error] ' + message));
      stream.destroy();
      stream.emit('end');
    };

    for (var i = 0; i < pipes.length; i++) {
      stream = stream.pipe(pipes[i]).on('error', onStreamError);
    }

    return stream;
  },

  createFromStream: function (file) {
    return from(function getChunk(count, next) {
      var _this = this;

      // Start emitting data on the next tick to allow
      // stream chains to be constructed (callbacks added).
      process.nextTick(function () {
        _this.emit('data', file);
        _this.emit('end');
      });
    });
  },

  getErrors: function () {
    return streamErrors.slice(0);
  },
};
