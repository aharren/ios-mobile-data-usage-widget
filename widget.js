'use strict';

//
// static configuration
//

const C = {
  colors: {
    used: Color.white(),
    unused: new Color('#303030'),
    text: Color.white(),
  }
}

//
// the data
//

const now = new Date();

const liveData = await(async () => {
  try {
    // retrieve current live data via status API, only works on mobile network
    const request = new Request('https://pass.telekom.de/api/service/generic/v1/status');
    const response = await request.loadJSON();
    return {
      timestamp: response.usedAt || now.getTime(),
      usedPercentage: response.usedPercentage || 0,
    }
  } catch (err) {
    // request failed, or parsing failed, or not on mobile network
    return {};
  }
})();

const fileManager = FileManager.local();
const cacheFile = fileManager.joinPath(fileManager.documentsDirectory(), 'mobile-data-usage.json');

const data = (() => {
  if (liveData.timestamp) {
    // write live data to the cache file
    fileManager.writeString(cacheFile, JSON.stringify(liveData));
    return liveData;
  } else {
    // try to load last live data from the cache file
    const cachedData = (() => {
      try {
        return JSON.parse(fileManager.readString(cacheFile)) || {};
      } catch (err) {
        // cache file does not exist, or is not valid
        return {};
      }
    })();
    return {
      timestamp: cachedData.timestamp || now.getTime(),
      usedPercentage: cachedData.usedPercentage || 0,
    }
  }
})();

//
// drawing functions
//

// draw a multi-segment donut
function drawMultiSegmentDonut(dc, circle, segments, text) {

  // helper function to draw a single segment of the donut
  function drawDonutSegment(dc, centerX, centerY, radius, lineWidth, maxValue, startValue, endValue, color) {
    dc.setStrokeColor(color);
    dc.setFillColor(color);
    dc.setLineWidth(lineWidth);
    if (startValue === 0 && endValue === maxValue) {
      dc.strokeEllipse(new Rect(centerX - radius, centerY - radius, 2 * radius, 2 * radius));
    } else {
      const f = 4.0;
      const start = (startValue / maxValue) * 100.0;
      const end = (endValue / maxValue) * 100.0;
      for (let i = Math.max(0.0, start) * f; i <= Math.min(100.0, end) * f; i++) {
        const x = centerX + Math.sin(i / (f * 50.0) * Math.PI) * radius;
        const y = centerY - Math.cos(i / (f * 50.0) * Math.PI) * radius;
        dc.fillEllipse(new Rect(x - lineWidth / 2, y - lineWidth / 2, lineWidth, lineWidth));
      }
    }
  }

  // draw a background circle
  if (circle.color) {
    drawDonutSegment(dc, circle.x, circle.y, circle.radius, circle.lineWidth, circle.maxValue, 0, circle.maxValue, circle.color);
  }

  // draw the segments
  for (let i = 0, baseValue = 0; i < segments.length; i++) {
    const value = segments[i].value;
    const color = segments[i].color;
    drawDonutSegment(dc, circle.x, circle.y, circle.radius, circle.lineWidth, circle.maxValue, baseValue, baseValue + value, color);
    baseValue += value;
  }
  for (let i = 0, baseValue = 0; i < segments.length - 1; i++) {
    const value = segments[i].value;
    const color = segments[i].color;
    drawDonutSegment(dc, circle.x, circle.y, circle.radius, circle.lineWidth, circle.maxValue, baseValue + value, baseValue + value, color);
    baseValue += value;
  }

  // draw the given text in the middle of the donut
  if (text) {
    dc.setTextAlignedCenter();
    dc.setFont(Font.systemFont(text.fontSize));
    dc.setTextColor(text.color);
    const height = text.fontSize * 1.2;
    dc.drawTextInRect('' + text.text, new Rect(circle.x - circle.radius, circle.y - height / 2, 2 * circle.radius, height));
  }
}

// render a multi-segment donut as an image
function imageWithMultiSegmentDonut(size, circle, segments, text) {
  const dc = new DrawContext();
  dc.size = new Size(size.width, size.height);
  dc.opaque = false;
  dc.respectScreenScale = true

  drawMultiSegmentDonut(dc, circle, segments, text);
  return dc.getImage();
}

//
// build the widget
//

const widget = new ListWidget();

const stack = widget.addStack();
stack.layoutHorizontally();

const size = { width: 120, height: 120 };
const segments = [
  { value: data.usedPercentage, color: C.colors.used },
];
const image = imageWithMultiSegmentDonut(
  size,
  { x: size.width / 2, y: size.height / 2, radius: (size.width - 12) / 2, lineWidth: 12, maxValue: 100, color: C.colors.unused },
  segments,
  { text: data.usedPercentage, fontSize: 12, color: C.colors.text }
);
stack.addImage(image);

const gradient = new LinearGradient()
gradient.colors = [ new Color('#000000'), new Color('#202020') ];
gradient.locations = [ 0, 1 ];
widget.backgroundGradient = gradient;

await widget.presentSmall();
Script.setWidget(widget);
Script.complete();
