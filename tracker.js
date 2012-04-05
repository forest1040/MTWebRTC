const R = 1;
const G = 2;
const B = 4;

var count = 0;

var processor = {
  video: null,
  workCanvas: null,
  ctx: null,

  threadRunning: false,

  timeToCompute: 0,
  timeStep: 0,

  lastGreyFrame: null,

  timerCallback: function() {
    if (this.video.paused || this.video.ended) {
      return;
    }

    if (this.video.currentTime >= this.timeToCompute && !this.threadRunning) {
      this.computeFrame();
    }

    var self = this;
    setTimeout(function () {
        self.timerCallback();
      }, this.timeStep * 1000);
  },

  getOptions: function() {
    this.threshold = document.getElementById("threshold").value;
    this.workFactor = document.getElementById("factor").value;
    this.zoomFactor = this.workFactor * document.getElementById("zfactor").value;
    this.sensibility = document.getElementById("sensibility").value;
    this.workWidth = Math.round(this.video.videoWidth / this.workFactor);
    this.workHeight = Math.round(this.video.videoHeight / this.workFactor);
    this.displayVideo = document.getElementById("dv").checked;
    if (!this.displayVideo) {
      this.video.style.display = "none";
    }
    this.displayDiff = document.getElementById("dd").checked;
    if (this.displayDiff)
      this.workCanvas.setAttribute("width", this.workWidth * 3);
    else
      this.workCanvas.setAttribute("width", this.workWidth);
    this.workCanvas.setAttribute("height", this.workHeight);
    var i1, i2, i3;
    i1 = document.querySelector("input[value='sobel']").checked;
    i2 = document.querySelector("input[value='kirsch']").checked;
    i3 = document.querySelector("input[value='harris']").checked;
    if (i1) {
      this.matrix = "sobel";
    } 
    if (i2) {
      this.matrix = "kirsch";
    } 
    if (i3) {
      this.matrix = "harris";
    } 

    this.output.setAttribute("width", this.workWidth * this.zoomFactor);
    this.output.setAttribute("height", this.workHeight * this.zoomFactor);
  },
  doLoad: function() {
    this.video = document.getElementById("v1");
    this.workCanvas = document.getElementById("c0");
    this.output = document.getElementById("c2");
    this.outputCtx = document.getElementById("c2").getContext("2d");
    this.resultCtx = document.getElementById("c1").getContext("2d");
    this.ctx = this.workCanvas.getContext("2d");
    this.worker = new Worker("compute.js");

    var self = this;

    setInterval(function() {
        self.fps();
    }, 1000);
    this.video.addEventListener("play", function() {
        self.getOptions();
        self.timerCallback();
      }, false);
  },


  pushVideoOnCanvas: function(org, x, y) {
    if (org) {
      this.ctx.drawImage(this.video, x, y, this.video.videoWidth, this.video.videoHeight);
    } else {
      this.ctx.drawImage(this.video, x, y, this.workWidth, this.workHeight);
      this.outputCtx.save();
      this.outputCtx.scale(this.zoomFactor, this.zoomFactor);
      this.outputCtx.drawImage(this.video, x, y, this.workWidth, this.workHeight);
      this.outputCtx.restore();
    }
  },
  getVideoFrame: function() {
    this.pushVideoOnCanvas(false, 0, 0);
    return this.ctx.getImageData(0, 0, this.workWidth, this.workHeight);
  },
  colorToGrey: function(frame) {
    var greyTab = new Array (frame.data.length / 4);
    for (var i = 0; i < greyTab.length; i++) {
      greyTab[i] =  frame.data[i * 4] +
                    frame.data[i * 4 + 1] +
                    frame.data[i * 4 + 2] / 6;
    }
    return greyTab;
  },
  putGreyFrame: function(frame, x, y) {
    var img = this.ctx.createImageData(this.workWidth, this.workHeight);
    for (var i = 0; i < frame.length; i++) {
      img.data[i * 4 + 3] = 255;
      img.data[i * 4 + 0] = frame[i] * (this.color&R);
      img.data[i * 4 + 1] = frame[i] * (this.color&G);
      img.data[i * 4 + 2] = frame[i] * (this.color&B);
    }
    this.ctx.putImageData(img, x, y);
  },
  computeFrame: function() {
    var currentColorFrame = this.getVideoFrame();
    var currentGreyFrame = this.colorToGrey(currentColorFrame);
    delete currentColorFrame;
    if (this.lastGreyFrame == null) {
      this.lastGreyFrame = currentGreyFrame.slice(0);
      return;
    }
    var lastFrame = this.lastGreyFrame;
    this.lastGreyFrame = currentGreyFrame.slice(0);
    this.threadRunning = true;
    var self = this;
    this.worker.onmessage = function(event) {
      self.computeDone(event.data);
    };
    this.worker.onerror = function(event) {
      dump("WORKER ERROR\n");
    };
    var args = {
      currentFrame: currentGreyFrame,
      lastFrame: lastFrame,
      height: this.workHeight,
      width: this.workWidth,
      threshold: this.threshold,
      matrix: this.matrix,
      displayDiff: this.displayDiff
    }
    this.worker.postMessage(args);
  },
  buildColor: function() {
    return "rgb(" +
      (255 * (this.color&R)) + ", " +
      (255 * (this.color&G)) + ", " +
      (255 * (this.color&B)) + ")";
  },
  buildAColor: function(a) {
    return "rgba(" +
      (255 * (this.color&R)) + ", " +
      (255 * (this.color&G)) + ", " +
      (255 * (this.color&B)) + ", " + a  + ")";
  },
  drawCross: function(x, y, size) {
    this.outputCtx.lineWidth = 3;
    this.outputCtx.beginPath();
    this.outputCtx.moveTo(x * this.zoomFactor, y * this.zoomFactor - size);
    this.outputCtx.lineTo(x * this.zoomFactor, y * this.zoomFactor + size);
    this.outputCtx.moveTo(x * this.zoomFactor - size, y * this.zoomFactor);
    this.outputCtx.lineTo(x * this.zoomFactor + size, y * this.zoomFactor);
    this.outputCtx.stroke();
  },
  computeDone: function(result) {
    this.threadRunning = false;
    this.timeToCompute += this.timeStep;

    var dX, dY, dXCenter, dYCenter, dXBb, dYBb;
    dX       = result[0];
    dY       = result[1];
    dXCenter = result[2];
    dYCenter = result[3];
    dXBb     = result[4];
    dYBb     = result[5];

    var max = this.sensibility;

    this.updateGraph(dXCenter ? dXCenter.weight / 5 : 0,
                     dYCenter ? dYCenter.weight / 10 : 0);
    this.color = R;
    if (dXCenter && dXBb.width > max && dXBb.height > max) {
      this.outputCtx.strokeStyle = this.buildColor();
      this.drawCross(dXCenter.x, dXCenter.y, 6);
      this.outputCtx.strokeRect(dXBb.x * this.zoomFactor,
                                dXBb.y * this.zoomFactor,
                                dXBb.width * this.zoomFactor,
                                dXBb.height * this.zoomFactor);
    }
    if (this.displayDiff)
      this.putGreyFrame(dX, this.workWidth, 0);
    this.color = G;
    if (dYCenter && dYBb.width > max && dYBb.height > max) {
      this.outputCtx.strokeStyle = this.buildColor();
      this.drawCross(dYCenter.x, dYCenter.y, 6);
      this.outputCtx.strokeRect(dYBb.x * this.zoomFactor,
                                dYBb.y * this.zoomFactor,
                                dYBb.width * this.zoomFactor,
                                dYBb.height * this.zoomFactor);
    }
    if (this.displayDiff)
      this.putGreyFrame(dY, this.workWidth * 2, 0);
    count++;
  },

  bufferX: [],
  bufferY: [],
  updateGraph: function(x, y) {
    this.bufferX.push(x);
    this.bufferY.push(y);
    if (this.bufferX.length > 50) {
      this.bufferX.shift();
    }
    if (this.bufferY.length > 100) {
      this.bufferY.shift();
    }
    this.resultCtx.clearRect(0, 0, 100, 100);

    this.resultCtx.beginPath();
    this.resultCtx.moveTo(0, 100 - this.bufferX[0]);
    for (var i = 1; i < this.bufferX.length;i++) {
      var xx = this.bufferX[i];
      this.resultCtx.lineTo(i * 2, 100 - xx);
    }
    this.resultCtx.lineTo(this.bufferX.length * 2, 100);
    this.resultCtx.lineTo(0, 100);
    this.resultCtx.closePath();
    this.color = R;
    this.resultCtx.fillStyle = this.buildAColor(0.7);
    this.resultCtx.fill();
    this.resultCtx.strokeStyle = this.buildColor();
    this.resultCtx.stroke();

    this.resultCtx.beginPath();
    this.resultCtx.moveTo(0, 100 - this.bufferY[0]);
    for (var j = 1; j < this.bufferY.length;j++) {
      var yy = this.bufferY[j];
      this.resultCtx.lineTo(j, 100 - yy);
    }
    this.resultCtx.lineTo(this.bufferY.length, 100);
    this.resultCtx.lineTo(0, 100);
    this.resultCtx.closePath();
    this.color = G;
    this.resultCtx.fillStyle = this.buildAColor(0.3);
    this.resultCtx.fill();
    this.resultCtx.strokeStyle = this.buildColor();
    this.resultCtx.stroke();
  },
  fps: function() {
    document.getElementById("fps").innerHTML = "<p>fps: " + count + "</p>";
    count = 0;
  }

};

