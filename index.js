var fs = require('fs');
var http = require('http');
var path = require('path');
var send = require('send');
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

    var entryDescr = parsePartName(req.url.substring(1, req.url.length));
    var tarPath = path.join(__dirname, entryDescr.tarname);
    var index = new TarIndex(tarPath);

    index.readEntry(entryDescr.part, function (err, entry){
      if (err) throw err;
      var start = entry[0];
      var size = entry[1];
      console.log('read entry from index', start, size);
      var buffer = new Buffer(size);
      var fileStream = fs.createReadStream(tarPath, {start: start, end: start + size, encoding: 'ascii'});
      fileStream.on('error', function (err) {
        console.error('Error reading bytes in tar', err, req.url);
      });
      fileStream.pipe(res);
    }.bind(this));
  });
}

function parsePartName(name) {
  var nameParts = name.split('-');
  return {
    part: parseInt(nameParts.pop(), 10),
    tarname: nameParts.join('-')
  };
}

function onerror (err) {
  console.log(err);
}

if (module.parent === null) require('http').createServer(tarServe).listen(3030);