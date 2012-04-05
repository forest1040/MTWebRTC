function compute(currentFrame, lastFrame, width, height, threshold, matrix, dd) {
  for (var i = 0; i < lastFrame.length; i++) {
    lastFrame[i] = lastFrame[i] + 128 - currentFrame[i];
  }
  var frame = lastFrame;

  function v(x, y) {
    if ((x < 0) || (y < 0) ||
        (x >= width) || (y >= height)) {
      return 128;
    }
    return frame[x + y * width];
  }

  var mXSize, mYSize;
  var mX, mY;
  var dX = [];
  var dY = [];

  switch (matrix) {
    case "sobel":
      mXSize = 3;
      mYSize = 3;
      mX = [
        [1, 0, -1],
        [2, 0, -2],
        [1, 0, -1]
      ];
      mY = [
        [1, 2, 1],
        [0, 0, 0],
        [-1, -2, -1]
      ];
    break;
    case "kirsch":
      mXSize = 3;
      mYSize = 3;
      mX = [
        [-5, 3, 3 ],
        [-5, 0, 3],
        [-5, 3, 3]
      ];
      mY = [
        [-5, -5, -5 ],
        [3, 0, 3],
        [3, 3, 3]
      ];
    break;
    case "harris":
      mXSize = 5;
      mYSize = 1;
      mX = [[-2, -1, 0, 1, 2]];
      mY = [[-2, -1, 0, 1, 2]];
    break;
  }

  var npix;

  var dXCenter = null;
  var dYCenter = null;

  var dXBb = null;
  var dYBb = null;

  for (var y = 0; y < height; y++) {
    for (var x = 0; x < width; x++) {
      // dX
      npix = 0;
      for (var pX = -1 * ((mXSize - 1) / 2);
           pX <= ((mXSize - 1) / 2);
           pX++) {

        for (var pY = -1 * ((mYSize - 1) / 2);
            pY <= ((mYSize - 1) / 2);
            pY++) {

            npix += v(x + pX, y + pY) * mX[pY + (mYSize - 1) / 2]
                                          [pX + (mXSize - 1) / 2];

        }
      }

      if (npix > 255) npix = 255;
      if (npix < 0) npix = 0;

      if (dd)
        dX.push(npix);

      if (npix > threshold) {
        if (!dXBb) {
          dXBb = {};
          dXBb.width = 0;
          dXBb.height = 0;
          dXBb.x = x;
          dXBb.y = y;
        } else {
          if (x > (dXBb.x + dXBb.width)) {
            dXBb.width = x - dXBb.x;
          }
          if (y > (dXBb.y + dXBb.height)) {
            dXBb.height = y - dXBb.y;
          }
          if (x < dXBb.x) {
            dXBb.x = x;
          }
          if (y < dXBb.y) {
            dXBb.y = y;
          }
        }

        if (dXCenter == null) {
          dXCenter = {weight: npix, x: x, y: y};
        } else {
          dXCenter.x += 1/(dXCenter.weight + 1) * (x - dXCenter.x);
          dXCenter.y += 1/(dXCenter.weight + 1) * (y - dXCenter.y);
          dXCenter.weight += 1;
        }
      }

      npix = 0;
      for (var pX = -1 * ((mXSize - 1) / 2);
           pX <= ((mXSize - 1) / 2);
           pX++) {

        for (var pY = -1 * ((mYSize - 1) / 2);
            pY <= ((mYSize - 1) / 2);
            pY++) {

            npix += v(x + pX, y + pY) * mY[pY + (mYSize - 1) / 2]
                                          [pX + (mXSize - 1) / 2];

        }
      }

      if (npix > 255) npix = 255;
      if (npix < 0) npix = 0;

      if (dd)
        dY.push(npix);

      if (npix > threshold) {
      if (!dYBb) {
          dYBb = {};
          dYBb.width = 0;
          dYBb.height = 0;
          dYBb.x = x;
          dYBb.y = y;
        } else {
          if (x > (dYBb.x + dYBb.width)) {
            dYBb.width = x - dYBb.x;
          }
          if (y > (dYBb.y + dYBb.height)) {
            dYBb.height = y - dYBb.y;
          }
          if (x < dYBb.x) {
            dYBb.x = x;
          }
          if (y < dYBb.y) {
            dYBb.y = y;
          }
        }

        if (dYCenter == null) {
          dYCenter = {weight: npix, x: x, y: y};
        } else {
          dYCenter.x += 1/(dYCenter.weight + 1) * (x - dYCenter.x);
          dYCenter.y += 1/(dYCenter.weight + 1) * (y - dYCenter.y);
          dYCenter.weight += 1;
        }
      }

    }
  }
  return [dX, dY, dXCenter, dYCenter, dXBb, dYBb];
}

onmessage = function(event) {
  var data = event.data;
  var res = compute(data.currentFrame,
      data.lastFrame,
      data.width,
      data.height,
      data.threshold,
      data.matrix,
      data.displayDiff);
  postMessage(res);
}

