var page = require('webpage').create(),
  system = require('system');

if (system.args.length === 1) {
  console.log('Usage: phantomjs fuzzer.js <timeout> <some URL>');
  phantom.exit();
}

var START_URL = system.args[2];
var TIMEOUT = parseInt(system.args[1], 10);

var randomPick = function(array) {
  return array[Math.floor(Math.random() * array.length)];
}

var doSomethingRandom = function() {

    // http://phantomjs.org/api/webpage/method/send-event.html

    var fuzzEvent = [];

    // Mouse
    if (Math.random() < 0.9) {
      var mouseEvents = ["click"]; //"mouseup", "mousedown", "mousemove", "doubleclick"];
      var mouseButtons = ["left", "left", "left", "left", "left", "left", "right"] // middle?

      var contentSize = page.evaluate(function() {
        var b = window.document.body || {};
        var de = window.document.documentElement || {};
        var contentWidth = Math.max(b.clientWidth, b.scrollWidth, b.offsetWidth,
                                  de.clientWidth, de.scrollWidth, de.offsetWidth);
        var contentHeight = Math.max(b.clientHeight, b.scrollHeight, b.offsetHeight,
                                  de.clientHeight, de.scrollHeight, de.offsetHeight);

        return [contentWidth, contentHeight]
      });

      fuzzEvent = [
        randomPick(mouseEvents),
        Math.round(contentSize[0] * Math.random()),
        Math.round(contentSize[1] * Math.random()),
        randomPick(mouseButtons)
      ];

    // Keyboard
    } else {
      var keys = Object.keys(page.event.key);
      //TODO modifiers (shift, ctrl, ..)

      fuzzEvent = ['keypress', page.event.key[randomPick(keys)]];
    }
    // TODO scroll

    console.log("Sending event " + JSON.stringify(fuzzEvent));

    setTimeout(doSomethingRandom, Math.random() * 100);

    // TODO remove this
    page.evaluate(function() {
      window.event = {};
    });
    page.sendEvent.apply(this, fuzzEvent);

};

var loadUrl = function(url) {
  console.log("Opening "+url);
  page.viewportSize = {width:1200, height:1000};
  page.open(url, function(status) {
    if (status !== 'success') {
      console.log('FAIL to load the address');
      phantom.exit(1);
    } else {
      doSomethingRandom();
    }
  });
};

// Exit OK after N seconds without error
setTimeout(function() {
  console.log("Timeout reached, no JS error found.");
  phantom.exit(0);
}, TIMEOUT * 1000);

// Exit NOK as soon as we stumble upon a JS error
page.onError = function(msg, trace) {
  var msgStack = ['PHANTOM ERROR: ' + msg];
  if (trace && trace.length) {
    msgStack.push('TRACE:');
    trace.forEach(function(t) {
      msgStack.push(' -> ' + (t.file || t.sourceURL) + ': ' + t.line + (t.function ? ' (in function ' + t.function +')' : ''));
    });
  }
  console.error(msgStack.join('\n'));
  phantom.exit(1);
};

// TODO lock domain
// http://phantomjs.org/api/webpage/handler/on-navigation-requested.html
page.onUrlChanged = function(targetUrl) {
    console.log('New URL: ' + targetUrl);
};

// Load the starting URL & start fuzzing
loadUrl(START_URL);
