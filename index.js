var fs = require('fs');
var http = require('http');
var path = require('path');
var send = require('send');
var request = require('request');
var tarEntries = require('tar-entries');
var TarIndex = require('tar-index');

module.exports = tarServe;

function tarServe(req, res) {
  if (req.url === '/favicon.ico') return;
  var file = path.resolve(req.url.substring(1, req.url.length));
  fs.exists(file, function (exists) {
    if (exists) {
      return send(req, req.url)
      .from(__dirname)
      .on('error', onerror)
      .maxage(60000)
      .pipe(res);
    }

    var entry = parsePartName(req.url.substring(1, req.url.length));
    var tarPath = path.join(__dirname, entry.tarname);
    var index = new TarIndex(tarPath);

    index.readEntry(entry.part, function (err, entry){
      if (err) throw err;
      var start = entry[0];
      var size = entry[1];
      console.log('read entry from index', start, size);
      var buffer = new Buffer(size);
      var fileStream = fs.createReadStream(tarPath, {start: start, end: start + size});
      fileStream.on('error', function (err) {
        console.error('Error reading bytes in tar', err, req.url);
      });
      fileStream.pipe(res);
      fileStream.on('end', function () {
        console.log('read all the bytes');
      });
    }.bind(this));
  });
}

function parsePartName(name) {
  console.log('parse name', name);
  var nameParts = name.split('-');
  return {
    tarname: nameParts.shift(),
    part: parseInt(nameParts.shift(), 10)
  };
}

function onerror (err) {
  console.log(err);
}

if (module.parent === null) require('http').createServer(tarServe).listen(3030);