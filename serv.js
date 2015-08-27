var fs = require('fs');
var express = require('express');
var server = express();
server.get("/fixtures/:file", function(req, res) {
	var content = fs.readFileSync('./test/fixtures/' + req.params.file);
	res.setHeader("Contet-Type", "text/plain");
	res.status(200).end(content);
});
server.listen(8020, "localhost");
