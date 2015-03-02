# webpage-fuzzer

Find JavaScript errors in your website easily!

This will send random clicks and keypresses all around a website and exit with an error status at the first JavaScript error that is found.

If this can spend a night on your website without throwing any error you are probably good :)


# How to use

```
phantomjs|slimerjs fuzzer.js [timeout] [url]
```

### Example with PhantomJS

Spend 10 minutes on Google looking for JS errors!

```
phantomjs --ssl-protocol=any --ignore-ssl-errors=yes fuzzer.js 600 http://www.google.com
```

### Example with SlimerJS

Since SlimerJS can do WebGL, try crashing Sketchfab!

```
./slimerjs/slimerjs --ssl-protocol=any fuzzer.js 120 http://www.sketchfab.com
```
