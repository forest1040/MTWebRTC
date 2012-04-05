initialize = function() {
  navigator.webkitGetUserMedia("video,audio", onReader, onError);
  processor.doLoad();
}

onReader = function (stream) {
  var src = document.getElementById("v1");
  var url = webkitURL.createObjectURL(stream);
  src.src = url;
  setInterval(draw, 500);
}

onError = function(error) {
  alert("ERROR!!");
}

var draw = function () {
  var canvas = document.createElement('c0');
  canvas.width = src.videoWidth;
  canvas.height = src.videoHeight;
}

setTimeout(initialize, 1);

