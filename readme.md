# MPG123 For Lambda
 
 Wraps mpg123 for ease of use in converting mp3s to wavs in AWS Lambda functions using node.js

# Installation
```
npm install https://github.com/Zorrodelaarena/mpg123-for-lambda.git
```

# Use
```
var mpg123 = require('mpg123');

mpg123.convertMp3ToWav({
	inputFile: 'myfile.mp3',
	outputFile: 'myfile.wav', // omit and the output file path will be generated automatically and sent as resultDetails.outputFile in callback
	callback: function(err, resultDetails) {
		if (err) {
			console.error(err);
		} else {
			console.log('Size of', resultDetails.outputFile, 'is', resultDetails.size);

			// before you exit, call cleanup to remove module temp files
			mpg123.cleanup();
		}
	}
});
```
