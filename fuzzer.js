var page = require('webpage').create(),
  system = require('system');

if (system.args.length === 1) {
  console.log('Usage: phantomjs fuzzer.js <timeout> <some URL>');
  phantom.exit();
}

var START_URL = system.args[2];
var TIMEOUT = parseInt(system.args[1], 10);
var MAX_DELAY_BETWEEN_EVENTS = 100;

var getDomain = function(url) {
  var matches = url.match(/^https?\:\/\/([^\/?#]+)(?:[\/?#]|$)/i);
  var domain = matches && matches[1];
  if (domain) {
    domain = domain.replace(/^www\./, "");
  }
  return domain;
};

var randomPick = function(array) {
  return array[Math.floor(Math.random() * array.length)];
};

var nextSetTimeout;

var nextRandom = function() {
  nextSetTimeout = setTimeout(doSomethingRandom, Math.random() * MAX_DELAY_BETWEEN_EVENTS);
};

var doSomethingRandom = function() {

    if (!page.url) return nextRandom();

    var fuzzEvent = [];

    // Mouse
    if (Math.random() < 0.9) {
      var mouseEvents = ["click"]; //"mouseup", "mousedown", "mousemove", "doubleclick"];
      var mouseButtons = ["left", "left", "left", "left", "left", "left", "middle", "right"]

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
    // TODO drag n drop (mousedown, mousemove, mouseup)
    // TODO mouse move & mouse position

    console.log("Sending event " + JSON.stringify(fuzzEvent));

    nextRandom();

    // TODO remove this
    page.evaluate(function() {
      window.event = {};
    });

    // http://phantomjs.org/api/webpage/method/send-event.html
    page.sendEvent.apply(this, fuzzEvent);

};

var DOMAIN = getDomain(START_URL);
var lastUrl = START_URL;

var loadUrl = function(url) {

  console.log("Opening "+url);

  page.viewportSize = {width:1440, height:1000};
  page.settings.userAgent = "Webpage-Fuzzer/1.0 (+https://github.com/sylvinus/webpage-fuzzer)";

  page.open(url, function(status) {
    if (status !== 'success') {
      console.log('Failed to load the page');
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
  var msgStack = ['JavaScript error on page ' + lastUrl, msg];
  if (trace && trace.length) {
    msgStack.push('TRACE:');
    trace.forEach(function(t) {
      msgStack.push(' -> ' + (t.file || t.sourceURL) + ': ' + t.line + (t.function ? ' (in function ' + t.function +')' : ''));
    });
  }
  var msgStr = msgStack.join('\n')
  console.error(msgStr);

  // Whitelisted errors
  if (
    msgStr.match(/window\.event/)
    ||
    msgStr.match(/s\.ytimg\.com/)
    ||
    msgStr.match(/static\.tumblr\.com/)
  ) {
    return;
  }

  phantom.exit(1);
};

// Locks navigation to the domain of the first URL
page.onUrlChanged = function(targetUrl) {
  if (getDomain(targetUrl) != DOMAIN) {
    console.log('Tried to load external URL: ' + targetUrl);
    return page.goBack();

    // TODO should we do this to avoid sending any event to external urls?
    // Also research onNavigationRequested()
    // clearTimeout(nextSetTimeout);
    // return loadUrl(lastUrl);
  }
  console.log('New URL: ' + targetUrl);
  lastUrl = targetUrl;
};

// Print HTTP errors
page.onResourceReceived = function(response) {
  if (response.status >= 400) {
    console.log('Response (#' + response.id + ' HTTP ' + response.status + ', stage "' + response.stage + '"): ' + JSON.stringify(response));
  }
};

// Load the starting URL & start fuzzing
loadUrl(START_URL);
