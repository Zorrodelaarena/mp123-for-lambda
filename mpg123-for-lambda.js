
var fs = require('fs');
var child_process = require('child_process');
var async = require('async');
var tmp = require('tmp');
var shellescape = require('shell-escape');

var mpg123Path = '';

/**
 * @typedef {Object} Mpg123Options
 * @property {?function} callback on completion, will be called with (err, {Mpg123Result} result)
 * @property {string} inputFile path to input file
 * @property {?string} outputFile path to the output file. if not specified, one will be generated
 */

/**
 * @typedef {Object} Mpg123Result
 * @property {int} size filesize of output file
 * @property {string} outputFile path to output file
 * @property {string} stdout stdout from mpg123
 * @property {string} stderr stderr from mpg123
 * @property {string} mpg123Command the command that was run (if there was one) (for debugging)
*/

/**
 * Runs mpg123
 * @param {Mpg123Options} options
 */
exports.convertMp3ToWav = function (options) {

	var result = {
		size: 0,
		outputFile: '',
		stdout: '',
		stderr: '',
		mpg123Command: ''
	};

	if (typeof options !== 'object') {
		options = {};
	}

	var finalCallback = options['callback'];
	if (typeof finalCallback !== 'function') {
		finalCallback = function () { };
	}

	var mpg123Parameters = ['-w'];

	// do this check before creating an output file
	if (!options.inputFile || !fs.existsSync(options.inputFile)) {
		finalCallback(new Error('inputFile not set or not found'), result);
		return;
	}

	if (!options.output) {
		result.outputFile = tmp.fileSync({ discardDescriptor: true, postfix: '.wav' }).name;
	} else {
		result.outputFile = options.outputFile;
	}
	mpg123Parameters.push(result.outputFile);
	
	mpg123Parameters.push(options.inputFile);

	async.waterfall([
		// make sure we have mpg123 somewhere we can run it
		function (callback) {
			if (!mpg123Path || !fs.existsSync(mpg123Path)) {
				var newMpg123Path = tmp.fileSync({ discardDescriptor: true, prefix: 'mpg123-' }).name;
				child_process.exec('cp ' + __dirname + '/bin/mpg123 ' + newMpg123Path, function (error, stdout, stderr) {
					if (error) {
						result.stdout = stdout;
						result.stderr = stderr;
						finalCallback(new Error('Failed to copy mpg123 to ' + newMpg123Path), result);
					} else {
						mpg123Path = newMpg123Path;
						callback(null);
					}
				});
			} else {
				callback(null);
			}
		},
		// make sure we have run permissions
		function (callback) {
			fs.chmod(mpg123Path, 0777, function (err) {
				if (err) {
					finalCallback(err, result);
				} else {
					callback(null);
				}
			});
		},
		// run mpg123
		function (callback) {
			result.mpg123Command = mpg123Path + ' ' + shellescape(mpg123Parameters);
			child_process.exec(result.mpg123Command, function (error, stdout, stderr) {
				result.size = fs.statSync(result.outputFile).size;
				result.stdout = stdout;
				result.stderr = stderr;
				if (result.size < 1) {
					finalCallback(new Error('outputFile was empty. check stdout and stderr for details'), result);
				} else {
					finalCallback(null, result);
				}
			});
		}
	]);
};

exports.cleanup = function () {
	if (mpg123Path && fs.existsSync(mpg123Path)) {
		fs.unlinkSync(mpg123Path);
	}
};