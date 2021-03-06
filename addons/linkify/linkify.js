(function (linkify) {
  if (typeof exports === 'object' && typeof module === 'object') {
    /*
     * CommonJS environment
     */
    module.exports = linkify(require('../../src/xterm'));
  } else if (typeof define == 'function') {
    /*
     * Require.js is available
     */
    define(['../../src/xterm'], linkify);
  } else {
    /*
     * Plain browser environment
     */
    linkify(this.Xterm);
  }
})(function (Xterm) {
  'use strict';

  /**
   * This module provides methods for convertings valid URL substrings
   * into HTML anchor elements (links), inside a terminal view.
   *
   * @module xterm/addons/linkify/linkify
   */
  var exports = {},
      protocolClause = '(https?:\\/\\/)',
      domainCharacterSet = '[\\da-z\\.-]+',
      negatedDomainCharacterSet = '[^\\da-z\\.-]+',
      domainBodyClause = '(' + domainCharacterSet + ')',
      tldClause = '([a-z\\.]{2,6})',
      hostClause = domainBodyClause + '\\.' + tldClause,
      pathClause = '([\\/\\w\\.-]*)*\\/?',
      negatedPathCharacterSet = '[^\\/\\w\\.-]+',
      bodyClause = hostClause + pathClause,
      start = '(?:^|' + negatedDomainCharacterSet + ')(',
      end = ')($|' + negatedPathCharacterSet + ')',
      lenientUrlClause = start + protocolClause + '?' + bodyClause + end,
      strictUrlClause = start + protocolClause + bodyClause + end,
      lenientUrlRegex = new RegExp(lenientUrlClause),
      strictUrlRegex = new RegExp(strictUrlClause);


  /**
   * Converts all valid URLs found in the given terminal line into
   * hyperlinks. The terminal line can be either the HTML element itself
   * or the index of the termina line in the children of the terminal
   * rows container.
   *
   * @param {Xterm} terminal - The terminal that owns the given line.
   * @param {number|HTMLDivElement} line - The terminal line that should get
   *								  		 "linkified".
   * @param {boolean} lenient - The regex type that will be used to identify links. If lenient is
   *                            false, the regex requires a protocol clause. Defaults to true.
   * @emits linkify
   * @emits linkify:line
   */
  exports.linkifyTerminalLine = function (terminal, line, lenient) {
    if (typeof line == 'number') {
      line = terminal.rowContainer.children[line];
    } else if (! (line instanceof HTMLDivElement)) {
      var message = 'The "line" argument should be either a number';
      message += ' or an HTMLDivElement';

      throw new TypeError(message);
    }

    var buffer = document.createElement('span'),
        nodes = line.childNodes;

    for (var j=0; j<nodes.length; j++) {
      var node = nodes[j],
          match;

      /**
       * Since we cannot access the TextNode's HTML representation
       * from the instance itself, we assign its data as textContent
       * to a dummy buffer span, in order to retrieve the TextNode's
       * HTML representation from the buffer's innerHTML.
       */
      buffer.textContent = node.data;

      var nodeHTML = buffer.innerHTML;

      /**
       * Apply function only on TextNodes
       */
      if (node.nodeType != node.TEXT_NODE) {
        continue;
      }


      if (lenient) {
        match = node.data.match(lenientUrlRegex);
      } else {
        match = node.data.match(strictUrlRegex);
      }

      /**
       * If no URL was found in the current text, return.
       */
      if (!match) {
        continue;
      }

      var url = match[1],
          startsWithProtocol = new RegExp('^' + protocolClause),
          urlHasProtocol = url.match(startsWithProtocol),
          href = (urlHasProtocol) ? url : 'http://' + url,
          link = '<a href="' +  href + '" >' + url + '</a>',
          newHTML = nodeHTML.replace(url, link);

      line.innerHTML = line.innerHTML.replace(nodeHTML, newHTML);
    }

    /**
     * This event gets emitted when conversion of all URL susbtrings
     * to HTML anchor elements (links) has finished, for a specific
     * line of the current Xterm instance.
     *
     * @event linkify:line
     */
    terminal.emit('linkify:line', line);
  };


  /**
   * Converts all valid URLs found in the terminal view into hyperlinks.
   *
   * @param {Xterm} terminal - The terminal that should get "linkified".
   * @param {boolean} lenient - The regex type that will be used to identify links. If lenient is
   *                            false, the regex requires a protocol clause. Defaults to true.
   * @emits linkify
   * @emits linkify:line
   */
  exports.linkify = function (terminal, lenient) {
    var rows = terminal.rowContainer.children;

    lenient = (typeof lenient == "boolean") ? lenient : true;
    for (var i=0; i<rows.length; i++) {
      var line = rows[i];

      exports.linkifyTerminalLine(terminal, line, lenient);
    }

    /**
     * This event gets emitted when conversion of  all URL substrings to
     * HTML anchor elements (links) has finished for the current Xterm
     * instance's view.
     *
     * @event linkify
     */
    terminal.emit('linkify');
  };

  /**
   * Extend Xterm prototype.
   */

  /**
   * Converts all valid URLs found in the current terminal linte into
   * hyperlinks.
   *
   * @memberof Xterm
   * @param {number|HTMLDivElement} line - The terminal line that should get
   *								  		 "linkified".
   * @param {boolean} lenient - The regex type that will be used to identify links. If lenient is
   *                            false, the regex requires a protocol clause. Defaults to true.
   */
  Xterm.prototype.linkifyTerminalLine = function (line, lenient) {
    return exports.linkifyTerminalLine(this, line, lenient);
  };

  /**
   * Converts all valid URLs found in the current terminal into hyperlinks.
   *
   * @memberof Xterm
   * @param {boolean} lenient - The regex type that will be used to identify links. If lenient is
   *                            false, the regex requires a protocol clause. Defaults to true.
   */
  Xterm.prototype.linkify = function (lenient) {
    return exports.linkify(this, lenient);
  };

  return exports;
});
