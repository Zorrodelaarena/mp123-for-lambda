
var fs = require('fs');
var child_process = require('child_process');
var async = require('async');
var tmp = require('tmp');
var shellescape = require('shell-escape');

var mpg123Path = '';

/**
 * @typedef {Object} Mpg123Options
 * @property {?function} callback receives the results after finish
 * @property {InputParameters} input information about the input file
 * @property {OutputParameters} output information about the output file
 */

/**
 * @typedef {Object} InputParameters
 * @property {string} path to the file
 */

/**
 * @typedef {Object} OutputParameters
 * @property {?string} path to output file. if not specified, one will be generated
 * @property {?string} postfix if set and path is not, the generated file will end in this
 */

/**
 * @typedef {Object} Mpg123Result
 * @property {Error} error set if there was an error
 * @property {int} size filesize of output file
 * @property {string} outputFile path to output file
 * @property {string} stdout stdout from mpg123
 * @property {string} stderr stderr from mpg123
 * @property {string} mpg123Command the command that was run (if there was one) (for debugging)
*/

/**
 * Runs mpg123
 * @param {Mpg123Options} options
 * @returns {Mpg123Result}
 */
exports.mpg123 = function (options) {

	var result = {
		error: null,
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

	if (!options.output || (!options.output.path && !options.output.postfix)) {
		result.error = new Error('output.path and output.postfix not set');
		finalCallback(result);
		return;
	}
	if (!options.output.path) {
		result.outputFile = tmp.fileSync({ discardDescriptor: true, postfix: options.output.postfix }).name;
	} else {
		result.outputFile = options.output.path;
	}
	mpg123Parameters.push(result.outputFile);

	if (!options.input || !options.input.path || !fs.existsSync(options.input.path)) {
		result.error = new Error('input.path not set or not found');
		finalCallback(result);
		return;
	}
	if (options.input.parameters && Array.isArray(options.input.parameters)) {
		mpg123Parameters = mpg123Parameters.concat(options.input.parameters);
	}
	mpg123Parameters.push(options.input.path);

	async.waterfall([
		// make sure we have mpg123 somewhere we can run it
		function (callback) {
			if (!mpg123Path || !fs.existsSync(mpg123Path)) {
				var newmpg123Path = tmp.fileSync({ discardDescriptor: true, prefix: 'mpg123-' }).name;
				child_process.exec('cp ' + __dirname + '/bin/mpg123 ' + newmpg123Path, function (error, stdout, stderr) {
					if (error) {
						result.stdout = stdout;
						result.stderr = stderr;
						result.error = new Error('Failed to copy mpg123 to ' + newmpg123Path);
						finalCallback(result);
					} else {
						mpg123Path = newmpg123Path;
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
					result.error = err;
					finalCallback(result);
				} else {
					callback(null);
				}
			});
		},
		// run mpg123
		function (callback) {
			result.mpg123Command = mpg123Path + ' ' + shellescape(mpg123Parameters);
			child_process.exec(result.mpg123Command, function (error, stdout, stderr) {
				result.size = fs.statSync(outputFile).size;
				result.stdout = stdout;
				result.stderr = stderr;
				if (result.size < 1) {
					result.error = new Error('outputFile was empty. check stdout and stderr for details');
				}
				finalCallback(result);
			});
		}
	]);
};

exports.cleanup = function () {
	if (mpg123Path && fs.existsSync(mpg123Path)) {
		fs.unlinkSync(mpg123Path);
	}
};